import { Suspense } from "react";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getNewProducts, getFeaturedProducts, getFreeGiftProductInfo, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getHomePageSettings, getSeoSettings, getHomeSections } from "@/lib/api/wordpress";
import {
  HeroSlider,
  ProductSection,
  CollectionsSection,
  BannersSection,
  BrandsSlider,
  SeoContentSection,
  OurStorySection,
} from "@/components/sections";
import { ProductSectionSkeleton } from "@/components/sections/ProductSection";
import { siteConfig, type Locale } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 300;

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = locale as Locale;
  const isArabic = validLocale === "ar";

  const seoSettings = await getSeoSettings(validLocale);

  const seoTitle = (isArabic ? seoSettings.titleAr : seoSettings.title) || siteConfig.name;
  const seoDescription = (isArabic ? seoSettings.descriptionAr : seoSettings.description) || siteConfig.description;

  const baseMetadata = generateSeoMetadata({
    title: seoTitle,
    description: seoDescription,
    locale: validLocale,
    pathname: "",
    keywords: isArabic
      ? ["عطور فاخرة", "عطور عربية", "زيوت عطرية", "عناية بالجسم", "معطرات منزل", "ساسان للعطور", "عطور الإمارات", "شراء عطور اون لاين", "عود عربي", "هدايا عطرية", "عطور دبي", "بخور", "عطور طبيعية", "عطور نسائية", "عطور رجالية", "عطور أصلية", "عطور مسك", "عطور عنبر", "متجر عطور أون لاين الإمارات", "عطور فخمة دبي", "أفضل عطور عربية", "عطور هدايا فخمة", "بخور عود", "عطر شرقي", "توصيل عطور الإمارات", "عطر أروماتيك", "أروماتيك الإمارات", "أروماتيك دبي", "زيوت أروماتيك", "لوشن جسم أروماتيك", "كريم يد وجسم أروماتيك", "عطور وروائح أروماتيك", "علب هدايا أروماتيك", "عطر جيد", "عطور بأسعار معقولة الإمارات", "عطور رجالية ونسائية", "أفضل رائحة عطر", "عطر يدوم طويلاً الإمارات"]
      : ["premium perfumes", "Arabian fragrances", "aromatic oils", "body care", "home fragrances", "Sasan Perfumes", "UAE perfume", "buy perfume online", "Arabian oud", "luxury perfume Dubai", "natural fragrance", "perfume gift sets", "oud perfume", "women perfume UAE", "men cologne Dubai", "bakhoor incense", "best perfume UAE", "handcrafted perfume", "niche perfume Dubai", "oriental fragrance", "musk perfume", "amber perfume", "online perfume store UAE", "luxury scent collection", "perfume delivery UAE", "aromatic perfume", "aromatic UAE", "aromatic Dubai", "aromatic oils", "aromatic body lotion", "aromatic hand and body lotion", "aromatic perfumes and fragrances", "aromatic gift boxes", "good perfume", "affordable perfume UAE", "perfume for men and women", "best smelling perfume", "long lasting scent UAE", "aromatic scent collection"],
  });

  return {
    ...baseMetadata,
    title: { absolute: seoTitle },
  };
}

// ─── Async server component: New Products section ───
// Fetches its own data so the hero/banners can render without waiting for products
async function NewProductsSection({ locale, isRTL, dictionary, homeSettings }: {
  locale: Locale;
  isRTL: boolean;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  homeSettings: Awaited<ReturnType<typeof getHomePageSettings>>;
}) {
  const [
    { products: newProductsRaw },
    { products: newProductsEn },
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getNewProducts({ per_page: 20, locale }),
    getNewProducts({ per_page: 20, locale: "en" }),
    getFreeGiftProductInfo(),
    getBundleEnabledProductSlugs(),
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

// ─── Async server component: Featured Products section ───
async function FeaturedSection({ locale, isRTL, dictionary, homeSettings }: {
  locale: Locale;
  isRTL: boolean;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  homeSettings: Awaited<ReturnType<typeof getHomePageSettings>>;
}) {
  const [
    { products: featuredProductsRaw },
    { products: featuredProductsEn },
    giftProductInfo,
    bundleProductSlugs,
  ] = await Promise.all([
    getFeaturedProducts({ per_page: 20, locale }),
    getFeaturedProducts({ per_page: 20, locale: "en" }),
    getFreeGiftProductInfo(),
    getBundleEnabledProductSlugs(),
  ]);

  const featuredProductEnglishSlugs: Record<number, string> = {};
  featuredProductsEn.forEach((product) => {
    featuredProductEnglishSlugs[product.id] = product.slug;
  });

  const featuredProducts = featuredProductsRaw.filter(
    (product) =>
      !giftProductInfo.ids.includes(product.id) &&
      !giftProductInfo.slugs.includes(product.slug)
  );

  const settings = {
    ...homeSettings.featured_products,
    section_title: homeSettings.featured_products.section_title || dictionary.sections.featuredProducts.title,
    section_subtitle: homeSettings.featured_products.section_subtitle || dictionary.sections.featuredProducts.subtitle,
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
      englishProductSlugs={featuredProductEnglishSlugs}
    />
  );
}

// ─── Main homepage component ───
// Only fetches hero/banner settings for instant above-the-fold render.
// Product sections stream in via Suspense boundaries.
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const validLocale = locale as Locale;
  const isRTL = locale === "ar";

  // Only fetch what's needed for above-the-fold content (hero + banners + dictionary)
  // Product data is fetched independently by each Suspense-wrapped section below
  const [dictionary, homeSettings, homeSections] = await Promise.all([
    getDictionary(validLocale),
    getHomePageSettings(validLocale),
    getHomeSections(),
  ]);

  const t = (bi: { en: string; ar: string }) => isRTL ? bi.ar : bi.en;

  const collectionsSettings = {
    ...homeSettings.collections,
    section_title: homeSettings.collections.section_title || dictionary.sections.collections.title,
    section_subtitle: homeSettings.collections.section_subtitle || dictionary.sections.collections.subtitle,
  };

  // H1 heading text for SEO - hidden visually but read by search engines
  const h1Text = isRTL ? "ساسان للعطور" : siteConfig.name;

  return (
    <div className="flex flex-col">
      <h1 className="sr-only">{h1Text}</h1>

      <HeroSlider settings={homeSettings.hero_slider} />
      <BrandsSlider locale={validLocale} />

      <div className="relative bg-transparent">
        <Suspense fallback={<ProductSectionSkeleton fullView />}>
          <NewProductsSection
            locale={validLocale}
            isRTL={isRTL}
            dictionary={dictionary}
            homeSettings={homeSettings}
          />
        </Suspense>

        <CollectionsSection settings={collectionsSettings} />

        <Suspense fallback={<ProductSectionSkeleton fullView />}>
          <FeaturedSection
            locale={validLocale}
            isRTL={isRTL}
            dictionary={dictionary}
            homeSettings={homeSettings}
          />
        </Suspense>

        <BannersSection settings={homeSettings.banners} />

        {homeSections.seoContent?.enabled !== false && (homeSections.seoContent?.paragraphs?.length ?? 0) > 0 && (
          <SeoContentSection
            title={homeSections.seoContent.title ? t(homeSections.seoContent.title) : undefined}
            paragraphs={homeSections.seoContent.paragraphs.map((p) => t(p))}
            backgroundImage={homeSections.seoContent.backgroundImage}
            isRTL={isRTL}
          />
        )}

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
      </div>
    </div>
  );
}
