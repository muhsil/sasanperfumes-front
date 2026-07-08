import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Base64 encoded blur placeholder for images.
 * Used as a loading state before the actual image loads.
 */
export const BLUR_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAAAEUlEQVR4nGN4+vAWHsQwXKUBwlPSAflguX8AAAAASUVORK5CYII=";

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  KW: "Asia/Kuwait",
  BH: "Asia/Bahrain",
  QA: "Asia/Qatar",
  OM: "Asia/Muscat",
  JO: "Asia/Amman",
  EG: "Africa/Cairo",
  LB: "Asia/Beirut",
  IQ: "Asia/Baghdad",
  YE: "Asia/Aden",
  SY: "Asia/Damascus",
  PS: "Asia/Hebron",
  LY: "Africa/Tripoli",
  SD: "Africa/Khartoum",
  TN: "Africa/Tunis",
  DZ: "Africa/Algiers",
  MA: "Africa/Casablanca",
  IN: "Asia/Kolkata",
  PK: "Asia/Karachi",
  US: "America/New_York",
  GB: "Europe/London",
};

export function getCountryTimezone(countryCode: string): string | undefined {
  return COUNTRY_TIMEZONE_MAP[countryCode?.toUpperCase()];
}

export function formatDate(date: string, locale: string = "en", country?: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  if (country) {
    const tz = getCountryTimezone(country);
    if (tz) options.timeZone = tz;
  }
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", options).format(new Date(date));
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MARKET_PATH_SEGMENTS = new Set(["qa", "om", "sa"]);
const LOCALE_PATH_SEGMENTS = new Set(["en", "ar"]);

function splitPathAndSuffix(pathname: string): { segments: string[]; suffix: string } {
  const value = pathname || "/";
  const hashIndex = value.indexOf("#");
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutHash.indexOf("?");
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  return {
    segments: path.split("/").filter(Boolean),
    suffix: `${query}${hash}`,
  };
}

function joinPathSegments(segments: string[], suffix = ""): string {
  return `/${segments.filter(Boolean).join("/")}${suffix}`;
}

function isMarketSegment(segment?: string): boolean {
  return MARKET_PATH_SEGMENTS.has(segment?.toLowerCase() || "");
}

function isLocaleSegment(segment?: string): segment is "en" | "ar" {
  return LOCALE_PATH_SEGMENTS.has(segment?.toLowerCase() || "");
}

function normalizeLocale(locale: string): "en" | "ar" {
  return locale === "ar" ? "ar" : "en";
}

export function getMarketPrefixFromPath(pathname: string): string {
  const { segments } = splitPathAndSuffix(pathname);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();

  if (isMarketSegment(first)) return `/${first}`;
  if (isLocaleSegment(first) && isMarketSegment(second)) return `/${second}`;

  return "";
}

export function getLocaleFromPath(pathname: string): "en" | "ar" {
  const { segments } = splitPathAndSuffix(pathname);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();

  if (isMarketSegment(first) && isLocaleSegment(second)) return normalizeLocale(second);
  if (isLocaleSegment(first)) return normalizeLocale(first);

  return "en";
}

export function getPathWithoutLocale(pathname: string): string {
  const { segments, suffix } = splitPathAndSuffix(pathname);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();
  const third = segments[2]?.toLowerCase();

  if (isLocaleSegment(first) && isMarketSegment(second)) {
    const rest = isLocaleSegment(third) ? segments.slice(3) : segments.slice(2);
    return joinPathSegments([second, ...rest], suffix);
  }

  if (first === "undefined") {
    const rest = isLocaleSegment(second) ? segments.slice(2) : segments.slice(1);
    return joinPathSegments(rest, suffix);
  }

  if (isMarketSegment(first) && isLocaleSegment(second)) {
    return joinPathSegments([first, ...segments.slice(2)], suffix);
  }

  if (isLocaleSegment(first)) {
    return joinPathSegments(segments.slice(1), suffix);
  }

  return joinPathSegments(segments, suffix);
}

export function getLocalizedPath(pathname: string, locale: string): string {
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const { segments, suffix } = splitPathAndSuffix(pathWithoutLocale);
  const first = segments[0]?.toLowerCase();
  const normalizedLocale = normalizeLocale(locale);

  if (isMarketSegment(first)) {
    return joinPathSegments([first, normalizedLocale, ...segments.slice(1)], suffix);
  }

  return joinPathSegments([normalizedLocale, ...segments], suffix);
}

export function getLocalizedMarketPath(pathname: string, locale: string, marketPrefix = ""): string {
  const normalizedMarket = marketPrefix.replace(/^\/+/, "").toLowerCase();
  if (!isMarketSegment(normalizedMarket)) {
    return getLocalizedPath(pathname, locale);
  }

  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const { segments, suffix } = splitPathAndSuffix(pathWithoutLocale);
  const first = segments[0]?.toLowerCase();
  const rest = isMarketSegment(first) ? segments.slice(1) : segments;

  return getLocalizedPath(joinPathSegments([normalizedMarket, ...rest], suffix), locale);
}

export function repairMojibakeText(text: string): string {
  if (!text) return text;

  // If the text already contains Arabic script, leave it alone.
  if (/[\u0600-\u06ff]/.test(text)) {
    return text;
  }

  // Only attempt repair when we see common UTF-8 mojibake markers.
  if (!/[ÃÂØÙÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ]/.test(text)) {
    return text;
  }

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    if (repaired && repaired !== text) {
      const hasArabic = /[\u0600-\u06ff]/.test(repaired);
      const stillLooksBroken = /[ÃÂØÙÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ]/.test(repaired);

      if (hasArabic || !stillLooksBroken) {
        return repaired;
      }
    }
  } catch {
    // Fall back to the original text below.
  }

  return text;
}

