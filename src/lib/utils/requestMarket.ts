import { extractMarketCode } from "@/lib/utils/backendFetch";

/**
 * Resolves the market a storefront request belongs to.
 *
 * Every market is a separate store on the multisite, and the backend picks the
 * store from the X-Market header. A route that leaves the header off is
 * answered by the main store no matter which storefront asked, which is how
 * coupon lookups on /sa were being served the UAE store's coupons.
 */
export function marketFromRequest(request: Request): string {
  const explicit = extractMarketCode(request.headers.get("x-market"));
  if (explicit) return explicit;

  const candidates = [
    request.headers.get("x-frontend-host"),
    request.headers.get("referer"),
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ];

  for (const candidate of candidates) {
    const market = extractMarketCode(candidate);
    if (market) return market;
  }

  return "";
}
