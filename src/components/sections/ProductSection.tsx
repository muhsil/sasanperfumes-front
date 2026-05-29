"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import { WCProductCard } from "@/components/shop/WCProductCard";
import { ProductGridSkeleton, SectionHeaderSkeleton } from "@/components/common/Skeleton";
import { getLocalizedPath } from "@/lib/utils";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import type { ProductSectionSettings } from "@/types/wordpress";

import "swiper/css";
import "swiper/css/navigation";

// Static class maps — Tailwind must see these strings to include them in the bundle
const MOBILE_COLS: Record<number, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3",
  4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6",
};
const TABLET_COLS: Record<number, string> = {
  1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3",
  4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6",
};
const DESKTOP_COLS: Record<number, string> = {
  1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3",
  4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6",
};

interface ProductSectionProps {
  settings: ProductSectionSettings;
  products: WCProduct[];
  locale: Locale;
  isRTL?: boolean;
  viewAllText?: string;
  className?: string;
  isLoading?: boolean;
  bundleProductSlugs?: string[];
  englishProductSlugs?: Record<number, string>;
}

export function ProductSectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="bg-transparent pb-0 pt-10 md:pt-12 lg:pt-14">
      <div className="px-5 md:px-7 lg:px-12">
        <div className="mb-6 md:mb-8">
          <SectionHeaderSkeleton />
        </div>
        <ProductGridSkeleton count={count} />
      </div>
    </section>
  );
}

export function ProductSection({
  settings,
  products,
  locale,
  isRTL = false,
  viewAllText = "View All",
  className = "",
  isLoading = false,
  bundleProductSlugs = [],
  englishProductSlugs = {},
}: ProductSectionProps) {
  if (isLoading) {
    return <ProductSectionSkeleton count={settings.products_count || 4} />;
  }

  if (!settings.enabled || products.length === 0) {
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
    // Append remaining products not in selected list
    for (const product of products) {
      if (!selectedSlugs.includes(product.slug)) ordered.push(product);
    }
    orderedProducts = ordered;
  }
  const displayProducts = orderedProducts.slice(0, settings.products_count);

  const rawViewAllLink = settings.view_all_link ?? "/shop";
  const viewAllLink =
    rawViewAllLink.startsWith("http://") || rawViewAllLink.startsWith("https://")
      ? rawViewAllLink
      : getLocalizedPath(rawViewAllLink, locale);

  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) return "hidden";
    if (settings.hide_on_mobile) return "hidden md:block";
    if (settings.hide_on_desktop) return "md:hidden";
    return "";
  };

  const cols = settings.responsive_columns ?? { desktop: 5, tablet: 3, mobile: 2 };
  const isGrid = settings.display === 'grid';
  const sliderNavPrefix = settings.section_title?.replace(/\s+/g, '-').toLowerCase() || 'default';

  return (
    <section className={`bg-transparent pb-0 pt-10 md:pt-12 lg:pt-14 ${className} ${getVisibilityClass()}`}>
      <div className="px-5 md:px-7 lg:px-12">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className={isRTL ? "text-right" : "text-left"}>
            <h2 className="font-title text-3xl text-brand-primary md:text-4xl">
              {settings.section_title}
            </h2>
            {settings.section_subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
                {settings.section_subtitle}
              </p>
            )}
          </div>
          {settings.show_view_all && (
            <Link
              href={viewAllLink}
              className="hidden rounded-full border border-brand-border/70 bg-brand-ivory px-5 py-2 text-[11px] font-semibold uppercase text-brand-primary transition-colors hover:border-brand-primary/45 hover:bg-brand-beige md:inline-flex"
            >
              {viewAllText}
            </Link>
          )}
        </div>
      </div>

      {isGrid ? (
        /* Grid layout */
        <div className={`grid gap-4 px-5 pb-1 md:px-7 lg:px-12 ${MOBILE_COLS[cols.mobile] ?? "grid-cols-2"} ${TABLET_COLS[cols.tablet] ?? "sm:grid-cols-3"} ${DESKTOP_COLS[cols.desktop] ?? "lg:grid-cols-5"}`}>
          {displayProducts.map((product) => (
            <WCProductCard key={product.id} product={product} locale={locale} bundleProductSlugs={bundleProductSlugs} englishSlug={englishProductSlugs[product.id]} />
          ))}
        </div>
      ) : (
        /* Slider layout */
        <div className="relative product-section-slider px-5 md:px-7 lg:px-12">
          <Swiper
            modules={[Autoplay, Navigation]}
            spaceBetween={16}
            slidesPerView={cols.mobile}
            loop={settings.autoplay && displayProducts.length > cols.desktop}
            autoplay={
              settings.autoplay
                ? {
                    delay: settings.autoplay_delay || 4000,
                    disableOnInteraction: false,
                  }
                : false
            }
            navigation={{
              prevEl: `.product-slider-prev-${sliderNavPrefix}`,
              nextEl: `.product-slider-next-${sliderNavPrefix}`,
            }}

            breakpoints={{
              640:  { slidesPerView: cols.tablet,  spaceBetween: 16 },
              768:  { slidesPerView: cols.tablet,  spaceBetween: 16 },
              1024: { slidesPerView: cols.desktop, spaceBetween: 16 },
              1280: { slidesPerView: cols.desktop, spaceBetween: 16 },
            }}
            className=""
            dir={isRTL ? "rtl" : "ltr"}
          >
            {displayProducts.map((product) => (
              <SwiperSlide key={product.id}>
                <WCProductCard product={product} locale={locale} bundleProductSlugs={bundleProductSlugs} englishSlug={englishProductSlugs[product.id]} />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Arrows */}
          {products.length > cols.mobile && (
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
      )}
    </section>
  );
}
