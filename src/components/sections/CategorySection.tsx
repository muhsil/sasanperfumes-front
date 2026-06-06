"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

import { SectionHeaderSkeleton, Skeleton } from "@/components/common/Skeleton";
import type { WCCategory } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import type { CategorySectionSettings } from "@/types/wordpress";
import { decodeHtmlEntities, BLUR_DATA_URL } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface ExtraCategoryItem {
  id: string;
  name: { en: string; ar: string };
  slug: string;
  href: string;
  image?: string;
}

interface CategorySectionProps {
  settings: CategorySectionSettings;
  categories: WCCategory[];
  locale: Locale;
  isRTL?: boolean;
  viewAllText?: string;
  productsText?: string;
  className?: string;
  isLoading?: boolean;
  englishCategorySlugs?: Record<number, string>;
  extraItems?: ExtraCategoryItem[];
  fallbackImages?: Record<number, { src: string; alt: string } | undefined>;
  variant?: "light" | "dark";
}

function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-[5/4] w-full rounded-lg" />
      <div className="mt-3 space-y-2 p-1">
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function CategorySectionSkeleton({ count = 6, variant = "light" }: { count?: number; variant?: "light" | "dark" }) {
  const isDark = variant === "dark";

  return (
    <section className={isDark ? "bg-brand-primary py-8 md:py-9 lg:py-10" : "bg-transparent pb-0 pt-10 md:pt-12 lg:pt-14"}>
      <div className="mb-8 px-5 md:px-7 lg:px-12 md:mb-10">
        <SectionHeaderSkeleton />
      </div>
      <div className="grid grid-cols-2 gap-4 px-5 md:px-7 lg:px-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function CategorySection({
  settings,
  categories,
  locale,
  isRTL = false,
  className = "",
  isLoading = false,
  englishCategorySlugs = {},
  extraItems = [],
  fallbackImages = {},
  variant = "light",
}: CategorySectionProps) {
  if (isLoading) {
    return <CategorySectionSkeleton count={settings.categories_count || 6} />;
  }

  if (!settings.enabled || categories.length === 0) {
    return null;
  }

  const selectedIds = settings.selected_category_ids;
  let displayCategories: WCCategory[];
  if (selectedIds && selectedIds.length > 0) {
    const categoryById = new Map<number, WCCategory>();
    categories.forEach((cat) => categoryById.set(cat.id, cat));
    displayCategories = selectedIds
      .map((id) => categoryById.get(id))
      .filter((cat): cat is WCCategory => cat !== undefined);
  } else {
    displayCategories = categories
      .filter((cat) => cat.parent === 0 && cat.slug !== "uncategorized")
      .slice(0, settings.categories_count);
  }

  if (displayCategories.length === 0) {
    return null;
  }

  const allItems = [
    ...displayCategories.map((cat) => ({ type: "category" as const, data: cat })),
    ...extraItems.map((item) => ({ type: "extra" as const, data: item })),
  ];

  const navPrefix = `category-slider-${settings.section_title?.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "") || "default"}`;
  const cols = settings.responsive_columns ?? { desktop: 5, tablet: 4, mobile: 2 };
  const isDark = variant === "dark";
  const sectionClassName = isDark
    ? "bg-brand-primary py-8 text-brand-ivory md:py-9 lg:py-10"
    : "bg-transparent pb-0 pt-10 md:pt-12 lg:pt-14";
  const titleClassName = isDark ? "text-brand-ivory" : "text-brand-primary";
  const subtitleClassName = isDark ? "text-brand-ivory/68" : "text-brand-muted";
  const arrowClassName = isDark
    ? "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-brand-ivory shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-colors hover:border-white/45 hover:bg-white hover:text-brand-primary md:h-10 md:w-10"
    : "flex h-9 w-9 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory text-brand-primary shadow-[0_8px_20px_rgba(20,15,10,0.1)] transition-colors hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white md:h-10 md:w-10";
  const cardClassName = isDark
    ? "relative aspect-[5/4] overflow-hidden rounded-lg border border-white/10 bg-white/10 shadow-[0_16px_34px_rgba(0,0,0,0.16)]"
    : "relative aspect-[5/4] overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-[0_16px_34px_rgba(20,15,10,0.08)]";
  const nameClassName = isDark ? "text-brand-ivory" : "text-brand-primary";

  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) return "hidden";
    if (settings.hide_on_mobile) return "hidden md:block";
    if (settings.hide_on_desktop) return "md:hidden";
    return "";
  };

  return (
    <section className={`${sectionClassName} lazy-section ${className} ${getVisibilityClass()}`}>
      <div className="mb-5 flex items-end justify-between gap-4 px-5 md:px-7 lg:px-12 md:mb-6">
        <div className={`${isRTL ? "text-right" : "text-left"}`}>
          <h2 className={`font-title text-3xl md:text-4xl ${titleClassName}`}>
            {settings.section_title}
          </h2>
          {settings.section_subtitle && (
            <p className={`mt-2 max-w-2xl text-sm leading-relaxed md:text-base ${subtitleClassName}`}>
              {settings.section_subtitle}
            </p>
          )}
        </div>

        {/* Navigation Arrows — inline with title */}
        {allItems.length > 2 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${navPrefix}-prev ${arrowClassName}`}
              aria-label="Previous"
            >
              <ChevronLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            </button>
            <button
              type="button"
              className={`${navPrefix}-next ${arrowClassName}`}
              aria-label="Next"
            >
              <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* Swiper Slider */}
      <div className="relative category-section-slider px-5 md:px-7 lg:px-12">
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={16}
            slidesPerView={cols.mobile}
            navigation={{
              prevEl: `.${navPrefix}-prev`,
              nextEl: `.${navPrefix}-next`,
            }}
            pagination={{
              clickable: true,
              bulletClass: "swiper-pagination-bullet swiper-bullet-brown",
              bulletActiveClass: "swiper-pagination-bullet-active swiper-bullet-brown-active",
            }}
            breakpoints={{
              640:  { slidesPerView: cols.mobile,  spaceBetween: 16 },
              768:  { slidesPerView: cols.tablet,  spaceBetween: 16 },
              1024: { slidesPerView: cols.desktop, spaceBetween: 16 },
            }}
            loop={allItems.length > 5}
            className="!pb-9"
            dir={isRTL ? "rtl" : "ltr"}
          >
            {allItems.map((item) => {
              if (item.type === "category") {
                const category = item.data as WCCategory;
                const categorySlugForUrl = englishCategorySlugs[category.id] || category.slug;
                const categoryImage = category.image?.src
                  ? { src: category.image.src, alt: category.image.alt || decodeHtmlEntities(category.name) }
                  : fallbackImages[category.id];
                return (
                  <SwiperSlide key={category.slug}>
                    <Link
                      href={`/${locale}/category/${categorySlugForUrl}`}
                      className="group flex flex-col"
                    >
                      <div className={cardClassName}>
                        {categoryImage?.src ? (
                          <Image
                            src={categoryImage.src}
                            alt={categoryImage.alt || decodeHtmlEntities(category.name)}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                          />
                        ) : (
                          <div className={`absolute inset-0 flex items-center justify-center px-4 text-center ${isDark ? "bg-white/8" : "bg-stone-200"}`}>
                            <span className={`font-title text-2xl leading-tight ${isDark ? "text-brand-ivory/80" : "text-brand-primary/45"}`}>
                              {decodeHtmlEntities(category.name)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <h3 className={`text-sm font-semibold lowercase ${nameClassName}`}>
                          {decodeHtmlEntities(category.name)}
                        </h3>
                      </div>
                    </Link>
                  </SwiperSlide>
                );
              }

              const extra = item.data as ExtraCategoryItem;
              return (
                <SwiperSlide key={extra.id}>
                  <Link href={extra.href} className="group flex flex-col">
                    <div className={cardClassName}>
                      {extra.image ? (
                        <Image
                          src={extra.image}
                          alt={extra.name[locale]}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL}
                        />
                      ) : (
                        <div className={`absolute inset-0 flex items-center justify-center px-4 text-center ${isDark ? "bg-white/8" : "bg-stone-200"}`}>
                          <span className={`font-title text-2xl leading-tight ${isDark ? "text-brand-ivory/80" : "text-brand-primary/45"}`}>
                            {extra.name[locale]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                        <h3 className={`text-sm font-semibold lowercase ${nameClassName}`}>
                        {extra.name[locale]}
                      </h3>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>

      </div>
    </section>
  );
}
