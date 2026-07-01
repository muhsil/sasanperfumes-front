import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import Image from "next/image";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getBrands, getBrandsPageSettings, getFeatureToggles, pickLocale } from "@/lib/api/wordpress";
import { decodeHtmlEntities } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getMarketHintFromSearchParams, getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BrandsPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: BrandsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_brands_page_enabled) return {};
  const pageSettings = await getBrandsPageSettings();
  const title = pickLocale(pageSettings?.seo?.title, locale, "") ||
    pickLocale(pageSettings?.title, locale, lang === "ar" ? "علاماتنا التجارية" : "Our Brands");
  const description = pickLocale(pageSettings?.seo?.description, locale, "") ||
    pickLocale(pageSettings?.description, locale, "");

  const market = await getRequestMarket();
  return generateSeoMetadata({
    title,
    description,
    locale: lang,
    pathname: "/brands",
    marketCode: market.code,
  });
}

export default async function BrandsPage({ params, searchParams }: BrandsPageProps) {
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const market = await getRequestMarket(marketHint);
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const isRTL = locale === "ar";

  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_brands_page_enabled) notFound();

  const [brands, pageSettings] = await Promise.all([
    getBrands(),
    getBrandsPageSettings(),
  ]);

  const title = pickLocale(pageSettings?.title, locale, isRTL ? "علاماتنا التجارية" : "Our Brands");
  const subtitle = decodeHtmlEntities(pickLocale(pageSettings?.subtitle, locale, ""));
  const description = decodeHtmlEntities(pickLocale(pageSettings?.description, locale, ""));
  const decodedTitle = decodeHtmlEntities(title);

  const breadcrumbItems = [
    { name: isRTL ? "العلامات التجارية" : "Brands", href: `${pathPrefix}/${locale}/brands` },
  ];

  return (
    <main>
      <PageHeader title={decodedTitle} subtitle={subtitle} description={description} isRTL={isRTL} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Brand Grid */}
      <section className="bg-brand-beige px-4 pb-12 pt-4 md:pb-16 md:pt-6 lg:pb-20 lg:pt-8">
        <div>
          {brands.length > 0 ? (
            <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 md:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
              {brands.map((brand) => {
                const brandName = decodeHtmlEntities(brand.name || brand.slug);
                const brandDesc = decodeHtmlEntities(pickLocale(brand.shortDesc, locale, brand.description || ""));
                const brandImage = brand.image || brand.logo || brand.banner || "";
                return (
                  <Link
                    key={brand.id}
                    href={`${pathPrefix}/${locale}/brands/${brand.slug}`}
                    className="group flex min-h-full flex-col items-center text-center outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                  >
                    <div className="relative w-full max-w-[220px] p-2 sm:max-w-[240px] sm:p-3 md:p-4">
                      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(231,222,215,0.95)] transition-shadow duration-300 group-hover:shadow-[0_18px_45px_rgba(59,36,36,0.14)]">
                        {brandImage ? (
                          <Image
                            src={brandImage}
                            alt={brandName}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                            className="h-full w-full rounded-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            unoptimized={shouldUseUnoptimizedImage(brandImage)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white">
                            <span className="text-4xl font-normal text-brand-primary/20">{brandName[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full max-w-[260px] flex-1 flex-col items-center px-2 pb-2">
                      <h2 className="text-base font-normal leading-snug text-brand-primary md:text-lg">
                        {brandName}
                      </h2>
                      {brandDesc && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-primary/60 md:text-base">{brandDesc}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg text-brand-primary/50">{isRTL ? "لا توجد علامات تجارية حالياً" : "No brands available at the moment"}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
