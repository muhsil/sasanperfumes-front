"use client";

import { ServicesSlider } from "./ServicesSlider";
import type { Locale } from "@/config/site";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface Service {
  id: number;
  slug: string;
  title: { en: string; ar: string };
  excerpt: { en: string; ar: string };
  image?: string;
}

interface ServicesWithAnimationProps {
  services: Service[];
  locale: Locale;
  isRTL: boolean;
}

export function ServicesWithAnimation({
  services,
  locale,
  isRTL,
}: ServicesWithAnimationProps) {
  const marketPrefix = useMarketPrefix();
  return (
    <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
      <div className="mb-8 section-shell md:mb-12">
        <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">
          {isRTL ? "خدماتنا" : "Our Services"}
        </h2>
      </div>
      <div className="section-shell">
        <ServicesSlider services={services} locale={locale} isRTL={isRTL} />
      </div>
      <div className="mt-8 section-shell pb-8">
        <a
          href={`${marketPrefix}/${locale}/services`}
          className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-bold tracking-[0.1em] text-brand-primary uppercase transition-colors hover:text-brand-primary/70"
        >
          {isRTL ? "جميع الخدمات" : "View All Services"}
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
