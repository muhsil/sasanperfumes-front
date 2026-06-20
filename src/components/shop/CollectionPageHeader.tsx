import Image from "next/image";
import Link from "next/link";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import type { Locale } from "@/config/site";
import type { WCCategory } from "@/types/woocommerce";
import { CategoriesCarousel } from "./CategoriesCarousel";

interface CollectionPageHeaderProps {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  locale: Locale;
  categories?: WCCategory[];
  className?: string;
}

function stripHtml(value?: string | null): string {
  if (!value) return "";
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

export function CollectionPageHeader({
  title,
  subtitle,
  description,
  image,
  locale,
  categories = [],
  className,
}: CollectionPageHeaderProps) {
  const isRTL = locale === "ar";
  const visibleCategories = categories.filter((category) => category.count > 0).slice(0, 8);
  const cleanDescription = stripHtml(description);

  return (
    <section
      className={cn("section-band text-brand-primary", className)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {visibleCategories.length > 0 && (
        <div className="mb-0 border-b border-brand-border/70 bg-brand-beige/45 py-4 md:py-6">
          <div className="md:hidden">
            <CategoriesCarousel categories={visibleCategories} locale={locale as Locale} />
          </div>

          <div className="hidden justify-center gap-6 md:flex md:gap-8">
            {visibleCategories.map((category) => (
            <Link
              key={category.id}
              href={`/${locale}/category/${category.slug}`}
              className="group flex shrink-0 flex-col items-center gap-3 text-center"
            >
              <span className="relative block h-[72px] w-[72px] overflow-hidden rounded-full bg-brand-beige ring-1 ring-brand-border transition-all duration-300 group-hover:ring-brand-primary/30 md:h-[78px] md:w-[78px]">
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
              <span className="max-w-[92px] text-[12px] font-semibold leading-tight text-brand-primary">
                {decodeHtmlEntities(category.name)}
              </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 py-6 md:flex-row md:items-start md:gap-8 md:py-8 lg:gap-12">
        {image && (
          <div className="shrink-0">
            <Image
              src={image}
              alt={decodeHtmlEntities(title)}
              width={320}
              height={320}
              className="h-[280px] w-[280px] rounded-lg border border-brand-border/70 object-cover shadow-[0_18px_44px_rgba(20,15,10,0.1)] md:h-[320px] md:w-[320px]"
            />
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-title text-[24px] leading-none text-brand-primary md:text-[36px]">
            {decodeHtmlEntities(title)}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base font-semibold text-brand-gold md:text-lg">
              {subtitle}
            </p>
          )}
          {cleanDescription && (
            <p className="mt-3 max-w-[660px] text-sm leading-6 text-brand-muted md:mt-5 md:text-base md:leading-7">
              {cleanDescription}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
