"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

import { BLUR_DATA_URL, decodeHtmlEntities, getLocalizedMarketPath, slugify } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { CollectionsSettings } from "@/types/wordpress";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface CollectionsSliderSectionProps {
  settings: CollectionsSettings;
  locale?: Locale;
  marketPrefix?: string;
  className?: string;
}

function CollectionCard({
  title,
  description,
  imageUrl,
  imageAlt,
  href,
  target,
  locale,
  marketPrefix,
}: {
  title: string;
  description?: string;
  imageUrl?: string;
  imageAlt: string;
  href?: string;
  target?: string;
  locale: Locale;
  marketPrefix: string;
}) {
  const cardHref = href ? getLocalizedMarketPath(href, locale, marketPrefix) : "#";

  return (
    <Link
      href={cardHref}
      target={target || "_self"}
      className="group relative flex h-full flex-col overflow-hidden"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-brand-beige md:aspect-auto md:min-h-[50svh] lg:min-h-[54svh]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={decodeHtmlEntities(imageAlt)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="z-0 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            unoptimized={shouldUseUnoptimizedImage(imageUrl)}
          />
        ) : (
          <div className="absolute inset-0 bg-stone-200" />
        )}
        <div className="absolute inset-0 z-10 bg-black/38 transition-colors duration-700 ease-out group-hover:bg-black/68" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-linear-to-t from-black/72 to-transparent transition-opacity duration-700 ease-out group-hover:opacity-100" />
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-8">
          <h3 className="max-w-[12ch] font-title text-3xl leading-tight text-white drop-shadow-md md:text-4xl">
            {decodeHtmlEntities(title)}
          </h3>
          <div className="translate-y-0 transition-transform duration-700 ease-out group-hover:translate-y-0">
            {description && (
            <p className="hidden max-w-md text-sm leading-relaxed text-white/90 md:block md:text-base">
              {decodeHtmlEntities(description)}
            </p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-ivory px-4 py-2.5 text-xs font-semibold uppercase text-brand-primary shadow-lg shadow-black/20 transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:bg-white group-hover:text-brand-primary group-hover:shadow-xl group-hover:shadow-black/30 hover:border hover:border-white hover:bg-brand-primary hover:text-white md:text-sm">
              <span>{locale === "ar" ? "استكشف" : "Explore"}</span>
              <svg className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CollectionsSliderSection({
  settings,
  locale = "en",
  marketPrefix = "",
  className = "",
}: CollectionsSliderSectionProps) {
  const isRTL = locale === "ar";
  const collections = settings.collections ?? [];
  const cols = settings.responsive_columns ?? { desktop: 3, tablet: 2, mobile: 1 };
  const sliderColumns = {
    mobile: Math.max(1, cols.mobile ?? 1),
    tablet: Math.max(1, cols.tablet ?? 2),
    desktop: Math.max(1, cols.desktop ?? 3),
  };
  const navPrefix = `collections-slider-${slugify(settings.section_title || "") || "default"}`;
  const showNavigation = collections.length > 1;
  const loop = collections.length > Math.max(sliderColumns.mobile, sliderColumns.tablet, sliderColumns.desktop);

  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) return "hidden";
    if (settings.hide_on_mobile) return "hidden md:block";
    if (settings.hide_on_desktop) return "md:hidden";
    return "";
  };

  const arrowClassName =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-brand-ivory shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-colors hover:border-white/45 hover:bg-white hover:text-brand-primary md:h-10 md:w-10";

  return (
    <section className={`bg-brand-primary py-8 text-brand-ivory md:py-10 lg:py-12 ${className} ${getVisibilityClass()}`}>
      {(settings.section_title || settings.section_subtitle) && (
        <div className="mb-5 flex items-end justify-between gap-4 section-shell md:mb-6">
          <div className={isRTL ? "text-right" : "text-left"}>
            {settings.section_title && (
              <h2 className="font-title text-3xl text-brand-ivory md:text-4xl">
                {decodeHtmlEntities(settings.section_title)}
              </h2>
            )}
            {settings.section_subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-ivory/70 md:text-base">
                {decodeHtmlEntities(settings.section_subtitle)}
              </p>
            )}
          </div>

          {showNavigation && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`${navPrefix}-prev ${arrowClassName}`}
                aria-label={isRTL ? "السابق" : "Previous"}
              >
                <ChevronLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                className={`${navPrefix}-next ${arrowClassName}`}
                aria-label={isRTL ? "التالي" : "Next"}
              >
                <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="section-shell">
        <Swiper
          modules={[Navigation, Pagination]}
          spaceBetween={16}
          slidesPerView={sliderColumns.mobile}
          navigation={
            showNavigation
              ? {
                  prevEl: `.${navPrefix}-prev`,
                  nextEl: `.${navPrefix}-next`,
                }
              : false
          }
          pagination={{
            clickable: true,
            bulletClass: "swiper-pagination-bullet swiper-bullet-brown",
            bulletActiveClass: "swiper-pagination-bullet-active swiper-bullet-brown-active",
          }}
          breakpoints={{
            640: { slidesPerView: sliderColumns.mobile, spaceBetween: 16 },
            768: { slidesPerView: sliderColumns.tablet, spaceBetween: 16 },
            1024: { slidesPerView: sliderColumns.desktop, spaceBetween: 16 },
          }}
          loop={loop}
          className="collections-slider !pb-9"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {collections.map((collection, index) => (
            <SwiperSlide key={`${collection.title}-${index}`}>
              <CollectionCard
                title={collection.title}
                description={collection.description}
                imageUrl={collection.image?.url}
                imageAlt={collection.image?.alt || collection.title}
                href={collection.link?.url}
                target={collection.link?.target}
                locale={locale}
                marketPrefix={marketPrefix}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
