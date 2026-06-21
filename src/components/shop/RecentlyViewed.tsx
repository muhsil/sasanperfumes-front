"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { WCProductCard } from "./WCProductCard";
import { useRecentlyViewed } from "@/hooks";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/free-mode";

interface RecentlyViewedProps {
  currentProductId: number;
  locale: Locale;
  bundleProductSlugs?: string[];
  hiddenGiftProductIds?: number[];
}

export function RecentlyViewed({
  currentProductId,
  locale,
  bundleProductSlugs = [],
  hiddenGiftProductIds = [],
}: RecentlyViewedProps) {
  const isRTL = locale === "ar";
  const { getRecentlyViewedIds, addToRecentlyViewed, isLoaded } = useRecentlyViewed();
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (currentProductId) {
      addToRecentlyViewed(currentProductId);
    }
  }, [currentProductId, addToRecentlyViewed]);

  useEffect(() => {
    async function fetchProducts() {
      if (!isLoaded) return;

      const recentIds = getRecentlyViewedIds(currentProductId);
      
      if (recentIds.length === 0) {
        setProducts([]);
        setIsLoadingProducts(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/products?include=${encodeURIComponent(recentIds.join(","))}&per_page=${recentIds.length}&locale=${encodeURIComponent(locale)}`
        );
        const payload = response.ok ? await response.json() : { products: [] };
        const fetchedProducts = Array.isArray(payload.products) ? payload.products as WCProduct[] : [];
        const hiddenGiftIdsSet = new Set(hiddenGiftProductIds);
        const orderedProducts = recentIds
          .map((id) => fetchedProducts.find((p) => p.id === id))
          .filter((p): p is WCProduct => p !== undefined && !hiddenGiftIdsSet.has(p.id));
        setProducts(orderedProducts);
      } catch (error) {
        console.error("Failed to fetch recently viewed products:", error);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchProducts();
  }, [isLoaded, getRecentlyViewedIds, currentProductId, locale, hiddenGiftProductIds]);

  if (isLoadingProducts || products.length === 0) {
    return null;
  }

  return (
    <section className="lazy-section mb-16 mt-16 border-t border-brand-border/70 pb-6 pt-12 md:mb-20">
      <div className="mb-8 flex items-center justify-between px-4">
        <div>
          <h2 className="font-title text-3xl text-brand-primary">
            {isRTL ? "شوهدت مؤخراً" : "Recently Viewed"}
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            {isRTL ? "المنتجات التي شاهدتها مؤخراً" : "Products you recently viewed"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="recently-viewed-slider-prev rounded-full border border-brand-border/70 bg-brand-ivory p-2 text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.1)] transition-all hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isRTL ? "التالي" : "Previous"}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="recently-viewed-slider-next rounded-full border border-brand-border/70 bg-brand-ivory p-2 text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.1)] transition-all hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isRTL ? "السابق" : "Next"}
          >
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden px-4">
        <Swiper
          modules={[Navigation, FreeMode]}
          spaceBetween={16}
          slidesPerView={1.5}
          freeMode={{
            enabled: true,
            sticky: false,
            momentumRatio: 0.5,
            momentumVelocityRatio: 0.5,
          }}
          navigation={{
            prevEl: ".recently-viewed-slider-prev",
            nextEl: ".recently-viewed-slider-next",
          }}
          breakpoints={{
            480: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            640: {
              slidesPerView: 2.5,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 16,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 16,
            },
          }}
          className="recently-viewed-slider"
        >
          {products.slice(0, 8).map((product) => (
            <SwiperSlide key={product.id}>
              <WCProductCard product={product} locale={locale} bundleProductSlugs={bundleProductSlugs} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
