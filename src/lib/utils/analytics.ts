declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEventPayload = Record<string, unknown>;

export function trackAnalyticsEvent(
  eventName: string,
  payload: AnalyticsEventPayload = {}
): void {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...payload,
    });
  } catch {
    // Ignore analytics storage failures.
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
    }
  } catch {
    // Ignore gtag failures.
  }
}
