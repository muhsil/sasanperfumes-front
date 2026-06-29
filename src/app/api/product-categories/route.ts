import { NextRequest, NextResponse } from "next/server";
import { disableRuntimeCache } from "@/config/site";
import { API_BASE, backendHeaders, noCacheUrl, safeJsonResponse } from "@/lib/utils/backendFetch";
import type { Locale } from "@/config/site";

interface StoreApiProduct {
  id: number;
  categories: Array<{ id: number; name: string; slug: string }>;
  brands?: Array<{ id: number; name: string; slug: string }>;
}

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const idsParamList = request.nextUrl.searchParams.getAll("ids[]");
  const locale = (request.nextUrl.searchParams.get("locale") as Locale) || (request.nextUrl.searchParams.get("lang") as Locale) || undefined;
  const requestedIds = Array.from(new Set((idsParam ? [idsParam] : idsParamList)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value && /^[0-9]+$/.test(value))));
  const include = requestedIds.join(",");

  if (!include) {
    return NextResponse.json({ categories: {}, categoryIds: {}, brands: {} });
  }

  const langQuery = locale ? `&lang=${locale}` : "";
  try {
    const url = `${API_BASE}/wp-json/wc/store/v1/products?include=${encodeURIComponent(include)}&per_page=100${langQuery}`;
    const response = await fetch(noCacheUrl(url), {
      method: "GET",
      headers: backendHeaders(),
    });

    if (!response.ok) {
      return NextResponse.json({ categories: {}, categoryIds: {}, brands: {} });
    }

    const data = await safeJsonResponse(response);
    const products = Array.isArray(data) ? (data as unknown as StoreApiProduct[]) : [];
    const categories: Record<number, string> = {};
    const categoryIds: Record<number, number[]> = {};
    const brands: Record<number, string> = {};

    for (const product of products) {
      if (product.categories?.[0]?.name) {
        categories[product.id] = product.categories[0].name;
      }
      if (Array.isArray(product.categories) && product.categories.length > 0) {
        categoryIds[product.id] = product.categories
          .map((category) => category.id)
          .filter((id) => Number.isFinite(id));
      }
      if (product.brands?.[0]?.name) {
        brands[product.id] = product.brands[0].name;
      }
    }

    return NextResponse.json({ categories, categoryIds, brands }, {
      headers: {
        "Cache-Control": disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({ categories: {}, categoryIds: {}, brands: {} });
  }
}
