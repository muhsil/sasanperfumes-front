import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/api/woocommerce";
import { fetchMarketProductsRest } from "@/lib/api/marketProductsRest";
import { getMarketDefaultCurrency } from "@/config/market";
import type { Locale } from "@/config/site";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// An empty code is the base/UAE store; the others are the market blogs.
const MARKET_CODES = new Set(["", "qa", "om", "sa"]);
const MAX_ITEMS = 50;

interface ResolvedItem {
  slug: string;
  sku: string | null;
  qty: number;
  productId: number | null;
  name: string | null;
}

// Market blogs must be queried through the market-scoped REST helper.
// getProductBySlug falls back through the base catalogue when a slug is missing
// on the requested host, which silently returned base-store product IDs for
// products the market does not stock — exactly the cross-blog ID mix-up this
// endpoint exists to prevent. fetchMarketProductsRest is pinned to the market's
// own wp-json base and has no such fallback.
async function resolveInMarket(slug: string, market: string): Promise<{ id: number; name: string | null } | null> {
  const result = await fetchMarketProductsRest({ slug, per_page: 1 }, market);
  const product = result.products?.[0] as { id?: unknown; name?: unknown } | undefined;
  const id = Number(product?.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { id, name: typeof product?.name === "string" ? product.name : null };
}

async function resolveInBaseStore(
  slug: string,
  locale: Locale
): Promise<{ id: number; name: string | null } | null> {
  const product = await getProductBySlug(
    slug,
    locale,
    getMarketDefaultCurrency("intl"),
    "sasanperfumes.com"
  );
  if (!product?.id) return null;
  return { id: product.id, name: product.name ?? null };
}

// Resolves cart items against a different market's catalogue. Product IDs are
// blog-local in WordPress multisite and the market catalogues are not in parity,
// so a cart moved between stores has to be rebuilt from slugs. Items with no
// counterpart in the destination are reported rather than dropped silently, so
// the customer can be told what is unavailable in their market.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const market = typeof body?.market === "string" ? body.market.replace(/^\/+/, "").toLowerCase() : "";
  const locale: Locale = body?.locale === "ar" ? "ar" : "en";
  const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];

  if (!MARKET_CODES.has(market)) {
    return NextResponse.json({ error: "unknown_market" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ market, resolved: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const resolved: ResolvedItem[] = await Promise.all(
    items.map(async (item: { slug?: unknown; sku?: unknown; qty?: unknown }): Promise<ResolvedItem> => {
      const slug = typeof item.slug === "string" ? item.slug : "";
      const sku = typeof item.sku === "string" ? item.sku : null;
      const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
      const miss: ResolvedItem = { slug, sku, qty, productId: null, name: null };
      if (!slug) return miss;

      try {
        const hit = market ? await resolveInMarket(slug, market) : await resolveInBaseStore(slug, locale);
        if (!hit) return miss;
        return { slug, sku, qty, productId: hit.id, name: hit.name };
      } catch {
        return miss;
      }
    })
  );

  return NextResponse.json({ market, resolved }, { headers: { "Cache-Control": "no-store" } });
}
