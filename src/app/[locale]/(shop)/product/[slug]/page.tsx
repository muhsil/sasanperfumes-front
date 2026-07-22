import { notFound, redirect } from "next/navigation";
import { getProductBySlug, getProducts, getEnglishSlugForProduct, getBundleConfig, getFreeGiftProductIds, getHiddenProductIds, getEnglishSlugForCategory } from "@/lib/api/woocommerce";
import { permanentRedirect } from "next/navigation";
import { getProductAddons } from "@/lib/api/wcpa";
import { generateMetadata as generateSeoMetadata, generateProductJsonLd, generateBreadcrumbJsonLd, buildMarketSeoKeywords } from "@/lib/utils/seo";
import { getTopbarSettings, getProductSeo, getFeatureToggles, getSiteSettings } from "@/lib/api/wordpress";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { ProductDetail } from "./ProductDetail";
import { BuildYourOwnSetClient } from "../../build-your-own-set/BuildYourOwnSetClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig, type Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";
import type { Metadata } from "next";
import type { WCProduct } from "@/types/woocommerce";
import { getMarketByHost, getMarketCommerceSeoConfig, getMarketPathPrefix, type MarketCode } from "@/config/market";
import { Suspense } from "react";
import { ProductRecommendations } from "./ProductRecommendations";
import { RelatedProductsLoading } from "./loading";

const MARKET_CODES = new Set(["qa", "om", "sa"]);

// Helper to check if a slug contains non-ASCII characters (e.g., Arabic)
function isNonAsciiSlug(slug: string): boolean {
  return /[^\x00-\x7F]/.test(slug);
}

