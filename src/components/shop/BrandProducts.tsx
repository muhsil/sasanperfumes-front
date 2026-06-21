"use client";

import { useEffect, useState } from "react";
import { RelatedProducts } from "./RelatedProducts";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

interface BrandSliderSettings {
  enabled: boolean;
  title_en: string;
  title_ar: string;
  count: number;
  cols_desktop: number;
  cols_tablet: number;
  cols_mobile: number;
  fallback: string;
}

interface BrandProductsProps {
  brandName: string;
  brandSlug: string;
  currentProductId: number;
  locale: Locale;
  categorySlug?: string;
}

export function BrandProducts({ brandName, brandSlug, currentProductId, locale, categorySlug }: BrandProductsProps) {
  const marketPrefix = useMarketPrefix();
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [settings, setSettings] = useState<BrandSliderSettings | null>(null);
  const isRTL = locale === "ar";

  useEffect(() => {
    const params = new URLSearchParams({ lang: locale });
    if (marketPrefix) params.set("market", marketPrefix.slice(1));

    fetch(`/api/home-settings?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.brandSlider) setSettings(d.brandSlider);
      })
      .catch(() => {});
  }, [locale, marketPrefix]);

  useEffect(() => {
    if (settings && !settings.enabled) return;

    const count = settings?.count ?? 12;

    if (brandSlug) {
      fetch(`/api/products?brand=${encodeURIComponent(brandSlug)}&per_page=${count}&locale=${locale}`)
        .then((r) => r.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : data.products || [];
          const filtered = items.filter((p: WCProduct) => p.id !== currentProductId);
          if (filtered.length > 0) {
            setProducts(filtered);
          } else if (settings?.fallback === "category" && categorySlug) {
            fetchCategoryFallback(count);
          }
        })
        .catch(() => {});
    } else if (categorySlug) {
      fetchCategoryFallback(settings?.count ?? 12);
    }

    function fetchCategoryFallback(ct: number) {
      fetch(`/api/products?category=${encodeURIComponent(categorySlug!)}&per_page=${ct}&locale=${locale}`)
        .then((r) => r.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : data.products || [];
          setProducts(items.filter((p: WCProduct) => p.id !== currentProductId));
        })
        .catch(() => {});
    }
  }, [brandSlug, currentProductId, locale, settings, categorySlug]);

  if (settings && !settings.enabled) return null;
  if (products.length === 0) return null;

  const titleTemplate = isRTL ? (settings?.title_ar || "المزيد من {brand}") : (settings?.title_en || "More from {brand}");
  const title = titleTemplate.replace("{brand}", brandName || "");

  return (
    <RelatedProducts
      products={products}
      currentProductId={currentProductId}
      locale={locale}
      title={title}
      subtitle={isRTL ? "منتجات من نفس العلامة التجارية" : "Products from the same brand"}
    />
  );
}
