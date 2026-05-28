import Link from "next/link";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import type { SiteSettings, FooterSettings } from "@/types/wordpress";
import type { FeatureToggles } from "@/lib/api/wordpress";
import { NewsletterForm } from "@/components/common/NewsletterForm";
import { SocialIconLinks } from "@/components/common/SocialIconLinks";

const SLUG_TOGGLE_MAP: Record<string, keyof FeatureToggles> = {
  "/shop": "sasanperfumes_shop_enabled",
  "/about": "sasanperfumes_about_enabled",
  "/contact": "sasanperfumes_contact_enabled",
  "/blog": "sasanperfumes_blog_enabled",
  "/brands": "sasanperfumes_brands_page_enabled",
  "/services": "sasanperfumes_services_page_enabled",
  "/what-we-do": "sasanperfumes_what_we_do_enabled",
  "/store-locator": "sasanperfumes_store_locator_enabled",
  "/faq": "sasanperfumes_faq_enabled",
  "/shipping": "sasanperfumes_shipping_enabled",
  "/returns": "sasanperfumes_returns_enabled",
  "/privacy": "sasanperfumes_privacy_enabled",
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
}

export function Footer({ locale, dictionary, siteSettings, footerSettings, featureToggles, footerTopSocialLinks }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const t = (bilingual: { en: string; ar: string }) =>
    locale === "ar" ? bilingual.ar : bilingual.en;

  const quickLinkItems = footerSettings?.quickLinks?.items ?? [];
  const csLinkItems = footerSettings?.customerService?.items ?? [];

  const isLinkEnabled = (url: string): boolean => {
    if (!featureToggles) return true;
    const toggleKey = SLUG_TOGGLE_MAP[url];
    if (!toggleKey) return true;
    return featureToggles[toggleKey] !== false;
  };

  const footerLinks = {
    quickLinks: (quickLinkItems.length > 0
      ? quickLinkItems.map((item) => ({
          name: t(item.label),
          href: item.url.startsWith("/") ? `/${locale}${item.url}` : item.url,
          url: item.url,
        }))
      : [
          { name: dictionary.common.home, href: `/${locale}`, url: "/" },
          { name: dictionary.common.shop, href: `/${locale}/shop`, url: "/shop" },
          { name: dictionary.common.about, href: `/${locale}/about`, url: "/about" },
          { name: dictionary.common.contact, href: `/${locale}/contact`, url: "/contact" },
          { name: dictionary.footer.storeLocator, href: `/${locale}/store-locator`, url: "/store-locator" },
        ]).filter((link) => isLinkEnabled(link.url)),
    customerService: (csLinkItems.length > 0
      ? csLinkItems.map((item) => ({
          name: t(item.label),
          href: item.url.startsWith("/") ? `/${locale}${item.url}` : item.url,
          url: item.url,
        }))
      : [
          { name: dictionary.common.faq, href: `/${locale}/faq`, url: "/faq" },
          { name: dictionary.footer.shippingInfo, href: `/${locale}/shipping`, url: "/shipping" },
          { name: dictionary.footer.returnPolicy, href: `/${locale}/returns`, url: "/returns" },
          { name: dictionary.footer.privacyPolicy, href: `/${locale}/privacy`, url: "/privacy" },
          { name: dictionary.footer.termsConditions, href: `/${locale}/terms-and-conditions`, url: "/terms-and-conditions" },
        ]).filter((link) => isLinkEnabled(link.url)),
  };

  const description = footerSettings?.description
    ? t(footerSettings.description)
    : locale === "ar"
      ? "اكتشف العطور الفاخرة ومنتجات العناية العطرية المصنوعة بعناية في ShapeHive."
      : (siteSettings?.tagline || "Premium fragrances and aromatic products crafted with care.");

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
    <SocialIconLinks links={socialLinks} variant="dark" />
    <footer className="main-footer bg-[#1a1a1a] pb-20 text-white md:pb-0">
      <div className="w-full px-5 md:px-7 lg:px-12 py-6 md:py-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-12">
          {/* Brand description section */}
          <div className="col-span-2 space-y-3 md:space-y-6 text-center md:col-span-1 md:text-left">
            <p className="text-xs leading-relaxed text-white/50">{description}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-white/70">
              {quickLinksHeading}
            </h3>
            <ul className="space-y-3">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/50 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-white/70">
              {csHeading}
            </h3>
            <ul className="space-y-3">
              {footerLinks.customerService.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/50 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter - Full width on mobile */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-white/70">
              {newsletterTitle}
            </h3>
            <p className="mb-5 text-xs leading-relaxed text-white/50">
              {newsletterSubtitle}
            </p>
            <NewsletterForm
              locale={locale}
              dictionary={{
                emailPlaceholder: newsletterPlaceholder,
                subscribe: newsletterButton,
              }}
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-6 md:mt-12 md:flex-row md:justify-between md:pt-8">
          <p className="text-center text-xs text-white/40 md:text-left">
            &copy; {currentYear} {siteConfig.name}. {copyrightText}
          </p>
          {poweredByText && poweredByName && (
            <p className="text-center text-xs text-white/40">
              {poweredByText}{" "}
              {poweredByUrl ? (
                <a
                  href={poweredByUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 transition-colors hover:text-white underline"
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
