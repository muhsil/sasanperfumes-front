import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { GroupedFAQAccordion, type FAQGroup } from "@/components/common/GroupedFAQAccordion";
import { PolicyContent } from "@/components/common/PolicyContent";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getPageSeo, getStaticPageContent, pickLocale, mapRepeater, mapFAQGroups, getFeatureToggles } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

// Default keywords (fallback when WordPress page doesn't exist)
const defaultKeywords = {
  en: ["privacy policy", "data protection", "customer privacy", "information security", "ShapeHive", "customer data protection", "UAE data policy", "personal information security"],
  ar: ["سياسة الخصوصية", "حماية البيانات", "أمان المعلومات", "خصوصية العملاء", "شيب هايف", "حماية بيانات العملاء", "سياسة البيانات الإمارات", "أمان المعلومات الشخصية"],
};

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";
  const dictionary = await getDictionary(lang);
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_privacy_enabled) return {};
  const pageContent = dictionary.pages.privacy;

  const wpSeo = await getPageSeo("privacy", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/privacy",
    keywords: isAr ? defaultKeywords.ar : defaultKeywords.en,
  });
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_privacy_enabled) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const wp = await getStaticPageContent("privacy");

  const title = pickLocale(wp?.title, locale, "");
  const subtitle = pickLocale(wp?.subtitle, locale, "");

  // FAQ-style grouped content
  const wpFaqGroups = mapFAQGroups(wp?.privacy_faq_groups, locale);

  // Featured links section
  const featuredLinksTitle = pickLocale(wp?.featured_links_title, locale, "featured links");
  const featuredLinksDesc = pickLocale(wp?.featured_links_description, locale, "Redirect efficiently your customers to a list of collections or products.");
  const wpFeaturedLinks = mapRepeater(wp?.featured_links, locale, (link) => ({
    label: locale === 'ar' ? (link.label?.ar || link.label_ar || '') : (link.label?.en || link.label_en || ''),
    url: link.url || '',
  }));

  const breadcrumbItems = [
    { name: dictionary.footer.privacyPolicy, href: `/${locale}/privacy` },
  ];

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      <div className="px-4 pt-8 md:pt-10 pb-16">
        <div className="max-w-3xl mx-auto space-y-16">
          <PolicyContent
            data={wp}
            locale={locale}
            sectionKeys={["privacy_sections"]}
          />

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

          <div className="border-t border-[#e7ded7] pt-8">
            <a
              href={`/${locale}/contact`}
              className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
            >
              {dictionary.common.contact}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
