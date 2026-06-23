import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, generateBreadcrumbJsonLd } from "@/lib/utils/seo";
import { getProductsByNote, getFreeGiftProductInfo, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { siteConfig, type Locale } from "@/config/site";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Metadata } from "next";
import { CategoryClient } from "../../category/[slug]/CategoryClient";
import { notesSeoContent, ALL_NOTE_SLUGS } from "@/data/notes-seo-content";
import { getNoteSeo } from "@/lib/api/wordpress";
import { getMarketPathPrefix } from "@/config/market";

// Revalidate every 5 minutes
export const revalidate = 300;

// Pre-render all known note pages at build time
export async function generateStaticParams() {
  const allParams: { locale: string; slug: string }[] = [];

  for (const locale of siteConfig.locales) {
    for (const slug of ALL_NOTE_SLUGS) {
      allParams.push({ locale, slug });
    }
  }

  return allParams;
}

interface NotePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const noteData = notesSeoContent[slug];

  // Fallback for notes not in our SEO data — use the slug as a readable name
  const noteName = noteData
    ? (locale === "ar" ? noteData.name.ar : noteData.name.en)
    : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const title = noteData
    ? (locale === "ar" ? noteData.title.ar : noteData.title.en)
    : locale === "ar"
      ? `عطور ${noteName} | تسوق أون لاين`
      : `${noteName} Perfumes | Shop Online`;

  const description = noteData
    ? (locale === "ar" ? noteData.description.ar : noteData.description.en)
    : locale === "ar"
      ? `تسوق عطور ${noteName} من Sasan Perfumes. اكتشف مجموعتنا من العطور الفاخرة بنوتة ${noteName}. توصيل مجاني للطلبات فوق 500 درهم.`
      : `Shop ${noteName} perfumes at Sasan Perfumes. Explore our collection of luxury fragrances featuring ${noteName} notes. Free delivery on orders over 500 AED.`;

  return generateSeoMetadata({
    title,
    description,
    locale: locale as Locale,
    pathname: `/notes/${slug}`,
    keywords: locale === "ar"
      ? [noteName, `عطور ${noteName}`, "عطور", "عطور فاخرة", "Sasan Perfumes", "عطور الإمارات", `${noteName} عطر`, "نوتات عطرية", "عطور أروماتيك", "شراء عطور أون لاين"]
      : [noteName, `${noteName} perfume`, "perfume", "luxury fragrance", "Sasan Perfumes", "UAE perfume", `${noteName} fragrance`, "fragrance notes", "aromatic perfume", "buy perfume online"],
  });
}

export default async function NotePage({ params }: NotePageProps) {
  const { locale, slug } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);
  const pathPrefix = getMarketPathPrefix(market.code);

  // Try WP API first to get attribute mapping, then fall back to hardcoded SEO content
  const wpNote = await getNoteSeo(slug);

  // Use mapped attribute slug from WP if available, otherwise use page slug
  const noteAttributeSlug = wpNote?.attributeSlug || slug;

  // Fetch products with this note and supporting data in parallel
  const [{ products: allProducts }, giftProductInfo, bundleProductSlugs] = await Promise.all([
    getProductsByNote(noteAttributeSlug, {
      locale: locale as Locale,
      currency: market.defaultCurrency,
      frontendHost,
    }),
    getFreeGiftProductInfo(market.defaultCurrency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  // If no products match this note, return 404
  if (allProducts.length === 0) {
    notFound();
  }

  // Filter out gift products
  const giftProductSlugsSet = new Set(giftProductInfo.slugs);
  const giftProductIdsSet = new Set(giftProductInfo.ids);
  const filteredProducts = allProducts.filter(
    (product) => !giftProductIdsSet.has(product.id) && !giftProductSlugsSet.has(product.slug)
  );

  // Sort: bestsellers first
  const products = [...filteredProducts].sort((a, b) => {
    const aIsBestseller = a.tags?.some(tag => tag.slug === "bestseller");
    const bIsBestseller = b.tags?.some(tag => tag.slug === "bestseller");
    if (aIsBestseller && !bIsBestseller) return -1;
    if (!aIsBestseller && bIsBestseller) return 1;
    return 0;
  });
  const noteData = notesSeoContent[slug];

  const noteName = wpNote?.name
    ? (isRTL ? wpNote.name.ar : wpNote.name.en)
    : noteData
      ? (isRTL ? noteData.name.ar : noteData.name.en)
      : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const noteTitle = wpNote?.title
    ? (isRTL ? wpNote.title.ar : wpNote.title.en)
    : noteData ? (isRTL ? noteData.title.ar : noteData.title.en) : '';

  const noteDescription = wpNote?.description
    ? (isRTL ? wpNote.description.ar : wpNote.description.en)
    : noteData ? (isRTL ? noteData.description.ar : noteData.description.en) : '';

  const pageTitle = isRTL
    ? `عطور ${noteName}`
    : `${noteName} Fragrances`;

  const breadcrumbItems = [
    { name: dictionary.common.shop, href: `${pathPrefix}/${locale}/shop` },
    { name: isRTL ? "نوتات عطرية" : "Fragrance Notes", href: `${pathPrefix}/${locale}/shop` },
    { name: noteName, href: `${pathPrefix}/${locale}/notes/${slug}` },
  ];

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: isRTL ? "الرئيسية" : "Home", url: `${siteConfig.url}/${locale}` },
    { name: isRTL ? "المتجر" : "Shop", url: `${siteConfig.url}/${locale}/shop` },
    { name: noteName, url: `${siteConfig.url}/${locale}/notes/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <div className="container mx-auto px-4 py-3">
        <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{pageTitle}</h1>
          {noteDescription && (
            <p className="mt-2 text-gray-500 text-sm">
              {noteDescription}
            </p>
          )}
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          <CategoryClient products={products} locale={locale as Locale} bundleProductSlugs={bundleProductSlugs} />
        </Suspense>

        {/* SEO content section */}
        {(noteTitle || noteDescription) && (
          <div className="mt-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            {noteTitle && (
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {noteTitle}
              </h2>
            )}
            {noteDescription && (
              <p className="text-gray-600 leading-relaxed">
                {noteDescription}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

