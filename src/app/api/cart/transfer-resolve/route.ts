import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/api/woocommerce";
import { getMarketDefaultCurrency } from "@/config/market";
import type { Locale } from "@/config/site";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// An empty code is the base/UAE store; the others are the market blogs.
const MARKET_CODES = new Set(["", "qa", "om", "sa"]);
const MAX_ITEMS = 50;

function frontendHostForMarket(market: string): string {
  return market ? `sasanperfumes.com/${market}` : "sasanperfumes.com";
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

  const currency = getMarketDefaultCurrency(market || "intl");
  const frontendHost = frontendHostForMarket(market);

  const resolved = await Promise.all(
    items.map(async (item: { slug?: unknown; sku?: unknown; qty?: unknown }) => {
      const slug = typeof item.slug === "string" ? item.slug : "";
      const sku = typeof item.sku === "string" ? item.sku : null;
      const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
      if (!slug) {
        return { slug, sku, qty, productId: null, name: null };
      }
      try {
        const product = await getProductBySlug(slug, locale, currency, frontendHost);
        return {
          slug,
          sku,
          qty,
          productId: product?.id ?? null,
          name: product?.name ?? null,
        };
      } catch {
        return { slug, sku, qty, productId: null, name: null };
      }
    })
  );

  return NextResponse.json({ market, resolved }, { headers: { "Cache-Control": "no-store" } });
}
