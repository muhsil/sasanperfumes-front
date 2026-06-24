/**
 * Static Menu Configuration
 *
 * This file contains the static menu data for the site.
 * Update this file to change navigation items and mega menu categories.
 *
 * The menu supports both English (en) and Arabic (ar) locales.
 */

import { siteConfig, type Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";

/**
 * Navigation Item Type
 */
export interface NavigationItem {
  name: {
    en: string;
    ar: string;
  };
  href: string;
  /** If true, this item triggers the mega menu on hover (desktop) */
  hasMegaMenu?: boolean;
}

/**
 * Live-site style navigation items used as the fallback menu.
 * The href should NOT include the locale prefix - it will be added automatically.
 */
export const navigationItems: NavigationItem[] = [
  {
    name: { en: "Perfumes", ar: "العطور" },
    href: "/category/perfumes",
    hasMegaMenu: true,
  },
  {
    name: { en: "All Over Spray", ar: "بخاخ الجسم" },
    href: "/category/all-over-spray",
  },
  {
    name: { en: "Hair Mist", ar: "معطر الشعر" },
    href: "/category/sasan-hair-mist",
  },
  {
    name: { en: "Oud Perfumes", ar: "عطور العود" },
    href: "/category/oud-perfumes",
  },
  {
    name: { en: "Gift Set", ar: "مجموعات الهدايا" },
    href: "/category/gift-set",
  },
];

/**
 * Static Header Category Links
 *
 * Category links displayed in the header navigation.
 * Order: Perfumes, All Over Spray, Hair Mist, Oud Perfumes, Gift Set
 */
export const headerCategoryLinks: NavigationItem[] = navigationItems;

type MenuItemLike = {
  title: string;
  url: string;
};

function getLiveHeaderMenuKey(item: MenuItemLike): string | null {
  const title = decodeHtmlEntities(item.title).toLowerCase().trim();
  const url = item.url.toLowerCase();

  if (title.includes("perfume") || url.includes("/category/perfumes") || url.includes("/product-category/perfumes")) {
    return "perfume";
  }
  if (title.includes("all over spray") || url.includes("all-over-spray")) {
    return "all-over-spray";
  }
  if (title.includes("fragrance") || title === "shop" || title === "shop all" || url === "/shop" || url.includes("/shop?") || title.includes("العطور")) {
    return "fragrance";
  }
  if (title === "shop all" || title === "shopall" || title === "all shop" || url.includes("/shop-all") || url.includes("/shopall")) {
    return "shop-all";
  }
  if (title.includes("hair mist") || url.includes("sasan-hair-mist")) {
    return "hair-mist";
  }
  if (title.includes("oud") || title.includes("dakhoon") || url.includes("oud-perfumes")) {
    return "oud-dakhoon";
  }
  if (title.includes("gift") || url.includes("gift-set")) {
    return "gift-set";
  }

  return null;
}

function shouldUseLiveHeaderNavigation(items: MenuItemLike[]): boolean {
  const matches = new Set(items.map((item) => getLiveHeaderMenuKey(item)).filter(Boolean));
  return matches.size >= 2;
}

/**
 * Get navigation items for a specific locale
 * @param pathPrefix - Market path prefix (e.g. "/qa", "/sa", "" for intl)
 */
export function getNavigationItems(locale: Locale, pathPrefix = "") {
  return navigationItems.map((item) => ({
    name: item.name[locale],
    href: `${pathPrefix}/${locale}${item.href}`,
    hasMegaMenu: item.hasMegaMenu,
  }));
}

/**
 * Get header category links for a specific locale
 * @param pathPrefix - Market path prefix (e.g. "/qa", "/sa", "" for intl)
 */
export function getHeaderCategoryLinks(locale: Locale, pathPrefix = "") {
  return headerCategoryLinks.map((item, index) => ({
    id: index + 1,
    name: item.name[locale],
    href: `${pathPrefix}/${locale}${item.href}`,
    hasMegaMenu: item.hasMegaMenu ?? false,
    hasBrandsMegaMenu: false,
  }));
}

const menuArabicTranslations: Record<string, string> = {
  "shop all": "تسوق الكل",
  "shop": "تسوق",
  "categories": "الفئات",
  "home fragrances": "عطور المنزل",
  "perfume": "العطور",
  "perfumes": "العطور",
  "fragrance": "العطور",
  "personal care": "العناية الشخصية",
  "gifts set": "مجموعات الهدايا",
  "gift set": "مجموعات الهدايا",
  "gift sets": "مجموعات الهدايا",
  "oils": "الزيوت",
  "fragrance oils": "زيوت العطور",
  "perfumes & oils": "العطور والزيوت",
  "hair mist": "معطر الشعر",
  "hair & body mist": "بخاخ الشعر والجسم",
  "hand & body lotion": "لوشن اليدين والجسم",
  "reed diffusers": "موزعات العطر",
  "candles": "الشموع",
  "diffusers": "موزعات العطر",
  "room sprays": "بخاخات الغرف",
  "incense": "البخور",
  "for him": "له",
  "for her": "لها",
  "luxury sets": "مجموعات فاخرة",
  "men's perfumes": "عطور رجالية",
  "men’s perfumes": "عطور رجالية",
  "women's perfumes": "عطور نسائية",
  "women’s perfumes": "عطور نسائية",
  "womens perfumes": "عطور نسائية",
  "woman perfumes": "عطور نسائية",
  "woman's perfumes": "عطور نسائية",
  "woman’s perfumes": "عطور نسائية",
  "woman box": "بوكس نسائي",
  "unisex": "عطور للجنسين",
  "unisex perfumes": "عطور للجنسين",
  "oud perfumes": "عطور العود",
  "summer perfume": "عطور صيفية",
  "winter perfume": "عطور شتوية",
  "top perfumes sasan": "أفضل عطور ساسان",
  "oud & dakhoon": "العود والدخون",
  "all over spray": "بخاخ الجسم",
  "air fresheners": "معطرات الجو",
  "home": "الرئيسية",
  "about": "من نحن",
  "about us": "من نحن",
  "contact": "اتصل بنا",
  "contact us": "اتصل بنا",
  "faq": "الأسئلة الشائعة",
  "brands": "العلامات التجارية",
  "services": "الخدمات",
  "blog": "المدونة",
  "private labeling": "التصنيع الخاص",
  "what we do": "ماذا نفعل",
  "our stores": "مواقعنا",
  "store listing": "مواقعنا",
  "store locator": "مواقعنا",
  "delivery policy": "سياسة التسليم",
  "exchange & return policy": "سياسة الاستبدال والإرجاع",
  "payment policy": "سياسة الدفع",
  "b2b": "B2B",
};

export function translateToArabic(englishTitle: string): string {
  const decoded = decodeHtmlEntities(englishTitle);
  const key = decoded.toLowerCase().trim();
  return menuArabicTranslations[key] || decoded;
}

/**
 * Navigation item type for dynamic WordPress menu
 */
export interface DynamicNavigationItem {
  id: number;
  name: string;
  href: string;
  hasMegaMenu: boolean;
  hasBrandsMegaMenu?: boolean;
}

/**
 * Check if a menu item should have a mega menu
 * Only "Shop All" / "Shop" / live perfume-category headings should have mega menu
 */
function shouldHaveMegaMenu(title: string): boolean {
  const megaMenuTitles = [
    "shop all",
    "shop",
    "perfume",
    "fragrance",
    "perfumes",
    "العطور",
    "تسوق",
    "تسوق الكل",
  ];
  return megaMenuTitles.includes(title.toLowerCase().trim());
}

export function shouldHaveBrandsMegaMenu(title: string): boolean {
  const brandTitles = ["brands", "العلامات التجارية", "الماركات"];
  return brandTitles.includes(title.toLowerCase().trim());
}

const MARKET_MENU_SEGMENTS = new Set(["qa", "om", "sa"]);
const LOCALE_MENU_SEGMENTS = new Set(["en", "ar"]);

function normalizePathPrefix(pathPrefix: string): string {
  const trimmed = pathPrefix.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/" || trimmed === "undefined" || trimmed === "/undefined") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function stripMenuRoutePrefix(value: string): string {
  const [pathAndHash, query = ""] = value.split("?");
  const [pathOnly, hash = ""] = pathAndHash.split("#");
  const segments = pathOnly.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();
  const third = segments[2]?.toLowerCase();

  let rest = segments;
  if (LOCALE_MENU_SEGMENTS.has(first || "") && MARKET_MENU_SEGMENTS.has(second || "")) {
    rest = LOCALE_MENU_SEGMENTS.has(third || "") ? segments.slice(3) : segments.slice(2);
  } else if (MARKET_MENU_SEGMENTS.has(first || "") && LOCALE_MENU_SEGMENTS.has(second || "")) {
    rest = segments.slice(2);
  } else if (MARKET_MENU_SEGMENTS.has(first || "")) {
    rest = segments.slice(1);
  } else if (LOCALE_MENU_SEGMENTS.has(first || "")) {
    rest = segments.slice(1);
  } else if (first === "undefined") {
    rest = LOCALE_MENU_SEGMENTS.has(second || "") ? segments.slice(2) : segments.slice(1);
  }

  const normalizedPath = `/${rest.join("/")}`;
  const normalizedQuery = query ? `?${query}` : "";
  const normalizedHash = hash ? `#${hash}` : "";
  return `${normalizedPath}${normalizedQuery}${normalizedHash}`;
}

/**
 * Normalize WordPress URL to a locale-aware frontend route.
 * Returns `#` unchanged so menu headings can stay non-navigational.
 */
export function normalizeMenuUrl(url: string, locale: Locale, pathPrefix = ""): string {
  if (!url) return "#";

  const trimmedUrl = url.trim();
  if (trimmedUrl === "#") return "#";

  const safePathPrefix = normalizePathPrefix(pathPrefix);
  let normalizedUrl = trimmedUrl;
  if (/^https?:\/\//i.test(trimmedUrl)) {
    try {
      const urlObj = new URL(trimmedUrl);
      const siteHostname = new URL(siteConfig.url).hostname.replace(/^www\./, "");
      const targetHostname = urlObj.hostname.replace(/^www\./, "");
      if (targetHostname !== siteHostname) {
        return trimmedUrl;
      }
      normalizedUrl = `${urlObj.pathname}${urlObj.search}`;
    } catch {
      return trimmedUrl;
    }
  }

  normalizedUrl = stripMenuRoutePrefix(normalizedUrl);
  if (!normalizedUrl.startsWith("/")) {
    normalizedUrl = `/${normalizedUrl}`;
  }

  const [normalizedPath, normalizedSearch] = normalizedUrl.split("?");
  const lowerPath = normalizedPath.toLowerCase().replace(/\/$/, "");
  const aliasMap = new Map<string, string>([
    ["/about-us", "/about-us"],
    ["/about", "/about-us"],
    ["/contact-us", "/contact-us"],
    ["/contact", "/contact-us"],
    ["/store-listing", "/store-listing"],
    ["/store-locator", "/store-listing"],
    ["/our-stores", "/store-listing"],
    ["/privacy-policy", "/privacy"],
    ["/delivery-policy", "/privacy"],
    ["/shipping-policy", "/shipping"],
    ["/refund_returns", "/returns"],
    ["/return-policy", "/returns"],
    ["/perfumes", "/category/perfumes"],
    ["/all-over-spray", "/category/all-over-spray"],
    ["/hair-mist", "/category/sasan-hair-mist"],
    ["/oud-dakhoon", "/category/oud-perfumes"],
    ["/fragrance", "/shop"],
    ["/shop-all", "/shop"],
    ["/shopall", "/shop"],
  ]);

  if (aliasMap.has(lowerPath)) {
    normalizedUrl = `${aliasMap.get(lowerPath)}${normalizedSearch ? `?${normalizedSearch}` : ""}`;
  } else if (normalizedSearch) {
    normalizedUrl = `${normalizedPath}?${normalizedSearch}`;
  }

  const normalizedUrlPath = normalizedUrl.split("?")[0];
  const normalizedQuery = normalizedUrl.includes("?") ? normalizedUrl.slice(normalizedUrl.indexOf("?")) : "";

  if (normalizedUrlPath === "/" || normalizedUrlPath === "") {
    return `${safePathPrefix}/${locale}${normalizedQuery}`;
  }

  if (normalizedUrlPath.startsWith("/category/")) {
    const slug = normalizedUrlPath.replace("/category/", "").replace(/\/$/, "");
    return `${safePathPrefix}/${locale}/category/${slug}`;
  }

  if (normalizedUrlPath.startsWith("/product-category/")) {
    const slug = normalizedUrlPath.replace("/product-category/", "").replace(/\/$/, "");
    return `${safePathPrefix}/${locale}/category/${slug}`;
  }

  if (normalizedUrlPath === "/fragrance" || normalizedUrlPath === "/fragrance/") {
    return `${safePathPrefix}/${locale}/shop`;
  }

  if (normalizedUrlPath.startsWith("/shop")) {
    return `${safePathPrefix}/${locale}${normalizedUrlPath}${normalizedQuery}`;
  }

  if (normalizedUrlPath.startsWith("/")) {
    return `${safePathPrefix}/${locale}${normalizedUrl}`;
  }

  return `${safePathPrefix}/${locale}/${normalizedUrl}`;
}

/**
 * Get dynamic navigation items from WordPress menu
 * Only top-level items are returned, with mega menu flag for Shop All
 */
export function getDynamicNavigationItems(
  menuItems: Array<{ id: number; title: string; url: string; parent: number }> | null | undefined,
  locale: Locale,
  pathPrefix = ""
): DynamicNavigationItem[] {
  if (!menuItems || menuItems.length === 0) {
    return navigationItems.map((item, index) => ({
      id: index + 1,
      name: item.name[locale],
      href: `${pathPrefix}/${locale}${item.href}`,
      hasMegaMenu: item.hasMegaMenu ?? false,
      hasBrandsMegaMenu: false,
    }));
  }

  const topLevelItems = menuItems.filter((item) => item.parent === 0);

  if (topLevelItems.length === 0 || !shouldUseLiveHeaderNavigation(topLevelItems)) {
    return navigationItems.map((item, index) => ({
      id: index + 1,
      name: item.name[locale],
      href: `${pathPrefix}/${locale}${item.href}`,
      hasMegaMenu: item.hasMegaMenu ?? false,
      hasBrandsMegaMenu: false,
    }));
  }

  const normalizedItems = topLevelItems
    .map((item, index) => {
      const title = locale === "ar" ? translateToArabic(item.title) : decodeHtmlEntities(item.title);
    const href = normalizeMenuUrl(item.url, locale, pathPrefix);
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedHref = href.toLowerCase();
    const [hrefPath, hrefQuery = ""] = normalizedHref.split("?");
    const isFragrance =
      normalizedTitle.includes("fragrance") ||
      normalizedTitle.includes("fragrance &") ||
      normalizedTitle.includes("العطور") ||
      hrefPath.includes("/fragrance");
    const isShop =
      normalizedTitle === "shop" ||
      normalizedTitle === "shop all" ||
      normalizedTitle === "shopall" ||
      hrefPath === `${pathPrefix}/${locale}/shop` ||
      hrefPath === `${pathPrefix}/${locale}/shop/`;
    const shopHref = `${pathPrefix}/${locale}/shop${hrefQuery ? `?${hrefQuery}` : ""}`;

      return {
        id: item.id,
        name: title,
        href: isFragrance || isShop ? shopHref : href,
        hasMegaMenu: shouldHaveMegaMenu(item.title),
        hasBrandsMegaMenu: shouldHaveBrandsMegaMenu(item.title),
        __order: index,
      };
    })
    .filter((item) => {
      const lower = item.name.toLowerCase().trim();
      return lower !== "";
    });

  const hasShopAll = normalizedItems.some((item) => {
    const normalized = item.name.toLowerCase().trim();
    const href = item.href.toLowerCase();
    return normalized === "shop all" || normalized === "shop" || href === `${pathPrefix}/${locale}/shop` || href.startsWith(`${pathPrefix}/${locale}/shop?`);
  });

  const withShopAll = hasShopAll
    ? normalizedItems
    : [
        {
          id: -1,
          name: locale === "ar" ? "تسوق الكل" : "Shop All",
          href: `${pathPrefix}/${locale}/shop`,
          hasMegaMenu: true,
          hasBrandsMegaMenu: false,
          __order: -1,
        },
        ...normalizedItems,
      ];

  const uniqueItems = withShopAll
    .sort((a, b) => a.__order - b.__order)
    .filter((item, index, items) => {
      const href = item.href.toLowerCase();
      return !items.slice(0, index).some((other) => other.href.toLowerCase() === href);
    });

  return uniqueItems.map((item) => ({
    id: item.id,
    name: item.name,
    href: item.href,
    hasMegaMenu: item.hasMegaMenu,
    hasBrandsMegaMenu: item.hasBrandsMegaMenu,
  }));
}

/**
 * Menu Category Type
 *
 * Represents a category in the mega menu.
 * Categories can have subcategories (children).
 */
export interface MenuCategory {
  id: number;
  name: {
    en: string;
    ar: string;
  };
  slug: string;
  /** Optional image URL for the category */
  image?: string;
  /** Subcategories */
  children?: MenuSubcategory[];
}

export interface MenuSubcategory {
  id: number;
  name: {
    en: string;
    ar: string;
  };
  slug: string;
}

/**
 * Static Mega Menu Categories
 *
 * Categories displayed in the mega menu dropdown.
 * Each category can have subcategories.
 */
export const megaMenuCategories: MenuCategory[] = [
  {
    id: 262,
    name: { en: "Men's Perfumes", ar: "عطور رجالية" },
    slug: "mens-perfumes",
  },
  {
    id: 273,
    name: { en: "Women's Perfumes", ar: "عطور نسائية" },
    slug: "woman-perfumes",
  },
  {
    id: 270,
    name: { en: "Unisex", ar: "عطور للجنسين" },
    slug: "unisex",
  },
  {
    id: 264,
    name: { en: "Oud Perfumes", ar: "عطور العود" },
    slug: "oud-perfumes",
  },
  {
    id: 267,
    name: { en: "Summer Perfume", ar: "عطور صيفية" },
    slug: "summer-perfume",
  },
  {
    id: 271,
    name: { en: "Winter Perfume", ar: "عطور شتوية" },
    slug: "winter-perfume",
  },
  {
    id: 263,
    name: { en: "New Arrival", ar: "وصل حديثاً" },
    slug: "new-arrival",
  },
];

/**
 * Get mega menu categories formatted for display
 *
 * Returns categories with localized names ready for rendering.
 */
export function getMegaMenuCategories(locale: Locale) {
  return megaMenuCategories.map((category) => ({
    id: category.id,
    name: category.name[locale],
    slug: category.slug,
    image: category.image ? { src: category.image } : null,
    parent: 0,
    count: category.children?.length || 0,
    children: (category.children || []).map((child) => ({
      id: child.id,
      name: child.name[locale],
      slug: child.slug,
      parent: category.id,
      count: 0,
    })),
  }));
}

/**
 * Get flat list of all categories (for mobile menu compatibility)
 *
 * Returns all categories and subcategories in a flat array format
 * compatible with the existing WCCategory type structure.
 */
export function getFlatCategories(locale: Locale) {
  const flatList: Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
    parent: number;
    count: number;
    image: { src: string } | null;
    review_count: number;
    permalink: string;
  }> = [];

  megaMenuCategories.forEach((category) => {
    flatList.push({
      id: category.id,
      name: category.name[locale],
      slug: category.slug,
      description: "",
      parent: 0,
      count: category.children?.length || 0,
      image: category.image ? { src: category.image } : null,
      review_count: 0,
      permalink: `/shop?category=${category.slug}`,
    });

    (category.children || []).forEach((child) => {
      flatList.push({
        id: child.id,
        name: child.name[locale],
        slug: child.slug,
        description: "",
        parent: category.id,
        count: 0,
        image: null,
        review_count: 0,
        permalink: `/shop?category=${child.slug}`,
      });
    });
  });

  return flatList;
}
