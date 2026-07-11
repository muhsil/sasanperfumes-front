import { NextRequest, NextResponse } from "next/server";
import { disableRuntimeCache } from "@/config/site";
import { isHiddenStorefrontCategory } from "@/config/categoryVisibility";
import { API_BASE, backendHeaders, extractMarketCode, safeJsonResponse, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import type { Locale } from "@/config/site";

export async function GET(request: NextRequest) {
  const locale = (request.nextUrl.searchParams.get("locale") as Locale) || undefined;
  const market = extractMarketCode(
    request.nextUrl.searchParams.get("market") ||
    request.headers.get("x-market") ||
    request.headers.get("referer")
  );
  const langQuery = locale ? `&lang=${locale}` : "";

  try {
    const apiBase = market ? wpJsonBaseForMarket(market) : `${API_BASE}/wp-json`;
    const url = `${apiBase}/wc/store/v1/products/categories?per_page=100${langQuery}`;
    const response = await fetch(url, {
      method: "GET",
      headers: backendHeaders(
        market
          ? {
              "X-Market": market,
              "X-Frontend-Host": `sasanperfumes.com/${market}`,
            }
          : undefined
      ),
      ...(disableRuntimeCache
        ? { cache: "no-store" as const }
        : { next: { revalidate: 600, tags: ["categories", `categories-${market || "intl"}-${locale || "default"}`] } }),
    });

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await safeJsonResponse(response);
    const categories = Array.isArray(data)
      ? data.filter((category) => !isHiddenStorefrontCategory(category))
      : [];

    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
