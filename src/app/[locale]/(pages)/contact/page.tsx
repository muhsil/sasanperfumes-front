import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { ContactForm } from "@/components/common/ContactForm";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, generateContactPageJsonLd } from "@/lib/utils/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPageSeo, getStaticPageContent, pickLocale, mapRepeater, getFeatureToggles } from "@/lib/api/wordpress";
import { siteConfig, type Locale } from "@/config/site";
import type { Metadata } from "next";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

// Default keywords (fallback when WordPress page doesn't exist)
const defaultKeywords = {
  en: ["contact us", "customer service", "perfume support", "inquiries", "ShapeHive", "contact Dubai perfume", "WhatsApp fragrance", "perfume store locations", "UAE fragrance help", "perfume phone number", "perfume email", "UAE customer support", "Dubai perfume store", "contact ShapeHive", "aromatic perfume support", "aromatic customer service UAE", "aromatic store location Dubai"],
  ar: ["تواصل معنا", "خدمة العملاء", "دعم العطور", "استفسارات", "شيب هايف", "اتصل بنا دبي", "واتساب عطور", "مواقع متاجر العطور", "مساعدة عطور الإمارات", "رقم هاتف عطور", "بريد إلكتروني عطور", "دعم عملاء الإمارات", "فروع عطور دبي"],
};

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const isAr = lang === "ar";
  const dictionary = await getDictionary(lang);
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_contact_enabled) return {};
  const pageContent = dictionary.pages.contact;

  const wpSeo = await getPageSeo("contact", lang);

  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/contact-us",
    keywords: isAr ? defaultKeywords.ar : defaultKeywords.en,
  });
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_contact_enabled) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const wp = await getStaticPageContent("contact");

  // All content from CMS — empty fallbacks
  const content = {
    heroTitle: pickLocale(wp?.hero_title, locale, ""),
    heroSubtitle: pickLocale(wp?.hero_subtitle, locale, ""),
    heroDescription: pickLocale(wp?.hero_description, locale, ""),
    quickContact: pickLocale(wp?.quick_contact, locale, ""),
    whatsapp: pickLocale(wp?.whatsapp, locale, ""),
    callUs: pickLocale(wp?.call_us, locale, ""),
    emailUs: pickLocale(wp?.email_us, locale, ""),
    ctaTitle: pickLocale(wp?.cta_title, locale, ""),
    ctaSubtitle: pickLocale(wp?.cta_subtitle, locale, ""),
    ctaButton: pickLocale(wp?.cta_button, locale, ""),
  };

  const sendMessage = pickLocale(wp?.send_message, locale, "");
  const sendMessageSub = pickLocale(wp?.send_message_sub, locale, "");
  const trustIndicators = mapRepeater(wp?.trust_indicators, locale, (item) => ({
    title: locale === 'ar' ? (item.title?.ar || item.title_ar || '') : (item.title?.en || item.title_en || ''),
    description: locale === 'ar' ? (item.description?.ar || item.description_ar || '') : (item.description?.en || item.description_en || ''),
    icon: item.icon || 'check',
  }));

  const infoIconMap: Record<string, typeof MapPin> = {
    address: MapPin,
    phone: Phone,
    callPhone: Phone,
    email: Mail,
    hours: Clock,
  };

  // Contact info items from WP repeater or dictionary fallback
  const wpInfoItems = mapRepeater(wp?.contact_info, locale, (item) => ({
    key: item.key || '',
    title: locale === 'ar' ? (item.title?.ar || item.title_ar || '') : (item.title?.en || item.title_en || ''),
    content: locale === 'ar' ? (item.content?.ar || item.content_ar || '') : (item.content?.en || item.content_en || ''),
  }));

  const infoItems = wpInfoItems;

  const contactInfoItems = infoItems.map((item) => ({
    ...item,
    icon: infoIconMap[item.key] || MapPin,
  }));

  const breadcrumbItems = [
    { name: content.heroTitle || dictionary.common.contact, href: `/${locale}/contact-us` },
  ];
  const pageTitle = content.heroTitle || dictionary.common.contact;

  return (
    <div className="flex flex-col">
      <JsonLd data={generateContactPageJsonLd({
        url: `${siteConfig.url}/${locale}/contact-us`,
        telephone: siteConfig.contact.callPhone || siteConfig.contact.phone,
        email: siteConfig.contact.email,
        address: siteConfig.contact.address,
      })} />

      <PageHeader title={pageTitle} subtitle={content.heroSubtitle} description={content.heroDescription} isRTL={isRTL} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Contact Form & Info Section */}
      <section className="bg-transparent py-16 md:py-24">
        <div className="px-4 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-16">
            {/* Form Column */}
            <div className="lg:col-span-2">
              <h2 className="mb-2 font-title text-3xl text-brand-primary md:text-4xl">{sendMessage}</h2>
              {sendMessageSub && <p className="mb-8 text-sm leading-relaxed text-brand-muted">{sendMessageSub}</p>}
              <ContactForm locale={locale} />
            </div>

            {/* Info Cards Column */}
            <div className="space-y-4">
              {contactInfoItems.map((item, index) => (
                <div key={index} className="luxury-panel p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase text-brand-gold">{item.title}</h3>
                  {item.key === "phone" || item.key === "callPhone" ? (
                    <a href={`tel:${item.content.replace(/\s/g, "")}`} className="block text-sm text-brand-primary transition-colors hover:text-brand-gold">{item.content}</a>
                  ) : item.key === "email" ? (
                    <a href={`mailto:${item.content}`} className="block break-all text-sm text-brand-primary transition-colors hover:text-brand-gold">{item.content}</a>
                  ) : item.key === "address" ? (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.content)}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-brand-primary transition-colors hover:text-brand-gold">{item.content}</a>
                  ) : (
                    <p className="text-sm text-brand-primary">{item.content}</p>
                  )}
                </div>
              ))}

            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      {trustIndicators.length > 0 && (
      <section className="section-band py-16 md:py-20">
        <div className="px-4 max-w-6xl mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            {trustIndicators.map((item, index) => (
              <div key={index} className="luxury-panel p-5">
                <div className="mb-4 flex">
                  <svg className="h-5 w-5 text-brand-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />}
                    {item.icon === 'lightning' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                    {item.icon === 'lock' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                    {item.icon === 'star' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                  </svg>
                </div>
                <h4 className="mb-2 text-sm font-semibold text-brand-primary">{item.title}</h4>
                <p className="text-xs leading-relaxed text-brand-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA Section */}
      {content.ctaTitle && (
      <section className="bg-brand-primary py-16 text-brand-ivory md:py-24">
        <div className="px-4 max-w-4xl mx-auto text-center">
          <h2 className="mb-4 font-title text-3xl text-brand-ivory md:text-4xl">{content.ctaTitle}</h2>
          {content.ctaSubtitle && <p className="mb-8 text-sm text-brand-ivory/70">{content.ctaSubtitle}</p>}
          <Link
            href={`/${locale}/private-labeling`}
            className="inline-flex rounded-full border border-brand-gold bg-brand-gold px-8 py-3 text-xs font-semibold uppercase text-brand-primary transition-colors hover:bg-brand-ivory"
          >
            {content.ctaButton}
          </Link>
        </div>
      </section>
      )}
    </div>
  );
}
