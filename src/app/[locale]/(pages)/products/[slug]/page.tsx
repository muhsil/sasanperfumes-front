import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateMetadata as generateSeoMetadata, generateFAQJsonLd } from "@/lib/utils/seo";
import { getProductPageBySlug, getProductPages } from "@/lib/api/wordpress";
import { getProductsByCategory, getNewProducts, getFeaturedProducts, getBestsellerProducts, getFreeGiftProductInfo, getBundleEnabledProductSlugs } from "@/lib/api/woocommerce";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { ProductSectionSkeleton } from "@/components/sections/ProductSection";
import { ProductSection } from "@/components/sections";
import { siteConfig, type Currency, type Locale } from "@/config/site";
import { getDictionary } from "@/i18n";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import type { ProductPage, ProductPageFAQItem } from "@/types/wordpress";

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const pages = await getProductPages();
  const allParams: { locale: string; slug: string }[] = [];
  for (const locale of siteConfig.locales) {
    for (const page of pages) {
      allParams.push({ locale, slug: page.slug });
    }
  }
  return allParams;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const validLocale = locale as Locale;
  const isArabic = validLocale === "ar";

  const page = await getProductPageBySlug(slug, validLocale);
  if (!page) return {};

  const title = (isArabic ? page.seo.titleAr : page.seo.title) || page.title;
  const description = isArabic ? page.seo.descriptionAr : page.seo.description;
  const keywords = (isArabic ? page.seo.keywordsAr : page.seo.keywords)
    ?.split(",")
    .map((k: string) => k.trim())
    .filter(Boolean);

  return generateSeoMetadata({
    title,
    description,
    locale: validLocale,
    pathname: `/products/${slug}`,
    keywords,
    image: page.seo.ogImage || page.hero.image || undefined,
  });
}

// ─── Products Section (async, Suspense-wrapped) ───
async function ProductsBlock({
  page,
  locale,
  isRTL,
  dictionary,
  currency,
  frontendHost,
}: {
  page: ProductPage;
  locale: Locale;
  isRTL: boolean;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  currency: Currency;
  frontendHost: string;
}) {
  const { products: config } = page;
  if (!config.enabled) return null;

  type ProductsResult = Awaited<ReturnType<typeof getNewProducts>>;
  let productsRaw: ProductsResult["products"] = [];
  let productsEn: ProductsResult["products"] = [];

  switch (config.source) {
    case "category":
      if (config.categorySlug) {
        const [localRes, enRes] = await Promise.all([
          getProductsByCategory(config.categorySlug, { per_page: config.count, locale, currency, frontendHost }),
          getProductsByCategory(config.categorySlug, { per_page: config.count, locale: "en", currency, frontendHost }),
        ]);
        productsRaw = localRes.products;
        productsEn = enRes.products;
      }
      break;
    case "featured": {
      const [localRes, enRes] = await Promise.all([
        getFeaturedProducts({ per_page: config.count, locale, currency, frontendHost }),
        getFeaturedProducts({ per_page: config.count, locale: "en", currency, frontendHost }),
      ]);
      productsRaw = localRes.products;
      productsEn = enRes.products;
      break;
    }
    case "bestseller": {
      const [localRes, enRes] = await Promise.all([
        getBestsellerProducts({ per_page: config.count, locale, currency, frontendHost }),
        getBestsellerProducts({ per_page: config.count, locale: "en", currency, frontendHost }),
      ]);
      productsRaw = localRes.products;
      productsEn = enRes.products;
      break;
    }
    case "latest":
    default: {
      const [localRes, enRes] = await Promise.all([
        getNewProducts({ per_page: config.count, locale, currency, frontendHost }),
        getNewProducts({ per_page: config.count, locale: "en", currency, frontendHost }),
      ]);
      productsRaw = localRes.products;
      productsEn = enRes.products;
      break;
    }
  }

  // Build English slug map and filter gift products
  const englishSlugs: Record<number, string> = {};
  productsEn.forEach((p) => { englishSlugs[p.id] = p.slug; });

  const [giftInfo, bundleSlugs] = await Promise.all([
    getFreeGiftProductInfo(currency, frontendHost),
    getBundleEnabledProductSlugs(frontendHost),
  ]);

  const filteredProducts = productsRaw.filter(
    (p) => !giftInfo.ids.includes(p.id) && !giftInfo.slugs.includes(p.slug)
  );

  const sectionTitle = isRTL ? (config.titleAr || config.title) : config.title;
  const sectionSubtitle = isRTL ? (config.subtitleAr || config.subtitle) : config.subtitle;

  const settings = {
    enabled: true,
    section_title: sectionTitle || dictionary.sections.newProducts.title,
    section_subtitle: sectionSubtitle || dictionary.sections.newProducts.subtitle,
    products_count: config.count,
    show_view_all: config.showViewAll,
    view_all_link: config.viewAllLink || "/shop",
    hide_on_mobile: config.hideOnMobile,
    hide_on_desktop: config.hideOnDesktop,
  };

  return (
    <ProductSection
      settings={settings}
      products={filteredProducts}
      locale={locale}
      isRTL={isRTL}
      viewAllText={dictionary.common.viewAll}
      className="bg-brand-beige"
      bundleProductSlugs={bundleSlugs}
      englishProductSlugs={englishSlugs}
    />
  );
}

