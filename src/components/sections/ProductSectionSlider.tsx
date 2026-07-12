"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import { WCProductCard } from "@/components/shop/WCProductCard";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

import "swiper/css";
import "swiper/css/navigation";

export interface ProductSectionSliderProps {
  products: WCProduct[];
  locale: Locale;
  isRTL?: boolean;
  cols: { desktop: number; tablet: number; mobile: number };
  autoplay?: boolean;
  autoplayDelay?: number;
  sliderNavPrefix: string;
  bundleProductSlugs?: string[];
  englishProductSlugs?: Record<number, string>;
}

export function ProductSectionSlider({
  products,
  locale,
  isRTL = false,
  cols,
  autoplay = false,
  autoplayDelay = 4000,
  sliderNavPrefix,
  bundleProductSlugs = [],
  englishProductSlugs = {},
}: ProductSectionSliderProps) {
  const showNavigation = products.length > cols.mobile;

  return (
    <div className="relative product-section-slider section-shell">
      <Swiper
        modules={[Autoplay, Navigation]}
        spaceBetween={16}
        slidesPerView={cols.mobile}
        loop={autoplay && products.length > cols.desktop}
        autoplay={
          autoplay
            ? {
                delay: autoplayDelay,
                disableOnInteraction: false,
              }
            : false
        }
        navigation={{
          prevEl: `.product-slider-prev-${sliderNavPrefix}`,
          nextEl: `.product-slider-next-${sliderNavPrefix}`,
        }}
        breakpoints={{
          640: { slidesPerView: cols.tablet, spaceBetween: 16 },
          768: { slidesPerView: cols.tablet, spaceBetween: 16 },
          1024: { slidesPerView: cols.desktop, spaceBetween: 16 },
          1280: { slidesPerView: cols.desktop, spaceBetween: 16 },
        }}
        className=""
        dir={isRTL ? "rtl" : "ltr"}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <WCProductCard
              product={product}
              locale={locale}
              bundleProductSlugs={bundleProductSlugs}
              englishSlug={englishProductSlugs[product.id]}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {showNavigation && (
        <>
          <button
            type="button"
            className={`product-slider-prev-${sliderNavPrefix} absolute ${isRTL ? "right-0" : "left-0"} top-[32%] z-10 hidden h-10 w-10 -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.12)] transition-colors hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white disabled:opacity-50 md:flex`}
            aria-label="Previous"
          >
            <ChevronLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            className={`product-slider-next-${sliderNavPrefix} absolute ${isRTL ? "left-0" : "right-0"} top-[32%] z-10 hidden h-10 w-10 translate-x-2 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.12)] transition-colors hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white disabled:opacity-50 md:flex`}
            aria-label="Next"
          >
            <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
          </button>
        </>
      )}
    </div>
  );
}
