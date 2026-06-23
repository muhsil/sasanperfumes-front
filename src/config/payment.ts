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
    getEnvVar("PAYMENT_GATEWAYS_JSON") ||
    getEnvVar("NEXT_PUBLIC_PAYMENT_GATEWAYS_JSON");

  return parseGatewayList(raw) || [];
}

function getEnvValueWithAliases(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = getEnvVar(key);
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

export function getPaymentGatewayFilters(marketCode?: string | null): PaymentGatewayFilters {
  const suffix = getMarketplaceSuffix(marketCode);

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

  return {
    allowed: parseGatewayIdList(allowedRaw),
    blocked: parseGatewayIdList(blockedRaw),
  };
}
