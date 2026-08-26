import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import https from "https";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/security";
import { API_BASE, backendHeaders, backendMarketHeaders, backendPostHeaders, noCacheUrl, parseBackendJson, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

const COUNTRY_TO_MARKET: Record<string, string> = {
  QA: "qa",
  OM: "om",
  SA: "sa",
};

function normalizeOrderCountryCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function inferMarketFromOrderBody(body: Record<string, unknown>): string {
  const shipping = (body.shipping as Record<string, unknown> | undefined) || {};
  const billing = (body.billing as Record<string, unknown> | undefined) || {};
  const shippingCountry = normalizeOrderCountryCode(shipping.country || shipping.country_code);
  const billingCountry = normalizeOrderCountryCode(billing.country || billing.country_code);
  return COUNTRY_TO_MARKET[shippingCountry] || COUNTRY_TO_MARKET[billingCountry] || "";
}


const MARKET_CODES = new Set(["qa", "om", "sa"]);
const BACKEND_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "https://cms.sasanperfumes.com";
  }
})();

function responseHeadersFromNode(headers: Record<string, string | string[] | undefined>): Headers {
  const responseHeaders = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => responseHeaders.append(key, entry));
    } else if (value !== undefined) {
      responseHeaders.set(key, value);
    }
  });
  return responseHeaders;
}

