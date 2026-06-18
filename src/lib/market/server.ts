import { headers } from "next/headers";
import { getMarketByHost, normalizeMarketHost, type MarketConfig } from "@/config/market";

export async function getRequestFrontendHost(): Promise<string> {
  try {
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-frontend-host") ||
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      "";

    return normalizeMarketHost(host);
  } catch {
    return normalizeMarketHost(process.env.NEXT_PUBLIC_CANONICAL_HOST || process.env.NEXT_PUBLIC_SITE_URL);
  }
}

export async function getRequestMarket(): Promise<MarketConfig> {
  return getMarketByHost(await getRequestFrontendHost());
}
