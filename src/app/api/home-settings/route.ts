import { NextRequest, NextResponse } from "next/server";
import { normalizeMarketHost } from "@/config/market";
import {
  API_BASE,
  backendHeaders,
  extractMarketCode,
  fetchBackend,
  safeJsonResponse,
  wpJsonBaseForMarket,
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

function fallbackResponse() {
  return NextResponse.json(fallbackHomeSettings, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Vary": "Host, X-Frontend-Host",
    },
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
  const market = extractMarketCode(queryMarket) || extractMarketCode(frontendHost) || extractMarketCode(explicitMarket);
  const locale = request.nextUrl.searchParams.get("lang") || request.nextUrl.searchParams.get("locale") || "";
  const withLocale = (endpoint: string) => locale
    ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}lang=${encodeURIComponent(locale)}`
    : endpoint;
  const fallbackEndpoint = withLocale(
    `${API_BASE}/wp-json/sasanperfumes/v1/home-settings${frontendHost ? `?frontend_host=${encodeURIComponent(frontendHost)}` : ""}`
  );
  const homeSettingsEndpoints = market
    ? [
        withLocale(`${wpJsonBaseForMarket(market)}/sasanperfumes/v1/home-settings`),
        fallbackEndpoint,
      ]
    : [fallbackEndpoint];
  const headers = market ? backendHeaders({ "x-market": market }) : backendHeaders();

  try {
    for (const endpoint of homeSettingsEndpoints) {
      const response = await fetchBackend(endpoint, {
        headers,
      });
      const data = await safeJsonResponse(response);

      if (response.ok) {
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "no-store, max-age=0",
            "Vary": "Host, X-Frontend-Host",
          },
        });
      }

      if (data.code === "invalid_response") {
        const retry = await fetchBackend(endpoint);
        const retryData = await safeJsonResponse(retry);
        if (retry.ok) {
          return NextResponse.json(retryData, {
            headers: {
              "Cache-Control": "no-store, max-age=0",
              "Vary": "Host, X-Frontend-Host",
            },
          });
        }
      }
    }

    return fallbackResponse();
  } catch (error) {
    console.warn("Home settings fallback used:", error instanceof Error ? error.message : error);
    return fallbackResponse();
  }
}
