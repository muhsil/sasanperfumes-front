import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { GroupedFAQAccordion, type FAQGroup } from "@/components/common/GroupedFAQAccordion";
import { PolicyContent } from "@/components/common/PolicyContent";
import { getDictionary } from "@/i18n";
import { siteConfig } from "@/config/site";
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

function getDefaultKeywords() {
  return {
    en: ["perfume shipping", "fragrance delivery", "UAE shipping", "Dubai delivery", "GCC shipping", "express delivery", "shipping policy", "Sasan Perfumes", "delivery time", "Saudi Arabia perfume shipping", "Oman perfume delivery", "order tracking"],
    ar: ["شحن عطور", "توصيل عطور", "شحن الإمارات", "سياسة الشحن", "شحن دبي", "شحن دول الخليج", "توصيل سريع", "Sasan Perfumes", "مدة التوصيل", "شحن عطور السعودية", "شحن عطور عمان", "تتبع الشحن"],
  };
}

type ShippingDisplayRow = {
  location: string;
  cost: string;
  delivery: string;
};

type FreightDisplayRow = {
  weight: string;
  pcs: string;
  saudi_arabia: string;
  oman: string;
  bahrain: string;
  kuwait: string;
  qatar: string;
};

function pickShippingRowValue(row: Record<string, unknown>, key: string, locale: string, fallback = ""): string {
  const value = row[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const bilingual = value as Record<string, unknown>;
    const bilingualValue = locale === "ar" ? bilingual.ar : bilingual.en;
    if (typeof bilingualValue === "string" && bilingualValue.trim()) {
      return bilingualValue.trim();
    }
  }

  const localeKey = locale === "ar" ? `${key}_ar` : `${key}_en`;
  const camelKey = locale === "ar" ? `${key}Ar` : `${key}En`;
  const extraKeys = [localeKey, camelKey, `${key}_label`, `${key}Label`];

  const candidates: unknown[] = [value, ...extraKeys.map((candidateKey) => row[candidateKey])];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return fallback;
}

const SHIPPING_BRAND_PATTERNS = [/jeebly/i, /aramex/i, /جيبلي/i, /أرامكس/i];

function normalizeShippingDisplayText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return fallback;
  }

  return SHIPPING_BRAND_PATTERNS.some((pattern) => pattern.test(trimmed)) ? fallback : trimmed;
}

function formatPreviewRatePrice(price: string | number | undefined, currencyCode: string, currencyMinorUnit: number): string {
  const amount = typeof price === "number" ? price : parseFloat(String(price ?? "0"));
  const safeMinorUnit = Number.isFinite(currencyMinorUnit) ? currencyMinorUnit : 2;
  const divisor = Math.pow(10, safeMinorUnit);
  const numericAmount = Number.isFinite(amount) ? amount / divisor : 0;
  return `${currencyCode} ${numericAmount.toFixed(safeMinorUnit)}`;
}

