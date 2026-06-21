import { cache } from "react";
import dns from "dns";
import https from "https";
import { disableRuntimeCache, siteConfig, API_BASE_CURRENCY, type Locale, type Currency } from "@/config/site";
import {
  backendHeaders,
  extractMarketCode,
  rewriteBackendUrlForMarket,
  wpJsonBaseForMarket,
} from "@/lib/utils/backendFetch";
import type {
  WCProduct,
  WCCategory,
  WCProductsResponse,
} from "@/types/woocommerce";
import type { BundlePricing } from "@/types/bundle";

function rebrandText(value: string): string {
  return value;
}

function rebrandApiContent<T>(value: T): T {
  if (typeof value === "string") {
    return rebrandText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rebrandApiContent(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rebrandApiContent(item)])
    ) as T;
  }

  return value;
}

function stripJsonPrefix(value: string): string {
  return value.replace(/^[\uFEFF\u200B\u200C\u200D\s]+/, "");
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  return JSON.parse(stripJsonPrefix(text)) as T;
}

// Default currency for Store API requests - ensures prices are returned in the base currency
const DEFAULT_API_CURRENCY = API_BASE_CURRENCY;
const BACKEND_FETCH_TIMEOUT_MS = 8000;

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]));
  }
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value)])
  );
}

function withExplicitHttpsPort(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && !parsed.port) {
      parsed.port = "443";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url;
  }
}

function cmsMarketHost(market: string): string {
  try {
    return `${new URL(siteConfig.apiUrl).hostname}/${market}`;
  } catch {
    return `cms.shapehive.com/${market}`;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = BACKEND_FETCH_TIMEOUT_MS): Promise<Response> {
  if (shouldUsePublicDnsForCms(url, init)) {
    return fetchWithPublicDns(url, init, timeoutMs);
  }

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

function shouldUsePublicDnsForCms(url: string, init: RequestInit): boolean {
  try {
    const parsed = new URL(url);
    const headers = headersToRecord(init.headers);
    return (
      parsed.hostname === "cms.shapehive.com" &&
      parsed.pathname.includes("/wp-json/wc/store/v1/products") &&
      parsed.searchParams.has("_market_cache_bust") &&
      Boolean(headers["X-Market"] || headers["x-market"])
    );
  } catch {
    return false;
  }
}

function responseHeadersFromNode(headers: Record<string, string | string[] | undefined>): Headers {
  const responseHeaders = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => responseHeaders.append(key, entry));
    } else if (value !== undefined) {
      responseHeaders.set(key, value);
    }
  });
  return responseHeaders;
}

async function fetchWithPublicDns(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const parsed = new URL(url);
  const headers = headersToRecord(init.headers);

  return new Promise<Response>((resolve, reject) => {
    const request = https.request(
      parsed,
      {
        method: init.method || "GET",
        headers,
        lookup: (hostname, _options, callback) => {
          dns.resolve4(hostname, (error, addresses) => {
            if (error || addresses.length === 0) {
              callback(error || new Error(`No public DNS A record for ${hostname}`), "", 4);
              return;
            }
            callback(null, addresses[0], 4);
          });
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("end", () => {
          resolve(new Response(Buffer.concat(chunks), {
            status: incoming.statusCode || 200,
            statusText: incoming.statusMessage || "",
            headers: responseHeadersFromNode(incoming.headers),
          }));
        });
      }
    );

    const timeout = setTimeout(() => {
      request.destroy(new Error("CMS Store API public DNS request timed out"));
    }, timeoutMs);

    request.on("error", reject);
    request.on("close", () => clearTimeout(timeout));
    request.end();
  });
}

function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const details = cause as Record<string, unknown>;
    const code = typeof details.code === "string" ? details.code : "";
    const hostname = typeof details.hostname === "string" ? details.hostname : "";
    return [error.message, code, hostname].filter(Boolean).join(" ");
  }

  return error.message;
}

function withFrontendHostParam(url: string, frontendHost?: string): string {
  const marketAwareUrl = rewriteBackendUrlForMarket(url, extractMarketFromHost(frontendHost));
  if (!frontendHost) return marketAwareUrl;

  const separator = marketAwareUrl.includes("?") ? "&" : "?";
  return `${marketAwareUrl}${separator}frontend_host=${encodeURIComponent(frontendHost)}`;
}

const KNOWN_MARKETS = new Set(["qa", "om", "sa"]);

function extractMarketFromHost(frontendHost?: string): string | undefined {
  const market = extractMarketCode(frontendHost);
  return market && KNOWN_MARKETS.has(market) ? market : undefined;
}

async function detectMarketFromRequest(): Promise<string | undefined> {
  try {
    const { headers: getHeaders } = await import("next/headers");
    const reqHeaders = await getHeaders();
    const explicitMarket = reqHeaders.get("x-market")?.toLowerCase();
    if (explicitMarket && KNOWN_MARKETS.has(explicitMarket)) {
      return explicitMarket;
    }
    const candidates = [
      reqHeaders.get("x-frontend-host"),
      reqHeaders.get("referer"),
      reqHeaders.get("x-forwarded-host"),
      reqHeaders.get("host"),
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const market = extractMarketCode(candidate);
      if (market && KNOWN_MARKETS.has(market)) {
        return market;
      }
      const normalized = candidate.replace(/^https?:\/\//, "").toLowerCase();
      for (const m of KNOWN_MARKETS) {
        if (normalized.startsWith(`${m}.`)) {
          return m;
        }
      }
    }
  } catch {
    // Not in a request context (client-side or build time)
  }
  return undefined;
}

function getCurrencyMinorUnit(currency?: Currency): number {
  const code = (currency || DEFAULT_API_CURRENCY).toUpperCase();
  return ["BHD", "KWD", "OMR"].includes(code) ? 3 : 2;
}

function toMinorUnitPrice(value: unknown, minorUnit: number): string {
  const numeric = Number.parseFloat(String(value || "0"));
  if (!Number.isFinite(numeric)) return "0";
  return String(Math.round(numeric * Math.pow(10, minorUnit)));
}

interface FetchOptions {
  revalidate?: number;
  tags?: string[];
  locale?: Locale;
  currency?: Currency;
  frontendHost?: string;
}

interface FetchAPIResponse<T> {
  data: T;
  total: number;
  totalPages: number;
}

interface StoreFetchResult<T> {
  data: T;
  response: Response;
}

function buildStoreAPIUrls(
  endpoint: string,
  market: string | undefined,
  options: Pick<FetchOptions, "locale" | "currency" | "frontendHost">
): string[] {
  const rootApiBase = market
    ? withExplicitHttpsPort(wpJsonBaseForMarket(market).replace(/\/wp-json$/, ""))
    : siteConfig.apiUrl.replace(/\/+$/, "");
  const apiBases = [`${rootApiBase}/wp-json/wc/store/v1`];
  const currencyToUse = options.currency || DEFAULT_API_CURRENCY;

  return uniqueUrls(apiBases.map((apiBase) => {
    let url = `${apiBase}${endpoint}`;
    if (options.locale) {
      url = appendQueryParam(url, "lang", options.locale);
    }
    if (market) {
      url = appendQueryParam(url, "frontend_host", cmsMarketHost(market));
      url = appendQueryParam(url, "_market_cache_bust", `${market}-${Date.now()}`);
    } else {
      url = appendQueryParam(url, "currency", currencyToUse);
    }
    return url;
  }));
}

function getProductUILabels(locale?: Locale) {
  const isArabic = locale === "ar";
  return {
    inStockText: isArabic ? "متوفر" : "In Stock",
    outOfStockText: isArabic ? "غير متوفر" : "Out of Stock",
    addToCartText: isArabic ? "أضف للسلة" : "Add to Cart",
  };
}

async function fetchAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { revalidate = 60, tags, locale, currency, frontendHost } = options;

  const market = extractMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const result = await fetchStoreAPI<T>(endpoint, {
    revalidate,
    tags,
    locale,
    currency,
    frontendHost,
  }, market);

  return rebrandApiContent(result.data);
}

