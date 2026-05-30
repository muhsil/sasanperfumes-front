import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { CollectionPageHeader } from "@/components/shop/CollectionPageHeader";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getProducts, getFreeGiftProductInfo, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getPageSeo, getStaticPageContent, pickLocale, getFeatureToggles } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { ShopClient } from "./ShopClient";

// Increased revalidate time for better cache hit rates (5 minutes instead of 60 seconds)
export const revalidate = 300;
const SHOP_PRODUCTS_PER_PAGE = 30;

interface ShopPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  title: { en: "Shop All Premium Perfumes, Oud & Home Fragrances Online", ar: "تسوق العطور الفاخرة والزيوت العطرية أون لاين" },
  description: {
    en: "Browse our complete collection of luxury perfumes, Arabian oud, aromatic oils, body care & home fragrances. Handcrafted in the UAE. Free shipping on orders over 500 AED.",
    ar: "تصفح مجموعتنا الكاملة من العطور الفاخرة والعود العربي والزيوت العطرية ومنتجات العناية بالجسم ومعطرات المنزل. منتجات يدوية فاخرة من الإمارات. شحن مجاني للطلبات فوق 500 درهم.",
  },
  keywords: {
    en: ["shop perfumes", "buy fragrances online", "aromatic oils", "body care products", "home fragrances", "Arabian perfume", "UAE perfume shop", "luxury perfume online", "oud perfume", "bakhoor incense", "women perfume UAE", "men cologne Dubai", "perfume gift sets", "natural fragrance Dubai", "buy perfume UAE", "musk perfume", "amber perfume", "vanilla perfume", "leather perfume", "sandalwood fragrance", "best perfume online store", "niche perfume UAE", "aromatic perfume shop", "aromatic store UAE", "aromatic fragrance collection", "good perfume online", "affordable luxury perfume", "best smelling cologne", "perfume for men and women online", "fragrant body care products", "aromatic scented oils", "pleasant fragrance UAE"],
    ar: ["تسوق عطور", "عطور فاخرة", "زيوت عطرية", "عناية بالجسم", "معطرات منزل", "عطور عربية", "عطور إماراتية", "شراء عطور", "عود عربي", "بخور", "عطور نسائية", "عطور رجالية", "هدايا عطرية", "عطور طبيعية", "عطور دبي", "عطور مسك", "عطور عنبر", "عطور أصلية الإمارات", "متجر عطور أون لاين", "عطور فانيلا", "عطور جلد", "أفضل عطور الإمارات", "متجر أروماتيك للعطور", "متجر أروماتيك الإمارات", "مجموعة عطور أروماتيك", "عطر جيد أون لاين", "عطور فاخرة بأسعار مناسبة", "أفضل كولونيا عطرية", "عطور رجالية ونسائية أون لاين", "منتجات عناية معطرة", "زيوت معطرة أروماتيك", "رائحة عطرية مميزة الإمارات"],
  },
};

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_shop_enabled) return {};

  // Fetch SEO data from WordPress page (if exists)
  const wpSeo = await getPageSeo("shop", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || (isAr ? defaultSeo.title.ar : defaultSeo.title.en),
    description: wpSeo?.description || (isAr ? defaultSeo.description.ar : defaultSeo.description.en),
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/shop",
    keywords: isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en,
  });
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_shop_enabled) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const wp = await getStaticPageContent("shop");

  const subtitle = pickLocale(wp?.subtitle, locale,
    isRTL ? "اكتشف مجموعتنا الكاملة من المنتجات" : "Discover our complete collection of products"
  );

  const breadcrumbItems = [
    { name: dictionary.common.shop, href: `/${locale}/shop` },
  ];

  // Fetch products, gift product info (IDs and slugs), and bundle product slugs in parallel
  // Load enough products for a full fast-feeling first screen plus several rows.
  const [productsResult, giftProductInfo, bundleProductSlugs] = await Promise.all([
    getProducts({ per_page: SHOP_PRODUCTS_PER_PAGE, locale: locale as Locale }),
    getFreeGiftProductInfo(),
    getBundleEnabledProductSlugs(),
  ]);

  // Filter out gift products from the shop listing
  // Use both ID and slug matching to handle WPML translations (different IDs per locale)
  const giftProductSlugsSet = new Set(giftProductInfo.slugs);
  const giftProductIdsSet = new Set(giftProductInfo.ids);
  const filteredProducts = productsResult.products.filter(
    (product) => !giftProductIdsSet.has(product.id) && !giftProductSlugsSet.has(product.slug)
  );
  
  // Adjust total count to exclude gift products
  const filteredTotal = productsResult.total - (productsResult.products.length - filteredProducts.length);

  return (
    <div className="bg-transparent text-brand-primary">
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} className="sr-only" />

      <CollectionPageHeader
        title={dictionary.common.shop}
        description={subtitle}
        locale={locale as Locale}
      />

      <Suspense fallback={<ProductGridSkeleton count={15} columns={5} />}>
        <ShopClient
          products={filteredProducts}
          locale={locale as Locale}
          initialTotal={filteredTotal}
          initialTotalPages={productsResult.totalPages}
          giftProductIds={giftProductInfo.ids}
          giftProductSlugs={giftProductInfo.slugs}
          bundleProductSlugs={bundleProductSlugs}
        />
      </Suspense>
    </div>
  );
}
