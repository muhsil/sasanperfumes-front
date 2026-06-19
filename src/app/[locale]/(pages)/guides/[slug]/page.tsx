import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateMetadata as generateSeoMetadata, generateItemListJsonLd, generateFAQJsonLd } from "@/lib/utils/seo";
import { getProductBySlug } from "@/lib/api/woocommerce";
import { getGuidePages, getGuidePageBySlug } from "@/lib/api/wordpress";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { getDictionary } from "@/i18n";
import { siteConfig, type Locale } from "@/config/site";
import type { Metadata } from "next";
import type { WCProduct } from "@/types/woocommerce";
import type { GuidePage as WPGuidePage } from "@/types/wordpress";
import type { GuideProduct } from "@/types/wordpress";
import { GuideProductCard } from "./GuideProductCard";
import {
  ChevronRight,
  Clock,
  MapPin,
  Star,
} from "lucide-react";

// Unified shape used by the page component
interface GuideData {
  slug: string;
  title: { en: string; ar: string };
  metaDescription: { en: string; ar: string };
  keywords: { en: string[]; ar: string[] };
  eyebrow: { en: string; ar: string };
  intro: { en: string; ar: string };
  products: GuideProduct[];
  contentBlocks: Array<{ heading: { en: string; ar: string }; body: { en: string; ar: string } }>;
  faqs: Array<{ question: { en: string; ar: string }; answer: { en: string; ar: string } }>;
  relatedGuideSlugs: string[];
  ogImage?: string;
  publishedAt: string;
  updatedAt: string;
}

function wpToGuideData(wp: WPGuidePage): GuideData {
  return {
    slug: wp.slug,
    title: wp.title,
    metaDescription: wp.metaDescription,
    keywords: wp.keywords,
    eyebrow: wp.eyebrow,
    intro: wp.intro,
    products: wp.products.map(p => ({
      slug: p.slug,
      rank: p.rank,
      pickReason: p.pickReason,
      description: p.description,
    })),
    contentBlocks: wp.contentBlocks,
    faqs: wp.faqs,
    relatedGuideSlugs: wp.relatedGuideSlugs,
    ogImage: wp.ogImage,
    publishedAt: wp.publishedAt,
    updatedAt: wp.updatedAt,
  };
}

async function resolveGuide(slug: string): Promise<GuideData | null> {
  const wp = await getGuidePageBySlug(slug);
  if (wp) return wpToGuideData(wp);
  return null;
}

async function resolveAllSlugs(): Promise<string[]> {
  const wpGuides = await getGuidePages();
  return wpGuides.map(g => g.slug);
}

export const revalidate = 3600; // Revalidate every hour

