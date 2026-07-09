const STRIPE_API_BASE = "https://api.stripe.com/v1";
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "KWD", "OMR"]);

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_status?: string;
  status?: string;
  payment_intent?: string | { id?: string } | null;
}

function appendParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  params.append(key, String(value));
}

function getCurrencyMinorUnit(currency: string): number {
  return THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2;
}

export function buildCheckoutSessionParams(input: {
  orderId: number | string;
  orderKey: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  marketCode?: string;
  locale?: string;
}) {
  const params = new URLSearchParams();
  const currencyMinorUnit = getCurrencyMinorUnit(input.currency);
  const amountMinor = Math.round(input.amount * Math.pow(10, currencyMinorUnit));

  appendParam(params, "mode", "payment");
  appendParam(params, "payment_method_types[]", "card");
  appendParam(params, "client_reference_id", String(input.orderId));
  appendParam(params, "success_url", input.successUrl);
  appendParam(params, "cancel_url", input.cancelUrl);
  appendParam(params, "line_items[0][quantity]", "1");
  appendParam(params, "line_items[0][price_data][currency]", input.currency.toLowerCase());
  appendParam(params, "line_items[0][price_data][unit_amount]", amountMinor);
  appendParam(params, "line_items[0][price_data][product_data][name]", `Sasan Perfumes Order #${input.orderId}`);
  appendParam(params, "metadata[order_id]", String(input.orderId));
  appendParam(params, "metadata[order_key]", input.orderKey);
  appendParam(params, "metadata[market]", input.marketCode || "intl");
  appendParam(params, "payment_intent_data[metadata][order_id]", String(input.orderId));
  appendParam(params, "payment_intent_data[metadata][order_key]", input.orderKey);
  appendParam(params, "payment_intent_data[metadata][market]", input.marketCode || "intl");
  if (input.customerEmail) {
    appendParam(params, "customer_email", input.customerEmail);
  }

  return params;
}

async function parseStripeResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Stripe request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function createStripeCheckoutSession(secretKey: string, params: URLSearchParams) {
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  return parseStripeResponse<StripeCheckoutSession>(response);
}

export async function retrieveStripeCheckoutSession(secretKey: string, sessionId: string) {
  const response = await fetch(
    `${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    }
  );

  return parseStripeResponse<StripeCheckoutSession>(response);
}

export function getPaymentIntentId(session: StripeCheckoutSession): string | undefined {
  if (!session.payment_intent) return undefined;
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent.id;
}