async function fetchAPIWithPagination<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<FetchAPIResponse<T>> {
  const { revalidate = 60, tags, locale, currency, frontendHost } = options;

  const market = extractMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const result = await fetchStoreAPI<T>(endpoint, {
    revalidate,
    tags,
    locale,
    currency,
    frontendHost,
  }, market);
  const { response } = result;
  const data = rebrandApiContent(result.data);
  const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
  const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);

  return { data, total, totalPages };
}

async function fetchStoreAPI<T>(
  endpoint: string,
  options: FetchOptions,
  market?: string
): Promise<StoreFetchResult<T>> {
  const { revalidate = 60, tags } = options;
  const urls = buildStoreAPIUrls(endpoint, market, options);
  const hdrs = market
    ? backendHeaders({ "Origin": "https://cms.shapehive.com", "X-Market": market, "Cache-Control": "no-cache", "Pragma": "no-cache" })
    : backendHeaders();
  const fetchOptions: RequestInit = disableRuntimeCache
    ? { cache: "no-store", headers: hdrs }
    : {
        next: {
          revalidate,
          tags,
        },
        headers: hdrs,
      };
  let lastError = "";

  for (const url of urls) {
    const response = await fetchWithTimeout(url, fetchOptions);

    if (!response.ok) {
      lastError = `${response.status} ${response.statusText}`;
      if (response.status === 403 || response.status === 404) {
        continue;
      }
      throw new Error(`API Error: ${lastError}`);
    }

    try {
      const data = await parseJsonResponse<T>(response);
      return { data, response };
    } catch (error) {
      lastError = formatFetchError(error);
      console.warn(`WooCommerce Store API returned invalid JSON (${url})`);
    }
  }

  throw new Error(`API Error: unable to read JSON response${lastError ? ` (${lastError})` : ""}`);
}

