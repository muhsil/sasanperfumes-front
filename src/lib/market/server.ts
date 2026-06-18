import { headers } from "next/headers";
import { getMarketByHost, getMarketCodeFromHost, normalizeMarketHost, type MarketConfig } from "@/config/market";

export function getFrontendHostFromRequestHeaders(requestHeaders: Headers): string {
  return normalizeMarketHost(
    requestHeaders.get("x-frontend-host") ||
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("x-market") ||
    requestHeaders.get("referer") ||
    requestHeaders.get("host") ||
    ""
  );
}

export async function getRequestFrontendHost(): Promise<string> {
  try {
    const requestHeaders = await headers();
    const marketSegment = requestHeaders.get("x-market");
    if (marketSegment) {
      const marketCode = getMarketCodeFromHost(marketSegment);
      if (marketCode) {
        const frontendHost = getFrontendHostFromRequestHeaders(requestHeaders);
        const normalizedHost = normalizeMarketHost(frontendHost).split("/")[0] || "shapehive.com";
        return `${normalizedHost}/${marketCode}`;
      }
    }

    return getFrontendHostFromRequestHeaders(requestHeaders);
  } catch {
    return normalizeMarketHost(process.env.NEXT_PUBLIC_CANONICAL_HOST || process.env.NEXT_PUBLIC_SITE_URL);
  }
}

export async function getRequestMarket(): Promise<MarketConfig> {
  return getMarketByHost(await getRequestFrontendHost());
}
