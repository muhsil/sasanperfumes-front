import { NextRequest, NextResponse } from "next/server";
import { normalizeMarketHost } from "@/config/market";
import { siteConfig } from "@/config/site";
import {
  API_BASE,
  backendHeaders,
  fetchBackend,
  safeJsonResponse,
} from "@/lib/utils/backendFetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackHomeSettings = {
  hero: null,
  newProducts: null,
  bestseller: null,
  categories: null,
  featured: null,
  collections: null,
  banners: null,
  brandSlider: {
    enabled: false,
  },
};

const MARKET_CODES = new Set(["qa", "om", "sa"]);

function extractRouteMarket(value?: string | null): string {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "";

  if (MARKET_CODES.has(normalized)) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    const firstPath = parsed.pathname.split("/").filter(Boolean)[0] || "";
    return MARKET_CODES.has(firstPath) ? firstPath : "";
  } catch {
    const segments = normalized.replace(/^https?:\/\//, "").split("/").filter(Boolean);
    const market = segments.find((segment) => MARKET_CODES.has(segment));
    return market || "";
  }
}

function wpJsonBaseForRouteMarket(market: string): string {
  const parsed = new URL(API_BASE.replace(/\/+$/, ""));
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments[0] !== market) {
    parsed.pathname = `/${[market, ...segments].join("/")}`;
  }
  return `${parsed.toString().replace(/\/+$/, "")}/wp-json`;
}

function publicFrontendHostName(): string {
  try {
    return new URL(siteConfig.url).hostname;
  } catch {
    return "sasanperfumes.com";
  }
}

function cmsFrontendHostForMarket(market?: string): string {
  return market && MARKET_CODES.has(market) ? `${market}.${publicFrontendHostName()}` : "";
}

function responseHeaders(market?: string) {
  const cmsFrontendHost = cmsFrontendHostForMarket(market);
  return {
    "Cache-Control": "no-store, max-age=0",
    "Vary": "Host, X-Frontend-Host, X-Market",
    "X-SasanPerfumes-Market-Routing": "v3",
    "X-SasanPerfumes-Market": market || "intl",
    ...(cmsFrontendHost ? { "X-SasanPerfumes-Cms-Frontend-Host": cmsFrontendHost } : {}),
  };
}

function fallbackResponse(market?: string) {
  return NextResponse.json(fallbackHomeSettings, {
    headers: responseHeaders(market),
  });
}

export async function GET(request: NextRequest) {
  const frontendHost = normalizeMarketHost(
    request.headers.get("x-frontend-host") ||
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host")
  );
  const queryMarket = request.nextUrl.searchParams.get("market")?.toLowerCase();
  const explicitMarket = request.headers.get("x-market")?.toLowerCase();
  const market =
    extractRouteMarket(queryMarket) ||
    extractRouteMarket(explicitMarket) ||
    extractRouteMarket(frontendHost);
  const locale = request.nextUrl.searchParams.get("lang") || request.nextUrl.searchParams.get("locale") || "";
  const withParam = (endpoint: string, key: string, value: string) =>
    `${endpoint}${endpoint.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
  const withLocale = (endpoint: string) => locale
    ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}lang=${encodeURIComponent(locale)}`
    : endpoint;
  const cmsFrontendHost = cmsFrontendHostForMarket(market);
  const marketFallbackEndpoint = withLocale(
    `${API_BASE}/wp-json/sasanperfumes/v1/home-settings`
  );
  const fallbackEndpoint = withLocale(
    `${API_BASE}/wp-json/sasanperfumes/v1/home-settings${frontendHost ? `?frontend_host=${encodeURIComponent(frontendHost)}` : ""}`
  );
  const homeSettingsEndpoints = market
    ? [
        withParam(marketFallbackEndpoint, "_market_cache_bust", `${market}-${Date.now()}`),
        withLocale(
          withParam(
            `${wpJsonBaseForRouteMarket(market)}/sasanperfumes/v1/home-settings`,
            "_market_cache_bust",
            `${market}-${Date.now()}`
          )
        ),
        fallbackEndpoint,
      ]
    : [fallbackEndpoint];
  const headers = backendHeaders({
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    ...(market && cmsFrontendHost ? { "X-Frontend-Host": cmsFrontendHost, "X-Market": market } : {}),
  });

  try {
    for (const endpoint of homeSettingsEndpoints) {
      const response = await fetchBackend(endpoint, {
        headers,
      });
      const data = await safeJsonResponse(response);

      if (response.ok) {
        return NextResponse.json(data, {
          headers: responseHeaders(market),
        });
      }

      if (data.code === "invalid_response") {
        const retry = await fetchBackend(endpoint);
        const retryData = await safeJsonResponse(retry);
        if (retry.ok) {
          return NextResponse.json(retryData, {
            headers: responseHeaders(market),
          });
        }
      }
    }

    return fallbackResponse(market);
  } catch (error) {
    console.warn("Home settings fallback used:", error instanceof Error ? error.message : error);
    return fallbackResponse(market);
  }
}
