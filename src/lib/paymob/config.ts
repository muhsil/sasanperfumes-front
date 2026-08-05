import { getEnvVar } from "@/lib/utils/loadEnv";

export function getPaymobApiBase(): string {
  return (
    process.env.PAYMOB_API_BASE ||
    getEnvVar("PAYMOB_API_BASE") ||
    "https://uae.paymob.com"
  ).trim().replace(/\/$/, "");
}

export function getPaymobSecretKey(): string {
  return (process.env.PAYMOB_SECRET_KEY || getEnvVar("PAYMOB_SECRET_KEY") || "").trim();
}

export function getPaymobPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_PAYMOB_PUBLIC_KEY ||
    process.env.PAYMOB_PUBLIC_KEY ||
    getEnvVar("NEXT_PUBLIC_PAYMOB_PUBLIC_KEY") ||
    getEnvVar("PAYMOB_PUBLIC_KEY") ||
    ""
  ).trim();
}

export function getPaymobHmacSecret(): string {
  return (process.env.PAYMOB_HMAC_SECRET || getEnvVar("PAYMOB_HMAC_SECRET") || "").trim();
}

export function getPaymobIntegrationIds(): number[] {
  const raw = (process.env.PAYMOB_INTEGRATION_ID || getEnvVar("PAYMOB_INTEGRATION_ID") || "").trim();
  return raw
    .split(",")
    .map((item) => parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
}

export type PaymobPaymentMethod = "card" | "apple_pay" | "google_pay" | "tamara" | "tabby";

const PAYMOB_METHOD_ENV_KEYS: Record<PaymobPaymentMethod, string> = {
  card: "PAYMOB_CARD_INTEGRATION_ID",
  apple_pay: "PAYMOB_APPLE_PAY_INTEGRATION_ID",
  google_pay: "PAYMOB_GOOGLE_PAY_INTEGRATION_ID",
  tamara: "PAYMOB_TAMARA_INTEGRATION_ID",
  tabby: "PAYMOB_TABBY_INTEGRATION_ID",
};

const PAYMOB_METHOD_FALLBACK_INDEX: Record<PaymobPaymentMethod, number> = {
  card: 0,
  tamara: 1,
  tabby: 2,
  apple_pay: 3,
  google_pay: 4,
};

export function getPaymobIntegrationIdForMethod(method: PaymobPaymentMethod): number | null {
  const envKey = PAYMOB_METHOD_ENV_KEYS[method];
  const configuredValue = (process.env[envKey] || getEnvVar(envKey) || "").trim();
  const configuredId = Number.parseInt(configuredValue, 10);

  if (Number.isFinite(configuredId) && configuredId > 0) {
    return configuredId;
  }

  return getPaymobIntegrationIds()[PAYMOB_METHOD_FALLBACK_INDEX[method]] || null;
}

export function getConfiguredPaymobPaymentMethods(): PaymobPaymentMethod[] {
  return (["card", "apple_pay", "google_pay", "tamara", "tabby"] as const).filter(
    (method) => getPaymobIntegrationIdForMethod(method) !== null
  );
}

export function getPaymobAllowedCurrencies(): string[] {
  const raw = (
    process.env.PAYMOB_ALLOWED_CURRENCIES ||
    getEnvVar("PAYMOB_ALLOWED_CURRENCIES") ||
    "AED"
  ).trim();

  return raw
    .split(",")
    .map((currency) => currency.trim().toUpperCase())
    .filter(Boolean);
}

export function isPaymobConfigured(currency?: string): boolean {
  const hasCredentials = Boolean(
    getPaymobSecretKey() &&
    getPaymobPublicKey() &&
    getPaymobIntegrationIds().length > 0
  );

  if (!hasCredentials || !currency) return hasCredentials;
  return getPaymobAllowedCurrencies().includes(currency.trim().toUpperCase());
}
