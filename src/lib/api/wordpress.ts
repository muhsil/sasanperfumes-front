import { disableRuntimeCache, siteConfig, type Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";
import { translateToArabic } from "@/config/menu";
import { getActiveDiscountRules } from "@/lib/discountRules";
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

  return replaced;
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
  const { revalidate = 300, tags, locale, noCache = false, frontendHost } = options;
  const market = extractWPMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const cmsFrontendHost = cmsFrontendHostForMarket(market, frontendHost);
  const urls = uniqueUrls(
    buildWPAPIUrls(endpoint, locale, WP_API_BASE).map((url) =>
      cmsFrontendHost ? appendQueryParam(url, "frontend_host", cmsFrontendHost) : url
    )
  );

  const apiHeaders = market && cmsFrontendHost
    ? backendHeaders({ "X-Frontend-Host": cmsFrontendHost, "X-Market": market })
    : backendHeaders(WP_API_HEADERS);

  try {
      const shouldBypassCache = disableRuntimeCache || noCache || CMS_FORCE_DYNAMIC_CACHE || isCmsContentEndpoint(endpoint);
      const fetchOptions: RequestInit = shouldBypassCache
        ? { headers: apiHeaders, cache: "no-store" }
        : {
          headers: apiHeaders,
          next: {
            revalidate,
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
  const siteTagline = sanitizeLegacyDescription(rawSiteTagline, siteConfig.description);

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

  return menu;
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
  const dd = (val: string | undefined) => val ? sanitizeLegacyDescription(val, siteConfig.description) : siteConfig.description;

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

  const data = await fetchWPAPI<WPPage[]>(
    `/wp/v2/pages?slug=${encodeURIComponent(slug)}&_embed`,
    {
      tags: ["pages", `page-${slug}`],
      locale,
      revalidate: 300, // Cache for 5 minutes for better performance
    }
  );

  // WordPress returns an array, get the first matching page
  if (data && data.length > 0) {
    return data[0];
  }

  return null;
}

// Fetch all published WordPress pages
export async function getPages(locale?: Locale): Promise<WPPage[]> {
  const data = await fetchWPAPI<WPPage[]>(
    "/wp/v2/pages?per_page=100&status=publish&_embed",
    {
      tags: ["pages"],
      locale,
      revalidate: 300, // Cache for 5 minutes
    }
  );

  if (!data) {
    return [];
  }

  // Filter out functional pages
  return data.filter((page) => !isFunctionalPageSlug(page.slug));
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
  const data = await fetchWPAPI<WPPage[]>(
    `/wp/v2/pages?slug=${encodeURIComponent(slug)}&_embed`,
    {
      tags: ["pages", "page-seo", `page-${slug}`, `page-seo-${slug}`],
      locale,
      revalidate: 300,
    }
  );

  if (!data || data.length === 0) {
    return null;
  }

  const page = data[0];
  const yoast = page.yoast_head_json;

  return {
    title: yoast?.title ? decodeHtmlEntities(yoast.title) : null,
    description: yoast?.description || null,
    ogTitle: yoast?.og_title ? decodeHtmlEntities(yoast.og_title) : null,
    ogDescription: yoast?.og_description || null,
    ogImage: yoast?.og_image?.[0]?.url || null,
    twitterTitle: yoast?.twitter_title ? decodeHtmlEntities(yoast.twitter_title) : null,
    twitterDescription: yoast?.twitter_description || null,
    twitterImage: yoast?.twitter_image || null,
    canonical: yoast?.canonical || null,
    pageTitle: page.title.rendered ? stripHtmlTags(page.title.rendered) : null,
    pageExcerpt: page.excerpt.rendered ? stripHtmlTags(page.excerpt.rendered) : null,
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
type StaticPageResponse = Record<string, BilingualField | any[]>;

/**
 * Fetch static page content from /sasanperfumes/v1/pages/{slug}.
 * Returns null if API is unreachable — caller should fall back to dictionary.
 */
export async function getStaticPageContent(slug: string): Promise<StaticPageResponse | null> {
  const data = await fetchWPAPI<StaticPageResponse>(
    `/sasanperfumes/v1/pages/${encodeURIComponent(slug)}`,
    { tags: ["static-pages", `page-${slug}`], revalidate: 300 }
  );
  return data ? rebrandApiContent(data) : null;
}

/**
 * Helper: pick locale value from a bilingual field, fallback to dictionary value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pickLocale(field: BilingualField | any[] | undefined, locale: string, fallback: string): string {
  if (!field || Array.isArray(field)) return fallback;
  const val = locale === 'ar' ? field.ar : field.en;
  return val || fallback;
}

/**
 * Helper: map a bilingual repeater array to locale-specific items.
 * Each repeater item has fields like { title: {en,ar}, content: {en,ar} } or { title_en, title_ar }.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRepeater<T>(items: BilingualField | any[] | undefined, locale: string, mapper: (item: any, locale: string) => T): T[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  return items.map(item => mapper(item, locale));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFAQGroups(items: BilingualField | any[] | undefined, locale: string) {
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

interface ProductMetaResponse {
  meta_description: string;
  source: "yoast" | "auto" | "none";
}

/**
 * Fetch dynamically generated meta description for a product from the backend.
 * The backend auto-generates 150-160 char descriptions from product data
 * (name, short_description, category, olfactory family, notes, price).
 * If a Yoast SEO meta description has been manually set, it takes priority.
 */
export async function getProductMetaDescription(
  slug: string,
  locale?: Locale
): Promise<string | null> {
  const data = await fetchWPAPI<ProductMetaResponse>(
    `/sasanperfumes/v1/product-meta/${encodeURIComponent(slug)}`,
    {
      tags: ["products", `product-meta-${slug}`],
      locale,
      revalidate: 300,
    }
  );

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
  tags: string[]
): Promise<{ response: Response; raw: RawBlogPost[] } | null> {
  const urls = uniqueUrls(
    [`${WP_API_BASE}${endpoint}`].map((url) =>
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
  const url = `/wp/v2/posts?per_page=${perPage}&page=${page}&_embed=true`;
  const market = extractWPMarketFromHost(frontendHost) || await detectMarketFromRequest();
  const result = await fetchBlogAPI(url, market, frontendHost, ["blog"]);
  if (!result) return { posts: [], total: 0, totalPages: 0 };

  const { response, raw } = result;
  const total = parseInt(response.headers.get("x-wp-total") || "0", 10);
  const totalPages = parseInt(response.headers.get("x-wp-totalpages") || "0", 10);

  const posts: BlogPost[] = raw.map((p) => ({
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

  return { posts: rebrandApiContent(posts), total, totalPages };
}

export async function getBlogPost(slug: string, frontendHost?: string): Promise<BlogPost | null> {
  const url = `/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=true`;
  const market = extractWPMarketFromHost(frontendHost) || await detectMarketFromRequest();
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

