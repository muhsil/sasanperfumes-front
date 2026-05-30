import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getFeaturedProducts, getFreeGiftProductIds, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getPageSeo } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { FeaturedProductsClient } from "./FeaturedProductsClient";

export const revalidate = 300;

interface FeaturedProductsPageProps {
  params: Promise<{ locale: string }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  title: { en: "Best Sellers | Top Rated Luxury Perfumes & Oud Fragrances", ar: "الأكثر مبيعاً | أفضل العطور الفاخرة والمميزة" },
  description: {
    en: "Shop our best-selling luxury perfumes, Arabian oud & aromatic oils from Sasan Perfumes. Handcrafted in the UAE. Free delivery on orders over 500 AED.",
    ar: "تسوق أفضل العطور المميزة والأكثر مبيعاً من ساسان للعطور. عطور فاخرة وعود عربي وزيوت عطرية مصنوعة يدوياً في الإمارات. توصيل مجاني للطلبات فوق 500 درهم.",
  },
  keywords: {
    en: ["featured perfumes", "best sellers", "top fragrances", "luxury perfume", "Arabian perfume", "fragrance gifts", "popular Dubai perfume", "best UAE perfume", "top rated oud", "luxury gift sets", "bestselling cologne", "best musk perfume", "best amber perfume", "top Arabian fragrance", "luxury perfume online", "trending perfume", "premium Dubai fragrance", "aromatic bestsellers", "top aromatic perfumes UAE", "most popular aromatic scents", "best aromatic fragrance"],
    ar: ["عطور مميزة", "الأكثر مبيعاً", "أفضل العطور", "عطور فاخرة", "عطور عربية", "هدايا عطرية", "عطور دبي المميزة", "أفضل عطور الإمارات", "عطور شعبية", "عود فاخر", "مجموعات هدايا", "عطور مسك مميزة", "عطور عنبر فاخرة", "أفضل عطور عربية", "عطور فاخرة أون لاين", "عطور رائجة", "عطور فخمة دبي", "أفضل عطور أروماتيك", "عطور أروماتيك الأكثر مبيعاً", "أشهر روائح أروماتيك", "عطور أروماتيك المميزة"],
  },
};

export async function generateMetadata({
  params,
}: FeaturedProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";

  const wpSeo = await getPageSeo("featured-products", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || (isAr ? defaultSeo.title.ar : defaultSeo.title.en),
    description: wpSeo?.description || (isAr ? defaultSeo.description.ar : defaultSeo.description.en),
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/featured-products",
    keywords: isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en,
  });
}

export default async function FeaturedProductsPage({ params }: FeaturedProductsPageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";

  const breadcrumbItems = [
    { name: dictionary.common.shop, href: `/${locale}/shop` },
    { name: dictionary.sections.featuredProducts.title, href: `/${locale}/featured-products` },
  ];

  const [productsResult, giftProductIds, bundleProductSlugs] = await Promise.all([
    getFeaturedProducts({ per_page: 30, locale: locale as Locale }),
    getFreeGiftProductIds(),
    getBundleEnabledProductSlugs(),
  ]);

  const filteredProducts = productsResult.products.filter(
    (product) => !giftProductIds.includes(product.id)
  );

  const filteredTotal = productsResult.total - (productsResult.products.length - filteredProducts.length);

  return (
    <div className="container mx-auto px-5 md:px-7 lg:px-12 py-3">
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

      <div className="mb-6">
        <h1 className="font-title text-4xl text-brand-primary md:text-5xl">
          {dictionary.sections.featuredProducts.title}
        </h1>
        <p className="mt-3 text-brand-muted">
          {isRTL
            ? "اكتشف منتجاتنا المميزة"
            : "Discover our best sellers"}
        </p>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={15} columns={5} />}>
        <FeaturedProductsClient
          products={filteredProducts}
          locale={locale as Locale}
          initialTotal={filteredTotal}
          initialTotalPages={productsResult.totalPages}
          giftProductIds={giftProductIds}
          bundleProductSlugs={bundleProductSlugs}
        />
      </Suspense>
    </div>
  );
}
