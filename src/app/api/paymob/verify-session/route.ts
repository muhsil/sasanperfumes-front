import { NextRequest, NextResponse } from "next/server";
import { getRequestMarket } from "@/lib/market/server";
import { backendMarketPostHeaders, fetchBackendForMarket, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { verifyPaymobRedirectHmac } from "@/lib/paymob/api";
import { getPaymobHmacSecret } from "@/lib/paymob/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const orderId = Number(params.get("order_id") || 0);
    const orderKey = params.get("order_key") || "";
    const transactionId = params.get("id") || "";
    const success = (params.get("success") || "").toLowerCase() === "true";
    const pending = (params.get("pending") || "").toLowerCase() === "true";

    if (!orderId || !orderKey || !transactionId) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID, order key, and transaction ID are required." } },
        { status: 400 }
      );
    }

    const hmacSecret = getPaymobHmacSecret();
    if (!hmacSecret) {
      return NextResponse.json(
        { success: false, error: { code: "paymob_not_configured", message: "PAYMOB_HMAC_SECRET is missing in environment variables." } },
        { status: 500 }
      );
    }

    if (!verifyPaymobRedirectHmac(params, hmacSecret)) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_hmac", message: "Paymob payment signature verification failed." } },
        { status: 403 }
      );
    }

    const paymentStatus = success ? "success" : pending ? "pending" : "failed";
    const market = await getRequestMarket();

    if (paymentStatus === "success") {
      await fetchBackendForMarket(`${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`, {
        method: "PUT",
        headers: backendMarketPostHeaders(market.code),
        body: JSON.stringify({
          status: "processing",
          set_paid: true,
          transaction_id: transactionId,
          payment_method: "paymob",
          payment_method_title: "Credit/Debit Card",
          meta_data: [
            { key: "_paymob_transaction_id", value: transactionId },
            { key: "_paymob_order_id", value: params.get("order") || "" },
          ],
        }),
      }, market.code);
    }

    return NextResponse.json({
      success: true,
      payment_status: paymentStatus,
      transaction_id: transactionId,
      status_message:
        paymentStatus === "success"
          ? "Paymob payment completed."
          : paymentStatus === "failed"
            ? "Paymob payment was not completed."
            : "Paymob payment is pending.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "paymob_verify_error",
          message: error instanceof Error ? error.message : "Failed to verify Paymob payment.",
        },
      },
      { status: 500 }
    );
  }
}