// ─── Hero Section ───
function HeroSection({ page, isRTL }: { page: ProductPage; isRTL: boolean }) {
  if (!page.hero.enabled) return null;

  const title = isRTL ? (page.hero.titleAr || page.hero.title) : page.hero.title;
  const subtitle = isRTL ? (page.hero.subtitleAr || page.hero.subtitle) : page.hero.subtitle;
  const description = isRTL ? (page.hero.descriptionAr || page.hero.description) : page.hero.description;
  const ctaText = isRTL ? (page.hero.ctaTextAr || page.hero.ctaText) : page.hero.ctaText;

  return (
    <section className="bg-[#f8f3ef] px-5 pb-6 pt-8 text-brand-primary md:px-7 md:pb-8 md:pt-10 lg:px-12">
      {subtitle && (
        <p className="mb-2 text-xs font-normal uppercase tracking-[0.1em] text-brand-primary/40">{subtitle}</p>
      )}
      <h1 className="text-[36px] font-normal leading-none tracking-normal md:text-[48px]">{title || page.title}</h1>
      {description && (
        <p className="mt-2 max-w-[620px] text-[15px] leading-6 tracking-normal text-brand-primary md:text-base">{description}</p>
      )}
      {ctaText && page.hero.ctaLink && (
        <Link
          href={page.hero.ctaLink}
          className="mt-4 inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
        >
          {ctaText}
          <ChevronRight className={`h-3.5 w-3.5 ${isRTL ? "rotate-180" : ""}`} />
        </Link>
      )}
    </section>
  );
}

