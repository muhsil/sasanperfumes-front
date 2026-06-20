"use client";

import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import { pickLocale } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";

import "swiper/css";
import "swiper/css/pagination";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface Service {
  id: number;
  slug: string;
  title: { en: string; ar: string };
  excerpt: { en: string; ar: string };
  image?: string;
}

interface ServicesSliderProps {
  services: Service[];
  locale: Locale;
  isRTL: boolean;
}

export function ServicesSlider({ services, locale, isRTL }: ServicesSliderProps) {

  const marketPrefix = useMarketPrefix();
  return (
    <div className="relative" dir={isRTL ? "rtl" : "ltr"}>
      <style>{`
        .services-slider .swiper-pagination-bullet {
          background: #111111;
          opacity: 0.3;
          width: 8px;
          height: 8px;
          margin: 0 6px;
        }
        .services-slider .swiper-pagination-bullet-active {
          background: #111111;
          opacity: 1;
          width: 24px;
          border-radius: 4px;
        }
        .services-slider .swiper-pagination {
          bottom: -40px;
        }
      `}</style>
      <Swiper
        modules={[Pagination]}
        spaceBetween={4}
        slidesPerView={1}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 4,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 4,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 4,
          },
        }}
        className="services-slider pb-16"
      >
        {services.map((service) => {
          const title = pickLocale(service.title, locale, "");
          const excerpt = pickLocale(service.excerpt, locale, "");

          return (
            <SwiperSlide key={service.id} className="h-auto">
              <Link
                href={`${marketPrefix}/${locale}/services/${service.slug}`}
                className="group relative flex flex-col border border-[#e7ded7] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(74,22,51,0.12)] hover:border-brand-primary/20 h-full"
              >
                {service.image ? (
                  <div className="relative aspect-[4/5] overflow-hidden bg-linear-to-br from-brand-beige to-stone-100">
                    <Image
                      src={service.image}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      unoptimized={shouldUseUnoptimizedImage(service.image)}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-brand-primary/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                ) : (
                  <div className="relative aspect-[4/5] bg-linear-to-br from-brand-beige to-stone-100 flex items-center justify-center">
                    <svg className="h-12 w-12 text-brand-primary/20 transition-transform duration-500 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 bg-white p-5 flex flex-col transition-all duration-300 group-hover:bg-brand-beige/40">
                  <h3 className="text-sm font-bold text-brand-primary leading-snug transition-colors duration-300 group-hover:text-brand-primary">{title}</h3>
                  {excerpt && (
                    <p className="mt-2 text-xs leading-relaxed text-brand-primary/60 flex-grow line-clamp-3 transition-colors duration-300 group-hover:text-brand-primary/70">{excerpt}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-brand-gold opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span>{locale === "ar" ? "اعرف المزيد" : "Learn More"}</span>
                    <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
