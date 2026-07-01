import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { GroupedFAQAccordion, type FAQGroup } from "@/components/common/GroupedFAQAccordion";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getPageSeo, getStaticPageContent, pickLocale, mapRepeater, mapFAQGroups, getFeatureToggles } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleX,
  Headphones,
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";

interface ReturnsPageProps {
  params: Promise<{ locale: string }>;
}

// Default keywords (fallback when WordPress page doesn't exist)
const defaultKeywords = {
  en: ["return policy", "perfume exchange", "product returns", "returns and exchanges", "order help", "quality guarantee", "Sasan Perfumes", "UAE perfume returns", "refund policy", "return conditions", "Dubai perfume exchange"],
  ar: ["سياسة الإرجاع", "استبدال عطور", "إرجاع منتجات", "ضمان الجودة", "إرجاع عطور", "استبدال منتجات", "مساعدة الطلبات", "Sasan Perfumes", "إرجاع عطور الإمارات", "استرجاع الأموال", "شروط الإرجاع", "استبدال عطور دبي"],
};

type LocalizedField = {
  en?: string;
  ar?: string;
};

type ReturnsRepeaterItem = {
  title?: LocalizedField;
  desc?: LocalizedField;
  content?: LocalizedField;
  text?: LocalizedField;
};

type ReturnsDisplayItem = {
  title: string;
  body: string;
};

const featureIcons = [PackageCheck, RefreshCw, Truck];

function readLocalizedField(field: LocalizedField | undefined, locale: string): string {
  if (!field) return "";
  return locale === "ar" ? field.ar || field.en || "" : field.en || field.ar || "";
}

function mapReturnsItems(items: unknown, locale: string): ReturnsDisplayItem[] {
  if (!Array.isArray(items)) return [];

  return (items as ReturnsRepeaterItem[])
    .map((item) => ({
      title: readLocalizedField(item.title, locale) || readLocalizedField(item.text, locale),
      body:
        readLocalizedField(item.desc, locale) ||
        readLocalizedField(item.content, locale) ||
        readLocalizedField(item.text, locale),
    }))
    .filter((item) => item.title || item.body);
}

export async function generateMetadata({
  params,
}: ReturnsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";
  const dictionary = await getDictionary(lang);
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_returns_enabled) return {};
  const pageContent = dictionary.pages.returns;

  const wpSeo = await getPageSeo("returns", lang);

  const market = await getRequestMarket();
  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/returns",
    keywords: isAr ? defaultKeywords.ar : defaultKeywords.en,
    marketCode: market.code,
  });
}

