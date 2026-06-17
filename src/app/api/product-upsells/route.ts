import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UpsellResponse {
  product_id: number;
  upsell_ids: number[];
  cross_sell_ids: number[];
}

function parseIds(rawIds: string | null): number[] {
  if (!rawIds) {
    return [];
  }

  return rawIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function parseLocale(value: string | null): "en" | "ar" | null {
  if (value === "ar" || value === "en") {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get("ids") || searchParams.get("include");
  const locale = parseLocale(searchParams.get("locale")) || parseLocale(searchParams.get("lang"));

  if (!ids) {
    return NextResponse.json({ products: [] });
  }

  const productIds = parseIds(ids).slice(0, 12);
  if (productIds.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const consumerKey = process.env.WC_CONSUMER_KEY || process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET || process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    return NextResponse.json({ products: [] }, { status: 500 });
  }

  const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;

  const responses = await Promise.all(
    productIds.map(async (productId) => {
      const params = new URLSearchParams({ _fields: "upsell_ids,cross_sell_ids" });
      if (locale) params.set("lang", locale);

      const response = await fetch(
        `${siteConfig.apiUrl}/wp-json/wc/v3/products/${productId}?${params.toString()}`,
        {
          headers: {
            Authorization: authHeader,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      try {
        const payload = await response.json();
        return {
          product_id: productId,
          upsell_ids: Array.isArray(payload.upsell_ids) ? payload.upsell_ids : [],
          cross_sell_ids: Array.isArray(payload.cross_sell_ids) ? payload.cross_sell_ids : [],
        } as UpsellResponse;
      } catch {
        return null;
      }
    })
  );

  const products = responses.filter((item): item is UpsellResponse => item !== null);
  return NextResponse.json({ products }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