// Helper to generate product JSON-LD data from WCProduct
function getProductJsonLdData(product: WCProduct, locale: string, slug: string, baseUrl: string, siteName: string, currency: string, marketCode: MarketCode) {
  const minorUnit = product.prices.currency_minor_unit || 2;
  const divisor = Math.pow(10, minorUnit);
  const price = (parseInt(product.prices.price, 10) / divisor).toFixed(2);
  const primaryCategory = product.categories?.[0]?.name || undefined;
  const imageList = product.images.map((img) => img.src).filter(Boolean);
  const commerceSeo = getMarketCommerceSeoConfig(marketCode);
  
  return generateProductJsonLd({
    name: decodeHtmlEntities(product.name),
    description: decodeHtmlEntities(product.short_description.replace(/<[^>]*>/g, "")).slice(0, 500),
    image: imageList[0] || siteConfig.ogImage,
    images: imageList.length > 0 ? imageList : [siteConfig.ogImage],
    price,
    currency,
    sku: product.sku || undefined,
    availability: product.is_in_stock ? "InStock" : "OutOfStock",
    url: `${baseUrl}/${locale}/product/${slug}`,
    brandName: siteName,
    category: primaryCategory ? decodeHtmlEntities(primaryCategory) : undefined,
    ratingValue: product.average_rating || undefined,
    reviewCount: product.review_count || undefined,
    sellerName: siteName,
    sellerUrl: baseUrl,
    returnPolicyUrl: `${baseUrl}/${locale}/returns`,
    shippingCountry: commerceSeo.countryCode,
    shippingCurrency: currency,
    shippingRate: commerceSeo.shippingRate,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Pre-render top products at build time for better performance
// Always use English slugs for URLs regardless of locale
export async function generateStaticParams() {
  try {
    // Fetch products with English locale to get English slugs
    const { products } = await getProducts({ per_page: 50, locale: "en" });
    const allParams: { locale: string; slug: string }[] = [];
    
    // Generate params for all locales but always use English slugs
    for (const locale of siteConfig.locales) {
      for (const product of products) {
        allParams.push({ locale, slug: product.slug });
      }
    }
    
    return allParams;
  } catch {
    // Return empty array if fetch fails - pages will be generated on-demand
    return [];
  }
}

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getProductPageMarketContext(searchParams?: ProductPageProps["searchParams"]) {
  const resolvedSearchParams = searchParams ? await searchParams.catch(() => undefined) : undefined;
  const rawMarket = resolvedSearchParams?.__market;
  const internalMarket = (Array.isArray(rawMarket) ? rawMarket[0] : rawMarket)?.toLowerCase();

  if (internalMarket && MARKET_CODES.has(internalMarket)) {
    const frontendHost = `sasanperfumes.com/${internalMarket}`;
    return {
      market: getMarketByHost(frontendHost),
      frontendHost,
    };
  }

  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  return { market, frontendHost };
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { market, frontendHost } = await getProductPageMarketContext(searchParams);

  // Fetch product and backend-generated meta description in parallel
  const [product, backendMetaDesc, siteSettings] = await Promise.all([
    getProductBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost),
    getProductSeo(slug, locale as Locale, frontendHost),
    getSiteSettings(locale as Locale, frontendHost),
  ]);
  const siteName = siteSettings.site_name || siteConfig.name;

  if (!product) {
    return generateSeoMetadata({
      title: "Product Not Found",
      description: "The requested product could not be found.",
      locale: locale as Locale,
      pathname: `/product/${slug}`,
    });
  }

  const productName = decodeHtmlEntities(product.name);
  const canonicalProductSlug = backendMetaDesc?.canonical_slug || slug;
  const categoryNames = product.categories?.map((c) => c.name) || [];
  const tagNames = product.tags?.map((t) => t.name) || [];

  // Extract fragrance attributes for SEO title enrichment
  // Decode HTML entities from term names to avoid raw &amp; etc. in titles/descriptions
  const olfactoryFamilyRaw = product.attributes
    ?.find((a) => decodeHtmlEntities(a.name).toLowerCase() === "olfactory family")
    ?.terms?.[0]?.name;
  const olfactoryFamily = olfactoryFamilyRaw ? decodeHtmlEntities(olfactoryFamilyRaw) : null;
  const fragranceNotes = product.attributes
    ?.find((a) => decodeHtmlEntities(a.name).toLowerCase() === "notes")
    ?.terms?.map((t) => decodeHtmlEntities(t.name)) || [];
  const primaryCategoryName = product.categories?.[0]?.name
    ? decodeHtmlEntities(product.categories[0].name)
    : null;

  // Build SEO-optimized title with fragrance type/notes
  // Format: "Product Name - Olfactory Family Category | Premium Scent"
  // Example: "Leather Intense - Leathery Perfume | Premium Scent"
  // Fallback: "Product Name - Category | Premium Scent"
  let seoTitle: string;
  if (olfactoryFamily && primaryCategoryName) {
    seoTitle = `${productName} - ${olfactoryFamily} ${primaryCategoryName}`;
  } else if (primaryCategoryName) {
    seoTitle = `${productName} - ${primaryCategoryName}`;
  } else {
    seoTitle = productName;
  }

  // Ensure title stays within a sensible length before the market suffix is applied
  if (seoTitle.length > 60 && olfactoryFamily && primaryCategoryName) {
    seoTitle = `${productName} - ${primaryCategoryName}`;
  }
  if (seoTitle.length > 60 && primaryCategoryName) {
    seoTitle = productName;
  }

  // Use backend-generated SEO fields when available (from WordPress REST API).
  // Falls back to frontend-generated description if backend returns empty.
  let trimmedDescription: string;

  if (backendMetaDesc?.meta_description) {
    trimmedDescription = backendMetaDesc.meta_description;
  } else {
    // Fallback: Build description on the frontend from product data
    const fullRawDescription = decodeHtmlEntities(product.short_description.replace(/<[^>]*>/g, ""));
    const rawDescription = fullRawDescription.length > 100
      ? fullRawDescription.slice(0, 100).replace(/\s+\S*$/, "")
      : fullRawDescription;
    const minorUnit = product.prices?.currency_minor_unit || 2;
    const divisor = Math.pow(10, minorUnit);
    const priceValue = product.prices?.price ? (parseInt(product.prices.price, 10) / divisor).toFixed(0) : null;

    const notesSnippet = fragranceNotes.length > 0
      ? (locale === "ar"
        ? ` المكونات: ${fragranceNotes.slice(0, 3).join("، ")}.`
        : ` Notes: ${fragranceNotes.slice(0, 3).join(", ")}.`)
      : "";
    const olfactorySnippet = olfactoryFamily
      ? (locale === "ar"
        ? ` عائلة العطر: ${olfactoryFamily}.`
        : ` Fragrance family: ${olfactoryFamily}.`)
      : "";

    const productDescription = locale === "ar"
      ? `${rawDescription ? rawDescription + ". " : ""}${productName} من ${siteName}.${olfactorySnippet}${notesSnippet}${priceValue ? " السعر: " + priceValue + " " + market.defaultCurrency + "." : ""}`
      : `${rawDescription ? rawDescription + ". " : ""}${productName} by ${siteName}.${olfactorySnippet}${notesSnippet}${priceValue ? " Price: " + priceValue + " " + market.defaultCurrency + "." : ""}`;

    trimmedDescription = productDescription.length > 160
      ? productDescription.slice(0, 160).replace(/\s+\S*$/, "") + "..."
      : productDescription;
  }

  const productSeoTitle = backendMetaDesc?.seo_title?.trim() || seoTitle;
  const seoImage = backendMetaDesc?.og_image || product.images[0]?.src || siteConfig.ogImage;

  // Build enriched keywords from product attributes
  const olfactoryKeywords = olfactoryFamily ? [olfactoryFamily, `${olfactoryFamily} perfume`] : [];
  const noteKeywords = fragranceNotes.map((n) => n.toLowerCase());
  const backendKeywords = backendMetaDesc?.keywords
    ? backendMetaDesc.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
    : [];
  const marketKeywords = buildMarketSeoKeywords(
    [
      productName,
      ...categoryNames,
      ...tagNames,
      ...olfactoryKeywords,
      ...noteKeywords,
    ],
    market.code,
    locale as Locale,
    backendKeywords
  );

  const minorUnit = product.prices?.currency_minor_unit || 2;
  const divisorOg = Math.pow(10, minorUnit);
  const ogPrice = product.prices?.price ? (parseInt(product.prices.price, 10) / divisorOg).toFixed(2) : undefined;

  const metadata = generateSeoMetadata({
    title: productSeoTitle,
    description: trimmedDescription,
    locale: locale as Locale,
    pathname: `/product/${canonicalProductSlug}`,
    image: seoImage,
    marketCode: market.code,
    keywords: marketKeywords,
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "website",
    },
    ...(ogPrice ? {
      other: {
        "product:price:amount": ogPrice,
        "product:price:currency": market.defaultCurrency,
      },
    } : {}),
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { locale, slug } = await params;
  const { market, frontendHost } = await getProductPageMarketContext(searchParams);
  const pathPrefix = getMarketPathPrefix(market.code);
  const frontendBaseUrl = `${siteConfig.url}${pathPrefix}`;
  
  // If the URL contains a non-ASCII slug (e.g., Arabic), find the product and redirect to English slug
  if (isNonAsciiSlug(slug)) {
    // Try to find the product using the Arabic slug
    const product = await getProductBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost);
    if (product) {
      // Get the English slug for this product
      const englishSlug = await getEnglishSlugForProduct(product.id, frontendHost);
      if (englishSlug && englishSlug !== slug) {
        // Redirect to the English slug URL
        redirect(`${pathPrefix}/${locale}/product/${englishSlug}`);
      }
      // If no English slug available, fall through to render the product with Arabic slug
      // This handles cases where WPML doesn't have an English translation
    } else {
      // Product not found with Arabic slug
      notFound();
    }
  }
  
  // For English slugs, fetch the product with the current locale for localized content
  // Also start fetching hidden IDs, bundle config, and topbar settings in parallel
  // This eliminates the waterfall of sequential API calls
  const [product, hiddenGiftProductIds, hiddenCatalogProductIds, bundleConfig, topbarSettings, featureToggles, siteSettings, productSeo] = await Promise.all([
    getProductBySlug(slug, locale as Locale, market.defaultCurrency, frontendHost),
    getFreeGiftProductIds(market.defaultCurrency, frontendHost),
    getHiddenProductIds(frontendHost),
    getBundleConfig(slug, locale as Locale, frontendHost),
    getTopbarSettings(undefined, frontendHost),
    getFeatureToggles(frontendHost),
    getSiteSettings(locale as Locale, frontendHost),
    getProductSeo(slug, locale as Locale, frontendHost),
  ]);
  const siteName = siteSettings.site_name || siteConfig.name;

  if (!product) {
    notFound();
  }

  if (productSeo?.canonical_slug && productSeo.canonical_slug !== slug) {
    permanentRedirect(`${pathPrefix}/${locale}/product/${productSeo.canonical_slug}`);
  }

  // Check if this product is a hidden gift product or has hidden catalog visibility
  // If so, return 404 to prevent direct URL access
  if (hiddenGiftProductIds.includes(product.id) || hiddenCatalogProductIds.includes(product.id)) {
    notFound();
  }

  const freeShippingThreshold = topbarSettings.freeShippingThreshold;
  
  // If bundle is enabled for this product, show the bundle builder inline
  if (bundleConfig && bundleConfig.enabled) {
    const isRTL = locale === "ar";
    
    // Fetch all products for bundle selection
    const { products: bundleProducts } = await getProducts({
      per_page: 100,
      locale: locale as Locale,
      currency: market.defaultCurrency,
      frontendHost,
    });
    
    const breadcrumbItems = [
      {
        name: isRTL ? "المتجر" : "Shop",
        href: `${pathPrefix}/${locale}/shop`,
      },
      {
        name: decodeHtmlEntities(product.name),
        href: `${pathPrefix}/${locale}/product/${slug}`,
      },
    ];
    
    return (
      <>
        <JsonLd data={getProductJsonLdData(product, locale, slug, frontendBaseUrl, siteName, market.defaultCurrency, market.code)} />
        <div className="container mx-auto px-4 py-3">
          <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />
          <BuildYourOwnSetClient
            products={bundleProducts}
            locale={locale as Locale}
            bundleProduct={product}
            bundleConfig={bundleConfig}
            freeShippingThreshold={freeShippingThreshold}
          />
        </div>
      </>
    );
  }

  // Fetch addon forms and the English category slug in parallel.
  // Recommendations stream separately; orphaned stream roots are contained by their data marker.
  const primaryCategory = product.categories?.[0];
  const [productAddons, englishCategorySlug] = await Promise.all([
    getProductAddons(product.id, { locale: locale as Locale }),
    primaryCategory?.id
      ? locale === "en"
        ? Promise.resolve(primaryCategory.slug || null)
        : getEnglishSlugForCategory(primaryCategory.id, locale as Locale, market.defaultCurrency, frontendHost)
      : Promise.resolve(null),
  ]);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", url: `${frontendBaseUrl}/${locale}` },
    { name: locale === "ar" ? "المتجر" : "Shop", url: `${frontendBaseUrl}/${locale}/shop` },
    ...(primaryCategory?.name && englishCategorySlug ? [{ name: decodeHtmlEntities(primaryCategory.name), url: `${frontendBaseUrl}/${locale}/category/${englishCategorySlug}` }] : []),
    { name: decodeHtmlEntities(product.name), url: `${frontendBaseUrl}/${locale}/product/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={getProductJsonLdData(product, locale, slug, frontendBaseUrl, siteName, market.defaultCurrency, market.code)} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductDetail
        product={product}
        locale={locale as Locale}
        addonForms={productAddons?.forms}
        englishCategorySlug={englishCategorySlug}
        hiddenGiftProductIds={hiddenGiftProductIds}
        freeShippingThreshold={freeShippingThreshold}
        reviewsEnabled={featureToggles.sasanperfumes_reviews_enabled}
      />
      <Suspense fallback={<RelatedProductsLoading />}>
        <ProductRecommendations
          product={product}
          locale={locale as Locale}
          currency={market.defaultCurrency}
          frontendHost={frontendHost}
          hiddenProductIds={[...hiddenGiftProductIds, ...hiddenCatalogProductIds]}
        />
      </Suspense>
    </>
  );
}