function fetchWithPublicDns(url: string, init: RequestInit = {}): Promise<Response> {
  const parsed = new URL(url);
  const body = typeof init.body === "string" || Buffer.isBuffer(init.body) ? init.body : undefined;
  const headers = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : Array.isArray(init.headers)
      ? Object.fromEntries(init.headers.map(([key, value]) => [key, String(value)]))
      : Object.fromEntries(Object.entries(init.headers || {}).map(([key, value]) => [key, String(value)]));

  return new Promise<Response>((resolve, reject) => {
    const request = https.request(
      parsed,
      {
        method: init.method || "GET",
        headers,
        lookup: (hostname, options, callback) => {
          dns.resolve4(hostname, (error, addresses) => {
            if (error || addresses.length === 0) {
              callback(error || new Error(`No public DNS A record for ${hostname}`), undefined as never, undefined as never);
              return;
            }
            if (typeof options === "object" && options.all) {
              (callback as (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void)(
                null,
                addresses.map((address) => ({ address, family: 4 }))
              );
              return;
            }
            callback(null, addresses[0], 4);
          });
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("end", () => {
          resolve(new Response(Buffer.concat(chunks), {
            status: incoming.statusCode || 200,
            statusText: incoming.statusMessage || "",
            headers: responseHeadersFromNode(incoming.headers),
          }));
        });
      }
    );

    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function fetchOrdersBackend(url: string, init: RequestInit, marketCode?: string | null): Promise<Response> {
  const code = marketCode?.toLowerCase() || "";
  if (!MARKET_CODES.has(code)) {
    return fetch(noCacheUrl(url), init);
  }

  const headers = {
    ...(backendMarketHeaders(code, init.headers) as Record<string, string>),
    Origin: BACKEND_ORIGIN,
  };

  return fetchWithPublicDns(noCacheUrl(url), {
    ...init,
    headers,
  });
}

interface OrderLineItemMeta {
  key: string;
  value: string;
}

interface OrderLineItem {
  product_id: number;
  quantity: number;
  variation_id?: number;
  subtotal?: string;
  total?: string;
  tax_status?: string;
  meta_data?: OrderLineItemMeta[];
  // Blog-portable identity supplied by the storefront so the order can be
  // re-pointed at the same product on another market's blog. Stripped before
  // the payload reaches WooCommerce.
  sku?: string;
  slug?: string;
  name?: string;
}

interface OrderAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string;
  email?: string;
  phone?: string;
}

interface CouponLine {
  code: string;
}

interface FeeLine {
  name: string;
  total: string;
  tax_status?: string;
  tax_class?: string;
}

interface ShippingLine {
  method_id: string;
  method_title: string;
  total: string;
  total_tax?: string;
  tax_status?: string;
  taxes?: Array<{ id?: number; total: string }>;
}

interface CreateOrderRequest {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  status?: string;
  currency?: string;
  billing: OrderAddress;
  shipping: OrderAddress;
  line_items: OrderLineItem[];
  shipping_lines?: ShippingLine[];
  coupon_lines?: CouponLine[];
  fee_lines?: FeeLine[];
  customer_note?: string;
  customer_id?: number;
  meta_data?: Array<{ key: string; value: string }>;
}

/** Destinations where the fee charged at checkout is the only import charge. */
const GCC_DESTINATIONS = new Set(["AE", "SA", "QA", "OM", "BH", "KW"]);

const INCLUSIVE_VAT_RATES_BY_COUNTRY: Record<string, number> = {
  AE: 0.05,
  BH: 0.05,
  KW: 0.05,
  OM: 0.05,
  SA: 0.15,
  US: 0.05,
};

function getCurrencyDecimals(currency?: string): number {
  const code = (currency || "").trim().toUpperCase();
  return ["BHD", "KWD", "OMR"].includes(code) ? 3 : 2;
}

function normalizeCountryCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getInclusiveVatRate(body: { billing?: Partial<OrderAddress>; shipping?: Partial<OrderAddress> }): number {
  const shippingCountry = normalizeCountryCode(body.shipping?.country);
  const billingCountry = normalizeCountryCode(body.billing?.country);
  return INCLUSIVE_VAT_RATES_BY_COUNTRY[shippingCountry] ?? INCLUSIVE_VAT_RATES_BY_COUNTRY[billingCountry] ?? 0;
}

function normalizeShippingLinesForNoTax(shippingLines: ShippingLine[]): ShippingLine[] {
  return shippingLines.map((shippingLine) => ({
    ...shippingLine,
    tax_status: "none",
    total_tax: "0.00",
    taxes: [],
  }));
}

function normalizeOrderLineItemsForInclusiveTax(
  lineItems: OrderLineItem[],
  inclusiveVatRate: number,
  currency?: string
): OrderLineItem[] {
  if (inclusiveVatRate <= 0) {
    return lineItems;
  }

  const decimals = getCurrencyDecimals(currency);
  const divisor = 1 + inclusiveVatRate;

  return lineItems.map((lineItem) => {
    const subtotalSource = lineItem.subtotal ?? lineItem.total ?? "0";
    const totalSource = lineItem.total ?? lineItem.subtotal ?? "0";
    const subtotal = Number.parseFloat(String(subtotalSource));
    const total = Number.parseFloat(String(totalSource));

    return {
      ...lineItem,
      subtotal: Number.isFinite(subtotal) ? (subtotal / divisor).toFixed(decimals) : lineItem.subtotal,
      total: Number.isFinite(total) ? (total / divisor).toFixed(decimals) : lineItem.total,
    };
  });
}

function normalizeFeeLinesForNoTax(feeLines: FeeLine[], inclusiveVatRate: number, currency?: string): FeeLine[] {
  const decimals = getCurrencyDecimals(currency);

  return feeLines.map((feeLine) => {
    const total = Number.parseFloat(String(feeLine.total));
    const normalizedTotal = inclusiveVatRate > 0 && Number.isFinite(total) && total < 0
      ? (total / (1 + inclusiveVatRate)).toFixed(decimals)
      : feeLine.total;

    return {
      ...feeLine,
      total: normalizedTotal,
      tax_status: "none",
      tax_class: "",
    };
  });
}

// Product IDs are blog-local in WordPress multisite. The target market is
// derived from the shipping country (inferMarketFromOrderBody), which can differ
// from the storefront the cart was built on: a base-store product ID then does
// not exist on that market's blog and WooCommerce silently stores a line item
// with product_id 0, an empty name and no SKU. Re-resolve every item against the
// target market by SKU (preferred) or slug, and always carry a name through so
// an item that still cannot be resolved is at least identifiable in wp-admin.
const PRODUCT_LOOKUP_TIMEOUT_MS = 4000;

async function lookupProductInMarket(
  query: string,
  marketCode: string | undefined
): Promise<{ id: number; name?: string } | null> {
  const url = `${getOrdersApiBase(marketCode)}/products?${query}&per_page=1&status=publish&${getBasicAuthParams(marketCode)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRODUCT_LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetchOrdersBackend(url, {
      method: "GET",
      headers: backendHeaders(),
      signal: controller.signal,
    }, marketCode);
    if (!res.ok) return null;
    const products = await res.json();
    if (Array.isArray(products) && products.length > 0 && products[0]?.id) {
      return { id: Number(products[0].id), name: products[0].name };
    }
    return null;
  } catch {
    // Never block checkout on a lookup failure — fall through to the ID as sent.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveLineItemsForMarket(
  lineItems: OrderLineItem[],
  marketCode: string | undefined,
  sourceMarket: string | undefined
): Promise<OrderLineItem[]> {
  if (lineItems.length === 0) {
    return lineItems;
  }

  const cache = new Map<string, { id: number; name?: string } | null>();
  const normalizedTarget = (marketCode || "ae").toLowerCase();
  const normalizedSource = (sourceMarket || "").toLowerCase();
  // Same catalogue on both ends: the incoming ID is already blog-local and safe.
  const sameCatalogue = normalizedSource !== "" && normalizedSource === normalizedTarget;

  const resolveOne = async (item: OrderLineItem): Promise<OrderLineItem> => {
    if (sameCatalogue) {
      return item;
    }

    const queries: string[] = [];
    if (item.sku) queries.push(`sku=${encodeURIComponent(item.sku)}`);
    if (item.slug) queries.push(`slug=${encodeURIComponent(item.slug)}`);

    let resolved: { id: number; name?: string } | null = null;
    for (const query of queries) {
      if (!cache.has(query)) {
        cache.set(query, await lookupProductInMarket(query, marketCode));
      }
      resolved = cache.get(query) ?? null;
      if (resolved) break;
    }

    // Strip sku/slug before handing the item to WooCommerce: they are our
    // transport fields, not part of the WooCommerce line item schema.
    const { sku: _sku, slug: _slug, ...wooItem } = item;
    void _sku;
    void _slug;

    if (resolved) {
      return { ...wooItem, product_id: resolved.id, name: item.name || resolved.name };
    }

    // Catalogues differ per market blog, so an ID from another store either
    // does not exist here or — worse — points at an unrelated product. Never
    // carry it over: drop to 0 and record what was actually ordered so the
    // order stays readable and can be reconciled by hand.
    console.error("[orders] line item unresolvable in target market:", {
      targetMarket: normalizedTarget,
      sourceMarket: normalizedSource || "(unknown)",
      sourceProductId: item.product_id,
      sku: item.sku,
      slug: item.slug,
      name: item.name,
    });

    const fallbackName =
      item.name || item.slug || (item.sku ? `SKU ${item.sku}` : "Unmatched product");

    return {
      ...wooItem,
      product_id: 0,
      variation_id: 0,
      name: fallbackName,
      meta_data: [
        ...(item.meta_data || []),
        {
          key: "Source product",
          value: `${normalizedSource || "unknown"} #${item.product_id}${item.sku ? ` · SKU ${item.sku}` : ""}${item.slug ? ` · ${item.slug}` : ""}`,
        },
      ],
    };
  };

  return Promise.all(lineItems.map(resolveOne));
}

