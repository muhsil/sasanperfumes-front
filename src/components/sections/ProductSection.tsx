"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { WCProductCard } from "@/components/shop/WCProductCard";
import { ProductGridSkeleton, SectionHeaderSkeleton } from "@/components/common/Skeleton";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import { getLocalizedMarketPath } from "@/lib/utils";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import type { ProductSectionSettings } from "@/types/wordpress";
import type { ProductSectionSliderProps } from "./ProductSectionSlider";

const ProductSectionSlider = dynamic<ProductSectionSliderProps>(
  () => import("./ProductSectionSlider").then((mod) => mod.ProductSectionSlider)
);

// Static class maps — Tailwind must see these strings to include them in the bundle
const MOBILE_COLS: Record<number, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3",
  4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6",
};
const TABLET_COLS: Record<number, string> = {
  1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3",
  4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6",
};
const DESKTOP_COLS: Record<number, string> = {
  1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3",
  4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6",
};

interface ProductSectionProps {
  settings: ProductSectionSettings;
  products: WCProduct[];
  locale: Locale;
  isRTL?: boolean;
  viewAllText?: string;
  className?: string;
  isLoading?: boolean;
  fullView?: boolean;
  hideSubtitleOnMobile?: boolean;
  bundleProductSlugs?: string[];
  englishProductSlugs?: Record<number, string>;
}

export function ProductSectionSkeleton({ count = 5, fullView = false }: { count?: number; fullView?: boolean }) {
  return (
    <section className={fullView ? "bg-transparent py-7 md:py-9 lg:py-10" : "bg-transparent pb-0 pt-8 md:pt-9 lg:pt-10"}>
      <div className="section-shell">
        <div className="mb-4 md:mb-5">
          <SectionHeaderSkeleton />
        </div>
        <ProductGridSkeleton count={count} />
      </div>
    </section>
  );
}

export function ProductSection({
  settings,
  products,
  locale,
  isRTL = false,
  viewAllText = "View All",
  className = "",
  isLoading = false,
  fullView = false,
  hideSubtitleOnMobile = false,
  bundleProductSlugs = [],
  englishProductSlugs = {},
}: ProductSectionProps) {
  const marketPrefix = useMarketPrefix();

  if (isLoading) {
    return <ProductSectionSkeleton count={settings.products_count || 4} fullView={fullView} />;
  }

  if (!settings.enabled || products.length === 0) {
    return null;
  }

  // Reorder products based on selected slugs, then enforce count limit
  const selectedSlugs = settings.selected_product_slugs ?? [];
  let orderedProducts = products;
  if (selectedSlugs.length > 0) {
    const productsBySlug = new Map(products.map(p => [p.slug, p]));
    const ordered: WCProduct[] = [];
    for (const slug of selectedSlugs) {
      const product = productsBySlug.get(slug);
      if (product) ordered.push(product);
    }
    // Append remaining products not in selected list
    for (const product of products) {
      if (!selectedSlugs.includes(product.slug)) ordered.push(product);
    }
    orderedProducts = ordered;
  }
  const displayProducts = orderedProducts.slice(0, settings.products_count);

  const rawViewAllLink = settings.view_all_link ?? "/shop";
  const viewAllLink =
    rawViewAllLink.startsWith("http://") || rawViewAllLink.startsWith("https://")
      ? rawViewAllLink
      : getLocalizedMarketPath(rawViewAllLink, locale, marketPrefix);

  const getVisibilityClass = () => {
    if (settings.hide_on_mobile && settings.hide_on_desktop) return "hidden";
    if (settings.hide_on_mobile) return "hidden md:block";
    if (settings.hide_on_desktop) return "md:hidden";
    return "";
  };

  const cols = settings.responsive_columns ?? { desktop: 5, tablet: 3, mobile: 2 };
  const isGrid = settings.display === 'grid';
  const sliderNavPrefix = settings.section_title?.replace(/\s+/g, "-").toLowerCase() || "default";

  const sectionClass = fullView
    ? `bg-transparent py-7 md:py-9 lg:py-10 ${className} ${getVisibilityClass()}`
    : `bg-transparent pb-0 pt-8 md:pt-9 lg:pt-10 ${className} ${getVisibilityClass()}`;

  return (
    <section className={`${sectionClass} lazy-section`}>
      <div className="section-shell">
        <div className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between">
          <div className={isRTL ? "text-right" : "text-left"}>
            <h2 className="font-title text-xl text-brand-primary md:text-2xl">
              {settings.section_title}
            </h2>
            {settings.section_subtitle && (
              <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted ${hideSubtitleOnMobile ? "hidden md:block" : ""}`}>
                {settings.section_subtitle}
              </p>
            )}
          </div>
          {settings.show_view_all && (
            <Link
              href={viewAllLink}
              className="hidden rounded-full border border-brand-border/70 bg-brand-ivory px-4 py-2 text-[11px] font-semibold uppercase text-brand-primary transition-colors hover:border-brand-primary/45 hover:bg-brand-beige md:inline-flex"
            >
              {viewAllText}
            </Link>
          )}
        </div>
      </div>

      {isGrid ? (
        /* Grid layout */
        <div className={`grid gap-4 section-shell pb-1 ${MOBILE_COLS[cols.mobile] ?? "grid-cols-2"} ${TABLET_COLS[cols.tablet] ?? "sm:grid-cols-3"} ${DESKTOP_COLS[cols.desktop] ?? "lg:grid-cols-5"}`}>
          {displayProducts.map((product) => (
            <WCProductCard key={product.id} product={product} locale={locale} bundleProductSlugs={bundleProductSlugs} englishSlug={englishProductSlugs[product.id]} />
          ))}
        </div>
      ) : (
        <ProductSectionSlider
          products={displayProducts}
          locale={locale}
          isRTL={isRTL}
          cols={cols}
          autoplay={Boolean(settings.autoplay)}
          autoplayDelay={settings.autoplay_delay || 4000}
          sliderNavPrefix={sliderNavPrefix}
          bundleProductSlugs={bundleProductSlugs}
          englishProductSlugs={englishProductSlugs}
        />
      )}
    </section>
  );
}
