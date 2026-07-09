import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { backendMarketPostHeaders, fetchBackendForMarket, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getStripeWebhookSecret } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

function normalizeMarketCode(value: unknown): string {
  const code = String(value || "").trim().toLowerCase();
  return ["qa", "om", "sa"].includes(code) ? code : "intl";
}

function parseStripeSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(",").map((part) => part.trim()).filter(Boolean);
  const timestampPart = parts.find((part) => part.startsWith("t="));
  if (!timestampPart) return null;

  const timestamp = Number.parseInt(timestampPart.slice(2), 10);
  if (!Number.isFinite(timestamp)) return null;

  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (signatures.length === 0) return null;

  return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - parsed.timestamp);
  if (ageSeconds > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");

  return parsed.signatures.some((signature) => {
    try {
      const signatureBuffer = Buffer.from(signature, "hex");
      return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}

function extractMetadata(object: Record<string, unknown>): Record<string, string> {
  const sources = [object.metadata, object.payment_intent && typeof object.payment_intent === "object" ? (object.payment_intent as Record<string, unknown>).metadata : undefined];
  const metadata: Record<string, string> = {};

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) {
        metadata[key] = value.trim();
      }
    }
  }

  return metadata;
}

function getPaymentIntentId(object: Record<string, unknown>): string {
  const paymentIntent = object.payment_intent;
  if (typeof paymentIntent === "string") return paymentIntent;
  if (paymentIntent && typeof paymentIntent === "object") {
    const id = (paymentIntent as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  const objectId = object.id;
  return typeof objectId === "string" && objectId.startsWith("pi_") ? objectId : "";
}

function getSessionId(object: Record<string, unknown>): string {
  const objectId = object.id;
  return typeof objectId === "string" && objectId.startsWith("cs_") ? objectId : "";
}

async function syncOrder(
  marketCode: string,
  orderId: number,
  update: Record<string, unknown>
): Promise<Response> {
  const url = `${getOrdersApiBase(marketCode)}/orders/${orderId}?${getBasicAuthParams(marketCode)}`;
  return fetchBackendForMarket(url, {
    method: "PUT",
    headers: backendMarketPostHeaders(marketCode),
    body: JSON.stringify(update),
  }, marketCode);
}

export async function POST(request: NextRequest) {
  try {
    const secret = getStripeWebhookSecret();
    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "stripe_webhook_missing",
            message: "Stripe webhook secret is not configured.",
          },
        },
        { status: 500 }
      );
    }

    const signature = request.headers.get("stripe-signature") || request.headers.get("Stripe-Signature") || "";
    const payload = await request.text();

    if (!signature || !verifyStripeSignature(payload, signature, secret)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_signature",
            message: "Invalid Stripe webhook signature.",
          },
        },
        { status: 400 }
      );
    }

    const event = JSON.parse(payload) as {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };

    const eventType = String(event.type || "");
    const object = event.data?.object || {};
    const metadata = extractMetadata(object);
    const orderId = Number(metadata.order_id || object.client_reference_id || 0);
    const marketCode = normalizeMarketCode(metadata.market);
    const paymentIntentId = getPaymentIntentId(object) || metadata.payment_intent_id || "";
    const sessionId = getSessionId(object) || metadata.checkout_session_id || "";
    const paymentStatus = String(object.payment_status || object.status || "").toLowerCase();

    if (!orderId) {
      return NextResponse.json({ success: true, ignored: true, reason: "missing_order_id" });
    }

    const baseMeta = [
      { key: "_stripe_checkout_session_id", value: sessionId },
      { key: "_stripe_payment_intent_id", value: paymentIntentId },
      { key: "_stripe_payment_status", value: paymentStatus },
      { key: "_stripe_webhook_event", value: eventType },
      { key: "_stripe_webhook_event_id", value: String(event.id || "") },
    ].filter((item) => item.value !== "");

    if (eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded" || eventType === "checkout.session.async_payment_succeeded") {
      const response = await syncOrder(marketCode, orderId, {
        status: "processing",
        set_paid: true,
        transaction_id: paymentIntentId || sessionId,
        payment_method: "stripe",
        payment_method_title: "Credit/Debit Card",
        meta_data: baseMeta,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return NextResponse.json(
          {
            success: false,
            error: {
              code: data?.code || "order_update_failed",
              message: data?.message || "Failed to update order from Stripe webhook.",
            },
          },
          { status: response.status }
        );
      }
    } else if (eventType === "payment_intent.payment_failed" || eventType === "checkout.session.expired" || eventType === "checkout.session.async_payment_failed") {
      const response = await syncOrder(marketCode, orderId, {
        status: "failed",
        meta_data: baseMeta,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return NextResponse.json(
          {
            success: false,
            error: {
              code: data?.code || "order_update_failed",
              message: data?.message || "Failed to mark order as failed.",
            },
          },
          { status: response.status }
        );
      }
    }

    return NextResponse.json({
      success: true,
      received: true,
      event_type: eventType,
      order_id: orderId,
      market: marketCode,
      stripe_object_id: String(object.id || ""),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "stripe_webhook_error",
          message: error instanceof Error ? error.message : "Failed to process Stripe webhook.",
        },
      },
      { status: 500 }
    );
  }
}
