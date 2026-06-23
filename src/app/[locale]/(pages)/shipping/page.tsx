import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { GroupedFAQAccordion, type FAQGroup } from "@/components/common/GroupedFAQAccordion";
import { PolicyContent } from "@/components/common/PolicyContent";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getPageSeo, getStaticPageContent, pickLocale, mapRepeater, mapFAQGroups, getFeatureToggles } from "@/lib/api/wordpress";
import { getShippingFreightDisplayRows } from "@/config/shipping";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

interface ShippingPageProps {
  params: Promise<{ locale: string }>;
}

// Default keywords (fallback when WordPress page doesn't exist)
const defaultKeywords = {
  en: ["perfume shipping", "fragrance delivery", "UAE shipping", "Dubai delivery", "GCC shipping", "free delivery", "express delivery", "shipping policy", "Sasan Perfumes", "free shipping 500 AED", "delivery time", "Saudi Arabia perfume shipping", "Oman perfume delivery", "order tracking"],
  ar: ["شحن عطور", "توصيل عطور", "شحن الإمارات", "توصيل مجاني", "سياسة الشحن", "شحن دبي", "شحن دول الخليج", "توصيل سريع", "Sasan Perfumes", "شحن مجاني 500 درهم", "مدة التوصيل", "شحن عطور السعودية", "شحن عطور عمان", "تتبع الشحن"],
};

export async function generateMetadata({
  params,
}: ShippingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";
  const dictionary = await getDictionary(lang);
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_shipping_enabled) return {};
  const pageContent = dictionary.pages.shipping;

  const wpSeo = await getPageSeo("shipping", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/shipping",
    keywords: isAr ? defaultKeywords.ar : defaultKeywords.en,
  });
}

export default async function ShippingPage({ params }: ShippingPageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_shipping_enabled) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const wp = await getStaticPageContent("shipping");

  const title = pickLocale(wp?.title, locale, locale === "ar" ? "الشحن والتوصيل" : "Shipping & Delivery");
  const ratesTitle = pickLocale(
    wp?.rates_title,
    locale,
    locale === "ar" ? "رسوم الشحن عبر أرامكس بالدرهم" : "Aramex Freight Charges in Dirhams"
  );
  const ratesNote = pickLocale(
    wp?.rates_note,
    locale,
    locale === "ar" ? "جميع الأسعار موضحة بالدرهم الإماراتي." : "All freight charges are shown in AED."
  );

  // FAQ-style grouped content
  const wpFaqGroups = mapFAQGroups(wp?.shipping_faq_groups, locale);

  // Featured links section
  const featuredLinksTitle = pickLocale(wp?.featured_links_title, locale, "featured links");
  const featuredLinksDesc = pickLocale(wp?.featured_links_description, locale, "Redirect efficiently your customers to a list of collections or products.");
  const wpFeaturedLinks = mapRepeater(wp?.featured_links, locale, (link) => ({
    label: locale === 'ar' ? (link.label?.ar || link.label_ar || '') : (link.label?.en || link.label_en || ''),
    url: link.url || '',
  }));

  const freightRowsSource = Array.isArray((wp as Record<string, unknown> | null)?.shipping_freight_rates)
    ? ((wp as Record<string, unknown>).shipping_freight_rates as Array<Record<string, unknown>>)
    : [];

  const freightRows =
    freightRowsSource.length > 0
      ? freightRowsSource.map((row) => ({
          weight: String(row.weight ?? row.weight_label ?? row.weightLabel ?? ""),
          pcs: String(row.pcs ?? row.pieces ?? ""),
          saudi_arabia: String(row.saudi_arabia ?? row.saudiArabia ?? row.sa ?? ""),
          bahrain: String(row.bahrain ?? row.bh ?? ""),
          kuwait: String(row.kuwait ?? row.kw ?? ""),
          qatar: String(row.qatar ?? row.qa ?? ""),
        }))
      : getShippingFreightDisplayRows();

  const breadcrumbItems = [
    { name: dictionary.footer.shippingInfo, href: `${pathPrefix}/${locale}/shipping` },
  ];

  return (
    <div>
      <PageHeader title={title} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      <div className="px-4 pt-8 md:pt-10 pb-16">
        <div className="max-w-3xl mx-auto space-y-16">
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-light text-brand-primary">{ratesTitle}</h2>
              {ratesNote && <p className="text-sm leading-7 text-brand-primary/70">{ratesNote}</p>}
            </div>
            <div className="overflow-x-auto border border-[#e7ded7]">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e7ded7] bg-[#faf7f3] text-brand-primary">
                    <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "الوزن" : "Weight"}</th>
                    <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "القطع" : "PCS"}</th>
                    <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "السعودية" : "Saudi Arabia"}</th>
                    <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "البحرين" : "Bahrain"}</th>
                    <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "الكويت" : "Kuwait"}</th>
                    <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "قطر" : "Qatar"}</th>
                  </tr>
                </thead>
                <tbody>
                  {freightRows.map((row, index) => (
                    <tr key={`${row.weight}-${row.pcs}-${index}`} className="border-b border-[#e7ded7] last:border-b-0">
                      <td className="px-4 py-3 text-brand-primary">{row.weight}</td>
                      <td className="px-4 py-3 text-brand-primary">{row.pcs}</td>
                      <td className="px-4 py-3 text-brand-primary/75">{row.saudi_arabia}</td>
                      <td className="px-4 py-3 text-brand-primary/75">{row.bahrain}</td>
                      <td className="px-4 py-3 text-brand-primary/75">{row.kuwait}</td>
                      <td className="px-4 py-3 text-brand-primary/75">{row.qatar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <PolicyContent
            data={wp}
            locale={locale}
            sectionKeys={["shipping_sections"]}
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
              href={`${pathPrefix}/${locale}/contact`}
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

