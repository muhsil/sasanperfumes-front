import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/api/woocommerce";
import { getMarketByHost, normalizeMarketHost } from "@/config/market";
import { buildSearchSuggestion, createSearchIndexEntry, mergeRankedSearchEntries, normalizeSearchText, rankSearchEntries } from "@/lib/search";
import type { Locale } from "@/config/site";
import type { WCProduct, WCProductsResponse } from "@/types/woocommerce";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEARCH_INDEX_PAGE_SIZE = 100;
const SEARCH_INDEX_CACHE_TTL = 10 * 60 * 1000;

interface CachedSearchIndex {
  timestamp: number;
  entries: ReturnType<typeof createSearchIndexEntry>[];
}

const searchIndexCache = new Map<string, CachedSearchIndex>();
const searchIndexLoading = new Map<string, Promise<ReturnType<typeof createSearchIndexEntry>[]>>();

function dedupeProducts(products: WCProduct[]): WCProduct[] {
  const seen = new Set<number>();
  const deduped: WCProduct[] = [];

  for (const product of products) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    deduped.push(product);
  }

  return deduped;
}

async function loadAllProducts(locale: Locale, frontendHost: string): Promise<WCProduct[]> {
  const market = getMarketByHost(frontendHost);
  const firstPage = await getProducts({
    page: 1,
    per_page: SEARCH_INDEX_PAGE_SIZE,
    locale,
    currency: market.defaultCurrency,
    frontendHost,
    orderby: "date",
    order: "desc",
  });

  const products = [...firstPage.products];
  const totalPages = Math.max(firstPage.totalPages || 1, 1);

  if (totalPages <= 1) {
    return dedupeProducts(products);
  }

  const remainingPageRequests: Promise<WCProductsResponse>[] = [];
  for (let page = 2; page <= totalPages; page += 1) {
    remainingPageRequests.push(
      getProducts({
        page,
        per_page: SEARCH_INDEX_PAGE_SIZE,
        locale,
        currency: market.defaultCurrency,
        frontendHost,
        orderby: "date",
        order: "desc",
      })
    );
  }

  const remainingPages = await Promise.all(remainingPageRequests);
  for (const pageResult of remainingPages) {
    products.push(...pageResult.products);
  }

  return dedupeProducts(products);
}

async function getSearchIndex(locale: Locale, frontendHost: string) {
  const cacheKey = `${frontendHost || "default"}:${locale}`;
  const cached = searchIndexCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_INDEX_CACHE_TTL) {
    return cached.entries;
  }

  const existing = searchIndexLoading.get(cacheKey);
  if (existing) {
    return existing;
  }

  const loading = (async () => {
    const products = await loadAllProducts(locale, frontendHost);
    const entries = products.map((product) => createSearchIndexEntry(product));
    searchIndexCache.set(cacheKey, { timestamp: Date.now(), entries });
    return entries;
  })().finally(() => {
    searchIndexLoading.delete(cacheKey);
  });

  searchIndexLoading.set(cacheKey, loading);
  return loading;
}

function shouldUseFuzzyFallback(query: string, exactTopScore: number, exactCount: number): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 3) return false;
  if (exactCount === 0) return true;
  return exactTopScore < 100;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const frontendHost = normalizeMarketHost(
    request.headers.get("x-frontend-host") ||
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host")
  );
  const market = getMarketByHost(frontendHost);
  const locale = (searchParams.get("locale") as Locale) || "en";
  const query = searchParams.get("q") || "";
  const perPage = Math.min(Math.max(parseInt(searchParams.get("per_page") || "12", 10), 1), 40);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return NextResponse.json(
      { products: [], total: 0, totalPages: 0, query, didYouMean: null, matchMode: "fallback" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "Vary": "Host, X-Frontend-Host",
        },
      }
    );
  }

  try {
    const exactResults = await getProducts({
      search: normalizedQuery,
      per_page: Math.max(perPage * 4, perPage),
      locale,
      currency: market.defaultCurrency,
      frontendHost,
    });

    const exactEntries = exactResults.products.map((product) => createSearchIndexEntry(product));
    const rankedExact = rankSearchEntries(query, exactEntries);
    const bestExactScore = rankedExact[0]?.score ?? 0;

    let rankedProducts = rankedExact;

    if (shouldUseFuzzyFallback(query, bestExactScore, rankedExact.length)) {
      const fuzzyEntries = await getSearchIndex(locale, frontendHost);
      const rankedFuzzy = rankSearchEntries(query, fuzzyEntries);
      rankedProducts = mergeRankedSearchEntries(rankedExact, rankedFuzzy);
    }

    const products = rankedProducts.slice(0, perPage).map((item) => item.product);
    const didYouMean = buildSearchSuggestion(query, rankedProducts, 95);
    const matchMode: "exact" | "fuzzy" | "fallback" =
      rankedExact.length > 0 && bestExactScore >= 100 ? "exact" : didYouMean ? "fuzzy" : "fallback";

    return NextResponse.json(
      {
        products,
        total: rankedProducts.length,
        totalPages: 1,
        query,
        didYouMean: didYouMean
          ? {
              ...didYouMean,
              href: `/${locale}/product/${didYouMean.slug}`,
            }
          : null,
        matchMode,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
          "Vary": "Host, X-Frontend-Host",
        },
      }
    );
  } catch (error) {
    console.error("Search API failed:", error);
    return NextResponse.json(
      { products: [], total: 0, totalPages: 0, query, didYouMean: null, matchMode: "fallback" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
