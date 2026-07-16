import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, buildMarketSeoKeywords, getMarketSeoAudience, getMarketSeoLocation } from "@/lib/utils/seo";
import { getNewProducts, getFreeGiftProductIds, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getPageSeo } from "@/lib/api/wordpress";
import { getMarketHintFromSearchParams, getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { NewProductsClient } from "./NewProductsClient";
import { getMarketPathPrefix } from "@/config/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NewProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  description: {
    en: "Discover our newest luxury perfumes, Arabian oud & aromatic oils from Sasan Perfumes. Handcrafted in the UAE with fast delivery across our markets.",
    ar: "اكتشف أحدث إصداراتنا من العطور الفاخرة والعود العربي والزيوت العطرية من Sasan Perfumes. منتجات يدوية فاخرة من الإمارات مع توصيل سريع عبر أسواقنا.",
  },
  keywords: {
    en: ["new perfumes", "latest fragrances", "new arrivals perfume", "viral perfume launch", "top new perfume", "gen z fragrance", "gen z trending perfume", "trending perfume", "premium fragrance", "aromatic products", "UAE perfume", "new oud perfume", "latest Dubai perfume", "new women perfume", "new men cologne", "luxury perfume new arrival", "new musk perfume", "new amber fragrance", "latest Arabian perfume", "new vanilla perfume", "new perfume online", "new home fragrance", "new aromatic perfumes", "latest aromatic scents", "aromatic new arrivals", "new fragrance launch aromatic UAE"],
    ar: ["عطور جديدة", "أحدث العطور", "عطور فيرال", "عطور ترند", "عطور جيل زد", "عطور جيل زد ترندي", "عطور ترندي جديدة", "عطور فاخرة", "منتجات عطرية جديدة", "إصدارات جديدة", "عطور الإمارات", "عود عربي جديد", "عطور دبي الجديدة", "شراء عطور جديدة", "عطور نسائية جديدة", "عطور رجالية جديدة", "عطور مسك جديدة", "عطور عنبر جديدة", "أحدث عطور عربية", "عطور فانيلا جديدة", "عطور جديدة اون لاين", "معطرات منزل جديدة", "عطور أروماتيك جديدة", "أحدث إصدارات أروماتيك", "وصل حديثاً أروماتيك", "إطلاق عطور أروماتيك الإمارات"],
  },
};

export async function generateMetadata({
  params,
}: NewProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";

  const market = await getRequestMarket();
  const marketLocation = getMarketSeoLocation(market.code, lang);
  const marketAudience = getMarketSeoAudience(market.code, lang);
  const defaultTitle = isAr
    ? `أحدث الإصدارات في ${marketLocation} | أحدث العطور الفاخرة والإصدارات الجديدة`
    : `New Arrivals in ${marketLocation} | Latest Luxury Perfumes & Oud Fragrances`;
  const fallbackDescription = isAr
    ? `اكتشف أحدث إصداراتنا من العطور الفاخرة والعود العربي والزيوت العطرية من Sasan Perfumes ${marketLocation}. منتجات يدوية فاخرة مع توصيل سريع عبر أسواقنا.`
    : `Discover our newest luxury perfumes, Arabian oud & aromatic oils from Sasan Perfumes ${marketLocation}. Built for ${marketAudience} with fast delivery across our markets.`;
  const wpSeo = await getPageSeo("new-products", lang);
  return generateSeoMetadata({
    title: defaultTitle,
    description: fallbackDescription,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/new-products",
    keywords: buildMarketSeoKeywords(isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en, market.code, lang),
    marketCode: market.code,
  });
}

export default async function NewProductsPage({ params, searchParams }: NewProductsPageProps) {
  const { locale } = await params;
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(marketHint),
    getRequestFrontendHost(marketHint),
  ]);
  const pathPrefix = getMarketPathPrefix(market.code);
  const marketLocation = getMarketSeoLocation(market.code, locale as Locale);

  const breadcrumbItems = [
    { name: dictionary.common.shop, href: `${pathPrefix}/${locale}/shop` },
    { name: dictionary.sections.newProducts.title, href: `${pathPrefix}/${locale}/new-products` },
  ];

  const [productsResult, giftProductIds, bundleProductSlugs] = await Promise.all([
    getNewProducts({
      per_page: 30,
      locale: locale as Locale,
      currency: market.defaultCurrency,
      frontendHost,
    }),
    getFreeGiftProductIds(market.defaultCurrency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const filteredProducts = productsResult.products.filter(
    (product) => !giftProductIds.includes(product.id)
  );

  const filteredTotal = productsResult.total - (productsResult.products.length - filteredProducts.length);

  return (
    <div className="page-flush container mx-auto px-4 py-2 md:py-3">
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

      <div className="mb-4 md:mb-6">
        <h1 className="font-title text-3xl leading-none text-brand-primary md:text-5xl">
          {dictionary.sections.newProducts.title}
        </h1>
        <p className="mt-2 text-sm text-brand-muted md:mt-3 md:text-base">
          {isRTL
            ? `اكتشف أحدث الإصدارات في ${marketLocation}`
            : `Discover our latest arrivals in ${marketLocation}`}
        </p>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={12} columns={6} />}>
        <NewProductsClient
          products={filteredProducts}
          locale={locale as Locale}
          initialTotal={filteredTotal}
          giftProductIds={giftProductIds}
          bundleProductSlugs={bundleProductSlugs}
        />
      </Suspense>
    </div>
  );
}

