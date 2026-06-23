export interface FrontendPaymentUrlContext {
  origin: string;
  locale: string;
  marketPrefix: string;
}

export function normalizeFrontendPaymentUrl(
  paymentUrl: string | null | undefined,
  context: FrontendPaymentUrlContext
): string | null {
  if (!paymentUrl || typeof paymentUrl !== "string") {
    return null;
  }

  const trimmed = paymentUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith("/")) {
    return null;
  }

  const normalizedLocale = (context.locale || "en").toLowerCase() === "ar" ? "ar" : "en";
  const normalizedMarketPrefix = context.marketPrefix?.trim() || "";
  const marketPrefixSegment = normalizedMarketPrefix === "/" ? "" : normalizedMarketPrefix;

  const localeRoute = `${marketPrefixSegment}/${normalizedLocale}`.replace(/\/{2,}/g, "/");
  const marketPrefixWithLocale = localeRoute === "/" ? `/${normalizedLocale}` : localeRoute;

  if (trimmed.startsWith("/order-pay/")) {
    return `${context.origin}${marketPrefixWithLocale}${trimmed}`;
  }

  if (trimmed.startsWith("/checkout/order-pay/")) {
    const orderPayPath = trimmed.replace(/^\/checkout\/order-pay\//, "/order-pay/");
    return `${context.origin}${marketPrefixWithLocale}${orderPayPath}`;
  }

  if (
    trimmed.startsWith(`${normalizedMarketPrefix}/checkout/order-pay/`) &&
    normalizedMarketPrefix &&
    normalizedMarketPrefix !== "/"
  ) {
    const orderPayPath = trimmed.replace(`${normalizedMarketPrefix}/checkout/order-pay/`, "/order-pay/");
    return `${context.origin}${marketPrefixWithLocale}${orderPayPath}`;
  }

  if (trimmed.startsWith(`${normalizedMarketPrefix}/`) || trimmed.startsWith("/en/") || trimmed.startsWith("/ar/")) {
    return `${context.origin}${trimmed}`;
  }

  return `${context.origin}${marketPrefixSegment ? `${marketPrefixSegment}${trimmed}` : trimmed}`;
}

export function toAbsoluteFrontendUrl(
  pathOrUrl: string | null | undefined,
  context: FrontendPaymentUrlContext
): string | null {
  return normalizeFrontendPaymentUrl(pathOrUrl, context);
}