// Products API
export async function getProducts(params?: {
  page?: number;
  per_page?: number;
  category?: string;
  brand?: string;
  search?: string;
  orderby?: string;
  order?: "asc" | "desc";
  include?: number[];
  locale?: Locale;
  currency?: Currency;
  frontendHost?: string;
}): Promise<WCProductsResponse> {
  try {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
    if (params?.category) searchParams.set("category", params.category);
    if (params?.brand) searchParams.set("brand", params.brand);
    if (params?.search) searchParams.set("search", params.search);
    // When searching, don't override with menu_order — let WooCommerce use its default search ordering
    // For non-search requests, default to menu_order asc for WP Admin drag-and-drop control
    if (params?.search) {
      if (params?.orderby) searchParams.set("orderby", params.orderby);
      if (params?.order) searchParams.set("order", params.order);
    } else {
      searchParams.set("orderby", params?.orderby || "menu_order");
      searchParams.set("order", params?.order || "asc");
    }
    if (params?.include?.length) searchParams.set("include", params.include.join(","));

    const queryString = searchParams.toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ""}`;

    let { data: products, total, totalPages } = await fetchAPIWithPagination<WCProduct[]>(endpoint, {
      tags: ["products"],
      locale: params?.locale,
      currency: params?.currency,
      frontendHost: params?.frontendHost,
      revalidate: 300,
    });

    // Fallback: if non-English locale returns 0 products (no translations), retry without locale
    if (products.length === 0 && params?.locale && params.locale !== "en") {
      const fallback = await fetchAPIWithPagination<WCProduct[]>(endpoint, {
        tags: ["products"],
        locale: "en",
        currency: params?.currency,
        frontendHost: params?.frontendHost,
        revalidate: 300,
      });
      products = fallback.data;
      total = fallback.total;
      totalPages = fallback.totalPages;
    }

    const visibleProducts = products.filter(
      (product) =>
        !product.catalog_visibility ||
        product.catalog_visibility === "visible" ||
        product.catalog_visibility === "catalog"
    );

    return {
      products: visibleProducts,
      total: total - (products.length - visibleProducts.length),
      totalPages,
    };
  } catch (error) {
    console.warn(`Failed to fetch products: ${formatFetchError(error)}`);
    const market = extractMarketFromHost(params?.frontendHost) || await detectMarketFromRequest();
    if (market) {
      return {
        products: [],
        total: 0,
        totalPages: 0,
      };
    }

    return {
      products: [],
      total: 0,
      totalPages: 0,
    };
  }
}


// Memoized version for request deduplication (used when same product is fetched multiple times in one request)
// WPML uses different product IDs for each language translation, so we must fetch by slug WITH locale
// to get the correct translated product directly. Fetching by ID with lang parameter does NOT work
// because the ID refers to a specific language version of the product.
export const getProductBySlug = cache(async function getProductBySlug(
  slug: string,
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<WCProduct | null> {
  try {
    // URL encode the slug to handle non-ASCII characters (e.g., Arabic slugs)
    const encodedSlug = encodeURIComponent(slug);
    
    // Always fetch by slug with locale to get the correct translated product
    // WPML keeps the same slug across languages but returns different product IDs
    // and localized content based on the lang parameter
    if (locale) {
      const localizedProducts = await fetchAPI<WCProduct[]>(`/products?slug=${encodedSlug}`, {
        tags: ["products", `product-${slug}-${locale}`],
        locale,
        currency,
        frontendHost,
      });
      
      if (localizedProducts.length > 0) {
        return localizedProducts[0];
      }
    }
    
    // Fallback: fetch without locale (for cases where locale is not specified)
    const products = await fetchAPI<WCProduct[]>(`/products?slug=${encodedSlug}`, {
      tags: ["products", `product-${slug}`],
      currency,
      frontendHost,
    });

    if (products.length === 0) {
      return null;
    }
    
    return products[0];
  } catch {
    const market = extractMarketFromHost(frontendHost) || await detectMarketFromRequest();
    if (market) {
      return null;
    }

    return null;
  }
});

// Get the English slug for a product (used for URL generation)
// This ensures URLs always use English slugs regardless of current locale
export const getEnglishSlugForProduct = cache(async function getEnglishSlugForProduct(
  productId: number,
  frontendHost?: string
): Promise<string | null> {
  try {
    const product = await fetchAPI<WCProduct>(`/products/${productId}`, {
      tags: ["products", `product-${productId}`],
      locale: "en", // Always fetch with English locale to get English slug
      frontendHost,
    });
    return product.slug;
  } catch {
    return null;
  }
});

// Get the English slug for a category by its localized name (used for URL generation)
// This ensures category URLs always use English slugs regardless of current locale
// Note: WPML assigns different category IDs for different locales, so we match by
// finding the English category at the same position/index in the category list
export const getEnglishSlugForCategory = cache(async function getEnglishSlugForCategory(
  localizedCategoryId: number,
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<string | null> {
  try {
    // Fetch categories for both locales
    const [localizedCategories, englishCategories] = await Promise.all([
      getCategories(locale, currency, frontendHost),
      getCategories("en", currency, frontendHost),
    ]);
    
    // Find the localized category by ID
    const localizedCategory = localizedCategories.find((cat) => cat.id === localizedCategoryId);
    if (!localizedCategory) {
      return null;
    }
    
    // First, try to use the slug mapping (most reliable for known categories)
    const englishSlugFromMapping = getEnglishSlugFromLocalizedSlug(localizedCategory.slug);
    if (englishSlugFromMapping) {
      return englishSlugFromMapping;
    }
    
    // Find the index of the localized category among root categories
    const localizedRootCategories = localizedCategories.filter((cat) => cat.parent === 0);
    const englishRootCategories = englishCategories.filter((cat) => cat.parent === 0);
    
    const localizedIndex = localizedRootCategories.findIndex((cat) => cat.id === localizedCategoryId);
    
    // If found at same index in English categories, return that slug
    if (localizedIndex !== -1 && localizedIndex < englishRootCategories.length) {
      return englishRootCategories[localizedIndex].slug;
    }
    
    // Fallback: try to match by similar slug pattern (for subcategories)
    // This handles cases where the category order might differ
    const englishCategory = englishCategories.find((cat) => cat.id === localizedCategoryId);
    return englishCategory?.slug || null;
  } catch {
    return null;
  }
});

export async function getProductById(
  id: number,
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<WCProduct | null> {
  try {
    const product = await fetchAPI<WCProduct>(`/products/${id}`, {
      tags: ["products", `product-${id}`],
      locale,
      currency,
      frontendHost,
    });

    return product;
  } catch {
    return null;
  }
}

export async function getProductsByIds(
  ids: number[],
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<WCProduct[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const products = await fetchAPI<WCProduct[]>(
      `/products?include=${ids.join(",")}`,
      {
        tags: ["products", ...ids.map((id) => `product-${id}`)],
        locale,
        currency,
        frontendHost,
      }
    );

    return products;
  } catch {
    return [];
  }
}

export async function searchProductByName(
  name: string,
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<WCProduct | null> {
  if (!name) return null;

  try {
    const products = await fetchAPI<WCProduct[]>(
      `/products?search=${encodeURIComponent(name)}&per_page=1`,
      {
        tags: ["products", `product-search-${name}`],
        locale,
        currency,
        frontendHost,
        revalidate: 300,
      }
    );

    if (products.length > 0) {
      return products[0];
    }
    return null;
  } catch {
    return null;
  }
}

// Categories API - Memoized for request deduplication
export const getCategories = cache(async function getCategories(
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<WCCategory[]> {
  try {
    const categories = await fetchAPI<WCCategory[]>("/products/categories?per_page=100", {
      tags: ["categories"],
      locale,
      currency,
      frontendHost,
      revalidate: 600, // Cache categories longer as they change less frequently
    });

    return categories;
  } catch (error) {
    console.warn(`Failed to fetch categories: ${formatFetchError(error)}`);
    return [];
  }
});

// Mapping of English category slugs to Arabic category slugs
// This is needed because WPML assigns different slugs for each language
// and the API returns categories in different orders, making position-based matching unreliable
const ENGLISH_TO_ARABIC_CATEGORY_SLUGS: Record<string, string> = {
  "perfumes": "%d8%a7%d9%84%d8%b9%d8%b7%d9%88%d8%b1",
  "perfumes-oils": "%d8%a7%d9%84%d8%b9%d8%b7%d9%88%d8%b1-%d9%88%d8%a7%d9%84%d8%b2%d9%8a%d9%88%d8%aa",
  "home-fragrances": "%d9%85%d8%b9%d8%b7%d8%b1%d8%a7%d8%aa-%d8%a7%d9%84%d9%85%d9%86%d8%b2%d9%84",
  "personal-care": "%d8%a7%d9%84%d8%b9%d9%86%d8%a7%d9%8a%d8%a9-%d8%a7%d9%84%d8%b4%d8%ae%d8%b5%d9%8a%d8%a9",
  "gifts-set": "%d8%a3%d8%b7%d9%82%d9%85-%d8%a7%d9%84%d9%87%d8%af%d8%a7%d9%8a%d8%a7",
  "fragrance-oils": "%d8%b2%d9%8a%d9%88%d8%aa-%d8%b9%d8%b7%d8%b1%d9%8a%d8%a9",
  "hair-body-mist": "%d8%b9%d8%b7%d9%88%d8%b1-%d8%a7%d9%84%d8%b4%d8%b9%d8%b1-%d9%88%d8%a7%d9%84%d8%ac%d8%b3%d9%85",
  "hand-body-lotion": "%d9%84%d9%88%d8%b4%d9%86-%d8%a7%d9%84%d8%ac%d8%b3%d9%85-%d9%88%d8%a7%d9%84%d9%8a%d8%af%d9%8a%d9%86",
  "air-fresheners": "%d9%85%d8%b9%d8%b7%d8%b1%d8%a7%d8%aa-%d8%a7%d9%84%d8%ac%d9%88",
  "reed-diffusers": "%d9%85%d9%88%d8%b2%d8%b9-%d8%a7%d9%84%d8%b9%d8%b7%d8%b1",
  "fine-fragrances": "%d8%a7%d9%84%d8%b9%d8%b7%d9%88%d8%b1-%d8%a7%d9%84%d9%81%d8%a7%d8%ae%d8%b1%d8%a9",
};

// Create a reverse mapping from Arabic slugs to English slugs
// This is used to convert Arabic category slugs back to English slugs for URL generation
const ARABIC_TO_ENGLISH_CATEGORY_SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries(ENGLISH_TO_ARABIC_CATEGORY_SLUGS).map(([en, ar]) => [ar, en])
);

// Helper function to get English slug from an Arabic/localized category slug
// Uses the reverse mapping for reliable slug conversion
export function getEnglishSlugFromLocalizedSlug(localizedSlug: string): string | null {
  // If the slug is already in English (exists in the English-to-Arabic mapping), return it
  if (ENGLISH_TO_ARABIC_CATEGORY_SLUGS[localizedSlug]) {
    return localizedSlug;
  }
  
  // Try to find the English slug from the reverse mapping
  // The localized slug might be URL-encoded or decoded, so try both
  const englishSlug = ARABIC_TO_ENGLISH_CATEGORY_SLUGS[localizedSlug];
  if (englishSlug) {
    return englishSlug;
  }
  
  // Try with URL-decoded version (in case the slug is already encoded)
  try {
    const decodedSlug = decodeURIComponent(localizedSlug);
    // Check if decoded slug matches any Arabic slug pattern
    for (const [arabicSlug, enSlug] of Object.entries(ARABIC_TO_ENGLISH_CATEGORY_SLUGS)) {
      const decodedArabicSlug = decodeURIComponent(arabicSlug);
      if (decodedSlug === decodedArabicSlug) {
        return enSlug;
      }
    }
  } catch {
    // Ignore decoding errors
  }
  
  return null;
}

// Mapping of English tag slugs to Arabic tag slugs
// This is needed because WPML assigns different slugs for each language
// and the API returns tags in different orders, making position-based matching unreliable
// Add new tag mappings here as needed (format: "english-slug": "url-encoded-arabic-slug")
const ENGLISH_TO_ARABIC_TAG_SLUGS: Record<string, string> = {
  // Common e-commerce tags - add actual tag slugs from WooCommerce here
  "new": "%d8%ac%d8%af%d9%8a%d8%af",
  "sale": "%d8%aa%d8%ae%d9%81%d9%8a%d8%b6",
  "bestseller": "%d8%a7%d9%84%d8%a3%d9%83%d8%ab%d8%b1-%d9%85%d8%a8%d9%8a%d8%b9%d8%a7",
  "featured": "%d9%85%d9%85%d9%8a%d8%b2",
  "exclusive": "%d8%ad%d8%b5%d8%b1%d9%8a",
  "limited-edition": "%d8%a5%d8%b5%d8%af%d8%a7%d8%b1-%d9%85%d8%ad%d8%af%d9%88%d8%af",
  "gift": "%d9%87%d8%af%d9%8a%d8%a9",
  "popular": "%d8%b4%d8%a7%d8%a6%d8%b9",
  "trending": "%d8%b1%d8%a7%d8%a6%d8%ac",
  "premium": "%d9%85%d9%85%d9%8a%d8%b2",
};

// Create a reverse mapping from Arabic tag slugs to English tag slugs
// This is used to convert Arabic tag slugs back to English slugs for URL generation
const ARABIC_TO_ENGLISH_TAG_SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries(ENGLISH_TO_ARABIC_TAG_SLUGS).map(([en, ar]) => [ar, en])
);

// Helper function to get English slug from an Arabic/localized tag slug
// Uses the reverse mapping for reliable slug conversion
export function getEnglishSlugFromLocalizedTagSlug(localizedSlug: string): string | null {
  // If the slug is already in English (exists in the English-to-Arabic mapping), return it
  if (ENGLISH_TO_ARABIC_TAG_SLUGS[localizedSlug]) {
    return localizedSlug;
  }
  
  // Try to find the English slug from the reverse mapping
  // The localized slug might be URL-encoded or decoded, so try both
  const englishSlug = ARABIC_TO_ENGLISH_TAG_SLUGS[localizedSlug];
  if (englishSlug) {
    return englishSlug;
  }
  
  // Try with URL-decoded version (in case the slug is already encoded)
  try {
    const decodedSlug = decodeURIComponent(localizedSlug);
    // Check if decoded slug matches any Arabic slug pattern
    for (const [arabicSlug, enSlug] of Object.entries(ARABIC_TO_ENGLISH_TAG_SLUGS)) {
      const decodedArabicSlug = decodeURIComponent(arabicSlug);
      if (decodedSlug === decodedArabicSlug) {
        return enSlug;
      }
    }
  } catch {
    // Ignore decoding errors
  }
  
  return null;
}

// Helper function to get Arabic slug from an English tag slug
// Uses the mapping for reliable slug conversion
export function getArabicSlugFromEnglishTagSlug(englishSlug: string): string | null {
  return ENGLISH_TO_ARABIC_TAG_SLUGS[englishSlug] || null;
}

// Get the English slug for a tag by its localized slug
// This ensures tag URLs always use English slugs regardless of current locale
export function getEnglishSlugForTag(
  localizedTagSlug: string,
  locale?: Locale
): string | null {
  // If locale is English or not specified, the slug is already English
  if (!locale || locale === "en") {
    return localizedTagSlug;
  }
  
  // Try to get English slug from the mapping
  const englishSlug = getEnglishSlugFromLocalizedTagSlug(localizedTagSlug);
  if (englishSlug) {
    return englishSlug;
  }
  
  // If no mapping found, return the original slug
  // This handles cases where the tag might not be in the mapping yet
  return localizedTagSlug;
}

// Get the localized tag slug for a given English slug and locale
// This is useful when you need to find a tag in the localized product data
export function getLocalizedTagSlug(
  englishSlug: string,
  locale?: Locale
): string {
  // If locale is English or not specified, return the English slug
  if (!locale || locale === "en") {
    return englishSlug;
  }
  
  // Try to get the Arabic slug from the mapping
  if (locale === "ar") {
    const arabicSlug = getArabicSlugFromEnglishTagSlug(englishSlug);
    if (arabicSlug) {
      return arabicSlug;
    }
  }
  
  // If no mapping found, return the original slug
  return englishSlug;
}

// Export the tag slug mappings for external use (e.g., in components that need to check mappings)
export const TAG_SLUG_MAPPINGS = {
  englishToArabic: ENGLISH_TO_ARABIC_TAG_SLUGS,
  arabicToEnglish: ARABIC_TO_ENGLISH_TAG_SLUGS,
};

// Memoized version for request deduplication
// Handles the case where URLs use English slugs but the locale is non-English (e.g., Arabic)
// WPML assigns different slugs for each language, so we need to map English slugs to localized categories
export const getCategoryBySlug = cache(async function getCategoryBySlug(
  slug: string,
  locale?: Locale,
  currency?: Currency,
  frontendHost?: string
): Promise<WCCategory | null> {
  try {
    const categories = await getCategories(locale, currency, frontendHost);
    
    // First, try to find by exact slug match
    const exactMatch = categories.find((cat) => cat.slug === slug);
    if (exactMatch) {
      return exactMatch;
    }
    
    // If no exact match and locale is Arabic, try to map English slug to Arabic slug
    if (locale === "ar") {
      const arabicSlug = ENGLISH_TO_ARABIC_CATEGORY_SLUGS[slug];
      if (arabicSlug) {
        const arabicMatch = categories.find((cat) => cat.slug === arabicSlug);
        if (arabicMatch) {
          return arabicMatch;
        }
      }
    }
    
    // Fallback: If locale is not English, try to find by matching with English categories
    // This handles cases where the mapping might be incomplete
    if (locale && locale !== "en") {
      const englishCategories = await getCategories("en", currency, frontendHost);
      
      // Find the English category with this slug
      const englishCategory = englishCategories.find((cat) => cat.slug === slug);
      if (englishCategory) {
        // Try to find a localized category with the same parent structure
        // For subcategories, find the parent first and then match by position
        if (englishCategory.parent !== 0) {
          const englishParent = englishCategories.find((cat) => cat.id === englishCategory.parent);
          if (englishParent) {
            // Find the Arabic parent using the slug mapping
            const arabicParentSlug = ENGLISH_TO_ARABIC_CATEGORY_SLUGS[englishParent.slug];
            if (arabicParentSlug) {
              const localizedParent = categories.find((cat) => cat.slug === arabicParentSlug);
              if (localizedParent) {
                // Find subcategories of this parent
                const englishSubcategories = englishCategories.filter((cat) => cat.parent === englishParent.id);
                const localizedSubcategories = categories.filter((cat) => cat.parent === localizedParent.id);
                
                const subIndex = englishSubcategories.findIndex((cat) => cat.slug === slug);
                if (subIndex !== -1 && subIndex < localizedSubcategories.length) {
                  return localizedSubcategories[subIndex];
                }
              }
            }
          }
        }

        // Some WPML category translations are missing from the localized category
        // endpoint, while localized products still reference the English category.
        // In that case, keep the route loadable using the canonical category.
        return englishCategory;
      }
    }
    
    return null;
  } catch {
    return null;
  }
});

export async function getProductsByCategory(
  categorySlug: string,
  params?: {
    page?: number;
    per_page?: number;
    locale?: Locale;
    currency?: Currency;
    frontendHost?: string;
  }
): Promise<WCProductsResponse> {
  const category = await getCategoryBySlug(
    categorySlug,
    params?.locale,
    params?.currency,
    params?.frontendHost
  );

  if (!category) {
    return { products: [], total: 0, totalPages: 0 };
  }

  const result = await getProducts({
    category: category.id.toString(),
    ...params,
  });

  // getProducts already handles locale fallback internally,
  // so if Arabic returned 0 it already fell back to English
  return result;
}

// Get products filtered by a fragrance note attribute term slug
// Fetches all products (paginated) and filters client-side by the "Notes" attribute
export async function getProductsByNote(
  noteSlug: string,
  params?: {
    locale?: Locale;
    currency?: Currency;
    frontendHost?: string;
  }
): Promise<WCProductsResponse> {
  // Always fetch in English first for reliable attribute slug matching,
  // since WPML may translate pa_notes term slugs in other locales.
  let allEnglishProducts: WCProduct[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await getProducts({
      page,
      per_page: 100,
      locale: "en",
      currency: params?.currency,
      frontendHost: params?.frontendHost,
    });
    allEnglishProducts = allEnglishProducts.concat(result.products);
    totalPages = result.totalPages;
    page++;
  } while (page <= totalPages);

  const matchedIds = allEnglishProducts
    .filter((product) =>
      product.attributes?.some(
        (attr) =>
          attr.taxonomy === "pa_notes" &&
          attr.terms?.some((term) => term.slug === noteSlug)
      )
    )
    .map((p) => p.id);

  if (matchedIds.length === 0) {
    return { products: [], total: 0, totalPages: 1 };
  }

  // If the requested locale is English, return the already-fetched products
  if (!params?.locale || params.locale === "en") {
    const filtered = allEnglishProducts.filter((p) => matchedIds.includes(p.id));
    return { products: filtered, total: filtered.length, totalPages: 1 };
  }

  // For non-English locales, re-fetch the matched products in the target locale
  const localizedResult = await getProducts({
    per_page: 100,
    include: matchedIds,
    locale: params.locale,
    currency: params?.currency,
    frontendHost: params?.frontendHost,
  });

  return {
    products: localizedResult.products,
    total: localizedResult.products.length,
    totalPages: 1,
  };
}

// Get related products by category - Memoized for request deduplication
export const getRelatedProducts = cache(async function getRelatedProducts(
  product: WCProduct,
  params?: {
    per_page?: number;
    locale?: Locale;
    currency?: Currency;
    frontendHost?: string;
  }
): Promise<WCProduct[]> {
  const categoryId = product.categories?.[0]?.id;
  
  if (!categoryId) {
    return [];
  }

  try {
    const { products } = await getProducts({
      category: categoryId.toString(),
      per_page: params?.per_page || 8,
      locale: params?.locale,
      currency: params?.currency,
      frontendHost: params?.frontendHost,
    });

    return products.filter((p) => p.id !== product.id);
  } catch {
    return [];
  }
});

// Get related products by category ID directly (for parallel fetching when category ID is known)
export const getRelatedProductsByCategoryId = cache(async function getRelatedProductsByCategoryId(
  categoryId: number,
  excludeProductId: number,
  params?: {
    per_page?: number;
    locale?: Locale;
    currency?: Currency;
    frontendHost?: string;
  }
): Promise<WCProduct[]> {
  try {
    const { products } = await getProducts({
      category: categoryId.toString(),
      per_page: params?.per_page || 8,
      locale: params?.locale,
      currency: params?.currency,
      frontendHost: params?.frontendHost,
    });

    return products.filter((p) => p.id !== excludeProductId);
  } catch {
    return [];
  }
});

// Slot-specific configuration for bundle builder
export interface SlotConfig {
  id: string | number;
  title?: string;
  is_optional?: boolean;
  is_free?: boolean;
  is_fixed?: boolean;
  fixed_product_id?: number;
  eligible_categories?: number[];
  eligible_products?: number[];
  exclude_categories?: number[];
  exclude_products?: number[];
}

// Bundle Configuration API (from ShapeHive Bundles Creator plugin)
export interface BundleConfig {
  product_id: number;
  bundle_id?: string;
  bundle_type?: string;
  eligible_categories?: number[];
  exclude_categories?: number[];
  eligible_products: number[];
  exclude_products?: number[];
  unique_products: number[];
  total_slots: number;
  required_slots: number;
  optional_slots?: number;
  with_box_price?: number;
  shipping_fee?: string;
  slot_labels?: Record<string, string>;
  enabled?: boolean;
  title?: string;
  pricing_mode?: "sum" | "fixed";
  fixed_price?: number;
  discount_type?: "none" | "percentage" | "fixed";
  discount_value?: number;
  show_individual_prices?: boolean;
  pricing?: BundlePricing;
  slots?: SlotConfig[];
}

export async function getBundleConfig(
  productSlug: string,
  locale?: Locale,
  frontendHost?: string
): Promise<BundleConfig | null> {
  try {
    let url = withFrontendHostParam(
      `${siteConfig.apiUrl}/wp-json/sasanperfumes-bundles/v1/config?slug=${productSlug}`,
      frontendHost
    );
    
    // Add locale parameter for WPML language support
    // This ensures the bundle config returns product/category IDs for the correct language
    if (locale) {
      url = `${url}&lang=${locale}`;
    }
    
    const response = await fetch(
      url,
      {
        next: {
            revalidate: 300, // Bundle config rarely changes - cache for 5 minutes
            tags: ["bundle-config", `bundle-config-${productSlug}`, locale ? `bundle-config-${productSlug}-${locale}` : ""].filter(Boolean),
        },
        headers: backendHeaders(),
      }
    );

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text || text === 'null' || text.trim() === '') {
      return null;
    }

    const data = JSON.parse(stripJsonPrefix(text));

    if (data.eligible_categories && !Array.isArray(data.eligible_categories)) {
      data.eligible_categories = Object.values(data.eligible_categories);
    }
    if (data.eligible_products && !Array.isArray(data.eligible_products)) {
      data.eligible_products = Object.values(data.eligible_products);
    }
    if (data.exclude_categories && !Array.isArray(data.exclude_categories)) {
      data.exclude_categories = Object.values(data.exclude_categories);
    }
    if (data.exclude_products && !Array.isArray(data.exclude_products)) {
      data.exclude_products = Object.values(data.exclude_products);
    }
    if (Array.isArray(data.slots)) {
      data.slots = data.slots.map((slot: Record<string, unknown>) => {
        if (slot.eligible_categories && !Array.isArray(slot.eligible_categories)) {
          slot.eligible_categories = Object.values(slot.eligible_categories);
        }
        if (slot.eligible_products && !Array.isArray(slot.eligible_products)) {
          slot.eligible_products = Object.values(slot.eligible_products);
        }
        if (slot.exclude_categories && !Array.isArray(slot.exclude_categories)) {
          slot.exclude_categories = Object.values(slot.exclude_categories);
        }
        if (slot.exclude_products && !Array.isArray(slot.exclude_products)) {
          slot.exclude_products = Object.values(slot.exclude_products);
        }
        return slot;
      });
    }

    return data;
  } catch {
    return null;
  }
}

// Fetch free gift product IDs from the backend
// Used to filter out gift products from shop listings
// Only returns product IDs where hide_from_shop is true
export interface FreeGiftInfo {
  ids: number[];
  slugs: string[];
}

export async function getFreeGiftProductIds(currency?: string, frontendHost?: string): Promise<number[]> {
  const info = await getFreeGiftProductInfo(currency, frontendHost);
  return info.ids;
}

// Get both IDs and slugs for free gift products
// Slugs are needed for filtering across WPML locales since product IDs differ per locale
// Note: WPML may create different slugs for Arabic products (e.g., "free-gift-2" instead of "free-gift")
// so we need to fetch slugs for both English and Arabic locales
export async function getFreeGiftProductInfo(currency?: string, frontendHost?: string): Promise<FreeGiftInfo> {
  try {
    let url = withFrontendHostParam(
      `${siteConfig.apiUrl}/wp-json/sasanperfumes-free-gifts/v1/rules`,
      frontendHost
    );
    if (currency) {
      url += `${url.includes("?") ? "&" : "?"}currency=${encodeURIComponent(currency)}`;
    }

    const response = await fetch(url, {
      headers: backendHeaders(),
      next: {
        revalidate: 600, // Free gift rules rarely change - cache for 10 minutes
        tags: ["free-gifts"],
      },
    });

    if (!response.ok) {
      return { ids: [], slugs: [] };
    }

    const data = await response.json();
    
    if (data.rules && Array.isArray(data.rules)) {
      // Return ALL free gift product IDs to hide them from shop listings
      // Free gift products (including password-protected ones) should only be
      // accessible through the free gift system, not through normal browsing
      const allRules = data.rules;
      
      const ids = allRules.map((rule: { product_id: number }) => rule.product_id);
      
      // Try to get slugs from the rules first (if API provides them)
      // The API returns slugs in rule.product.slug (nested object)
      let slugs = allRules
        .map((rule: { product?: { slug?: string }; product_slug?: string }) => 
          rule.product?.slug || rule.product_slug
        )
        .filter((slug: string | undefined): slug is string => !!slug);
      
      // Fetch product details to get slugs for BOTH English and Arabic locales
      // WPML may create different slugs for each locale (e.g., "free-gift" vs "free-gift-2")
      if (ids.length > 0) {
        const allSlugs = await Promise.all(
          ids.flatMap((id: number) => [
            // Fetch English product slug
            (async () => {
              try {
                const product = await getProductById(id, "en", undefined, frontendHost);
                return product?.slug;
              } catch {
                return undefined;
              }
            })(),
            // Fetch Arabic product slug (may be different due to WPML)
            (async () => {
              try {
                const product = await getProductById(id, "ar", undefined, frontendHost);
                return product?.slug;
              } catch {
                return undefined;
              }
            })(),
          ])
        );
        // Combine existing slugs with fetched slugs, removing duplicates
        const fetchedSlugs = allSlugs.filter((slug): slug is string => !!slug);
        slugs = [...new Set([...slugs, ...fetchedSlugs])];
      }
      
      return { ids, slugs };
    }
    
    return { ids: [], slugs: [] };
  } catch {
    return { ids: [], slugs: [] };
  }
}

// Fetch product IDs with catalog_visibility set to "hidden"
// These products should not appear in shop listings, search results, or related products
// Uses WC REST API v3 which returns catalog_visibility field
// Note: WooCommerce REST API doesn't support catalog_visibility as a query filter,
// so we fetch all products and filter client-side by the catalog_visibility property
export async function getHiddenProductIds(frontendHost?: string): Promise<number[]> {
  try {
    const consumerKey = process.env.WC_CONSUMER_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) {
      return [];
    }

    // Fetch all products and filter by catalog_visibility property
    // The catalog_visibility query param is not supported by WC REST API
    const url = withFrontendHostParam(
      `${siteConfig.apiUrl}/wp-json/wc/v3/products?per_page=100&status=publish`,
      frontendHost
    );
    
    const response = await fetch(url, {
      headers: {
        ...(backendHeaders() as Record<string, string>),
        Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
      },
      next: {
        revalidate: 600, // Hidden products rarely change - cache for 10 minutes
        tags: ["products", "hidden-products"],
      },
    });

    if (!response.ok) {
      return [];
    }

    const products = await response.json();
    
    if (Array.isArray(products)) {
      // Filter products where catalog_visibility is "hidden"
      const hiddenProducts = products.filter(
        (product: { catalog_visibility?: string }) => product.catalog_visibility === "hidden"
      );
      return hiddenProducts.map((product: { id: number }) => product.id);
    }
    
    return [];
  } catch (error) {
    console.warn(`Failed to fetch hidden products: ${formatFetchError(error)}`);
    return [];
  }
}

// Fetch all bundle-enabled product slugs from the backend
// Used to identify bundle products in shop listings
export async function getBundleEnabledProductSlugs(frontendHost?: string): Promise<string[]> {
  try {
    const response = await fetch(
      withFrontendHostParam(
        `${siteConfig.apiUrl}/wp-json/sasanperfumes-bundles/v1/enabled-products`,
        frontendHost
      ),
      {
        next: {
          revalidate: 60,
          tags: ["bundle-enabled-products"],
        },
        headers: backendHeaders(),
      }
    );

    if (!response.ok) {
      // Fallback: try to get from bundles list
      const bundlesResponse = await fetch(
        withFrontendHostParam(
          `${siteConfig.apiUrl}/wp-json/sasanperfumes-bundles/v1/bundles`,
          frontendHost
        ),
        {
          next: {
            revalidate: 60,
            tags: ["bundles"],
          },
          headers: backendHeaders(),
        }
      );

      if (!bundlesResponse.ok) {
        return [];
      }

      const bundles = await bundlesResponse.json();
      if (Array.isArray(bundles)) {
        // Filter enabled bundles
        const enabledBundles = bundles.filter(
          (bundle: { is_enabled?: boolean; enabled?: boolean }) => 
            bundle.is_enabled || bundle.enabled
        );

        // First try to extract slugs directly if available
        const directSlugs = enabledBundles
          .map((bundle: { product_slug?: string; slug?: string }) => 
            bundle.product_slug || bundle.slug
          )
          .filter((slug: string | undefined): slug is string => !!slug);

        if (directSlugs.length > 0) {
          return directSlugs;
        }

        // If no slugs available, fetch product slugs from product IDs
        const productIds = enabledBundles
          .map((bundle: { product_id?: number }) => bundle.product_id)
          .filter((id: number | undefined): id is number => typeof id === 'number');

        if (productIds.length > 0) {
          // Fetch product slugs from WooCommerce API
          const slugPromises = productIds.map(async (productId: number) => {
            try {
              const product = await getProductById(productId, undefined, undefined, frontendHost);
              return product?.slug || null;
            } catch {
              return null;
            }
          });

          const slugs = await Promise.all(slugPromises);
          return slugs.filter((slug): slug is string => slug !== null);
        }
      }
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data.slugs && Array.isArray(data.slugs)) {
      return data.slugs;
    }
    return [];
  } catch {
    return [];
  }
}

// Get upsell and cross-sell product IDs from WooCommerce REST API v3
// The Store API doesn't include linked product IDs, so we use the REST API
export async function getProductUpsellIds(
  productId: number,
  locale?: Locale,
  frontendHost?: string
): Promise<{ upsell_ids: number[]; cross_sell_ids: number[] }> {
  try {
    const langParam = locale ? `&lang=${locale}` : "";
    const url = withFrontendHostParam(
      `${siteConfig.apiUrl}/wp-json/wc/v3/products/${productId}?_fields=upsell_ids,cross_sell_ids${langParam}`,
      frontendHost
    );

    const response = await fetch(url, {
      headers: {
        ...(backendHeaders() as Record<string, string>),
        Authorization: `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString("base64")}`,
      },
      next: {
        revalidate: 300,
        tags: ["products", `product-linked-${productId}`],
      },
    });

    if (!response.ok) {
      return { upsell_ids: [], cross_sell_ids: [] };
    }

    const data = await response.json();
    return {
      upsell_ids: Array.isArray(data.upsell_ids) ? data.upsell_ids : [],
      cross_sell_ids: Array.isArray(data.cross_sell_ids) ? data.cross_sell_ids : [],
    };
  } catch {
    return { upsell_ids: [], cross_sell_ids: [] };
  }
}

// Get new products (ordered by date, newest first)
export async function getNewProducts(params?: {
  page?: number;
  per_page?: number;
  locale?: Locale;
  currency?: Currency;
  frontendHost?: string;
}): Promise<WCProductsResponse> {
  return getProducts({
    ...params,
    orderby: "date",
    order: "desc",
  });
}

export async function getBestsellerProducts(params?: {
  page?: number;
  per_page?: number;
  locale?: Locale;
  currency?: Currency;
  frontendHost?: string;
}): Promise<WCProductsResponse> {
  return getProducts({
    ...params,
    orderby: "popularity",
    order: "desc",
  });
}

// Get featured products
// Note: WooCommerce Store API doesn't have a direct featured filter,
// so we fetch from the custom endpoint or use a workaround
export async function getFeaturedProducts(params?: {
  page?: number;
  per_page?: number;
  locale?: Locale;
  currency?: Currency;
  frontendHost?: string;
}): Promise<WCProductsResponse> {
  try {
    const labels = getProductUILabels(params?.locale);
    const currencyCode = params?.currency || DEFAULT_API_CURRENCY;
    const minorUnit = getCurrencyMinorUnit(currencyCode);

    // Try to fetch featured products from custom endpoint
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
    if (params?.locale) searchParams.set("lang", params.locale);
    searchParams.set("currency", currencyCode);
    
    const queryString = searchParams.toString();
    const url = withFrontendHostParam(
      `${siteConfig.apiUrl}/wp-json/wc/v3/products?featured=true&status=publish${queryString ? `&${queryString}` : ""}`,
      params?.frontendHost
    );
    
    const response = await fetch(url, {
      headers: {
        ...(backendHeaders() as Record<string, string>),
        Authorization: `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString("base64")}`,
      },
      next: {
        revalidate: 300,
        tags: ["products", "featured-products"],
      },
    });

    if (!response.ok) {
      // Fallback to regular products if featured endpoint fails
      return getProducts(params);
    }

    const products = await response.json();
    const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);

    // Transform WC REST API v3 products to Store API format
    const transformedProducts: WCProduct[] = products.map((product: Record<string, unknown>) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      parent: product.parent_id || 0,
      type: product.type || "simple",
      variation: "",
      permalink: product.permalink,
      sku: product.sku || "",
      short_description: product.short_description || "",
      description: product.description || "",
      on_sale: product.on_sale || false,
      prices: {
        price: toMinorUnitPrice(product.price, minorUnit),
        regular_price: toMinorUnitPrice(product.regular_price || product.price, minorUnit),
        sale_price: product.sale_price ? toMinorUnitPrice(product.sale_price, minorUnit) : "",
        price_range: null,
        currency_code: currencyCode,
        currency_symbol: currencyCode,
        currency_minor_unit: minorUnit,
        currency_decimal_separator: ".",
        currency_thousand_separator: ",",
        currency_prefix: "",
        currency_suffix: ` ${currencyCode}`,
      },
      price_html: product.price_html || "",
      average_rating: product.average_rating || "0",
      review_count: product.rating_count || 0,
      images: Array.isArray(product.images) ? (product.images as Array<Record<string, unknown>>).map((img) => ({
        id: img.id || 0,
        src: img.src || "",
        thumbnail: img.src || "",
        srcset: "",
        sizes: "",
        name: img.name || "",
        alt: img.alt || "",
      })) : [],
      categories: Array.isArray(product.categories) ? (product.categories as Array<Record<string, unknown>>).map((cat) => ({
        id: cat.id || 0,
        name: cat.name || "",
        slug: cat.slug || "",
        link: "",
      })) : [],
      tags: Array.isArray(product.tags) ? (product.tags as Array<Record<string, unknown>>).map((tag) => ({
        id: tag.id || 0,
        name: tag.name || "",
        slug: tag.slug || "",
      })) : [],
      brands: Array.isArray(product.brands)
        ? (product.brands as Array<Record<string, unknown>>).map(b => ({
            id: Number(b.id) || 0,
            name: String(b.name || ""),
            slug: String(b.slug || ""),
          }))
        : [],
      attributes: [],
      variations: [],
      grouped_products: [],
      has_options: false,
      is_purchasable: product.purchasable !== false && product.status === "publish",
      is_in_stock: product.stock_status === "instock",
      catalog_visibility: (product.catalog_visibility as WCProduct["catalog_visibility"]) || "visible",
      is_on_backorder: product.stock_status === "onbackorder",
      low_stock_remaining: null,
      stock_availability: {
        text: product.stock_status === "instock" ? labels.inStockText : labels.outOfStockText,
        class: product.stock_status === "instock" ? "in-stock" : "out-of-stock",
      },
      sold_individually: product.sold_individually || false,
      add_to_cart: {
        text: labels.addToCartText,
        description: "",
        url: "",
        single_text: labels.addToCartText,
        minimum: 1,
        maximum: 9999,
        multiple_of: 1,
      },
      extensions: {},
    }));

    const visibleFeatured = transformedProducts.filter(
      (product) =>
        product.is_purchasable !== false &&
        (!product.catalog_visibility || product.catalog_visibility === "visible" || product.catalog_visibility === "catalog")
    );

    // Fallback: if non-English locale returns 0 featured products, retry without locale
    if (visibleFeatured.length === 0 && params?.locale && params.locale !== "en") {
      return getFeaturedProducts({ ...params, locale: "en" });
    }

    return {
      products: visibleFeatured,
      total: total - (transformedProducts.length - visibleFeatured.length),
      totalPages,
    };
  } catch (error) {
    console.warn(`Failed to fetch featured products: ${formatFetchError(error)}`);
    // Fallback to regular products
    return getProducts(params);
  }
}

// Helper function to format price from WooCommerce
export function formatWCPrice(prices: WCProduct["prices"]): string {
  const price = parseInt(prices.price) / Math.pow(10, prices.currency_minor_unit);
  const formatted = price.toLocaleString("en-US", {
    minimumFractionDigits: prices.currency_minor_unit,
    maximumFractionDigits: prices.currency_minor_unit,
  });

  if (prices.currency_prefix) {
    return `${prices.currency_prefix}${formatted}`;
  }

  if (prices.currency_suffix) {
    return `${formatted}${prices.currency_suffix}`;
  }

  return `${prices.currency_symbol}${formatted}`;
}