export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#039;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  
  // Strip backslash-escaped entities (e.g. \&#39; → &#39;) before decoding
  // Also strip PHP addslashes() backslashes before quotes/apostrophes (e.g. \\\' → ')
  const cleaned = text
    .replace(/\\(&#?\w+;)/g, "$1")
    .replace(/\\+(?=['"])/g, "");
  
  return repairMojibakeText(cleaned)
    .replace(/&(?:amp|lt|gt|quot|#0?39|apos|nbsp);/g, (match) => entities[match] || match)
    .replace(/&#(\d+);/g, (_, code) => { const n = Number(code); return n >= 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : `&#${code};`; })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => { const n = parseInt(hex, 16); return n >= 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : `&#x${hex};`; });
}

export function formatProductDisplayName(name: string): string {
  const decoded = decodeHtmlEntities(name).trim();
  const letters = decoded.match(/[A-Za-z]/g);

  if (!letters) return decoded;

  const alpha = letters.join("");
  if (alpha !== alpha.toUpperCase()) return decoded;

  return decoded.toLowerCase().replace(/\b([a-z])([a-z']*)/g, (_, first: string, rest: string) => {
    return `${first.toUpperCase()}${rest}`;
  });
}

/**
 * Extracts the product slug from a WooCommerce permalink URL.
 * The permalink typically contains the English slug regardless of the current locale.
 * Example: "https://example.com/product/white-bouquet/" -> "white-bouquet"
 * 
 * @param permalink - The full permalink URL from WooCommerce
 * @param fallbackSlug - The slug to return if extraction fails
 * @returns The extracted slug or the fallback slug
 */
export function getProductSlugFromPermalink(permalink: string, fallbackSlug: string): string {
  if (!permalink) return stripArSuffix(fallbackSlug);
  
  try {
    // Remove trailing slash and get the last path segment
    const url = new URL(permalink);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // The product slug is typically the last segment after "product"
    // e.g., /product/white-bouquet/ or /ar/product/white-bouquet/
    const productIndex = pathSegments.indexOf('product');
    if (productIndex !== -1 && productIndex < pathSegments.length - 1) {
      return stripArSuffix(pathSegments[productIndex + 1]);
    }
    
    // Fallback: return the last segment if "product" not found
    if (pathSegments.length > 0) {
      return stripArSuffix(pathSegments[pathSegments.length - 1]);
    }
  } catch {
    // If URL parsing fails, return the fallback
  }
  
  return stripArSuffix(fallbackSlug);
}

function stripArSuffix(slug: string): string {
  return slug.endsWith("-ar") ? slug.slice(0, -3) : slug;
}

/**
 * Extracts the category slug from a WooCommerce category permalink URL.
 * The permalink contains the localized slug based on the current language.
 * Example: "https://example.com/product-category/fragrance-oils/" -> "fragrance-oils"
 * Example: "https://example.com/ar/product-category/زيوت-عطرية/" -> "زيوت-عطرية"
 * 
 * @param link - The full category link URL from WooCommerce
 * @param fallbackSlug - The slug to return if extraction fails
 * @returns The extracted slug or the fallback slug
 */
export function getCategorySlugFromLink(link: string, fallbackSlug: string): string {
  if (!link) return fallbackSlug;
  
  try {
    // Remove trailing slash and get the last path segment
    const url = new URL(link);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // The category slug is typically the last segment after "product-category"
    // e.g., /product-category/fragrance-oils/ or /ar/product-category/زيوت-عطرية/
    const categoryIndex = pathSegments.indexOf('product-category');
    if (categoryIndex !== -1 && categoryIndex < pathSegments.length - 1) {
      return decodeURIComponent(pathSegments[categoryIndex + 1]);
    }
    
    // Fallback: return the last segment if "product-category" not found
    if (pathSegments.length > 0) {
      return decodeURIComponent(pathSegments[pathSegments.length - 1]);
    }
  } catch {
    // If URL parsing fails, return the fallback
  }
  
  return fallbackSlug;
}
