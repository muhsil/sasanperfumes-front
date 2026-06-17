"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import { WCProductCard } from "@/components/shop/WCProductCard";
import { ProductGridSkeleton, SectionHeaderSkeleton } from "@/components/common/Skeleton";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import type { FeaturedProductsSettings } from "@/types/wordpress";

import "swiper/css";
import "swiper/css/navigation";

interface FeaturedProductsSliderProps {
  settings: FeaturedProductsSettings;
  products: WCProduct[];
  locale: Locale;
  isRTL?: boolean;
  viewAllText?: string;
  className?: string;
  isLoading?: boolean;
  bundleProductSlugs?: string[];
  englishProductSlugs?: Record<number, string>;
}

export function FeaturedProductsSliderSkeleton() {
  return (
    <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
      <div className="px-5 md:px-7 lg:px-12">
        <div className="mb-6 md:mb-8">
          <SectionHeaderSkeleton />
        </div>
        <ProductGridSkeleton count={5} />
      </div>
    </section>
  );
}

export function FeaturedProductsSlider({
  settings,
  products,
  locale,
  isRTL = false,
  viewAllText = "View All",
  className = "",
  isLoading = false,
  bundleProductSlugs = [],
  englishProductSlugs = {},
}: FeaturedProductsSliderProps) {
  if (isLoading) {
    return <FeaturedProductsSliderSkeleton />;
  }

  if (settings.enabled === false || products.length === 0) {
    return null;
  }

  // Reorder products based on selected slugs, then enforce count limit
  const selectedSlugs = settings.selected_product_slugs ?? [];
  let orderedProducts = products;
  if (selectedSlugs.length > 0) {
    const productsBySlug = new Map(products.map(p => [p.slug, p]));
    const ordered: WCProduct[] = [];
    for (const slug of selectedSlugs) {
      const product = productsBySlug.get(slug);
      if (product) ordered.push(product);
    }
    for (const product of products) {
      if (!selectedSlugs.includes(product.slug)) ordered.push(product);
    }
    orderedProducts = ordered;
  }
  const displayProducts = orderedProducts.slice(0, settings.products_count);

  // Handle visibility based on hide_on_mobile and hide_on_desktop settings
  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) {
      return "hidden"; // Hide on both
    }
    if (settings.hide_on_mobile) {
      return "hidden md:block"; // Hide on mobile only
    }
    if (settings.hide_on_desktop) {
      return "md:hidden"; // Hide on desktop only
    }
    return ""; // Show on both
  };

  return (
    <section className={`bg-white pt-8 md:pt-10 lg:pt-12 pb-0 ${className} ${getVisibilityClass()}`}>
      <div className="px-5 md:px-7 lg:px-12">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className={isRTL ? "text-right" : "text-left"}>
            <h2 className="text-xl md:text-2xl font-normal text-brand-primary">
              {settings.section_title}
            </h2>
            {settings.section_subtitle && (
              <p className="mt-2 max-w-2xl text-sm text-brand-muted leading-relaxed">
                {settings.section_subtitle}
              </p>
            )}
          </div>
          <Link
            href={`/${locale}/shop`}
            className="hidden text-sm text-brand-primary underline underline-offset-4 hover:no-underline md:inline-block"
          >
            {viewAllText}
          </Link>
        </div>
      </div>

      <div className="relative border-t border-l border-[#e7ded7]">
        <Swiper
          modules={[Autoplay, Navigation]}
          spaceBetween={0}
          slidesPerView={2}
          loop={displayProducts.length > 5}
          autoplay={
            settings.autoplay
              ? {
                  delay: settings.autoplay_delay || 4000,
                  disableOnInteraction: false,
                }
              : false
          }
          navigation={{
            prevEl: ".featured-slider-prev",
            nextEl: ".featured-slider-next",
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 0,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 0,
            },
            1024: {
              slidesPerView: 5,
              spaceBetween: 0,
            },
          }}
          className="featured-products-slider"
        >
          {displayProducts.map((product) => (
            <SwiperSlide key={product.id}>
              <WCProductCard product={product} locale={locale} bundleProductSlugs={bundleProductSlugs} englishSlug={englishProductSlugs[product.id]} />
            </SwiperSlide>
          ))}
        </Swiper>

        {displayProducts.length > 5 && (
          <>
            <button
              type="button"
              className="featured-slider-prev absolute -left-4 top-[calc(50%-2.5rem)] z-10 hidden h-10 w-10 -translate-y-1/2 border border-brand-primary/20 bg-white items-center justify-center hover:bg-brand-primary hover:text-white transition-colors lg:flex"
              aria-label="Previous products"
            >
              <svg className="h-4 w-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              className="featured-slider-next absolute -right-4 top-[calc(50%-2.5rem)] z-10 hidden h-10 w-10 -translate-y-1/2 border border-brand-primary/20 bg-white items-center justify-center hover:bg-brand-primary hover:text-white transition-colors lg:flex"
              aria-label="Next products"
            >
              <svg className="h-4 w-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
