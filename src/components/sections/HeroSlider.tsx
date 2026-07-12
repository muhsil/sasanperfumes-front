"use client";

import { useState, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { HeroSliderSettings } from "@/types/wordpress";
import { decodeHtmlEntities, getLocalizedMarketPath } from "@/lib/utils";

// Swiper CSS — imported statically (small footprint, needed before JS loads)
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

// Lazy-load Swiper JS only when needed (multiple slides)
let SwiperModule: typeof import("swiper/react") | null = null;
let SwiperModulesLib: typeof import("swiper/modules") | null = null;

interface HeroSliderProps {
  settings: HeroSliderSettings;
}

interface HeroMediaProps {
  desktopSrc: string;
  desktopAlt: string;
  mobileSrc?: string;
  mobileAlt?: string;
  priority: boolean;
  className: string;
}

function HeroMedia({
  desktopSrc,
  desktopAlt,
  mobileSrc,
  mobileAlt,
  priority,
  className,
}: HeroMediaProps) {
  const [isBroken, setIsBroken] = useState(false);

  useEffect(() => {
    setIsBroken(false);
  }, [desktopSrc, mobileSrc]);

  if (isBroken) return null;
  const hasDistinctMobileSrc = Boolean(mobileSrc && mobileSrc !== desktopSrc);
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? "high" : "low";
  const alt = mobileAlt || desktopAlt;

  return (
    <picture className="absolute inset-0 block h-full w-full">
      {hasDistinctMobileSrc && <source media="(max-width: 767px)" srcSet={mobileSrc} />}
      <source media="(min-width: 768px)" srcSet={desktopSrc} />
      <img
        src={desktopSrc}
        alt={alt}
        className={`block h-full w-full ${className}`}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onError={() => setIsBroken(true)}
      />
    </picture>
  );
}

function getYoutubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}
function getVimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : "";
}

