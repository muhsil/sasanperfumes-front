import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/config/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Store API response for a single variation product
interface StoreVariation {
  id: number;
  attributes: { name: string; value: string }[];
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
  };
  on_sale: boolean;
  is_in_stock: boolean;
  is_on_backorder: boolean;
  is_purchasable: boolean;
  low_stock_remaining: number | null;
  stock_availability: { text: string; class: string };
  images: { id: number; src: string; alt: string }[];
  sku: string;
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("product_id");
  if (!productId) return NextResponse.json([]);
  const locale = (request.nextUrl.searchParams.get("locale") as Locale) || (request.nextUrl.searchParams.get("lang") as Locale);

  const localeQuery = locale ? `?lang=${locale}` : "";

  try {
    // First get the parent product to find variation IDs
    const parentUrl = `${siteConfig.apiUrl}/wp-json/wc/store/v1/products/${productId}${localeQuery}`;
    const parentRes = await fetch(parentUrl, { cache: "no-store" });
    if (!parentRes.ok) return NextResponse.json([]);
    
    const parent = await parentRes.json();
    const parentVariations: { id: number; attributes: { name: string; value: string }[] }[] = parent.variations || [];
    const variationIds: number[] = parentVariations.map((v) => v.id);
    
    if (variationIds.length === 0) return NextResponse.json([]);

    // Build a lookup of variation attributes from the parent product
    const attrLookup = new Map<number, { name: string; value: string }[]>();
    for (const pv of parentVariations) {
      attrLookup.set(pv.id, pv.attributes || []);
    }

    // Fetch each variation's full data from the Store API in parallel
    const variationPromises = variationIds.map(async (varId) => {
      try {
        const varUrl = `${siteConfig.apiUrl}/wp-json/wc/store/v1/products/${varId}${localeQuery}`;
        const res = await fetch(varUrl, { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json() as StoreVariation;
      } catch {
        return null;
      }
    });

    const variations = (await Promise.all(variationPromises)).filter(Boolean) as StoreVariation[];

    return NextResponse.json(
      variations.map((v) => {
        const stockStatus = v.is_on_backorder
          ? "onbackorder"
          : v.is_in_stock
          ? "instock"
          : "outofstock";

        return {
          id: v.id,
          attributes: (attrLookup.get(v.id) || v.attributes || []).map((a) => ({
            name: a.name,
            value: a.value || "",
          })),
          prices: v.prices,
          price: v.prices?.price || "",
          regular_price: v.prices?.regular_price || "",
          sale_price: v.prices?.sale_price || "",
          on_sale: v.on_sale || false,
          stock_status: stockStatus,
          stock_quantity: null,
          low_stock_remaining: v.low_stock_remaining,
          purchasable: v.is_purchasable || false,
          image: v.images?.[0]
            ? { src: v.images[0].src || "", alt: v.images[0].alt || "" }
            : undefined,
          sku: v.sku || "",
        };
      })
    );
  } catch (error) {
    console.error(`Failed to fetch variations for product ${productId}:`, error);
    return NextResponse.json([]);
  }
}
