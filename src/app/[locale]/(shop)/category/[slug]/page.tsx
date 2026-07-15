import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, generateCollectionPageJsonLd, generateItemListJsonLd, buildMarketSeoKeywords, getMarketSeoAudience } from "@/lib/utils/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCategoryBySlug, getProductsByCategory, getCategories, getFreeGiftProductInfo, getBundleEnabledProductSlugs, getEnglishSlugFromLocalizedSlug } from "@/lib/api/woocommerce";
import { siteConfig, type Locale } from "@/config/site";
import { getMarketHintFromSearchParams, getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Metadata } from "next";
import { CategoryClient } from "./CategoryClient";
import { decodeHtmlEntities } from "@/lib/utils";
import { categorySeoContent, getCategorySeoFallback } from "@/data/category-seo-content";
import { getCategorySeoContent } from "@/lib/api/wordpress";
import { getMarketPathPrefix } from "@/config/market";

// Helper to check if a slug contains non-ASCII characters (e.g., Arabic)
function isNonAsciiSlug(slug: string): boolean {
  return /[^\x00-\x7F]/.test(slug);
}

// Slugs that don't exist as WooCommerce categories but map to known destinations
const CATEGORY_SLUG_REDIRECTS: Record<string, string> = {
  "new-arrivals": "new-arrival",
};

const CATEGORY_ROUTE_REDIRECTS: Record<string, string> = {
  "featured": "/featured-products",
  "best-sellers": "/featured-products",
};


export const dynamic = "force-dynamic";
export const revalidate = 0;

// Pre-render all categories at build time for better performance
// Always use English slugs for URLs regardless of locale to prevent duplicate content
export async function generateStaticParams() {
  try {
    // Fetch English categories only - use English slugs for all locales
    // This prevents generating Arabic-slug pages that would cause duplicate content
    const categories = await getCategories("en" as Locale);
    const allParams: { locale: string; slug: string }[] = [];
    
    for (const locale of siteConfig.locales) {
      for (const category of categories) {
        allParams.push({ locale, slug: category.slug });
      }
    }
    
    return allParams;
  } catch {
    // Return empty array if fetch fails - pages will be generated on-demand
    return [];
  }
}

interface CategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(marketHint),
    getRequestFrontendHost(marketHint),
  ]);
  const [category, categorySeo] = await Promise.all([
    getCategoryBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost),
    getCategorySeoContent(slug, frontendHost),
  ]);
  const categoryName = decodeHtmlEntities(category?.name || slug.charAt(0).toUpperCase() + slug.slice(1));
  const categorySeoTitle = categorySeo
    ? decodeHtmlEntities(locale === "ar" ? categorySeo.title.ar : categorySeo.title.en)
    : "";
  const categorySeoDescription = categorySeo
    ? decodeHtmlEntities(locale === "ar" ? categorySeo.description.ar : categorySeo.description.en)
    : "";

  const canonicalSlug = getEnglishSlugFromLocalizedSlug(slug) || slug;
  const audience = getMarketSeoAudience(market.code, locale as Locale);

  const categoryCount = category?.count || 0;
  const description =
    categorySeoDescription ||
    (locale === "ar"
      ? `تسوق ${categoryName} من Sasan Perfumes. ${categoryCount > 0 ? `اكتشف ${categoryCount}+ منتج` : "اكتشف مجموعتنا"} من العطور الفاخرة المصنوعة يدوياً في الإمارات. مخصص لـ ${audience} مع توصيل سريع عبر أسواقنا.`
      : `Shop ${categoryName} at Sasan Perfumes. ${categoryCount > 0 ? `Explore ${categoryCount}+ handcrafted` : "Explore our handcrafted"} luxury products made in the UAE. Built for ${audience} with fast delivery across our markets.`);

  return generateSeoMetadata({
    title: categorySeoTitle || (locale === "ar"
      ? `${categoryName} | تسوق أون لاين`
      : `${categoryName} | Shop Online`),
    description,
    image: category?.image?.src || siteConfig.ogImage,
    locale: locale as Locale,
    pathname: `/category/${canonicalSlug}`,
    marketCode: market.code,
    keywords: buildMarketSeoKeywords(
      locale === "ar"
        ? [categoryName, "عطور", "عطور فاخرة", "منتجات عطرية", "Sasan Perfumes", "عطور الإمارات", "شراء عطور اون لاين", "عود عربي", "هدايا عطرية", "عطور مسك", "عطور عنبر", "عطور دبي", "أفضل عطور", "عطور نسائية", "عطور رجالية", `أروماتيك ${categoryName}`, `أفضل ${categoryName} الإمارات`, `${categoryName} بأسعار مناسبة`, "عطور أروماتيك أصلية", "روائح عطرية فاخرة", "تسوق عطور أروماتيك"]
        : [categoryName, "perfume", "premium fragrance", "aromatic products", "Sasan Perfumes", "UAE perfume shop", "buy perfume online", "Arabian oud", "fragrance gifts", "musk perfume", "amber fragrance", "Dubai perfume", "best perfume", "women perfume", "men cologne", `aromatic ${categoryName.toLowerCase()}`, `best ${categoryName.toLowerCase()} UAE`, `${categoryName.toLowerCase()} affordable price`, "aromatic original perfume", "luxury aromatic scents", "shop aromatic fragrances"],
      market.code,
      locale as Locale
    ),
  });
}

