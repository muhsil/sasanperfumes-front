import Link from "next/link";
import Image from "next/image";
import { BLUR_DATA_URL, decodeHtmlEntities } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { AdsSettings } from "@/types/wordpress";
import type { Locale } from "@/config/site";
import type { MarketCode } from "@/config/market";

interface AdsSectionProps {
  settings: AdsSettings;
  locale: Locale;
  marketCode: MarketCode;
  placement?: "home" | "shop" | "category" | "product" | "all";
  className?: string;
}

function matchesPlacement(itemPlacement: string | undefined, placement: string): boolean {
  const normalized = (itemPlacement || "all").trim().toLowerCase();
  return normalized === "all" || normalized === placement;
}

function matchesMarket(itemMarket: string | undefined, marketCode: MarketCode): boolean {
  const normalized = (itemMarket || "all").trim().toLowerCase();
  return normalized === "all" || normalized === marketCode;
}

function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count === 3) return "grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
}

export function AdsSection({
  settings,
  locale,
  marketCode,
  placement = "home",
  className = "",
}: AdsSectionProps) {
  if (!settings.enabled) return null;

  const ads = (settings.items ?? []).filter((ad) => {
    const hasContent = Boolean(ad.image?.url || ad.mobile_image?.url || ad.title || ad.subtitle || ad.link?.url);
    return hasContent && matchesPlacement(ad.placement, placement) && matchesMarket(ad.market, marketCode);
  });

  if (ads.length === 0) return null;

  const isArabic = locale === "ar";
  const buttonFallback = isArabic ? "\u062a\u0633\u0648\u0642 \u0627\u0644\u0622\u0646" : "Shop now";

  return (
    <section className={`lazy-section bg-transparent py-8 md:py-10 lg:py-12 ${className}`}>
      <div className="section-shell">
        <div className={`grid gap-4 ${getGridClass(ads.length)}`}>
          {ads.map((ad, index) => {
            const card = (
              <article className="group relative min-h-[22rem] overflow-hidden rounded-lg border border-brand-border/70 bg-stone-100 shadow-[0_20px_48px_rgba(20,15,10,0.08)]">
                {ad.image?.url ? (
                  <>
                    <Image
                      src={ad.image.url}
                      alt={decodeHtmlEntities(ad.image.alt || ad.title || `Ad ${index + 1}`)}
                      fill
                      quality={85}
                      sizes="(max-width: 767px) 100vw, 50vw"
                      className="hidden object-cover transition-transform duration-700 ease-out group-hover:scale-110 md:block"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      unoptimized={shouldUseUnoptimizedImage(ad.image.url)}
                    />
                    <Image
                      src={ad.mobile_image?.url || ad.image.url}
                      alt={decodeHtmlEntities(ad.mobile_image?.alt || ad.image.alt || ad.title || `Ad ${index + 1}`)}
                      fill
                      quality={85}
                      sizes="100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 md:hidden"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      unoptimized={shouldUseUnoptimizedImage(ad.mobile_image?.url || ad.image.url)}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-stone-100" aria-hidden="true" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <div className="mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
                    Sponsored
                  </div>
                  {ad.title && (
                    <h3 className="max-w-[16ch] font-title text-2xl leading-tight text-white sm:text-3xl">
                      {decodeHtmlEntities(ad.title)}
                    </h3>
                  )}
                  {ad.subtitle && (
                    <p className="mt-3 max-w-md text-sm leading-6 text-white/90 md:text-base">
                      {decodeHtmlEntities(ad.subtitle)}
                    </p>
                  )}
                  {(ad.link?.url || ad.button_text) && (
                    <div className="mt-5">
                      <span className="inline-flex items-center rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-brand-primary transition-transform duration-300 group-hover:translate-y-[-1px]">
                        {decodeHtmlEntities(ad.button_text || buttonFallback)}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );

            if (ad.link?.url) {
              return (
                <Link
                  key={`${ad.title || "ad"}-${index}`}
                  href={ad.link.url}
                  target={ad.link.target || "_self"}
                  className="block"
                >
                  {card}
                </Link>
              );
            }

            return <div key={`${ad.title || "ad"}-${index}`}>{card}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
