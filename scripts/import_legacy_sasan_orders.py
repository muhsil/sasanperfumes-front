#!/usr/bin/env python3
import argparse
import html
import json
import random
import re
import string
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

import requests


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DUMPS = {
    "users": Path(r"C:\Users\muhas\Downloads\wp_users (1).sql"),
    "usermeta": Path(r"C:\Users\muhas\Downloads\wp_usermeta (1).sql"),
    "orders": Path(r"C:\Users\muhas\Downloads\wp_wc_orders (4).sql"),
    "addresses": Path(r"C:\Users\muhas\Downloads\wp_wc_order_addresses (1).sql"),
    "order_items": Path(r"C:\Users\muhas\Downloads\wp_woocommerce_order_items (1).sql"),
    "order_itemmeta": Path(r"C:\Users\muhas\Downloads\wp_woocommerce_order_itemmeta (1).sql"),
}

BASE_URL = "https://cms.sasanperfumes.com/wp-json/wc/v3"
AUTH = (
    "ck_918287ec21bc479541bbba2540a54da8cf98a914",
    "cs_a7e96d7581cb259b9f8d6fd26e9e281508886dec",
)

MANUAL_PRODUCT_NAME_MAP = {
    "heego": "heegosa",
    "libre intense": "library intense",
    "one & one": "one & one",
    "olympia": "olympicsa",
}

LEGACY_PRODUCT_STUBS = {
    "020",
    "Black Sling Bag",
    "FLAMINGOSA",
    "Ramadan Perfume Gift Set",
}

ORDER_STATUS_MAP = {
    "wc-pending": "pending",
    "wc-processing": "processing",
    "wc-on-hold": "on-hold",
    "wc-completed": "completed",
    "wc-cancelled": "cancelled",
    "wc-failed": "failed",
    "wc-refunded": "refunded",
    "wc-checkout-draft": "pending",
    "draft": "pending",
}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", html.unescape((value or "").strip().lower()))


