import { NextRequest, NextResponse } from "next/server";
import { getRequestMarket } from "@/lib/market/server";
import { backendHeaders, backendPostHeaders, extractMarketCode, noCacheUrl, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { buildCheckoutSessionParams, createStripeCheckoutSession } from "@/lib/stripe/api";
import { getStripeSecretKey } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

function getBasicAuthHeader(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

function getRequestOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://shapehive.com";
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = getStripeSecretKey();
    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "stripe_not_configured",
            message: "Stripe secret key is missing. Add STRIPE_SECRET_KEY in Hostinger environment variables.",
          },
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const orderId = Number(body.order_id);
    const orderKey = String(body.order_key || "");
    const locale = String(body.locale || "en");
    const marketPrefix = String(body.market_prefix || "");

    if (!orderId || !orderKey) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID and order key are required." } },
        { status: 400 }
      );
    }

    const marketHint = extractMarketCode(marketPrefix);
    const market = await getRequestMarket(marketHint || undefined);
    const orderUrl = `${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`;
    const orderResponse = await fetch(noCacheUrl(orderUrl), {
      method: "GET",
      headers: backendHeaders(),
      cache: "no-store",
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: order.code || "order_fetch_failed",
            message: order.message || "Failed to fetch order before creating Stripe session.",
          },
        },
        { status: orderResponse.status }
      );
    }

    if (order.order_key !== orderKey) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_order_key", message: "Invalid order key." } },
        { status: 403 }
      );
    }

    const amount = parseFloat(order.total || "0");
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_amount", message: "Order total is invalid for Stripe." } },
        { status: 400 }
      );
    }

    const origin = getRequestOrigin(request);
    const prefix = marketPrefix === "/" ? "" : marketPrefix;
    const successUrl =
      `${origin}${prefix}/${locale}/order-confirmation?order_id=${orderId}` +
      `&order_key=${encodeURIComponent(orderKey)}&stripe_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      `${origin}${prefix}/${locale}/checkout?payment_cancelled=stripe&order_id=${orderId}` +
      `&order_key=${encodeURIComponent(orderKey)}`;

    const session = await createStripeCheckoutSession(
      secretKey,
      buildCheckoutSessionParams({
        orderId,
        orderKey,
        amount,
        currency: order.currency || "AED",
        customerEmail: order.billing?.email,
        successUrl,
        cancelUrl,
        marketCode: market.code,
        locale,
      })
    );

    await fetch(noCacheUrl(`${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`), {
      method: "PUT",
      headers: backendPostHeaders({
        Authorization: getBasicAuthHeader(market.code),
      }),
      body: JSON.stringify({
        payment_method: "stripe",
        payment_method_title: "Credit/Debit Card",
        meta_data: [
          { key: "_stripe_checkout_session_id", value: session.id },
          { key: "_stripe_payment_status", value: session.payment_status || "unpaid" },
        ],
      }),
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      session_id: session.id,
      checkout_url: session.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "stripe_session_error",
          message: error instanceof Error ? error.message : "Failed to create Stripe checkout session.",
        },
      },
      { status: 500 }
    );
  }
}
