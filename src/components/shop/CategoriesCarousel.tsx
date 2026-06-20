"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import Image from "next/image";
import Link from "next/link";
import { decodeHtmlEntities } from "@/lib/utils";
import type { Locale } from "@/config/site";
import type { WCCategory } from "@/types/woocommerce";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface CategoriesCarouselProps {
  categories: WCCategory[];
  locale: Locale;
}

export function CategoriesCarousel({ categories, locale }: CategoriesCarouselProps) {
  const marketPrefix = useMarketPrefix();
  return (
    <Swiper
      modules={[FreeMode]}
      freeMode
      slidesPerView="auto"
      spaceBetween={24}
      className="w-full"
    >
      {categories.map((category) => (
        <SwiperSlide key={category.id} className="!w-auto">
          <Link
            href={`${marketPrefix}/${locale}/category/${category.slug}`}
            className="group flex flex-col items-center gap-3 text-center"
          >
            <span className="relative block h-[72px] w-[72px] overflow-hidden rounded-full bg-[#e6ddd6] ring-1 ring-[#e7ded7] transition-all duration-300 group-hover:ring-brand-primary/20 md:h-[78px] md:w-[78px]">
              {category.image?.src ? (
                <Image
                  src={category.image.src}
                  alt={category.image.alt || category.name}
                  fill
                  sizes="82px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-normal text-brand-primary/40">
                  {decodeHtmlEntities(category.name).charAt(0)}
                </span>
              )}
            </span>
            <span className="max-w-[92px] text-[12px] font-normal leading-tight tracking-normal text-brand-primary">
              {decodeHtmlEntities(category.name)}
            </span>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
