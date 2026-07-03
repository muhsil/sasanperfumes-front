import { getEnvVar } from "@/lib/utils/loadEnv";

export interface PaymentGatewayOverride {
  id: string;
  title?: string;
  description?: string;
  order?: number;
  enabled?: boolean;
}

export interface PaymentGatewayFilters {
  allowed: string[];
  blocked: string[];
}

function parseGatewayIdList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getMarketplaceSuffix(marketCode?: string | null): string {
  const code = (marketCode || "").toLowerCase();
  if (code === "qa" || code === "om" || code === "sa") {
    return `_${code.toUpperCase()}`;
  }
  return "";
}

function parseBooleanLike(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
}

function parseNumberLike(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseGateway(raw: unknown, index: number): PaymentGatewayOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = String(item.id || item.gateway_id || "").trim();
  if (!id) return null;

  return {
    id,
    title: String(item.title || item.name || "").trim() || undefined,
    description: String(item.description || item.desc || "").trim() || undefined,
    order: parseNumberLike(item.order ?? item.sort_order ?? index, index),
    enabled: parseBooleanLike(item.enabled ?? item.is_enabled ?? true, true),
  };
}

function parseGatewayList(raw: string | undefined): PaymentGatewayOverride[] | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const items = parsed
      .map((item, index) => parseGateway(item, index))
      .filter((item): item is PaymentGatewayOverride => Boolean(item));

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export function getPaymentGatewayOverrides(): PaymentGatewayOverride[] {
  const raw =
    getPaymentEnvValue("PAYMENT_GATEWAYS_JSON") ||
    getPaymentEnvValue("NEXT_PUBLIC_PAYMENT_GATEWAYS_JSON");

  return parseGatewayList(raw) || [];
}

