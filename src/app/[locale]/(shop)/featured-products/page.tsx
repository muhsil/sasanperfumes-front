import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, buildMarketSeoKeywords, getMarketSeoAudience, getMarketSeoLocation } from "@/lib/utils/seo";
import { getFeaturedProducts, getFreeGiftProductIds, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getPageSeo } from "@/lib/api/wordpress";
import { getMarketHintFromSearchParams, getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { FeaturedProductsClient } from "./FeaturedProductsClient";
import { getMarketPathPrefix } from "@/config/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FeaturedProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  description: {
    en: "Shop our best-selling luxury perfumes, Arabian oud & aromatic oils from Sasan Perfumes. Handcrafted in the UAE with fast delivery across our markets.",
    ar: "تسوق أفضل العطور المميزة والأكثر مبيعاً من Sasan Perfumes. عطور فاخرة وعود عربي وزيوت عطرية مصنوعة يدوياً في الإمارات مع توصيل سريع عبر أسواقنا.",
  },
  keywords: {
    en: ["featured perfumes", "best sellers", "top fragrances", "viral perfume", "top perfumes", "gen z perfume", "luxury perfume", "Arabian perfume", "fragrance gifts", "popular Dubai perfume", "best UAE perfume", "top rated oud", "luxury gift sets", "bestselling cologne", "best musk perfume", "best amber perfume", "top Arabian fragrance", "luxury perfume online", "trending perfume", "premium Dubai fragrance", "aromatic bestsellers", "top aromatic perfumes UAE", "most popular aromatic scents", "best aromatic fragrance"],
    ar: ["عطور مميزة", "الأكثر مبيعاً", "أفضل العطور", "عطور فيرال", "عطور ترند", "عطور جيل زد", "عطور فاخرة", "عطور عربية", "هدايا عطرية", "عطور دبي المميزة", "أفضل عطور الإمارات", "عطور شعبية", "عود فاخر", "مجموعات هدايا", "عطور مسك مميزة", "عطور عنبر فاخرة", "أفضل عطور عربية", "عطور فاخرة أون لاين", "عطور رائجة", "عطور فخمة دبي", "أفضل عطور أروماتيك", "عطور أروماتيك الأكثر مبيعاً", "أشهر روائح أروماتيك", "عطور أروماتيك المميزة"],
  },
};

export async function generateMetadata({
  params,
}: FeaturedProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";

  const market = await getRequestMarket();
  const marketLocation = getMarketSeoLocation(market.code, lang);
  const marketAudience = getMarketSeoAudience(market.code, lang);
  const defaultTitle = isAr
    ? `الأكثر مبيعاً في ${marketLocation} | أفضل العطور الفاخرة والمميزة`
    : `Best Sellers in ${marketLocation} | Top Rated Luxury Perfumes & Oud Fragrances`;
  const fallbackDescription = isAr
    ? `تسوق أفضل العطور المميزة والأكثر مبيعاً من Sasan Perfumes ${marketLocation}. عطور فاخرة وعود عربي وزيوت عطرية مع توصيل سريع عبر أسواقنا.`
    : `Shop our best-selling luxury perfumes, Arabian oud & aromatic oils from Sasan Perfumes ${marketLocation}. Built for ${marketAudience} with fast delivery across our markets.`;
  const wpSeo = await getPageSeo("featured-products", lang);
  return generateSeoMetadata({
    title: defaultTitle,
    description: fallbackDescription,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/featured-products",
    keywords: buildMarketSeoKeywords(isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en, market.code, lang),
    marketCode: market.code,
  });
}

export default async function FeaturedProductsPage({ params, searchParams }: FeaturedProductsPageProps) {
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
    { name: dictionary.sections.featuredProducts.title, href: `${pathPrefix}/${locale}/featured-products` },
  ];

  const [productsResult, giftProductIds, bundleProductSlugs] = await Promise.all([
    getFeaturedProducts({
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
          {dictionary.sections.featuredProducts.title}
        </h1>
        <p className="mt-2 text-sm text-brand-muted md:mt-3 md:text-base">
          {isRTL
            ? `اكتشف أفضل العطور مبيعاً في ${marketLocation}`
            : `Discover our best sellers in ${marketLocation}`}
        </p>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={12} columns={6} />}>
        <FeaturedProductsClient
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

