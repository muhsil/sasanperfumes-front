import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// An empty code is the base/UAE store; the others are the market blogs.
const MARKET_CODES = new Set(["", "qa", "om", "sa"]);
const MAX_ITEMS = 50;
const LOOKUP_TIMEOUT_MS = 8000;

interface ResolvedItem {
  slug: string;
  sku: string | null;
  qty: number;
  productId: number | null;
  name: string | null;
}

// Resolution goes through the public Store API on the destination blog's own
// wp-json base. Two earlier approaches were wrong in opposite directions:
// getProductBySlug falls back through the base catalogue, so a market lookup
// returned base-store IDs for products that market does not stock, and
// fetchMarketProductsRest needs WooCommerce consumer credentials and returns
// nothing without them. The Store API needs no credentials, is scoped strictly
// to the blog in the URL, and has no fallback — a missing slug is simply an
// empty array, which is exactly the "not stocked here" answer we want.
// Built explicitly rather than through a helper: the market blog is a path
// segment on the CMS host, and this must not be rewritten or fall back to the
// network's main site.
function storeApiBase(market: string): string {
  const origin = siteConfig.apiUrl.replace(/\/+$/, "");
  return market ? `${origin}/${market}/wp-json` : `${origin}/wp-json`;
}

async function resolveOnBlog(slug: string, market: string): Promise<{ id: number; name: string | null } | null> {
  const url = `${storeApiBase(market)}/wc/store/v1/products?slug=${encodeURIComponent(slug)}&per_page=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;
    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) return null;
    const id = Number(products[0]?.id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { id, name: typeof products[0]?.name === "string" ? products[0].name : null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Resolves cart items against a different market's catalogue. Product IDs are
// blog-local in WordPress multisite and the market catalogues are not in parity,
// so a cart moved between stores has to be rebuilt from slugs. Items with no
// counterpart in the destination are reported rather than dropped silently, so
// the customer can be told what is unavailable in their market.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const market = typeof body?.market === "string" ? body.market.replace(/^\/+/, "").toLowerCase() : "";
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
      if (!slug) return { slug, sku, qty, productId: null, name: null };

      const hit = await resolveOnBlog(slug, market);
      return hit
        ? { slug, sku, qty, productId: hit.id, name: hit.name }
        : { slug, sku, qty, productId: null, name: null };
    })
  );

  return NextResponse.json(
    { market, base: storeApiBase(market), resolved },
    { headers: { "Cache-Control": "no-store" } }
  );
}
