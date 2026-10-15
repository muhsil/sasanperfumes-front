import { Suspense } from "react";
import { getDictionary } from "@/i18n";
import {
  buildMarketSeoKeywords,
  generateMetadata as generateSeoMetadata,
  getMarketSeoDescription,
} from "@/lib/utils/seo";
import {
  getNewProducts,
  getFreeGiftProductInfo,
  getBundleEnabledProductSlugs,
  stripProductFieldsForListing,
  getBestsellerProducts,
  getCategories,
} from "@/lib/api/woocommerce";
import { getHomePageSettings, getSeoSettings, getHomeSections, getSiteSettings, getAdSettings } from "@/lib/api/wordpress";
import { getMarketHintFromSearchParams, getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";
import {
  HeroSlider,
  ProductSection,
  BannersSection,
  AdsSection,
  CategorySection,
  CollectionsSection,
} from "@/components/sections";
import { ProductSectionSkeleton } from "@/components/sections/ProductSection";
import { siteConfig, type Currency, type Locale } from "@/config/site";
import type { Metadata } from "next";
import type { HomeSectionFAQ, HomeSectionWhyChooseUs } from "@/types/wordpress";
import { decodeHtmlEntities } from "@/lib/utils";

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function FAQSection({
  section,
  locale,
  isRTL,
}: {
  section: HomeSectionFAQ;
  locale: Locale;
  isRTL: boolean;
}) {
  const t = (bi: { en: string; ar: string }) => locale === "ar" ? bi.ar : bi.en;
  const items = (section.items || []).filter((item) => hasText(t(item.question)) || hasText(t(item.answer)));
  if (section.enabled === false || items.length === 0) return null;

  return (
    <section className="section-band py-10 md:py-14" dir={isRTL ? "rtl" : "ltr"}>
      <div className="section-shell">
        <div className={isRTL ? "text-right" : "text-left"}>
          {hasText(t(section.eyebrow)) && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold">
              {t(section.eyebrow)}
            </p>
          )}
          {hasText(t(section.title)) && (
            <h2 className="font-title text-2xl leading-tight text-brand-primary md:text-3xl">
              {t(section.title)}
            </h2>
          )}
          {hasText(t(section.subtitle)) && (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-muted md:text-base">
              {t(section.subtitle)}
            </p>
          )}
        </div>

        <div className="mt-7 divide-y divide-brand-border rounded-lg border border-brand-border bg-white">
          {items.map((item, index) => (
            <details key={`${t(item.question)}-${index}`} className="group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-brand-primary md:text-base">
                {t(item.question)}
              </summary>
              {hasText(t(item.answer)) && (
                <p className="mt-3 text-sm leading-7 text-brand-muted">{t(item.answer)}</p>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export const revalidate = 60;
const HOME_PRODUCT_COUNT = 5;

interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const validLocale = locale as Locale;
  const isArabic = validLocale === "ar";

  const [frontendHost, market] = await Promise.all([
    getRequestFrontendHost(marketHint),
    getRequestMarket(marketHint),
  ]);
  const seoSettings = await getSeoSettings(validLocale, frontendHost);

  const seoTitle = (isArabic ? seoSettings.titleAr : seoSettings.title) || siteConfig.name;
  const seoDescription =
    (isArabic ? seoSettings.descriptionAr : seoSettings.description) ||
    getMarketSeoDescription(market.code, validLocale) ||
    siteConfig.description;

  const baseMetadata = generateSeoMetadata({
    title: seoTitle,
    description: seoDescription,
    locale: validLocale,
    pathname: "",
    marketCode: market.code,
    keywords: buildMarketSeoKeywords(
      isArabic
        ? [
            "عطور فاخرة",
            "شراء عطور أونلاين",
            "عطور ثابتة",
            "عود عربي",
            "عطور نسائية",
            "عطور رجالية",
            "مسك وعنبر",
            "معطر شعر",
            "معطر جسم",
            "أطقم هدايا عطور",
            "ساسان للعطور",
          ]
        : [
            "premium perfumes",
            "buy perfume online",
            "long lasting perfume",
            "Arabian oud",
            "women's perfume",
            "men's perfume",
            "musk perfume",
            "amber perfume",
            "hair mist",
            "body fragrance",
            "perfume gift sets",
            "Sasan Perfumes",
          ],
      market.code,
      validLocale
    ),
  });

  return {
    ...baseMetadata,
    title: typeof baseMetadata.title === "string" ? { absolute: baseMetadata.title } : baseMetadata.title,
  };
}

// Async server component: New Products section
// Fetches its own data so the hero/banners can render without waiting for products
async function NewProductsSection({ locale, isRTL, dictionary, homeSettings, currency, frontendHost }: {
  locale: Locale;
  isRTL: boolean;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  homeSettings: Awaited<ReturnType<typeof getHomePageSettings>>;
  currency: Currency;
  frontendHost: string;
}) {
  /*
    The English copy of the list exists only to map each product id to its
    English slug, so that a visitor reading Arabic still gets canonical URLs.
    On the English storefront it is the very same request — around 100KB of
    product JSON fetched twice per section, on by far the busiest locale.
    Fetch it only when the locale actually differs.
  */
  const needsEnglishSlugs = locale !== "en";

  const [
    { products: newProductsRaw },
    englishList,
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getNewProducts({ per_page: 20, locale, currency, frontendHost }),
    needsEnglishSlugs
      ? getNewProducts({ per_page: 20, locale: "en", currency, frontendHost })
      : Promise.resolve(null),
    getFreeGiftProductInfo(currency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const newProductsEn = englishList ? englishList.products : newProductsRaw;

  const newProducts = newProductsRaw.map(stripProductFieldsForListing).filter(
    (product) =>
      product.is_in_stock !== false &&
      !giftProductInfo.ids.includes(product.id) &&
      !giftProductInfo.slugs.includes(product.slug)
  );

  const newProductsEnVisible = newProductsEn.filter(
    (product) =>
      product.is_in_stock !== false &&
      !giftProductInfo.ids.includes(product.id) &&
      !giftProductInfo.slugs.includes(product.slug)
  );

  const filteredEnglishSlugs: Record<number, string> = {};
  newProductsEnVisible.forEach((product) => {
    filteredEnglishSlugs[product.id] = product.slug;
  });

  const newProductsCount = homeSettings.new_products.products_count || HOME_PRODUCT_COUNT;

  const settings = {
    ...homeSettings.new_products,
    // New Products should always reflect the backend's newest-first order.
    // Clear any manually selected slugs so curated ordering does not override recency.
    selected_product_slugs: [],
    section_title: homeSettings.new_products.section_title || dictionary.sections.newProducts.title,
    section_subtitle: homeSettings.new_products.section_subtitle || dictionary.sections.newProducts.subtitle,
    products_count: newProductsCount,
    show_view_all: false,
    responsive_columns: {
      desktop: homeSettings.new_products.responsive_columns?.desktop ?? 4,
      tablet: homeSettings.new_products.responsive_columns?.tablet ?? 3,
      mobile: homeSettings.new_products.responsive_columns?.mobile ?? 2,
    },
  };

  return (
    <ProductSection
      settings={settings}
      products={newProducts}
      locale={locale}
      isRTL={isRTL}
      fullView
      showHeaderNavigation
      bundleProductSlugs={bundleProductSlugs}
      englishProductSlugs={filteredEnglishSlugs}
    />
  );
}

// Async server component: Bestseller section
async function BestsellerProductsSection({ locale, isRTL, dictionary, homeSettings, currency, frontendHost }: {
  locale: Locale;
  isRTL: boolean;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  homeSettings: Awaited<ReturnType<typeof getHomePageSettings>>;
  currency: Currency;
  frontendHost: string;
}) {
  /*
    The English copy of the list exists only to map each product id to its
    English slug, so that a visitor reading Arabic still gets canonical URLs.
    On the English storefront it is the very same request — around 100KB of
    product JSON fetched twice per section, on by far the busiest locale.
    Fetch it only when the locale actually differs.
  */
  const needsEnglishSlugs = locale !== "en";

  const [
    { products: bestsellerProductsRaw },
    englishList,
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getBestsellerProducts({ per_page: 20, locale, currency, frontendHost }),
    needsEnglishSlugs
      ? getBestsellerProducts({ per_page: 20, locale: "en", currency, frontendHost })
      : Promise.resolve(null),
    getFreeGiftProductInfo(currency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const bestsellerProductsEn = englishList ? englishList.products : bestsellerProductsRaw;

  const bestsellerEnglishSlugs: Record<number, string> = {};
  bestsellerProductsEn.forEach((product) => {
    bestsellerEnglishSlugs[product.id] = product.slug;
  });

  const bestsellerProducts = bestsellerProductsRaw.map(stripProductFieldsForListing).filter(
    (product) =>
      !giftProductInfo.ids.includes(product.id) &&
      !giftProductInfo.slugs.includes(product.slug)
  );

  const settings = {
    ...homeSettings.bestseller_products,
    section_title:
      homeSettings.bestseller_products.section_title || dictionary.sections.bestsellers.title,
    section_subtitle:
      homeSettings.bestseller_products.section_subtitle || dictionary.sections.bestsellers.subtitle,
    products_count: HOME_PRODUCT_COUNT,
    responsive_columns: {
      desktop: HOME_PRODUCT_COUNT,
      tablet: homeSettings.bestseller_products.responsive_columns?.tablet ?? 3,
      mobile: homeSettings.bestseller_products.responsive_columns?.mobile ?? 2,
    },
  };

  return (
    <ProductSection
      settings={settings}
      products={bestsellerProducts}
      locale={locale}
      isRTL={isRTL}
      viewAllText={dictionary.common.viewAll}
      fullView
      hideSubtitleOnMobile
      bundleProductSlugs={bundleProductSlugs}
      englishProductSlugs={bestsellerEnglishSlugs}
    />
  );
}

// Async server component: Featured products section
export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const validLocale = locale as Locale;
  const isRTL = locale === "ar";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(marketHint),
    getRequestFrontendHost(marketHint),
  ]);

  const [dictionary, homeSettings, homeSections, siteSettings, categories, adsSettings, mainSiteCategories] = await Promise.all([
    getDictionary(validLocale),
    getHomePageSettings(validLocale, frontendHost),
    getHomeSections(frontendHost),
    getSiteSettings(validLocale, frontendHost),
    getCategories(validLocale, market.defaultCurrency, frontendHost),
    getAdSettings(validLocale, frontendHost),
    market.code === "intl"
      ? Promise.resolve([])
      : getCategories("en", siteConfig.defaultCurrency, "sasanperfumes.com"),
  ]);

  const t = (bi: { en: string; ar: string }) => isRTL ? bi.ar : bi.en;
  const h1Text = siteSettings.site_name || siteConfig.name;
  const marketPrefix = getMarketPathPrefix(market.code);
  const mainCategoryBySlug = new Map(mainSiteCategories.map((category) => [category.slug, category]));
  const mainCategorySlugAliases: Record<string, string> = {
    "hair-mist": "sasan-hair-mist",
    "womens-perfumes": "woman-perfumes",
    "perfumes-ar": "perfumes",
    "extrait-de-parfum-ar": "extrait-de-parfum",
    "perfume-ar": "perfume",
    "new-products-ar": "new-products",
  };
  const categoryFallbackImages = Object.fromEntries(
    categories.map((category) => {
      const sourceSlug = mainCategorySlugAliases[category.slug] || category.slug;
      const sourceCategory = mainCategoryBySlug.get(sourceSlug);
      return [
        category.id,
        sourceCategory?.image?.src
          ? { src: sourceCategory.image.src, alt: decodeHtmlEntities(category.name) }
          : undefined,
      ];
    })
  );

  return (
    <>
      <h1 className="sr-only">{h1Text}</h1>

      <HeroSlider settings={homeSettings.hero_slider} />

      <div className="page-flush relative bg-transparent">
        <AdsSection settings={adsSettings} locale={validLocale} marketCode={market.code} placement="home" />

        <Suspense fallback={<ProductSectionSkeleton fullView />}>
          <NewProductsSection
            locale={validLocale}
            isRTL={isRTL}
            dictionary={dictionary}
            homeSettings={homeSettings}
            currency={market.defaultCurrency}
            frontendHost={frontendHost}
          />
        </Suspense>

        <CategorySection
          settings={homeSettings.shop_by_category}
          categories={categories}
          locale={validLocale}
          isRTL={isRTL}
          fallbackImages={categoryFallbackImages}
        />

        <Suspense fallback={<ProductSectionSkeleton fullView />}>
          <BestsellerProductsSection
            locale={validLocale}
            isRTL={isRTL}
            dictionary={dictionary}
            homeSettings={homeSettings}
            currency={market.defaultCurrency}
            frontendHost={frontendHost}
          />
        </Suspense>

        {/*
          Featured Products, Why Choose Us and Fragrance Story were taken off
          the home page. The first of them also cost four backend calls of its
          own — featured products in both languages, the free-gift lookup and
          the bundle slugs — so removing it takes those off every home page
          render as well. The sections themselves are untouched and can be put
          back by restoring these lines.
        */}

        <CollectionsSection settings={homeSettings.collections} locale={validLocale} marketPrefix={marketPrefix} />

        <BannersSection settings={homeSettings.banners} />

        <FAQSection section={homeSections.faq} locale={validLocale} isRTL={isRTL} />

      </div>
    </>
  );
}
