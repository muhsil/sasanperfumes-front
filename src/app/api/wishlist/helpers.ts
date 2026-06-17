import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { API_BASE, backendHeaders, backendPostHeaders, noCacheUrl } from "@/lib/utils/backendFetch";
import { type Locale } from "@/config/site";

const WISHLIST_BASE = `${API_BASE}/wp-json/wc/v3/wishlist`;
const PRODUCTS_BASE = `${API_BASE}/wp-json/wc/v3/products`;
const USER_COOKIE = "sasanperfumes_auth_user";

// --- Types ---

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  images: Array<{ src: string; alt: string }>;
}

export interface RawWishlistItem {
  id?: number;
  item_id?: number;
  product_id: number;
  variation_id?: number;
  quantity?: number;
  date_added?: string;
  product_name?: string;
  name?: string;
  product_price?: string;
  price?: string;
  product_image?: string;
  image?: string;
  thumbnail?: string;
}

export interface EnrichedWishlistItem {
  id: number;
  product_id: number;
  variation_id?: number;
  quantity?: number;
  dateadded?: string;
  product_name: string;
  product_price?: string;
  product_image?: string;
  product_url?: string;
  stock_status?: string;
  is_in_stock?: boolean;
}

// --- Cache ---

const PRODUCT_CACHE_TTL = 5 * 60 * 1000;
interface CachedProduct {
  data: WCProduct;
  timestamp: number;
  locale: Locale | null;
}
const productCache = new Map<string, CachedProduct>();

const SHARE_KEY_CACHE_TTL = 60 * 1000;
interface CachedShareKey {
  shareKey: string;
  timestamp: number;
}
const shareKeyCache = new Map<number, CachedShareKey>();

function getCachedProduct(productId: number, locale: Locale | null): WCProduct | null {
  const cacheKey = getProductCacheKey(productId, locale);
  const cached = productCache.get(cacheKey);
  if (cached && cached.locale === locale && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
    return cached.data;
  }
  if (cached) productCache.delete(cacheKey);
  return null;
}

function getProductCacheKey(productId: number, locale: Locale | null): string {
  return `${locale || "default"}:${productId}`;
}

function normalizeLocale(value: string | null | undefined): Locale | null {
  return value === "ar" ? "ar" : value === "en" ? "en" : null;
}

function setCachedProduct(productId: number, product: WCProduct, locale: Locale | null): void {
  const cacheKey = getProductCacheKey(productId, locale);
  productCache.set(cacheKey, { data: product, timestamp: Date.now(), locale });
}

function getCachedShareKey(userId: number): string | null {
  const cached = shareKeyCache.get(userId);
  if (cached && Date.now() - cached.timestamp < SHARE_KEY_CACHE_TTL) {
    return cached.shareKey;
  }
  if (cached) shareKeyCache.delete(userId);
  return null;
}

export function setCachedShareKey(userId: number, shareKey: string): void {
  shareKeyCache.set(userId, { shareKey, timestamp: Date.now() });
}

// --- Auth & Credentials ---

export function areCredentialsConfigured(): boolean {
  const { consumerKey, consumerSecret } = getWcCredentials();
  return consumerKey.length > 0 && consumerSecret.length > 0;
}

export function getBasicAuthParams(): string {
  const { consumerKey, consumerSecret } = getWcCredentials();
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

export async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get(USER_COOKIE)?.value;

  if (userCookie) {
    try {
      const userData = JSON.parse(userCookie);
      if (userData.user_id) {
        return userData.user_id;
      }
    } catch {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie));
        if (userData.user_id) {
          return userData.user_id;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return null;
}

// --- Response Helpers ---

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export function misconfiguredResponse() {
  console.error("[Wishlist API] WC_CONSUMER_KEY and WC_CONSUMER_SECRET environment variables are not configured");
  return errorResponse("server_misconfigured", "Wishlist service is not configured. Please contact support.", 503);
}

export function unauthorizedResponse() {
  return errorResponse("unauthorized", "You must be logged in to manage your wishlist.", 401);
}

export function upstreamAuthErrorResponse() {
  return errorResponse("wishlist_upstream_unauthorized", "Unable to access wishlist service. Please try again later.", 503);
}

// --- Wishlist Operations ---

export async function getUserWishlistShareKey(userId: number): Promise<{ shareKey: string | null; error?: string }> {
  const cachedKey = getCachedShareKey(userId);
  if (cachedKey) {
    return { shareKey: cachedKey };
  }

  const response = await fetch(noCacheUrl(`${WISHLIST_BASE}/get_by_user/${userId}?${getBasicAuthParams()}`), {
    method: "GET",
    headers: backendHeaders(),
  });

  if (response.ok) {
    const data = await response.json();
    let shareKey: string | null = null;
    if (data && data.share_key) {
      shareKey = data.share_key;
    } else if (Array.isArray(data) && data.length > 0 && data[0].share_key) {
      shareKey = data[0].share_key;
    }

    if (shareKey) {
      setCachedShareKey(userId, shareKey);
    }
    return { shareKey };
  }

  if (response.status === 401 || response.status === 403) {
    return { shareKey: null, error: "upstream_unauthorized" };
  }

  return { shareKey: null };
}

export async function getOrCreateWishlist(userId: number): Promise<{ shareKey: string | null; error?: string }> {
  const result = await getUserWishlistShareKey(userId);

  if (result.error) {
    return result;
  }

  if (result.shareKey) {
    return result;
  }

  const createResponse = await fetch(noCacheUrl(`${WISHLIST_BASE}?${getBasicAuthParams()}`), {
    method: "POST",
    headers: backendPostHeaders(),
    body: JSON.stringify({
      user_id: userId,
      title: "Default",
      status: "private",
    }),
  });

  if (createResponse.ok) {
    const createData = await createResponse.json();
    const shareKey = createData.share_key || null;
    if (shareKey) {
      setCachedShareKey(userId, shareKey);
    }
    return { shareKey };
  }

  return { shareKey: null };
}

export async function addProductToWishlist(
  shareKey: string,
  productId: number,
  variationId: number = 0,
  quantity: number = 1
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(noCacheUrl(`${WISHLIST_BASE}/${shareKey}/add_product?${getBasicAuthParams()}`), {
    method: "POST",
    headers: backendPostHeaders(),
    body: JSON.stringify({
      product_id: productId,
      variation_id: variationId,
      quantity,
    }),
  });

  const responseText = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { message: responseText };
  }

  return { ok: response.ok, data };
}

