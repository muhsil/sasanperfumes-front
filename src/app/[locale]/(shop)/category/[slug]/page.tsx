import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { CollectionPageHeader } from "@/components/shop/CollectionPageHeader";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, generateCollectionPageJsonLd, generateItemListJsonLd, generateBreadcrumbJsonLd } from "@/lib/utils/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCategoryBySlug, getProductsByCategory, getCategories, getFreeGiftProductInfo, getBundleEnabledProductSlugs, getEnglishSlugFromLocalizedSlug } from "@/lib/api/woocommerce";
import { siteConfig, type Locale } from "@/config/site";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import type { Metadata } from "next";
import { CategoryClient } from "./CategoryClient";
import { decodeHtmlEntities } from "@/lib/utils";
import { categorySeoContent } from "@/data/category-seo-content";
import { getCategorySeoContent, getCategorySubtitle } from "@/lib/api/wordpress";

// Helper to check if a slug contains non-ASCII characters (e.g., Arabic)
function isNonAsciiSlug(slug: string): boolean {
  return /[^\x00-\x7F]/.test(slug);
}

// Increased revalidate time for better cache hit rates (5 minutes instead of 60 seconds)
export const revalidate = 300;

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
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);
  const category = await getCategoryBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost);
  const categoryName = decodeHtmlEntities(category?.name || slug.charAt(0).toUpperCase() + slug.slice(1));

  // Use English slug for canonical URL to prevent duplicate content
  const canonicalSlug = getEnglishSlugFromLocalizedSlug(slug) || slug;

  // Generate unique, category-specific descriptions that differentiate each category in search results
  const categoryCount = category?.count || 0;
  const description =
    locale === "ar"
      ? `تسوق ${categoryName} من شيب هايف. ${categoryCount > 0 ? `اكتشف ${categoryCount}+ منتج` : "اكتشف مجموعتنا"} من العطور الفاخرة المصنوعة يدوياً في الإمارات. توصيل مجاني للطلبات فوق 500 درهم.`
      : `Shop ${categoryName} at ShapeHive. ${categoryCount > 0 ? `Explore ${categoryCount}+ handcrafted` : "Explore our handcrafted"} luxury products made in the UAE. Free delivery on orders over 500 AED.`;

  return generateSeoMetadata({
    title: locale === "ar"
      ? `${categoryName} | تسوق أون لاين`
      : `${categoryName} | Shop Online`,
    description,
    locale: locale as Locale,
    pathname: `/category/${canonicalSlug}`,
    keywords: locale === "ar"
      ? [categoryName, "عطور", "عطور فاخرة", "منتجات عطرية", "شيب هايف", "عطور الإمارات", "شراء عطور اون لاين", "عود عربي", "هدايا عطرية", "عطور مسك", "عطور عنبر", "عطور دبي", "أفضل عطور", "عطور نسائية", "عطور رجالية", `أروماتيك ${categoryName}`, `أفضل ${categoryName} الإمارات`, `${categoryName} بأسعار مناسبة`, "عطور أروماتيك أصلية", "روائح عطرية فاخرة", "تسوق عطور أروماتيك"]
      : [categoryName, "perfume", "premium fragrance", "aromatic products", "ShapeHive", "UAE perfume shop", "buy perfume online", "Arabian oud", "fragrance gifts", "musk perfume", "amber fragrance", "Dubai perfume", "best perfume", "women perfume", "men cologne", `aromatic ${categoryName.toLowerCase()}`, `best ${categoryName.toLowerCase()} UAE`, `${categoryName.toLowerCase()} affordable price`, "aromatic original perfume", "luxury aromatic scents", "shop aromatic fragrances"],
  });
}

