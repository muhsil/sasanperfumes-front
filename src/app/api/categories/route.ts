import { NextRequest, NextResponse } from "next/server";
import { disableRuntimeCache } from "@/config/site";
import { API_BASE, backendHeaders, noCacheUrl, safeJsonResponse } from "@/lib/utils/backendFetch";
import type { Locale } from "@/config/site";

export async function GET(request: NextRequest) {
  const locale = (request.nextUrl.searchParams.get("locale") as Locale) || undefined;
  const langQuery = locale ? `&lang=${locale}` : "";

  try {
    const url = `${API_BASE}/wp-json/wc/store/v1/products/categories?per_page=100${langQuery}`;
    const response = await fetch(noCacheUrl(url), {
      method: "GET",
      headers: backendHeaders(),
    });

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await safeJsonResponse(response);
    return NextResponse.json(Array.isArray(data) ? data : [], {
      headers: {
        "Cache-Control": disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
