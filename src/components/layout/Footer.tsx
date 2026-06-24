import Link from "next/link";
import Image from "next/image";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import type { SiteSettings, FooterSettings } from "@/types/wordpress";
import type { FeatureToggles } from "@/lib/api/wordpress";
import { normalizeMenuUrl } from "@/config/menu";
import { NewsletterForm } from "@/components/common/NewsletterForm";
import { SocialIconLinks } from "@/components/common/SocialIconLinks";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";

const SLUG_TOGGLE_MAP: Record<string, keyof FeatureToggles> = {
  "/shop": "sasanperfumes_shop_enabled",
  "/about": "sasanperfumes_about_enabled",
  "/about-us": "sasanperfumes_about_enabled",
  "/contact": "sasanperfumes_contact_enabled",
  "/contact-us": "sasanperfumes_contact_enabled",
  "/blog": "sasanperfumes_blog_enabled",
  "/brands": "sasanperfumes_brands_page_enabled",
  "/services": "sasanperfumes_services_page_enabled",
  "/what-we-do": "sasanperfumes_what_we_do_enabled",
  "/store-locator": "sasanperfumes_store_locator_enabled",
  "/store-listing": "sasanperfumes_store_locator_enabled",
  "/faq": "sasanperfumes_faq_enabled",
  "/shipping": "sasanperfumes_shipping_enabled",
  "/shipping-policy": "sasanperfumes_shipping_enabled",
  "/returns": "sasanperfumes_returns_enabled",
  "/refund_returns": "sasanperfumes_returns_enabled",
  "/privacy": "sasanperfumes_privacy_enabled",
  "/privacy-policy": "sasanperfumes_privacy_enabled",
  "/delivery-policy": "sasanperfumes_privacy_enabled",
  "/terms-and-conditions": "sasanperfumes_terms_enabled",
  "/private-labeling": "sasanperfumes_private_labeling_enabled",
  "/size-guide": "sasanperfumes_size_guide_enabled",
  "/account/loyalty": "sasanperfumes_loyalty_enabled",
};

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
  siteSettings?: SiteSettings | null;
  footerSettings?: FooterSettings | null;
  featureToggles?: FeatureToggles | null;
  footerTopSocialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  pathPrefix?: string;
}