interface GuidePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await resolveAllSlugs();
  const allParams: { locale: string; slug: string }[] = [];
  for (const locale of siteConfig.locales) {
    for (const slug of slugs) {
      allParams.push({ locale, slug });
    }
  }
  return allParams;
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = await resolveGuide(slug);

  if (!guide) {
    return {};
  }

  const validLocale = locale as Locale;

  return generateSeoMetadata({
    title: guide.title[validLocale],
    description: guide.metaDescription[validLocale],
    locale: validLocale,
    pathname: `/guides/${slug}`,
    keywords: guide.keywords[validLocale],
    image: guide.ogImage,
  });
}
export default async function GuidePage({ params }: GuidePageProps) {
  const { locale, slug } = await params;
  const guide = await resolveGuide(slug);

  if (!guide) {
    notFound();
  }

  const validLocale = locale as Locale;
  const isRTL = locale === "ar";
  const dictionary = await getDictionary(validLocale);
  const dict = dictionary.pages.guides;
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  // Fetch all products in parallel
  const productPromises = guide.products.map((gp) =>
    getProductBySlug(gp.slug, validLocale, market.defaultCurrency, frontendHost)
  );
  const fetchedProducts = await Promise.all(productPromises);

  // Pair guide product data with WooCommerce product data
  const productPairs: { guideProduct: GuideProduct; wcProduct: WCProduct }[] =
    [];
  for (let i = 0; i < guide.products.length; i++) {
    const wc = fetchedProducts[i];
    if (wc) {
      productPairs.push({ guideProduct: guide.products[i], wcProduct: wc });
    }
  }

  // Generate JSON-LD structured data
  const itemListItems = productPairs.map((pair) => ({
    name: pair.wcProduct.name,
    url: `${siteConfig.url}/${locale}/product/${pair.guideProduct.slug}`,
    image: pair.wcProduct.images[0]?.src || "",
    position: pair.guideProduct.rank,
  }));

  const faqItems = guide.faqs.map((faq) => ({
    question: faq.question[validLocale],
    answer: faq.answer[validLocale],
  }));

  // Article schema for enhanced search appearance
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title[validLocale],
    description: guide.metaDescription[validLocale],
    url: `${siteConfig.url}/${locale}/guides/${slug}`,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      ...(siteConfig.logoUrl ? {
        logo: {
          "@type": "ImageObject",
          url: siteConfig.logoUrl,
        },
      } : {}),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/${locale}/guides/${slug}`,
    },
    keywords: guide.keywords[validLocale].join(", "),
    inLanguage: locale === "ar" ? "ar" : "en",
  };

  // Get related guides from WordPress
  const relatedGuideData: GuideData[] = [];
  for (const relSlug of guide.relatedGuideSlugs) {
    const rel = await resolveGuide(relSlug);
    if (rel) relatedGuideData.push(rel);
  }
  const relatedGuides = relatedGuideData;

  const breadcrumbItems = [
    {
      name: dict.breadcrumb,
      href: `/${locale}/guides`,
    },
    {
      name: guide.title[validLocale],
      href: `/${locale}/guides/${slug}`,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* JSON-LD Structured Data — ItemList, FAQ, Article (Breadcrumb handled by Breadcrumbs component) */}
      <JsonLd data={generateItemListJsonLd({
        name: guide.title[validLocale],
        description: guide.metaDescription[validLocale],
        url: `${siteConfig.url}/${locale}/guides/${slug}`,
        items: itemListItems,
      })} />
      <JsonLd data={generateFAQJsonLd(faqItems)} />
      <JsonLd data={articleJsonLd} />

      {/* Hero Section */}
      <section className="bg-[#f8f3ef] px-4 pb-6 pt-8 text-brand-primary md:pb-8 md:pt-10">
        <p className="mb-2 text-xs font-normal uppercase tracking-[0.1em] text-brand-primary/40">
          {guide.eyebrow[validLocale]}
        </p>
        <h1 className="text-[36px] font-normal leading-none tracking-normal md:text-[48px]">
          {guide.title[validLocale]}
        </h1>
        <p className="mt-2 max-w-[620px] text-[15px] leading-6 tracking-normal text-brand-primary md:text-base">
          {guide.intro[validLocale]}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-brand-primary/40">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {dict.updated}
              {new Date(guide.updatedAt).toLocaleDateString(
                isRTL ? "ar-SA" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{dict.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            <span>{productPairs.length} {dict.expertPicks}</span>
          </div>
        </div>
      </section>

      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} locale={validLocale} />

      {/* Product List Section */}
      <section className="bg-white py-8 md:py-10">
        <div className="px-4">
          <div className="max-w-5xl">
            <p className="mb-1 text-xs font-normal uppercase tracking-[0.1em] text-brand-primary/40">{dict.ourPicks}</p>
            <h2 className="mb-8 font-normal text-2xl text-brand-primary md:text-3xl">{dict.topPicks}</h2>

            {/* Product Cards */}
            <div className="space-y-5 sm:space-y-8">
              {productPairs.map((pair) => (
                <GuideProductCard
                  key={pair.guideProduct.slug}
                  product={pair.wcProduct}
                  rank={pair.guideProduct.rank}
                  pickReason={pair.guideProduct.pickReason[validLocale]}
                  description={pair.guideProduct.description[validLocale]}
                  locale={validLocale}
                  productSlug={pair.guideProduct.slug}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Blocks Section */}
      {guide.contentBlocks.length > 0 && (
        <section className="bg-[#f8f3ef] py-8 md:py-10">
          <div className="px-4">
            <div className="max-w-4xl">
              <h2 className="mb-8 font-normal text-2xl text-brand-primary md:text-3xl">{dict.buyingGuide}</h2>
              <div className="space-y-4">
                {guide.contentBlocks.map((block, index) => (
                  <div key={index} className="border border-[#e7ded7] bg-white p-4 sm:p-6">
                    <h3 className="mb-2 text-sm font-normal text-brand-primary">{block.heading[validLocale]}</h3>
                    <p className="text-xs leading-relaxed text-brand-primary/60 sm:text-sm">{block.body[validLocale]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {guide.faqs.length > 0 && (
        <section className="bg-white py-8 md:py-10">
          <div className="px-4">
            <div className="max-w-4xl">
              <h2 className="mb-2 font-normal text-2xl text-brand-primary md:text-3xl">{dict.faqTitle}</h2>
              <p className="mb-6 text-sm text-brand-primary/60">{dict.faqSubtitle}</p>
              <div className="space-y-3">
                {guide.faqs.map((faq, index) => (
                  <details key={index} className="group border border-[#e7ded7] bg-white">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-left text-sm font-normal text-brand-primary sm:px-6 sm:py-5 sm:text-base [&::-webkit-details-marker]:hidden">
                      <span>{faq.question[validLocale]}</span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-brand-primary/40 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-4 text-sm leading-relaxed text-brand-primary/60 sm:px-6 sm:pb-5 sm:text-base">
                      {faq.answer[validLocale]}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Guides */}
      {relatedGuides.length > 0 && (
        <section className="bg-[#f8f3ef] py-8 md:py-10">
          <div className="px-4">
            <div className="max-w-4xl">
              <h2 className="mb-6 font-normal text-2xl text-brand-primary md:text-3xl">{dict.relatedGuides}</h2>
              <div className="grid gap-px md:grid-cols-2">
                {relatedGuides.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/${locale}/guides/${related.slug}`}
                    className="group border border-[#e7ded7] bg-white p-6"
                  >
                    <h3 className="text-sm font-normal text-brand-primary">{related.title[validLocale]}</h3>
                    <p className="mt-2 text-xs text-brand-primary/60 line-clamp-2">{related.metaDescription[validLocale]}</p>
                    <span className="mt-3 inline-flex items-center gap-1 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase">
                      {dict.readGuide.replace("{title}", related.title[validLocale])}
                      <ChevronRight className={`h-3.5 w-3.5 ${isRTL ? "rotate-180" : ""}`} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-white py-8 md:py-10">
        <div className="px-4">
          <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">{dict.ctaTitle}</h2>
          <p className="mt-2 max-w-xl text-sm text-brand-primary/60">{dict.ctaDescription}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
            >
              {dict.ctaShopButton}
            </Link>
            <Link
              href={`/${locale}/category/perfumes`}
              className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
            >
              {dict.ctaBrowseButton}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
