import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { API_BASE, backendHeaders, noCacheUrl } from "@/lib/utils/backendFetch";
import { normalizeMarketHost } from "@/config/market";
import { getFrontendHostFromRequestHeaders } from "@/lib/market/server";

const FREE_GIFTS_CACHE_TTL = 5 * 60 * 1000;
interface CachedRules {
  data: { success: boolean; rules: unknown[] };
  timestamp: number;
}
const rulesCache = new Map<string, CachedRules>();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get("currency");
    const locale = searchParams.get("locale");
    const frontendHost = normalizeMarketHost(getFrontendHostFromRequestHeaders(request.headers));

    const cacheKey = `${frontendHost || "default"}_${currency || ""}_${locale || ""}`;
    const cached = rulesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FREE_GIFTS_CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
        },
      });
    }

    let url = `${API_BASE}/wp-json/sasanperfumes-free-gifts/v1/rules`;
    const params: string[] = [];
    if (currency) {
      params.push(`currency=${encodeURIComponent(currency)}`);
    }
    if (locale) {
      params.push(`lang=${encodeURIComponent(locale)}`);
    }
    if (frontendHost) {
      params.push(`frontend_host=${encodeURIComponent(frontendHost)}`);
    }
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    const response = await fetch(noCacheUrl(url), {
      method: "GET",
      headers: backendHeaders(),
    });

    if (!response.ok) {
      const responseData = {
        success: true,
        rules: [],
        warning: `Free gift rules endpoint returned ${response.status}`,
      };
      rulesCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
      return NextResponse.json(responseData, {
        status: 200,
        headers: {
        },
      });
    }

    const text = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_response",
            message: "Backend returned non-JSON response. If using LiteSpeed Cache, exclude /wp-json/* paths from caching.",
          },
        },
        { status: 502 }
      );
    }

    const responseData = { success: true, rules: (data.rules as unknown[]) || [] };
    rulesCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData, {
      headers: {
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        rules: [],
        warning: error instanceof Error ? error.message : "Network error occurred",
      },
      { status: 200 }
    );
  }
}