export async function removeProductFromWishlist(
  shareKey: string,
  itemId: number
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const response = await fetch(noCacheUrl(`${WISHLIST_BASE}/${shareKey}/remove_product/${itemId}?${getBasicAuthParams()}`), {
    method: "DELETE",
    headers: backendPostHeaders(),
  });

  const responseText = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { message: responseText };
  }

  return { ok: response.ok, status: response.status, data };
}

// --- Product Enrichment ---

export async function fetchProductDetails(
  productIds: number[],
  locale?: string
): Promise<Map<number, WCProduct>> {
  const localeValue = normalizeLocale(locale);
  const productMap = new Map<number, WCProduct>();

  if (productIds.length === 0) return productMap;

  const uncachedIds: number[] = [];
  for (const id of productIds) {
    const cached = getCachedProduct(id, localeValue);
    if (cached) {
      productMap.set(id, cached);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) {
    return productMap;
  }

  try {
    const idsParam = uncachedIds.join(",");
    const params = new URLSearchParams(getBasicAuthParams());
    params.set("include", idsParam);
    params.set("per_page", uncachedIds.length.toString());
    if (localeValue) {
      params.set("lang", localeValue);
    }

    const response = await fetch(
      noCacheUrl(`${PRODUCTS_BASE}?${params.toString()}`),
      {
        method: "GET",
        headers: backendHeaders(),
      }
    );

    if (response.ok) {
      const products: WCProduct[] = await response.json();
      for (const product of products) {
        productMap.set(product.id, product);
        setCachedProduct(product.id, product, localeValue);
      }
    }
  } catch (error) {
    console.error("[Wishlist API] Error fetching product details:", error);
  }

  return productMap;
}

export function enrichWishlistItems(
  rawItems: RawWishlistItem[],
  productMap: Map<number, WCProduct>,
  locale: string | null = "en"
): EnrichedWishlistItem[] {
  return rawItems.map((item) => {
    const product = productMap.get(item.product_id);
    const itemId = item.id || item.item_id || item.product_id;

    const productName = product?.name || item.product_name || item.name || `Product #${item.product_id}`;
    const productPrice = product?.price || item.product_price || item.price;
    const productImage = product?.images?.[0]?.src || item.product_image || item.image || item.thumbnail;
    const productSlug = product?.slug;
    const stockStatus = product?.stock_status || "instock";

    return {
      id: itemId,
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      dateadded: item.date_added,
      product_name: productName,
      product_price: productPrice,
      product_image: productImage,
      product_url: productSlug ? `/${locale === "ar" ? "ar" : "en"}/product/${productSlug}` : undefined,
      stock_status: stockStatus,
      is_in_stock: stockStatus === "instock",
    };
  });
}

export function parseRawItems(data: unknown): RawWishlistItem[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.products)) return obj.products as RawWishlistItem[];
    if (Array.isArray(obj.items)) return obj.items as RawWishlistItem[];
  }
  return [];
}

export async function fetchEnrichedWishlistItems(
  shareKey: string,
  locale?: string
): Promise<EnrichedWishlistItem[]> {
  const localeValue = normalizeLocale(locale);
  const productsResponse = await fetch(noCacheUrl(`${WISHLIST_BASE}/${shareKey}/get_products?${getBasicAuthParams()}`), {
    method: "GET",
    headers: backendHeaders(),
  });

  if (!productsResponse.ok) {
    return [];
  }

  const productsData = await productsResponse.json();
  const rawItems = parseRawItems(productsData);

  if (rawItems.length === 0) {
    return [];
  }

  const productIds = rawItems.map((item) => item.product_id).filter(Boolean);
  const productMap = await fetchProductDetails(productIds, localeValue || undefined);
  return enrichWishlistItems(rawItems, productMap, localeValue);
}

export function wishlistSuccessResponse(
  shareKey: string,
  items: EnrichedWishlistItem[],
  extra?: Record<string, unknown>
) {
  return NextResponse.json({
    success: true,
    wishlist: { share_key: shareKey, items, items_count: items.length },
    items,
    ...extra,
  });
}
