"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { CategoriesGridSkeleton } from "@/components/common/Skeleton";
import { getMegaMenuCategories, normalizeMenuUrl, translateToArabic } from "@/config/menu";
import { isLegacyBrandCategory } from "@/config/categoryVisibility";
import { getMegaMenuData, type MegaMenuColumn, type MegaMenuData, type MegaMenuSettings } from "@/lib/api/wordpress";
import type { WPMenuItem } from "@/types/wordpress";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

const menuDataFetchPromise: Record<string, Promise<MegaMenuData | null> | null> = {};
const categoriesFetchPromise: Record<string, Promise<MegaMenuColumn[]> | null> = {};
const hiddenCategorySlugs = new Set(["new-arrival", "new-arrivals", "uncategorized"]);
const hiddenCategoryTitles = new Set(["new arrival", "new arrivals", "وصل حديثا", "وصل حديثاً"]);

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  dictionary: Dictionary;
  megaMenuSettings?: MegaMenuSettings;
  menuItems?: WPMenuItem[] | null;
}

function extractSlugFromUrl(value: string): string {
  const [path] = value.split("?");
  const normalized = path.replace(/\/$/, "");
  const match = normalized.match(/\/(?:product-)?category\/([^/]+)$/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return decodeURIComponent(normalized.split("/").filter(Boolean).pop() || "");
}

function shouldHideCategory(title: string, slug: string): boolean {
  const cleanTitle = decodeHtmlEntities(title).trim().toLowerCase();
  const cleanSlug = slug.trim().toLowerCase();
  return (
    hiddenCategorySlugs.has(cleanSlug) ||
    hiddenCategoryTitles.has(cleanTitle) ||
    isLegacyBrandCategory({ name: title, slug })
  );
}

function displayCategoryName(title: string, locale: Locale): string {
  const decoded = decodeHtmlEntities(title);
  return locale === "ar" ? translateToArabic(decoded) : decoded;
}

function isCategoryItem(item: WPMenuItem): boolean {
  const url = item.url.trim().toLowerCase();
  return url.includes("/category/") || url.includes("/product-category/");
}

function isShopAllItem(item: WPMenuItem): boolean {
  const title = decodeHtmlEntities(item.title).trim().toLowerCase();
  const url = item.url.trim().toLowerCase();
  return title === "shop" || title === "shop all" || title === "تسوق" || title === "تسوق الكل" || url.endsWith("/shop");
}

function childItemsFor(parent: WPMenuItem, childrenByParent: Map<number, WPMenuItem[]>): WPMenuItem[] {
  return parent.children?.length ? parent.children : childrenByParent.get(parent.id) || [];
}

function menuItemsToColumns(items: WPMenuItem[] | null | undefined, locale: Locale, marketPrefix: string): MegaMenuColumn[] {
  if (!items?.length) return [];

  const childrenByParent = new Map<number, WPMenuItem[]>();
  for (const item of items) {
    if (item.parent) {
      const siblings = childrenByParent.get(item.parent) || [];
      siblings.push(item);
      childrenByParent.set(item.parent, siblings);
    }
  }

  const topLevel = items.filter((item) => !item.parent);
  const sourceItems = topLevel.length ? topLevel : items;
  const seen = new Set<string>();

  return sourceItems
    .filter((item) => !isShopAllItem(item))
    .filter((item) => isCategoryItem(item))
    .map((item) => {
      const href = normalizeMenuUrl(item.url, locale, marketPrefix);
      const slug = extractSlugFromUrl(href || item.url);
      const title = displayCategoryName(item.title, locale);
      const children = childItemsFor(item, childrenByParent)
        .filter((child) => !isShopAllItem(child))
        .filter((child) => isCategoryItem(child))
        .map((child) => {
          const childHref = normalizeMenuUrl(child.url, locale, marketPrefix);
          const childSlug = extractSlugFromUrl(childHref || child.url);
          return {
            id: child.id,
            name: displayCategoryName(child.title, locale),
            slug: childSlug,
            url: childHref,
          };
        })
        .filter((child) => child.name && child.slug && !shouldHideCategory(child.name, child.slug));

      return {
        id: item.id,
        name: title,
        slug,
        url: href,
        image: null,
        children,
      };
    })
    .filter((column) => {
      if (!column.name || !column.slug || shouldHideCategory(column.name, column.slug)) return false;
      const key = column.slug || column.url || column.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeColumns(columns: MegaMenuColumn[], locale: Locale, marketPrefix: string): MegaMenuColumn[] {
  const seen = new Set<string>();

  return columns
    .map((column) => {
      const href = normalizeMenuUrl(column.url || `/category/${column.slug}`, locale, marketPrefix);
      const slug = column.slug || extractSlugFromUrl(href);
      return {
        ...column,
        name: displayCategoryName(column.name, locale),
        slug,
        url: href,
        image: null,
        children: (column.children || [])
          .map((child) => {
            const childHref = normalizeMenuUrl(child.url || `/category/${child.slug}`, locale, marketPrefix);
            const childSlug = child.slug || extractSlugFromUrl(childHref);
            return {
              ...child,
              name: displayCategoryName(child.name, locale),
              slug: childSlug,
              url: childHref,
            };
          })
          .filter((child) => child.name && child.slug && !shouldHideCategory(child.name, child.slug)),
      };
    })
    .filter((column) => {
      if (!column.name || !column.slug || shouldHideCategory(column.name, column.slug)) return false;
      const key = column.slug || column.url || column.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeColumns(...groups: MegaMenuColumn[][]): MegaMenuColumn[] {
  const seen = new Set<string>();
  return groups.flat().filter((column) => {
    const key = column.slug || column.url || column.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function MegaMenu({
  isOpen,
  onClose,
  locale,
  dictionary,
  megaMenuSettings,
  menuItems,
}: MegaMenuProps) {
  void dictionary;
  const marketPrefix = useMarketPrefix();
  const displayMode = megaMenuSettings?.displayMode || "child-based";
  const cacheKey = `${marketPrefix || "main"}:${locale}`;
  const fallbackFrontendHost = marketPrefix ? `sasanperfumes.com${marketPrefix}` : "sasanperfumes.com";

  const [menuData, setMenuData] = useState<MegaMenuData | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [wcCategories, setWcCategories] = useState<MegaMenuColumn[]>([]);
  const hasMenuFetchedRef = useRef(false);
  const hasWcCategoriesFetchedRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isRTL = locale === "ar";

  const providedColumns = useMemo(
    () => menuItemsToColumns(menuItems, locale, marketPrefix),
    [menuItems, locale, marketPrefix]
  );

  const staticColumns = useMemo(
    () => normalizeColumns(
      getMegaMenuCategories(locale).map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        url: `${marketPrefix}/${locale}/category/${category.slug}`,
        image: null,
        children: category.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          url: `${marketPrefix}/${locale}/category/${child.slug}`,
        })),
      })),
      locale,
      marketPrefix
    ),
    [locale, marketPrefix]
  );

  const fetchMenuData = useCallback(async () => {
    if (providedColumns.length > 0) return;

    if (menuDataFetchPromise[cacheKey]) {
      try {
        setMenuData(await menuDataFetchPromise[cacheKey]);
      } catch (error) {
        console.error("Error fetching menu data:", error);
      }
      return;
    }

    setMenuLoading(true);
    try {
      menuDataFetchPromise[cacheKey] = getMegaMenuData(locale, fallbackFrontendHost);
      setMenuData(await menuDataFetchPromise[cacheKey]);
    } catch (error) {
      console.error("Error fetching menu data:", error);
    } finally {
      setMenuLoading(false);
      menuDataFetchPromise[cacheKey] = null;
    }
  }, [cacheKey, fallbackFrontendHost, locale, providedColumns.length]);

  const fetchWcCategories = useCallback(async () => {
    if (categoriesFetchPromise[cacheKey]) {
      try {
        const cats = await categoriesFetchPromise[cacheKey];
        if (cats) setWcCategories(cats);
      } catch (error) {
        console.error("Error fetching WC categories:", error);
      }
      return;
    }

    try {
      categoriesFetchPromise[cacheKey] = (async () => {
        const market = marketPrefix.replace("/", "");
        const marketParam = market ? `&market=${encodeURIComponent(market)}` : "";
        const resp = await fetch(`/api/categories?locale=${encodeURIComponent(locale)}${marketParam}`);
        if (!resp.ok) return [];
        const cats = await resp.json();
        return normalizeColumns(
          (cats as Array<{ id: number; name: string; slug: string; parent: number; count: number }>)
            .filter((category) => category.parent === 0 && category.count > 0)
            .filter((category) => !isLegacyBrandCategory(category))
            .map((category) => ({
              id: category.id,
              name: category.name,
              slug: category.slug,
              url: `${marketPrefix}/${locale}/category/${category.slug}`,
              image: null,
              children: [],
            })),
          locale,
          marketPrefix
        );
      })();
      const cats = await categoriesFetchPromise[cacheKey];
      if (cats) setWcCategories(cats);
    } catch (error) {
      console.error("Error fetching WC categories:", error);
    } finally {
      categoriesFetchPromise[cacheKey] = null;
    }
  }, [cacheKey, locale, marketPrefix]);

  useEffect(() => {
    if (isOpen && !hasMenuFetchedRef.current && providedColumns.length === 0) {
      hasMenuFetchedRef.current = true;
      fetchMenuData();
    }
  }, [isOpen, fetchMenuData, providedColumns.length]);

  useEffect(() => {
    if (isOpen && !menuLoading && !hasWcCategoriesFetchedRef.current) {
      hasWcCategoriesFetchedRef.current = true;
      fetchWcCategories();
    }
  }, [isOpen, menuLoading, fetchWcCategories]);

  useEffect(() => {
    hasMenuFetchedRef.current = false;
    hasWcCategoriesFetchedRef.current = false;
    setMenuData(null);
    setWcCategories([]);
  }, [cacheKey]);

  const backendColumns = providedColumns.length > 0
    ? providedColumns
    : menuData?.columns?.length
      ? normalizeColumns(menuData.columns, locale, marketPrefix)
      : [];
  const displayColumns = mergeColumns(
    backendColumns,
    wcCategories.length > 0 ? wcCategories : staticColumns
  );

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute left-0 right-0 z-50 border-t border-brand-border/50 bg-white shadow-[0_24px_70px_rgba(20,15,10,0.12)] transition-all duration-300 ease-out",
        isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
      )}
      style={{ top: "100%" }}
      dir={isRTL ? "rtl" : "ltr"}
      onMouseLeave={onClose}
    >
      <div className="container mx-auto px-4 py-8">
        {menuLoading && displayColumns.length === 0 ? (
          <CategoriesGridSkeleton count={8} />
        ) : displayColumns.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-brand-muted">
            {isRTL ? "لا توجد فئات" : "No categories found"}
          </div>
        ) : (
          <>
            <Link
              href={`${marketPrefix}/${locale}/shop`}
              onClick={onClose}
              className="mb-6 inline-flex rounded-full border border-brand-gold/35 px-5 py-2 text-sm font-bold uppercase tracking-wide text-brand-primary transition-colors hover:border-brand-gold hover:bg-brand-beige"
            >
              {isRTL ? "تسوق الكل" : "Shop All"}
            </Link>

            <div
              className="grid gap-x-10 gap-y-7"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))" }}
            >
              {displayColumns.map((column) => (
                <div key={`${column.id}-${column.slug}`} className="min-w-0">
                  <Link
                    href={column.url || `${marketPrefix}/${locale}/category/${column.slug}`}
                    onClick={onClose}
                    className="block text-sm font-bold uppercase tracking-wide text-brand-primary transition-colors hover:text-brand-gold"
                  >
                    {column.name}
                  </Link>

                  {displayMode === "child-based" && column.children.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {column.children.slice(0, 10).map((child) => (
                        <Link
                          key={`${column.id}-${child.id}-${child.slug}`}
                          href={child.url || `${marketPrefix}/${locale}/category/${child.slug}`}
                          onClick={onClose}
                          className="block text-sm leading-5 text-brand-muted transition-colors hover:text-brand-primary"
                        >
                          {child.name}
                        </Link>
                      ))}
                      {column.children.length > 10 && (
                        <Link
                          href={column.url || `${marketPrefix}/${locale}/category/${column.slug}`}
                          onClick={onClose}
                          className="block text-sm font-semibold text-brand-primary transition-colors hover:text-brand-gold"
                        >
                          {isRTL ? "عرض الكل" : "View all"}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
