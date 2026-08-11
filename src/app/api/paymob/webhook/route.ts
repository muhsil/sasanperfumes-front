import { NextRequest, NextResponse } from "next/server";
import { backendMarketPostHeaders, fetchBackendForMarket, wpJsonSubsiteBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import {
  getPaymobCurrencyMinorUnit,
  verifyPaymobWebhookHmac,
  type PaymobWebhookPayload,
} from "@/lib/paymob/api";
import { getPaymobHmacSecret } from "@/lib/paymob/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PaymobWebhookOrder {
  total?: string;
  currency?: string;
  status?: string;
  transaction_id?: string;
  payment_method_title?: string;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}

const PROCESSED_EVENTS_META_KEY = "_paymob_processed_events";
const MAX_PROCESSED_EVENTS = 20;

function getOrderMeta(order: PaymobWebhookOrder, key: string): string {
  const value = order.meta_data?.find((item) => item.key === key)?.value;
  return value === undefined || value === null ? "" : String(value);
}

function getProcessedEvents(order: PaymobWebhookOrder): string[] {
  const rawValue = getOrderMeta(order, PROCESSED_EVENTS_META_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string").slice(-MAX_PROCESSED_EVENTS)
      : [];
  } catch {
    return [];
  }
}

function appendProcessedEvent(events: string[], eventKey: string): string {
  return JSON.stringify([...events.filter((value) => value !== eventKey), eventKey].slice(-MAX_PROCESSED_EVENTS));
}

