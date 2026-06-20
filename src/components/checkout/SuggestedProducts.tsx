"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { Button } from "@/components/common/Button";
import { decodeHtmlEntities } from "@/lib/utils";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface Product {
  id: number;
  name: string;
  slug: string;
  image: string;
  price: number;
  regularPrice: number;
  onSale: boolean;
  currencyMinorUnit: number;
}

interface UpsellSuggestion {
  cross_sell_ids?: number[];
  upsell_ids?: number[];
}

function normalizeProduct(raw: Record<string, unknown>): Product | null {
  if (!raw || !raw.id) return null;
  const prices = raw.prices as Record<string, unknown> | undefined;
  const images = raw.images as { src: string }[] | undefined;
  const minorUnit = Number(prices?.currency_minor_unit ?? 2);
  const divisor = Math.pow(10, minorUnit);
  const price = Number(prices?.price ?? 0) / divisor;
  const regularPrice = Number(prices?.regular_price ?? prices?.price ?? 0) / divisor;
  if (isNaN(price) || price === 0) return null;
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    image: images?.[0]?.src ?? "",
    price,
    regularPrice,
    onSale: Boolean(raw.on_sale),
    currencyMinorUnit: minorUnit,
  };
}

export function SuggestedProducts({
  cartItemIds,
  locale,
  isRTL,
}: {
  cartItemIds: number[];
  locale: string;
  isRTL: boolean;
}) {
  const marketPrefix = useMarketPrefix();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestedProducts = async () => {
      if (cartItemIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const ids = cartItemIds.slice(0, 3);
        const response = await fetch(`/api/product-upsells?ids=${ids.join(",")}&locale=${locale}`);
        const parsed = await response.json();
        const responses = (parsed?.products as UpsellSuggestion[] | undefined) || [];

        const allSuggestedIds = new Set<number>();
        responses.forEach((data) => {
          data.cross_sell_ids?.forEach((id: number) => allSuggestedIds.add(id));
          data.upsell_ids?.forEach((id: number) => allSuggestedIds.add(id));
        });

        const suggestedIds = Array.from(allSuggestedIds).slice(0, 4);

        // If no cross-sell/upsell products, fetch featured products as fallback
        if (suggestedIds.length === 0) {
          try {
            const featuredRes = await fetch(`/api/products?featured=true&per_page=4&locale=${locale}`);
            const featuredData = await featuredRes.json();
            if (featuredData.products && featuredData.products.length > 0) {
              const normalized = featuredData.products.map(normalizeProduct).filter(Boolean) as Product[];
              setProducts(normalized.slice(0, 4));
            }
          } catch (error) {
            console.error("Failed to fetch featured products fallback:", error);
          }
          setIsLoading(false);
          return;
        }

        const productRes = await fetch(
          `/api/products?include=${suggestedIds.join(",")}&locale=${locale}`
        );
        const productData = await productRes.json();

        if (productData.products) {
          const normalized = productData.products.map(normalizeProduct).filter(Boolean) as Product[];
          setProducts(normalized.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch suggested products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestedProducts();
  }, [cartItemIds, locale]);

  if (isLoading || products.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-100 py-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        {isRTL ? "منتجات قد تعجبك" : "You Might Like"}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col">
            <Link
              href={`${marketPrefix}/${locale}/product/${product.slug}`}
              className="relative mb-2 aspect-square overflow-hidden bg-gray-100"
            >
              {product.image ? (
                <Image
                  src={product.image}
                  alt={decodeHtmlEntities(product.name)}
                  fill
                  sizes="150px"
                  className="object-cover hover:scale-105 transition-transform"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </Link>
            <Link
              href={`${marketPrefix}/${locale}/product/${product.slug}`}
              className="mb-2 line-clamp-2 text-xs font-medium text-gray-900 hover:text-gray-700"
            >
              {decodeHtmlEntities(product.name)}
            </Link>
            <div className="mb-2 flex flex-col gap-0.5">
              {product.onSale && product.regularPrice > product.price ? (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    <FormattedPrice
                      price={product.regularPrice}
                      iconSize="xs"
                    />
                  </span>
                  <FormattedPrice
                    price={product.price}
                    className="text-sm font-semibold text-gray-900"
                    iconSize="xs"
                  />
                </>
              ) : (
                <FormattedPrice
                  price={product.price}
                  className="text-sm font-semibold text-gray-900"
                  iconSize="xs"
                />
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              asChild
            >
              <Link href={`${marketPrefix}/${locale}/product/${product.slug}`}>
                {isRTL ? "عرض" : "View"}
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
