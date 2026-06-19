import { headers } from "next/headers";
import { getMarketByHost, normalizeMarketHost, type MarketConfig } from "@/config/market";

const MARKETS = new Set(["qa", "om", "sa"]);

export async function getRequestFrontendHost(): Promise<string> {
  try {
    const requestHeaders = await headers();
    const explicitMarket = requestHeaders.get("x-market")?.toLowerCase();
    const host =
      requestHeaders.get("x-frontend-host") ||
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      "";

    if (explicitMarket && MARKETS.has(explicitMarket)) {
      const normalizedHost = normalizeMarketHost(host).replace(/\/(qa|om|sa)$/, "");
      return normalizedHost ? `${normalizedHost}/${explicitMarket}` : `${host}/${explicitMarket}`;
    }

    return normalizeMarketHost(host);
  } catch {
    return normalizeMarketHost(process.env.NEXT_PUBLIC_CANONICAL_HOST || process.env.NEXT_PUBLIC_SITE_URL);
  }
}

export async function getRequestMarket(): Promise<MarketConfig> {
  return getMarketByHost(await getRequestFrontendHost());
}
