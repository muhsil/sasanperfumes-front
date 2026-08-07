import { trackAnalyticsEvent } from "@/lib/utils/analytics";

export type PaymentFunnelEventName =
  | "payment_method_selected"
  | "payment_redirect"
  | "payment_success"
  | "payment_failure"
  | "payment_cancelled";

interface PaymentFunnelEvent {
  paymentMethod: string;
  provider?: string;
  value?: number;
  currency?: string;
  market?: string;
  orderId?: string | number;
  stage?: string;
}

function normalizeAnalyticsToken(value: string | undefined, fallback: string): string {
  const normalized = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return normalized || fallback;
}

export function getPaymentProvider(paymentMethod: string): string {
  const method = normalizeAnalyticsToken(paymentMethod, "unknown");
  if (method.includes("paymob")) return "paymob";
  if (method.includes("tabby")) return "tabby";
  if (method.includes("tamara")) return "tamara";
  if (method.includes("stripe") || method.includes("woocommerce_payments") || method === "card" || method.endsWith("_card")) {
    return "paymob";
  }
  if (method === "cod") return "cod";
  return method;
}

export function trackPaymentFunnelEvent(
  eventName: PaymentFunnelEventName,
  event: PaymentFunnelEvent
): void {
  const paymentMethod = normalizeAnalyticsToken(event.paymentMethod, "unknown");
  const value = Number(event.value);

  trackAnalyticsEvent(eventName, {
    payment_method: paymentMethod,
    payment_provider: normalizeAnalyticsToken(event.provider, getPaymentProvider(paymentMethod)),
    ...(Number.isFinite(value) && value >= 0 ? { value } : {}),
    ...(event.currency ? { currency: event.currency.trim().toUpperCase().slice(0, 3) } : {}),
    ...(event.market ? { market: normalizeAnalyticsToken(event.market, "ae") } : {}),
    ...(event.orderId !== undefined ? { order_id: String(event.orderId).replace(/[^0-9]/g, "").slice(0, 20) } : {}),
    ...(event.stage ? { payment_stage: normalizeAnalyticsToken(event.stage, "unknown") } : {}),
  });
}

export function trackPaymentFunnelEventOnce(
  eventName: PaymentFunnelEventName,
  event: PaymentFunnelEvent,
  uniqueKey: string
): void {
  if (typeof window === "undefined") return;

  const storageKey = `sasan_payment_event_${normalizeAnalyticsToken(uniqueKey, eventName)}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Analytics still works when session storage is unavailable.
  }

  trackPaymentFunnelEvent(eventName, event);
}
