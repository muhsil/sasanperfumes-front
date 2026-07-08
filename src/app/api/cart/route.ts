import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE, backendHeaders, backendPostHeaders, backendAuthHeaders, noCacheUrl, safeJsonResponse, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { type MarketConfig } from "@/config/market";
import { getRequestMarket } from "@/lib/market/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CART_KEY_COOKIE = "cocart_cart_key";
const AUTH_TOKEN_COOKIE = "sasanperfumes_auth_token";
const AUTH_REFRESH_TOKEN_COOKIE = "sasanperfumes_refresh_token";
const CURRENCY_COOKIE = "wcml_currency";
const LOCALE_COOKIE = "NEXT_LOCALE";
const MARKETS_WITH_SEPARATE_APIS = new Set(["qa", "om", "sa"]);
const COCART_WPJSON_BASE = `${API_BASE.replace(/\/+$/, "")}/wp-json`;
const LEGACY_STORE_API_BASE = "https://sasanperfumes.shapehive.com/wp-json/wc/store/v1";

function isInvalidBackendResponse(data: Record<string, unknown>): boolean {
  return data?.code === "invalid_response";
}

function blockedBackendError(data: Record<string, unknown>) {
  return {
    code: "backend_blocked",
    message: String(
      (data.message as string | undefined) ??
      "Backend returned an HTML page instead of JSON. The server may be blocking API requests. Please check firewall/WAF settings and ensure /wp-json/* paths are not blocked or cached."
    ),
  };
}

function normalizeHostWithMarketFallback(rawHost: string | null, marketCode: string): string {
  const hostWithMaybePath = (rawHost || "").split(",")[0].trim().replace(/^https?:\/\//i, "").replace(/:\d+$/, "");
  const host = hostWithMaybePath.split("/")[0].trim();
  if (!host) return host;
  if (hostWithMaybePath.includes(`/${marketCode}`)) {
    return `${host}/${marketCode}`;
  }
  if (host.toLowerCase().startsWith(`${marketCode}.`)) {
    return `${host.substring(marketCode.length + 1)}/${marketCode}`;
  }
  return `${host}/${marketCode}`;
}

function getCartKeyCookieName(marketCode?: string | null): string {
  const market = (marketCode || "").toLowerCase();
  return market && market !== "intl" ? `${CART_KEY_COOKIE}_${market}` : CART_KEY_COOKIE;
}

async function getCartKey(marketCode?: string | null): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(getCartKeyCookieName(marketCode))?.value || null;
}

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value || null;
}

async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_REFRESH_TOKEN_COOKIE)?.value || null;
}

function toHeadersRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...(headers as Record<string, string>) };
}

function toMarketAwareHeaders(
  request: NextRequest,
  marketCode: string,
  headers: HeadersInit
): HeadersInit {
  const result = toHeadersRecord(headers);
  const market = marketCode.toLowerCase();

  if (!MARKETS_WITH_SEPARATE_APIS.has(market)) {
    return result;
  }

  const frontendHost = normalizeHostWithMarketFallback(
    request.headers.get("x-frontend-host")
      || request.headers.get("x-forwarded-host")
      || request.headers.get("host")
      || "",
    market
  );

  if (frontendHost) {
    result["X-Frontend-Host"] = frontendHost;
  }
  result["X-Market"] = market;
  return result;
}

