import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getProducts, getProductBySlug, getBundleConfig } from "@/lib/api/woocommerce";
import { getPageSeo } from "@/lib/api/wordpress";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { BuildYourOwnSetClient } from "./BuildYourOwnSetClient";

export const revalidate = 300;

interface BuildYourOwnSetPageProps {
  params: Promise<{ locale: string }>;
}

// Default SEO values (fallback when WordPress page doesn't exist)
const defaultSeo = {
  title: { en: "Build Your Own Set | Custom Luxury Perfume Gift Bundle", ar: "اصنع مجموعتك | طقم عطور مخصص هدية فاخرة" },
  description: {
    en: "Create a unique fragrance gift set. Pick 3+ products from perfumes, oud, oils & home fragrances. The perfect luxury gift from ShapeHive. Free delivery over 500 AED.",
    ar: "أنشئ مجموعة عطور فريدة من اختيارك. اختر 3 منتجات أو أكثر من العطور والزيوت واللوشن ومعطرات المنزل. هدية مثالية من شيب هايف. توصيل مجاني للطلبات فوق 500 درهم.",
  },
  keywords: {
    en: ["custom fragrance set", "perfume gift set", "build your own perfume", "fragrance bundle", "perfume collection", "gift set", "luxury perfume gift", "perfume gift box", "custom perfume bundle", "birthday perfume gift", "wedding fragrance gift", "anniversary perfume set", "UAE perfume gift set", "oud gift set", "aromatic custom perfume set", "build your own aromatic gift", "personalized aromatic fragrance", "create aromatic gift box UAE"],
    ar: ["مجموعة عطور", "هدايا عطور", "عطور مخصصة", "حزمة عطور", "طقم عطور", "هدية عطرية", "هدية عطور فاخرة", "طقم عطور هدية", "مجموعة عطور مخصصة", "هدية عيد عطور", "هدية عيد ميلاد", "هدية زواج عطور", "عطور إماراتية هدية", "طقم عود عربي", "طقم عطور أروماتيك مخصص", "اصنع هدية أروماتيك", "مجموعة عطور أروماتيك شخصية", "علبة هدايا أروماتيك الإمارات"],
  },
};

export async function generateMetadata({
  params,
}: BuildYourOwnSetPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";

  const wpSeo = await getPageSeo("build-your-own-set", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || (isAr ? defaultSeo.title.ar : defaultSeo.title.en),
    description: wpSeo?.description || (isAr ? defaultSeo.description.ar : defaultSeo.description.en),
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/build-your-own-set",
    keywords: isAr ? defaultSeo.keywords.ar : defaultSeo.keywords.en,
  });
}

export default async function BuildYourOwnSetPage({
  params,
}: BuildYourOwnSetPageProps) {
  const { locale } = await params;
  const isRTL = locale === "ar";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  const breadcrumbItems = [
    {
      name: isRTL ? "المتجر" : "Shop",
      href: `/${locale}/shop`,
    },
    {
      name: isRTL ? "اصنع مجموعتك الخاصة" : "Build Your Own Set",
      href: `/${locale}/build-your-own-set`,
    },
  ];

  // Fetch all products for selection and bundle configuration in parallel
  // Pass locale to getBundleConfig to get correct product/category IDs for the current language
  const [{ products }, bundleProduct, bundleConfig] = await Promise.all([
    getProducts({
      per_page: 100,
      locale: locale as Locale,
      currency: market.defaultCurrency,
      frontendHost,
    }),
    getProductBySlug("build-your-own-set", locale as Locale, market.defaultCurrency, frontendHost),
    getBundleConfig("build-your-own-set", locale as Locale, frontendHost),
  ]);

  return (
    <div className="container mx-auto px-4 py-3">
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

      <Suspense fallback={<ProductGridSkeleton count={1} />}>
        <BuildYourOwnSetClient
          products={products}
          locale={locale as Locale}
          bundleProduct={bundleProduct}
          bundleConfig={bundleConfig}
        />
      </Suspense>
    </div>
  );
}
