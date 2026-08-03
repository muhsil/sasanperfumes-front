import crypto from "crypto";
import { getPaymobApiBase } from "./config";

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "KWD", "OMR"]);

export function getPaymobCurrencyMinorUnit(currency: string): number {
  return THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2;
}

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  street?: string;
  building?: string;
  apartment?: string;
  floor?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface PaymobIntentionInput {
  amountMinor: number;
  currency: string;
  integrationIds: number[];
  billing: PaymobBillingData;
  specialReference: string;
  redirectionUrl: string;
  notificationUrl?: string;
  extras?: Record<string, string>;
}

export interface PaymobIntention {
  id: string;
  client_secret: string;
  special_reference?: string;
  extras?: { creation_extras?: Record<string, string> };
}

export async function createPaymobIntention(
  secretKey: string,
  input: PaymobIntentionInput
): Promise<PaymobIntention> {
  const response = await fetch(`${getPaymobApiBase()}/v1/intention/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${secretKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency.toUpperCase(),
      payment_methods: input.integrationIds,
      billing_data: {
        apartment: input.billing.apartment || "NA",
        first_name: input.billing.first_name || "NA",
        last_name: input.billing.last_name || "NA",
        street: input.billing.street || "NA",
        building: input.billing.building || "NA",
        phone_number: input.billing.phone_number || "NA",
        city: input.billing.city || "NA",
        country: input.billing.country || "AE",
        email: input.billing.email || "NA",
        floor: input.billing.floor || "NA",
        state: input.billing.state || "NA",
      },
      special_reference: input.specialReference,
      redirection_url: input.redirectionUrl,
      notification_url: input.notificationUrl,
      extras: input.extras || {},
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.client_secret) {
    const message =
      data?.detail ||
      data?.message ||
      (data ? JSON.stringify(data).slice(0, 300) : `Paymob request failed with status ${response.status}`);
    throw new Error(typeof message === "string" ? message : "Failed to create Paymob intention.");
  }

  return data as PaymobIntention;
}

export function buildPaymobCheckoutUrl(publicKey: string, clientSecret: string): string {
  return `${getPaymobApiBase()}/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
}

// Field order defined by Paymob for transaction redirect/processed HMAC validation.
const REDIRECT_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

export function verifyPaymobRedirectHmac(
  params: URLSearchParams,
  hmacSecret: string
): boolean {
  const receivedHmac = (params.get("hmac") || "").trim().toLowerCase();
  if (!receivedHmac || !hmacSecret) return false;

  const concatenated = REDIRECT_HMAC_FIELDS.map((field) => params.get(field) ?? "").join("");
  const computed = crypto.createHmac("sha512", hmacSecret).update(concatenated).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(receivedHmac, "hex"));
  } catch {
    return false;
  }
}

interface PaymobWebhookObj {
  id?: number;
  amount_cents?: number;
  created_at?: string;
  currency?: string;
  error_occured?: boolean;
  has_parent_transaction?: boolean;
  integration_id?: number;
  is_3d_secure?: boolean;
  is_auth?: boolean;
  is_capture?: boolean;
  is_refunded?: boolean;
  is_standalone_payment?: boolean;
  is_voided?: boolean;
  order?: { id?: number; merchant_order_id?: string };
  owner?: number;
  pending?: boolean;
  success?: boolean;
  source_data?: { pan?: string; sub_type?: string; type?: string };
  payment_key_claims?: { extra?: Record<string, string> };
}

export interface PaymobWebhookPayload {
  type?: string;
  obj?: PaymobWebhookObj;
}

function webhookValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function verifyPaymobWebhookHmac(
  payload: PaymobWebhookPayload,
  receivedHmac: string,
  hmacSecret: string
): boolean {
  const obj = payload.obj;
  if (!obj || !receivedHmac || !hmacSecret) return false;

  const concatenated = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success,
  ]
    .map(webhookValue)
    .join("");

  const computed = crypto.createHmac("sha512", hmacSecret).update(concatenated).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(receivedHmac.trim().toLowerCase(), "hex")
    );
  } catch {
    return false;
  }
}
