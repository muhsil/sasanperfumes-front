/**
 * Site Configuration
 * 
 * Main configuration file for the Sasan Perfumes frontend.
 * These values are read from environment variables when available,
 * with fallbacks for local development.
 */
const DEFAULT_SITE_URL = "https://sasanperfumes.com";
const DEFAULT_CMS_URL = "https://cms.sasanperfumes.com";

function safeUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  return candidate.replace(/\/+$/, "");
}

function urlHost(value: string, fallback: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return fallback;
  }
}

export const siteUrl = safeUrl(process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_URL);
export const cmsUrl = safeUrl(process.env.NEXT_PUBLIC_WC_API_URL, DEFAULT_CMS_URL);

export const canonicalHost =
  (
    process.env.NEXT_PUBLIC_CANONICAL_HOST ||
    process.env.CANONICAL_HOST ||
    safeUrl(process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_URL)
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/^www\./, "")
    .toLowerCase();

export const cmsHostname = urlHost(cmsUrl, DEFAULT_CMS_URL.replace(/^https?:\/\//, ""));

export const mediaHostNames = Array.from(
  new Set([
    cmsHostname,
    "cms.sasanperfumes.com",
  ])
);

export const siteConfig = {
  // Site name - displayed in browser title, meta tags, etc.
  name: "Sasan Perfumes",
  
  // Site description - used for SEO meta description
  description: "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes. Shop with fast delivery across the UAE and international markets. A 60+ year fragrance heritage brand blending tradition with modern elegance.",
  
  // Frontend URL - reads from NEXT_PUBLIC_SITE_URL environment variable
  url: siteUrl,

  // Open Graph image URL - uses a generated social preview image
  ogImage: `${siteUrl}/opengraph-image`,
  
  // WordPress/WooCommerce Backend API URL - reads from NEXT_PUBLIC_WC_API_URL environment variable
  // This can be different from the public frontend URL.
  apiUrl: cmsUrl,

  mediaHostNames: mediaHostNames,

  authBackgroundImage: process.env.NEXT_PUBLIC_AUTH_BACKGROUND_IMAGE || "",

  // Optional brand assets for this copied frontend. Backend products still load
  // from WooCommerce, but the old backend logo/site name is not reused by default.
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || "",
  faviconUrl: process.env.NEXT_PUBLIC_BRAND_FAVICON_URL || "",
  useBackendBrandAssets: process.env.NEXT_PUBLIC_USE_BACKEND_BRAND_ASSETS === "true",
  
  // Social media links
  links: {
    instagram: "",
    facebook: "",
    twitter: "",
  },

  // Public contact details used by contact buttons and structured data.
  contact: {
    whatsapp: "0567394314",
    phone: "0563982953",
    callPhone: "0563982953",
    email: "support@sasanperfumes.com",
    address: "United Arab Emirates",
  },
  
  // Default locale for the site (en = English, ar = Arabic)
  defaultLocale: "en" as const,
  
  // Supported locales - add more locales here if needed
  locales: ["en", "ar"] as const,
  
  // Default currency code
  defaultCurrency: "AED" as const,
};

export type Locale = (typeof siteConfig.locales)[number];

/**
 * Currency type - now dynamic from WordPress API
 * Using string type to allow any currency code from the backend
 */
export type Currency = string;

/**
 * Base currency used by the WooCommerce Store API.
 * The API returns prices in this currency, and we convert to the user's selected currency.
 */
export const API_BASE_CURRENCY = "AED" as const;

/**
 * Locale Configuration
 * 
 * Configuration for each supported locale.
 * - name: Display name of the language
 * - dir: Text direction (ltr = left-to-right, rtl = right-to-left)
 * - hrefLang: HTML lang attribute value
 */
export const localeConfig = {
  en: {
    name: "English",
    dir: "ltr" as const,
    hrefLang: "en",
  },
  ar: {
    name: "العربية",
    dir: "rtl" as const,
    hrefLang: "ar",
  },
} as const;

export const featureFlags = {
  enableCoupons: true,
} as const;

/**
 * Development should reflect WordPress/admin changes immediately.
 * Production keeps ISR and response caching unless explicitly disabled.
 */
export const disableRuntimeCache =
  process.env.NODE_ENV === "development" ||
  process.env.DISABLE_RUNTIME_CACHE === "true" ||
  process.env.NEXT_PUBLIC_DISABLE_RUNTIME_CACHE === "true";