export function Footer({ locale, dictionary, siteSettings, footerSettings, featureToggles, footerTopSocialLinks, pathPrefix = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const t = (bilingual: { en: string; ar: string }) =>
    locale === "ar" ? bilingual.ar : bilingual.en;

  const quickLinkItems = footerSettings?.quickLinks?.items ?? [];
  const csLinkItems = footerSettings?.customerService?.items ?? [];

  const isLinkEnabled = (url: string): boolean => {
    if (!featureToggles) return true;
    const normalizedUrl = normalizeMenuUrl(url, locale);
    const pathForToggle = normalizedUrl.startsWith("/") && !normalizedUrl.startsWith(`/${locale}/`)
      ? normalizedUrl
      : normalizedUrl.replace(/^\/(en|ar)(?=\/|$)/, "");
    const toggleKey = SLUG_TOGGLE_MAP[pathForToggle.split("?")[0]] || SLUG_TOGGLE_MAP[url];
    if (!toggleKey) return true;
    return featureToggles[toggleKey] !== false;
  };

  const toHref = (url: string) => normalizeMenuUrl(url, locale, pathPrefix);

  const footerLinks = {
    quickLinks: (quickLinkItems.length > 0
      ? quickLinkItems.map((item) => ({
          name: t(item.label),
          href: toHref(item.url),
          url: item.url,
        }))
      : [
          { name: locale === "ar" ? "من نحن" : "About Us", href: `${pathPrefix}/${locale}/about-us`, url: "/about-us" },
          { name: locale === "ar" ? "مواقعنا" : "Our Stores", href: `${pathPrefix}/${locale}/store-listing`, url: "/store-listing" },
          { name: "B2B", href: "#", url: "#" },
        ]).filter((link) => isLinkEnabled(link.url)),
    customerService: (csLinkItems.length > 0
      ? csLinkItems.map((item) => ({
          name: t(item.label),
          href: toHref(item.url),
          url: item.url,
        }))
      : [
          { name: locale === "ar" ? "تواصل معنا" : "Contact Us", href: `${pathPrefix}/${locale}/contact-us`, url: "/contact-us" },
          { name: locale === "ar" ? "سياسة التسليم" : "Delivery Policy", href: `${pathPrefix}/${locale}/privacy-policy`, url: "/privacy-policy" },
          { name: locale === "ar" ? "سياسة الاستبدال والإرجاع" : "Exchange & Return Policy", href: `${pathPrefix}/${locale}/refund_returns`, url: "/refund_returns" },
          { name: locale === "ar" ? "سياسة الدفع" : "Payment Policy", href: `${pathPrefix}/${locale}/refund_returns`, url: "/refund_returns" },
        ]).filter((link) => isLinkEnabled(link.url)),
  };

  const description = footerSettings?.description
    ? t(footerSettings.description).trim()
    : "";

  const social = footerSettings?.social;
  const facebookUrl = social?.facebook || siteConfig.links.facebook;
  const instagramUrl = social?.instagram || siteConfig.links.instagram;
  const twitterUrl = social?.twitter || siteConfig.links.twitter;
  const tiktokUrl = social?.tiktok || "";
  const snapchatUrl = social?.snapchat || "";
  const whatsappUrl = social?.whatsapp || "";
  const fallbackSocialLinks = [
    { platform: "facebook", url: facebookUrl },
    { platform: "instagram", url: instagramUrl },
    { platform: "twitter", url: twitterUrl },
    { platform: "tiktok", url: tiktokUrl },
    { platform: "snapchat", url: snapchatUrl },
    { platform: "whatsapp", url: whatsappUrl },
  ];
  const socialLinks = footerTopSocialLinks?.some((link) => link.url.trim())
    ? footerTopSocialLinks
    : fallbackSocialLinks;

  const newsletterTitle = footerSettings?.newsletter
    ? t(footerSettings.newsletter.title)
    : dictionary.footer.newsletter;
  const newsletterSubtitle = footerSettings?.newsletter
    ? t(footerSettings.newsletter.subtitle)
    : dictionary.footer.subscribeText;
  const newsletterPlaceholder = footerSettings?.newsletter
    ? t(footerSettings.newsletter.placeholder)
    : dictionary.footer.emailPlaceholder;
  const newsletterButton = footerSettings?.newsletter
    ? t(footerSettings.newsletter.buttonText)
    : dictionary.footer.subscribe;

  const copyrightText = footerSettings?.copyright
    ? t(footerSettings.copyright)
    : dictionary.footer.copyright;
  const displaySiteName = siteSettings?.site_name?.trim() || "";

  const poweredByText = footerSettings?.poweredBy
    ? t(footerSettings.poweredBy.text).trim()
    : "";
  const poweredByName = footerSettings?.poweredBy
    ? t(footerSettings.poweredBy.name).trim()
    : "";
  const poweredByUrl = footerSettings?.poweredBy?.url?.trim() || "";

  const quickLinksHeading = footerSettings?.quickLinks?.heading
    ? t(footerSettings.quickLinks.heading)
    : dictionary.footer.quickLinks;
  const csHeading = footerSettings?.customerService?.heading
    ? t(footerSettings.customerService.heading)
    : dictionary.footer.customerService;

  return (
    <>
    <SocialIconLinks className="mx-auto max-w-[80rem]" links={socialLinks} variant="dark" />
    <footer className="main-footer relative overflow-hidden border-t border-white/10 bg-brand-primary pb-20 text-brand-ivory md:pb-0">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_20px)]" />

        <div className="relative mx-auto w-full max-w-[80rem] px-4 py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="border-b border-white/10 pb-8 lg:border-b-0 lg:border-e lg:pe-12">
            {siteSettings?.logo?.url ? (
              <Image
                src={siteSettings.logo.url}
                alt={siteSettings.logo.alt || displaySiteName || "Logo"}
                width={240}
                height={96}
                className="h-[100px] w-auto"
                unoptimized={shouldUseUnoptimizedImage(siteSettings.logo.url)}
              />
            ) : displaySiteName ? (
              <span className="font-title text-2xl leading-none text-brand-ivory md:text-3xl">
                {displaySiteName}
              </span>
            ) : null}
            {description && (
              <p className="mt-5 max-w-xl text-sm leading-7 text-brand-ivory/68">{description}</p>
            )}
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-5 text-[11px] font-semibold uppercase text-brand-gold">
                {quickLinksHeading}
              </h3>
              <ul className="space-y-3">
                {footerLinks.quickLinks.map((link) => (
                  <li key={link.name}>
                    {link.href === "#" ? (
                      <span className="text-sm text-brand-ivory/68">{link.name}</span>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-brand-ivory/68 transition-colors hover:text-white"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-5 text-[11px] font-semibold uppercase text-brand-gold">
                {csHeading}
              </h3>
              <ul className="space-y-3">
                {footerLinks.customerService.map((link) => (
                  <li key={link.name}>
                    {link.href === "#" ? (
                      <span className="text-sm text-brand-ivory/68">{link.name}</span>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-brand-ivory/68 transition-colors hover:text-white"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 rounded-lg border border-white/10 bg-white/8 p-5 text-brand-ivory shadow-[0_22px_54px_rgba(0,0,0,0.22)] md:grid-cols-[0.8fr_1.2fr] md:p-7">
          <div>
            <h3 className="font-title text-2xl text-brand-ivory">
              {newsletterTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-brand-ivory/70">
              {newsletterSubtitle}
            </p>
          </div>
          <div className="md:self-center">
            <NewsletterForm
              locale={locale}
              dictionary={{
                emailPlaceholder: newsletterPlaceholder,
                subscribe: newsletterButton,
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-6 md:flex-row md:justify-between">
          <p className="text-center text-xs text-brand-ivory/55 md:text-left">
            &copy; {currentYear}{displaySiteName ? ` ${displaySiteName}.` : ""} {copyrightText}
          </p>
          {poweredByText && poweredByName && (
            <p className="text-center text-xs text-brand-ivory/55">
              {poweredByText}{" "}
              {poweredByUrl ? (
                <a
                  href={poweredByUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold underline transition-colors hover:text-white"
                >
                  {poweredByName}
                </a>
              ) : (
                <span>{poweredByName}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </footer>
    </>
  );
}

