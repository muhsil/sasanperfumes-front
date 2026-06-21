import { NextRequest, NextResponse } from "next/server";
import { fetchMarketProductsRest } from "@/lib/api/marketProductsRest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const MARKET_CODES = new Set(["qa", "om", "sa"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const market = params.get("market")?.toLowerCase() || "";

  if (!MARKET_CODES.has(market)) {
    return NextResponse.json({ products: [], total: 0, totalPages: 0 }, { status: 400 });
  }

  const include = params.get("include");
  const result = await fetchMarketProductsRest({
    page: params.get("page") ? Number(params.get("page")) : undefined,
    per_page: params.get("per_page") ? Number(params.get("per_page")) : undefined,
    search: params.get("search") || undefined,
    slug: params.get("slug") || undefined,
    orderby: params.get("orderby") || undefined,
    order: (params.get("order") as "asc" | "desc") || undefined,
    include: include ? include.split(",").map((id) => Number(id)).filter(Number.isFinite) : undefined,
    lang: params.get("lang") || undefined,
  }, market);

  return NextResponse.json(
    {
      products: result.products,
      total: result.total,
      totalPages: result.totalPages,
    },
    {
      status: result.status && result.status >= 400 ? result.status : 200,
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        "Pragma": "no-cache",
      },
    }
  );
}
