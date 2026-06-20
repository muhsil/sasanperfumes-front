import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getNewProducts, getFreeGiftProductIds, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getPageSeo } from "@/lib/api/wordpress";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { NewProductsClient } from "./NewProductsClient";
import { getMarketPathPrefix } from "@/config/market";

export const revalidate = 300;

interface NewProductsPageProps {
  params: Promise<{ locale: string }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  title: { en: "New Arrivals | Latest Luxury Perfumes & Oud Fragrances", ar: "منتجات جديدة | أحدث العطور والإصدارات الفاخرة" },
  description: {
    en: "Discover our newest luxury perfumes, Arabian oud & aromatic oils from ShapeHive. Handcrafted in the UAE. Free delivery on orders over 500 AED.",
    ar: "اكتشف أحدث إصداراتنا من العطور الفاخرة والعود العربي والزيوت العطرية من شيب هايف. منتجات يدوية فاخرة من الإمارات. توصيل مجاني للطلبات فوق 500 درهم.",
  },
  keywords: {
    en: ["new perfumes", "latest fragrances", "new arrivals perfume", "premium fragrance", "aromatic products", "UAE perfume", "new oud perfume", "latest Dubai perfume", "new women perfume", "new men cologne", "luxury perfume new arrival", "new musk perfume", "new amber fragrance", "latest Arabian perfume", "new vanilla perfume", "new perfume online", "new home fragrance", "new aromatic perfumes", "latest aromatic scents", "aromatic new arrivals", "new fragrance launch aromatic UAE"],
    ar: ["عطور جديدة", "أحدث العطور", "عطور فاخرة", "منتجات عطرية جديدة", "إصدارات جديدة", "عطور الإمارات", "عود عربي جديد", "عطور دبي الجديدة", "شراء عطور جديدة", "عطور نسائية جديدة", "عطور رجالية جديدة", "عطور مسك جديدة", "عطور عنبر جديدة", "أحدث عطور عربية", "عطور فانيلا جديدة", "عطور جديدة اون لاين", "معطرات منزل جديدة", "عطور أروماتيك جديدة", "أحدث إصدارات أروماتيك", "وصل حديثاً أروماتيك", "إطلاق عطور أروماتيك الإمارات"],
  },
};

export async function generateMetadata({
  params,
}: NewProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";

  const wpSeo = await getPageSeo("new-products", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || (isAr ? defaultSeo.title.ar : defaultSeo.title.en),
    description: wpSeo?.description || (isAr ? defaultSeo.description.ar : defaultSeo.description.en),
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/new-products",
    keywords: isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en,
  });
}

export default async function NewProductsPage({ params }: NewProductsPageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);
  const pathPrefix = getMarketPathPrefix(market.code);

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
        <h1 className="font-title text-[30px] leading-none text-brand-primary md:text-5xl">
          {dictionary.sections.newProducts.title}
        </h1>
        <p className="mt-2 text-sm text-brand-muted md:mt-3 md:text-base">
          {isRTL
            ? "اكتشف أحدث منتجاتنا"
            : "Discover our latest arrivals"}
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