// Async component: fetches SEO content from WP, falls back to hardcoded
async function CategorySeoSection({ slug, locale }: { slug: string; locale: Locale }) {
  const wpContent = await getCategorySeoContent(slug);
  const title = wpContent
    ? (locale === "ar" ? wpContent.title.ar : wpContent.title.en)
    : categorySeoContent[slug]?.title?.[locale === "ar" ? "ar" : "en"];
  const description = wpContent
    ? (locale === "ar" ? wpContent.description.ar : wpContent.description.en)
    : categorySeoContent[slug]?.description?.[locale === "ar" ? "ar" : "en"];

  if (!title && !description) return null;

  return (
    <div className="bg-gradient-to-r from-[#e0d9cf] to-[#ebe6df] px-4 py-12 md:py-16">
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  // If the URL contains a non-ASCII slug (e.g., Arabic), redirect to the English slug
  // This prevents duplicate content issues where both Arabic-slug and English-slug URLs get indexed
  if (isNonAsciiSlug(slug)) {
    const englishSlug = getEnglishSlugFromLocalizedSlug(slug);
    if (englishSlug && englishSlug !== slug) {
      redirect(`/${locale}/category/${englishSlug}`);
    }
    // If no English slug mapping found, try to find via URL-encoded version
    const encodedSlug = encodeURIComponent(slug);
    const englishSlugFromEncoded = getEnglishSlugFromLocalizedSlug(encodedSlug);
    if (englishSlugFromEncoded && englishSlugFromEncoded !== slug) {
      redirect(`/${locale}/category/${englishSlugFromEncoded}`);
    }
  }

  // Also check if the slug is a URL-encoded Arabic slug (e.g., %d8%a7%d9%84%d8%b9%d8%b7%d9%88%d8%b1)
  const englishSlugFromMapping = getEnglishSlugFromLocalizedSlug(slug);
  if (englishSlugFromMapping && englishSlugFromMapping !== slug) {
    redirect(`/${locale}/category/${englishSlugFromMapping}`);
  }

  // Fetch category and products from WooCommerce API
  const category = await getCategoryBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost);
  
  if (!category) {
    notFound();
  }

  // Fetch products, gift product info (IDs and slugs), bundle product slugs, and subtitle in parallel
  const [{ products: allProducts }, giftProductInfo, bundleProductSlugs, categorySubtitle] = await Promise.all([
    getProductsByCategory(slug, {
      per_page: 50,
      locale: locale as Locale,
      currency: market.defaultCurrency,
      frontendHost,
    }),
    getFreeGiftProductInfo(market.defaultCurrency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
    getCategorySubtitle(slug),
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
      { name: dictionary.common.shop, href: `/${locale}/shop` },
      { name: decodeHtmlEntities(category.name), href: `/${locale}/category/${slug}` },
    ];

  const categoryUrl = `${siteConfig.url}/${locale}/category/${slug}`;
  const categoryName = decodeHtmlEntities(category.name);

  const collectionJsonLd = generateCollectionPageJsonLd({
    name: categoryName,
    description: category.description
      ? decodeHtmlEntities(category.description.replace(/<[^>]*>/g, "")).slice(0, 200)
      : `Shop ${categoryName} at ${siteConfig.name}`,
    url: categoryUrl,
  });

  const itemListJsonLd = generateItemListJsonLd({
    name: categoryName,
    description: `${categoryName} products from ${siteConfig.name}`,
    url: categoryUrl,
    items: products.slice(0, 20).map((product, index) => ({
      name: decodeHtmlEntities(product.name),
      url: `${siteConfig.url}/${locale}/product/${product.slug}`,
      image: product.images[0]?.src || "",
      position: index + 1,
    })),
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: dictionary.common.home, url: `${siteConfig.url}/${locale}` },
    { name: dictionary.common.shop, url: `${siteConfig.url}/${locale}/shop` },
    { name: categoryName, url: categoryUrl },
  ]);

  const categoryDescriptionText = category.description
    ? decodeHtmlEntities(category.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 240)
    : "";

  return (
    <div className="page-flush bg-transparent text-brand-primary">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} className="sr-only" />

      <CollectionPageHeader
        title={categoryName}
        subtitle={categorySubtitle ? (locale === "ar" ? categorySubtitle.ar : categorySubtitle.en) : undefined}
        description={categoryDescriptionText}
        image={category.image?.src}
        locale={locale as Locale}
      />

      <Suspense fallback={<ProductGridSkeleton count={12} columns={6} />}>
        <CategoryClient
          products={products}
          locale={locale as Locale}
          toolbarTitle={categoryName}
          bundleProductSlugs={bundleProductSlugs}
        />
      </Suspense>

      {/* SEO content — fetched from WP backend, falls back to hardcoded */}
      <CategorySeoSection slug={slug} locale={locale as Locale} />
    </div>
  );
}
