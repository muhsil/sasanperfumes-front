import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { API_BASE, backendHeaders, noCacheUrl, parseBackendJson } from "@/lib/utils/backendFetch";
import { normalizeMarketHost } from "@/config/market";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get("currency");
    const locale = searchParams.get("locale");
    const frontendHost = normalizeMarketHost(
      request.headers.get("x-frontend-host") ||
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host")
    );

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
      return NextResponse.json(responseData, {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    const text = await response.text();
    let data: Record<string, unknown>;
    try {
      data = parseBackendJson<Record<string, unknown>>(text);
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

    return NextResponse.json(responseData, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        rules: [],
        warning: error instanceof Error ? error.message : "Network error occurred",
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }
}