async function updateAndVerifyOrder(
  orderUrl: string,
  market: string,
  body: Record<string, unknown>,
  verify: (order: PaymobWebhookOrder) => boolean
): Promise<PaymobWebhookOrder | null> {
  const response = await fetchBackendForMarket(orderUrl, {
    method: "PUT",
    headers: backendMarketPostHeaders(market),
    body: JSON.stringify(body),
  }, market).catch(() => null);

  if (!response?.ok) return null;
  const updatedOrder = (await response.json().catch(() => ({}))) as PaymobWebhookOrder;
  return verify(updatedOrder) ? updatedOrder : null;
}

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonSubsiteBaseForMarket(marketCode)}/wc/v3`;
}

function extractWcOrderId(payload: PaymobWebhookPayload): number {
  const extra = payload.obj?.payment_key_claims?.extra;
  const fromExtra = Number(extra?.order_id);
  if (Number.isFinite(fromExtra) && fromExtra > 0) return fromExtra;

  const merchantOrderId = payload.obj?.order?.merchant_order_id || "";
  const match = merchantOrderId.match(/^wc-(\d+)-/);
  if (match) return Number(match[1]);

  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const hmacSecret = getPaymobHmacSecret();
    if (!hmacSecret) {
      return NextResponse.json({ received: false, error: "paymob_not_configured" }, { status: 500 });
    }

    const receivedHmac = request.nextUrl.searchParams.get("hmac") || "";
    const payload = (await request.json()) as PaymobWebhookPayload;

    if (payload.type !== "TRANSACTION" || !payload.obj) {
      return NextResponse.json({ received: true });
    }

    if (!verifyPaymobWebhookHmac(payload, receivedHmac, hmacSecret)) {
      return NextResponse.json({ received: false, error: "invalid_hmac" }, { status: 403 });
    }

    const orderId = extractWcOrderId(payload);
    if (!orderId) {
      return NextResponse.json({ received: true, warning: "order_not_resolved" });
    }

    const marketCode = request.nextUrl.searchParams.get("market") || "";
    const market = marketCode === "intl" ? "" : marketCode;
    const transactionId = String(payload.obj.id || "");
    const isSuccess =
      payload.obj.success === true &&
      payload.obj.pending !== true &&
      payload.obj.error_occured !== true;
    const isFailed = payload.obj.success !== true && payload.obj.pending !== true;
    const orderUrl = `${getOrdersApiBase(market)}/orders/${orderId}?${getBasicAuthParams(market)}`;
    const orderResponse = await fetchBackendForMarket(
      orderUrl,
      { method: "GET", cache: "no-store" },
      market
    );
    const order = (await orderResponse.json().catch(() => ({}))) as PaymobWebhookOrder;

    if (!orderResponse.ok) {
      return NextResponse.json({ received: false, error: "order_fetch_failed" }, { status: 502 });
    }

    const orderCurrency = (order.currency || "").toUpperCase();
    const transactionCurrency = (payload.obj.currency || "").toUpperCase();
    const orderTotal = Number.parseFloat(order.total || "0");
    const expectedAmountMinor = Math.round(
      orderTotal * Math.pow(10, getPaymobCurrencyMinorUnit(orderCurrency))
    );

    if (
      !Number.isFinite(orderTotal) ||
      orderTotal <= 0 ||
      !payload.obj.amount_cents ||
      payload.obj.amount_cents !== expectedAmountMinor ||
      transactionCurrency !== orderCurrency
    ) {
      return NextResponse.json(
        { received: false, error: "order_amount_mismatch" },
        { status: 400 }
      );
    }

    if (!isSuccess && !isFailed) {
      return NextResponse.json({ received: true, ignored: "pending_transaction" });
    }

    const callbackResult = isSuccess ? "success" : "failed";
    const eventKey = `${transactionId || "unknown"}:${callbackResult}`;
    const processedEvents = getProcessedEvents(order);
    if (processedEvents.includes(eventKey)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const callbackMeta = [
      { key: "_paymob_transaction_id", value: transactionId },
      { key: "_paymob_order_id", value: String(payload.obj.order?.id || "") },
      { key: "_paymob_last_callback_result", value: callbackResult },
      { key: "_paymob_last_callback_at", value: new Date().toISOString() },
      { key: "_paymob_callback_amount_minor", value: String(payload.obj.amount_cents || "") },
      { key: "_paymob_callback_currency", value: transactionCurrency },
      { key: PROCESSED_EVENTS_META_KEY, value: appendProcessedEvent(processedEvents, eventKey) },
    ];

    if (isSuccess) {
      const paidStatus = ["processing", "completed", "refunded"].includes((order.status || "").toLowerCase());
      if (paidStatus && order.transaction_id === transactionId) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      const updatedOrder = await updateAndVerifyOrder(
        orderUrl,
        market,
        {
          status: "processing",
          set_paid: true,
          transaction_id: transactionId,
          payment_method: "paymob",
          payment_method_title: order.payment_method_title || "Credit/Debit Card",
          meta_data: [
            ...callbackMeta,
            { key: "_paymob_sync_status", value: "synced_paid" },
          ],
        },
        (updated) =>
          ["processing", "completed", "refunded"].includes((updated.status || "").toLowerCase()) &&
          updated.transaction_id === transactionId &&
          getOrderMeta(updated, "_paymob_sync_status") === "synced_paid"
      );

      if (!updatedOrder) {
        return NextResponse.json(
          { received: false, error: "order_payment_update_failed" },
          { status: 502 }
        );
      }
    } else if (isFailed) {
      const paidStatus = ["processing", "completed", "refunded"].includes((order.status || "").toLowerCase());
      const latestReference = getOrderMeta(order, "_paymob_special_reference");
      const callbackReference = payload.obj.order?.merchant_order_id || "";

      if (paidStatus || order.transaction_id || !callbackReference || callbackReference !== latestReference) {
        return NextResponse.json({ received: true, ignored: "stale_or_paid_attempt" });
      }

      const updatedOrder = await updateAndVerifyOrder(
        orderUrl,
        market,
        {
          status: "failed",
          meta_data: [
            ...callbackMeta,
            { key: "_paymob_sync_status", value: "synced_failed" },
          ],
        },
        (updated) =>
          (updated.status || "").toLowerCase() === "failed" &&
          getOrderMeta(updated, "_paymob_sync_status") === "synced_failed"
      );

      if (!updatedOrder) {
        return NextResponse.json(
          { received: false, error: "order_failure_update_failed" },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { received: false, error: error instanceof Error ? error.message : "webhook_error" },
      { status: 500 }
    );
  }
}
