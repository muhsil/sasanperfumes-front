import { notFound as nextNotFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { FAQPageContent } from "./FAQPageContent";
import type { FAQPageData } from "./FAQPageContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, generateFAQJsonLd } from "@/lib/utils/seo";
import { getPageSeo, getStaticPageContent, pickLocale, mapRepeater, mapFAQGroups, getFeatureToggles } from "@/lib/api/wordpress";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

interface FAQPageProps {
  params: Promise<{ locale: string }>;
}

// Default keywords (fallback when WordPress page doesn't exist)
const defaultKeywords = {
  en: ["FAQ", "frequently asked questions", "perfume FAQ", "fragrance help", "shipping UAE", "returns", "payment methods", "Arabian oud", "luxury perfumes", "Sasan Perfumes", "how to order perfume", "delivery time UAE", "exchange policy", "order tracking", "aromatic perfume FAQ", "aromatic scents help", "Sasan Perfumes questions", "how to order from aromatic"],
  ar: ["أسئلة شائعة", "مساعدة", "عطور", "شحن", "إرجاع", "طرق الدفع", "توصيل الإمارات", "عود عربي", "عطور فاخرة", "شيب هايف", "كيف اطلب عطور", "مدة التوصيل", "طريقة الاستبدال", "تتبع الطلب"],
};

export async function generateMetadata({
  params,
}: FAQPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_faq_enabled) return {};
  const isAr = lang === "ar";
  const dictionary = await getDictionary(lang);
  const pageContent = dictionary.pages.faq;

  const wpSeo = await getPageSeo("faq", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/faq",
    keywords: isAr ? defaultKeywords.ar : defaultKeywords.en,
  });
}

export default async function FAQPage({ params }: FAQPageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_faq_enabled) nextNotFound();
  const dictionary = await getDictionary(locale as Locale);
  const wp = await getStaticPageContent("faq");
  const pageContent = dictionary.pages.faq;

  const title = pickLocale(wp?.title, locale, pageContent.title);
  const subtitle = pickLocale(wp?.subtitle, locale, pageContent.subtitle);

  // FAQ-style grouped content from faq_groups or fallback to flat faq_items
  const wpFaqGroups = mapFAQGroups(wp?.faq_groups, locale);
  const wpFaqItems = mapRepeater(wp?.faq_items, locale, (item) => ({
    question: locale === "ar" ? item.q?.ar || item.q_ar || "" : item.q?.en || item.q_en || "",
    answer: locale === "ar" ? item.a?.ar || item.a_ar || "" : item.a?.en || item.a_en || "",
  })).filter((item) => item.question || item.answer);
  const faqGroups = wpFaqGroups.length > 0 ? wpFaqGroups : (
    wpFaqItems.length > 0 ? [{ title: "", items: wpFaqItems }] : []
  );

  const breadcrumbItems = [
    { name: title, href: `${pathPrefix}/${locale}/faq` },
  ];

  // Flatten groups for JsonLd
  const allFaqItems = faqGroups.flatMap(group => group.items);
  const faqJsonLd = generateFAQJsonLd(allFaqItems);

  return (
    <div>
      <JsonLd data={faqJsonLd} />
      <PageHeader title={title} subtitle={subtitle} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />
      <FAQPageContent
        locale={locale}
        initialData={wp as FAQPageData | null}
        dictionary={{
          notFound: pageContent.notFound,
          notFoundText: pageContent.notFoundText,
        }}
        contactLabel={dictionary.common.contact}
      />
    </div>
  );
}
