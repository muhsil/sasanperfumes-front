import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram } from "lucide-react";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import type { SiteSettings } from "@/types/wordpress";

interface CheckoutFooterProps {
  locale: Locale;
  dictionary: Dictionary;
  siteSettings?: SiteSettings | null;
}

export function CheckoutFooter({ locale, dictionary, siteSettings }: CheckoutFooterProps) {
  const currentYear = new Date().getFullYear();
  const displaySiteName = siteSettings?.site_name?.trim() || "";

  const essentialLinks = [
    { name: dictionary.common.shop, href: `/${locale}/shop` },
    { name: dictionary.common.contact, href: `/${locale}/contact` },
    { name: dictionary.footer.privacyPolicy, href: `/${locale}/privacy` },
    { name: dictionary.footer.termsConditions, href: `/${locale}/terms-and-conditions` },
  ];

  return (
    <footer className="border-t border-gray-100 bg-white pb-20 md:pb-0">
      <div className="container mx-auto px-5 md:px-7 lg:px-12 py-6 md:py-8">
        <div className="flex flex-col items-center space-y-5">
          <Link href={`/${locale}`} className="inline-block">
            {siteSettings?.logo?.url ? (
              <Image
                src={siteSettings.logo.url}
                alt={siteSettings.logo.alt || siteSettings.site_name || "Logo"}
                width={120}
                height={80}
                style={{ width: "auto", height: "auto", maxHeight: "50px" }}
                loading="lazy"
              />
            ) : displaySiteName ? (
              <span className="text-lg font-bold tracking-tight text-gray-900">
                {displaySiteName}
              </span>
            ) : null}
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {essentialLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {(siteConfig.links.facebook || siteConfig.links.instagram) && (
            <div className="flex items-center gap-3">
              {siteConfig.links.facebook && (
                <a
                  href={siteConfig.links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {siteConfig.links.instagram && (
                <a
                  href={siteConfig.links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          <div className="flex w-full flex-col items-center gap-2 md:flex-row md:justify-between">
            <p className="text-center text-xs text-gray-500 md:text-left">
              &copy; {currentYear}{displaySiteName ? ` ${displaySiteName}.` : ""} {dictionary.footer.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
