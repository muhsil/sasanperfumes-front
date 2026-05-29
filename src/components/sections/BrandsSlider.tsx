"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { decodeHtmlEntities } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";

import "swiper/css";

interface Brand {
  name: string;
  image: string;
  url: string;
}

interface SliderOptions {
  desktop_count: number;
  tablet_count: number;
  mobile_count: number;
  autoplay: boolean;
  autoplay_speed: number;
  loop: boolean;
  arrows: boolean;
  dots: boolean;
}

interface BrandsSliderData {
  enabled: boolean;
  heading: { en: string; ar: string };
  subtitle?: { en: string; ar: string };
  slider_options?: SliderOptions;
  brands: Brand[];
}

export function BrandsSlider({ locale }: { locale: Locale }) {
  const [data, setData] = useState<BrandsSliderData | null>(null);
  const isAr = locale === "ar";

  useEffect(() => {
    fetch("/api/brands-slider")
      .then((r) => r.json())
      .then((d: BrandsSliderData) => {
        if (d?.enabled && d.brands?.length > 0) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const heading = decodeHtmlEntities(isAr ? data.heading.ar : data.heading.en);
  const subtitle = decodeHtmlEntities((isAr ? data.subtitle?.ar : data.subtitle?.en) || "");
  const sliderOptions = data.slider_options || { desktop_count: 5, tablet_count: 4, mobile_count: 3, autoplay: true, autoplay_speed: 2000, loop: true, arrows: false, dots: false };

  return (
    <section className="home-view-section home-view-section--compact bg-brand-beige py-14 md:py-16 lg:py-20">
      <div className="home-view-section__inner">
        {heading && (
          <h2 className="mb-3 text-center font-title text-3xl text-brand-primary md:text-4xl">
            {heading}
          </h2>
        )}
        {subtitle && (
          <p className="mx-auto mb-8 max-w-2xl px-5 text-center text-sm leading-relaxed text-brand-muted md:text-base">
            {subtitle}
          </p>
        )}
        {!subtitle && heading && <div className="mb-8" />}

        <div className="relative" dir={isAr ? "rtl" : "ltr"}>
          <Swiper
            modules={[Autoplay]}
            spaceBetween={16}
            slidesPerView={3}
            speed={800}
            autoplay={sliderOptions.autoplay ? {
              delay: sliderOptions.autoplay_speed || 2000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            } : false}
            loop={sliderOptions.loop}
            breakpoints={{
              640: {
                slidesPerView: 4,
                spaceBetween: 16,
              },
              768: {
                slidesPerView: 4,
                spaceBetween: 16,
              },
              1024: {
                slidesPerView: 5,
                spaceBetween: 16,
              },
            }}
            className="brands-slider px-5 md:px-7 lg:px-12"
          >
            {data.brands.map((brand, i) => {
              const card = (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="relative w-full p-1 sm:p-2 md:p-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-full border border-brand-border/70 bg-brand-ivory shadow-[0_18px_38px_rgba(20,15,10,0.08)]">
                      <Image
                        src={brand.image}
                        alt={decodeHtmlEntities(brand.name || `Brand ${i + 1}`)}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 20vw"
                        className="h-full w-full rounded-full object-cover"
                        loading="lazy"
                        unoptimized={shouldUseUnoptimizedImage(brand.image)}
                      />
                    </div>
                  </div>
                </div>
              );

              return (
                <SwiperSlide key={i} className="h-auto">
                  {brand.url ? (
                    <Link
                      href={brand.url.startsWith("/") ? `/${locale}${brand.url}` : brand.url}
                      target={brand.url.startsWith("http") ? "_blank" : undefined}
                      rel={brand.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      aria-label={decodeHtmlEntities(brand.name || `Brand ${i + 1}`)}
                      className="flex h-full w-full"
                    >
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