function parseMoney(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

// The order total the customer saw at checkout: line items + fees + shipping
// from the client payload (all amounts are VAT-inclusive display values).
function computeExpectedOrderTotal(body: {
  expected_total?: unknown;
  line_items?: unknown;
  fee_lines?: unknown;
  shipping_lines?: unknown;
}): number | null {
  const provided = parseMoney(body.expected_total);
  if (provided !== null && provided > 0) {
    return provided;
  }

  const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
  const feeLines = Array.isArray(body.fee_lines) ? body.fee_lines : [];
  const shippingLines = Array.isArray(body.shipping_lines) ? body.shipping_lines : [];
  if (lineItems.length === 0) return null;

  let total = 0;
  for (const item of lineItems) {
    const amount = parseMoney((item as OrderLineItem).total ?? (item as OrderLineItem).subtotal);
    if (amount === null) return null;
    total += amount;
  }
  for (const fee of feeLines) {
    const amount = parseMoney((fee as FeeLine).total);
    if (amount === null) return null;
    total += amount;
  }
  for (const shipping of shippingLines) {
    const amount = parseMoney((shipping as ShippingLine).total);
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

interface CreatedOrderResponse {
  id?: number;
  total?: string;
  currency?: string;
  order_key?: string;
  payment_url?: string;
  line_items?: Array<{ id?: number }>;
  fee_lines?: Array<{ id?: number; name?: string; total?: string }>;
  shipping_lines?: Array<{ id?: number }>;
}

function getOrderTotalTolerance(currency?: string): number {
  return 0.5 / Math.pow(10, getCurrencyDecimals(currency));
}

// WooCommerce (e.g. via multi-currency plugins) can recalculate order totals
// from backend product prices and ignore the totals the storefront submitted,
// making the charged amount differ from what the customer saw. Re-assert the
// intended line item / fee / shipping totals on the created order.
/**
 * Fees that the storefront sends are converted to net amounts by
 * normalizeFeeLinesForNoTax before the order is created. A fee that instead
 * comes from the cart never passes through that step: it still holds the
 * VAT-inclusive amount, WooCommerce charges VAT on top, and the resulting
 * discount is larger than the item it discounts — a "Buy 3 Get 1 Free" worth
 * 75.00 was being applied as 78.75, undercharging the order by the VAT.
 *
 * Only fees absent from the request are touched, so amounts the storefront
 * already normalised are never converted twice.
 */
async function normalizeCartSourcedFees(
  createdOrder: CreatedOrderResponse,
  orderData: CreateOrderRequest,
  marketCode: string | undefined,
  inclusiveVatRate: number,
  currencyCode?: string
): Promise<CreatedOrderResponse> {
  if (!createdOrder.id || inclusiveVatRate <= 0) {
    return createdOrder;
  }

  if (Array.isArray(orderData.fee_lines) && orderData.fee_lines.length > 0) {
    return createdOrder;
  }

  const createdFees = Array.isArray(createdOrder.fee_lines) ? createdOrder.fee_lines : [];
  const discountFees = createdFees.filter((fee) => parseMoney(String(fee.total)) !== null && parseMoney(String(fee.total))! < 0);

  if (discountFees.length === 0) {
    return createdOrder;
  }

  const decimals = getCurrencyDecimals(currencyCode || createdOrder.currency);
  const feeLines = discountFees.map((fee) => ({
    id: fee.id,
    name: fee.name,
    total: (parseMoney(String(fee.total))! / (1 + inclusiveVatRate)).toFixed(decimals),
    tax_status: "none",
    tax_class: "",
  }));

  try {
    const updateUrl = `${getOrdersApiBase(marketCode)}/orders/${createdOrder.id}?${getBasicAuthParams(marketCode)}`;
    const updateResponse = await fetchOrdersBackend(updateUrl, {
      method: "PUT",
      headers: backendPostHeaders(),
      body: JSON.stringify({ fee_lines: feeLines }),
    }, marketCode);

    if (updateResponse.ok) {
      return (await updateResponse.json()) as CreatedOrderResponse;
    }

    console.error("[orders] Cart-sourced fee normalization failed:", {
      orderId: createdOrder.id,
      status: updateResponse.status,
    });
  } catch (error) {
    console.error("[orders] Cart-sourced fee normalization error:", {
      orderId: createdOrder.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return createdOrder;
}

async function reconcileOrderTotals(
  createdOrder: CreatedOrderResponse,
  orderData: CreateOrderRequest,
  expectedTotal: number,
  marketCode: string | undefined
): Promise<CreatedOrderResponse> {
  const createdTotal = parseMoney(createdOrder.total);
  const tolerance = getOrderTotalTolerance(createdOrder.currency);
  if (!createdOrder.id || createdTotal === null || Math.abs(createdTotal - expectedTotal) <= tolerance) {
    return createdOrder;
  }

  console.error("[orders] WooCommerce order total mismatch, reconciling:", {
    orderId: createdOrder.id,
    createdTotal,
    expectedTotal,
    currency: createdOrder.currency,
    market: marketCode,
  });

  const updateData: Record<string, unknown> = {};

  // Carry the customer through the reconciliation write. Without it the order
  // came back owned by nobody: it showed as Guest in wp-admin and vanished from
  // the customer's own order history, because reconciliation runs for almost
  // any order carrying a coupon or a rounded fee.
  if (typeof orderData.customer_id === "number") {
    updateData.customer_id = orderData.customer_id;
  }

  // Re-asserting line item totals rewrites the amounts a coupon just reduced,
  // which silently removes the discount and leaves the coupon on the order at
  // zero. WooCommerce has already priced these items correctly against the
  // coupon, so leave them alone and reconcile only fees and shipping.
  const orderHasCoupons = Array.isArray(orderData.coupon_lines) && orderData.coupon_lines.length > 0;

  const createdLineItems = Array.isArray(createdOrder.line_items) ? createdOrder.line_items : [];
  if (!orderHasCoupons && createdLineItems.length === orderData.line_items.length) {
    updateData.line_items = createdLineItems.map((created, index) => ({
      id: created.id,
      subtotal: orderData.line_items[index].subtotal,
      total: orderData.line_items[index].total,
    }));
  }

  const intendedFees = orderData.fee_lines || [];
  const createdFees = Array.isArray(createdOrder.fee_lines) ? createdOrder.fee_lines : [];
  if (createdFees.length === intendedFees.length && intendedFees.length > 0) {
    updateData.fee_lines = createdFees.map((created, index) => ({
      id: created.id,
      name: intendedFees[index].name,
      total: intendedFees[index].total,
      tax_status: "none",
      tax_class: "",
    }));
  }

  const intendedShipping = orderData.shipping_lines || [];
  const createdShipping = Array.isArray(createdOrder.shipping_lines) ? createdOrder.shipping_lines : [];
  if (createdShipping.length === intendedShipping.length && intendedShipping.length > 0) {
    updateData.shipping_lines = createdShipping.map((created, index) => ({
      id: created.id,
      total: intendedShipping[index].total,
      tax_status: "none",
      total_tax: "0.00",
    }));
  }

  if (Object.keys(updateData).length === 0) {
    return createdOrder;
  }

  try {
    const updateUrl = `${getOrdersApiBase(marketCode)}/orders/${createdOrder.id}?${getBasicAuthParams(marketCode)}`;
    const updateResponse = await fetchOrdersBackend(updateUrl, {
      method: "PUT",
      headers: backendPostHeaders(),
      body: JSON.stringify(updateData),
    }, marketCode);
    if (updateResponse.ok) {
      const updatedOrder = (await updateResponse.json()) as CreatedOrderResponse;
      const updatedTotal = parseMoney(updatedOrder.total);
      console.error("[orders] Order total after reconciliation:", {
        orderId: createdOrder.id,
        updatedTotal,
        expectedTotal,
      });
      return updatedOrder;
    }
    console.error("[orders] Order total reconciliation update failed:", {
      orderId: createdOrder.id,
      status: updateResponse.status,
    });
  } catch (error) {
    console.error("[orders] Order total reconciliation error:", {
      orderId: createdOrder.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return createdOrder;
}

const PAYMENT_METHOD_TITLES: Record<string, string> = {
  woocommerce_payments: "Credit/Debit Card",
  card: "Credit/Debit Card",
  cod: "Cash on Delivery",
  bacs: "Bank Transfer",
  cheque: "Check Payment",
  paypal: "PayPal",
  paymob: "Credit/Debit Card",
  tabby: "Tabby - Pay in Installments",
  tabby_checkout: "Tabby - Pay in Installments",
  tabby_installments: "Tabby - Pay in Installments",
  tamara: "Tamara - Buy Now Pay Later",
  "tamara-gateway": "Tamara - Buy Now Pay Later",
};

function resolvePaymentMethodTitle(paymentMethod: string, providedTitle: unknown): string {
  if (typeof providedTitle === "string" && providedTitle.trim()) {
    return providedTitle.trim();
  }

  const normalizedMethod = paymentMethod.toLowerCase();
  if (PAYMENT_METHOD_TITLES[normalizedMethod]) {
    return PAYMENT_METHOD_TITLES[normalizedMethod];
  }
  if (normalizedMethod.startsWith("woocommerce_payments")) {
    return "Credit/Debit Card";
  }
  if (normalizedMethod.startsWith("card")) {
    return "Credit/Debit Card";
  }
  if (normalizedMethod.startsWith("paymob")) {
    return "Credit/Debit Card";
  }
  if (normalizedMethod.startsWith("tabby")) {
    return "Tabby - Pay in Installments";
  }
  if (normalizedMethod.startsWith("tamara")) {
    return "Tamara - Buy Now Pay Later";
  }

  return paymentMethod.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeOrderDisplayNumber<T extends { id?: number | string; number?: string | number }>(order: T): T {
  if (!order || order.id === undefined || order.id === null) {
    return order;
  }

  return {
    ...order,
    number: String(order.id),
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get("orderId");
  const orderKey = searchParams.get("order_key");
  const customerId = searchParams.get("customerId");
  const page = searchParams.get("page");
  const perPage = searchParams.get("per_page");
  const status = searchParams.get("status");

  try {
    const market = await getRequestMarket(searchParams.get("market"));
    let url: string;
    
    if (orderId) {
      // First fetch the order
      const orderUrl = `${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`;
      const orderResponse = await fetchOrdersBackend(orderUrl, {
        method: "GET",
        headers: backendHeaders(),
      }, market.code);
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        return NextResponse.json(
          {
            success: false,
            error: {
              code: errorData.code || "orders_error",
              message: errorData.message || "Failed to get order.",
            },
          },
          { status: orderResponse.status }
        );
      }
      
      const orderData = normalizeOrderDisplayNumber(await orderResponse.json());
      
      // Security check: Either order_key must match OR user must be authenticated and own the order
      if (orderKey) {
        // Guest checkout flow: Verify order_key matches (WooCommerce standard pattern)
        // The order_key is a secret token that proves legitimate access to the order
        if (orderData.order_key !== orderKey) {
          return forbiddenResponse("Invalid order key");
        }
      } else {
        // Authenticated user flow: Verify user owns this order
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
          return unauthorizedResponse(authResult.error);
        }
        
        if (orderData.customer_id !== authResult.user.user_id) {
          return forbiddenResponse("You do not have permission to view this order");
        }
      }
      
      // Enrich bundle items with is_free detection server-side
      // so the client always receives correctly-flagged data
      if (orderData.line_items && Array.isArray(orderData.line_items)) {
        for (const lineItem of orderData.line_items) {
          if (!lineItem.meta_data || !Array.isArray(lineItem.meta_data)) continue;
          const bundleMeta = lineItem.meta_data.find(
            (m: { key: string }) => m.key === "_bundle_items" || m.key === "bundle_items"
          );
          if (!bundleMeta) continue;
          let items = bundleMeta.value;
          if (typeof items === "string") {
            try { items = JSON.parse(items); } catch { continue; }
          }
          if (!Array.isArray(items) || items.length === 0) continue;
          // Skip if any item already has is_free explicitly set
          const hasFlag = items.some((bi: { is_free?: boolean }) => bi.is_free === true || bi.is_free === false);
          if (hasFlag) continue;
          const lineTotal = parseFloat(lineItem.total) || 0;
          if (lineTotal <= 0) continue;
          const oQty = lineItem.quantity || 1;
          const sumAll = items.reduce((s: number, bi: { price?: string | number; quantity?: number }) => {
            const p = typeof bi.price === "string" ? parseFloat(bi.price) : (bi.price || 0);
            const q = bi.quantity || 1;
            return s + (p * q * oQty);
          }, 0);
          const freeAmt = sumAll - lineTotal;
          if (freeAmt <= 0.01) continue;
          let rem = freeAmt;
          for (let i = items.length - 1; i >= 0 && rem > 0.01; i--) {
            const p = typeof items[i].price === "string" ? parseFloat(items[i].price) : (items[i].price || 0);
            const q = items[i].quantity || 1;
            const iTotal = p * q * oQty;
            if (iTotal > 0 && iTotal <= rem + 0.01) {
              items[i].is_free = true;
              items[i].is_addon = true;
              rem -= iTotal;
            }
          }
          bundleMeta.value = items;
        }
      }

      return NextResponse.json({ success: true, data: normalizeOrderDisplayNumber(orderData) });
    } else if (customerId) {
      // For listing orders by customer, always require authentication
      const authResult = await verifyAuth(request);
      if (!authResult.authenticated || !authResult.user) {
        return unauthorizedResponse(authResult.error);
      }
      
      // Verify the authenticated user is requesting their own orders
      if (parseInt(customerId) !== authResult.user.user_id) {
        return forbiddenResponse("You can only view your own orders");
      }
      
      const params = new URLSearchParams();
      params.set("customer", customerId);
      if (page) params.set("page", page);
      if (perPage) params.set("per_page", perPage);
      if (status) params.set("status", status);
      url = `${getOrdersApiBase(market.code)}/orders?${params.toString()}&${getBasicAuthParams(market.code)}`;
    } else {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID or Customer ID is required" } },
        { status: 400 }
      );
    }

    const response = await fetchOrdersBackend(url, {
      method: "GET",
      headers: backendHeaders(),
    }, market.code);

    let data: { code?: string; message?: string } | unknown[];
    const responseText = await response.text();
    try {
      data = parseBackendJson<{ code?: string; message?: string } | unknown[]>(responseText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_response",
            message: "Backend returned non-JSON response. If using LiteSpeed Cache, exclude /wp-json/* paths from caching.",
          },
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const errorData = Array.isArray(data) ? {} : data;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorData.code || "orders_error",
            message: errorData.message || "Failed to get orders.",
          },
        },
        { status: response.status }
      );
    }

    const normalizedData = Array.isArray(data)
      ? data.map((order) =>
          order && typeof order === "object"
            ? normalizeOrderDisplayNumber(order as { id?: number | string; number?: string | number })
            : order
        )
      : data;

    return NextResponse.json({ success: true, data: normalizedData });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const marketHint = inferMarketFromOrderBody(body) || request.nextUrl.searchParams.get("market");
    const market = await getRequestMarket(marketHint);
    const paymentMethod =
      typeof body.payment_method === "string" && body.payment_method.trim()
        ? body.payment_method.trim()
        : "paymob";
    
    const isCod = paymentMethod.toLowerCase() === "cod";
    const inclusiveVatRate = getInclusiveVatRate(body);
    const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
    const currencyCode = typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : undefined;

    const orderData: CreateOrderRequest = {
      payment_method: paymentMethod,
      payment_method_title: resolvePaymentMethodTitle(paymentMethod, body.payment_method_title),
      set_paid: false,
      ...(isCod ? { status: "processing" } : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      billing: {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        address_1: body.billing.address_1,
        city: body.billing.city,
        state: body.billing.state || "",
        postcode: body.billing.postcode || "",
        country: body.billing.country,
        email: body.billing.email,
        phone: body.billing.phone,
      },
      shipping: {
        first_name: body.shipping?.first_name || body.billing.first_name,
        last_name: body.shipping?.last_name || body.billing.last_name,
        address_1: body.shipping?.address_1 || body.billing.address_1,
        city: body.shipping?.city || body.billing.city,
        state: body.shipping?.state || body.billing.state || "",
        postcode: body.shipping?.postcode || body.billing.postcode || "",
        country: body.shipping?.country || body.billing.country,
      },
      line_items: await resolveLineItemsForMarket(
        normalizeOrderLineItemsForInclusiveTax(lineItems, inclusiveVatRate, currencyCode),
        market.code,
        typeof body.source_market === "string" ? body.source_market : undefined
      ),
      customer_note: body.customer_note || "",
    };

    if (Array.isArray(body.shipping_lines) && body.shipping_lines.length > 0) {
      orderData.shipping_lines = normalizeShippingLinesForNoTax(body.shipping_lines);
    }

    if (Array.isArray(body.coupon_lines) && body.coupon_lines.length > 0) {
      orderData.coupon_lines = body.coupon_lines;
    }

    if (Array.isArray(body.fee_lines) && body.fee_lines.length > 0) {
      orderData.fee_lines = normalizeFeeLinesForNoTax(body.fee_lines, inclusiveVatRate, currencyCode);
    }

    /**
     * Customs is decided in the browser, so a request that simply omits the fee
     * has it skipped entirely. Re-derive it here and add it when it is missing.
     *
     * Deliberately one-directional: an amount the storefront already sent is
     * left alone. The server sees the same country field the customer chose, so
     * it cannot detect an honest mis-selection — only a fee that never arrived.
     */
    const customsCountry = normalizeCountryCode(
      orderData.shipping?.country || orderData.billing?.country
    );
    if (customsCountry && customsCountry !== "AE") {
      const existingFees = orderData.fee_lines || [];
      const hasCustoms = existingFees.some(
        (fee) => String(fee.name || "").toLowerCase().includes("customs")
      );

      if (!hasCustoms) {
        const decimals = getCurrencyDecimals(currencyCode);
        const merchandiseNet = (orderData.line_items || []).reduce((sum, item) => {
          const value = parseMoney(String(item.total ?? item.subtotal ?? "0"));
          return sum + (value ?? 0);
        }, 0);
        const discountsNet = existingFees.reduce((sum, fee) => {
          const value = parseMoney(String(fee.total));
          return sum + (value !== null && value < 0 ? value : 0);
        }, 0);

        const taxableNet = Math.max(merchandiseNet + discountsNet, 0);
        const customsTotal = taxableNet * 0.2;

        if (customsTotal > 0) {
          orderData.fee_lines = [
            ...existingFees,
            {
              // Outside the GCC the destination levies its own duty on arrival,
              // so this is a handling charge, not customs already settled.
              name: GCC_DESTINATIONS.has(customsCountry) ? "Customs fees" : "Handling & export fee",
              total: customsTotal.toFixed(decimals),
              tax_status: "none",
              tax_class: "",
            },
          ];
          console.error("[orders] Customs fee was missing and has been added:", {
            country: customsCountry,
            customsTotal: customsTotal.toFixed(decimals),
          });
        }
      }
    }

    // Resolve both guest and authenticated checkouts by email in the target
    // market. Numeric customer IDs are not portable across multisite blogs.
    let resolvedCustomerId = 0;
    const billingEmail = orderData.billing?.email;
    if (billingEmail) {
      try {
        const lookupUrl = `${getOrdersApiBase(market.code)}/customers?email=${encodeURIComponent(billingEmail)}&per_page=1&${getBasicAuthParams(market.code)}`;
        const lookupRes = await fetchOrdersBackend(lookupUrl, {
          method: "GET",
          headers: backendHeaders(),
        }, market.code);
        if (lookupRes.ok) {
          const customers = await lookupRes.json();
          if (Array.isArray(customers) && customers.length > 0 && customers[0].id) {
            resolvedCustomerId = customers[0].id;
          }
        }
      } catch {
        // Lookup failed — fall back to guest (customer_id: 0)
      }
    }
    // Customer IDs are blog-local in WordPress multisite. Always use the ID
    // resolved in the target market, never an ID supplied by another store.
    orderData.customer_id = resolvedCustomerId;

    const expectedTotal = computeExpectedOrderTotal(body);

    const metaData = Array.isArray(body.meta_data) ? [...body.meta_data] : [];
    metaData.push({ key: "_frontend_prices_include_vat", value: "yes" });
    if (expectedTotal !== null && expectedTotal > 0) {
      metaData.push({ key: "_frontend_expected_total", value: expectedTotal.toFixed(getCurrencyDecimals(currencyCode)) });
      if (currencyCode) {
        metaData.push({ key: "_frontend_expected_currency", value: currencyCode });
      }
    }
    if (inclusiveVatRate > 0) {
      metaData.push({ key: "_frontend_vat_rate", value: String(inclusiveVatRate) });
    }
    if (metaData.length > 0) {
      orderData.meta_data = metaData;
    }

    const url = `${getOrdersApiBase(market.code)}/orders?${getBasicAuthParams(market.code)}`;
    
    // Authenticate via query params only (consumer_key/consumer_secret in URL).
    // Sending an Authorization: Basic header alongside query-param auth causes
    // WordPress Application Passwords to intercept and reject the request with
    // "unknown username" before WooCommerce can authenticate via consumer key.
    const response = await fetchOrdersBackend(url, {
      method: "POST",
      headers: backendPostHeaders(),
      body: JSON.stringify(orderData),
    }, market.code);

    let data = await response.json();

    if (!response.ok) {
      const errorCode = data.code || "order_creation_error";
      let errorMessage = data.message || "Failed to create order.";

      console.error("[orders] WooCommerce order creation failed:", {
        status: response.status,
        code: errorCode,
        message: errorMessage,
        market: market.code,
        billingEmail: body.billing?.email,
        customerId: orderData.customer_id,
      });

      // Replace raw WP auth errors with user-friendly messages
      if (/unknown username/i.test(errorMessage) || errorCode === "invalid_username") {
        errorMessage = "Could not process your order. Please try again or use a different email address.";
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
          },
        },
        { status: response.status }
      );
    }

    // Runs before reconciliation, which returns early when the created total
    // already matches and would otherwise leave the inflated discount in place.
    data = await normalizeCartSourcedFees(data, orderData, market.code, inclusiveVatRate, currencyCode);

    if (expectedTotal !== null && expectedTotal > 0) {
      data = await reconcileOrderTotals(data, orderData, expectedTotal, market.code);
    }

    const normalizedOrder = normalizeOrderDisplayNumber(data);

    return NextResponse.json({ 
      success: true, 
      order: normalizedOrder,
      order_id: normalizedOrder.id,
      order_key: normalizedOrder.order_key,
      payment_url: normalizedOrder.payment_url || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      },
      { status: 500 }
    );
  }
}

interface UpdateOrderRequest {
  order_id: number;
  status?: string;
  set_paid?: boolean;
  transaction_id?: string;
  payment_method?: string;
  payment_method_title?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const market = await getRequestMarket(request.nextUrl.searchParams.get("market"));
    const body: UpdateOrderRequest = await request.json();
    
    if (!body.order_id) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID is required" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.status) {
      updateData.status = body.status;
    }
    
    if (body.set_paid !== undefined) {
      updateData.set_paid = body.set_paid;
    }
    
    if (body.transaction_id) {
      updateData.transaction_id = body.transaction_id;
    }
    
    if (body.payment_method) {
      updateData.payment_method = body.payment_method;
    }
    
    if (body.payment_method_title) {
      updateData.payment_method_title = body.payment_method_title;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "no_updates", message: "No update fields provided" } },
        { status: 400 }
      );
    }

    const url = `${getOrdersApiBase(market.code)}/orders/${body.order_id}?${getBasicAuthParams(market.code)}`;
    
    const response = await fetchOrdersBackend(url, {
      method: "PUT",
      headers: backendPostHeaders(),
      body: JSON.stringify(updateData),
    }, market.code);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "order_update_error",
            message: data.message || "Failed to update order.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      order: data,
      order_id: data.id,
      status: data.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      },
      { status: 500 }
    );
  }
}