def parse_mysql_string(value: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(value):
        char = value[i]
        if char != "\\":
            out.append(char)
            i += 1
            continue

        i += 1
        if i >= len(value):
            break

        esc = value[i]
        mapping = {
            "0": "\0",
            "b": "\b",
            "n": "\n",
            "r": "\r",
            "t": "\t",
            "Z": "\x1a",
            "'": "'",
            '"': '"',
            "\\": "\\",
        }
        out.append(mapping.get(esc, esc))
        i += 1
    return "".join(out)


def parse_insert_rows(path: Path) -> list[list[Any]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    rows: list[list[Any]] = []
    insert_pos = 0
    while True:
        insert_pos = text.find("INSERT INTO", insert_pos)
        if insert_pos == -1:
            break
        values_pos = text.find("VALUES", insert_pos)
        if values_pos == -1:
            break
        i = values_pos + len("VALUES")
        row: list[Any] | None = None
        field_chars: list[str] = []
        in_string = False
        escape = False

        while i < len(text):
            ch = text[i]
            if row is None:
                if ch == "(":
                    row = []
                    field_chars = []
                elif ch == ";":
                    i += 1
                    break
                i += 1
                continue

            if in_string:
                if escape:
                    field_chars.append("\\" + ch)
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == "'":
                    row.append(parse_mysql_string("".join(field_chars)))
                    field_chars = []
                    in_string = False
                else:
                    field_chars.append(ch)
                i += 1
                continue

            if ch == "'":
                if "".join(field_chars).strip() == "":
                    field_chars = []
                in_string = True
                i += 1
                continue

            if ch == ",":
                token = "".join(field_chars).strip()
                if token:
                    row.append(None if token.upper() == "NULL" else token)
                field_chars = []
                i += 1
                continue

            if ch == ")":
                token = "".join(field_chars).strip()
                if token:
                    row.append(None if token.upper() == "NULL" else token)
                elif len(row) == 0 or row[-1] is not None:
                    pass
                rows.append(row)
                row = None
                field_chars = []
                i += 1
                continue

            field_chars.append(ch)
            i += 1

        insert_pos = i
    return rows


@dataclass
class ImportContext:
    products_by_norm: dict[str, dict[str, Any]]
    stub_products_by_name: dict[str, dict[str, Any]]
    existing_legacy_order_ids: set[str]
    existing_legacy_refund_ids: set[str]
    existing_customers_by_email: dict[str, dict[str, Any]]
    created_orders_by_legacy_id: dict[int, dict[str, Any]]


def decimal_str(value: Any, default: str = "0") -> str:
    if value in (None, ""):
        return default
    return str(Decimal(str(value)).quantize(Decimal("0.01")))


def random_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(18))


def wc_get_all(session: requests.Session, resource: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    params = dict(params or {})
    page = 1
    items: list[dict[str, Any]] = []
    while True:
        batch_params = {**params, "per_page": 100, "page": page}
        response = session.get(f"{BASE_URL}/{resource}", params=batch_params, timeout=90)
        response.raise_for_status()
        batch = response.json()
        if not batch:
            break
        items.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return items


def wc_post(session: requests.Session, resource: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = session.post(f"{BASE_URL}/{resource}", json=payload, timeout=90)
    if response.status_code >= 400:
        raise RuntimeError(f"{resource} POST failed: {response.status_code} {response.text}")
    return response.json()


def wc_delete(session: requests.Session, resource: str) -> None:
    response = session.delete(f"{BASE_URL}/{resource}", params={"force": "true"}, timeout=90)
    if response.status_code >= 400:
        raise RuntimeError(f"{resource} DELETE failed: {response.status_code} {response.text}")


def build_users(rows_users: list[list[Any]], rows_usermeta: list[list[Any]]) -> dict[int, dict[str, Any]]:
    users: dict[int, dict[str, Any]] = {}
    for row in rows_users:
        user_id = int(row[0])
        users[user_id] = {
            "id": user_id,
            "login": row[1] or "",
            "email": (row[4] or "").strip().lower(),
            "registered": row[6] or "",
            "meta": {},
        }

    for row in rows_usermeta:
        user_id = int(row[1])
        if user_id not in users:
            continue
        key = row[2] or ""
        value = row[3]
        users[user_id]["meta"][key] = value
    return users


def build_orders(
    rows_orders: list[list[Any]],
    rows_addresses: list[list[Any]],
    rows_items: list[list[Any]],
    rows_itemmeta: list[list[Any]],
) -> tuple[dict[int, dict[str, Any]], list[dict[str, Any]]]:
    orders: dict[int, dict[str, Any]] = {}
    refunds: list[dict[str, Any]] = []

    for row in rows_orders:
        order_id = int(row[0])
        payload = {
            "id": order_id,
            "status": row[1],
            "currency": row[2] or "AED",
            "type": row[3],
            "tax_amount": row[4] or "0",
            "total_amount": row[5] or "0",
            "customer_id": int(row[6] or 0),
            "billing_email": (row[7] or "").strip().lower(),
            "date_created_gmt": row[8] or "",
            "date_updated_gmt": row[9] or "",
            "parent_order_id": int(row[10] or 0),
            "payment_method": row[11] or "",
            "payment_method_title": row[12] or "",
            "customer_note": row[16] or "",
            "billing": {},
            "shipping": {},
            "line_items": [],
            "shipping_lines": [],
            "coupon_lines": [],
            "fees": [],
            "legacy_item_rows": [],
        }
        if payload["type"] == "shop_order_refund":
            refunds.append(payload)
        else:
            orders[order_id] = payload

    for row in rows_addresses:
        order_id = int(row[1])
        if order_id not in orders:
            continue
        target = orders[order_id]["billing" if row[2] == "billing" else "shipping"]
        target.update(
            {
                "first_name": row[3] or "",
                "last_name": row[4] or "",
                "company": row[5] or "",
                "address_1": row[6] or "",
                "address_2": row[7] or "",
                "city": row[8] or "",
                "state": row[9] or "",
                "postcode": row[10] or "",
                "country": row[11] or "",
                "email": row[12] or "",
                "phone": row[13] or "",
            }
        )

    item_meta: dict[int, dict[str, Any]] = defaultdict(dict)
    for row in rows_itemmeta:
        item_meta[int(row[1])][row[2] or ""] = row[3]

    for row in rows_items:
        order_item_id = int(row[0])
        name = row[1] or ""
        item_type = row[2] or ""
        order_id = int(row[3])
        if order_id not in orders:
            continue
        meta = item_meta.get(order_item_id, {})
        if item_type == "line_item":
            orders[order_id]["legacy_item_rows"].append(
                {
                    "name": name,
                    "quantity": int(Decimal(meta.get("_qty") or "1")),
                    "subtotal": decimal_str(meta.get("_line_subtotal")),
                    "total": decimal_str(meta.get("_line_total")),
                }
            )
        elif item_type == "shipping":
            orders[order_id]["shipping_lines"].append(
                {
                    "method_title": name or "Shipping",
                    "method_id": meta.get("method_id") or meta.get("method_slug") or "flat_rate",
                    "total": decimal_str(meta.get("cost")),
                }
            )
        elif item_type == "coupon":
            orders[order_id]["coupon_lines"].append({"code": name})
        elif item_type == "fee":
            orders[order_id]["fees"].append(
                {
                    "name": name,
                    "total": decimal_str(meta.get("_line_total")),
                }
            )

    for order in orders.values():
        if not order["shipping"]:
            order["shipping"] = {
                k: order["billing"].get(k, "")
                for k in [
                    "first_name",
                    "last_name",
                    "company",
                    "address_1",
                    "address_2",
                    "city",
                    "state",
                    "postcode",
                    "country",
                    "phone",
                ]
            }

    return orders, refunds


def product_lookup(session: requests.Session) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    products = wc_get_all(session, "products", {"status": "any"})
    by_norm: dict[str, dict[str, Any]] = {}
    stubs_by_name: dict[str, dict[str, Any]] = {}
    for product in products:
        by_norm.setdefault(normalize_name(product["name"]), product)
        legacy_stub = False
        for meta in product.get("meta_data", []):
            if meta.get("key") == "legacy_import_stub" and str(meta.get("value")).lower() in {"1", "true", "yes"}:
                legacy_stub = True
        if legacy_stub:
            stubs_by_name[product["name"]] = product
    return by_norm, stubs_by_name


def customer_lookup(session: requests.Session) -> dict[str, dict[str, Any]]:
    customers = wc_get_all(session, "customers")
    return {str(customer.get("email", "")).strip().lower(): customer for customer in customers if customer.get("email")}


def existing_legacy_order_sets(session: requests.Session) -> tuple[set[str], set[str]]:
    orders = wc_get_all(session, "orders", {"status": "any"})
    legacy_order_ids: set[str] = set()
    legacy_refund_ids: set[str] = set()
    for order in orders:
        for meta in order.get("meta_data", []):
            key = meta.get("key")
            value = str(meta.get("value"))
            if key == "legacy_order_id":
                legacy_order_ids.add(value)
            if key == "legacy_refund_id":
                legacy_refund_ids.add(value)
    return legacy_order_ids, legacy_refund_ids


def choose_product(
    session: requests.Session,
    context: ImportContext,
    product_name: str,
    create_missing_products: bool,
) -> dict[str, Any]:
    norm = normalize_name(product_name)
    mapped_name = MANUAL_PRODUCT_NAME_MAP.get(product_name.lower(), product_name)
    mapped_norm = normalize_name(mapped_name)

    if mapped_norm in context.products_by_norm:
        return context.products_by_norm[mapped_norm]

    if product_name in context.stub_products_by_name:
        return context.stub_products_by_name[product_name]

    if not create_missing_products:
        raise RuntimeError(f"No product match found for legacy item '{product_name}'")

    payload = {
        "name": product_name,
        "type": "simple",
        "status": "draft",
        "regular_price": "0",
        "catalog_visibility": "hidden",
        "meta_data": [
            {"key": "legacy_import_stub", "value": "1"},
            {"key": "legacy_import_source", "value": "sasanperfumes.com"},
        ],
    }
    created = wc_post(session, "products", payload)
    context.products_by_norm[normalize_name(created["name"])] = created
    context.stub_products_by_name[created["name"]] = created
    return created


def import_customers(
    session: requests.Session,
    users: dict[int, dict[str, Any]],
    execute: bool,
) -> tuple[dict[int, int], dict[str, dict[str, Any]], list[str]]:
    existing_by_email = customer_lookup(session)
    created_logs: list[str] = []
    source_to_customer_id: dict[int, int] = {}

    for user in users.values():
        email = user["email"]
        if (
            not email
            or "@example.com" in email
            or email in {"admin@sasanperfumes.com", "orders"}
            or not EMAIL_RE.match(email)
        ):
            continue

        caps = user["meta"].get("wp_capabilities", "") or ""
        if "administrator" in caps or "shop_manager" in caps:
            continue

        if email in existing_by_email:
            source_to_customer_id[user["id"]] = int(existing_by_email[email]["id"])
            continue

        billing = {
            "first_name": user["meta"].get("billing_first_name") or user["meta"].get("first_name") or "",
            "last_name": user["meta"].get("billing_last_name") or user["meta"].get("last_name") or "",
            "company": user["meta"].get("billing_company") or "",
            "address_1": user["meta"].get("billing_address_1") or "",
            "address_2": user["meta"].get("billing_address_2") or "",
            "city": user["meta"].get("billing_city") or "",
            "state": user["meta"].get("billing_state") or "",
            "postcode": user["meta"].get("billing_postcode") or "",
            "country": user["meta"].get("billing_country") or "",
            "email": email,
            "phone": user["meta"].get("billing_phone") or "",
        }
        shipping = {
            "first_name": user["meta"].get("shipping_first_name") or billing["first_name"],
            "last_name": user["meta"].get("shipping_last_name") or billing["last_name"],
            "company": user["meta"].get("shipping_company") or "",
            "address_1": user["meta"].get("shipping_address_1") or billing["address_1"],
            "address_2": user["meta"].get("shipping_address_2") or billing["address_2"],
            "city": user["meta"].get("shipping_city") or billing["city"],
            "state": user["meta"].get("shipping_state") or billing["state"],
            "postcode": user["meta"].get("shipping_postcode") or billing["postcode"],
            "country": user["meta"].get("shipping_country") or billing["country"],
        }
        payload = {
            "email": email,
            "username": user["login"] or f"legacy_{user['id']}",
            "password": random_password(),
            "first_name": billing["first_name"],
            "last_name": billing["last_name"],
            "billing": billing,
            "shipping": shipping,
            "meta_data": [
                {"key": "legacy_user_id", "value": str(user["id"])},
                {"key": "legacy_user_registered", "value": user["registered"]},
                {"key": "legacy_import_source", "value": "sasanperfumes.com"},
            ],
        }
        if not execute:
            created_logs.append(f"DRY customer create: {email}")
            continue

        try:
            created = wc_post(session, "customers", payload)
            existing_by_email[email] = created
            source_to_customer_id[user["id"]] = int(created["id"])
            created_logs.append(f"Created customer {email} -> {created['id']}")
            time.sleep(0.15)
        except Exception as exc:  # noqa: BLE001
            message = str(exc)
            if "email-exists" in message or "email exists" in message:
                refreshed = customer_lookup(session)
                existing_by_email.update(refreshed)
                if email in existing_by_email:
                    source_to_customer_id[user["id"]] = int(existing_by_email[email]["id"])
                    created_logs.append(f"Mapped pre-existing customer {email} -> {existing_by_email[email]['id']}")
                else:
                    created_logs.append(f"Skipped user-only existing email {email}")
                continue
            created_logs.append(f"Skipped customer {email}: {message}")

    return source_to_customer_id, existing_by_email, created_logs


def build_order_payload(
    session: requests.Session,
    context: ImportContext,
    order: dict[str, Any],
    customer_id_map: dict[int, int],
    create_missing_products: bool,
) -> dict[str, Any]:
    status = ORDER_STATUS_MAP.get(order["status"], order["status"].replace("wc-", "") or "pending")
    payload: dict[str, Any] = {
        "status": status,
        "currency": order["currency"] or "AED",
        "payment_method": order["payment_method"] or "cod",
        "payment_method_title": order["payment_method_title"] or "Cash on Delivery",
        "customer_note": order["customer_note"] or "",
        "billing": order["billing"],
        "shipping": {
            key: value
            for key, value in order["shipping"].items()
            if key in {"first_name", "last_name", "company", "address_1", "address_2", "city", "state", "postcode", "country", "phone"}
        },
        "line_items": [],
        "shipping_lines": order["shipping_lines"],
        "coupon_lines": order["coupon_lines"],
        "fee_lines": order["fees"],
        "meta_data": [
            {"key": "legacy_order_id", "value": str(order["id"])},
            {"key": "legacy_source", "value": "sasanperfumes.com"},
            {"key": "legacy_date_created_gmt", "value": order["date_created_gmt"]},
            {"key": "legacy_date_updated_gmt", "value": order["date_updated_gmt"]},
            {"key": "legacy_status", "value": order["status"]},
        ],
    }

    if order["customer_id"] and order["customer_id"] in customer_id_map:
        payload["customer_id"] = customer_id_map[order["customer_id"]]

    for item in order["legacy_item_rows"]:
        product = choose_product(session, context, item["name"], create_missing_products)
        payload["line_items"].append(
            {
                "product_id": int(product["id"]),
                "quantity": int(item["quantity"]),
                "subtotal": item["subtotal"],
                "total": item["total"],
            }
        )
    return payload


def delete_test_orders(session: requests.Session, order_ids: list[int]) -> list[str]:
    logs: list[str] = []
    for order_id in order_ids:
        try:
            wc_delete(session, f"orders/{order_id}")
            logs.append(f"Deleted temporary order {order_id}")
        except Exception as exc:  # noqa: BLE001
            logs.append(f"Could not delete temporary order {order_id}: {exc}")
    return logs


def main() -> None:
    parser = argparse.ArgumentParser(description="Import legacy Sasan Perfumes orders into cms.sasanperfumes.com via WooCommerce REST.")
    parser.add_argument("--execute", action="store_true", help="Actually create customers, products, orders, and refunds.")
    parser.add_argument("--limit", type=int, default=0, help="Import only the first N orders after sorting by legacy order id.")
    parser.add_argument("--delete-test-orders", nargs="*", type=int, default=[13626, 13627], help="Delete temporary probe orders before running.")
    parser.add_argument("--no-create-missing-products", action="store_true", help="Fail instead of creating draft placeholder products for missing legacy items.")
    args = parser.parse_args()

    rows_users = parse_insert_rows(DEFAULT_DUMPS["users"])
    rows_usermeta = parse_insert_rows(DEFAULT_DUMPS["usermeta"])
    rows_orders = parse_insert_rows(DEFAULT_DUMPS["orders"])
    rows_addresses = parse_insert_rows(DEFAULT_DUMPS["addresses"])
    rows_items = parse_insert_rows(DEFAULT_DUMPS["order_items"])
    rows_itemmeta = parse_insert_rows(DEFAULT_DUMPS["order_itemmeta"])

    users = build_users(rows_users, rows_usermeta)
    orders, refunds = build_orders(rows_orders, rows_addresses, rows_items, rows_itemmeta)

    session = requests.Session()
    session.auth = AUTH
    session.headers.update({"User-Agent": "Codex Legacy Order Import/1.0"})

    cleanup_logs = delete_test_orders(session, args.delete_test_orders)
    products_by_norm, stub_products = product_lookup(session)
    existing_legacy_order_ids, existing_legacy_refund_ids = existing_legacy_order_sets(session)

    context = ImportContext(
        products_by_norm=products_by_norm,
        stub_products_by_name=stub_products,
        existing_legacy_order_ids=existing_legacy_order_ids,
        existing_legacy_refund_ids=existing_legacy_refund_ids,
        existing_customers_by_email={},
        created_orders_by_legacy_id={},
    )

    customer_id_map, existing_customers, customer_logs = import_customers(session, users, args.execute)
    context.existing_customers_by_email = existing_customers

    order_statuses = Counter(order["status"] for order in orders.values())
    unique_item_names = sorted({item["name"] for order in orders.values() for item in order["legacy_item_rows"]})
    unmatched_names: list[str] = []
    for name in unique_item_names:
        mapped_name = MANUAL_PRODUCT_NAME_MAP.get(name.lower(), name)
        if normalize_name(mapped_name) not in context.products_by_norm and name not in context.stub_products_by_name:
            unmatched_names.append(name)

    importable_orders = [order for order in sorted(orders.values(), key=lambda item: item["id"]) if str(order["id"]) not in context.existing_legacy_order_ids]
    importable_orders = [order for order in importable_orders if order["status"] != "trash"]
    if args.limit:
        importable_orders = importable_orders[: args.limit]

    logs: list[str] = []
    imported_count = 0
    failed_orders: list[str] = []

    for order in importable_orders:
        try:
            payload = build_order_payload(
                session=session,
                context=context,
                order=order,
                customer_id_map=customer_id_map,
                create_missing_products=not args.no_create_missing_products,
            )
            if not args.execute:
                logs.append(f"DRY order create: legacy #{order['id']} -> {order['billing_email']} / {len(payload['line_items'])} items")
                continue
            created = wc_post(session, "orders", payload)
            context.created_orders_by_legacy_id[order["id"]] = created
            imported_count += 1
            logs.append(f"Created order legacy #{order['id']} -> {created['id']}")
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001
            failed_orders.append(f"Legacy order {order['id']}: {exc}")

    refund_logs: list[str] = []
    for refund in sorted(refunds, key=lambda item: item["id"]):
        if str(refund["id"]) in context.existing_legacy_refund_ids:
            continue

        parent_order = context.created_orders_by_legacy_id.get(refund["parent_order_id"])
        if not parent_order:
            refund_logs.append(f"Skipped refund {refund['id']} because parent order {refund['parent_order_id']} was not created in this run.")
            continue

        refund_payload = {
            "amount": decimal_str(abs(Decimal(str(refund["total_amount"])))),
            "reason": f"Legacy refund #{refund['id']} from sasanperfumes.com",
            "api_refund": False,
            "meta_data": [
                {"key": "legacy_refund_id", "value": str(refund["id"])},
                {"key": "legacy_source", "value": "sasanperfumes.com"},
                {"key": "legacy_date_created_gmt", "value": refund["date_created_gmt"]},
            ],
        }
        if not args.execute:
            refund_logs.append(f"DRY refund create: legacy #{refund['id']} -> parent {parent_order['id']}")
            continue

        try:
            created_refund = wc_post(session, f"orders/{parent_order['id']}/refunds", refund_payload)
            refund_logs.append(f"Created refund legacy #{refund['id']} -> {created_refund['id']}")
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001
            refund_logs.append(f"Failed refund {refund['id']}: {exc}")

    summary = {
        "mode": "execute" if args.execute else "dry-run",
        "cleanup_logs": cleanup_logs,
        "source_user_rows": len(users),
        "source_order_rows": len(orders),
        "source_refund_rows": len(refunds),
        "source_order_statuses": order_statuses,
        "unique_legacy_item_names": len(unique_item_names),
        "unmatched_legacy_item_names": unmatched_names,
        "customer_actions": customer_logs[:120],
        "orders_attempted": len(importable_orders),
        "orders_imported": imported_count,
        "order_logs_preview": logs[:200],
        "failed_orders": failed_orders[:200],
        "refund_logs": refund_logs[:120],
        "created_order_ids_preview": {str(key): value["id"] for key, value in list(context.created_orders_by_legacy_id.items())[:50]},
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