// Async component: fetches SEO content from WP, falls back to hardcoded
function CategorySeoSection({ title, description }: { title: string; description: string }) {
  if (!title && !description) return null;

  return (
    <div className="bg-transparent py-12 md:py-16">
      <div className="mx-auto w-full">
        {title && (
          <h2 className="mb-6 text-3xl font-normal leading-tight tracking-normal text-brand-primary md:text-4xl">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-base leading-8 tracking-normal text-brand-primary/75">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { locale, slug } = await params;
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const dictionary = await getDictionary(locale as Locale);
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(marketHint),
    getRequestFrontendHost(marketHint),
  ]);
  const pathPrefix = getMarketPathPrefix(market.code);

  const routeRedirect = CATEGORY_ROUTE_REDIRECTS[slug.toLowerCase()];
  if (routeRedirect) {
    redirect(`${pathPrefix}/${locale}${routeRedirect}`);
  }
  const slugRedirect = CATEGORY_SLUG_REDIRECTS[slug.toLowerCase()];
  if (slugRedirect) {
    redirect(`${pathPrefix}/${locale}/category/${slugRedirect}`);
  }

  const categorySeo = await getCategorySeoContent(slug, frontendHost);
  const categorySeoDescription = categorySeo
    ? decodeHtmlEntities(locale === "ar" ? categorySeo.description.ar : categorySeo.description.en)
    : "";

  // If the URL contains a non-ASCII slug (e.g., Arabic), redirect to the English slug
  // This prevents duplicate content issues where both Arabic-slug and English-slug URLs get indexed
  if (isNonAsciiSlug(slug)) {
    const englishSlug = getEnglishSlugFromLocalizedSlug(slug);
    if (englishSlug && englishSlug !== slug) {
      redirect(`${pathPrefix}/${locale}/category/${englishSlug}`);
    }
    // If no English slug mapping found, try to find via URL-encoded version
    const encodedSlug = encodeURIComponent(slug);
    const englishSlugFromEncoded = getEnglishSlugFromLocalizedSlug(encodedSlug);
    if (englishSlugFromEncoded && englishSlugFromEncoded !== slug) {
      redirect(`${pathPrefix}/${locale}/category/${englishSlugFromEncoded}`);
    }
  }

  // Also check if the slug is a URL-encoded Arabic slug (e.g., %d8%a7%d9%84%d8%b9%d8%b7%d9%88%d8%b1)
  const englishSlugFromMapping = getEnglishSlugFromLocalizedSlug(slug);
  if (englishSlugFromMapping && englishSlugFromMapping !== slug) {
    redirect(`${pathPrefix}/${locale}/category/${englishSlugFromMapping}`);
  }

  // Fetch category and products from WooCommerce API
  const category = await getCategoryBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost);
  
  if (!category) {
    notFound();
  }

  // Fetch products, gift product info (IDs and slugs), and bundle product slugs in parallel
  const [{ products: allProducts }, giftProductInfo, bundleProductSlugs] = await Promise.all([
    getProductsByCategory(slug, {
      per_page: 100,
      locale: locale as Locale,
      currency: market.defaultCurrency,
      frontendHost,
      fetchAllPages: true,
    }),
    getFreeGiftProductInfo(market.defaultCurrency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  // Filter out gift products from the category listing
  // Use both ID and slug matching to handle WPML translations (different IDs per locale)
  const giftProductSlugsSet = new Set(giftProductInfo.slugs);
  const giftProductIdsSet = new Set(giftProductInfo.ids);
  const filteredProducts = allProducts.filter(
    (product) => !giftProductIdsSet.has(product.id) && !giftProductSlugsSet.has(product.slug)
  );

  // Sort products: bestsellers first (by tag), then apply category-specific ordering
  const isPersonalCare = slug === "personal-care";

  const products = [...filteredProducts].sort((a, b) => {
    const aIsBestseller = a.tags?.some(tag => tag.slug === "bestseller");
    const bIsBestseller = b.tags?.some(tag => tag.slug === "bestseller");

    // Bestsellers always come first
    if (aIsBestseller && !bIsBestseller) return -1;
    if (!aIsBestseller && bIsBestseller) return 1;

    // For Personal Care: "Hair & Body Mist" subcategory items come first (after bestsellers)
    if (isPersonalCare && !aIsBestseller && !bIsBestseller) {
      const aIsHairBodyMist = a.categories?.some(cat => { try { return cat.slug === "hair-body-mist" || decodeURIComponent(cat.slug).includes("hair-body-mist"); } catch { return false; } });
      const bIsHairBodyMist = b.categories?.some(cat => { try { return cat.slug === "hair-body-mist" || decodeURIComponent(cat.slug).includes("hair-body-mist"); } catch { return false; } });
      if (aIsHairBodyMist && !bIsHairBodyMist) return -1;
      if (!aIsHairBodyMist && bIsHairBodyMist) return 1;
    }

    return 0; // Keep original order for items in the same group
  });

    const breadcrumbItems = [
      { name: dictionary.common.shop, href: `${pathPrefix}/${locale}/shop` },
      { name: decodeHtmlEntities(category.name), href: `${pathPrefix}/${locale}/category/${slug}` },
    ];

  const categoryUrl = `${siteConfig.url}${pathPrefix}/${locale}/category/${slug}`;
  const categoryName = decodeHtmlEntities(category.name);
  const fallbackSeo = getCategorySeoFallback(slug, categoryName, market.code, locale as Locale);
  const contentLocale = locale === "ar" ? "ar" : "en";
  const topDescription = category.description
    ? decodeHtmlEntities(category.description.replace(/<[^>]*>/g, "").trim())
    : fallbackSeo.intro;
  const bottomSeoTitle = decodeHtmlEntities(
    categorySeo?.title?.[contentLocale] || categorySeoContent[slug]?.title?.[contentLocale] || fallbackSeo.title
  );
  const bottomSeoDescription = decodeHtmlEntities(
    categorySeo?.description?.[contentLocale] || categorySeoContent[slug]?.description?.[contentLocale] || fallbackSeo.description
  );

  const collectionJsonLd = generateCollectionPageJsonLd({
    name: categoryName,
    description: categorySeoDescription || (category.description
      ? decodeHtmlEntities(category.description.replace(/<[^>]*>/g, "")).slice(0, 200)
      : `Shop ${categoryName} at ${siteConfig.name}`),
    url: categoryUrl,
  });

  const itemListJsonLd = generateItemListJsonLd({
    name: categoryName,
    description: categorySeoDescription || `${categoryName} products from ${siteConfig.name}`,
    url: categoryUrl,
    items: products.slice(0, 20).map((product, index) => ({
      name: decodeHtmlEntities(product.name),
      url: `${siteConfig.url}${pathPrefix}/${locale}/product/${product.slug}`,
      image: product.images[0]?.src || siteConfig.ogImage,
      position: index + 1,
    })),
  });

  return (
    <div className="page-flush container mx-auto px-4 bg-transparent text-brand-primary">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} className="sr-only" />

      <section className="border-b border-brand-border/60 pb-6 pt-5 md:pb-8 md:pt-7" aria-label={`${categoryName} description`}>
        <h1 className="font-title text-3xl leading-tight text-brand-primary md:text-4xl">
          {categoryName}
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-brand-muted md:text-base md:leading-8">
          {topDescription}
        </p>
      </section>

      <Suspense fallback={<ProductGridSkeleton count={12} columns={6} />}>
        <CategoryClient
          products={products}
          locale={locale as Locale}
          toolbarTitle={categoryName}
          bundleProductSlugs={bundleProductSlugs}
        />
      </Suspense>

      {/* SEO content — fetched from WP backend, falls back to hardcoded */}
      <CategorySeoSection title={bottomSeoTitle} description={bottomSeoDescription} />
    </div>
  );
}