async function fetchInternationalShippingPreview(currencyCode: string, locale: Locale): Promise<ShippingDisplayRow[]> {
  try {
    const previewUrl = new URL("/api/shipping", siteConfig.url);
    previewUrl.searchParams.set("country", "AE");
    previewUrl.searchParams.set("city", "Dubai");
    previewUrl.searchParams.set("postcode", "00000");
    previewUrl.searchParams.set("cart_subtotal", "0");
    previewUrl.searchParams.set("cart_weight", "0");
    previewUrl.searchParams.set("currency_code", currencyCode);

    const response = await fetch(previewUrl.toString(), { cache: "no-store" });
    if (!response.ok) return [];

    const data = await response.json();
    const packages: Array<{ shipping_rates?: Array<{ name?: string; price?: string; currency_code?: string; currency_minor_unit?: number; description?: string }> }> = Array.isArray(data?.shipping_rates)
      ? data.shipping_rates
      : [];
    const flatRates = packages.flatMap((pkg) => (Array.isArray(pkg.shipping_rates) ? pkg.shipping_rates : []));

    return flatRates
      .map((rate: { name?: string; price?: string; currency_code?: string; currency_minor_unit?: number; description?: string }) => ({
        location: normalizeShippingDisplayText(rate.name, locale === "ar" ? "الشحن" : "Shipping"),
        cost: formatPreviewRatePrice(rate.price, rate.currency_code || currencyCode, Number(rate.currency_minor_unit ?? 2)),
        delivery: normalizeShippingDisplayText(
          rate.description,
          locale === "ar" ? "يتم الحساب عند الدفع" : "Calculated at checkout"
        ),
      }))
      .filter((row: ShippingDisplayRow) => row.location || row.cost || row.delivery);
  } catch {
    return [];
  }
}

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

  const market = await getRequestMarket();
  const defaultKeywords = getDefaultKeywords();
  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/shipping",
    keywords: isAr ? defaultKeywords.ar : defaultKeywords.en,
    marketCode: market.code,
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
  const currencyCode = market.defaultCurrency;
  const isInternationalMarket = market.code === "intl";

  const titleFallback = locale === "ar" ? "الشحن والتوصيل" : "Shipping & Delivery";
  const title = normalizeShippingDisplayText(pickLocale(wp?.title, locale, titleFallback), titleFallback);
  const shippingRatesTitleFallback = locale === "ar"
    ? `رسوم الشحن بعملة ${currencyCode}`
    : `Shipping Charges in ${currencyCode}`;
  const shippingRatesNoteFallback = locale === "ar"
    ? `جميع رسوم الشحن موضحة بعملة ${currencyCode}.`
    : `All shipping charges are shown in ${currencyCode}.`;
  const ratesTitle = pickLocale(
    wp?.rates_title,
    locale,
    shippingRatesTitleFallback
  );
  const ratesNote = normalizeShippingDisplayText(
    pickLocale(
    wp?.rates_note,
    locale,
      shippingRatesNoteFallback
    ),
    shippingRatesNoteFallback
  );
  const normalizedRatesTitle = normalizeShippingDisplayText(ratesTitle, shippingRatesTitleFallback);

  // FAQ-style grouped content
  const wpFaqGroups = mapFAQGroups(wp?.shipping_faq_groups, locale);

  // Featured links section
  const featuredLinksTitle = pickLocale(wp?.featured_links_title, locale, "featured links");
  const featuredLinksDesc = pickLocale(wp?.featured_links_description, locale, "Redirect efficiently your customers to a list of collections or products.");
  const wpFeaturedLinks = mapRepeater(wp?.featured_links, locale, (link) => ({
    label: locale === 'ar' ? (link.label?.ar || link.label_ar || '') : (link.label?.en || link.label_en || ''),
    url: link.url || '',
  }));

  const intlRowsSource = isInternationalMarket
    ? (Array.isArray((wp as Record<string, unknown> | null)?.shipping_rates)
        ? ((wp as Record<string, unknown>).shipping_rates as Array<Record<string, unknown>>)
        : [])
    : [];

  const freightRowsSource = !isInternationalMarket
    ? (Array.isArray((wp as Record<string, unknown> | null)?.shipping_freight_rates)
        ? ((wp as Record<string, unknown>).shipping_freight_rates as Array<Record<string, unknown>>)
        : [])
    : [];

  const intlRows: ShippingDisplayRow[] = isInternationalMarket
    ? (intlRowsSource.length > 0
        ? intlRowsSource.map((row) => ({
            location: normalizeShippingDisplayText(
              pickShippingRowValue(row, "location", locale, locale === "ar" ? "الشحن" : "Shipping"),
              locale === "ar" ? "الشحن" : "Shipping"
            ),
            cost: pickShippingRowValue(row, "cost", locale, ""),
            delivery: normalizeShippingDisplayText(
              pickShippingRowValue(
                row,
                "delivery",
                locale,
                locale === "ar" ? "يتم الحساب عند الدفع" : "Calculated at checkout"
              ),
              locale === "ar" ? "يتم الحساب عند الدفع" : "Calculated at checkout"
            ),
          }))
        : await fetchInternationalShippingPreview(currencyCode, locale as Locale))
    : [];

  const freightRows: FreightDisplayRow[] = !isInternationalMarket
    ? (freightRowsSource.length > 0
        ? freightRowsSource.map((row) => ({
            weight: String(row.weight ?? row.weight_label ?? row.weightLabel ?? ""),
            pcs: String(row.pcs ?? row.pieces ?? ""),
            saudi_arabia: String(row.saudi_arabia ?? row.saudiArabia ?? row.sa ?? ""),
            oman: String(row.oman ?? row.omanAr ?? row.oman_ar ?? row.om ?? ""),
            bahrain: String(row.bahrain ?? row.bh ?? ""),
            kuwait: String(row.kuwait ?? row.kw ?? ""),
            qatar: String(row.qatar ?? row.qa ?? ""),
          }))
        : getShippingFreightDisplayRows())
    : [];

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
              <h2 className="text-2xl font-light text-brand-primary">{normalizedRatesTitle}</h2>
              {ratesNote && <p className="text-sm leading-7 text-brand-primary/70">{ratesNote}</p>}
            </div>
            {isInternationalMarket ? (
              intlRows.length > 0 ? (
                <div className="overflow-x-auto border border-[#e7ded7]">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#e7ded7] bg-[#faf7f3] text-brand-primary">
                        <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "الخدمة" : "Method"}</th>
                        <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "التكلفة" : "Cost"}</th>
                        <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "التسليم" : "Delivery"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intlRows.map((row, index) => (
                        <tr key={`${row.location}-${row.cost}-${index}`} className="border-b border-[#e7ded7] last:border-b-0">
                          <td className="px-4 py-3 text-brand-primary">{row.location}</td>
                          <td className="px-4 py-3 text-brand-primary/75">{row.cost}</td>
                          <td className="px-4 py-3 text-brand-primary/75">{row.delivery}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e7ded7] bg-[#faf7f3] p-5">
                  <p className="text-sm leading-7 text-brand-primary/75">
                    {locale === "ar"
                      ? "يتم احتساب رسوم الشحن عند إتمام الطلب."
                      : "Shipping is calculated at checkout."}
                  </p>
                </div>
              )
            ) : (
              <div className="overflow-x-auto border border-[#e7ded7]">
                <table className="w-full min-w-[840px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e7ded7] bg-[#faf7f3] text-brand-primary">
                      <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "الوزن" : "Weight"}</th>
                      <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "القطع" : "PCS"}</th>
                      <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "السعودية" : "Saudi Arabia"}</th>
                      <th className="px-4 py-3 text-left font-medium">{locale === "ar" ? "عمان" : "Oman"}</th>
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
                        <td className="px-4 py-3 text-brand-primary/75">{row.oman}</td>
                        <td className="px-4 py-3 text-brand-primary/75">{row.bahrain}</td>
                        <td className="px-4 py-3 text-brand-primary/75">{row.kuwait}</td>
                        <td className="px-4 py-3 text-brand-primary/75">{row.qatar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

