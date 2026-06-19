"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { WCProductCard } from "./WCProductCard";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/free-mode";

interface RelatedProductsProps {
  products: WCProduct[];
  currentProductId: number;
  locale: Locale;
  className?: string;
  bundleProductSlugs?: string[];
  title?: string;
  subtitle?: string;
}

export function RelatedProducts({
  products,
  currentProductId,
  locale,
  className,
  bundleProductSlugs = [],
  title,
  subtitle,
}: RelatedProductsProps) {
  const isRTL = locale === "ar";

  const filteredProducts = products.filter((p) => p.id !== currentProductId);

  if (filteredProducts.length === 0) {
    return null;
  }

  return (
    <section className={cn("lazy-section border-t border-brand-border/70 pt-8", className)}>
      <div className="mb-6 flex items-center justify-between px-4">
        <div>
          <h2 className="font-title text-3xl text-brand-primary">
            {title || (isRTL ? "منتجات ذات صلة" : "Related Products")}
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            {subtitle || (isRTL ? "قد يعجبك أيضاً" : "You may also like")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="related-slider-prev rounded-full border border-brand-border/70 bg-brand-ivory p-2 text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.1)] transition-all hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isRTL ? "التالي" : "Previous"}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="related-slider-next rounded-full border border-brand-border/70 bg-brand-ivory p-2 text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.1)] transition-all hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
            prevEl: ".related-slider-prev",
            nextEl: ".related-slider-next",
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
          className="related-products-slider"
        >
          {filteredProducts.slice(0, 8).map((product) => (
            <SwiperSlide key={product.id}>
              <WCProductCard product={product} locale={locale} bundleProductSlugs={bundleProductSlugs} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
