import { NextRequest, NextResponse } from "next/server";
import { getRequestMarket } from "@/lib/market/server";
import { backendMarketPostHeaders, extractMarketCode, fetchBackendForMarket, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { buildPaymobCheckoutUrl, createPaymobIntention, getPaymobCurrencyMinorUnit } from "@/lib/paymob/api";
import {
  getPaymobAllowedCurrencies,
  getPaymobIntegrationIdForMethod,
  getPaymobIntegrationIds,
  getPaymobPublicKey,
  getPaymobSecretKey,
  type PaymobPaymentMethod,
} from "@/lib/paymob/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PaymobCheckoutOrder {
  code?: string;
  message?: string;
  order_key?: string;
  total?: string;
  currency?: string;
  status?: string;
  transaction_id?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

function getRequestOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://sasanperfumes.com";
}

const PAYMOB_METHOD_TITLES: Record<PaymobPaymentMethod, string> = {
  card: "Credit/Debit Card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  tabby: "Tabby - Pay in Installments",
  tamara: "Tamara - Buy Now Pay Later",
};

function resolvePaymobPaymentMethod(value: unknown): PaymobPaymentMethod {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "paymob_tabby" || normalized === "tabby") return "tabby";
  if (normalized === "paymob_tamara" || normalized === "tamara") return "tamara";
  if (normalized === "paymob_apple_pay" || normalized === "apple_pay") return "apple_pay";
  if (normalized === "paymob_google_pay" || normalized === "google_pay") return "google_pay";
  return "card";
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = getPaymobSecretKey();
    const publicKey = getPaymobPublicKey();
    const configuredIntegrationIds = getPaymobIntegrationIds();
    if (!secretKey || !publicKey || configuredIntegrationIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "paymob_not_configured",
            message: "Paymob keys are missing. Add PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, and PAYMOB_INTEGRATION_ID in environment variables.",
          },
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const paymentMethod = resolvePaymobPaymentMethod(body.payment_method);
    const integrationId = getPaymobIntegrationIdForMethod(paymentMethod);
    if (!integrationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "paymob_method_not_configured",
            message: `${PAYMOB_METHOD_TITLES[paymentMethod]} is not configured in Paymob.`,
          },
        },
        { status: 400 }
      );
    }
    const orderId = Number(body.order_id);
    const orderKey = String(body.order_key || "");
    const locale = String(body.locale || "en");
    const marketPrefix = String(body.market_prefix || "");
    const fallbackEmail = String(body.customer_email || "");

    if (!orderId || !orderKey) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID and order key are required." } },
        { status: 400 }
      );
    }

    const marketHint = extractMarketCode(marketPrefix);
    const market = await getRequestMarket(marketHint || undefined);
    const orderUrl = `${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`;
    const orderResponse = await fetchBackendForMarket(orderUrl, {
      method: "GET",
      cache: "no-store",
    }, market.code).catch(() => null);

    const order = orderResponse
      ? ((await orderResponse.json().catch(() => ({}))) as PaymobCheckoutOrder)
      : ({} as PaymobCheckoutOrder);

    if (!orderResponse || !orderResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: order.code || "order_fetch_failed",
            message: order.message || "Failed to verify the WooCommerce order before creating Paymob checkout.",
          },
        },
        { status: orderResponse?.status || 502 }
      );
    }

    if (!order.order_key || order.order_key !== orderKey) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_order_key", message: "Invalid order key." } },
        { status: 403 }
      );
    }

    if (["processing", "completed", "refunded"].includes((order.status || "").toLowerCase()) || order.transaction_id) {
      return NextResponse.json(
        { success: false, error: { code: "order_already_paid", message: "This order has already been paid." } },
        { status: 409 }
      );
    }

    const amount = parseFloat(order.total || "0");
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_amount", message: "Order total is invalid for Paymob." } },
        { status: 400 }
      );
    }

    const currency = (order.currency || market.defaultCurrency || "AED").toUpperCase();
    if (!getPaymobAllowedCurrencies().includes(currency)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "unsupported_currency",
            message: `Paymob is not configured for ${currency}.`,
          },
        },
        { status: 400 }
      );
    }
    const billingCountry = (order.billing?.country || "").toUpperCase();
    if ((paymentMethod === "tabby" || paymentMethod === "tamara") && (currency !== "AED" || billingCountry !== "AE")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "bnpl_uae_only",
            message: `${PAYMOB_METHOD_TITLES[paymentMethod]} is available only for UAE billing addresses in AED.`,
          },
        },
        { status: 400 }
      );
    }
    const amountMinor = Math.round(amount * Math.pow(10, getPaymobCurrencyMinorUnit(currency)));

    const origin = getRequestOrigin(request);
    const prefix = marketPrefix === "/" ? "" : marketPrefix;
    const redirectionUrl =
      `${origin}${prefix}/${locale}/order-confirmation?order_id=${orderId}` +
      `&order_key=${encodeURIComponent(orderKey)}&paymob=1` +
      `&market=${encodeURIComponent(market.code || "intl")}`;
    const notificationUrl = `${origin}/api/paymob/webhook?market=${market.code || "intl"}`;

    const billing = order.billing || {};
    const intention = await createPaymobIntention(secretKey, {
      amountMinor,
      currency,
      integrationIds: [integrationId],
      billing: {
        first_name: billing.first_name || "Guest",
        last_name: billing.last_name || "Customer",
        email: billing.email || fallbackEmail || "support@sasanperfumes.com",
        phone_number: billing.phone || "+971000000000",
        street: billing.address_1,
        city: billing.city,
        state: billing.state,
        country: billing.country || "AE",
        postal_code: billing.postcode,
      },
      specialReference: `wc-${orderId}-${Date.now()}`,
      redirectionUrl,
      notificationUrl,
      extras: {
        order_id: String(orderId),
        order_key: orderKey,
        market: market.code || "intl",
        payment_method: paymentMethod,
      },
    });

    const monitoringResponse = await fetchBackendForMarket(`${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`, {
      method: "PUT",
      headers: backendMarketPostHeaders(market.code),
      body: JSON.stringify({
        payment_method: "paymob",
        payment_method_title: PAYMOB_METHOD_TITLES[paymentMethod],
        meta_data: [
          { key: "_paymob_intention_id", value: intention.id },
          { key: "_paymob_special_reference", value: intention.special_reference || "" },
          { key: "_paymob_payment_method", value: paymentMethod },
          { key: "_paymob_sync_status", value: "awaiting_callback" },
          { key: "_paymob_checkout_created_at", value: new Date().toISOString() },
          { key: "_paymob_expected_amount_minor", value: String(amountMinor) },
          { key: "_paymob_expected_currency", value: currency },
        ],
      }),
    }, market.code).catch(() => null);

    if (!monitoringResponse?.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "order_monitoring_update_failed",
            message: "Payment checkout was created, but WooCommerce could not record its monitoring details. Please retry.",
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      intention_id: intention.id,
      checkout_url: buildPaymobCheckoutUrl(publicKey, intention.client_secret),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "paymob_session_error",
          message: error instanceof Error ? error.message : "Failed to create Paymob checkout.",
        },
      },
      { status: 500 }
    );
  }
}
