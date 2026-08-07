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

const PAYMOB_METHOD_FALLBACK_INDEX: Record<PaymobPaymentMethod, number> = {
  card: 0,
  tamara: 1,
  tabby: 2,
  apple_pay: 3,
  google_pay: 4,
};

function getExplicitPaymobMethodIntegrationId(method: PaymobPaymentMethod): string {
  // Hostinger's Next.js build only inlines environment variables accessed with literal keys.
  switch (method) {
    case "card":
      return process.env.PAYMOB_CARD_INTEGRATION_ID || getEnvVar("PAYMOB_CARD_INTEGRATION_ID") || "";
    case "apple_pay":
      return process.env.PAYMOB_APPLE_PAY_INTEGRATION_ID || getEnvVar("PAYMOB_APPLE_PAY_INTEGRATION_ID") || "";
    case "google_pay":
      return process.env.PAYMOB_GOOGLE_PAY_INTEGRATION_ID || getEnvVar("PAYMOB_GOOGLE_PAY_INTEGRATION_ID") || "";
    case "tamara":
      return process.env.PAYMOB_TAMARA_INTEGRATION_ID || getEnvVar("PAYMOB_TAMARA_INTEGRATION_ID") || "";
    case "tabby":
      return process.env.PAYMOB_TABBY_INTEGRATION_ID || getEnvVar("PAYMOB_TABBY_INTEGRATION_ID") || "";
  }
}

export function getPaymobIntegrationIdForMethod(method: PaymobPaymentMethod): number | null {
  const configuredValue = getExplicitPaymobMethodIntegrationId(method).trim();
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

function getMarketSuffix(marketCode?: string | null): string {
  const code = (marketCode || "").toString().toLowerCase().replace(/^\//, "");
  if (code === "qa" || code === "om" || code === "sa") {
    return `_${code.toUpperCase()}`;
  }

  return "";
}

function getPaymobCurrencyFallback(marketCode?: string | null): string[] {
  const code = (marketCode || "").toString().toLowerCase().replace(/^\//, "");
  if (code === "qa") return ["QAR"];
  if (code === "om") return ["OMR"];
  if (code === "sa") return ["SAR"];
  return ["AED", "QAR", "OMR", "SAR", "KWD", "BHD", "USD"];
}

export function getPaymobAllowedCurrencies(marketCode?: string | null): string[] {
  const suffix = getMarketSuffix(marketCode);
  const key = `PAYMOB_ALLOWED_CURRENCIES${suffix}`;
  const publicKey = `NEXT_PUBLIC_PAYMOB_ALLOWED_CURRENCIES${suffix}`;

  const raw = (
    process.env[key] ||
    getEnvVar(key) ||
    process.env.PAYMOB_ALLOWED_CURRENCIES ||
    getEnvVar("PAYMOB_ALLOWED_CURRENCIES") ||
    process.env[publicKey] ||
    getEnvVar(publicKey) ||
    process.env.NEXT_PUBLIC_PAYMOB_ALLOWED_CURRENCIES ||
    getEnvVar("NEXT_PUBLIC_PAYMOB_ALLOWED_CURRENCIES") ||
    ""
  ).trim();

  if (raw) {
    return raw
      .split(",")
      .map((currency) => currency.trim().toUpperCase())
      .filter(Boolean);
  }

  return getPaymobCurrencyFallback(marketCode);
}

export function isPaymobConfigured(currency?: string, marketCode?: string | null): boolean {
  const hasCredentials = Boolean(
    getPaymobSecretKey() &&
      getPaymobPublicKey() &&
      getPaymobIntegrationIds().length > 0
  );

  if (!hasCredentials || !currency) return hasCredentials;
  return getPaymobAllowedCurrencies(marketCode).includes(currency.trim().toUpperCase());
}
