import { Suspense } from "react";
import { getDictionary } from "@/i18n";
import {
  buildMarketSeoKeywords,
  generateMetadata as generateSeoMetadata,
  getMarketHomeSeoContent,
  getMarketSeoDescription,
} from "@/lib/utils/seo";
import {
  getNewProducts,
  getFreeGiftProductInfo,
  getBundleEnabledProductSlugs,
  getBestsellerProducts,
  getFeaturedProducts,
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
  SeoContentSection,
  OurStorySection,
} from "@/components/sections";
import { ProductSectionSkeleton } from "@/components/sections/ProductSection";
import { siteConfig, type Currency, type Locale } from "@/config/site";
import type { Metadata } from "next";
import type { HomeSectionFAQ, HomeSectionWhyChooseUs } from "@/types/wordpress";
import { decodeHtmlEntities } from "@/lib/utils";

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function WhyChooseSection({
  section,
  locale,
  isRTL,
}: {
  section: HomeSectionWhyChooseUs;
  locale: Locale;
  isRTL: boolean;
}) {
  const t = (bi: { en: string; ar: string }) => locale === "ar" ? bi.ar : bi.en;
  const items = (section.items || []).filter((item) => hasText(t(item.title)) || hasText(t(item.description)));
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

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <div key={`${t(item.title)}-${index}`} className="rounded-lg border border-brand-border/70 bg-white p-5">
              <h3 className="text-base font-semibold text-brand-primary">{t(item.title)}</h3>
              {hasText(t(item.description)) && (
                <p className="mt-3 text-sm leading-6 text-brand-muted">{t(item.description)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
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
  const [
    { products: newProductsRaw },
    { products: newProductsEn },
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getNewProducts({ per_page: 20, locale, currency, frontendHost }),
    getNewProducts({ per_page: 20, locale: "en", currency, frontendHost }),
    getFreeGiftProductInfo(currency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const newProductEnglishSlugs: Record<number, string> = {};
  newProductsEn.forEach((product) => {
    newProductEnglishSlugs[product.id] = product.slug;
  });

  const newProducts = newProductsRaw.filter(
    (product) =>
      !giftProductInfo.ids.includes(product.id) &&
      !giftProductInfo.slugs.includes(product.slug)
  );

  const settings = {
    ...homeSettings.new_products,
    section_title: homeSettings.new_products.section_title || dictionary.sections.newProducts.title,
    section_subtitle: homeSettings.new_products.section_subtitle || dictionary.sections.newProducts.subtitle,
    products_count: HOME_PRODUCT_COUNT,
    responsive_columns: {
      desktop: HOME_PRODUCT_COUNT,
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
      viewAllText={dictionary.common.viewAll}
      fullView
      bundleProductSlugs={bundleProductSlugs}
      englishProductSlugs={newProductEnglishSlugs}
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
  const [
    { products: bestsellerProductsRaw },
    { products: bestsellerProductsEn },
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getBestsellerProducts({ per_page: 20, locale, currency, frontendHost }),
    getBestsellerProducts({ per_page: 20, locale: "en", currency, frontendHost }),
    getFreeGiftProductInfo(currency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const bestsellerEnglishSlugs: Record<number, string> = {};
  bestsellerProductsEn.forEach((product) => {
    bestsellerEnglishSlugs[product.id] = product.slug;
  });

  const bestsellerProducts = bestsellerProductsRaw.filter(
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
async function FeaturedProductsSection({ locale, isRTL, dictionary, homeSettings, currency, frontendHost }: {
  locale: Locale;
  isRTL: boolean;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  homeSettings: Awaited<ReturnType<typeof getHomePageSettings>>;
  currency: Currency;
  frontendHost: string;
}) {
  const [
    { products: featuredProductsRaw },
    { products: featuredProductsEn },
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getFeaturedProducts({ per_page: 20, locale, currency, frontendHost }),
    getFeaturedProducts({ per_page: 20, locale: "en", currency, frontendHost }),
    getFreeGiftProductInfo(currency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const featuredEnglishSlugs: Record<number, string> = {};
  featuredProductsEn.forEach((product) => {
    featuredEnglishSlugs[product.id] = product.slug;
  });

  const featuredProducts = featuredProductsRaw.filter(
    (product) =>
      !giftProductInfo.ids.includes(product.id) &&
      !giftProductInfo.slugs.includes(product.slug)
  );

  const settings = {
    ...homeSettings.featured_products,
    section_title:
      homeSettings.featured_products.section_title || dictionary.sections.featuredProducts.title,
    section_subtitle:
      homeSettings.featured_products.section_subtitle || dictionary.sections.featuredProducts.subtitle,
    products_count: HOME_PRODUCT_COUNT,
    responsive_columns: {
      desktop: HOME_PRODUCT_COUNT,
      tablet: homeSettings.featured_products.responsive_columns?.tablet ?? 3,
      mobile: homeSettings.featured_products.responsive_columns?.mobile ?? 2,
    },
  };

  return (
    <ProductSection
      settings={settings}
      products={featuredProducts}
      locale={locale}
      isRTL={isRTL}
      viewAllText={dictionary.common.viewAll}
      fullView
      bundleProductSlugs={bundleProductSlugs}
      englishProductSlugs={featuredEnglishSlugs}
    />
  );
}

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
  const marketSeoContent = getMarketHomeSeoContent(market.code, validLocale);
  const cmsSeoParagraphs = homeSections.seoContent?.paragraphs?.map((p) => t(p)).filter(hasText) || [];
  const mainCategoryBySlug = new Map(mainSiteCategories.map((category) => [category.slug, category]));
  const mainCategorySlugAliases: Record<string, string> = {
    "hair-mist": "sasan-hair-mist",
    "womens-perfumes": "woman-perfumes",
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

        <Suspense fallback={<ProductSectionSkeleton fullView />}>
          <FeaturedProductsSection
            locale={validLocale}
            isRTL={isRTL}
            dictionary={dictionary}
            homeSettings={homeSettings}
            currency={market.defaultCurrency}
            frontendHost={frontendHost}
          />
        </Suspense>

        <CollectionsSection settings={homeSettings.collections} locale={validLocale} marketPrefix={marketPrefix} />

        <BannersSection settings={homeSettings.banners} />

        <WhyChooseSection section={homeSections.whyChooseUs} locale={validLocale} isRTL={isRTL} />

        {homeSections.ourStory?.enabled !== false && (t(homeSections.ourStory?.title) || homeSections.ourStory?.image) && (
          <OurStorySection
            eyebrow={t(homeSections.ourStory?.eyebrow)}
            title={t(homeSections.ourStory?.title)}
            description1={t(homeSections.ourStory?.description1)}
            description2={t(homeSections.ourStory?.description2)}
            image={homeSections.ourStory?.image}
            stats={homeSections.ourStory?.stats?.map((s) => ({ value: s.value, label: t(s.label) }))}
          />
        )}

        <FAQSection section={homeSections.faq} locale={validLocale} isRTL={isRTL} />

        {homeSections.seoContent?.enabled !== false && (
          <SeoContentSection
            title={homeSections.seoContent?.title && hasText(t(homeSections.seoContent.title))
              ? t(homeSections.seoContent.title)
              : marketSeoContent.heading}
            paragraphs={cmsSeoParagraphs.length > 0 ? cmsSeoParagraphs : marketSeoContent.paragraphs}
            backgroundImage={homeSections.seoContent.backgroundImage}
            isRTL={isRTL}
          />
        )}
      </div>
    </>
  );
}
