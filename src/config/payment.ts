import { getEnvVar } from "@/lib/utils/loadEnv";

export interface PaymentGatewayOverride {
  id: string;
  title?: string;
  description?: string;
  order?: number;
  enabled?: boolean;
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
