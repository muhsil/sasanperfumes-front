import { disableRuntimeCache, siteConfig, type Locale } from "@/config/site";
import { getMarketByHost } from "@/config/market";
import { decodeHtmlEntities } from "@/lib/utils";
import { translateToArabic } from "@/config/menu";
import { isLegacyBrandCategory } from "@/config/categoryVisibility";
import { getActiveDiscountRules } from "@/lib/discountRules";
import { getMarketSeoDescription } from "@/lib/utils/seo";
import type { DiscountRule } from "@/types/discount";
import {
  backendHeaders,
  extractMarketCode,
  parseBackendJson,
} from "@/lib/utils/backendFetch";
import type {
  HomePageACF,
  SiteSettings,
  WPMenu,
  WPMenuItem,
  HeroSliderSettings,
  ProductSectionSettings,
  CategorySectionSettings,
  FeaturedProductsSettings,
  CollectionsSettings,
  BannersSettings,
  AdsSettings,
  WPSiteInfo,
  WPImage,
  WPLink,
  HeroSlide,
  Banner,
  Collection,
  ProductPage,
  CategorySeoContent,
  HomeSections,
  GuidePage,
  FooterSettings,
} from "@/types/wordpress";

const WP_API_BASE = `${siteConfig.apiUrl}/wp-json`;
const WP_API_HEADERS = backendHeaders();
const WP_NAMESPACE_FALLBACKS = ["sasanperfumes/v1"];
const CMS_FORCE_DYNAMIC_CACHE = process.env.NEXT_PUBLIC_DISABLE_CMS_CACHE === "true" || process.env.DISABLE_CMS_CACHE === "true";
const WP_API_FETCH_TIMEOUT_MS = 6000;

function isCmsContentEndpoint(endpoint: string): boolean {
  return (
    endpoint.includes("/sasanperfumes/v1/") ||
    endpoint.includes("/menus/v1/") ||
    endpoint.includes("/wp/v2/pages") ||
    endpoint.includes("/wp/v2/media")
  );
}

function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const details = cause as Record<string, unknown>;
    const code = typeof details.code === "string" ? details.code : "";
    const hostname = typeof details.hostname === "string" ? details.hostname : "";
    return [error.message, code, hostname].filter(Boolean).join(" ");
  }

  return error.message;
}

function isExpectedNextDynamicServerError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Dynamic server usage") ||
    error.message.includes("couldn't be rendered statically")
  );
}

function buildWPAPIUrls(endpoint: string, locale?: Locale, apiBase: string = WP_API_BASE): string[] {
  const withLocale = (baseEndpoint: string): string => {
    let url = `${apiBase}${baseEndpoint}`;
    if (locale) {
      const separator = baseEndpoint.includes("?") ? "&" : "?";
      url = `${url}${separator}lang=${locale}`;
    }
    return url;
  };

  const urls = [withLocale(endpoint)];

  if (endpoint.includes("/sasanperfumes/v1/")) {
    for (const namespace of WP_NAMESPACE_FALLBACKS.slice(1)) {
      urls.push(withLocale(endpoint.replace("/sasanperfumes/v1/", `/${namespace}/`)));
    }
  }

  return urls;
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

async function fetchWPUrl(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WP_API_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function replaceLegacyBrandText(value: string): string {
  const legacyEnglishBrand = ["Shape", "Hive"].join("");
  return decodeHtmlEntities(value)
    .replace(new RegExp(legacyEnglishBrand, "gi"), siteConfig.name)
    .replace(/Sasan Perfumes/g, siteConfig.name);
}

function sanitizeLegacyDescription(value: string, fallback: string): string {
  const replaced = replaceLegacyBrandText(value).trim();
  if (!replaced) {
    return fallback;
  }

  if (/headless commerce storefront/i.test(replaced)) {
    return fallback;
  }

  if (/^Sasan Perfumes(?:\s+(?:Qatar|Oman|Saudi Arabia|UAE))?\s+luxury fragrances and gifts\.?$/i.test(replaced)) {
    return fallback;
  }

  if (/premium fragrance store for the UAE, GCC, and international shoppers/i.test(replaced)) {
    return fallback;
  }

  if (/localized storefronts, currencies, and product collections/i.test(replaced)) {
    return fallback;
  }

  return replaced;
}

function getMarketSeoFallbackDescription(locale?: Locale, frontendHost?: string): string {
  if (!locale) {
    return siteConfig.description;
  }

  return getMarketSeoDescription(getMarketByHost(frontendHost).code, locale);
}

const legacyMediaHosts = [["cms", ["fragrance", "network"].join(""), "ae"].join(".")];
const legacyStorefrontHosts = [
  ["aromatic", "scents", "lab.com"].join(""),
  ["www", ["aromatic", "scents", "lab.com"].join("")].join("."),
  ["shape", "hive.com"].join(""),
  ["www", ["shape", "hive.com"].join("")].join("."),
  [["fragrance", "network"].join(""), "ae"].join("."),
  ["www", [["fragrance", "network"].join(""), "ae"].join(".")].join("."),
];

function rebrandText(value: string): string {
  const withMediaHosts = legacyMediaHosts.reduce(
    (text, host) => text
      .replaceAll(`https://${host}`, siteConfig.apiUrl)
      .replaceAll(`http://${host}`, siteConfig.apiUrl),
    value
  );

  return legacyStorefrontHosts.reduce(
    (text, host) => text
      .replaceAll(`https://${host}`, siteConfig.url)
      .replaceAll(`http://${host}`, siteConfig.url),
    withMediaHosts
  );
}

function rebrandApiContent<T>(value: T): T {
  if (typeof value === "string") {
    return rebrandText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rebrandApiContent(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rebrandApiContent(item)])
    ) as T;
  }

  return value;
}

// Types for WordPress Plugin API Response (camelCase format)
interface WPPluginHeroSlide {
  enabled?: boolean;
  image: string;
  mobileImage: string;
  imageAr?: string;
  mobileImageAr?: string;
  link: string;
  slideType?: "image" | "video";
  videoUrl?: string;
  videoMobile?: string;
  videoAr?: string;
  videoMobileAr?: string;
  posterUrl?: string;
  posterMobile?: string;
  posterAr?: string;
  posterMobileAr?: string;
  title?: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  ctaLabel?: string;
  ctaLabelAr?: string;
  linkUrl?: string;
}