// Shared slide content renderer — used for both static first slide and Swiper slides
function SlideContent({ slide, index, locale }: { slide: HeroSliderSettings["slides"][0]; index: number; locale: string }) {
  const marketPrefix = useMarketPrefix();
  const isArabic = locale === "ar";

  const isVideo = slide.slide_type === "video" && (
    Boolean(slide.videoUrl || slide.videoMobile) ||
    Boolean(slide.videoAr || slide.videoMobileAr)
  );

  const rawTitle = isArabic ? (slide.titleAr || slide.title) : slide.title;
  const rawSubtitle = isArabic ? (slide.subtitleAr || slide.subtitle) : slide.subtitle;
  const rawCta = isArabic ? (slide.ctaLabelAr || slide.ctaLabel) : slide.ctaLabel;
  const slideTitle = rawTitle ? decodeHtmlEntities(rawTitle) : rawTitle;
  const slideSubtitle = rawSubtitle ? decodeHtmlEntities(rawSubtitle) : rawSubtitle;
  const slideCta = rawCta ? decodeHtmlEntities(rawCta) : rawCta;
  const slideLinkUrl = slide.linkUrl || slide.link?.url || "";
  const slideHref =
    slideLinkUrl.startsWith("/")
      ? getLocalizedMarketPath(slideLinkUrl, locale, marketPrefix)
      : slideLinkUrl;

  const renderVideo = (desktop: boolean) => {
    const url = desktop
      ? isArabic ? (slide.videoAr || slide.videoUrl) : slide.videoUrl
      : isArabic ? (slide.videoMobileAr || slide.videoMobile || slide.videoUrl) : (slide.videoMobile || slide.videoUrl);
    const posterUrl = desktop
      ? isArabic ? (slide.posterAr || slide.posterUrl) : slide.posterUrl
      : isArabic ? (slide.posterMobileAr || slide.posterMobile || slide.posterUrl) : (slide.posterMobile || slide.posterUrl);

    if (!url) return null;

    const ytId = getYoutubeId(url);
    const vimeoId = getVimeoId(url);

    const containerClass = desktop ? "hidden md:block" : "block md:hidden";

    if (ytId) {
      return (
        <iframe
          key={`yt-${desktop}`}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
          className={`absolute inset-0 h-full w-full ${containerClass}`}
          allow="autoplay; fullscreen"
          title={`Slide ${index + 1}`}
          loading={index === 0 ? "eager" : "lazy"}
        />
      );
    }
    if (vimeoId) {
      return (
        <iframe
          key={`vimeo-${desktop}`}
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&background=1`}
          className={`absolute inset-0 h-full w-full ${containerClass}`}
          allow="autoplay; fullscreen"
          title={`Slide ${index + 1}`}
          loading={index === 0 ? "eager" : "lazy"}
        />
      );
    }
    // Native video (mp4 etc.)
    return (
      <video
        key={`video-${desktop}`}
        src={url}
        poster={posterUrl}
        autoPlay
        muted
        loop
        playsInline
        className={`absolute inset-0 h-full w-full object-cover ${containerClass}`}
      />
    );
  };

  const hasTextOverlay = slideTitle || slideSubtitle || slideCta;

  const textOverlay = hasTextOverlay ? (
    <div className="absolute inset-0 z-10 flex items-center">
      <div className="container mx-auto px-6 md:px-12">
        <div className="max-w-xl">
          {slideTitle && (
            <h2 className="font-title text-2xl text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] md:text-4xl lg:text-5xl">{slideTitle}</h2>
          )}
          {slideSubtitle && (
            <p className="mt-3 max-w-lg text-sm text-white/90 drop-shadow md:mt-4 md:text-base lg:text-lg">{slideSubtitle}</p>
          )}
          {slideCta && slideLinkUrl && (
            <Link
              href={slideHref}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#b98a49] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1714] shadow-[0_18px_32px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#c99a58] md:mt-6 md:px-8 md:py-3"
            >
              {slideCta}
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const mediaContent = (
    <div className="home-view-section--media home-hero-media relative h-[400px] w-full overflow-hidden bg-[#1a1714] sm:h-[500px] md:h-[600px] lg:h-[800px]">
      {isVideo ? (
        <>
          {renderVideo(true)}
          {renderVideo(false)}
        </>
      ) : slide.image?.url ? (
        <HeroMedia
          desktopSrc={slide.image.url}
          desktopAlt={slide.image.alt || `Slide ${index + 1}`}
          mobileSrc={slide.mobile_image?.url}
          mobileAlt={slide.mobile_image?.alt || slide.image.alt || `Slide ${index + 1}`}
          priority={index === 0}
          className="object-cover"
        />
      ) : (
        null
      )}

      {textOverlay}
    </div>
  );

  if (!isVideo && slideLinkUrl && !slideCta) {
    return (
      <Link href={slideHref} className="block">
        {mediaContent}
      </Link>
    );
  }

  return mediaContent;
}

export function HeroSlider({ settings }: HeroSliderProps) {
  const { locale } = useParams<{ locale: string }>();
  const [swiperReady, setSwiperReady] = useState(false);
  const [SwiperComponents, setSwiperComponents] = useState<{
    Swiper: typeof import("swiper/react").Swiper;
    SwiperSlide: typeof import("swiper/react").SwiperSlide;
    modules: (typeof import("swiper/modules"))["Autoplay" | "Pagination" | "Navigation"][];
  } | null>(null);

  const activeSlides = (settings.slides || []).filter((slide) =>
    slide.slide_type === "video" ? Boolean(slide.videoUrl) : Boolean(slide.image?.url)
  );
  const hasMultipleSlides = activeSlides.length > 1;

  // Only load Swiper JS when there are multiple slides
  useEffect(() => {
    if (!hasMultipleSlides) return;

    const loadSwiper = async () => {
      if (!SwiperModule) {
        const [swiperReact, swiperModules] = await Promise.all([
          import("swiper/react"),
          import("swiper/modules"),
        ]);
        SwiperModule = swiperReact;
        SwiperModulesLib = swiperModules;
      }
      setSwiperComponents({
        Swiper: SwiperModule!.Swiper,
        SwiperSlide: SwiperModule!.SwiperSlide,
        modules: [
          SwiperModulesLib!.Autoplay,
          SwiperModulesLib!.Pagination,
          SwiperModulesLib!.Navigation,
        ],
      });
      setSwiperReady(true);
    };

    loadSwiper();
  }, [hasMultipleSlides]);

  if (!settings.enabled || activeSlides.length === 0) {
    return null;
  }

  // Handle visibility based on hide_on_mobile and hide_on_desktop settings
  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) {
      return "hidden";
    }
    if (settings.hide_on_mobile) {
      return "hidden md:block";
    }
    if (settings.hide_on_desktop) {
      return "md:hidden";
    }
    return "";
  };

  // Single slide or Swiper not loaded yet — render first slide statically (instant LCP, zero CLS)
  if (!hasMultipleSlides || !swiperReady || !SwiperComponents) {
    return (
      <section className={`hero-banner relative w-full overflow-hidden border-b border-brand-border/35 ${getVisibilityClass()}`}>
        <SlideContent slide={activeSlides[0]} index={0} locale={locale} />
      </section>
    );
  }

  // Multiple slides with Swiper loaded
  const { Swiper, SwiperSlide, modules } = SwiperComponents;
  const autoplayDelay = Number.isFinite(Number(settings.autoplay_delay))
    ? Number(settings.autoplay_delay)
    : 5000;
  const sliderStyle: CSSProperties & { "--hero-slider-autoplay-delay": string } = {
    "--hero-slider-autoplay-delay": `${autoplayDelay}ms`,
  };

  return (
    <section className={`hero-banner relative w-full overflow-hidden border-b border-brand-border/35 ${getVisibilityClass()}`}>
      <Swiper
        modules={modules}
        spaceBetween={0}
        slidesPerView={1}
        loop={settings.loop && activeSlides.length > 1}
        autoplay={
          settings.autoplay
            ? { delay: autoplayDelay, disableOnInteraction: false }
            : false
        }
        pagination={{ clickable: true }}
        navigation={true}
        style={sliderStyle}
        className={`hero-slider${settings.autoplay ? " hero-slider-autoplay" : ""}`}
      >
        {activeSlides.map((slide, index) => (
          <SwiperSlide key={index}>
            <SlideContent slide={slide} index={index} locale={locale} />
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .hero-slider .swiper-pagination {
          bottom: 18px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .hero-slider .swiper-pagination-bullet {
          position: relative;
          width: 22px;
          height: 6px;
          margin: 0 !important;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.64);
          border-radius: 0;
          background: rgba(255, 255, 255, 0.22);
          opacity: 1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
          transition: width 0.25s ease, background 0.25s ease, border-color 0.25s ease;
        }
        .hero-slider .swiper-pagination-bullet::after {
          content: "";
          position: absolute;
          inset: 0;
          background: #f5d3a0;
          opacity: 0;
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.25s ease, opacity 0.25s ease;
          will-change: transform;
        }
        [dir="rtl"] .hero-slider .swiper-pagination-bullet::after {
          transform-origin: right center;
        }
        .hero-slider .swiper-pagination-bullet-active {
          width: 34px;
          border-color: #f5d3a0;
          background: rgba(245, 211, 160, 0.16);
          opacity: 1;
        }
        .hero-slider .swiper-pagination-bullet-active::after {
          opacity: 1;
          transform: scaleX(1);
        }
        .hero-slider.hero-slider-autoplay .swiper-pagination-bullet-active::after {
          animation: hero-slider-pagination-load var(--hero-slider-autoplay-delay, 5000ms) linear forwards;
        }
        @keyframes hero-slider-pagination-load {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        .hero-slider .swiper-button-prev,
        .hero-slider .swiper-button-next {
          display: none;
          width: 30px;
          height: 30px;
          background: rgba(251, 246, 239, 0.95);
          border-radius: 50%;
          color: #1a1714;
          box-shadow: 0 7px 18px rgba(0, 0, 0, 0.2);
          transition: all 0.25s ease;
          top: 50%;
          margin-top: -15px;
        }
        .hero-slider .swiper-button-prev:hover,
        .hero-slider .swiper-button-next:hover {
          background: rgba(185, 138, 73, 0.96);
          color: #15120e;
          box-shadow: 0 9px 20px rgba(0, 0, 0, 0.24);
        }
        .hero-slider .swiper-button-prev::after,
        .hero-slider .swiper-button-next::after {
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
        }
        .hero-slider .swiper-button-prev .swiper-navigation-icon,
        .hero-slider .swiper-button-next .swiper-navigation-icon {
          width: 8px !important;
          height: 14px !important;
        }
        .hero-slider .swiper-button-prev {
          left: 14px;
        }
        .hero-slider .swiper-button-next {
          right: 14px;
        }
        [dir="rtl"] .hero-slider .swiper-button-prev {
          left: auto;
          right: 14px;
        }
        [dir="rtl"] .hero-slider .swiper-button-next {
          right: auto;
          left: 14px;
        }
        @media (min-width: 768px) {
          .hero-slider .swiper-pagination {
            bottom: 22px !important;
            gap: 8px;
          }
          .hero-slider .swiper-pagination-bullet {
            width: 28px;
            height: 7px;
          }
          .hero-slider .swiper-pagination-bullet-active {
            width: 44px;
          }
          .hero-slider .swiper-button-prev,
          .hero-slider .swiper-button-next {
            display: flex;
            width: 36px;
            height: 36px;
            margin-top: -18px;
          }
          .hero-slider .swiper-button-prev {
            left: 24px;
          }
          .hero-slider .swiper-button-next {
            right: 24px;
          }
          [dir="rtl"] .hero-slider .swiper-button-prev {
            right: 24px;
          }
          [dir="rtl"] .hero-slider .swiper-button-next {
            left: 24px;
          }
          .hero-slider .swiper-button-prev::after,
          .hero-slider .swiper-button-next::after {
            font-size: 13px;
          }
          .hero-slider .swiper-button-prev .swiper-navigation-icon,
          .hero-slider .swiper-button-next .swiper-navigation-icon {
            width: 9px !important;
            height: 16px !important;
          }
        }
      `}</style>
    </section>
  );
}
