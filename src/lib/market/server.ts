import { headers } from "next/headers";
import { getMarketByHost, normalizeMarketHost, type MarketConfig } from "@/config/market";

const MARKETS = new Set(["qa", "om", "sa"]);

function pickMarketAwareHost(candidates: Array<string | null>): string {
  const normalized = candidates
    .map((candidate) => normalizeMarketHost(candidate))
    .filter(Boolean);

  return normalized.find((candidate) => /\/(qa|om|sa)$/.test(candidate)) || normalized[0] || "";
}

export async function getRequestFrontendHost(): Promise<string> {
  try {
    const requestHeaders = await headers();
    const explicitMarket = requestHeaders.get("x-market")?.toLowerCase();
    const host =
      requestHeaders.get("x-frontend-host") ||
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      "";
    const referer = requestHeaders.get("referer");

    if (explicitMarket && MARKETS.has(explicitMarket)) {
      const normalizedHost = normalizeMarketHost(host).replace(/\/(qa|om|sa)$/, "");
      return normalizedHost ? `${normalizedHost}/${explicitMarket}` : `${host}/${explicitMarket}`;
    }

    return pickMarketAwareHost([
      requestHeaders.get("x-frontend-host"),
      referer,
      requestHeaders.get("x-forwarded-host"),
      requestHeaders.get("host"),
    ]);
  } catch {
    return normalizeMarketHost(process.env.NEXT_PUBLIC_CANONICAL_HOST || process.env.NEXT_PUBLIC_SITE_URL);
  }
}

export async function getRequestMarket(): Promise<MarketConfig> {
  return getMarketByHost(await getRequestFrontendHost());
}