interface WPPluginHeroSettings {
  enabled: boolean;
  autoplay: boolean;
  autoplayDelay?: number | string;
  autoplay_delay?: number | string;
  loop: boolean;
  slides: WPPluginHeroSlide[];
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

interface WPPluginBannerItem {
  image?: string;
  mobile?: string;
  mobileImage?: string;
  imageAr?: string;
  mobileAr?: string;
  mobileImageAr?: string;
  image_ar?: string;
  mobile_image?: string;
  image_arabic?: string;
  mobile_ar?: string;
  mobile_image_ar?: string;
  title?: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  title_ar?: string;
  subtitle_ar?: string;
  link?: string;
}

interface WPPluginBannersSettings {
  enabled?: boolean;
  items?: WPPluginBannerItem[];
  layout?: string;
  responsive?: { desktop: number; tablet: number; mobile: number };
  responsive_columns?: { desktop: number; tablet: number; mobile: number };
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
}

interface WPPluginAdItem {
  enabled?: boolean;
  placement?: string;
  market?: string;
  image?: string;
  mobile?: string;
  mobileImage?: string;
  imageAr?: string;
  mobileAr?: string;
  mobileImageAr?: string;
  title?: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  buttonText?: string;
  buttonTextAr?: string;
  link?: string;
}

interface WPPluginAdsSettings {
  enabled?: boolean;
  items?: WPPluginAdItem[];
}

interface WPPluginCollectionItem {
  image: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  link: string;
}

interface WPPluginCollectionsSettings {
  enabled: boolean;
  layout?: string;
  responsive?: { desktop: number; tablet: number; mobile: number };
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  items: WPPluginCollectionItem[];
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

interface WPPluginProductSectionSettings {
  enabled: boolean;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  count: number;
  display?: string;
  showViewAll?: boolean;
  viewAllLink?: string;
  autoplay?: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  selectedIds?: number[];
  selectedProductSlugs?: string[];
  responsive?: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
}

interface WPPluginHomeSettings {
  hero: WPPluginHeroSettings;
  newProducts: WPPluginProductSectionSettings;
  bestseller: WPPluginProductSectionSettings;
  categories: WPPluginProductSectionSettings;
  featured: WPPluginProductSectionSettings;
  collections: WPPluginCollectionsSettings;
  banners: WPPluginBannersSettings;
}

// Type for WordPress Plugin site settings from /sasanperfumes/v1/site-settings
interface WPPluginSiteSettings {
  name: string;
  description: string;
  url: string;
  logo: {
    id: string | number;
    url: string;
  };
  favicon: {
    id: string | number;
    url: string;
  };
}

// Type for WordPress Plugin header settings from /sasanperfumes/v1/header-settings
interface WPPluginHeaderSettings {
  sticky: boolean;
  logo: string;
  stickyLogo: string;
  logoDark: string;
  megaMenu?: {
    displayMode: string;
    showProducts: boolean;
    maxColumns: number;
  };
}

// Type for WordPress Plugin mobile bar item
interface WPPluginMobileBarItem {
  icon: string;
  label: string;
  labelAr: string;
  url: string;
}

// Type for WordPress Plugin mobile bar settings from /sasanperfumes/v1/mobile-bar
interface WPPluginMobileBarSettings {
  enabled: boolean;
  items: WPPluginMobileBarItem[];
}

// Frontend types for header and mobile bar
export interface MegaMenuSettings {
  displayMode: "child-based" | "flat";
  showProducts: boolean;
  maxColumns: number;
}

export interface HeaderSettings {
  sticky: boolean;
  logo: string | null;
  stickyLogo: string | null;
  logoDark: string | null;
  megaMenu?: MegaMenuSettings;
}

// Type for WordPress Plugin SEO settings from /sasanperfumes/v1/seo-settings
interface WPPluginSeoSettings {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  keywords: string;
  keywordsAr: string;
  ogTitle: string;
  ogTitleAr: string;
  ogDescription: string;
  ogDescriptionAr: string;
  ogImage: string;
  ogType: string;
  ogSiteName: string;
  fbAppId: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  twitterTitle: string;
  twitterTitleAr: string;
  twitterDescription: string;
  twitterDescriptionAr: string;
  twitterImage: string;
  googleVerification: string;
  bingVerification: string;
  gaId: string;
  gtmId: string;
  fbPixelId: string;
  snapPixelId: string;
  tiktokPixelId: string;
  robots: string;
  canonicalUrl: string;
  schemaType: string;
  customHead: string;
}

export interface SeoSettings {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  keywords: string;
  keywordsAr: string;
  openGraph: {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    image: string;
    type: string;
    siteName: string;
    fbAppId: string;
  };
  twitter: {
    card: string;
    site: string;
    creator: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    image: string;
  };
  verification: {
    google: string;
    bing: string;
  };
  analytics: {
    gaId: string;
    gtmId: string;
    fbPixelId: string;
    snapPixelId: string;
    tiktokPixelId: string;
  };
  robots: string;
  canonicalUrl: string;
  schemaType: string;
  customHead: string;
}

// Type for WordPress Plugin topbar settings from /sasanperfumes/v1/topbar
interface WPPluginTopbarSettings {
  enabled: boolean;
  text: string;
  textAr: string;
  link: string;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  hideOnMobile?: boolean;
  freeShippingThreshold?: number;
  freeShippingThresholds?: Record<string, number>;
}

// Frontend types for topbar
export interface TopbarSettings {
  enabled: boolean;
  text: string;
  textAr: string;
  link: string | null;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  hideOnMobile: boolean;
  freeShippingThreshold: number | null;
  freeShippingThresholds: Record<string, number> | null;
}

export interface MobileBarItem {
  icon: string;
  label: string;
  labelAr: string;
  url: string;
}

export interface MobileBarSettings {
  enabled: boolean;
  items: MobileBarItem[];
}

// Helper function to create WPImage from URL string
function createWPImage(url: string, alt: string = ""): WPImage | null {
  if (!url) return null;
  return {
    id: 0,
    url,
    alt,
    title: alt,
    width: 0,
    height: 0,
    sizes: {
      thumbnail: url,
      medium: url,
      large: url,
      full: url,
    },
  };
}

// Helper function to create WPLink from URL string
function createWPLink(url: string, title: string = ""): WPLink | undefined {
  if (!url) return undefined;
  return {
    title,
    url,
    target: "_self",
  };
}

const SASAN_DISCOVER_COLLECTIONS = [
  {
    image: "https://cms.sasanperfumes.com/wp-content/uploads/2026/05/Sasan5515-scaled-1.jpg",
    title: { en: "All Over Spray", ar: "بخاخ الجسم" },
    description: { en: "10 products", ar: "10 منتجات" },
    link: "/category/all-over-spray",
  },
  {
    image: "https://cms.sasanperfumes.com/wp-content/uploads/2026/05/Sasan4318-scaled-1.jpg",
    title: { en: "Gift Set", ar: "طقم هدايا" },
    description: { en: "6 products", ar: "6 منتجات" },
    link: "/category/gift-set",
  },
  {
    image: "https://cms.sasanperfumes.com/wp-content/uploads/2026/05/newww-1-scaled-1.jpg",
    title: { en: "Perfumes", ar: "عطور" },
    description: { en: "41 products", ar: "41 منتج" },
    link: "/category/perfumes",
  },
  {
    image: "https://cms.sasanperfumes.com/wp-content/uploads/2026/05/Vusa-01-scaled-1.jpg",
    title: { en: "Hair Mist", ar: "معطر الشعر" },
    description: { en: "13 products", ar: "13 منتج" },
    link: "/category/sasan-hair-mist",
  },
];

function getSasanDiscoverCollections(locale?: Locale): Collection[] {
  const isArabic = locale === "ar";
  return SASAN_DISCOVER_COLLECTIONS.map((item, index) => {
    const title = isArabic ? item.title.ar : item.title.en;
    return {
      title,
      description: isArabic ? item.description.ar : item.description.en,
      image: createWPImage(item.image, title) as WPImage,
      link: createWPLink(item.link, title) as WPLink,
    };
  });
}

function normalizeDelay(value: number | string | undefined, fallback: number): number {
  const delay = Number(value);
  return Number.isFinite(delay) && delay > 0 ? delay : fallback;
}

// Transform WordPress Plugin hero settings to frontend format
function transformHeroSettings(pluginHero: WPPluginHeroSettings, locale?: Locale): HeroSliderSettings {
  const isArabic = locale === 'ar';
  const slides: HeroSlide[] = pluginHero.slides
    .filter((slide) => {
      if (slide.enabled === false) return false;
      const isVideo = slide.slideType === "video";
      if (isVideo) return Boolean(slide.videoUrl);
      const hasMedia = Boolean(slide.image || slide.mobileImage || slide.imageAr || slide.mobileImageAr);
      return hasMedia;
    })
    .map((slide, index) => {
      const isVideo = slide.slideType === "video";
      const textFields = {
        videoUrl: slide.videoUrl,
        videoMobile: slide.videoMobile,
        videoAr: slide.videoAr,
        videoMobileAr: slide.videoMobileAr,
        posterUrl: slide.posterUrl,
        posterMobile: slide.posterMobile,
        posterAr: slide.posterAr,
        posterMobileAr: slide.posterMobileAr,
        title: slide.title,
        titleAr: slide.titleAr,
        subtitle: slide.subtitle,
        subtitleAr: slide.subtitleAr,
        ctaLabel: slide.ctaLabel,
        ctaLabelAr: slide.ctaLabelAr,
        linkUrl: slide.linkUrl || slide.link,
      };

      if (isVideo) {
        return {
          image: createWPImage(slide.posterUrl || "", `Slide ${index + 1}`) as WPImage,
          slide_type: "video" as const,
          video_url: slide.videoUrl,
          poster_url: slide.posterUrl,
          link: createWPLink(slide.link),
          ...textFields,
        };
      }

      const fallbackDesktop = slide.image || slide.mobileImage || slide.imageAr || slide.mobileImageAr || "";
      const desktopImage = isArabic && slide.imageAr ? slide.imageAr : fallbackDesktop;
      const mobileImage = isArabic && slide.mobileImageAr
        ? slide.mobileImageAr
        : (slide.mobileImage || desktopImage);

      return {
        image: createWPImage(desktopImage, `Slide ${index + 1}`) as WPImage,
        mobile_image: createWPImage(mobileImage, `Slide ${index + 1} Mobile`) || undefined,
        link: createWPLink(slide.link),
        ...textFields,
      };
    });

  return {
    enabled: pluginHero.enabled,
    slides,
    autoplay: pluginHero.autoplay,
    autoplay_delay: normalizeDelay(pluginHero.autoplayDelay ?? pluginHero.autoplay_delay, 5000),
    loop: pluginHero.loop,
    hide_on_mobile: pluginHero.hideOnMobile,
    hide_on_desktop: pluginHero.hideOnDesktop,
  };
}

// Transform WordPress Plugin banners settings to frontend format
function transformBannersSettings(pluginBanners: WPPluginBannersSettings, locale?: Locale): BannersSettings {
  const getBannerValue = (item: WPPluginBannerItem, key: string, fallback: string = ""): string => {
    const normalized = locale === "ar"
      ? [
          `${key}Ar` as keyof WPPluginBannerItem,
          `${key}_ar` as keyof WPPluginBannerItem,
          `${key}_arabic` as keyof WPPluginBannerItem,
          key as keyof WPPluginBannerItem,
        ]
      : [
          key as keyof WPPluginBannerItem,
          `${key}_en` as keyof WPPluginBannerItem,
        ];
    for (const valueKey of normalized) {
      const value = item[valueKey];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return fallback;
  };

  const resolveBannerImage = (item: WPPluginBannerItem, isAr: boolean): string => {
    const keys = isAr
      ? [
          item.imageAr,
          item.image_ar,
          item.image_arabic,
          item.image,
        ]
      : [item.image, item.image_ar, item.image_arabic];
    const imageCandidate = keys.find((url) => typeof url === "string" && url.trim());
    return imageCandidate ? imageCandidate.trim() : "";
  };

  const resolveBannerMobileImage = (item: WPPluginBannerItem, isAr: boolean): string => {
    const keys = isAr
      ? [item.mobileImageAr, item.mobileAr, item.mobile_ar, item.mobile_image_ar, item.mobileImage, item.mobile, item.mobile_image]
      : [item.mobileImage, item.mobile, item.mobile_image, item.mobileImageAr, item.mobileAr, item.mobile_ar, item.mobile_image_ar];
    const imageCandidate = keys.find((url) => typeof url === "string" && url.trim());
    return imageCandidate ? imageCandidate.trim() : "";
  };

  const bannerItems = Array.isArray(pluginBanners.items) ? pluginBanners.items : [];
  const responsiveColumns = pluginBanners.responsive ?? pluginBanners.responsive_columns;
  const banners: Banner[] = bannerItems
    .map((item, index) => {
      const isAr = locale === "ar";
      const desktopImg = resolveBannerImage(item, isAr);
      const mobileImg = resolveBannerMobileImage(item, isAr) || desktopImg;
      const title = getBannerValue(item, "title");
      const subtitle = getBannerValue(item, "subtitle");
      const itemLink = getBannerValue(item, "link");

      return {
        image: createWPImage(desktopImg, title || `Banner ${index + 1}`) as WPImage,
        mobile_image: createWPImage(mobileImg, title || `Banner ${index + 1} Mobile`) || undefined,
        link: createWPLink(itemLink, title),
        title,
        subtitle,
      };
    })
    .filter((banner) => Boolean(banner.image?.url));

  return {
    enabled: pluginBanners.enabled ?? true,
    banners,
    layout: 'grid',
    responsive_columns: responsiveColumns,
    hide_on_mobile: pluginBanners.hideOnMobile ?? pluginBanners.hide_on_mobile,
    hide_on_desktop: pluginBanners.hideOnDesktop ?? pluginBanners.hide_on_desktop,
  };
}

// Transform WordPress Plugin ad settings to frontend format
function transformAdsSettings(pluginAds: WPPluginAdsSettings, locale?: Locale): AdsSettings {
  const getAdValue = (item: WPPluginAdItem, key: string, fallback: string = ""): string => {
    const normalized = locale === "ar"
      ? [
          `${key}Ar` as keyof WPPluginAdItem,
          `${key}_ar` as keyof WPPluginAdItem,
          `${key}_arabic` as keyof WPPluginAdItem,
          key as keyof WPPluginAdItem,
        ]
      : [
          key as keyof WPPluginAdItem,
          `${key}_en` as keyof WPPluginAdItem,
        ];
    for (const valueKey of normalized) {
      const value = item[valueKey];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return fallback;
  };

  const resolveAdImage = (item: WPPluginAdItem, isAr: boolean): string => {
    const keys = isAr
      ? [item.imageAr, item.image, item.mobileImageAr, item.mobileAr, item.mobileImage, item.mobile, item.image]
      : [item.image, item.mobileImage, item.mobile, item.imageAr, item.mobileImageAr, item.mobileAr];
    const imageCandidate = keys.find((url) => typeof url === "string" && url.trim());
    return imageCandidate ? imageCandidate.trim() : "";
  };

  const resolveAdMobileImage = (item: WPPluginAdItem, isAr: boolean): string => {
    const keys = isAr
      ? [item.mobileImageAr, item.mobileAr, item.mobile, item.mobileImage, item.imageAr, item.image]
      : [item.mobileImage, item.mobile, item.mobileImageAr, item.mobileAr, item.image, item.imageAr];
    const imageCandidate = keys.find((url) => typeof url === "string" && url.trim());
    return imageCandidate ? imageCandidate.trim() : "";
  };

  const items = Array.isArray(pluginAds.items) ? pluginAds.items : [];
  const ads = items
    .map((item, index) => {
      const isAr = locale === "ar";
      const image = resolveAdImage(item, isAr);
      const mobileImage = resolveAdMobileImage(item, isAr) || image;
      const title = getAdValue(item, "title");
      const subtitle = getAdValue(item, "subtitle");
      const buttonText = getAdValue(item, "buttonText");
      const itemLink = getAdValue(item, "link");
      const placement = (item.placement || "home").trim().toLowerCase() || "home";
      const market = (item.market || "all").trim().toLowerCase() || "all";

      return {
        image: createWPImage(image, title || `Ad ${index + 1}`) as WPImage,
        mobile_image: createWPImage(mobileImage, title || `Ad ${index + 1} Mobile`) || undefined,
        link: createWPLink(itemLink, buttonText || title),
        title,
        subtitle,
        button_text: buttonText,
        placement,
        market,
      };
    })
    .filter((ad) =>
      Boolean(ad.image?.url || ad.title || ad.subtitle || ad.link?.url)
    );

  return {
    enabled: pluginAds.enabled ?? true,
    items: ads,
  };
}

// Transform WordPress Plugin collections settings to frontend format
function transformCollectionsSettings(pluginCollections: WPPluginCollectionsSettings, locale?: Locale): CollectionsSettings {
  const collections: Collection[] = pluginCollections.items
    .filter(item => item.image || item.title)
    .map((item, index) => ({
      title: locale === "ar" ? (item.titleAr || "") : item.title,
      description: locale === "ar" ? (item.descriptionAr || "") : item.description,
      image: createWPImage(item.image, item.title || `Collection ${index + 1}`) as WPImage,
      link: createWPLink(item.link, item.title) as WPLink,
    }));
  const fallbackCollections = getSasanDiscoverCollections(locale);

  return {
    enabled: pluginCollections.enabled ?? true,
    section_title: locale === "ar" ? (pluginCollections.titleAr || "اكتشف المزيد") : (pluginCollections.title || "Discover More"),
    section_subtitle: locale === "ar" ? (pluginCollections.subtitleAr || "") : pluginCollections.subtitle,
    collections: collections.length > 0 ? collections : fallbackCollections,
    layout: 'grid',
    responsive_columns: pluginCollections.responsive ?? { desktop: 4, tablet: 2, mobile: 1 },
    hide_on_mobile: pluginCollections.hideOnMobile,
    hide_on_desktop: pluginCollections.hideOnDesktop,
  };
}

// Transform WordPress Plugin product section settings to frontend format
// When locale is Arabic, use Arabic fields if available, otherwise return empty string
// to allow the page component to fall back to translation files
function transformProductSectionSettings(pluginSection: WPPluginProductSectionSettings, locale?: Locale): ProductSectionSettings {
  return {
    enabled: pluginSection.enabled ?? true,
    section_title: locale === "ar" ? (pluginSection.titleAr || "") : pluginSection.title,
    section_subtitle: locale === "ar" ? (pluginSection.subtitleAr || "") : pluginSection.subtitle,
    products_count: pluginSection.count,
    selected_product_slugs: pluginSection.selectedProductSlugs ?? [],
    show_view_all: pluginSection.showViewAll ?? true,
    view_all_link: pluginSection.viewAllLink || "/shop",
    display: pluginSection.display === 'grid' ? 'grid' : 'slider',
    responsive_columns: pluginSection.responsive,
    autoplay: pluginSection.autoplay ?? true,
    autoplay_delay: 4000,
    hide_on_mobile: pluginSection.hideOnMobile,
    hide_on_desktop: pluginSection.hideOnDesktop,
  };
}

// Transform WordPress Plugin category section settings to frontend format
function transformCategorySectionSettings(pluginSection: WPPluginProductSectionSettings, locale?: Locale): CategorySectionSettings {
  return {
    enabled: pluginSection.enabled ?? true,
    section_title: locale === "ar" ? (pluginSection.titleAr || "تسوق حسب الفئة") : (pluginSection.title || "Shop by Category"),
    section_subtitle: locale === "ar" ? (pluginSection.subtitleAr || "") : pluginSection.subtitle,
    categories_count: pluginSection.count,
    selected_category_ids: pluginSection.selectedIds ?? [],
    show_view_all: true,
    responsive_columns: pluginSection.responsive,
    hide_on_mobile: pluginSection.hideOnMobile,
    hide_on_desktop: pluginSection.hideOnDesktop,
  };
}

// Transform WordPress Plugin featured products settings to frontend format
function transformFeaturedProductsSettings(pluginSection: WPPluginProductSectionSettings, locale?: Locale): FeaturedProductsSettings {
  return {
    enabled: pluginSection.enabled ?? true,
    section_title: locale === "ar" ? (pluginSection.titleAr || "") : pluginSection.title,
    section_subtitle: locale === "ar" ? (pluginSection.subtitleAr || "") : pluginSection.subtitle,
    products_count: pluginSection.count,
    selected_product_slugs: pluginSection.selectedProductSlugs ?? [],
    show_view_all: pluginSection.showViewAll ?? true,
    view_all_link: pluginSection.viewAllLink || "/shop",
    display: pluginSection.display === 'grid' ? 'grid' : 'slider',
    responsive_columns: pluginSection.responsive,
    autoplay: pluginSection.autoplay ?? true,
    autoplay_delay: 4000,
    hide_on_mobile: pluginSection.hideOnMobile,
    hide_on_desktop: pluginSection.hideOnDesktop,
  };
}

interface FetchOptions {
  revalidate?: number;
  tags?: string[];
  locale?: Locale;
  noCache?: boolean;
  frontendHost?: string;
  apiBase?: string;
}

const WP_KNOWN_MARKETS = new Set(["qa", "om", "sa"]);

function extractWPMarketFromHost(frontendHost?: string): string | undefined {
  const market = extractMarketCode(frontendHost);
  return market && WP_KNOWN_MARKETS.has(market) ? market : undefined;
}

function publicFrontendHostName(): string {
  try {
    return new URL(siteConfig.url).hostname;
  } catch {
    return "sasanperfumes.com";
  }
}

function cmsFrontendHostForMarket(market?: string, frontendHost?: string): string | undefined {
  return market && WP_KNOWN_MARKETS.has(market) ? `${publicFrontendHostName()}/${market}` : frontendHost;
}

async function detectMarketFromRequest(): Promise<string | undefined> {
  try {
    const { headers: getHeaders } = await import("next/headers");
    const reqHeaders = await getHeaders();
    const explicitMarket = reqHeaders.get("x-market")?.toLowerCase();
    if (explicitMarket && WP_KNOWN_MARKETS.has(explicitMarket)) {
      return explicitMarket;
    }
    const host = reqHeaders.get("x-frontend-host") || reqHeaders.get("host") || "";
    for (const m of WP_KNOWN_MARKETS) {
      if (host.includes(`/${m}`) || host.startsWith(`${m}.`)) {
        return m;
      }
    }
  } catch {
    // Not in a request context (client-side or build time)
  }
  return undefined;
}

async function fetchWPAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T | null> {
  const { revalidate = 300, tags, locale, noCache = false, frontendHost, apiBase } = options;
  const market = extractWPMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const cmsFrontendHost = cmsFrontendHostForMarket(market, frontendHost);
  const rootApiBase = apiBase || WP_API_BASE;
  const urls = uniqueUrls(
    buildWPAPIUrls(endpoint, locale, rootApiBase).map((url) =>
      cmsFrontendHost ? appendQueryParam(url, "frontend_host", cmsFrontendHost) : url
    )
  );

  const apiHeaders = market && cmsFrontendHost
    ? backendHeaders({ "X-Frontend-Host": cmsFrontendHost, "X-Market": market })
    : backendHeaders(WP_API_HEADERS);

  try {
      const shouldBypassCache = disableRuntimeCache || noCache || CMS_FORCE_DYNAMIC_CACHE;
      const fetchOptions: RequestInit = shouldBypassCache
        ? { headers: apiHeaders, cache: "no-store" }
        : {
          headers: apiHeaders,
          next: {
            revalidate: isCmsContentEndpoint(endpoint) ? Math.min(revalidate, 60) : revalidate,
            tags,
          },
        };

    for (const url of urls) {
      let response = await fetchWPUrl(url, fetchOptions);

      if (response.status === 403) {
        response = await fetchWPUrl(url, { headers: apiHeaders });
      }

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          continue;
        }
        console.warn(`WordPress API Error: ${response.status} ${response.statusText} (${url})`);
        return null;
      }

      const text = await response.text();
      if (!text.trim()) {
        return null;
      }

      try {
        return parseBackendJson<T>(text);
      } catch {
        console.warn(`WordPress API returned invalid JSON (${url})`);
        continue;
      }
    }

    return null;
  } catch (error) {
    if (!isExpectedNextDynamicServerError(error)) {
      console.warn(`WordPress API fetch failed (${urls[0]}): ${formatFetchError(error)}`);
    }
    return null;
  }
}

// Default values for when API is not available
const defaultHeroSlider: HeroSliderSettings = {
  enabled: true,
  slides: [],
  autoplay: true,
  autoplay_delay: 5000,
  loop: true,
};

const defaultProductSection: ProductSectionSettings = {
  enabled: true,
  section_title: "Products",
  section_subtitle: "",
  products_count: 8,
  show_view_all: true,
  view_all_link: "/shop",
  display: "slider",
  responsive_columns: { desktop: 4, tablet: 3, mobile: 2 },
  autoplay: true,
  autoplay_delay: 4000,
};

const defaultCategorySection: CategorySectionSettings = {
  enabled: true,
  section_title: "Shop by Category",
  section_subtitle: "Explore our diverse collections",
  categories_count: 6,
  show_view_all: true,
};

const defaultFeaturedProducts: FeaturedProductsSettings = {
  enabled: true,
  section_title: "Featured Products",
  section_subtitle: "Discover our best sellers",
  products_count: 8,
  show_view_all: true,
  view_all_link: "/shop",
  display: "slider",
  responsive_columns: { desktop: 4, tablet: 3, mobile: 2 },
  autoplay: true,
  autoplay_delay: 4000,
};

const defaultCollections: CollectionsSettings = {
  enabled: true,
  section_title: "Our Collections",
  section_subtitle: "Explore our curated collections",
  collections: [],
};

const defaultBanners: BannersSettings = {
  enabled: true,
  banners: [],
};

const defaultAdsSettings: AdsSettings = {
  enabled: false,
  items: [],
};

// Fetch site settings from WordPress Customizer (Appearance > Customize)
// This uses the WordPress Plugin API and root endpoint for site identity settings
export async function getSiteSettings(locale?: Locale, frontendHost?: string): Promise<SiteSettings> {
  // First try to get site settings from WordPress Plugin API endpoint
  const pluginSiteData = await fetchWPAPI<WPPluginSiteSettings>(
    "/sasanperfumes/v1/site-settings",
    {
      locale,
      frontendHost,
      tags: ["site-settings"],
      revalidate: 600,
    }
  );
  const shouldUseLegacySiteIdentity = Boolean(pluginSiteData);

  let siteInfo: WPSiteInfo | null = null;
  const getSiteInfo = async (): Promise<WPSiteInfo | null> => {
    if (!siteInfo) {
      siteInfo = await fetchWPAPI<WPSiteInfo>(
        "",
        {
          locale,
          frontendHost,
          tags: ["site-settings"],
          revalidate: 600,
        }
      );
    }
    return siteInfo;
  };

  // Logo priority: explicit env override -> backend absolute URL.
  // We use the absolute backend URL directly (not proxied) so Next.js <Image> can
  // optimize it via remotePatterns. The /cms-media/ rewrite proxy causes _next/image
  // to return 400 because the optimizer rejects relative rewrite URLs server-side.
  const isFromExpectedBackend = (url: string): boolean => {
    try {
      const apiHostname = new URL(siteConfig.apiUrl).hostname;
      return new URL(url).hostname === apiHostname;
    } catch {
      return false;
    }
  };

  let logoUrl: string | null = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || null;
  let logoId: string | number | null = null;

  if (!logoUrl && pluginSiteData?.logo?.url) {
    const raw = pluginSiteData.logo.url;
    if (isFromExpectedBackend(raw)) {
      logoUrl = raw; // absolute URL; hostname is in next.config remotePatterns
    }
    logoId = pluginSiteData.logo.id ?? null;
  }

  if (!logoUrl && shouldUseLegacySiteIdentity) {
    siteInfo = await getSiteInfo();
  }

  if (!logoUrl && shouldUseLegacySiteIdentity && siteInfo?.site_logo) {
    const mediaData = await fetchWPAPI<{ id?: number; source_url: string }>(
      `/wp/v2/media/${siteInfo.site_logo}`,
      { tags: ["site-settings", "logo"], revalidate: 600 }
    );
    if (mediaData?.source_url && isFromExpectedBackend(mediaData.source_url)) {
      logoUrl = mediaData.source_url;
      logoId = mediaData.id ?? null;
    }
  }

  if (logoUrl && logoId != null && !String(logoUrl).includes("v=")) {
    logoUrl = `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${logoId}`;
  }

  // Favicon follows WordPress Site Icon even when the frontend keeps its own logo.
  let faviconUrl: string | null = siteConfig.faviconUrl || null;
  let faviconId: string | number | null = null;

  if (!faviconUrl && pluginSiteData?.favicon?.url) {
    const raw = pluginSiteData.favicon.url;
    if (isFromExpectedBackend(raw)) {
      faviconUrl = raw;
      faviconId = pluginSiteData.favicon.id ?? null;
    }
  }

  if (!faviconUrl) {
    siteInfo = await getSiteInfo();
    if (siteInfo?.site_icon_url && isFromExpectedBackend(siteInfo.site_icon_url)) {
      faviconUrl = siteInfo.site_icon_url;
      faviconId = siteInfo.site_icon ?? null;
    }
  }

  if (!faviconUrl && siteInfo?.site_icon) {
    const mediaData = await fetchWPAPI<{ id?: number; source_url: string }>(
      `/wp/v2/media/${siteInfo.site_icon}`,
      { tags: ["site-settings", "favicon"], revalidate: 600 }
    );
    if (mediaData?.source_url && isFromExpectedBackend(mediaData.source_url)) {
      faviconUrl = mediaData.source_url;
      faviconId = mediaData.id ?? null;
    }
  }

  // Decode HTML entities to prevent double-encoding in <title> and meta tags.
  const rawSiteName = pluginSiteData?.name || siteInfo?.name || "";
  const rawSiteTagline = pluginSiteData?.description || siteInfo?.description || "";
  const siteName = replaceLegacyBrandText(rawSiteName).trim() || siteConfig.name;
  const siteTagline = sanitizeLegacyDescription(rawSiteTagline, getMarketSeoFallbackDescription(locale, frontendHost));

  // Build site settings from available sources
  const settings: SiteSettings = {
    logo: logoUrl ? {
      id: pluginSiteData?.logo?.id ? Number(pluginSiteData.logo.id) : (siteInfo?.site_logo || 0),
      url: logoUrl,
      alt: siteName,
      title: siteName,
      width: 200,
      height: 60,
      sizes: {
        thumbnail: logoUrl,
        medium: logoUrl,
        large: logoUrl,
        full: logoUrl,
      },
    } : null,
    logo_dark: null,
    favicon: faviconUrl ? {
      id: faviconId ? Number(faviconId) : 0,
      url: faviconUrl,
      alt: "Favicon",
      title: "Favicon",
      width: 32,
      height: 32,
      sizes: {
        thumbnail: faviconUrl,
        medium: faviconUrl,
        large: faviconUrl,
        full: faviconUrl,
      },
    } : null,
    site_name: siteName,
    tagline: siteTagline,
  };

  return settings;
}

// Fetch home page settings from WordPress Plugin API
export async function getHomePageSettings(locale?: Locale, frontendHost?: string): Promise<HomePageACF> {
  // First try to fetch from the WordPress Plugin API endpoint
  const pluginData = await fetchWPAPI<WPPluginHomeSettings>(
    "/sasanperfumes/v1/home-settings",
    {
      locale,
      frontendHost,
      tags: ["home-settings"],
      revalidate: 600,
    }
  );

  // If plugin data is available, transform it to the expected format
  if (pluginData) {
    return rebrandApiContent({
      hero_slider: transformHeroSettings(pluginData.hero, locale),
      new_products: transformProductSectionSettings(pluginData.newProducts, locale),
      bestseller_products: transformProductSectionSettings(pluginData.bestseller, locale),
      shop_by_category: transformCategorySectionSettings(pluginData.categories, locale),
      featured_products: transformFeaturedProductsSettings(pluginData.featured, locale),
      collections: transformCollectionsSettings(pluginData.collections, locale),
      banners: transformBannersSettings(pluginData.banners, locale),
    });
  }

  // Fallback: Try ACF endpoint (for backwards compatibility)
  const acfData = await fetchWPAPI<{ acf: Partial<HomePageACF> }>(
    "/acf/v3/options/home-page",
    {
      tags: ["home-page-settings"],
      locale,
      frontendHost,
      revalidate: 300,
    }
  );

  // Merge with defaults to ensure all fields exist
  return rebrandApiContent({
    hero_slider: acfData?.acf?.hero_slider || defaultHeroSlider,
    new_products: {
      ...defaultProductSection,
      section_title: "New Products",
      section_subtitle: "Discover our latest arrivals",
      ...acfData?.acf?.new_products,
    },
    bestseller_products: {
      ...defaultProductSection,
      section_title: "Bestsellers",
      section_subtitle: "Our most popular products",
      ...acfData?.acf?.bestseller_products,
    },
    shop_by_category: acfData?.acf?.shop_by_category || defaultCategorySection,
    featured_products: acfData?.acf?.featured_products || defaultFeaturedProducts,
    collections: acfData?.acf?.collections || defaultCollections,
    banners: acfData?.acf?.banners || defaultBanners,
  });
}

// Fetch hero slider settings
export async function getHeroSlider(locale?: Locale, frontendHost?: string): Promise<HeroSliderSettings> {
  const settings = await getHomePageSettings(locale, frontendHost);
  return settings.hero_slider;
}

// Fetch new products section settings
export async function getNewProductsSettings(locale?: Locale): Promise<ProductSectionSettings> {
  const settings = await getHomePageSettings(locale);
  return settings.new_products;
}

// Fetch bestseller products section settings
export async function getBestsellerProductsSettings(locale?: Locale): Promise<ProductSectionSettings> {
  const settings = await getHomePageSettings(locale);
  return settings.bestseller_products;
}

// Fetch category section settings
export async function getCategorySectionSettings(locale?: Locale): Promise<CategorySectionSettings> {
  const settings = await getHomePageSettings(locale);
  return settings.shop_by_category;
}

// Fetch featured products settings
export async function getFeaturedProductsSettings(locale?: Locale): Promise<FeaturedProductsSettings> {
  const settings = await getHomePageSettings(locale);
  return settings.featured_products;
}

// Fetch collections settings
export async function getCollectionsSettings(locale?: Locale): Promise<CollectionsSettings> {
  const settings = await getHomePageSettings(locale);
  return settings.collections;
}

// Fetch banners settings
export async function getBannersSettings(locale?: Locale): Promise<BannersSettings> {
  const settings = await getHomePageSettings(locale);
  return settings.banners;
}

// Fetch ad settings
export async function getAdSettings(locale?: Locale, frontendHost?: string): Promise<AdsSettings> {
  const pluginData = await fetchWPAPI<WPPluginAdsSettings>(
    "/sasanperfumes/v1/ad-settings",
    {
      locale,
      frontendHost,
      tags: ["ad-settings"],
      revalidate: 600,
    }
  );

  if (pluginData) {
    return transformAdsSettings(pluginData, locale);
  }

  return defaultAdsSettings;
}

// Raw WordPress menu item type from API (uses child_items and ID)
interface RawWPMenuItem {
  ID: number;
  title: string;
  url: string;
  target: string;
  menu_item_parent: string;
  menu_order: number;
  child_items?: RawWPMenuItem[];
}

// Raw WordPress menu type from API
interface RawWPMenu {
  term_id: number;
  name: string;
  slug: string;
  items: RawWPMenuItem[];
}

interface SasanMenuItem {
  id: number;
  title: string;
  url: string;
  target?: string;
  parent: string | number;
  order: number;
  children?: SasanMenuItem[];
}

interface SasanMenu {
  id: number;
  name: string;
  slug?: string;
  items: SasanMenuItem[];
}

// Transform raw WordPress menu item to normalized format
function transformMenuItem(rawItem: RawWPMenuItem): WPMenuItem {
  return {
    id: rawItem.ID,
    title: rebrandText(rawItem.title),
    url: rebrandText(rawItem.url),
    target: rawItem.target || "",
    parent: parseInt(rawItem.menu_item_parent, 10) || 0,
    order: rawItem.menu_order,
    children: rawItem.child_items?.map(transformMenuItem),
  };
}

function transformSasanMenuItem(rawItem: SasanMenuItem): WPMenuItem {
  return {
    id: rawItem.id,
    title: rebrandText(rawItem.title),
    url: rebrandText(rawItem.url),
    target: rawItem.target || "",
    parent: Number(rawItem.parent) || 0,
    order: rawItem.order,
    children: rawItem.children?.map(transformSasanMenuItem),
  };
}

function transformSasanMenu(rawMenu: SasanMenu): WPMenu {
  return {
    id: rawMenu.id,
    name: rawMenu.name,
    slug: rawMenu.slug || "primary",
    items: rawMenu.items?.map(transformSasanMenuItem) || [],
  };
}

// Transform raw WordPress menu to normalized format
function transformMenu(rawMenu: RawWPMenu): WPMenu {
  return {
    id: rawMenu.term_id,
    name: rawMenu.name,
    slug: rawMenu.slug,
    items: rawMenu.items?.map(transformMenuItem) || [],
  };
}

function menuItemCategorySlug(item: WPMenuItem): string {
  const [path] = item.url.split("?");
  const normalized = path.replace(/\/$/, "");
  const match = normalized.match(/\/(?:product-)?category\/([^/]+)$/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return decodeURIComponent(normalized.split("/").filter(Boolean).pop() || "");
}

function filterLegacyBrandCategoryMenuItems(items: WPMenuItem[]): WPMenuItem[] {
  const blockedIds = new Set<number>();

  for (const item of items) {
    const slug = menuItemCategorySlug(item);
    if (isLegacyBrandCategory({ name: item.title, slug })) {
      blockedIds.add(item.id);
    }
  }

  if (blockedIds.size === 0) return items;

  return items
    .filter((item) => !blockedIds.has(item.id) && !blockedIds.has(item.parent))
    .map((item) => ({
      ...item,
      children: item.children ? filterLegacyBrandCategoryMenuItems(item.children) : item.children,
    }));
}

// Fetch WordPress menu by location
export async function getMenu(location: string, locale?: Locale, frontendHost?: string): Promise<WPMenu | null> {
  if (location === "primary") {
    const sasanMenu = await fetchWPAPI<SasanMenu>(
      "/sasanperfumes/v1/menu/primary",
      {
        tags: ["menus", "menu-primary"],
        locale,
        frontendHost,
        revalidate: 600,
      }
    );

    if (sasanMenu?.items?.length) {
      return transformSasanMenu(sasanMenu);
    }
  }

  const data = await fetchWPAPI<RawWPMenu>(
    `/menus/v1/locations/${location}`,
    {
      tags: ["menus", `menu-${location}`],
      locale,
      frontendHost,
      revalidate: 600,
    }
  );

  if (!data) {
    return null;
  }

  return transformMenu(data);
}

// Fetch primary navigation menu
export async function getPrimaryMenu(locale?: Locale, frontendHost?: string): Promise<WPMenu | null> {
  return getMenu("primary", locale, frontendHost);
}

// Fetch mobile header menu (used for Categories drawer - separate from primary/desktop menu)
export async function getMobileHeaderMenu(locale?: Locale, frontendHost?: string): Promise<WPMenu | null> {
  return getMenu("mobile-header", locale, frontendHost);
}

// Fetch mobile bottom bar menu (used for bottom navigation icons - separate from other menus)
export async function getMobileBottomBarMenu(locale?: Locale, frontendHost?: string): Promise<WPMenu | null> {
  return getMenu("mobile-bottom", locale, frontendHost);
}

// Fetch WordPress menu by slug (uses /menus/v1/menus/{slug} endpoint)
// For Arabic locale, appends "-ar" suffix to fetch the translated menu
export async function getMenuBySlug(slug: string, locale?: Locale, frontendHost?: string): Promise<WPMenu | null> {
  const menuSlug = locale === "ar" ? `${slug}-ar` : slug;
  const data = await fetchWPAPI<RawWPMenu>(
    `/menus/v1/menus/${menuSlug}`,
    {
      tags: ["menus", `menu-slug-${menuSlug}`],
      frontendHost,
      revalidate: 600,
    }
  );

  if (!data) {
    return null;
  }

  return transformMenu(data);
}

// Fetch categories drawer menu (independent from mobile hamburger and desktop header)
export async function getCategoriesDrawerMenu(locale?: Locale, frontendHost?: string): Promise<WPMenu | null> {
  const menu = await getMenuBySlug("categories-drawer", locale, frontendHost);
  if (!menu) return null;

  return {
    ...menu,
    items: filterLegacyBrandCategoryMenuItems(menu.items),
  };
}

// Fetch footer menu
export async function getFooterMenu(locale?: Locale): Promise<WPMenu | null> {
  return getMenu("footer", locale);
}

// Default mobile bar items when WordPress settings are empty
const defaultMobileBarItems: MobileBarItem[] = [
  { icon: "home", label: "Home", labelAr: "الرئيسية", url: "/" },
  { icon: "grid", label: "Categories", labelAr: "الفئات", url: "/shop" },
  { icon: "search", label: "Search", labelAr: "بحث", url: "/search" },
  { icon: "heart", label: "Wishlist", labelAr: "المفضلة", url: "/wishlist" },
  { icon: "user", label: "Account", labelAr: "حسابي", url: "/account" },
];

// Fetch SEO settings from WordPress Plugin API
export async function getSeoSettings(locale?: Locale, frontendHost?: string): Promise<SeoSettings> {
  const data = await fetchWPAPI<WPPluginSeoSettings>(
    "/sasanperfumes/v1/seo-settings",
    {
      tags: ["seo-settings"],
      locale,
      frontendHost,
      revalidate: 600,
    }
  );

  // Decode HTML entities from WordPress text fields to prevent double-encoding
  // WordPress returns e.g. "Premium Fragrances &amp; Perfumes" which Next.js would
  // re-encode to "&amp;amp;" in <title> tags if not decoded first
  const d = (val: string | undefined) => val ? decodeHtmlEntities(val) : "";
  const dn = (val: string | undefined) => val ? replaceLegacyBrandText(val).trim() : "";
  const dd = (val: string | undefined) => val ? sanitizeLegacyDescription(val, getMarketSeoFallbackDescription(locale, frontendHost)) : getMarketSeoFallbackDescription(locale, frontendHost);

  const settings: SeoSettings = {
    title: dn(data?.title) || siteConfig.name,
    titleAr: dn(data?.titleAr) || siteConfig.name,
    description: dd(data?.description),
    descriptionAr: dd(data?.descriptionAr),
    keywords: dn(data?.keywords),
    keywordsAr: dn(data?.keywordsAr),
    openGraph: {
      title: dn(data?.ogTitle) || siteConfig.name,
      titleAr: dn(data?.ogTitleAr) || siteConfig.name,
      description: dd(data?.ogDescription),
      descriptionAr: dd(data?.ogDescriptionAr),
      image: data?.ogImage || "",
      type: data?.ogType || "website",
      siteName: dn(data?.ogSiteName),
      fbAppId: data?.fbAppId || "",
    },
    twitter: {
      card: data?.twitterCard || "summary_large_image",
      site: data?.twitterSite || "",
      creator: data?.twitterCreator || "",
      title: dn(data?.twitterTitle) || siteConfig.name,
      titleAr: dn(data?.twitterTitleAr) || siteConfig.name,
      description: dd(data?.twitterDescription),
      descriptionAr: dd(data?.twitterDescriptionAr),
      image: data?.twitterImage || "",
    },
    verification: {
      google: data?.googleVerification || "",
      bing: data?.bingVerification || "",
    },
    analytics: {
      gaId: data?.gaId || "",
      gtmId: data?.gtmId || "",
      fbPixelId: data?.fbPixelId || "",
      snapPixelId: data?.snapPixelId || "",
      tiktokPixelId: data?.tiktokPixelId || "",
    },
    robots: data?.robots || "index,follow",
    canonicalUrl: data?.canonicalUrl || "",
    schemaType: data?.schemaType || "Organization",
    customHead: data?.customHead || "",
  };

  return rebrandApiContent(settings);
}

// Fetch header settings from WordPress Plugin API
export async function getHeaderSettings(frontendHost?: string): Promise<HeaderSettings> {
  const data = await fetchWPAPI<WPPluginHeaderSettings>(
    "/sasanperfumes/v1/header-settings",
    {
      tags: ["header-settings"],
      frontendHost,
      revalidate: 600,
    }
  );

  return {
    sticky: data?.sticky ?? true,
    logo: data?.logo || null,
    stickyLogo: data?.stickyLogo || null,
    logoDark: data?.logoDark || null,
    megaMenu: data?.megaMenu ? {
      displayMode: (data.megaMenu.displayMode === "flat" ? "flat" : "child-based") as "child-based" | "flat",
      showProducts: data.megaMenu.showProducts ?? true,
      maxColumns: data.megaMenu.maxColumns || 3,
    } : undefined,
  };
}

// Fetch mobile bar settings from WordPress Plugin API
export async function getMobileBarSettings(locale?: Locale, frontendHost?: string): Promise<MobileBarSettings> {
  const data = await fetchWPAPI<WPPluginMobileBarSettings>(
    "/sasanperfumes/v1/mobile-bar",
    {
      tags: ["mobile-bar-settings"],
      locale,
      frontendHost,
      revalidate: 600,
    }
  );

  // If the API endpoint doesn't exist (404) or returns nothing, fall back to
  // default enabled state with default items. The MobileBottomBar component
  // will prefer WordPress menu items when available anyway.
  if (!data) {
    return { enabled: true, items: defaultMobileBarItems };
  }

  if (!data.enabled) {
    return { enabled: false, items: [] };
  }

  // Check if items are meaningfully configured (not just default "home" icons with empty labels/urls)
  const hasConfiguredItems = data.items.some(
    (item) => item.label || item.labelAr || item.url
  ) || new Set(data.items.map(i => i.icon)).size > 1;

  // Use default items if no items are configured
  const items = hasConfiguredItems
    ? data.items.map((item) => {
        // Override "Categories" label with "Menu" / "القائمة"
        const isCategoriesItem = item.icon === "grid" || 
          (item.url && item.url.includes("categories")) || 
          item.label?.toLowerCase() === "categories" || 
          item.labelAr === "الفئات";
        return {
          icon: item.icon || "",
          label: isCategoriesItem ? "Menu" : (item.label || ""),
          labelAr: isCategoriesItem ? "القائمة" : (item.labelAr || ""),
          url: item.url || "",
        };
      })
    : defaultMobileBarItems;

  return {
    enabled: data.enabled,
    items,
  };
}

// Default topbar settings — no hardcoded text; show only dynamic content from backend
const defaultTopbarSettings: TopbarSettings = {
  enabled: false,
  text: "",
  textAr: "",
  link: null,
  bgColor: "#f3f4f6",
  textColor: "#4b5563",
  dismissible: false,
  hideOnMobile: true,
  freeShippingThreshold: 500,
  freeShippingThresholds: null,
};

// Fetch topbar settings from WordPress Plugin API
export async function getTopbarSettings(locale?: Locale, frontendHost?: string): Promise<TopbarSettings> {
  const data = await fetchWPAPI<WPPluginTopbarSettings>(
    "/sasanperfumes/v1/topbar",
    {
      tags: ["topbar-settings"],
      locale,
      frontendHost,
      revalidate: 600,
    }
  );

  if (!data) {
    return defaultTopbarSettings;
  }

  return {
    enabled: data.enabled,
    text: data.text || "",
    textAr: data.textAr || "",
    link: data.link || null,
    bgColor: data.bgColor || defaultTopbarSettings.bgColor,
    textColor: data.textColor || defaultTopbarSettings.textColor,
    dismissible: data.dismissible,
    hideOnMobile: data.hideOnMobile ?? defaultTopbarSettings.hideOnMobile,
    freeShippingThreshold: data.freeShippingThreshold ?? defaultTopbarSettings.freeShippingThreshold,
    freeShippingThresholds: data.freeShippingThresholds ?? null,
  };
}

// ─── Footer Settings ───
const defaultFooterSettings: FooterSettings = {
  description: {
    en: "Discover Sasan Perfumes, a UAE fragrance destination for perfumes, hair mist, all over sprays, and gift-ready scent collections.",
    ar: "اكتشف Sasan Perfumes، وجهتك في الإمارات للعطور، معطرات الشعر، بخاخات الجسم، ومجموعات الهدايا العطرية.",
  },
  copyright: {
    en: "All rights reserved.",
    ar: "جميع الحقوق محفوظة.",
  },
  newsletter: {
    title: { en: "Stay in the Scent Loop", ar: "ابقَ في عالم العطور" },
    subtitle: {
      en: "Subscribe to receive updates, access to exclusive deals, and more.",
      ar: "اشترك لتلقي التحديثات والوصول إلى العروض الحصرية والمزيد.",
    },
    buttonText: { en: "Subscribe", ar: "اشترك" },
    placeholder: {
      en: "Enter your email address",
      ar: "أدخل بريدك الإلكتروني",
    },
  },
  quickLinks: {
    heading: { en: "Quick Links", ar: "روابط سريعة" },
    items: [
      { label: { en: "Home", ar: "الرئيسية" }, url: "/" },
      { label: { en: "Shop", ar: "المتجر" }, url: "/shop" },
      { label: { en: "Perfumes", ar: "العطور" }, url: "/category/perfumes" },
      { label: { en: "All Over Spray", ar: "بخاخ الجسم" }, url: "/category/all-over-spray" },
      { label: { en: "Hair Mist", ar: "معطر الشعر" }, url: "/category/sasan-hair-mist" },
      { label: { en: "Gift Sets", ar: "أطقم الهدايا" }, url: "/category/gift-set" },
      { label: { en: "Contact", ar: "تواصل معنا" }, url: "/contact" },
    ],
  },
  customerService: {
    heading: { en: "Customer Service", ar: "خدمة العملاء" },
    items: [
      { label: { en: "FAQ", ar: "الأسئلة الشائعة" }, url: "/faq" },
      { label: { en: "Shipping Information", ar: "معلومات الشحن" }, url: "/shipping" },
      { label: { en: "Return Policy", ar: "سياسة الإرجاع" }, url: "/returns" },
      { label: { en: "Track Order", ar: "تتبع الطلب" }, url: "/track-order" },
      { label: { en: "Privacy Policy", ar: "سياسة الخصوصية" }, url: "/privacy" },
      { label: { en: "Terms & Conditions", ar: "الشروط والأحكام" }, url: "/terms-and-conditions" },
      { label: { en: "Private Labeling", ar: "التصنيع الخاص" }, url: "/private-labeling" },
    ],
  },
  social: {
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    snapchat: "",
    whatsapp: "https://wa.me/0567394314",
  },
  poweredBy: {
    text: { en: "Powered by", ar: "مدعوم من" },
    name: { en: "", ar: "" },
    url: "",
  },
};

export async function getFooterSettings(frontendHost?: string): Promise<FooterSettings> {
  const data = await fetchWPAPI<FooterSettings>("/sasanperfumes/v1/footer-settings", {
    tags: ["footer-settings"],
    frontendHost,
    revalidate: 600,
  });

  const settings: FooterSettings = data ? {
    description: data.description || defaultFooterSettings.description,
    copyright: data.copyright || defaultFooterSettings.copyright,
    newsletter: data.newsletter || defaultFooterSettings.newsletter,
    quickLinks: data.quickLinks || defaultFooterSettings.quickLinks,
    customerService: data.customerService || defaultFooterSettings.customerService,
    social: siteConfig.useBackendBrandAssets ? data.social || defaultFooterSettings.social : {
      facebook: siteConfig.links.facebook,
      instagram: siteConfig.links.instagram,
      twitter: siteConfig.links.twitter,
      tiktok: "",
      snapchat: "",
      whatsapp: "",
    },
    poweredBy: data.poweredBy || defaultFooterSettings.poweredBy,
  } : defaultFooterSettings;

  const legacyQuickLinkUrls = ["/", "/shop", "/category/perfumes", "/category/all-over-spray", "/category/sasan-hair-mist", "/category/gift-set", "/contact"];
  const legacyCustomerServiceUrls = ["/faq", "/shipping", "/returns", "/track-order", "/privacy", "/terms-and-conditions", "/private-labeling"];

  const liveQuickLinks: FooterSettings["quickLinks"]["items"] = [
    { label: { en: "About Us", ar: "من نحن" }, url: "/about-us" },
    { label: { en: "Our Stores", ar: "مواقعنا" }, url: "/store-listing" },
    { label: { en: "B2B", ar: "B2B" }, url: "#" },
  ];

  const liveCustomerServiceLinks: FooterSettings["customerService"]["items"] = [
    { label: { en: "Contact Us", ar: "تواصل معنا" }, url: "/contact-us" },
    { label: { en: "Delivery Policy", ar: "سياسة التسليم" }, url: "/privacy-policy" },
    { label: { en: "Exchange & Return Policy", ar: "سياسة الاستبدال والإرجاع" }, url: "/refund_returns" },
    { label: { en: "Payment Policy", ar: "سياسة الدفع" }, url: "/refund_returns" },
  ];

  const quickLinkUrls = settings.quickLinks.items.map((item) => item.url);
  const customerServiceUrls = settings.customerService.items.map((item) => item.url);
  const isLegacyQuickLinks = legacyQuickLinkUrls.every((url, index) => quickLinkUrls[index] === url);
  const isLegacyCustomerService = legacyCustomerServiceUrls.every((url, index) => customerServiceUrls[index] === url);

  const normalizedSettings: FooterSettings = {
    ...settings,
    quickLinks: isLegacyQuickLinks
      ? { ...settings.quickLinks, items: liveQuickLinks }
      : settings.quickLinks,
    customerService: isLegacyCustomerService
      ? { ...settings.customerService, items: liveCustomerServiceLinks }
      : settings.customerService,
  };

  return rebrandApiContent(normalizedSettings);
}

// WordPress Page types from REST API
export interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  featured_media: number;
  parent: number;
  menu_order: number;
  template: string;
  meta: Record<string, unknown>;
  yoast_head_json?: {
    title?: string;
    description?: string;
    robots?: {
      index?: string;
      follow?: string;
    };
    canonical?: string;
    og_title?: string;
    og_description?: string;
    og_image?: Array<{ url: string; width?: number; height?: number }>;
    og_url?: string;
    og_type?: string;
    og_locale?: string;
    og_site_name?: string;
    twitter_card?: string;
    twitter_title?: string;
    twitter_description?: string;
    twitter_image?: string;
    schema?: Record<string, unknown>;
  };
}

// Functional page slugs that should NOT be rendered from WordPress
// These have custom Next.js implementations
const FUNCTIONAL_PAGE_SLUGS = [
  "cart",
  "checkout",
  "account",
  "my-account",
  "wishlist",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "order-confirmation",
];

// Check if a slug is a functional page that should not be rendered from WordPress
export function isFunctionalPageSlug(slug: string): boolean {
  return FUNCTIONAL_PAGE_SLUGS.includes(slug.toLowerCase());
}

// Fetch a single WordPress page by slug
// Uses ISR caching (revalidate every 5 minutes) for optimal SEO and speed
// Content updates from WordPress will be reflected within 5 minutes
export async function getPageBySlug(slug: string, locale?: Locale): Promise<WPPage | null> {
  // Don't fetch functional pages from WordPress
  if (isFunctionalPageSlug(slug)) {
    return null;
  }

  const currentPage = await fetchPageBySlugFromApi(slug, locale);
  if (currentPage) {
    return currentPage;
  }

  if (normalizeStaticPageSlug(slug) === "track-order") {
    return buildTrackOrderSyntheticPage(locale);
  }

  return null;
}

// Fetch all published WordPress pages
export async function getPages(locale?: Locale): Promise<WPPage[]> {
  const currentPages = await fetchWPAPI<WPPage[]>(
    "/wp/v2/pages?per_page=100&status=publish&_embed",
    {
      tags: ["pages"],
      locale,
      revalidate: 300,
    }
  );

  const pages = new Map<string, WPPage>();
  for (const page of currentPages || []) {
    if (isFunctionalPageSlug(page.slug) || pages.has(page.slug)) {
      continue;
    }
    pages.set(page.slug, page);
  }

  if (!pages.has("track-order")) {
    const trackOrderPage = buildTrackOrderSyntheticPage(locale);
    if (trackOrderPage) {
      pages.set(trackOrderPage.slug, trackOrderPage);
    }
  }

  return Array.from(pages.values());
}

// Helper function to strip HTML tags from a string (for SEO metadata)
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// Extracted Yoast SEO data from a WordPress page
export interface PageSeoData {
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonical: string | null;
  pageTitle: string | null;
  pageExcerpt: string | null;
  pageContent: string | null;
}

// Fetch SEO data for a page by its slug from WordPress
// Used by frontend pages to get dynamic SEO content from WordPress Pages editor + Yoast
export async function getPageSeo(slug: string, locale?: Locale): Promise<PageSeoData | null> {
  const page = await fetchPageBySlugFromApi(slug, locale);
  const fallback = buildStaticPageSeoFallback(slug, locale);

  if (!page) {
    return fallback;
  }

  const yoast = page.yoast_head_json;

  return {
    title: yoast?.title ? decodeHtmlEntities(yoast.title) : decodeHtmlEntities(stripHtmlTags(page.title.rendered)) || fallback.title,
    description: yoast?.description || decodeHtmlEntities(stripHtmlTags(page.excerpt.rendered)) || fallback.description,
    ogTitle: yoast?.og_title ? decodeHtmlEntities(yoast.og_title) : fallback.ogTitle,
    ogDescription: yoast?.og_description || fallback.ogDescription,
    ogImage: yoast?.og_image?.[0]?.url || fallback.ogImage,
    twitterTitle: yoast?.twitter_title ? decodeHtmlEntities(yoast.twitter_title) : fallback.twitterTitle,
    twitterDescription: yoast?.twitter_description || fallback.twitterDescription,
    twitterImage: yoast?.twitter_image || fallback.twitterImage,
    canonical: yoast?.canonical || fallback.canonical,
    pageTitle: decodeHtmlEntities(stripHtmlTags(page.title.rendered)) || fallback.pageTitle,
    pageExcerpt: page.excerpt.rendered ? decodeHtmlEntities(stripHtmlTags(page.excerpt.rendered)) : fallback.pageExcerpt,
    pageContent: page.content.rendered || null,
  };
}

// Mega Menu Types
export interface MegaMenuColumn {
  id: number;
  name: string;
  slug: string;
  url: string;
  image: { src: string } | null;
  children: Array<{
    id: number;
    name: string;
    slug: string;
    url: string;
  }>;
}

export interface MegaMenuData {
  columns: MegaMenuColumn[];
  featuredProductIds: number[];
}

function extractCategorySlugFromUrl(url: string): string {
  if (!url) return "";
  const categoryParamMatch = url.match(/[?&]category=([^&]+)/);
  if (categoryParamMatch) return categoryParamMatch[1];
  const shopPathMatch = url.match(/\/shop\/([^/?]+)/);
  if (shopPathMatch) return shopPathMatch[1];
  const categoryPathMatch = url.match(/\/category\/([^/?]+)/);
  if (categoryPathMatch) return categoryPathMatch[1];
  // Match WordPress product-category URLs (e.g., /product-category/perfumes-oils/)
  const productCategoryPathMatch = url.match(/\/product-category\/([^/?]+)/);
  if (productCategoryPathMatch) return productCategoryPathMatch[1];
  const lastSegmentMatch = url.match(/\/([^/?]+)\/?$/);
  if (lastSegmentMatch && lastSegmentMatch[1] !== "#") return lastSegmentMatch[1];
  return "";
}

/**
 * Transform a WordPress URL to a frontend category URL
 * WordPress URLs like https://cms.sasanperfumes.com/product-category/perfumes-oils/
 * become /{locale}/category/{slug}
 */
function transformToFrontendCategoryUrl(url: string, slug: string, locale?: Locale): string {
  const localePrefix = locale || "en";
  // If we have a valid slug, construct the frontend URL
  if (slug) {
    return `/${localePrefix}/category/${slug}`;
  }
  // Fallback to shop page if no slug
  return `/${localePrefix}/shop`;
}

function parseProductIds(label: string): number[] {
  const ids: number[] = [];
  if (label.includes("[") || label.includes("]")) {
    const matches = label.match(/\d+/g);
    if (matches) {
      matches.forEach((match) => {
        const id = parseInt(match, 10);
        if (!isNaN(id) && id > 0) {
          ids.push(id);
        }
      });
    }
  }
  return ids;
}

function isProductIdsLabel(label: string): boolean {
  if (!label.includes("[") && !label.includes("]")) return false;
  const hasNumbers = /\d+/.test(label);
  const hasOnlyBracketsNumbersAndPunctuation = /^[\[\]\d,\s]+$/.test(label.trim());
  return hasNumbers && hasOnlyBracketsNumbersAndPunctuation;
}

export async function getMegaMenuData(locale?: Locale, frontendHost?: string): Promise<MegaMenuData | null> {
  const menu = await getPrimaryMenu(locale, frontendHost);
  
  if (!menu || !menu.items || menu.items.length === 0) {
    return null;
  }

  const shopAllItem = menu.items.find(
    (item) => 
      item.title.toLowerCase() === "shop all" || 
      item.title.toLowerCase() === "shop" ||
      item.title === "تسوق" ||
      item.title === "تسوق الكل"
  );

  if (!shopAllItem || !shopAllItem.children || shopAllItem.children.length === 0) {
    return null;
  }

  const columns: MegaMenuColumn[] = [];
  const featuredProductIds: number[] = [];

  for (const child of shopAllItem.children) {
    if (isProductIdsLabel(child.title)) {
      const ids = parseProductIds(child.title);
      featuredProductIds.push(...ids);
      continue;
    }

    const childSlug = extractCategorySlugFromUrl(child.url);
    const column: MegaMenuColumn = {
      id: child.id,
      name: locale === "ar" ? translateToArabic(child.title) : decodeHtmlEntities(child.title),
      slug: childSlug,
      url: transformToFrontendCategoryUrl(child.url, childSlug, locale),
      image: null,
      children: [],
    };

    if (child.children && child.children.length > 0) {
      for (const subChild of child.children) {
        if (isProductIdsLabel(subChild.title)) {
          const ids = parseProductIds(subChild.title);
          featuredProductIds.push(...ids);
          continue;
        }

        const subChildSlug = extractCategorySlugFromUrl(subChild.url);
        column.children.push({
          id: subChild.id,
          name: locale === "ar" ? translateToArabic(subChild.title) : decodeHtmlEntities(subChild.title),
          slug: subChildSlug,
          url: transformToFrontendCategoryUrl(subChild.url, subChildSlug, locale),
        });
      }
    }

    columns.push(column);
  }

  return {
    columns,
    featuredProductIds,
  };
}

// ─── Product Pages (sasanperfumes_product_page CPT) ─────────────────────────

/**
 * Fetch all published product pages from the custom REST endpoint.
 * Used by generateStaticParams to pre-render all product pages at build time.
 */
export async function getProductPages(): Promise<ProductPage[]> {
  const data = await fetchWPAPI<ProductPage[]>(
    "/sasanperfumes/v1/product-pages",
    {
      tags: ["product-pages"],
      revalidate: 300,
    }
  );
  return rebrandApiContent(data ?? []);
}

/**
 * Fetch a single product page by slug.
 * Returns null if the page is not found or an error occurs.
 */
export async function getProductPageBySlug(slug: string, locale?: Locale): Promise<ProductPage | null> {
  const data = await fetchWPAPI<ProductPage>(
    `/sasanperfumes/v1/product-pages/${encodeURIComponent(slug)}`,
    {
      tags: ["product-pages", `product-page-${slug}`],
      locale,
      revalidate: 300,
    }
  );
  return data ? rebrandApiContent(data) : null;
}

// ─── Category SEO Content ─────────────────────────────────────────

export async function getCategorySeoContent(slug: string): Promise<CategorySeoContent | null> {
  const data = await fetchWPAPI<CategorySeoContent>(
    `/sasanperfumes/v1/category-seo/${encodeURIComponent(slug)}`,
    { tags: ["category-seo", `category-seo-${slug}`], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

export async function getAllCategorySeoContent(): Promise<Record<string, CategorySeoContent>> {
  const data = await fetchWPAPI<Record<string, CategorySeoContent>>(
    "/sasanperfumes/v1/category-seo",
    { tags: ["category-seo"], revalidate: 300 }
  );
  return rebrandApiContent(data ?? {});
}

// ─── Category Subtitle ────────────────────────────────────────────

export async function getCategorySubtitle(slug: string): Promise<{ en: string; ar: string } | null> {
  const data = await fetchWPAPI<{ subtitle: { en: string; ar: string } }>(
    `/sasanperfumes/v1/category-subtitle/${encodeURIComponent(slug)}`,
    { tags: ["category-subtitle", `category-subtitle-${slug}`], revalidate: 300 }
  );
  if (!data?.subtitle) return null;
  const subtitle = rebrandApiContent(data.subtitle) as { en: string; ar: string };
  if (!subtitle.en && !subtitle.ar) return null;
  return subtitle;
}

// ─── Home Sections (Why Choose Us, Our Story, FAQ, SEO) ──────────

const SASAN_HOME_SECTION_FALLBACK_IMAGE =
  "https://cms.sasanperfumes.com/wp-content/uploads/2026/05/Sasan4321-scaled-e1755807551258.jpg";

const defaultHomeSections: HomeSections = {
  whyChooseUs: { enabled: true, eyebrow: { en: 'Our Promise', ar: 'تميزنا' }, title: { en: '', ar: '' }, subtitle: { en: '', ar: '' }, items: [] },
  ourStory: { enabled: true, eyebrow: { en: 'Discover Our Journey', ar: 'اكتشف قصتنا' }, title: { en: '', ar: '' }, description1: { en: '', ar: '' }, description2: { en: '', ar: '' }, image: '', stats: [] },
  faq: { enabled: true, eyebrow: { en: 'Help', ar: 'مساعدة' }, title: { en: '', ar: '' }, subtitle: { en: '', ar: '' }, items: [] },
  seoContent: { enabled: true, title: { en: 'Shop Premium Perfumes Online in the UAE', ar: 'تسوق العطور الفاخرة اون لاين في الإمارات' }, paragraphs: [] },
};

const sasanFallbackHomeSections: HomeSections = {
  whyChooseUs: {
    enabled: true,
    eyebrow: { en: "Our Promise", ar: "وعدنا" },
    title: { en: "Perfume shopping made personal", ar: "تسوق عطور بتجربة شخصية" },
    subtitle: {
      en: "Sasan Perfumes brings curated fragrances, careful packing, and reliable regional delivery together in one bilingual store.",
      ar: "تجمع ساسان للعطور بين العطور المختارة بعناية والتغليف المتقن والتوصيل الموثوق في متجر ثنائي اللغة.",
    },
    items: [
      {
        title: { en: "Authentic selections", ar: "اختيارات أصلية" },
        description: { en: "Clear product details help every customer choose with confidence.", ar: "تفاصيل واضحة تساعد كل عميل على الاختيار بثقة." },
      },
      {
        title: { en: "Regional checkout", ar: "دفع مناسب للمنطقة" },
        description: { en: "Market-specific currency, payment, and COD flows keep orders simple.", ar: "عملات وطرق دفع ودفع عند الاستلام مخصصة لكل سوق لتسهيل الطلب." },
      },
      {
        title: { en: "Bilingual service", ar: "خدمة ثنائية اللغة" },
        description: { en: "English and Arabic storefronts support browsing from product page to checkout.", ar: "واجهات إنجليزية وعربية تدعم التصفح من صفحة المنتج حتى إتمام الطلب." },
      },
    ],
  },
  ourStory: {
    enabled: true,
    eyebrow: { en: "Sasan Perfumes", ar: "ساسان للعطور" },
    title: { en: "Fragrance for everyday elegance", ar: "عطور لأناقة كل يوم" },
    description1: {
      en: "Sasan Perfumes is built for customers who want distinctive scents, transparent product details, and a store experience that feels easy in English and Arabic.",
      ar: "تأسست ساسان للعطور للعملاء الذين يبحثون عن روائح مميزة وتفاصيل واضحة وتجربة تسوق سهلة بالإنجليزية والعربية.",
    },
    description2: {
      en: "From fresh daily wear to rich evening blends, the collection helps every customer find a fragrance that suits their style and occasion.",
      ar: "من العطور اليومية المنعشة إلى الخلطات الغنية للمناسبات، تساعد المجموعة كل عميل على إيجاد العطر المناسب لذوقه ومناسبته.",
    },
    image: SASAN_HOME_SECTION_FALLBACK_IMAGE,
    stats: [
      { value: "2", label: { en: "Languages", ar: "لغتان" } },
      { value: "4", label: { en: "Regional stores", ar: "متاجر إقليمية" } },
      { value: "COD", label: { en: "Cash on delivery", ar: "الدفع عند الاستلام" } },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: { en: "Help", ar: "مساعدة" },
    title: { en: "Shopping questions", ar: "أسئلة التسوق" },
    subtitle: { en: "Quick answers for perfume orders, payment, delivery, and returns.", ar: "إجابات سريعة حول طلبات العطور والدفع والتوصيل والاسترجاع." },
    items: [
      {
        question: { en: "Can I order with cash on delivery?", ar: "هل يمكنني الطلب بالدفع عند الاستلام؟" },
        answer: { en: "Yes. COD is available on supported regional stores during checkout.", ar: "نعم، الدفع عند الاستلام متاح في المتاجر الإقليمية المدعومة أثناء إتمام الطلب." },
      },
      {
        question: { en: "Are prices shown in my market currency?", ar: "هل تظهر الأسعار بعملة السوق الخاص بي؟" },
        answer: { en: "Yes. Qatar, Oman, Saudi Arabia, and the main store use their configured currencies.", ar: "نعم، تستخدم متاجر قطر وعمان والسعودية والمتجر الرئيسي العملات المخصصة لها." },
      },
      {
        question: { en: "Can I browse in Arabic?", ar: "هل يمكنني التصفح باللغة العربية؟" },
        answer: { en: "Yes. The storefront supports Arabic layout and Arabic shopping labels.", ar: "نعم، يدعم المتجر التخطيط العربي وتسميات التسوق العربية." },
      },
    ],
  },
  seoContent: {
    enabled: true,
    title: { en: "Shop premium perfumes online with Sasan Perfumes", ar: "تسوق العطور الفاخرة أونلاين مع ساسان للعطور" },
    backgroundImage: SASAN_HOME_SECTION_FALLBACK_IMAGE,
    paragraphs: [
      {
        en: "Explore curated perfumes with clear product pages, regional pricing, and a checkout flow designed for customers across the Gulf.",
        ar: "اكتشف مجموعة مختارة من العطور مع صفحات منتجات واضحة وأسعار إقليمية وتجربة دفع مصممة لعملاء الخليج.",
      },
      {
        en: "Sasan Perfumes supports English and Arabic browsing, market-specific currencies, and cash on delivery where available.",
        ar: "يدعم متجر ساسان للعطور التصفح بالإنجليزية والعربية والعملات الخاصة بكل سوق والدفع عند الاستلام حيثما كان متاحا.",
      },
    ],
  },
};

function hasBilingualContent(value?: { en?: string; ar?: string } | null): boolean {
  return Boolean(value?.en?.trim() || value?.ar?.trim());
}

function mergeBilingualContent<T extends { en: string; ar: string }>(value: T | undefined, fallback: T): T {
  return {
    en: value?.en?.trim() ? value.en : fallback.en,
    ar: value?.ar?.trim() ? value.ar : fallback.ar,
  } as T;
}

function normalizeHomeSections(data?: HomeSections | null): HomeSections {
  const source = data ?? defaultHomeSections;
  const sourceStory = source.ourStory;
  const storyHasConfiguredContent = Boolean(
    hasBilingualContent(sourceStory?.title) ||
      hasBilingualContent(sourceStory?.description1) ||
      hasBilingualContent(sourceStory?.description2) ||
      sourceStory?.image?.trim()
  );

  return {
    whyChooseUs: {
      ...sasanFallbackHomeSections.whyChooseUs,
      ...(source.whyChooseUs || {}),
      enabled: source.whyChooseUs?.enabled !== false,
      eyebrow: mergeBilingualContent(source.whyChooseUs?.eyebrow, sasanFallbackHomeSections.whyChooseUs.eyebrow),
      title: mergeBilingualContent(source.whyChooseUs?.title, sasanFallbackHomeSections.whyChooseUs.title),
      subtitle: mergeBilingualContent(source.whyChooseUs?.subtitle, sasanFallbackHomeSections.whyChooseUs.subtitle),
      items: source.whyChooseUs?.items?.some((item) => hasBilingualContent(item.title) || hasBilingualContent(item.description))
        ? source.whyChooseUs.items
        : sasanFallbackHomeSections.whyChooseUs.items,
    },
    ourStory: {
      ...sasanFallbackHomeSections.ourStory,
      ...(sourceStory || {}),
      enabled: sourceStory?.enabled !== false && storyHasConfiguredContent,
      eyebrow: mergeBilingualContent(sourceStory?.eyebrow, sasanFallbackHomeSections.ourStory.eyebrow),
      title: storyHasConfiguredContent
        ? mergeBilingualContent(sourceStory?.title, sasanFallbackHomeSections.ourStory.title)
        : { en: "", ar: "" },
      description1: storyHasConfiguredContent
        ? mergeBilingualContent(sourceStory?.description1, sasanFallbackHomeSections.ourStory.description1)
        : { en: "", ar: "" },
      description2: storyHasConfiguredContent
        ? mergeBilingualContent(sourceStory?.description2, sasanFallbackHomeSections.ourStory.description2)
        : { en: "", ar: "" },
      image: storyHasConfiguredContent ? sourceStory?.image || "" : "",
      stats: sourceStory?.stats?.some((stat) => stat.value || hasBilingualContent(stat.label)) ? sourceStory.stats : [],
    },
    faq: {
      ...sasanFallbackHomeSections.faq,
      ...(source.faq || {}),
      enabled: source.faq?.enabled !== false,
      eyebrow: mergeBilingualContent(source.faq?.eyebrow, sasanFallbackHomeSections.faq.eyebrow),
      title: mergeBilingualContent(source.faq?.title, sasanFallbackHomeSections.faq.title),
      subtitle: mergeBilingualContent(source.faq?.subtitle, sasanFallbackHomeSections.faq.subtitle),
      items: source.faq?.items?.some((item) => hasBilingualContent(item.question) || hasBilingualContent(item.answer))
        ? source.faq.items
        : sasanFallbackHomeSections.faq.items,
    },
    seoContent: {
      ...sasanFallbackHomeSections.seoContent,
      ...(source.seoContent || {}),
      enabled: source.seoContent?.enabled !== false,
      title: mergeBilingualContent(source.seoContent?.title, sasanFallbackHomeSections.seoContent.title),
      backgroundImage: source.seoContent?.backgroundImage || sasanFallbackHomeSections.seoContent.backgroundImage,
      paragraphs: source.seoContent?.paragraphs?.some(hasBilingualContent)
        ? source.seoContent.paragraphs
        : sasanFallbackHomeSections.seoContent.paragraphs,
    },
  };
}

export async function getHomeSections(frontendHost?: string): Promise<HomeSections> {
  const data = await fetchWPAPI<HomeSections>(
    "/sasanperfumes/v1/home-sections",
    { tags: ["home-sections"], frontendHost, revalidate: 600 }
  );
  return rebrandApiContent(normalizeHomeSections(data));
}

// ─── Guide Pages (sasanperfumes_guide CPT) ─────────────────────────────────

export async function getGuidePages(): Promise<GuidePage[]> {
  const data = await fetchWPAPI<GuidePage[]>(
    "/sasanperfumes/v1/guides",
    { tags: ["guides"], revalidate: 300 }
  );
  return rebrandApiContent(data ?? []);
}

export async function getGuidePageBySlug(slug: string): Promise<GuidePage | null> {
  const data = await fetchWPAPI<GuidePage>(
    `/sasanperfumes/v1/guides/${encodeURIComponent(slug)}`,
    { tags: ["guides", `guide-${slug}`], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

// ─── Static Pages (About, Contact, FAQ, Privacy, Terms, Shipping, Returns) ───

// Bilingual field from API: { en: string, ar: string }
interface BilingualField { en: string; ar: string; }

// Generic static page API response — all fields are bilingual objects or repeater arrays
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StaticPageValue = BilingualField | any[] | string | number | boolean | null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StaticPageResponse = Record<string, StaticPageValue>;

function bi(en: string, ar: string): BilingualField {
  return { en, ar };
}

const STATIC_PAGE_ALIASES: Record<string, string[]> = {
  about: ["about", "about-us"],
  contact: ["contact", "contact-us"],
  privacy: ["privacy", "privacy-policy"],
  returns: ["returns", "refund_returns", "return-policy"],
  faq: ["faq"],
  shipping: ["shipping", "shipping-policy"],
  terms: ["terms", "terms-and-conditions"],
  "store-locator": ["store-locator", "store-listing"],
  "track-order": ["track-order"],
};

function normalizeStaticPageSlug(slug: string): string {
  const lower = slug.toLowerCase();
  for (const [canonical, aliases] of Object.entries(STATIC_PAGE_ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}

function getStaticPageCandidates(slug: string): string[] {
  const canonical = normalizeStaticPageSlug(slug);
  const aliases = STATIC_PAGE_ALIASES[canonical] || [canonical];
  return Array.from(new Set([canonical, ...aliases, slug.toLowerCase()]));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchPageBySlugFromApi(
  slug: string,
  locale?: Locale,
  apiBase?: string
): Promise<WPPage | null> {
  for (const candidate of getStaticPageCandidates(slug)) {
    const data = await fetchWPAPI<WPPage[]>(
      `/wp/v2/pages?slug=${encodeURIComponent(candidate)}&_embed`,
      {
        tags: ["pages", `page-${candidate}`],
        locale,
        revalidate: 300,
        apiBase,
      }
    );

    if (data && data.length > 0) {
      return data[0];
    }
  }

  return null;
}

function isMeaningfulStaticPageValue(value: StaticPageValue | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    const obj = value as unknown as Record<string, unknown>;
    if ("en" in obj || "ar" in obj) {
      const en = typeof obj.en === "string" ? obj.en.trim() : "";
      const ar = typeof obj.ar === "string" ? obj.ar.trim() : "";
      return Boolean(en || ar);
    }

    return Object.values(obj).some((entry) => isMeaningfulStaticPageValue(entry as StaticPageValue));
  }

  return false;
}

function mergeStaticPageContent(
  primary: StaticPageResponse | null,
  fallback: StaticPageResponse | null
): StaticPageResponse | null {
  if (!primary && !fallback) {
    return null;
  }

  if (!primary) {
    return fallback;
  }

  if (!fallback) {
    return primary;
  }

  const result: StaticPageResponse = { ...fallback };
  for (const [key, value] of Object.entries(primary)) {
    const fallbackValue = fallback[key];
    if (isMeaningfulStaticPageValue(value) || !isMeaningfulStaticPageValue(fallbackValue)) {
      result[key] = value;
    }
  }

  return result;
}

async function fetchStaticPageContentFromApi(
  slug: string,
  apiBase?: string
): Promise<StaticPageResponse | null> {
  for (const candidate of getStaticPageCandidates(slug)) {
    const data = await fetchWPAPI<StaticPageResponse>(
      `/sasanperfumes/v1/pages/${encodeURIComponent(candidate)}`,
      { tags: ["static-pages", `page-${candidate}`], revalidate: 300, apiBase }
    );

    if (data) {
      return data;
    }
  }

  return null;
}

function buildStaticPageSeoFallback(slug: string, locale?: Locale): PageSeoData {
  const canonical = normalizeStaticPageSlug(slug);
  const isAr = locale === "ar";

  const seoMap: Record<string, { title: BilingualField; description: BilingualField }> = {
    about: {
      title: bi("About Sasan Perfumes | 60+ Years of Fragrance Heritage", "حول ساسان للعطور | أكثر من 60 عاماً من الخبرة العطرية"),
      description: bi(
        "Discover Sasan Perfumes, a 60+ year fragrance house from the UAE blending tradition, modern elegance, and fast delivery across regional markets.",
        "اكتشف ساسان للعطور، بيت عطور إماراتي بخبرة تتجاوز 60 عاماً يجمع بين التراث والأناقة العصرية والتوصيل السريع عبر الأسواق الإقليمية."
      ),
    },
    contact: {
      title: bi("Contact Sasan Perfumes | Customer Care & Store Support", "تواصل مع ساسان للعطور | خدمة العملاء وفروع المتاجر"),
      description: bi(
        "Reach Sasan Perfumes for product guidance, order support, store locations, and wholesale inquiries across the UAE and GCC.",
        "تواصل مع ساسان للعطور للاستفسارات حول المنتجات ومتابعة الطلبات ومواقع المتاجر والاستفسارات التجارية في الإمارات والخليج."
      ),
    },
    privacy: {
      title: bi("Privacy Policy | Sasan Perfumes", "سياسة الخصوصية | ساسان للعطور"),
      description: bi(
        "Read how Sasan Perfumes collects, uses, and protects customer information across our websites and service channels.",
        "اطلع على كيفية جمع ساسان للعطور لبيانات العملاء واستخدامها وحمايتها عبر مواقعنا وقنوات الخدمة."
      ),
    },
    returns: {
      title: bi("Returns & Exchange Policy | Sasan Perfumes", "سياسة الإرجاع والاستبدال | ساسان للعطور"),
      description: bi(
        "Review the Sasan Perfumes return, exchange, cancellation, and quality support policy before placing your order.",
        "اطلع على سياسة الإرجاع والاستبدال والإلغاء ودعم الجودة لدى ساسان للعطور قبل إتمام طلبك."
      ),
    },
    faq: {
      title: bi("FAQ | Sasan Perfumes", "الأسئلة الشائعة | ساسان للعطور"),
      description: bi(
        "Answers to common questions about perfume orders, delivery, payment, returns, and store availability.",
        "إجابات سريعة حول طلبات العطور والتوصيل والدفع والاستبدال وتوفر المنتجات في المتاجر."
      ),
    },
    shipping: {
      title: bi("Shipping Information | Sasan Perfumes", "معلومات الشحن | ساسان للعطور"),
      description: bi(
        "Learn how Sasan Perfumes handles delivery timelines, destination coverage, and shipping support across the UAE and GCC.",
        "تعرف على مواعيد التوصيل وتغطية الوجهات ودعم الشحن لدى ساسان للعطور داخل الإمارات والخليج."
      ),
    },
    terms: {
      title: bi("Terms & Conditions | Sasan Perfumes", "الشروط والأحكام | ساسان للعطور"),
      description: bi(
        "Read the terms of use, purchasing rules, and customer responsibilities that apply when shopping with Sasan Perfumes.",
        "اطلع على شروط الاستخدام وقواعد الشراء ومسؤوليات العميل عند التسوق من ساسان للعطور."
      ),
    },
    "store-locator": {
      title: bi("Store Locator | Sasan Perfumes", "مواقع المتاجر | ساسان للعطور"),
      description: bi(
        "Find Sasan Perfumes store locations across Sharjah and Abu Dhabi, with directions and regional shopping support.",
        "اعثر على مواقع متاجر ساسان للعطور في الشارقة وأبوظبي مع إرشادات الوصول ودعم التسوق الإقليمي."
      ),
    },
    "track-order": {
      title: bi("Track Order | Sasan Perfumes", "تتبع الطلب | ساسان للعطور"),
      description: bi(
        "Check your order status quickly with your order number and checkout email, or contact our team for help.",
        "تحقق من حالة طلبك باستخدام رقم الطلب وبريد الشراء، أو تواصل مع فريقنا للمساعدة."
      ),
    },
  };

  const seo = seoMap[canonical] || {
    title: bi(`${siteConfig.name} | Premium UAE Fragrances`, `${siteConfig.name} | عطور إماراتية فاخرة`),
    description: bi(siteConfig.description, siteConfig.description),
  };

  const title = isAr ? seo.title.ar : seo.title.en;
  const description = isAr ? seo.description.ar : seo.description.en;

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: siteConfig.ogImage,
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: siteConfig.ogImage,
    canonical: `${siteConfig.url}/${canonical === "about" ? "about-us" : canonical === "contact" ? "contact-us" : canonical === "privacy" ? "privacy" : canonical === "returns" ? "returns" : canonical === "faq" ? "faq" : canonical === "shipping" ? "shipping" : canonical === "terms" ? "terms-and-conditions" : canonical === "store-locator" ? "store-listing" : canonical === "track-order" ? "track-order" : canonical}`,
    pageTitle: title,
    pageExcerpt: description,
    pageContent: null,
  };
}

function buildTrackOrderSyntheticPage(locale?: Locale): WPPage | null {
  const fallback = buildStaticPageFallbackContent("track-order");
  if (!fallback) {
    return null;
  }

  const seo = buildStaticPageSeoFallback("track-order", locale);
  const localizedTitle = pickLocale(fallback.title, locale || "en", "Track Order");
  const localizedSubtitle = pickLocale(fallback.subtitle, locale || "en", "");
  const sections = Array.isArray(fallback.sections) ? fallback.sections : [];

  const contentHtml = [
    '<div class="space-y-6">',
    localizedSubtitle ? `<p class="text-base leading-7 text-gray-700">${escapeHtml(localizedSubtitle)}</p>` : "",
    ...sections.map((section) => {
      const sectionTitle = pickLocale(section.title, locale || "en", "");
      const sectionContent = pickLocale(section.content, locale || "en", "");
      return [
        '<section class="rounded-2xl border border-[#e7ded7] bg-white p-6 shadow-sm">',
        sectionTitle ? `<h2 class="text-xl font-semibold text-brand-primary">${escapeHtml(sectionTitle)}</h2>` : "",
        sectionContent ? `<div class="mt-3 text-base leading-7 text-gray-700">${escapeHtml(sectionContent)}</div>` : "",
        "</section>",
      ].join("");
    }),
    "</div>",
  ].join("");

  const now = new Date().toISOString();
  return {
    id: 0,
    date: now,
    date_gmt: now,
    modified: now,
    modified_gmt: now,
    slug: "track-order",
    status: "publish",
    type: "page",
    link: seo.canonical || `${siteConfig.url}/track-order`,
    title: {
      rendered: localizedTitle || "Track Order",
    },
    content: {
      rendered: contentHtml,
      protected: false,
    },
    excerpt: {
      rendered: localizedSubtitle ? `<p>${escapeHtml(localizedSubtitle)}</p>` : "",
      protected: false,
    },
    featured_media: 0,
    parent: 0,
    menu_order: 0,
    template: "",
    meta: {},
    yoast_head_json: {
      title: seo.title || "Track Order",
      description: seo.description || "",
      canonical: seo.canonical || `${siteConfig.url}/track-order`,
      og_title: seo.ogTitle || seo.title || "Track Order",
      og_description: seo.ogDescription || seo.description || "",
      og_image: seo.ogImage ? [{ url: seo.ogImage }] : [],
      twitter_title: seo.twitterTitle || seo.title || "Track Order",
      twitter_description: seo.twitterDescription || seo.description || "",
      twitter_image: seo.twitterImage || seo.ogImage || "",
    },
  };
}

function buildStaticPageFallbackContent(slug: string): StaticPageResponse | null {
  const canonical = normalizeStaticPageSlug(slug);

  switch (canonical) {
    case "about":
      return {
        title: bi("Sasan Perfumes", "ساسان للعطور"),
        hero_title: bi(
          "SASAN Perfumes - Where Wisdom Meets Innovation in the Heart of Sharjah.",
          "ساسان للعطور - حيث يلتقي التراث بالابتكار في قلب الشارقة."
        ),
        hero_subtitle: bi("WHO WE ARE", "من نحن"),
        hero_description: bi(
          "Established in 1964 in the UAE, Sasan Perfumes began as a single outlet focused on fragrance imports and exports before expanding into oil fragrances, perfumes, body and hair mists, fragrance oils, dakhons, ouds, and air fresheners.",
          "تأسست ساسان للعطور عام 1964 في الإمارات كمحل واحد يركز على استيراد وتصدير العطور، ثم توسعت لتشمل العطور الزيتية والعطور والبودي ميست والهير ميست وزيوت العطور والدخون والعود ومعطرات الجو."
        ),
        stats_since: bi("Since 1964", "منذ 1964"),
        stats_location: bi("Sharjah, UAE", "الشارقة، الإمارات"),
        stats_handcrafted: bi("Refined craftsmanship", "حرفية متقنة"),
        stats_sustainable: bi("Global raw materials", "مواد خام عالمية"),
        main_title: bi("A fragrance house built on craft and consistency.", "بيت عطور يقوم على الحرفة والاتساق."),
        main_paragraph1: bi(
          "Our collection is designed to make fragrance discovery clear, elegant, and easy for every customer.",
          "صُممت مجموعتنا لتجعل اكتشاف العطور واضحاً وأنيقاً وسهلاً لكل عميل."
        ),
        main_paragraph2: bi(
          "We pair timeless Arabic sensibility with modern fragrance behavior, giving every scent a confident and memorable presence.",
          "نجمع بين الذوق العربي الأصيل وسلوك العطور العصري ليحمل كل عطر حضوراً واثقاً ولافتاً."
        ),
        main_paragraph3: bi(
          "From daily wear to gifting, every bottle is crafted to feel personal, polished, and reliable.",
          "من الاستخدام اليومي إلى الهدايا، يُصمم كل قارورة لتكون شخصية وراقية وموثوقة."
        ),
        uniqueness_title: bi("What makes us different", "ما يميزنا"),
        uniqueness_subtitle: bi(
          "Distinctive scents, thoughtful presentation, and a store experience that feels calm and refined.",
          "روائح مميزة وتقديم متقن وتجربة تسوق هادئة وراقية."
        ),
        uniqueness_content: bi(
          "We focus on perfumes that feel premium without becoming complicated, making it easy to find the right scent for the right moment.",
          "نركز على عطور فاخرة ولكن بسيطة في الاختيار لتجد العطر المناسب في اللحظة المناسبة."
        ),
        journey_title: bi("From idea to signature scent", "من الفكرة إلى العطر المميز"),
        journey_content: bi(
          "Every fragrance begins with a clear direction, then moves through careful formulation, testing, and presentation.",
          "يبدأ كل عطر بفكرة واضحة، ثم يمر بالتكوين الدقيق والاختبار والتقديم المتقن."
        ),
        mission_title: bi("Our mission", "مهمتنا"),
        mission_content: bi(
          "Make premium fragrance shopping simple, trustworthy, and enjoyable across every market we serve.",
          "نجعل شراء العطور الفاخرة بسيطاً وموثوقاً وممتعاً في كل سوق نخدمه."
        ),
        vision_title: bi("Our vision", "رؤيتنا"),
        vision_content: bi(
          "To be a fragrance brand remembered for heritage, service, and a collection customers return to again and again.",
          "أن نكون علامة عطور تُذكر بالتراث والخدمة والمجموعات التي يعود إليها العملاء مراراً وتكراراً."
        ),
        core_values_title: bi("Core values", "القيم الأساسية"),
        core_values_subtitle: bi("The standards behind every fragrance we present.", "المعايير التي تقف خلف كل عطر نقدمه."),
        about_core_values: [
          { title: bi("Quality first", "الجودة أولاً"), description: bi("We choose products and presentation with long-term value in mind.", "نختار المنتجات وطريقة التقديم بعينٍ على القيمة طويلة المدى.") },
          { title: bi("Clear service", "خدمة واضحة"), description: bi("We keep the buying journey easy to follow from browse to checkout.", "نجعل رحلة الشراء سهلة وواضحة من التصفح حتى الدفع.") },
          { title: bi("Regional relevance", "ملاءمة إقليمية"), description: bi("We shape our offering for customers in the UAE, GCC, and beyond.", "نصمم عروضنا لتناسب عملاء الإمارات والخليج وما بعده.") },
        ],
        ingredients_title: bi("Signature scent families", "عائلات العطور المميزة"),
        ingredients_subtitle: bi("Oud, amber, musk, florals, woods, and modern accords.", "العود والعنبر والمسك والزهور والأخشاب واللمسات العصرية."),
        ingredients_description: bi(
          "Our range balances traditional warmth with modern elegance, creating fragrances that feel rich, wearable, and memorable.",
          "توازن مجموعتنا بين الدفء التراثي والأناقة العصرية لتمنحك عطوراً غنية وسهلة الارتداء ولا تُنسى."
        ),
        about_ingredients: [
          { name: bi("Oud", "العود"), desc: bi("Deep and distinctive, with a confident regional presence.", "عميق ومميز بحضور إقليمي واضح.") },
          { name: bi("Amber", "العنبر"), desc: bi("Warm, smooth, and ideal for elegant evening wear.", "دافئ وناعم ومثالي للأناقة المسائية.") },
          { name: bi("Musk", "المسك"), desc: bi("Clean and lasting, perfect for everyday layering.", "نظيف وثابت ومناسب للتنسيق اليومي.") },
        ],
        cta_title: bi("Explore the collection.", "اكتشف المجموعة."),
        cta_subtitle: bi("Find your next fragrance or choose a gift set for someone special.", "اعثر على عطرك القادم أو اختر طقماً هدية لمن تحب."),
        cta_button: bi("Shop Now", "تسوق الآن"),
        cta_link: "/shop",
        faq_items: [
          { q: bi("When was Sasan Perfumes founded?", "متى تأسست ساسان للعطور؟"), a: bi("Sasan Perfumes was established in 1964 in the UAE.", "تأسست ساسان للعطور عام 1964 في الإمارات.") },
          { q: bi("What products do you offer?", "ما المنتجات التي تقدمونها؟"), a: bi("Perfumes, oud, hair and body mists, fragrance oils, dakhons, and gift sets.", "العطور والعود وبخاخات الشعر والجسم وزيوت العطور والدخون وأطقم الهدايا.") },
          { q: bi("Do you deliver across markets?", "هل التوصيل متاح عبر الأسواق؟"), a: bi("Yes. We support regional stores and international browsing with market-aware pricing.", "نعم، ندعم المتاجر الإقليمية والتصفح الدولي بأسعار مخصصة لكل سوق.") },
        ],
      };

    case "contact":
      return {
        title: bi("Contact Us", "تواصل معنا"),
        hero_title: bi("Contact Sasan Perfumes", "تواصل مع ساسان للعطور"),
        hero_subtitle: bi("We are here to help", "نحن هنا للمساعدة"),
        hero_description: bi(
          "Reach our team for product guidance, order updates, store locations, and wholesale inquiries.",
          "تواصل مع فريقنا للاستفسارات حول المنتجات ومتابعة الطلبات ومواقع المتاجر والاستفسارات التجارية."
        ),
        send_message: bi("Send us a Message", "أرسل لنا رسالة"),
        send_message_sub: bi(
          "Share your question and we will get back to you within one business day.",
          "أرسل سؤالك وسنعود إليك خلال يوم عمل واحد."
        ),
        quick_contact: bi("Quick Contact", "تواصل سريع"),
        whatsapp: bi("WhatsApp Support", "دعم واتساب"),
        call_us: bi("Call Us", "اتصل بنا"),
        email_us: bi("Email Us", "راسلنا"),
        contact_info: [
          {
            key: "address",
            title: bi("Address", "العنوان"),
            content: bi("Industrial Area 17 - Street 15, Warehouse 14, PO Box 177, Sharjah, UAE", "المنطقة الصناعية 17 - شارع 15، مستودع 14، ص.ب 177، الشارقة، الإمارات"),
          },
          {
            key: "hours",
            title: bi("Working Hours", "ساعات العمل"),
            content: bi("Usually within 24 hours on working days.", "عادة خلال 24 ساعة في أيام العمل."),
          },
          {
            key: "phone",
            title: bi("WhatsApp", "واتساب"),
            content: bi("0567394314", "0567394314"),
          },
          {
            key: "callPhone",
            title: bi("Complaints & Calls", "الشكاوى والمكالمات"),
            content: bi("0563982953", "0563982953"),
          },
          {
            key: "email",
            title: bi("Email", "البريد الإلكتروني"),
            content: bi("support@sasanperfumes.com", "support@sasanperfumes.com"),
          },
        ],
        trust_indicators: [
          { title: bi("Fast response", "استجابة سريعة"), description: bi("We reply during working hours with practical help.", "نرد خلال ساعات العمل بمساعدة عملية."), icon: "check" },
          { title: bi("Order support", "دعم الطلبات"), description: bi("Need help with checkout or shipping? We can guide you.", "تحتاج مساعدة في الدفع أو الشحن؟ يمكننا إرشادك."), icon: "lock" },
          { title: bi("Store guidance", "إرشادات المتاجر"), description: bi("We can point you to the closest regional store.", "يمكننا إرشادك إلى أقرب متجر إقليمي."), icon: "star" },
        ],
        cta_title: bi("Need a direct line to the right team?", "هل تحتاج إلى الوصول المباشر للفريق المناسب؟"),
        cta_subtitle: bi("We can help with product availability, regional stores, and business inquiries.", "يمكننا المساعدة في توفر المنتجات والمتاجر الإقليمية والاستفسارات التجارية."),
        cta_button: bi("Visit Private Labeling", "زيارة العلامة الخاصة"),
      };

    case "privacy":
      return {
        title: bi("Privacy Policy", "سياسة الخصوصية"),
        subtitle: bi(
          "How we collect, use, and protect your information.",
          "كيف نجمع معلوماتك ونستخدمها ونحميها."
        ),
        privacy_sections: [
          {
            title: bi("Who we are", "من نحن"),
            content: bi(
              "Sasan Perfumes is a fragrance retailer serving customers across the UAE and regional markets.",
              "ساسان للعطور هو متجر عطور يخدم العملاء في الإمارات والأسواق الإقليمية."
            ),
          },
          {
            title: bi("Information we collect", "المعلومات التي نجمعها"),
            content: bi(
              "We may collect the information you share when you place an order, contact us, or subscribe to updates. This can include your name, phone number, email address, shipping address, and order details.",
              "قد نجمع المعلومات التي تشاركها عند تقديم طلب أو التواصل معنا أو الاشتراك في التحديثات، مثل الاسم ورقم الهاتف والبريد الإلكتروني وعنوان الشحن وتفاصيل الطلب."
            ),
          },
          {
            title: bi("How we use your data", "كيف نستخدم بياناتك"),
            content: bi(
              "We use customer information to process orders, improve service, support delivery, and send relevant updates where permitted.",
              "نستخدم بيانات العملاء لمعالجة الطلبات وتحسين الخدمة ودعم التوصيل وإرسال التحديثات المناسبة عند السماح بذلك."
            ),
          },
          {
            title: bi("Your choices", "خياراتك"),
            content: bi(
              "You can contact us to update your information or ask about the data we hold about your account.",
              "يمكنك التواصل معنا لتحديث معلوماتك أو الاستفسار عن البيانات المرتبطة بحسابك."
            ),
          },
        ],
        privacy_faq_groups: [
          {
            group_title: bi("Privacy questions", "أسئلة الخصوصية"),
            faq_items: [
              { q: bi("Do you share my data?", "هل تشاركون بياناتي؟"), a: bi("Only with trusted service providers when needed to process orders, payments, and deliveries.", "فقط مع مزودي الخدمة الموثوقين عند الحاجة لمعالجة الطلبات والمدفوعات والتوصيل.") },
              { q: bi("Can I request an update?", "هل يمكنني طلب تحديث بياناتي؟"), a: bi("Yes. Contact us and we will help review and update your records where possible.", "نعم. تواصل معنا وسنساعد في مراجعة وتحديث بياناتك حيثما أمكن.") },
            ],
          },
        ],
        featured_links_title: bi("Helpful links", "روابط مفيدة"),
        featured_links_description: bi("Quick access to customer support pages and store information.", "وصول سريع إلى صفحات الدعم ومعلومات المتاجر."),
        featured_links: [
          { label: bi("Contact Us", "تواصل معنا"), url: "/contact-us" },
          { label: bi("Shipping Information", "معلومات الشحن"), url: "/shipping" },
          { label: bi("Returns & Exchange", "الإرجاع والاستبدال"), url: "/returns" },
        ],
      };

    case "returns":
      return {
        title: bi("Return & Exchange Policy", "سياسة الإرجاع والاستبدال"),
        subtitle: bi(
          "Your satisfaction matters. If something is not right, we will help.",
          "رضاك مهم لنا. إذا لم يكن كل شيء على ما يرام فسنسعد بالمساعدة."
        ),
        returns_features: [
          {
            title: bi("Condition check", "فحص الحالة"),
            desc: bi("Items should be unopened and in original condition whenever possible.", "يفضل أن تكون المنتجات غير مفتوحة وبحالتها الأصلية قدر الإمكان."),
          },
          {
            title: bi("Simple review", "مراجعة سهلة"),
            desc: bi("Send us your order details and we will review the request quickly.", "أرسل تفاصيل الطلب وسنراجع الطلب بسرعة."),
          },
          {
            title: bi("Support team", "فريق الدعم"),
            desc: bi("We will guide you through exchange or refund options according to policy.", "سنرشدك إلى خيارات الاستبدال أو الاسترداد وفقاً للسياسة."),
          },
        ],
        returns_steps: [
          { title: bi("Contact us", "تواصل معنا"), desc: bi("Share your order number and reason for return.", "أرسل رقم الطلب وسبب الإرجاع.") },
          { title: bi("Review", "المراجعة"), desc: bi("Our team checks eligibility and next steps.", "يقوم فريقنا بمراجعة الأهلية والخطوات التالية.") },
          { title: bi("Resolution", "النتيجة"), desc: bi("We confirm the approved exchange, refund, or store credit path.", "نؤكد طريقة الاستبدال أو الاسترداد أو الرصيد المعتمد.") },
        ],
        returns_eligible: [
          { text: bi("Incorrect or damaged item received", "استلام منتج خاطئ أو تالف") },
          { text: bi("Order reported within the eligible window", "تم الإبلاغ عن الطلب خلال المدة المسموح بها") },
          { text: bi("Product is unused and in original packaging", "المنتج غير مستخدم وفي غلافه الأصلي") },
        ],
        returns_not_eligible: [
          { text: bi("Opened fragrance products", "المنتجات العطرية المفتوحة") },
          { text: bi("Items without proof of purchase", "المنتجات دون إثبات شراء") },
          { text: bi("Customized or final-sale items", "المنتجات المخصصة أو النهائية") },
        ],
        need_help: bi("Need help?", "تحتاج مساعدة؟"),
        need_help_text: bi(
          "Our customer care team can confirm the return path for your order.",
          "يمكن لفريق خدمة العملاء تأكيد مسار الإرجاع المناسب لطلبك."
        ),
        process_title: bi("Return process", "خطوات الإرجاع"),
        returns_faq_groups: [
          {
            group_title: bi("Returns FAQ", "الأسئلة الشائعة للإرجاع"),
            faq_items: [
              { q: bi("Can I exchange a fragrance?", "هل يمكنني استبدال عطر؟"), a: bi("Yes, subject to product condition and policy review.", "نعم، وذلك وفق حالة المنتج ومراجعة السياسة.") },
              { q: bi("How do I start?", "كيف أبدأ؟"), a: bi("Contact us with your order details and our team will guide you.", "تواصل معنا مع تفاصيل الطلب وسنرشدك للخطوات.") },
            ],
          },
        ],
        featured_links_title: bi("Helpful links", "روابط مفيدة"),
        featured_links_description: bi("Customer support and policy pages in one place.", "صفحات الدعم والسياسات في مكان واحد."),
        featured_links: [
          { label: bi("Contact Us", "تواصل معنا"), url: "/contact-us" },
          { label: bi("FAQ", "الأسئلة الشائعة"), url: "/faq" },
          { label: bi("Shipping Information", "معلومات الشحن"), url: "/shipping" },
        ],
      };

    case "faq":
      return {
        title: bi("Frequently Asked Questions", "الأسئلة الشائعة"),
        subtitle: bi(
          "Answers to common questions about our products and services.",
          "إجابات على أكثر الأسئلة شيوعاً حول منتجاتنا وخدماتنا."
        ),
        faq_groups: [
          {
            group_title: bi("Ordering", "الطلبات"),
            faq_items: [
              { q: bi("How can I place an order?", "كيف يمكنني تقديم الطلب؟"), a: bi("Browse the catalog, add your items to cart, and complete checkout.", "تصفح الكتالوج وأضف المنتجات إلى السلة ثم أكمل الدفع.") },
              { q: bi("Do you offer gift sets?", "هل تقدمون أطقم هدايا؟"), a: bi("Yes. Gift sets are available across selected collections.", "نعم، تتوفر أطقم الهدايا عبر مجموعات مختارة.") },
            ],
          },
          {
            group_title: bi("Delivery", "التوصيل"),
            faq_items: [
              { q: bi("Which markets do you ship to?", "إلى أي أسواق تشحنون؟"), a: bi("We support the UAE, GCC markets, and selected international destinations.", "ندعم الإمارات وأسواق الخليج ووجهات دولية محددة.") },
              { q: bi("Can I track my order?", "هل يمكنني تتبع الطلب؟"), a: bi("Yes. Use the Track Order page or contact support for help.", "نعم. استخدم صفحة تتبع الطلب أو تواصل مع الدعم للمساعدة.") },
            ],
          },
        ],
        not_found: bi("Didn't find your answer?", "لم تجد الإجابة التي تبحث عنها؟"),
        not_found_text: bi("Contact us and we'll be happy to help.", "تواصل معنا وسنكون سعداء بالمساعدة."),
        featured_links_title: bi("Helpful links", "روابط مفيدة"),
        featured_links_description: bi("Find our most useful customer pages here.", "اعثر على صفحات العملاء الأكثر فائدة هنا."),
        featured_links: [
          { label: bi("Contact Us", "تواصل معنا"), url: "/contact-us" },
          { label: bi("Shipping Information", "معلومات الشحن"), url: "/shipping" },
          { label: bi("Returns & Exchange", "الإرجاع والاستبدال"), url: "/returns" },
        ],
      };

    case "shipping":
      return {
        title: bi("Shipping Information", "معلومات الشحن"),
        rates_title: bi("Shipping & delivery overview", "نظرة عامة على الشحن والتوصيل"),
        rates_note: bi(
          "Prices are shown in the market currency and delivery options vary by destination.",
          "تظهر الأسعار بعملة السوق وتختلف خيارات التوصيل حسب الوجهة."
        ),
        shipping_sections: [
          {
            title: bi("Regional delivery", "التوصيل الإقليمي"),
            content: bi(
              "We deliver across the UAE and selected GCC markets with market-specific checkout settings.",
              "نقوم بالتوصيل داخل الإمارات وبعض أسواق الخليج مع إعدادات دفع مخصصة لكل سوق."
            ),
          },
          {
            title: bi("Packaging", "التغليف"),
            content: bi(
              "Orders are packed carefully to protect fragrance bottles during transit.",
              "يتم تغليف الطلبات بعناية لحماية عبوات العطور أثناء الشحن."
            ),
          },
          {
            title: bi("Support", "الدعم"),
            content: bi(
              "If you need help with delivery, contact our team and we will review the status with you.",
              "إذا احتجت إلى مساعدة في التوصيل، تواصل مع فريقنا وسنراجع الحالة معك."
            ),
          },
        ],
        shipping_faq_groups: [
          {
            group_title: bi("Shipping FAQ", "الأسئلة الشائعة للشحن"),
            faq_items: [
              { q: bi("Do you offer fast delivery?", "هل توفرون توصيلاً سريعاً؟"), a: bi("Yes. Delivery speed depends on the destination and market settings.", "نعم، وتختلف سرعة التوصيل حسب الوجهة وإعدادات السوق.") },
              { q: bi("How do I check my shipping status?", "كيف أتحقق من حالة الشحن؟"), a: bi("Use the Track Order page or contact support for assistance.", "استخدم صفحة تتبع الطلب أو تواصل مع الدعم للمساعدة.") },
            ],
          },
        ],
        featured_links_title: bi("Helpful links", "روابط مفيدة"),
        featured_links_description: bi("Quick access to support and policy pages.", "وصول سريع إلى صفحات الدعم والسياسات."),
        featured_links: [
          { label: bi("Track Order", "تتبع الطلب"), url: "/track-order" },
          { label: bi("Contact Us", "تواصل معنا"), url: "/contact-us" },
        ],
      };

    case "terms":
      return {
        title: bi("Terms & Conditions", "الشروط والأحكام"),
        subtitle: bi(
          "Please read these terms before using the website or placing an order.",
          "يرجى قراءة هذه الشروط قبل استخدام الموقع أو تقديم الطلب."
        ),
        terms_sections: [
          {
            title: bi("General information", "معلومات عامة"),
            content: bi(
              "By using this website or placing an order, you agree to the terms that apply to your purchase and browsing experience.",
              "عند استخدام هذا الموقع أو تقديم طلب، فإنك توافق على الشروط المطبقة على عملية الشراء والتصفح."
            ),
          },
          {
            title: bi("Orders and payments", "الطلبات والمدفوعات"),
            content: bi(
              "We reserve the right to verify orders, adjust errors, and decline suspicious activity when necessary.",
              "نحتفظ بالحق في التحقق من الطلبات وتصحيح الأخطاء ورفض النشاط المشبوه عند الحاجة."
            ),
          },
          {
            title: bi("Product information", "معلومات المنتج"),
            content: bi(
              "We do our best to keep product descriptions accurate, but fragrance impressions can vary by skin and preference.",
              "نبذل قصارى جهدنا للحفاظ على دقة أوصاف المنتجات، لكن انطباع العطر قد يختلف حسب البشرة والتفضيل."
            ),
          },
        ],
        terms_faq_groups: [
          {
            group_title: bi("Terms FAQ", "الأسئلة الشائعة للشروط"),
            faq_items: [
              { q: bi("Can you cancel an order?", "هل يمكن إلغاء الطلب؟"), a: bi("Cancellation depends on the order status and processing stage.", "يعتمد الإلغاء على حالة الطلب ومرحلة المعالجة.") },
              { q: bi("Are all products final sale?", "هل جميع المنتجات نهائية البيع؟"), a: bi("Some fragrance items may be subject to hygiene and return restrictions.", "قد تخضع بعض منتجات العطور لقيود تتعلق بالنظافة والإرجاع.") },
            ],
          },
        ],
        featured_links_title: bi("Helpful links", "روابط مفيدة"),
        featured_links_description: bi("Policies and support pages for a smoother purchase journey.", "صفحات السياسات والدعم لرحلة شراء أسهل."),
        featured_links: [
          { label: bi("Privacy Policy", "سياسة الخصوصية"), url: "/privacy" },
          { label: bi("Returns & Exchange", "الإرجاع والاستبدال"), url: "/returns" },
          { label: bi("Contact Us", "تواصل معنا"), url: "/contact-us" },
        ],
      };

    case "store-locator":
      return {
        hero_title: bi("We Are Where You Are", "نحن حيث تكون"),
        hero_subtitle: bi("Store Locator", "مواقع المتاجر"),
        hero_description: bi(
          "Our commitment to quality and elegant presentation makes it easy to find Sasan Perfumes across the UAE.",
          "التزامنا بالجودة والأناقة يجعل العثور على ساسان للعطور في الإمارات أمراً سهلاً."
        ),
        opening_hours: bi("Usually within 24 hours on working days.", "عادة خلال 24 ساعة في أيام العمل."),
        cta_title: bi("Plan your visit.", "خطط لزيارتك."),
        cta_subtitle: bi("Choose a location, get directions, and explore the closest store to you.", "اختر الموقع واحصل على الاتجاهات واستكشف أقرب متجر إليك."),
        cta_button: bi("Shop Online", "تسوق عبر الموقع"),
        waitingTitle: bi("Our locations", "مواقعنا"),
        waitingSubtitle: bi("A small selection of stores and service points across the UAE.", "مجموعة مختارة من المتاجر ونقاط الخدمة عبر الإمارات."),
        stores: [
          {
            name: bi("Sasan Perfumes", "ساسان للعطور"),
            floor: bi("Muwaileh Commercial", "مويلح التجاري"),
            city: bi("Sharjah", "الشارقة"),
            region: "Sharjah",
            country: "uae",
            google_maps_url: "https://maps.google.com/?q=Muwaileh+Commercial+Sharjah",
            image: "",
          },
          {
            name: bi("Sasan Perfumes", "ساسان للعطور"),
            floor: bi("Central Souk", "السوق المركزي"),
            city: bi("Sharjah", "الشارقة"),
            region: "Sharjah",
            country: "uae",
            google_maps_url: "https://maps.app.goo.gl/HCcGXFRbtnT9RbPn8",
            image: "",
          },
          {
            name: bi("Sasan Perfumes", "ساسان للعطور"),
            floor: bi("Al Shuwaiheen", "الشويهين"),
            city: bi("Sharjah", "الشارقة"),
            region: "Sharjah",
            country: "uae",
            google_maps_url: "https://maps.app.goo.gl/rLeMnWnFuS6iV5EY9",
            image: "",
          },
          {
            name: bi("Sasan Perfumes", "ساسان للعطور"),
            floor: bi("Khalifa City - SE45", "مدينة خليفة - SE45"),
            city: bi("Abu Dhabi", "أبوظبي"),
            region: "Abu Dhabi",
            country: "uae",
            google_maps_url: "https://maps.app.goo.gl/aX511Vhm32PekwMD7",
            image: "",
          },
        ],
      };

    case "track-order":
      return {
        title: bi("Track Order", "تتبع الطلب"),
        subtitle: bi("Use your order number and checkout email to see the latest status.", "استخدم رقم الطلب وبريد الشراء لمعرفة الحالة الأخيرة."),
        sections: [
          {
            title: bi("How it works", "كيف يعمل"),
            content: bi(
              "Enter your order number and the email used at checkout, then contact our team if you need manual help.",
              "أدخل رقم الطلب والبريد المستخدم عند الدفع، ثم تواصل مع فريقنا إذا احتجت إلى مساعدة يدوية."
            ),
          },
        ],
      };

    default:
      return null;
  }
}

/**
 * Fetch static page content from /sasanperfumes/v1/pages/{slug}.
 * Returns null if API is unreachable — caller should fall back to dictionary.
 */
export async function getStaticPageContent(slug: string): Promise<StaticPageResponse | null> {
  const current = await fetchStaticPageContentFromApi(slug);
  const fallback = buildStaticPageFallbackContent(slug);
  const merged = mergeStaticPageContent(current, fallback);

  return merged ? rebrandApiContent(merged) : fallback;
}

/**
 * Helper: pick locale value from a bilingual field, fallback to dictionary value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pickLocale(field: StaticPageValue | undefined, locale: string, fallback: string): string {
  if (!field) return fallback;
  if (typeof field === "string") return field;
  if (typeof field === "number" || typeof field === "boolean") return String(field);
  if (Array.isArray(field)) return fallback;
  const val = locale === 'ar' ? field.ar : field.en;
  return val || fallback;
}

/**
 * Helper: map a bilingual repeater array to locale-specific items.
 * Each repeater item has fields like { title: {en,ar}, content: {en,ar} } or { title_en, title_ar }.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRepeater<T>(items: StaticPageValue | undefined, locale: string, mapper: (item: any, locale: string) => T): T[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  return items.map(item => mapper(item, locale));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFAQGroups(items: StaticPageValue | undefined, locale: string) {
  if (!items || !Array.isArray(items) || items.length === 0) return [];

  type FAQGroup = { title: string; items: Array<{ question: string; answer: string }> };
  const groups = new Map<string, FAQGroup>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items.forEach((group: any) => {
    const title =
      locale === "ar"
        ? group.group_title?.ar || group.group_title_ar || ""
        : group.group_title?.en || group.group_title_en || "";
    const key = title || "__default";
    const current: FAQGroup = groups.get(key) || { title, items: [] };

    const nestedItems = mapRepeater<{ question: string; answer: string }>(group.faq_items, locale, (item) => ({
      question: locale === "ar" ? item.q?.ar || item.q_ar || "" : item.q?.en || item.q_en || "",
      answer: locale === "ar" ? item.a?.ar || item.a_ar || "" : item.a?.en || item.a_en || "",
    })).filter((item) => item.question || item.answer);

    if (nestedItems.length > 0) {
      current.items.push(...nestedItems);
    } else {
      const question = locale === "ar" ? group.q?.ar || group.q_ar || "" : group.q?.en || group.q_en || "";
      const answer = locale === "ar" ? group.a?.ar || group.a_ar || "" : group.a?.en || group.a_en || "";
      if (question || answer) {
        current.items.push({ question, answer });
      }
    }

    if (current.items.length > 0) {
      groups.set(key, current);
    }
  });

  return Array.from(groups.values());
}

// ─── Product Meta Descriptions ────────────────────────────────────

interface ProductSeoResponse {
  seo_title: string;
  meta_description: string;
  keywords: string;
  og_image: string;
  source: "yoast" | "auto" | "none";
}

/**
 * Fetch dynamically generated SEO data for a product from the backend.
 * The backend prefers Yoast SEO fields when they exist and otherwise auto-generates
 * a market-agnostic SEO title, description, keywords, and OG image from product data.
 */
export async function getProductSeo(
  slug: string,
  locale?: Locale
): Promise<ProductSeoResponse | null> {
  const data = await fetchWPAPI<ProductSeoResponse>(
    `/sasanperfumes/v1/product-meta/${encodeURIComponent(slug)}`,
    {
      tags: ["products", `product-meta-${slug}`],
      locale,
      revalidate: 300,
    }
  );

  if (!data) {
    return null;
  }

  return {
    seo_title: decodeHtmlEntities(data.seo_title || ""),
    meta_description: decodeHtmlEntities(data.meta_description || ""),
    keywords: decodeHtmlEntities(data.keywords || ""),
    og_image: data.og_image || "",
    source: data.source,
  };
}

/**
 * Backward-compatible helper that returns only the product meta description.
 */
export async function getProductMetaDescription(
  slug: string,
  locale?: Locale
): Promise<string | null> {
  const data = await getProductSeo(slug, locale);
  if (!data || !data.meta_description) {
    return null;
  }

  return data.meta_description;
}

// ─── Notes SEO ────────────────────────────────────────────────────

interface NoteSeoResponse {
  name: BilingualField;
  title: BilingualField;
  description: BilingualField;
  attributeSlug?: string;
}

export async function getNoteSeo(slug: string): Promise<NoteSeoResponse | null> {
  return fetchWPAPI<NoteSeoResponse>(
    `/sasanperfumes/v1/notes-seo/${encodeURIComponent(slug)}`,
    { tags: ["notes-seo", `note-${slug}`], revalidate: 300 }
  );
}

// ─── Brands ───────────────────────────────────────────────────────

export interface BrandItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  count: number;
  image: string;
  logo: string;
  banner: string;
  aboutTitle: BilingualField;
  aboutContent: BilingualField;
  shortDesc: BilingualField;
  notes: { image: string; title: BilingualField; description: BilingualField }[];
  seo: { title: BilingualField; description: BilingualField };
}

interface BrandsPageSettings {
  title: BilingualField;
  subtitle: BilingualField;
  description: BilingualField;
  bannerImage: string;
  seo: { title: BilingualField; description: BilingualField };
}

export async function getBrands(): Promise<BrandItem[]> {
  const data = await fetchWPAPI<BrandItem[]>(
    `/sasanperfumes/v1/brands`,
    { tags: ["brands"], revalidate: 300 }
  );
  return rebrandApiContent(data ?? []);
}

export async function getBrand(slug: string): Promise<BrandItem | null> {
  const data = await fetchWPAPI<BrandItem>(
    `/sasanperfumes/v1/brands/${encodeURIComponent(slug)}`,
    { tags: ["brands", `brand-${slug}`], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

export async function getBrandsPageSettings(): Promise<BrandsPageSettings | null> {
  const data = await fetchWPAPI<BrandsPageSettings>(
    `/sasanperfumes/v1/brands-page`,
    { tags: ["brands-page"], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

// ─── Services ─────────────────────────────────────────────────────

export interface ServiceItem {
  id: number;
  slug: string;
  title: BilingualField;
  excerpt: BilingualField;
  content: BilingualField;
  image: string;
  bannerImage: string;
  icon: string;
  features: { image: string; title: BilingualField; description: BilingualField }[];
  seo: { title: BilingualField; description: BilingualField };
}

interface ServicesPageSettings {
  title: BilingualField;
  subtitle: BilingualField;
  description: BilingualField;
  bannerImage: string;
  ctaTitle: BilingualField;
  ctaButton: BilingualField;
  ctaLink: string;
  seo: { title: BilingualField; description: BilingualField };
}

export async function getServices(): Promise<ServiceItem[]> {
  const data = await fetchWPAPI<ServiceItem[]>(
    `/sasanperfumes/v1/services`,
    { tags: ["services"], revalidate: 300 }
  );
  return rebrandApiContent(data ?? []);
}

export async function getService(slug: string): Promise<ServiceItem | null> {
  const data = await fetchWPAPI<ServiceItem>(
    `/sasanperfumes/v1/services/${encodeURIComponent(slug)}`,
    { tags: ["services", `service-${slug}`], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

export async function getServicesPageSettings(): Promise<ServicesPageSettings | null> {
  const data = await fetchWPAPI<ServicesPageSettings>(
    `/sasanperfumes/v1/services-page`,
    { tags: ["services-page"], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

// ─── Blog (WordPress Posts) ───────────────────────────────────────

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  featuredImage: string;
  author: string;
  categories: { id: number; name: string; slug: string }[];
}

interface RawBlogPost {
  id?: number;
  slug?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  date?: string;
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string }[];
    author?: { name?: string }[];
    "wp:term"?: { id?: number; name?: string; slug?: string }[][];
  };
}

async function fetchBlogAPI(
  endpoint: string,
  market: string | undefined,
  frontendHost: string | undefined,
  tags: string[],
  apiBase?: string
): Promise<{ response: Response; raw: RawBlogPost[] } | null> {
  const urls = uniqueUrls(
    [`${(apiBase || WP_API_BASE)}${endpoint}`].map((url) =>
      frontendHost ? appendQueryParam(url, "frontend_host", frontendHost) : url
    )
  );
  const headers = market && frontendHost
    ? backendHeaders({ "X-Frontend-Host": frontendHost, "X-Market": market })
    : backendHeaders();
  const fetchOptions: RequestInit = {
    ...(disableRuntimeCache ? { cache: "no-store" } : { next: { revalidate: 300, tags } }),
    headers,
  };

  for (const apiUrl of urls) {
    const response = await fetchWPUrl(apiUrl, fetchOptions);
    if (!response.ok) {
      continue;
    }

    try {
      const raw = await response.json();
      if (Array.isArray(raw)) {
        return { response, raw: raw as RawBlogPost[] };
      }
      console.warn(`WordPress blog API returned non-array JSON (${apiUrl})`);
    } catch {
      console.warn(`WordPress blog API returned invalid JSON (${apiUrl})`);
    }
  }

  return null;
}

export async function getBlogPosts(
  page = 1,
  perPage = 12,
  frontendHost?: string
): Promise<{ posts: BlogPost[]; total: number; totalPages: number }> {
  const market = extractWPMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const url = `/wp/v2/posts?per_page=100&page=1&_embed=true`;
  const currentResult = await fetchBlogAPI(url, market, frontendHost, ["blog"], undefined);

  const mergedRaw = [
    ...(currentResult?.raw || []),
  ];
  const raw = Array.from(
    new Map(
      mergedRaw.map((post) => [
        post.slug || String(post.id || ""),
        post,
      ])
    ).values()
  );

  const posts: BlogPost[] = raw
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .map((p) => ({
    id: p.id || 0,
    slug: p.slug || "",
    title: p.title?.rendered || "",
    excerpt: p.excerpt?.rendered || "",
    content: p.content?.rendered || "",
    date: p.date || "",
    featuredImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "",
    author: p._embedded?.author?.[0]?.name || "",
    categories: (p._embedded?.["wp:term"]?.[0] || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => ({ id: c.id, name: c.name, slug: c.slug })
    ),
  }));

  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.max(0, (page - 1) * perPage);
  const paginated = posts.slice(start, start + perPage);

  return { posts: rebrandApiContent(paginated), total, totalPages };
}

export async function getBlogPost(slug: string, frontendHost?: string): Promise<BlogPost | null> {
  const market = extractWPMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const url = `/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=true`;
  const result = await fetchBlogAPI(url, market, frontendHost, ["blog", `blog-${slug}`]);
  if (!result) return null;

  const { raw } = result;
  if (!raw.length) return null;

  const p = raw[0];
  return rebrandApiContent({
    id: p.id || 0,
    slug: p.slug || "",
    title: p.title?.rendered || "",
    excerpt: p.excerpt?.rendered || "",
    content: p.content?.rendered || "",
    date: p.date || "",
    featuredImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "",
    author: p._embedded?.author?.[0]?.name || "",
    categories: (p._embedded?.["wp:term"]?.[0] || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => ({ id: c.id, name: c.name, slug: c.slug })
    ),
  });
}

// ─── Feature Toggles ───
export interface FeatureToggles {
  sasanperfumes_shop_enabled: boolean;
  sasanperfumes_about_enabled: boolean;
  sasanperfumes_contact_enabled: boolean;
  sasanperfumes_shipping_enabled: boolean;
  sasanperfumes_returns_enabled: boolean;
  sasanperfumes_privacy_enabled: boolean;
  sasanperfumes_terms_enabled: boolean;
  sasanperfumes_reviews_enabled: boolean;
  sasanperfumes_brands_page_enabled: boolean;
  sasanperfumes_services_page_enabled: boolean;
  sasanperfumes_what_we_do_enabled: boolean;
  sasanperfumes_blog_enabled: boolean;
  sasanperfumes_store_locator_enabled: boolean;
  sasanperfumes_faq_enabled: boolean;
  sasanperfumes_private_labeling_enabled: boolean;
  sasanperfumes_home_services_enabled: boolean;
  sasanperfumes_home_blog_enabled: boolean;
  sasanperfumes_home_notes_enabled: boolean;
  sasanperfumes_size_guide_enabled: boolean;
  sasanperfumes_loyalty_enabled: boolean;
  sasanperfumes_scent_guide_enabled: boolean;
  sasanperfumes_brands_slider_enabled: boolean;
  sasanperfumes_popup_enabled: boolean;
  sasanperfumes_ab_popup_enabled: boolean;
  sasanperfumes_chat_enabled: boolean;
  sasanperfumes_whatsapp_enabled: boolean;
  sasanperfumes_hero_enabled: boolean;
  sasanperfumes_categories_enabled: boolean;
  sasanperfumes_collections_enabled: boolean;
  sasanperfumes_banners_enabled: boolean;
  sasanperfumes_topbar_enabled: boolean;
  sasanperfumes_home_wcus_enabled: boolean;
  sasanperfumes_home_story_enabled: boolean;
  sasanperfumes_home_faq_enabled: boolean;
  sasanperfumes_home_seo_enabled: boolean;
  [key: string]: boolean;
}

const defaultFeatureToggles: FeatureToggles = {
  sasanperfumes_shop_enabled: true,
  sasanperfumes_about_enabled: true,
  sasanperfumes_contact_enabled: true,
  sasanperfumes_shipping_enabled: true,
  sasanperfumes_returns_enabled: true,
  sasanperfumes_privacy_enabled: true,
  sasanperfumes_terms_enabled: true,
  sasanperfumes_reviews_enabled: true,
  sasanperfumes_brands_page_enabled: true,
  sasanperfumes_services_page_enabled: true,
  sasanperfumes_what_we_do_enabled: true,
  sasanperfumes_blog_enabled: true,
  sasanperfumes_store_locator_enabled: true,
  sasanperfumes_faq_enabled: true,
  sasanperfumes_private_labeling_enabled: true,
  sasanperfumes_home_services_enabled: true,
  sasanperfumes_home_blog_enabled: false,
  sasanperfumes_home_notes_enabled: true,
  sasanperfumes_size_guide_enabled: false,
  sasanperfumes_loyalty_enabled: false,
  sasanperfumes_scent_guide_enabled: true,
  sasanperfumes_brands_slider_enabled: true,
  sasanperfumes_popup_enabled: false,
  sasanperfumes_ab_popup_enabled: false,
  sasanperfumes_chat_enabled: false,
  sasanperfumes_whatsapp_enabled: true,
  sasanperfumes_hero_enabled: true,
  sasanperfumes_categories_enabled: true,
  sasanperfumes_collections_enabled: true,
  sasanperfumes_banners_enabled: true,
  sasanperfumes_topbar_enabled: true,
  sasanperfumes_home_wcus_enabled: true,
  sasanperfumes_home_story_enabled: true,
  sasanperfumes_home_faq_enabled: true,
  sasanperfumes_home_seo_enabled: true,
};

const forcedVisibleSectionToggles = new Set([
  "sasanperfumes_shop_enabled",
  "sasanperfumes_about_enabled",
  "sasanperfumes_contact_enabled",
  "sasanperfumes_shipping_enabled",
  "sasanperfumes_returns_enabled",
  "sasanperfumes_privacy_enabled",
  "sasanperfumes_terms_enabled",
  "sasanperfumes_reviews_enabled",
  "sasanperfumes_brands_page_enabled",
  "sasanperfumes_services_page_enabled",
  "sasanperfumes_what_we_do_enabled",
  "sasanperfumes_store_locator_enabled",
  "sasanperfumes_faq_enabled",
  "sasanperfumes_private_labeling_enabled",
  "sasanperfumes_home_services_enabled",
  "sasanperfumes_home_notes_enabled",
  "sasanperfumes_scent_guide_enabled",
  "sasanperfumes_brands_slider_enabled",
  "sasanperfumes_hero_enabled",
  "sasanperfumes_categories_enabled",
  "sasanperfumes_collections_enabled",
  "sasanperfumes_banners_enabled",
  "sasanperfumes_topbar_enabled",
  "sasanperfumes_home_wcus_enabled",
  "sasanperfumes_home_story_enabled",
  "sasanperfumes_home_faq_enabled",
  "sasanperfumes_home_seo_enabled",
]);

function parseBooleanLike(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }

  return fallback;
}

function normalizeFeatureToggles(data?: Partial<FeatureToggles> | Record<string, unknown> | null): FeatureToggles {
  const normalizedData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data || {})) {
    const normalizedKey = key.startsWith("anbar_")
      ? `sasanperfumes_${key.slice("anbar_".length)}`
      : key;
    normalizedData[normalizedKey] = value;
  }

  const merged = { ...defaultFeatureToggles, ...normalizedData } as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [
      key,
      forcedVisibleSectionToggles.has(key)
        ? true
        : parseBooleanLike(value, defaultFeatureToggles[key as keyof FeatureToggles] ?? false),
    ])
  ) as FeatureToggles;
}

export async function getFeatureToggles(frontendHost?: string): Promise<FeatureToggles> {
  const data = await fetchWPAPI<Partial<FeatureToggles> | Record<string, unknown>>("/sasanperfumes/v1/feature-toggles", {
    tags: ["feature-toggles"],
    frontendHost,
    noCache: true,
  });
  return normalizeFeatureToggles(data);
}

// ─── Private Labeling ───
interface BilingualField {
  en: string;
  ar: string;
}

interface BilingualList {
  en: string[];
  ar: string[];
}

interface PLRepeaterItem {
  image: string;
  title: BilingualField;
  description: BilingualField;
}

export interface PrivateLabelingData {
  hero: {
    title: BilingualField;
    subtitle: BilingualField;
    description: BilingualField;
    image: string;
    ctaText: BilingualField;
    ctaLink: string;
  };
  intro: {
    heading: BilingualField;
    description: BilingualField;
    image: string;
  };
  whatIs: {
    title: BilingualField;
    description: BilingualField;
    image: string;
  };
  sectionTitles?: {
    whyChoose: BilingualField;
    process: BilingualField;
    products: BilingualField;
    benefits: BilingualField;
  };
  whyChoose: PLRepeaterItem[];
  process: PLRepeaterItem[];
  products: PLRepeaterItem[];
  benefits: PLRepeaterItem[];
  cta: {
    title: BilingualField;
    description: BilingualField;
    buttonText: BilingualField;
    buttonLink: string;
  };
  form?: {
    title: BilingualField;
    description: BilingualField;
    fullNameLabel: BilingualField;
    emailLabel: BilingualField;
    phoneLabel: BilingualField;
    serviceLabel: BilingualField;
    messageLabel: BilingualField;
    submitLabel: BilingualField;
    sendingLabel: BilingualField;
    successTitle: BilingualField;
    successMessage: BilingualField;
    selectServiceLabel: BilingualField;
    consentLabel: BilingualField;
    errorMessage: BilingualField;
    networkErrorMessage: BilingualField;
    services: BilingualList;
  };
  seo: {
    title: BilingualField;
    description: BilingualField;
  };
}

export async function getPrivateLabelingData(): Promise<PrivateLabelingData | null> {
  return fetchWPAPI<PrivateLabelingData>("/sasanperfumes/v1/private-labeling", {
    tags: ["private-labeling"],
    revalidate: 300,
  });
}

// ─── WhatsApp Settings ───
export interface WhatsAppSettings {
  enabled: boolean;
  number: string;
  message: BilingualField;
  showDesktop: boolean;
  showMobile: boolean;
  position: "bottom-left" | "bottom-right";
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings | null> {
  return fetchWPAPI<WhatsAppSettings>("/sasanperfumes/v1/whatsapp", {
    tags: ["whatsapp-settings"],
    revalidate: 600,
  });
}

// â”€â”€â”€ Brands Slider â”€â”€â”€

export interface BrandsSliderData {
  enabled: boolean;
  heading: { en: string; ar: string };
  subtitle?: { en: string; ar: string };
  slider_options?: {
    desktop_count: number;
    tablet_count: number;
    mobile_count: number;
    autoplay: boolean;
    autoplay_speed: number;
    loop: boolean;
    arrows: boolean;
    dots: boolean;
  };
  brands: Array<{
    name: string;
    image: string;
    url: string;
  }>;
}

export async function getBrandsSliderData(locale?: Locale): Promise<BrandsSliderData | null> {
  const data = await fetchWPAPI<BrandsSliderData>(
    "/sasanperfumes/v1/brands-slider",
    {
      locale,
      tags: ["brands-slider"],
      revalidate: 600,
    }
  );

  return rebrandApiContent(data ?? null);
}

/* ── Discount Rules ── */

const DISCOUNT_RULE_ENDPOINTS = [
  "/sasanperfumes/v1/discount-rules",
  "/shapehive/v1/discount-rules",
];

export async function getDiscountRules(frontendHost?: string): Promise<DiscountRule[]> {
  const uniqueEndpoints = new Set(DISCOUNT_RULE_ENDPOINTS);
  let rules: DiscountRule[] | null = null;

  for (const endpoint of uniqueEndpoints) {
    try {
      const data = await fetchWPAPI<DiscountRule[]>(endpoint, {
        noCache: true,
        frontendHost,
      });
      if (Array.isArray(data)) {
        rules = data;
        break;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[wordpress.getDiscountRules] endpoint failed`, endpoint, error);
      }
    }
  }

  if (!rules) return [];
  if (!rules || !Array.isArray(rules)) return [];

  return getActiveDiscountRules(rules);
}

