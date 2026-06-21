import { NextRequest, NextResponse } from "next/server";
import { backendHeaders, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const MARKET_CODES = new Set(["qa", "om", "sa"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const market = params.get("market")?.toLowerCase() || "";

  if (!MARKET_CODES.has(market)) {
    return NextResponse.json({ products: [], total: 0, totalPages: 0 }, { status: 400 });
  }

  const credentials = getWcCredentials(market);
  if (!credentials.consumerKey || !credentials.consumerSecret) {
    return NextResponse.json({ products: [], total: 0, totalPages: 0 }, { status: 503 });
  }

  const restParams = new URLSearchParams();
  restParams.set("status", "publish");
  restParams.set("consumer_key", credentials.consumerKey);
  restParams.set("consumer_secret", credentials.consumerSecret);
  restParams.set("per_page", params.get("per_page") || "12");
  for (const key of ["page", "search", "slug", "orderby", "order", "include", "lang"]) {
    const value = params.get(key);
    if (value) restParams.set(key, value);
  }
  restParams.set("_market_cache_bust", `${market}-${Date.now()}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(`${wpJsonBaseForMarket(market)}/wc/v3/products?${restParams.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: backendHeaders({ "x-market": market, "Cache-Control": "no-cache", "Pragma": "no-cache" }),
    });
  } catch {
    return NextResponse.json({ products: [], total: 0, totalPages: 0 }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return NextResponse.json({ products: [], total: 0, totalPages: 0 }, { status: response.status });
  }

  const products = await response.json();
  return NextResponse.json(
    {
      products: Array.isArray(products) ? products : [],
      total: parseInt(response.headers.get("X-WP-Total") || "0", 10),
      totalPages: parseInt(response.headers.get("X-WP-TotalPages") || "1", 10),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        "Pragma": "no-cache",
      },
    }
  );
}
