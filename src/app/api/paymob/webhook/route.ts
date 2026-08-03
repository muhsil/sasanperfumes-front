import { NextRequest, NextResponse } from "next/server";
import { backendMarketPostHeaders, fetchBackendForMarket, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { verifyPaymobWebhookHmac, type PaymobWebhookPayload } from "@/lib/paymob/api";
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
    const isSuccess = payload.obj.success === true && payload.obj.pending !== true;
    const isFailed = payload.obj.success !== true && payload.obj.pending !== true;

    if (isSuccess) {
      await fetchBackendForMarket(`${getOrdersApiBase(market)}/orders/${orderId}?${getBasicAuthParams(market)}`, {
        method: "PUT",
        headers: backendMarketPostHeaders(market),
        body: JSON.stringify({
          status: "processing",
          set_paid: true,
          transaction_id: transactionId,
          payment_method: "paymob",
          payment_method_title: "Credit/Debit Card",
          meta_data: [
            { key: "_paymob_transaction_id", value: transactionId },
            { key: "_paymob_order_id", value: String(payload.obj.order?.id || "") },
          ],
        }),
      }, market);
    } else if (isFailed) {
      await fetchBackendForMarket(`${getOrdersApiBase(market)}/orders/${orderId}?${getBasicAuthParams(market)}`, {
        method: "PUT",
        headers: backendMarketPostHeaders(market),
        body: JSON.stringify({
          status: "failed",
          meta_data: [{ key: "_paymob_transaction_id", value: transactionId }],
        }),
      }, market);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { received: false, error: error instanceof Error ? error.message : "webhook_error" },
      { status: 500 }
    );
  }
}