function getEnvValueWithAliases(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = getPaymentEnvValue(key);
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function getPaymentEnvValue(key: string): string | undefined {
  const directValues: Record<string, string | undefined> = {
    PAYMENT_GATEWAYS_JSON: process.env.PAYMENT_GATEWAYS_JSON,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_JSON: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_JSON,
    PAYMENT_GATEWAYS_FILTER_MODE: process.env.PAYMENT_GATEWAYS_FILTER_MODE,
    PAYMENT_GATEWAYS_FILTER_MODE_QA: process.env.PAYMENT_GATEWAYS_FILTER_MODE_QA,
    PAYMENT_GATEWAYS_FILTER_MODE_OM: process.env.PAYMENT_GATEWAYS_FILTER_MODE_OM,
    PAYMENT_GATEWAYS_FILTER_MODE_SA: process.env.PAYMENT_GATEWAYS_FILTER_MODE_SA,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE_QA: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE_QA,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE_OM: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE_OM,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE_SA: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE_SA,
    PAYMENT_GATEWAYS_ALLOWLIST: process.env.PAYMENT_GATEWAYS_ALLOWLIST,
    PAYMENT_GATEWAYS_ALLOWLIST_QA: process.env.PAYMENT_GATEWAYS_ALLOWLIST_QA,
    PAYMENT_GATEWAYS_ALLOWLIST_OM: process.env.PAYMENT_GATEWAYS_ALLOWLIST_OM,
    PAYMENT_GATEWAYS_ALLOWLIST_SA: process.env.PAYMENT_GATEWAYS_ALLOWLIST_SA,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST_QA: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST_QA,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST_OM: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST_OM,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST_SA: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST_SA,
    PAYMENT_GATEWAYS_BLOCKLIST: process.env.PAYMENT_GATEWAYS_BLOCKLIST,
    PAYMENT_GATEWAYS_BLOCKLIST_QA: process.env.PAYMENT_GATEWAYS_BLOCKLIST_QA,
    PAYMENT_GATEWAYS_BLOCKLIST_OM: process.env.PAYMENT_GATEWAYS_BLOCKLIST_OM,
    PAYMENT_GATEWAYS_BLOCKLIST_SA: process.env.PAYMENT_GATEWAYS_BLOCKLIST_SA,
    PAYMENT_GATEMENTS_BLOCKLIST: process.env.PAYMENT_GATEMENTS_BLOCKLIST,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST_QA: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST_QA,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST_OM: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST_OM,
    NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST_SA: process.env.NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST_SA,
    NEXT_PUBLIC_PAYMENT_GATEMENTS_BLOCKLIST: process.env.NEXT_PUBLIC_PAYMENT_GATEMENTS_BLOCKLIST,
    COD_ALLOWED_COUNTRIES: process.env.COD_ALLOWED_COUNTRIES,
    NEXT_PUBLIC_COD_ALLOWED_COUNTRIES: process.env.NEXT_PUBLIC_COD_ALLOWED_COUNTRIES,
  };

  return directValues[key] || getEnvVar(key);
}

function shouldApplyEnvGatewayFilters(marketCode?: string | null): boolean {
  const suffix = getMarketplaceSuffix(marketCode);
  const mode = getEnvValueWithAliases([
    `PAYMENT_GATEWAYS_FILTER_MODE${suffix}`,
    "PAYMENT_GATEWAYS_FILTER_MODE",
    `NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE${suffix}`,
    "NEXT_PUBLIC_PAYMENT_GATEWAYS_FILTER_MODE",
  ]);

  const normalizedMode = mode?.trim().toLowerCase();
  if (normalizedMode === "env") return true;
  if (normalizedMode === "backend") return false;

  return true;
}

function isInternationalMarket(marketCode?: string | null): boolean {
  const code = (marketCode || "").toLowerCase();
  return !code || code === "intl";
}

export function getPaymentGatewayFilters(marketCode?: string | null): PaymentGatewayFilters {
  const suffix = getMarketplaceSuffix(marketCode);

  if (!shouldApplyEnvGatewayFilters(marketCode)) {
    return {
      allowed: [],
      blocked: [],
    };
  }

  const allowedRaw = getEnvValueWithAliases([
    `PAYMENT_GATEWAYS_ALLOWLIST${suffix}`,
    "PAYMENT_GATEWAYS_ALLOWLIST",
    `NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST${suffix}`,
    "NEXT_PUBLIC_PAYMENT_GATEWAYS_ALLOWLIST",
  ]);

  const blockedRaw = getEnvValueWithAliases([
    `PAYMENT_GATEWAYS_BLOCKLIST${suffix}`,
    "PAYMENT_GATEWAYS_BLOCKLIST",
    "PAYMENT_GATEMENTS_BLOCKLIST",
    `NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST${suffix}`,
    "NEXT_PUBLIC_PAYMENT_GATEWAYS_BLOCKLIST",
    "NEXT_PUBLIC_PAYMENT_GATEMENTS_BLOCKLIST",
  ]);

  const intl = isInternationalMarket(marketCode);

  const envAllowed = parseGatewayIdList(allowedRaw);
  let allowed = envAllowed.length > 0
    ? envAllowed
    : intl
      ? ["woocommerce_payments", "stripe", "cod"]
      : ["woocommerce_payments", "stripe"];

  // COD must always be in the allowed list for intl market (UAE only)
  // even when env vars override the default allowlist
  if (intl && !allowed.some((id) => id.toLowerCase() === "cod")) {
    allowed = [...allowed, "cod"];
  }

  const envBlocked = parseGatewayIdList(blockedRaw);
  let blocked = envBlocked.length > 0
    ? envBlocked
    : intl
      ? ["bacs", "cheque", "myfatoorah", "myfatoorah_v2", "myfatoorah_cards", "myfatoorah_embedded"]
      : ["cod", "bacs", "cheque", "myfatoorah", "myfatoorah_v2", "myfatoorah_cards", "myfatoorah_embedded"];

  // For intl market, COD availability is controlled by COD_ALLOWED_COUNTRIES,
  // not by the gateway blocklist. Always remove COD from blocked list for intl.
  if (intl) {
    blocked = blocked.filter((id) => id.toLowerCase() !== "cod");
  }

  return { allowed, blocked };
}

export interface PaymentMethodCountryAvailability {
  type: "include" | "exclude";
  countries: string[];
}

export function getCodAllowedCountries(): string[] {
  const raw = getEnvValueWithAliases([
    "COD_ALLOWED_COUNTRIES",
    "NEXT_PUBLIC_COD_ALLOWED_COUNTRIES",
  ]);
  if (raw) {
    return raw.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
  }
  return ["AE"];
}

export function getPaymentMethodCountryAvailability(): Record<string, PaymentMethodCountryAvailability> {
  return {
    cod: { type: "include", countries: getCodAllowedCountries() },
  };
}
