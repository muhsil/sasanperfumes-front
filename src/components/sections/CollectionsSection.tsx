import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/common/Skeleton";
import { BLUR_DATA_URL, decodeHtmlEntities, getLocalizedMarketPath } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { CollectionsSettings } from "@/types/wordpress";

// Static class maps — Tailwind must see these strings to include them in the bundle
const MOBILE_COLS: Record<number, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4",
};
const TABLET_COLS: Record<number, string> = {
  1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4",
};
const DESKTOP_COLS: Record<number, string> = {
  1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5",
};

interface CollectionsSectionProps {
  settings: CollectionsSettings;
  locale?: Locale;
  marketPrefix?: string;
  className?: string;
  isLoading?: boolean;
}

function CollectionCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-[3/4] w-full" />
    </div>
  );
}

export function CollectionsSectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="bg-brand-primary py-8 md:py-10 lg:py-12">
      <div className="grid grid-cols-1 gap-4 section-shell">
        {Array.from({ length: count }).map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function CollectionsSection({
  settings,
  locale = "en",
  marketPrefix = "",
  className = "",
  isLoading = false,
}: CollectionsSectionProps) {
  if (isLoading) {
    return <CollectionsSectionSkeleton count={3} />;
  }

  if (!settings.enabled || settings.collections.length === 0) {
    return null;
  }

  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) return "hidden";
    if (settings.hide_on_mobile) return "hidden md:block";
    if (settings.hide_on_desktop) return "md:hidden";
    return "";
  };

  const cols = settings.responsive_columns ?? { desktop: 3, tablet: 2, mobile: 1 };
  const gridClass = [
    "grid gap-4 section-shell",
    MOBILE_COLS[cols.mobile] ?? "grid-cols-1",
    TABLET_COLS[cols.tablet] ?? "md:grid-cols-2",
    DESKTOP_COLS[cols.desktop] ?? "lg:grid-cols-3",
  ].join(" ");

  return (
    <section className={`bg-brand-primary py-8 text-brand-ivory md:py-10 lg:py-12 ${className} ${getVisibilityClass()}`}>
      <div>
        {(settings.section_title || settings.section_subtitle) && (
          <div className="mb-5 md:mb-6 section-shell">
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
        )}

      <div className={gridClass}>
        {settings.collections.map((collection, index) => (
          <Link
            key={index}
            href={collection.link?.url ? getLocalizedMarketPath(collection.link.url, locale, marketPrefix) : "#"}
            target={collection.link?.target || "_self"}
            className="group relative flex flex-col overflow-hidden"
          >
            <div className="relative min-h-[52svh] overflow-hidden rounded-lg bg-brand-beige md:min-h-[50svh] lg:min-h-[54svh]">
              {collection.image?.url ? (
                <Image
                  src={collection.image.url}
                  alt={decodeHtmlEntities(collection.image.alt || collection.title)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="z-0 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  unoptimized={shouldUseUnoptimizedImage(collection.image.url)}
                />
              ) : (
                <div className="absolute inset-0 bg-stone-200" />
              )}
              <div className="absolute inset-0 z-10 bg-black/38 transition-colors duration-700 ease-out group-hover:bg-black/68" />
              <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-linear-to-t from-black/72 to-transparent transition-opacity duration-700 ease-out group-hover:opacity-100" />
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-8">
                <h3 className="max-w-[12ch] font-title text-3xl leading-tight text-white drop-shadow-md md:text-4xl">
                  {decodeHtmlEntities(collection.title)}
                </h3>
                <div className="translate-y-0 transition-transform duration-700 ease-out group-hover:translate-y-0">
                  {collection.description && (
                    <p className="line-clamp-3 max-w-md text-sm leading-relaxed text-white/90 opacity-100 transition-all duration-700 ease-out group-hover:opacity-100 md:text-base">
                      {decodeHtmlEntities(collection.description)}
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
        ))}
      </div>
      </div>
    </section>
  );
}
