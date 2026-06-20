"use client";

import Link from "next/link";
import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import { pickLocale } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";
import { Skeleton } from "@/components/common/Skeleton";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface Service {
  id: number;
  slug: string;
  title: { en: string; ar: string };
  excerpt: { en: string; ar: string };
  image?: string;
}

interface HomepageServicesGridProps {
  services: Service[];
  locale: Locale;
  isRTL: boolean;
}

export function HomepageServicesGridSkeleton() {
  return (
    <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
      <div className="mb-8 section-shell md:mb-10">
        <Skeleton className="h-8 w-48 md:h-9 lg:h-10" />
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="border-b border-[#e7ded7] bg-white px-4 py-4">
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 section-shell pb-10">
        <Skeleton className="h-4 w-32" />
      </div>
    </section>
  );
}

export function HomepageServicesGrid({
  services,
  locale,
  isRTL,
}: HomepageServicesGridProps) {
  const marketPrefix = useMarketPrefix();
  return (
    <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
      <div className="mb-8 section-shell md:mb-10">
        <h2 className="font-normal text-2xl text-brand-primary md:text-3xl lg:text-4xl">
          {isRTL ? "خدماتنا" : "Our Services"}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {services.map((service) => {
          const title = pickLocale(service.title, locale, "");
          const excerpt = pickLocale(service.excerpt, locale, "");

          return (
            <Link
              key={service.id}
              href={`${marketPrefix}/${locale}/services/${service.slug}`}
              data-service-card
              className="group relative block overflow-hidden"
            >
              {/* Image container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-brand-beige">
                {service.image ? (
                  <Image
                    src={service.image}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    unoptimized={shouldUseUnoptimizedImage(service.image)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-beige">
                    <svg
                      className="h-12 w-12 text-brand-primary/15 transition-transform duration-500 group-hover:scale-125"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-brand-primary/90 via-brand-primary/50 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100" />

                {/* Hover content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 transition-all duration-500 translate-y-4 group-hover:translate-y-0 group-hover:opacity-100">
                  <h3 className="text-lg font-normal text-white leading-snug md:text-xl">
                    {title}
                  </h3>
                  {excerpt && (
                    <p className="mt-2 text-sm leading-relaxed text-white/80 line-clamp-3">
                      {excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium tracking-wider text-brand-gold uppercase">
                    <span>{isRTL ? "اعرف المزيد" : "Learn More"}</span>
                    <svg
                      className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Title bar - always visible below image */}
              <div className="border-b border-[#e7ded7] bg-white px-4 py-4 transition-colors duration-300 group-hover:bg-brand-beige/40">
                <h3 className="text-sm font-normal text-brand-primary transition-colors duration-300 group-hover:text-brand-primary">
                  {title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 section-shell pb-10">
        <Link
          href={`${marketPrefix}/${locale}/services`}
          className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase transition-colors hover:text-brand-primary/70"
        >
          {isRTL ? "جميع الخدمات" : "View All Services"}
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
