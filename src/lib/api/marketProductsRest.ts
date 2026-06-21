import { backendHeaders, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getWcCredentials } from "@/lib/utils/loadEnv";

const MARKET_CODES = new Set(["qa", "om", "sa"]);
const DEFAULT_TIMEOUT_MS = 8000;

export interface MarketProductsRestParams {
  page?: number;
  per_page?: number;
  search?: string;
  slug?: string;
  orderby?: string;
  order?: "asc" | "desc";
  include?: number[];
  lang?: string;
}

export interface MarketProductsRestResult {
  products: Record<string, unknown>[];
  total: number;
  totalPages: number;
  status?: number;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function appendProductQuery(params: URLSearchParams, input: MarketProductsRestParams): void {
  params.set("status", "publish");
  params.set("per_page", String(input.per_page || 12));
  if (input.page) params.set("page", String(input.page));
  if (input.search) params.set("search", input.search);
  if (input.slug) params.set("slug", input.slug);
  if (input.orderby) params.set("orderby", input.orderby);
  if (input.order) params.set("order", input.order);
  if (input.include?.length) params.set("include", input.include.join(","));
  if (input.lang) params.set("lang", input.lang);
}

function withAuthParams(params: URLSearchParams, market: string): URLSearchParams | null {
  const credentials = getWcCredentials(market);
  if (!credentials.consumerKey || !credentials.consumerSecret) {
    return null;
  }

  const authenticated = new URLSearchParams(params);
  authenticated.set("consumer_key", credentials.consumerKey);
  authenticated.set("consumer_secret", credentials.consumerSecret);
  authenticated.set("_market_cache_bust", `${market}-${Date.now()}`);
  return authenticated;
}

async function fetchWooProducts(
  wpJsonBase: string,
  market: string,
  params: URLSearchParams
): Promise<MarketProductsRestResult | null> {
  const authenticated = withAuthParams(params, market);
  if (!authenticated) {
    return { products: [], total: 0, totalPages: 0, status: 503 };
  }

  const response = await fetchWithTimeout(`${wpJsonBase}/wc/v3/products?${authenticated.toString()}`, {
    cache: "no-store",
    headers: backendHeaders({ "x-market": market, "Cache-Control": "no-cache", "Pragma": "no-cache" }),
  });

  if (!response.ok) {
    return { products: [], total: 0, totalPages: 0, status: response.status };
  }

  const products = await response.json().catch(() => []);
  const visibleProducts = Array.isArray(products) ? products : [];

  return {
    products: visibleProducts,
    total: parseInt(response.headers.get("X-WP-Total") || String(visibleProducts.length), 10),
    totalPages: parseInt(response.headers.get("X-WP-TotalPages") || "1", 10),
    status: 200,
  };
}

async function fetchWooProductsByWpIds(
  wpJsonBase: string,
  market: string,
  ids: number[],
  params: URLSearchParams
): Promise<MarketProductsRestResult | null> {
  const authenticated = withAuthParams(params, market);
  if (!authenticated) {
    return { products: [], total: 0, totalPages: 0, status: 503 };
  }

  const products: Record<string, unknown>[] = [];
  for (const id of ids) {
    const productParams = new URLSearchParams(authenticated);
    productParams.delete("slug");
    productParams.delete("search");

    const response = await fetchWithTimeout(`${wpJsonBase}/wc/v3/products/${id}?${productParams.toString()}`, {
      cache: "no-store",
      headers: backendHeaders({ "x-market": market, "Cache-Control": "no-cache", "Pragma": "no-cache" }),
    });

    if (!response.ok) continue;
    const product = await response.json().catch(() => null);
    if (product && typeof product === "object") {
      products.push(product as Record<string, unknown>);
    }
  }

  return { products, total: products.length, totalPages: 1, status: 200 };
}

async function lookupWpProductIds(
  wpJsonBase: string,
  market: string,
  input: MarketProductsRestParams
): Promise<number[]> {
  if (!input.slug && !input.search) {
    return [];
  }

  const params = new URLSearchParams();
  if (input.slug) params.set("slug", input.slug);
  if (input.search) params.set("search", input.search);
  params.set("per_page", String(input.per_page || 12));
  params.set("_market_cache_bust", `${market}-${Date.now()}`);

  const response = await fetchWithTimeout(`${wpJsonBase}/wp/v2/product?${params.toString()}`, {
    cache: "no-store",
    headers: backendHeaders({ "Cache-Control": "no-cache", "Pragma": "no-cache" }),
  });

  if (!response.ok) {
    return [];
  }

  const posts = await response.json().catch(() => []);
  if (!Array.isArray(posts)) {
    return [];
  }

  return posts
    .map((post) => Number((post as Record<string, unknown>).id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export async function fetchMarketProductsRest(
  input: MarketProductsRestParams,
  market: string
): Promise<MarketProductsRestResult> {
  const cleanMarket = market.toLowerCase();
  if (!MARKET_CODES.has(cleanMarket)) {
    return { products: [], total: 0, totalPages: 0, status: 400 };
  }

  const wpJsonBase = wpJsonBaseForMarket(cleanMarket);
  const params = new URLSearchParams();
  appendProductQuery(params, input);

  try {
    const direct = await fetchWooProducts(wpJsonBase, cleanMarket, params);
    if (direct && (direct.products.length > 0 || direct.status !== 200 || !input.lang)) {
      return direct;
    }

    if (input.lang) {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.delete("lang");
      const fallback = await fetchWooProducts(wpJsonBase, cleanMarket, fallbackParams);
      if (fallback && fallback.products.length > 0) {
        return fallback;
      }
    }

    const ids = await lookupWpProductIds(wpJsonBase, cleanMarket, input);
    if (ids.length > 0) {
      const byIds = await fetchWooProductsByWpIds(wpJsonBase, cleanMarket, ids, params);
      if (byIds) {
        return byIds;
      }
    }
  } catch {
    return { products: [], total: 0, totalPages: 0, status: 504 };
  }

  return { products: [], total: 0, totalPages: 0, status: 200 };
}
