/**
 * Site Configuration
 * 
 * Main configuration file for the Sasan Perfumes frontend.
 * These values are read from environment variables when available,
 * with fallbacks for local development.
 */
export const siteConfig = {
  // Site name - displayed in browser title, meta tags, etc.
  name: "Sasan Perfumes",
  
  // Site description - used for SEO meta description
  description: "Sasan Perfumes is a UAE fragrance store for perfumes, hair mist, all over sprays, and gift-ready scent collections.",
  
  // Frontend URL - reads from NEXT_PUBLIC_SITE_URL environment variable
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://sasanperfumes.com",

  // Open Graph image URL - uses the site URL for the og image
  ogImage: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sasanperfumes.com"}/og.jpg`,
  
  // WordPress/WooCommerce Backend API URL - reads from NEXT_PUBLIC_WC_API_URL environment variable
  // This can be different from the public frontend URL.
  apiUrl: process.env.NEXT_PUBLIC_WC_API_URL || "https://cms.shapehive.com",

  // Optional brand assets for this copied frontend. Backend products still load
  // from WooCommerce, but the old backend logo/site name is not reused by default.
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || "/images/logo-sasanperfumes.svg",
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
    whatsapp: "971506071405",
    phone: "+971 50 607 1405",
    callPhone: "+971506071405",
    email: "",
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
