import { Suspense } from "react";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { SearchResultsClient } from "./SearchResultsClient";
import { SearchPageLoadingShell } from "@/components/common/RouteLoading";
import { getFreeGiftProductIds, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getPageSeo } from "@/lib/api/wordpress";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  title: { en: "Search Fragrances & Perfumes", ar: "البحث في العطور" },
  description: {
    en: "Search our extensive collection of premium fragrances, aromatic oils, body care products, and home fragrances",
    ar: "ابحث في مجموعتنا الواسعة من العطور الفاخرة والزيوت العطرية ومنتجات العناية بالجسم ومعطرات المنزل",
  },
  keywords: {
    en: ["search perfumes", "find fragrances", "aromatic products", "perfume search", "search aromatic perfumes", "find aromatic scents", "aromatic fragrance finder", "discover aromatic products UAE"],
    ar: ["بحث عطور", "عطور فاخرة", "زيوت عطرية", "منتجات عطرية", "بحث عطور أروماتيك", "اعثر على روائح أروماتيك", "دليل عطور أروماتيك", "اكتشف منتجات أروماتيك الإمارات"],
  },
};

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const lang = locale as Locale;
  const isAr = lang === "ar";

  const wpSeo = await getPageSeo("search", lang);

  // For search pages with a query, use dynamic title; for base search page, use WordPress or fallback
  const title = query
    ? (isAr ? `نتائج البحث عن: ${query}` : `Search results for: ${query}`)
    : (wpSeo?.title || (isAr ? defaultSeo.title.ar : defaultSeo.title.en));

  const market = await getRequestMarket();
  return generateSeoMetadata({
    title,
    description: wpSeo?.description || (isAr ? defaultSeo.description.ar : defaultSeo.description.en),
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/search",
    noIndex: true,
    keywords: isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en,
    marketCode: market.code,
  });
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  // Fetch hidden gift product IDs and bundle product slugs in parallel
  const [hiddenGiftProductIds, bundleProductSlugs] = await Promise.all([
    getFreeGiftProductIds(market.defaultCurrency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  return (
    <Suspense fallback={<SearchPageLoadingShell />}>
      <SearchResultsClient 
        locale={locale as Locale} 
        initialQuery={query}
        hiddenGiftProductIds={hiddenGiftProductIds}
        bundleProductSlugs={bundleProductSlugs}
      />
    </Suspense>
  );
}