export default async function ReturnsPage({ params }: ReturnsPageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_returns_enabled) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const wp = await getStaticPageContent("returns");

  const title = pickLocale(wp?.title, locale, "");
  const subtitle = pickLocale(wp?.subtitle, locale, "");

  // FAQ-style grouped content
  const wpFaqGroups = mapFAQGroups(wp?.returns_faq_groups, locale);

  // Featured links section
  const featuredLinksTitle = pickLocale(wp?.featured_links_title, locale, "featured links");
  const featuredLinksDesc = pickLocale(wp?.featured_links_description, locale, "Redirect efficiently your customers to a list of collections or products.");
  const wpFeaturedLinks = mapRepeater(wp?.featured_links, locale, (link) => ({
    label: locale === 'ar' ? (link.label?.ar || link.label_ar || '') : (link.label?.en || link.label_en || ''),
    url: link.url || '',
  }));
  const eligibleTitle = pickLocale(wp?.eligible_title, locale, "Eligible for Return");
  const notEligibleTitle = pickLocale(wp?.not_eligible_title, locale, "Not Eligible for Return");
  const processTitle = pickLocale(wp?.process_title, locale, dictionary.pages.returns.processTitle);
  const needHelpTitle = pickLocale(wp?.need_help, locale, "Need Help?");
  const needHelpText = pickLocale(wp?.need_help_text, locale, "");
  const features = mapReturnsItems(wp?.returns_features, locale);
  const steps = mapReturnsItems(wp?.returns_steps, locale);
  const eligibleItems = mapReturnsItems(wp?.returns_eligible, locale);
  const notEligibleItems = mapReturnsItems(wp?.returns_not_eligible, locale);

  const breadcrumbItems = [
    { name: dictionary.footer.returnPolicy, href: `${pathPrefix}/${locale}/returns` },
  ];

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} className="!pb-4 md:!pb-5" />
      <Breadcrumbs
        items={breadcrumbItems}
        locale={locale as Locale}
        className="!pb-7 !pt-0 md:!pb-8 md:!pt-0"
      />

      <main className="px-4 pb-24 pt-8 md:pb-20 md:pt-10">
        <div className="mx-auto max-w-6xl space-y-14 md:space-y-16">
          {features.length > 0 && (
            <section className="grid gap-4 md:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = featureIcons[index] || CheckCircle2;

                return (
                  <article
                    key={`${feature.title}-${index}`}
                    className="rounded-lg border border-[#e7ded7] bg-white p-5 md:p-7"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f1ed] text-brand-primary md:mb-5">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="mb-3 text-lg font-normal text-brand-primary">{feature.title}</h2>
                    {feature.body && (
                      <p className="text-sm leading-7 text-brand-primary/70">{feature.body}</p>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {steps.length > 0 && (
            <section className="grid gap-7 lg:grid-cols-[280px_1fr] lg:items-start">
              <div>
                <p className="mb-3 text-xs font-normal uppercase tracking-[0.14em] text-brand-primary/50">
                  {dictionary.footer.returnPolicy}
                </p>
                <h2 className="text-[28px] font-normal leading-tight text-brand-primary md:text-[34px]">
                  {processTitle}
                </h2>
              </div>
              <ol className="grid gap-4 sm:grid-cols-2">
                {steps.map((step, index) => (
                  <li
                    key={`${step.title}-${index}`}
                    className="relative rounded-lg border border-[#e7ded7] bg-[#fbfaf8] p-5 md:p-6"
                  >
                    <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-normal text-white">
                      {index + 1}
                    </div>
                    <h3 className="mb-2 text-lg font-normal text-brand-primary">{step.title}</h3>
                    {step.body && (
                      <p className="text-sm leading-7 text-brand-primary/70">{step.body}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(eligibleItems.length > 0 || notEligibleItems.length > 0) && (
            <section className="grid gap-5 lg:grid-cols-2">
              {eligibleItems.length > 0 && (
                <PolicyList
                  title={eligibleTitle}
                  items={eligibleItems}
                  icon="check"
                />
              )}
              {notEligibleItems.length > 0 && (
                <PolicyList
                  title={notEligibleTitle}
                  items={notEligibleItems}
                  icon="x"
                />
              )}
            </section>
          )}

          {wpFaqGroups.length > 0 && (
            <GroupedFAQAccordion groups={wpFaqGroups as FAQGroup[]} />
          )}

          {wpFeaturedLinks.length > 0 && (
            <div className="bg-[#f5f1ed] rounded-lg p-8 md:p-12">
              <h2 className="mb-4 text-2xl font-light text-brand-primary">{featuredLinksTitle}</h2>
              <p className="mb-6 text-sm text-brand-primary/70">{featuredLinksDesc}</p>
              <div className="space-y-3">
                {wpFeaturedLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <section className="mt-10 flex flex-col gap-6 rounded-lg bg-[#f5f1ed] p-7 md:mt-12 md:flex-row md:items-center md:justify-between md:p-9">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-brand-primary">
                <Headphones className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="mb-2 text-2xl font-normal text-brand-primary">{needHelpTitle}</h2>
                {needHelpText && (
                  <p className="max-w-2xl text-sm leading-7 text-brand-primary/70">{needHelpText}</p>
                )}
              </div>
            </div>
            <Link
              href={`${pathPrefix}/${locale}/contact`}
              className="inline-flex w-fit items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal uppercase tracking-[0.1em] text-brand-primary transition-opacity hover:opacity-70"
            >
              {dictionary.common.contact}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

function PolicyList({
  title,
  items,
  icon,
}: {
  title: string;
  items: ReturnsDisplayItem[];
  icon: "check" | "x";
}) {
  const Icon = icon === "check" ? Check : CircleX;

  return (
    <article className="rounded-lg border border-[#e7ded7] bg-white p-6 md:p-7">
      <h2 className="mb-5 text-2xl font-normal text-brand-primary">{title}</h2>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={`${item.title}-${index}`}
            className="flex gap-3 border-t border-[#e7ded7] pt-3 first:border-t-0 first:pt-0"
          >
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#f5f1ed] text-brand-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm leading-7 text-brand-primary/75">{item.title}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