// ─── Banners Section ───
function BannersBlock({ page, isRTL }: { page: ProductPage; isRTL: boolean }) {
  if (!page.banners.enabled || !page.banners.items.length) return null;

  return (
    <section className={`py-6 ${page.banners.hideOnMobile ? "hidden md:block" : ""} ${page.banners.hideOnDesktop ? "md:hidden" : ""}`}>
      <div className="container mx-auto px-5 md:px-7 lg:px-12">
        <div className={`grid gap-4 ${page.banners.items.length === 1 ? "grid-cols-1" : page.banners.items.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
          {page.banners.items.map((banner, idx) => {
            const bannerTitle = isRTL ? (banner.titleAr || banner.title) : banner.title;
            const bannerSubtitle = isRTL ? (banner.subtitleAr || banner.subtitle) : banner.subtitle;

            const content = (
              <div className="group relative overflow-hidden">
                {banner.image && (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={banner.image}
                      alt={bannerTitle || `Banner ${idx + 1}`}
                      fill
                      className={`object-cover transition-transform duration-500 group-hover:scale-105 ${banner.mobileImage ? "hidden md:block" : ""}`}
                    />
                    {banner.mobileImage && (
                      <Image
                        src={banner.mobileImage}
                        alt={bannerTitle || `Banner ${idx + 1}`}
                        fill
                        className="object-cover md:hidden"
                      />
                    )}
                    {(bannerTitle || bannerSubtitle) && (
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6">
                        <div>
                          {bannerTitle && <h3 className="text-xl font-bold text-white">{bannerTitle}</h3>}
                          {bannerSubtitle && <p className="mt-1 text-sm text-white/80">{bannerSubtitle}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );

            return banner.link ? (
              <Link key={idx} href={banner.link}>{content}</Link>
            ) : (
              <div key={idx}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ───
function FeaturesBlock({ page, isRTL }: { page: ProductPage; isRTL: boolean }) {
  if (!page.features.enabled || !page.features.items.length) return null;

  const sectionTitle = isRTL ? (page.features.titleAr || page.features.title) : page.features.title;

  return (
    <section className={`bg-white py-8 md:py-10 ${page.features.hideOnMobile ? "hidden md:block" : ""} ${page.features.hideOnDesktop ? "md:hidden" : ""}`}>
      <div className="px-5 md:px-7 lg:px-12">
        {sectionTitle && (
          <h2 className="mb-8 font-normal text-2xl text-brand-primary md:text-3xl">{sectionTitle}</h2>
        )}
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {page.features.items.map((feature, idx) => {
            const featureTitle = isRTL ? (feature.titleAr || feature.title) : feature.title;
            const featureDesc = isRTL ? (feature.descriptionAr || feature.description) : feature.description;

            return (
              <div key={idx} className="border-t border-[#e7ded7] p-6">
                <div className="mb-4 flex h-8 w-8 items-center justify-center text-brand-primary">
                  <span className="text-sm font-normal">{String(idx + 1).padStart(2, "0")}</span>
                </div>
                {featureTitle && <h3 className="mb-2 text-sm font-normal text-brand-primary">{featureTitle}</h3>}
                {featureDesc && <p className="text-xs leading-relaxed text-brand-primary/60">{featureDesc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Section ───
function FAQBlock({ page, isRTL }: { page: ProductPage; isRTL: boolean }) {
  if (!page.faq.enabled || !page.faq.items.length) return null;

  const sectionTitle = isRTL ? (page.faq.titleAr || page.faq.title) : page.faq.title;

  return (
    <section className="bg-brand-beige py-8 sm:py-12 md:py-16">
      <div className="container mx-auto px-5 md:px-7 lg:px-12">
        <div className="mx-auto max-w-4xl">
          {sectionTitle && (
            <h2 className="mb-8 font-normal text-2xl text-brand-primary md:text-3xl">{sectionTitle}</h2>
          )}
          <div className="space-y-3 sm:space-y-4">
            {page.faq.items.map((faq: ProductPageFAQItem, idx: number) => {
              const question = isRTL ? (faq.questionAr || faq.question) : faq.question;
              const answer = isRTL ? (faq.answerAr || faq.answer) : faq.answer;
              if (!question) return null;

              return (
                <details key={idx} className="group border border-[#e7ded7] bg-white">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-left text-sm font-normal text-brand-primary transition-colors hover:text-brand-primary sm:px-6 sm:py-5 sm:text-base [&::-webkit-details-marker]:hidden">
                    <span>{question}</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-brand-gold transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4 text-sm leading-relaxed text-brand-primary/80 sm:px-6 sm:pb-5 sm:text-base">
                    {answer}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page Component ───
export default async function DynamicProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const validLocale = locale as Locale;
  const isRTL = locale === "ar";
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  const [page, dictionary] = await Promise.all([
    getProductPageBySlug(slug, validLocale),
    getDictionary(validLocale),
  ]);

  if (!page) {
    notFound();
  }

  const pageTitle = isRTL ? (page.hero.titleAr || page.hero.title || page.title) : (page.hero.title || page.title);

  const breadcrumbItems = [
    { name: pageTitle, href: `/${locale}/products/${slug}` },
  ];

  // Build section order from layout
  const sectionOrder = page.layout.sectionOrder
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  // Build FAQ JSON-LD
  const faqItems = page.faq.enabled
    ? page.faq.items
        .filter((f: ProductPageFAQItem) => f.question || f.questionAr)
        .map((f: ProductPageFAQItem) => ({
          question: isRTL ? (f.questionAr || f.question) : f.question,
          answer: isRTL ? (f.answerAr || f.answer) : f.answer,
        }))
    : [];

  // Render sections in configured order
  const sectionComponents: Record<string, React.ReactNode> = {
    hero: <HeroSection key="hero" page={page} isRTL={isRTL} />,
    products: (
      <Suspense key="products" fallback={<ProductSectionSkeleton />}>
        <ProductsBlock
          page={page}
          locale={validLocale}
          isRTL={isRTL}
          dictionary={dictionary}
          currency={market.defaultCurrency}
          frontendHost={frontendHost}
        />
      </Suspense>
    ),
    banners: <BannersBlock key="banners" page={page} isRTL={isRTL} />,
    features: <FeaturesBlock key="features" page={page} isRTL={isRTL} />,
    faq: <FAQBlock key="faq" page={page} isRTL={isRTL} />,
  };

  return (
    <div className="flex flex-col">
      {faqItems.length > 0 && <JsonLd data={generateFAQJsonLd(faqItems)} />}

      {sectionOrder.map((section: string) => sectionComponents[section] ?? null)}

      {/* Breadcrumbs after hero, before content */}
      {sectionOrder[0] === "hero" && page.hero.enabled && (
        <div className="w-full px-5 md:px-7 lg:px-12 py-4">
          <Breadcrumbs items={breadcrumbItems} locale={validLocale} contained={false} />
        </div>
      )}

      {/* Render any sections not in the order (fallback) */}
      {Object.keys(sectionComponents)
        .filter((key) => !sectionOrder.includes(key))
        .map((key) => sectionComponents[key])}
    </div>
  );
}
