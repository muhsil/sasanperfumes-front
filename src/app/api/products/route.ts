import { NextRequest, NextResponse } from "next/server";
import { getFeaturedProducts, getProducts } from "@/lib/api/woocommerce";
import { getMarketByHost, normalizeMarketHost } from "@/config/market";
import type { Locale } from "@/config/site";
import type { WCProduct, WCProductLightweight } from "@/types/woocommerce";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRODUCTS_CACHE_TTL = 60 * 1000;
interface CachedProducts {
  data: { products: WCProduct[]; total: number; totalPages: number };
  timestamp: number;
}
const productsCache = new Map<string, CachedProducts>();

/**
 * Transform a full WCProduct into a lightweight version
 * This significantly reduces payload size for product listings
 * by only including fields needed for ProductCard/ProductListCard
 */
function toProductLightweight(product: WCProduct): WCProductLightweight {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: product.permalink,
    short_description: product.short_description,
    on_sale: product.on_sale,
    type: product.type,
    has_options: product.has_options,
    prices: {
      price: product.prices.price,
      regular_price: product.prices.regular_price,
      sale_price: product.prices.sale_price,
      currency_code: product.prices.currency_code,
      currency_symbol: product.prices.currency_symbol,
      currency_minor_unit: product.prices.currency_minor_unit,
      currency_decimal_separator: product.prices.currency_decimal_separator,
      currency_thousand_separator: product.prices.currency_thousand_separator,
      currency_prefix: product.prices.currency_prefix,
      currency_suffix: product.prices.currency_suffix,
      price_range: product.prices.price_range ?? null,
    },
    images: product.images.slice(0, 1).map((img) => ({
      id: img.id,
      src: img.src,
      thumbnail: img.thumbnail,
      srcset: img.srcset,
      sizes: img.sizes,
      name: img.name,
      alt: img.alt,
    })),
    categories: product.categories.slice(0, 1).map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      link: cat.link,
    })),
    tags: (product.tags || []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })),
    brands: (product.brands || []).map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
    })),
    attributes: (product.attributes || []).map((attr) => ({
      id: attr.id,
      name: attr.name,
      taxonomy: attr.taxonomy,
      has_variations: attr.has_variations,
      terms: attr.terms.map((term) => ({
        id: term.id,
        name: term.name,
        slug: term.slug,
      })),
    })),
    variations: [],
    average_rating: product.average_rating || "0",
    review_count: product.review_count || 0,
    is_in_stock: product.is_in_stock,
    is_purchasable: product.is_purchasable,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const frontendHost = normalizeMarketHost(
    request.headers.get("x-frontend-host") ||
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host")
  );
  const market = getMarketByHost(frontendHost);
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const per_page = parseInt(searchParams.get("per_page") || "12", 10);
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const orderby = searchParams.get("orderby") || undefined;
  const order = (searchParams.get("order") as "asc" | "desc") || undefined;
  const locale = (searchParams.get("locale") as Locale) || (searchParams.get("lang") as Locale) || undefined;
  const lightweight = searchParams.get("lightweight") === "true";
  const brand = searchParams.get("brand") || undefined;
  const featured = searchParams.get("featured") === "true";
  const includeQuery = searchParams.get("include");
  const includeList = searchParams.getAll("include[]");
  const includeValues = includeQuery
    ? includeQuery.split(",").map((id) => id.trim()).filter(Boolean)
    : includeList.flatMap((entry) => entry.split(",")).map((id) => id.trim()).filter(Boolean);
  const include = includeValues.length > 0
    ? includeValues.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id))
    : [];

  try {
    const cacheKey = JSON.stringify({
      page,
      per_page,
      category,
      search,
      orderby,
      order,
      locale,
      brand,
      featured,
      include: includeValues,
      frontendHost,
    });
    const cached = productsCache.get(cacheKey);
    let result: { products: WCProduct[]; total: number; totalPages: number };

    if (cached && Date.now() - cached.timestamp < PRODUCTS_CACHE_TTL) {
      result = cached.data;
    } else {
      if (featured) {
        result = await getFeaturedProducts({
          page,
          per_page,
          locale,
          currency: market.defaultCurrency,
          frontendHost,
        });
      } else {
        result = await getProducts({
          page,
          per_page: brand ? 100 : per_page,
          category,
          search,
          orderby,
          order,
          include: include.length > 0 ? include : undefined,
          locale,
          currency: market.defaultCurrency,
          frontendHost,
        });
      }

      // Client-side brand filtering (Store API doesn't support brand param)
      if (brand) {
        const brandSlugLower = brand.toLowerCase();
        result.products = result.products.filter(
          (p) => p.brands?.some((b) => b.slug.toLowerCase() === brandSlugLower)
        );
        result.total = result.products.length;
        result.totalPages = 1;
        result.products = result.products.slice(0, per_page);
      }

      productsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    const response = lightweight
      ? {
          products: result.products.map(toProductLightweight),
          total: result.total,
          totalPages: result.totalPages,
        }
      : result;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Vary": "Host, X-Frontend-Host",
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
