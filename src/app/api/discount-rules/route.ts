import { NextRequest, NextResponse } from "next/server";
import { getDiscountRules } from "@/lib/api/wordpress";
import { siteConfig } from "@/config/site";

export const dynamic = "auto";
export const revalidate = 180;

const VALID_MARKETS = new Set(["qa", "om", "sa"]);
const CACHE_TTL_MS = 120_000;

interface CachedDiscountRules {
  payload: string;
  updatedAt: number;
}

const cache = new Map<string, CachedDiscountRules>();

function getCacheKey(market: string): string {
  return market || "intl";
}

function getCachedPayload(market: string): string | null {
  const entry = cache.get(getCacheKey(market));
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > CACHE_TTL_MS) return null;
  return entry.payload;
}

function writeCachedPayload(market: string, payload: string) {
  cache.set(getCacheKey(market), {
    payload,
    updatedAt: Date.now(),
  });
}

function jsonResponse(payload: string, cacheHeader = "public, max-age=120, s-maxage=120, stale-while-revalidate=300") {
  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheHeader,
      Vary: "Cookie, Accept",
    },
  });
}

export async function GET(request: NextRequest) {
  const rawMarket = request.nextUrl.searchParams.get("market") || "";
  const market = VALID_MARKETS.has(rawMarket) ? rawMarket : "";
  const baseHost = siteConfig.url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const frontendHost = market ? `${baseHost}/${market}` : "";

  const cachedPayload = getCachedPayload(market);
  if (cachedPayload) {
    return jsonResponse(cachedPayload);
  }

  try {
    const rules = await getDiscountRules(frontendHost);
    const payload = JSON.stringify(rules);
    writeCachedPayload(market, payload);
    return jsonResponse(payload);
  } catch (error) {
    const fallback = "[]";
    if (cachedPayload) {
      return jsonResponse(cachedPayload, "public, max-age=30, stale-while-revalidate=60");
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/discount-rules] Failed to resolve discount rules:", error);
    }
    return jsonResponse(fallback, "public, max-age=30, stale-while-revalidate=60");
  }
}
