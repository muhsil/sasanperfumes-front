"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface BrandData {
  id: number;
  slug: string;
  name: string;
  image: string;
  logo: string;
}

const brandsFetchPromise: Record<string, Promise<BrandData[]> | null> = {};

interface BrandsMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
}

export function BrandsMegaMenu({ isOpen, onClose, locale }: BrandsMegaMenuProps) {
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isRTL = locale === "ar";
  const marketPrefix = useMarketPrefix();

  const fetchBrands = useCallback(async () => {
    if (brandsFetchPromise[locale]) {
      try {
        const data = await brandsFetchPromise[locale];
        if (data) setBrands(data);
      } catch {
        // ignore
      }
      return;
    }
    setLoading(true);
    try {
      brandsFetchPromise[locale] = fetch(`/api/brands`).then((r) =>
        r.ok ? r.json() : []
      );
      const data = await brandsFetchPromise[locale];
      if (data) setBrands(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      brandsFetchPromise[locale] = null;
    }
  }, [locale]);

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBrands();
    }
  }, [isOpen, fetchBrands]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 border-t border-gray-100 bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-primary">
            {isRTL ? "العلامات التجارية" : "Our Brands"}
          </h3>
          <Link
            href={`${marketPrefix}/${locale}/brands`}
            className="text-xs font-medium text-brand-gold hover:underline"
            onClick={onClose}
          >
            {isRTL ? "عرض الكل" : "View All Brands"} →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex h-24 animate-pulse flex-col items-center justify-center rounded-2xl bg-gray-50/80 p-3"
              />
            ))}
          </div>
        ) : brands.length > 0 ? (
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`${marketPrefix}/${locale}/brands/${brand.slug}`}
                className="group flex flex-col items-center gap-2 transition-transform duration-200 hover:-translate-y-0.5"
                onClick={onClose}
              >
                {(brand.logo || brand.image) ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-full">
                    <Image
                      src={brand.logo || brand.image}
                      alt={decodeHtmlEntities(brand.name)}
                      fill
                      sizes="100px"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      style={{ objectPosition: "center" }}
                      unoptimized={shouldUseUnoptimizedImage(brand.logo || brand.image)}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-full bg-gray-50">
                    <span className="text-sm font-bold text-gray-400">{decodeHtmlEntities(brand.name).charAt(0)}</span>
                  </div>
                )}
                <span className="line-clamp-1 text-center text-[10px] font-medium leading-4 text-brand-primary/70 group-hover:text-brand-primary">
                  {decodeHtmlEntities(brand.name)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            {isRTL ? "لا توجد علامات تجارية" : "No brands available"}
          </p>
        )}
      </div>
    </div>
  );
}