// Attempt to refresh the JWT token using the refresh token
async function tryRefreshToken(request: NextRequest, market: MarketConfig, wpJsonBase: string): Promise<string | null> {
  const refreshTokenValue = await getRefreshToken();
  if (!refreshTokenValue) return null;

  try {
    const response = await fetch(noCacheUrl(`${wpJsonBase}/cocart/jwt/refresh-token`), {
      method: "POST",
      headers: toMarketAwareHeaders(request, market.code, backendPostHeaders()),
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (!response.ok) return null;

    const data = await safeJsonResponse(response);
    return (data.jwt_token as string) || (data.token as string) || null;
  } catch {
    return null;
  }
}

async function getCurrency(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENCY_COOKIE)?.value || null;
}

// Get locale from query parameter, cookie, or referer URL
async function getLocale(request: NextRequest): Promise<string | null> {
  // First, check for locale in query parameter (highest priority for explicit requests)
  const localeParam = request.nextUrl.searchParams.get("locale");
  if (localeParam && (localeParam === "en" || localeParam === "ar")) {
    return localeParam;
  }
  
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (localeCookie) return localeCookie;
  
  // Try to extract locale from referer URL (e.g., /ar/product/... or /en/product/...)
  const referer = request.headers.get("referer");
  if (referer) {
    const match = referer.match(/\/(ar|en)\//);
    if (match) return match[1];
  }
  
  return null;
}

// Helper to append currency and lang parameters to URL
function appendParamsToUrl(url: string, currency: string | null, lang: string | null): string {
  let result = url;
  if (currency) {
    const separator = result.includes("?") ? "&" : "?";
    result = `${result}${separator}currency=${currency}`;
  }
  if (lang) {
    const separator = result.includes("?") ? "&" : "?";
    result = `${result}${separator}lang=${lang}`;
  }
  return result;
}

function getAuthHeaders(
  request: NextRequest,
  market: MarketConfig,
  authToken: string | null
): HeadersInit {
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    return toMarketAwareHeaders(request, market.code, backendHeaders({ "Authorization": authHeader }));
  } else if (authToken) {
    return toMarketAwareHeaders(request, market.code, backendAuthHeaders(authToken));
  }
  return getGuestHeaders(request, market);
}

function getGuestHeaders(request: NextRequest, market: MarketConfig): HeadersInit {
  return toMarketAwareHeaders(request, market.code, backendHeaders());
}

function isAuthError(status: number, data: Record<string, unknown>): boolean {
  if (status !== 401 && status !== 403) return false;
  
  // For 403 errors, always treat as potential auth error and retry as guest
  // This handles cases where:
  // 1. Auth token is stale/invalid
  // 2. Cart key is stale/invalid
  // 3. WAF or security plugin blocks authenticated requests
  // 4. CoCart returns non-standard error codes
  if (status === 403) return true;
  
  // For 401 errors, check for specific auth-related error codes/messages
  const code = data.code as string | undefined;
  const message = data.message as string | undefined;
  return Boolean(
    code?.includes("jwt_auth") ||
    code?.includes("rest_forbidden") ||
    code?.includes("cocart_rest") ||
    code?.includes("cocart_customer") ||
    message?.toLowerCase().includes("authentication") ||
    message?.toLowerCase().includes("token") ||
    message?.toLowerCase().includes("unauthorized") ||
    message?.toLowerCase().includes("permission")
  );
}

// Get Store API authentication tokens (cart-token and nonce) for coupon operations
async function getStoreApiAuth(request: NextRequest, market: MarketConfig, wpJsonBase: string): Promise<{ cartToken: string | null; nonce: string | null }> {
  try {
    const response = await fetch(noCacheUrl(`${wpJsonBase}/wc/store/v1/cart`), {
      method: "GET",
      headers: toMarketAwareHeaders(request, market.code, backendHeaders()),
    });
    
    const cartToken = response.headers.get("cart-token");
    const nonce = response.headers.get("nonce");
    
    return { cartToken, nonce };
  } catch {
    return { cartToken: null, nonce: null };
  }
}

function createResponseWithCartKey(
  data: Record<string, unknown>,
  cartKey: string | null,
  newAuthToken: string | null = null,
  status: number = 200,
  marketCode?: string | null
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  if (cartKey) {
    response.cookies.set(getCartKeyCookieName(marketCode), cartKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  }
  
  // Update auth token cookie if we refreshed it
  if (newAuthToken) {
    response.cookies.set(AUTH_TOKEN_COOKIE, newAuthToken, {
      httpOnly: false, // Needs to be accessible by client-side JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  }
  
  return response;
}

async function fetchLegacyProductIdentity(sourceProductId: number): Promise<{ slug?: string; sku?: string } | null> {
  try {
    const response = await fetch(noCacheUrl(`${LEGACY_STORE_API_BASE}/products/${sourceProductId}`), {
      method: "GET",
      headers: backendHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await safeJsonResponse(response);
    return {
      slug: typeof data.slug === "string" ? data.slug : undefined,
      sku: typeof data.sku === "string" ? data.sku : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchCurrentProductIdBySlug(
  slug: string,
  request: NextRequest,
  market: MarketConfig,
  locale: string | null
): Promise<number | null> {
  const query = new URLSearchParams({ slug });
  query.set("lang", locale || "en");
  query.set("currency", "AED");

  const parseProductId = async (response: Response): Promise<number | null> => {
    if (!response.ok) {
      return null;
    }

    const data = await safeJsonResponse(response);
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const firstProduct = data[0] as Record<string, unknown>;
    const candidateId = Number(firstProduct.id);
    return Number.isFinite(candidateId) && candidateId > 0 ? candidateId : null;
  };

  try {
    const scopedResponse = await fetch(noCacheUrl(`${COCART_WPJSON_BASE}/wc/store/v1/products?${query.toString()}`), {
      method: "GET",
      headers: toMarketAwareHeaders(request, market.code, backendHeaders()),
    });

    const scopedId = await parseProductId(scopedResponse);
    if (scopedId) {
      return scopedId;
    }

    const unscopedResponse = await fetch(noCacheUrl(`${COCART_WPJSON_BASE}/wc/store/v1/products?${query.toString()}`), {
      method: "GET",
      headers: backendHeaders(),
    });

    return parseProductId(unscopedResponse);
  } catch {
    return null;
  }
}

async function resolveReplacementProductId(
  sourceProductId: number,
  request: NextRequest,
  market: MarketConfig,
  locale: string | null
): Promise<number | null> {
  const legacyIdentity = await fetchLegacyProductIdentity(sourceProductId);
  if (!legacyIdentity?.slug) {
    return null;
  }

  return fetchCurrentProductIdBySlug(legacyIdentity.slug, request, market, locale);
}

function shouldRetryProductLookup(errorCode: string, errorMessage: string): boolean {
  const code = errorCode.toLowerCase();
  const message = errorMessage.toLowerCase();

  return (
    code === "cocart_invalid_product" ||
    code === "woocommerce_rest_invalid_product_id" ||
    code === "woocommerce_rest_product_not_purchasable" ||
    code === "product_not_purchasable" ||
    message.includes("cannot be added to the cart") ||
    message.includes("cannot be purchased") ||
    message.includes("not purchasable") ||
    message.includes("invalid product")
  );
}

export async function GET(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const coCartBase = COCART_WPJSON_BASE;
    const cartKey = await getCartKey(market.code);
    const authToken = await getAuthToken();
    const currency = await getCurrency();
    const locale = await getLocale(request);
    
    // For authenticated users, don't use cart_key (use JWT identity)
    // Append currency and lang parameters for WPML multicurrency and multilingual support
    const authUrl = appendParamsToUrl(`${coCartBase}/cocart/v2/cart`, currency, locale);
    const guestUrl = cartKey
      ? appendParamsToUrl(`${coCartBase}/cocart/v2/cart?cart_key=${cartKey}`, currency, locale)
      : appendParamsToUrl(`${coCartBase}/cocart/v2/cart`, currency, locale);

    // First attempt: try with auth if token exists
    const url = authToken ? authUrl : guestUrl;
    let response = await fetch(noCacheUrl(url), {
      method: "GET",
      headers: authToken ? getAuthHeaders(request, market, authToken) : getGuestHeaders(request, market),
    });

    let data = await safeJsonResponse(response);
    let refreshedToken: string | null = null;

    if (!response.ok && !authToken && data.code === "invalid_response") {
      response = await fetch(url, { method: "GET" });
      data = await safeJsonResponse(response);
    }

    if (isInvalidBackendResponse(data)) {
      return createResponseWithCartKey({
        success: false,
        error: blockedBackendError(data),
      }, null, null, 503, market.code);
    }

    if (!response.ok && authToken && isAuthError(response.status, data)) {
      refreshedToken = await tryRefreshToken(request, market, coCartBase);
      
      if (refreshedToken) {
        response = await fetch(noCacheUrl(authUrl), {
          method: "GET",
          headers: toMarketAwareHeaders(request, market.code, backendAuthHeaders(refreshedToken)),
        });
        data = await safeJsonResponse(response);
      }
      
      if (!refreshedToken || !response.ok) {
        refreshedToken = null;
        response = await fetch(noCacheUrl(guestUrl), {
          method: "GET",
          headers: getGuestHeaders(request, market),
        });
        data = await safeJsonResponse(response);
      }
    }

    if (!response.ok && !authToken && response.status === 403 && cartKey) {
      const freshGuestUrl = appendParamsToUrl(`${coCartBase}/cocart/v2/cart`, currency, locale);
      response = await fetch(noCacheUrl(freshGuestUrl), {
        method: "GET",
        headers: getGuestHeaders(request, market),
      });
      data = await safeJsonResponse(response);
    }

    if (!response.ok) {
      return createResponseWithCartKey({
        success: false,
        cart: null,
        error: { code: "backend_unavailable", message: (data.message as string) || "Cart backend unavailable." },
      }, null, null, 200, market.code);
    }

    const newCartKey = data.cart_key ? (data.cart_key as string) : null;
    return createResponseWithCartKey({ success: true, cart: data }, newCartKey, refreshedToken, 200, market.code);
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        cart: null,
        warning: error instanceof Error ? error.message : "Network error occurred",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  try {
    const market = await getRequestMarket();
    const wpJsonBase = wpJsonBaseForMarket(market.code);
    const coCartBase = COCART_WPJSON_BASE;
    const cartKey = await getCartKey(market.code);
    const authToken = await getAuthToken();
    const currency = await getCurrency();
    const locale = await getLocale(request);
    const body = await request.json().catch(() => ({}));
    let baseUrl: string;
    let method: string = "POST";

    switch (action) {
      case "add":
        baseUrl = appendParamsToUrl(`${coCartBase}/cocart/v2/cart/add-item`, currency, locale);
        break;
      case "update": {
        const itemKey = searchParams.get("item_key");
        if (!itemKey) {
          return NextResponse.json(
            { success: false, error: { code: "missing_item_key", message: "Item key is required" } },
            { status: 400 }
          );
        }
        baseUrl = appendParamsToUrl(`${coCartBase}/cocart/v2/cart/item/${itemKey}`, currency, locale);
        break;
      }
      case "remove": {
        const removeKey = searchParams.get("item_key");
        if (!removeKey) {
          return NextResponse.json(
            { success: false, error: { code: "missing_item_key", message: "Item key is required" } },
            { status: 400 }
          );
        }
        baseUrl = appendParamsToUrl(`${coCartBase}/cocart/v2/cart/item/${removeKey}`, currency, locale);
        method = "DELETE";
        break;
      }
      case "clear":
        baseUrl = appendParamsToUrl(`${coCartBase}/cocart/v2/cart/clear`, currency, locale);
        break;
      // "update-customer" case removed — customs fees are now calculated client-side
      // because CoCart v2 and WC Store API use separate sessions, making server-side
      // fee recalculation unreliable for guest users.
      case "apply-coupon":
      case "remove-coupon": {
        // Use WooCommerce Store API for coupons (CoCart v2 doesn't have coupon endpoints on this backend)
        // Store API requires Cart-Token and X-WP-Nonce headers for authentication
        const { cartToken, nonce } = await getStoreApiAuth(request, market, wpJsonBase);
        
        if (!cartToken || !nonce) {
          return NextResponse.json(
            { success: false, error: { code: "store_api_auth_error", message: "Failed to get Store API authentication" } },
            { status: 500 }
          );
        }
        
        const storeApiUrl = action === "apply-coupon" 
          ? `${wpJsonBase}/wc/store/v1/cart/apply-coupon`
          : `${wpJsonBase}/wc/store/v1/cart/remove-coupon`;
        
        const storeApiResponse = await fetch(noCacheUrl(storeApiUrl), {
          method: "POST",
          headers: toMarketAwareHeaders(request, market.code, backendPostHeaders({
            "Cart-Token": cartToken,
            "X-WP-Nonce": nonce,
          })),
          body: JSON.stringify(body),
        });
        
        const storeApiData = await safeJsonResponse(storeApiResponse);
        if (isInvalidBackendResponse(storeApiData)) {
          return NextResponse.json(
            {
              success: false,
              error: blockedBackendError(storeApiData),
            },
            { status: 503 }
          );
        }
        
        if (!storeApiResponse.ok) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: String(storeApiData.code || "coupon_error"),
                message: String(storeApiData.message || "Coupon operation failed."),
              },
            },
            { status: storeApiResponse.status }
          );
        }
        
        const coCartUrl = cartKey
          ? appendParamsToUrl(`${coCartBase}/cocart/v2/cart?cart_key=${cartKey}`, currency, locale)
          : appendParamsToUrl(`${coCartBase}/cocart/v2/cart`, currency, locale);
        
        const coCartResponse = await fetch(noCacheUrl(coCartUrl), {
          method: "GET",
          headers: authToken ? getAuthHeaders(request, market, authToken) : getGuestHeaders(request, market),
        });
        
        const coCartData = await safeJsonResponse(coCartResponse);
        if (isInvalidBackendResponse(coCartData)) {
          return NextResponse.json(
            {
              success: false,
              error: blockedBackendError(coCartData),
            },
            { status: 503 }
          );
        }
        
        if (!coCartResponse.ok) {
          return NextResponse.json({ 
            success: true, 
            cart: storeApiData,
            warning: "Cart data may not be in expected format"
          });
        }
        
        const newCartKey = coCartData.cart_key ? (coCartData.cart_key as string) : null;
        return createResponseWithCartKey({ success: true, cart: coCartData }, newCartKey, null, 200, market.code);
      }
      default:
        return NextResponse.json(
          { success: false, error: { code: "invalid_action", message: "Invalid action" } },
          { status: 400 }
        );
    }

    // Build URLs for authenticated and guest requests
    const guestUrl = cartKey
      ? baseUrl + (baseUrl.includes("?") ? `&cart_key=${cartKey}` : `?cart_key=${cartKey}`)
      : baseUrl;
    const url = authToken ? baseUrl : guestUrl;

    const fetchOptions: RequestInit = {
      method,
      headers: authToken ? getAuthHeaders(request, market, authToken) : getGuestHeaders(request, market),
    };

    if (method !== "DELETE" && Object.keys(body).length > 0) {
      fetchOptions.body = JSON.stringify(body);
      fetchOptions.headers = { ...(fetchOptions.headers as Record<string, string>), "Content-Type": "application/json" };
    }

    let response = await fetch(noCacheUrl(url), fetchOptions);
    let data = await safeJsonResponse(response);
    let refreshedToken: string | null = null;

    if (isInvalidBackendResponse(data)) {
      return NextResponse.json(
        {
          success: false,
          error: blockedBackendError(data),
        },
        { status: 503 }
      );
    }

    if (!response.ok && authToken && isAuthError(response.status, data)) {
      refreshedToken = await tryRefreshToken(request, market, coCartBase);
      
      if (refreshedToken) {
        const refreshedFetchOptions: RequestInit = {
          method,
          headers: toMarketAwareHeaders(request, market.code, backendAuthHeaders(refreshedToken)),
        };
        if (method !== "DELETE" && Object.keys(body).length > 0) {
          refreshedFetchOptions.body = JSON.stringify(body);
          refreshedFetchOptions.headers = { ...(refreshedFetchOptions.headers as Record<string, string>), "Content-Type": "application/json" };
        }
        response = await fetch(noCacheUrl(baseUrl), refreshedFetchOptions);
        data = await safeJsonResponse(response);
        if (isInvalidBackendResponse(data)) {
          return NextResponse.json(
            {
              success: false,
              error: blockedBackendError(data),
            },
            { status: 503 }
          );
        }
      }
      
      if (!refreshedToken || !response.ok) {
        refreshedToken = null;
        const guestFetchOptions: RequestInit = {
          method,
          headers: getGuestHeaders(request, market),
        };
        if (method !== "DELETE" && Object.keys(body).length > 0) {
          guestFetchOptions.body = JSON.stringify(body);
          guestFetchOptions.headers = { ...(guestFetchOptions.headers as Record<string, string>), "Content-Type": "application/json" };
        }
        response = await fetch(noCacheUrl(guestUrl), guestFetchOptions);
        data = await safeJsonResponse(response);
        if (isInvalidBackendResponse(data)) {
          return NextResponse.json(
            {
              success: false,
              error: blockedBackendError(data),
            },
            { status: 503 }
          );
        }
      }
    }

    if (!response.ok && !authToken && response.status === 403 && cartKey) {
      const freshGuestUrl = baseUrl;
      const freshGuestFetchOptions: RequestInit = {
        method,
        headers: getGuestHeaders(request, market),
      };
      if (method !== "DELETE" && Object.keys(body).length > 0) {
        freshGuestFetchOptions.body = JSON.stringify(body);
        freshGuestFetchOptions.headers = { ...(freshGuestFetchOptions.headers as Record<string, string>), "Content-Type": "application/json" };
      }
      response = await fetch(noCacheUrl(freshGuestUrl), freshGuestFetchOptions);
      data = await safeJsonResponse(response);
      if (isInvalidBackendResponse(data)) {
        return NextResponse.json(
          {
            success: false,
            error: blockedBackendError(data),
          },
          { status: 503 }
        );
      }
    }

    if (action === "add" && !response.ok && cartKey && shouldRetryProductLookup(String(data.code || ""), String(data.message || ""))) {
      const retryWithoutCartKeyOptions: RequestInit = {
        method,
        headers: authToken ? getAuthHeaders(request, market, authToken) : getGuestHeaders(request, market),
      };

      if (method !== "DELETE" && Object.keys(body).length > 0) {
        retryWithoutCartKeyOptions.body = JSON.stringify(body);
        retryWithoutCartKeyOptions.headers = {
          ...(retryWithoutCartKeyOptions.headers as Record<string, string>),
          "Content-Type": "application/json",
        };
      }

      response = await fetch(noCacheUrl(baseUrl), retryWithoutCartKeyOptions);
      data = await safeJsonResponse(response);
    }

    if (
      action === "add" &&
      !response.ok &&
      (typeof body.id === "string" || typeof body.id === "number") &&
      shouldRetryProductLookup(String(data.code || ""), String(data.message || ""))
    ) {
      const sourceProductId = Number(body.id);
      if (Number.isFinite(sourceProductId) && sourceProductId > 0) {
        const replacementProductId = await resolveReplacementProductId(sourceProductId, request, market, locale);

        if (replacementProductId && replacementProductId !== sourceProductId) {
          const retryBody = { ...body, id: String(replacementProductId) };
          const retryFetchOptions: RequestInit = {
            method,
            headers: authToken ? getAuthHeaders(request, market, authToken) : getGuestHeaders(request, market),
            body: JSON.stringify(retryBody),
          };
          retryFetchOptions.headers = {
            ...(retryFetchOptions.headers as Record<string, string>),
            "Content-Type": "application/json",
          };

          response = await fetch(noCacheUrl(url), retryFetchOptions);
          data = await safeJsonResponse(response);
        }
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: String(data.code || "cart_error"),
            message: String(data.message || "Cart operation failed."),
          },
        },
        { status: response.status }
      );
    }

    const newCartKey = data.cart_key ? (data.cart_key as string) : null;
    return createResponseWithCartKey({ success: true, cart: data }, newCartKey, refreshedToken, 200, market.code);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      },
      { status: 500 }
    );
  }
}
