import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/common/Skeleton";
import { BLUR_DATA_URL, decodeHtmlEntities } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { BannersSettings } from "@/types/wordpress";

// Static class maps — Tailwind must see these strings to include them in the bundle
const MOBILE_COLS: Record<number, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4",
};
const TABLET_COLS: Record<number, string> = {
  1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4",
};
const DESKTOP_COLS: Record<number, string> = {
  1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4",
};

interface BannersSectionProps {
  settings: BannersSettings;
  className?: string;
  isLoading?: boolean;
}

function BannerSkeleton() {
  return (
    <div className="relative min-h-[48svh] w-full overflow-hidden rounded-lg sm:min-h-[50svh] lg:min-h-[56svh]">
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/images/sasanperfumes-placeholder.svg"
          alt="Loading"
          width={150}
          height={150}
          className="object-contain opacity-20"
        />
      </div>
    </div>
  );
}

export function BannersSectionSkeleton({ count = 2 }: { count?: number }) {
  const getGridClass = () => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  };

  return (
    <section className="bg-brand-beige py-8 md:py-10 lg:py-12">
      <div>
        <div className={`grid gap-4 px-5 md:px-7 lg:px-12 ${getGridClass()}`}>
          {Array.from({ length: count }).map((_, i) => (
            <BannerSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BannersSection({
  settings,
  className = "",
  isLoading = false,
}: BannersSectionProps) {
  if (isLoading) {
    return <BannersSectionSkeleton count={2} />;
  }

  const banners = settings.banners ?? [];

  if (!settings.enabled || banners.length === 0) {
    return null;
  }

  const bannerCount = banners.length;

  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) return "hidden";
    if (settings.hide_on_mobile) return "hidden md:block";
    if (settings.hide_on_desktop) return "md:hidden";
    return "";
  };

  // Use API-driven responsive columns when available; fall back to count-based logic
  const getGridClass = () => {
    const rc = settings.responsive_columns;
    if (rc) {
      return [
        MOBILE_COLS[rc.mobile] ?? "grid-cols-1",
        TABLET_COLS[rc.tablet] ?? "md:grid-cols-2",
        DESKTOP_COLS[rc.desktop] ?? "lg:grid-cols-2",
      ].join(" ");
    }
    if (bannerCount === 1) return "grid-cols-1";
    if (bannerCount === 2) return "grid-cols-1 md:grid-cols-2";
    if (bannerCount === 3) return "grid-cols-1 md:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  };

  return (
    <section className={`lazy-section bg-brand-beige py-8 md:py-10 lg:py-12 ${className} ${getVisibilityClass()}`}>
      <div>
        <div className={`grid gap-4 px-5 md:px-7 lg:px-12 ${getGridClass()}`}>
          {banners.map((banner, index) => {
            const BannerContent = (
              <div className="group relative min-h-[48svh] overflow-hidden rounded-lg border border-brand-border/70 bg-stone-200 shadow-[0_20px_48px_rgba(20,15,10,0.1)] sm:min-h-[50svh] lg:min-h-[56svh]">
                {banner.image?.url ? (
                  <>
                      <Image
                        src={banner.image.url}
                        alt={decodeHtmlEntities(banner.image.alt || banner.title || `Banner ${index + 1}`)}
                        fill
                        quality={85}
                        sizes="(max-width: 767px) 100vw, 50vw"
                        className="hidden object-cover transition-transform duration-700 ease-out group-hover:scale-110 md:block"
                        loading={index < 2 ? "eager" : "lazy"}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        unoptimized={shouldUseUnoptimizedImage(banner.image.url)}
                      />
                      <Image
                        src={banner.mobile_image?.url || banner.image.url}
                        alt={decodeHtmlEntities(banner.mobile_image?.alt || banner.image.alt || banner.title || `Banner ${index + 1}`)}
                        fill
                        quality={85}
                        sizes="100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 md:hidden"
                        loading={index < 2 ? "eager" : "lazy"}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        unoptimized={shouldUseUnoptimizedImage(banner.mobile_image?.url || banner.image.url)}
                      />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-200">
                    <Image
                      src="/images/sasanperfumes-placeholder.svg"
                      alt="Sasan Perfumes"
                      width={150}
                      height={150}
                      className="object-contain opacity-20"
                    />
                  </div>
                )}
                {(banner.title || banner.subtitle) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-700 group-hover:opacity-90" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 lg:p-10">
                      {banner.title && (
                        <h3 className="max-w-[14ch] font-title text-2xl leading-none text-white sm:text-3xl lg:text-4xl">
                          {decodeHtmlEntities(banner.title)}
                        </h3>
                      )}
                      {banner.subtitle && (
                        <div className="mt-4 max-w-md opacity-100 transition-all duration-500 ease-out">
                          <div className="mb-3 h-px w-10 bg-white/80" />
                          <p className="text-sm leading-relaxed text-white/90 md:text-base">
                            {decodeHtmlEntities(banner.subtitle)}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );

            if (banner.link?.url) {
              return (
                <Link
                  key={index}
                  href={banner.link.url}
                  target={banner.link.target || "_self"}
                  className="block"
                >
                  {BannerContent}
                </Link>
              );
            }

            return <div key={index}>{BannerContent}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
