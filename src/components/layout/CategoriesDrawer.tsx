"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Grid3X3, ChevronRight, ChevronDown, Tag } from "lucide-react";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import type { WCCategory } from "@/types/woocommerce";
import type { WPMenuItem } from "@/types/wordpress";
import type { BrandItem } from "@/lib/api/wordpress";
import { getCategories } from "@/lib/api/woocommerce";
import { decodeHtmlEntities } from "@/lib/utils";
import { triggerHaptic } from "@/lib/utils/haptics";
import { translateToArabic } from "@/config/menu";

function CategorySkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
          </div>
          <div className="h-4 w-4 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// DEV MODE: Cache disabled for faster development - uncomment when done
// const categoriesCache: Record<string, { data: WCCategory[]; timestamp: number }> = {};
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
const fetchPromise: Record<string, Promise<WCCategory[]> | null> = {};

/**
 * Extract category slug from a WordPress menu item URL.
 * Handles URLs like /category/perfumes, https://site.com/en/category/fragrance-oils, etc.
 */
function extractSlugFromMenuUrl(url: string): string | null {
  if (!url || url === "#") return null;
  try {
    const parsed = url.startsWith("http") ? new URL(url) : null;
    const path = (parsed?.pathname || url).replace(/^\/(en|ar)\//, "/").replace(/\/$/, "");
    const categoryParam = parsed?.searchParams.get("category");
    if (categoryParam) return decodeURIComponent(categoryParam);

    const categoryMatch = path.match(/\/(?:product-)?category\/([^/?#]+)/);
    if (categoryMatch) return decodeURIComponent(categoryMatch[1]);

    const lastSegment = path.split("/").filter(Boolean).pop();
    if (!lastSegment) return null;

    const slugAliases: Record<string, string> = {
      "perfume": "perfumes",
      "hair-mist": "sasan-hair-mist",
      "oud-dakhoon": "oud-perfumes",
    };

    return slugAliases[lastSegment] || decodeURIComponent(lastSegment);
  } catch {
    return null;
  }
}

interface CategoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  dictionary: Dictionary;
  menuItems?: WPMenuItem[] | null;
}

export function CategoriesDrawer({
  isOpen,
  onClose,
  locale,
  dictionary,
  menuItems,
}: CategoriesDrawerProps) {
  // DEV MODE: Cache disabled for faster development
  const [categories, setCategories] = useState<WCCategory[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");
    const isRTL = locale === "ar";

    const handleClose = useCallback(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onClose();
    }, [onClose]);

    const toggleCategory = (categoryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Build display categories from WordPress menu order (backend-dynamic)
  // Falls back to parent categories if no menu items are provided
  const allCategories = categories;
  const getChildCategories = (parentId: number) =>
    allCategories.filter(cat => cat.parent === parentId);

  const displayCategories = (() => {
    if (!menuItems || menuItems.length === 0) {
      // Fallback: show parent categories as before
      return allCategories.filter(cat => cat.parent === 0);
    }

    // Use WordPress menu items (excluding "Shop All" type items) to determine order
    const topLevelMenuItems = menuItems.filter(item => item.parent === 0);
    const slugMap = new Map<string, WCCategory>();
    for (const cat of allCategories) {
      slugMap.set(cat.slug, cat);
    }

    const ordered: WCCategory[] = [];
    for (const menuItem of topLevelMenuItems) {
      const slug = extractSlugFromMenuUrl(menuItem.url);
      if (!slug) continue;
      const matched = slugMap.get(slug);
      if (matched) {
        // Use menu item title for display name (supports Arabic via translateToArabic)
        const displayName = locale === "ar"
          ? translateToArabic(menuItem.title)
          : decodeHtmlEntities(menuItem.title);
        ordered.push({ ...matched, name: displayName });
      }
    }

    return ordered.length > 0 ? ordered : allCategories.filter(cat => cat.parent === 0);
  })();

  const fetchCategoriesData = useCallback(async () => {
    // DEV MODE: Cache disabled for faster development
    // If already fetching, wait for the existing promise
    if (fetchPromise[locale]) {
      try {
        const cats = await fetchPromise[locale];
        if (cats) {
          setCategories(cats);
        }
      } catch (error) {
        console.error(error);
      }
      return;
    }

    setLoading(true);
    try {
      // Create a shared promise for concurrent requests
      fetchPromise[locale] = getCategories(locale).then((cats) => {
        const filtered = cats.filter((cat) => cat.count > 0);
        return filtered;
      });

      const cats = await fetchPromise[locale];
      if (cats) {
        setCategories(cats);
      }

      // Fetch brands
      try {
        const res = await fetch("/api/brands");
        if (res.ok) {
          const brandsData = await res.json();
          setBrands(brandsData);
        }
      } catch (e) {
        console.error("Failed to fetch brands", e);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      fetchPromise[locale] = null;
    }
  }, [locale]);

  useEffect(() => {
    // DEV MODE: Cache disabled for faster development - always fetch fresh data
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCategoriesData();
    }
  }, [isOpen, locale, fetchCategoriesData]);

  // Reset fetch ref when locale changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [locale]);

  return (
    <MuiDrawer
      anchor="bottom"
      open={isOpen}
      onClose={handleClose}
      keepMounted
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: "85vh",
          width: "100%",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
            px: 2,
            py: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Grid3X3 className="h-5 w-5" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {activeTab === "categories" ? (dictionary.common.categories || "Categories") : (isRTL ? "العلامات التجارية" : "Brands")}
            </Typography>
          </Box>
                    <IconButton
                      onClick={handleClose}
                      aria-label="Close drawer"
                      sx={{ color: "text.secondary" }}
                    >
                      <X className="h-5 w-5" />
                    </IconButton>
        </Box>

        {/* Tab switcher for Categories / Brands */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => { setActiveTab("categories"); triggerHaptic(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "categories"
                ? "border-b-2 border-black text-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            {dictionary.common.categories || "Categories"}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("brands"); triggerHaptic(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "brands"
                ? "border-b-2 border-black text-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Tag className="h-4 w-4" />
            {isRTL ? "العلامات التجارية" : "Brands"}
          </button>
        </div>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <CategorySkeleton />
          ) : activeTab === "brands" ? (
            brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag className="mb-4 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">{isRTL ? "لا توجد علامات تجارية" : "No brands found"}</p>
              </div>
            ) : (
              <nav className="p-4">
                <ul className="space-y-1">
                  {brands.map((brand) => (
                    <li key={brand.id}>
                      <Link
                        href={`/${locale}/brands/${brand.slug}`}
                        onClick={handleClose}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-900 font-semibold transition-all hover:bg-gray-100 active:scale-[0.98]"
                      >
                        {brand.logo ? (
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            <Image
                              src={brand.logo}
                              alt={brand.name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-beige">
                            <Tag className="h-5 w-5 text-brand-gold" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{brand.name}</span>
                        </div>
                        <ChevronRight className={`h-5 w-5 flex-shrink-0 text-gray-400 ${isRTL ? "rotate-180" : ""}`} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Grid3X3 className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No categories found</p>
            </div>
          ) : (
            <nav className="p-4">
              <ul className="space-y-1">
                {displayCategories.map((category) => {
                  const childCategories = getChildCategories(category.id);
                  const hasChildren = childCategories.length > 0;
                  const isExpanded = expandedCategories.has(category.id);

                  return (
                    <li key={category.id}>
                      <div className="flex items-center">
                                                <Link
                                                  href={`/${locale}/category/${category.slug}`}
                                                  onClick={handleClose}
                                                  className="flex flex-1 items-center gap-3 rounded-lg px-4 py-3 text-gray-900 font-semibold transition-all hover:bg-gray-100 active:scale-[0.98]"
                                                >
                          {category.image ? (
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                              <Image
                                src={category.image.src}
                                alt={decodeHtmlEntities(category.name)}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-beige">
                              <Grid3X3 className="h-5 w-5 text-brand-gold" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="block truncate">{decodeHtmlEntities(category.name)}</span>
                          </div>
                          {hasChildren && (
                            <span className="text-xs text-gray-400 font-normal">
                              {childCategories.length}
                            </span>
                          )}
                        </Link>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={(e) => toggleCategory(category.id, e)}
                            className="p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            <ChevronDown
                              className={`h-5 w-5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                        {!hasChildren && (
                          <ChevronRight className={`h-5 w-5 flex-shrink-0 text-gray-400 mr-2 ${isRTL ? "rotate-180" : ""}`} />
                        )}
                      </div>

                      {hasChildren && isExpanded && (
                        <ul className={`mt-1 space-y-1 ${isRTL ? "mr-14" : "ml-14"}`}>
                          {childCategories.map((child) => (
                            <li key={child.id}>
                                                            <Link
                                                              href={`/${locale}/category/${child.slug}`}
                                                              onClick={handleClose}
                                                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 transition-all hover:bg-brand-beige hover:text-brand-primary"
                                                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                <span className="flex-1">{decodeHtmlEntities(child.name)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </Box>

        <div className="border-t p-4 pb-safe">
                    <Link
                      href={activeTab === "brands" ? `/${locale}/brands` : `/${locale}/shop`}
                      onClick={handleClose}
                      className="flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
                    >
            {activeTab === "brands"
              ? (isRTL ? "عرض جميع العلامات التجارية" : "View All Brands")
              : (dictionary.common.viewAll || "View All Products")}
          </Link>
        </div>
      </Box>
    </MuiDrawer>
  );
}
