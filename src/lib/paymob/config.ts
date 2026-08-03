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

export function isPaymobConfigured(): boolean {
  return Boolean(getPaymobSecretKey() && getPaymobPublicKey() && getPaymobIntegrationIds().length > 0);
}
