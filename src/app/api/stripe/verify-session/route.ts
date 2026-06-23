import { NextRequest, NextResponse } from "next/server";
import { getRequestMarket } from "@/lib/market/server";
import { backendPostHeaders, noCacheUrl, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { getPaymentIntentId, retrieveStripeCheckoutSession } from "@/lib/stripe/api";
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

export async function GET(request: NextRequest) {
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

    const sessionId = request.nextUrl.searchParams.get("session_id") || "";
    const orderId = Number(request.nextUrl.searchParams.get("order_id") || 0);
    const orderKey = request.nextUrl.searchParams.get("order_key") || "";

    if (!sessionId || !orderId || !orderKey) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Session ID, order ID, and order key are required." } },
        { status: 400 }
      );
    }

    const session = await retrieveStripeCheckoutSession(secretKey, sessionId);
    const metadata = (session as { metadata?: Record<string, string> }).metadata || {};

    if (metadata.order_id && Number(metadata.order_id) !== orderId) {
      return NextResponse.json(
        { success: false, error: { code: "order_mismatch", message: "Stripe session does not match this order." } },
        { status: 403 }
      );
    }
    if (metadata.order_key && metadata.order_key !== orderKey) {
      return NextResponse.json(
        { success: false, error: { code: "order_key_mismatch", message: "Stripe session key does not match this order." } },
        { status: 403 }
      );
    }

    const market = await getRequestMarket();
    const paymentStatus = session.payment_status === "paid" ? "success" : session.status === "expired" ? "failed" : "pending";
    const paymentIntentId = getPaymentIntentId(session);

    if (paymentStatus === "success") {
      await fetch(noCacheUrl(`${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`), {
        method: "PUT",
        headers: backendPostHeaders({
          Authorization: getBasicAuthHeader(market.code),
        }),
        body: JSON.stringify({
          status: "processing",
          set_paid: true,
          transaction_id: paymentIntentId,
          payment_method: "stripe",
          payment_method_title: "Credit/Debit Card",
          meta_data: [
            { key: "_stripe_checkout_session_id", value: session.id },
            { key: "_stripe_payment_intent_id", value: paymentIntentId || "" },
            { key: "_stripe_payment_status", value: session.payment_status || "" },
          ],
        }),
      });
    }

    return NextResponse.json({
      success: true,
      payment_status: paymentStatus,
      transaction_id: paymentIntentId,
      stripe_session_id: session.id,
      status_message:
        paymentStatus === "success"
          ? "Stripe payment completed."
          : paymentStatus === "failed"
            ? "Stripe payment was not completed."
            : "Stripe payment is pending.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "stripe_verify_error",
          message: error instanceof Error ? error.message : "Failed to verify Stripe payment.",
        },
      },
      { status: 500 }
    );
  }
}

