"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Grid3X3 } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";
import { getProductById } from "@/lib/api/woocommerce";
import { cn, getProductSlugFromPermalink, decodeHtmlEntities } from "@/lib/utils";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { MiniProductGridSkeleton, CategoriesGridSkeleton } from "@/components/common/Skeleton";
import { getMegaMenuCategories } from "@/config/menu";
import { getMegaMenuData, type MegaMenuColumn, type MegaMenuData, type MegaMenuSettings } from "@/lib/api/wordpress";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

const productsFetchPromise: Record<string, Promise<WCProduct[]> | null> = {};
const menuDataFetchPromise: Record<string, Promise<MegaMenuData | null> | null> = {};
const categoriesFetchPromise: Record<string, Promise<MegaMenuColumn[]> | null> = {};

/**
 * Static menu category type with children
 */
export interface StaticMenuCategory {
  id: number;
  name: string;
  slug: string;
  image: { src: string } | null;
  parent: number;
  count: number;
  children: Array<{
    id: number;
    name: string;
    slug: string;
    parent: number;
    count: number;
  }>;
}


interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  dictionary: Dictionary;
  megaMenuSettings?: MegaMenuSettings;
}

export function MegaMenu({
  isOpen,
  onClose,
  locale,
  dictionary,
  megaMenuSettings,
}: MegaMenuProps) {
  void dictionary; // Reserved for future use
  const marketPrefix = useMarketPrefix();
  const displayMode = megaMenuSettings?.displayMode || "child-based";
  const showProducts = megaMenuSettings?.showProducts !== false;
  const maxColumns = megaMenuSettings?.maxColumns || 3;
  
  // Static categories from config (fallback)
  const staticCategories = getMegaMenuCategories(locale);
  
  // Dynamic menu data state
  const [menuData, setMenuData] = useState<MegaMenuData | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const hasMenuFetchedRef = useRef(false);

  // WooCommerce categories fallback state
  const [wcCategories, setWcCategories] = useState<MegaMenuColumn[]>([]);
  const hasWcCategoriesFetchedRef = useRef(false);
  
  // Featured products state
  const [featuredProducts, setFeaturedProducts] = useState<WCProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const hasProductsFetchedRef = useRef(false);
  const isRTL = locale === "ar";
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch dynamic menu data from WordPress
  const fetchMenuData = useCallback(async () => {
    if (menuDataFetchPromise[locale]) {
      try {
        const data = await menuDataFetchPromise[locale];
        setMenuData(data);
      } catch (error) {
        console.error("Error fetching menu data:", error);
      }
      return;
    }

    setMenuLoading(true);
    try {
      menuDataFetchPromise[locale] = getMegaMenuData(locale);
      const data = await menuDataFetchPromise[locale];
      setMenuData(data);
    } catch (error) {
      console.error("Error fetching menu data:", error);
    } finally {
      setMenuLoading(false);
      menuDataFetchPromise[locale] = null;
    }
  }, [locale]);

  // Fetch featured products - only by specific IDs from menu (no fallback)
  const fetchFeaturedProducts = useCallback(async (productIds: number[]) => {
    if (productsFetchPromise[locale]) {
      try {
        const prods = await productsFetchPromise[locale];
        if (prods) {
          setFeaturedProducts(prods);
        }
      } catch (error) {
        console.error(error);
      }
      return;
    }

    setProductsLoading(true);
    try {
      // Fetch only the specific product IDs from the menu
      productsFetchPromise[locale] = Promise.all(
        productIds.map((id) => getProductById(id, locale))
      ).then((products) => products.filter((p): p is WCProduct => p !== null));

      const prods = await productsFetchPromise[locale];
      if (prods) {
        setFeaturedProducts(prods);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProductsLoading(false);
      productsFetchPromise[locale] = null;
    }
  }, [locale]);

  // Fetch WooCommerce categories as fallback when WP menu and static categories are empty
  const fetchWcCategories = useCallback(async () => {
    if (categoriesFetchPromise[locale]) {
      try {
        const cats = await categoriesFetchPromise[locale];
        if (cats) setWcCategories(cats);
      } catch (error) {
        console.error("Error fetching WC categories:", error);
      }
      return;
    }

    try {
      categoriesFetchPromise[locale] = (async () => {
        const resp = await fetch(`/api/categories?locale=${locale}`);
        if (!resp.ok) return [];
        const cats = await resp.json();
        return (cats as Array<{ id: number; name: string; slug: string; parent: number; count: number; image?: { src: string } }>)
          .filter((c) => c.parent === 0 && c.count > 0)
          .map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            url: `${marketPrefix}/${locale}/category/${c.slug}`,
            image: c.image ? { src: c.image.src } : null,
            children: [],
          }));
      })();
      const cats = await categoriesFetchPromise[locale];
      if (cats) setWcCategories(cats);
    } catch (error) {
      console.error("Error fetching WC categories:", error);
    } finally {
      categoriesFetchPromise[locale] = null;
    }
  }, [locale, marketPrefix]);

  // Fetch menu data when menu opens
  useEffect(() => {
    if (isOpen && !hasMenuFetchedRef.current) {
      hasMenuFetchedRef.current = true;
      fetchMenuData();
    }
  }, [isOpen, fetchMenuData]);

  // Fetch products only after menu data is loaded - only show products if specific IDs are configured
  useEffect(() => {
    if (isOpen && !hasProductsFetchedRef.current && !menuLoading) {
      // Only fetch products if we have specific product IDs from WordPress menu
      if (menuData?.featuredProductIds && menuData.featuredProductIds.length > 0) {
        hasProductsFetchedRef.current = true;
        fetchFeaturedProducts(menuData.featuredProductIds);
      } else if (menuData !== null) {
        // Menu data loaded but no product IDs configured - don't show any products
        hasProductsFetchedRef.current = true;
        setFeaturedProducts([]);
      }
    }
  }, [isOpen, menuData, menuLoading, fetchFeaturedProducts]);

  // Fetch WC categories if WP menu returned no columns and static categories are empty
  useEffect(() => {
    if (isOpen && !menuLoading && !hasWcCategoriesFetchedRef.current) {
      const hasMenuColumns = menuData?.columns && menuData.columns.length > 0;
      const hasStaticCats = staticCategories.length > 0;
      if (!hasMenuColumns && !hasStaticCats) {
        hasWcCategoriesFetchedRef.current = true;
        fetchWcCategories();
      }
    }
  }, [isOpen, menuLoading, menuData, staticCategories.length, fetchWcCategories]);

  // Reset fetch flags when locale changes
  useEffect(() => {
    hasMenuFetchedRef.current = false;
    hasProductsFetchedRef.current = false;
    hasWcCategoriesFetchedRef.current = false;
    setMenuData(null);
    setFeaturedProducts([]);
    setWcCategories([]);
  }, [locale]);

  // Use dynamic columns if available, then static categories, then WC categories
  const staticCols: MegaMenuColumn[] = staticCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    url: `${marketPrefix}/${locale}/shop?category=${cat.slug}`,
    image: cat.image,
    children: cat.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      url: `${marketPrefix}/${locale}/shop?category=${child.slug}`,
    })),
  }));

  const displayColumns: MegaMenuColumn[] = menuData?.columns && menuData.columns.length > 0
    ? menuData.columns
    : staticCols.length > 0
      ? staticCols
      : wcCategories;

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute left-0 right-0 z-50 bg-white shadow-2xl transition-all duration-300 ease-out",
        "border-t border-gray-100",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      )}
      style={{ top: "100%" }}
      dir={isRTL ? "rtl" : "ltr"}
      onMouseLeave={onClose}
    >
        <div className="container mx-auto px-6 py-8">
          {menuLoading ? (
            <div className="flex gap-8">
              <div className={cn("flex-1", isRTL ? "order-2" : "order-1")}>
                <CategoriesGridSkeleton count={4} />
              </div>
              <div className={cn("w-[340px] flex-shrink-0", isRTL ? "order-1" : "order-2")}>
                <MiniProductGridSkeleton count={4} />
              </div>
            </div>
          ) : displayColumns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Grid3X3 className="mb-4 h-16 w-16 text-gray-200" />
              <p className="text-gray-400">No categories found</p>
            </div>
          ) : (
            <div className="flex gap-8">
              {/* Left Side - Categories with Images */}
              <div className={cn("flex-1", isRTL ? "order-2" : "order-1")}>
                {/* Shop All link */}
                <Link
                  href={`${marketPrefix}/${locale}/shop`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full border border-brand-gold/30 bg-brand-beige/50 text-sm font-bold text-brand-primary uppercase tracking-wide hover:bg-brand-beige hover:border-brand-gold transition-colors"
                >
                  <Grid3X3 className="h-4 w-4 text-brand-gold" />
                  {isRTL ? "تسوق الكل" : "Shop All"}
                </Link>

                <div className={cn("grid gap-8", {
                  "grid-cols-1": Math.min(maxColumns, displayColumns.length) === 1,
                  "grid-cols-2": Math.min(maxColumns, displayColumns.length) === 2,
                  "grid-cols-3": Math.min(maxColumns, displayColumns.length) === 3,
                  "grid-cols-4": Math.min(maxColumns, displayColumns.length) === 4,
                  "grid-cols-5": Math.min(maxColumns, displayColumns.length) === 5,
                })}>
                  {displayColumns.slice(0, maxColumns).map((column) => (
                    <div key={column.id} className="flex flex-col">
                      {/* Category Header with Image */}
                      <Link
                        href={column.url || `${marketPrefix}/${locale}/shop?category=${column.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-2 mb-3 group"
                      >
                        {column.image?.src ? (
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                            <Image
                              src={column.image.src}
                              alt={column.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-beige">
                            <Grid3X3 className="h-4 w-4 text-brand-gold" />
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide group-hover:text-brand-primary transition-colors">
                          {column.name}
                        </span>
                      </Link>
                      
                      {/* Subcategories - only shown in child-based mode */}
                      {displayMode === "child-based" && <div className="space-y-2">
                        {column.children.slice(0, 8).map((child) => (
                          <Link
                            key={child.id}
                            href={child.url || `${marketPrefix}/${locale}/shop?category=${child.slug}`}
                            onClick={onClose}
                            className="block text-sm text-gray-600 hover:text-brand-primary transition-colors"
                          >
                            {child.name}
                          </Link>
                        ))}
                        {column.children.length > 8 && (
                          <Link
                            href={column.url || `${marketPrefix}/${locale}/shop?category=${column.slug}`}
                            onClick={onClose}
                            className="block text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors"
                          >
                            {isRTL ? "عرض الكل..." : "View all..."}
                          </Link>
                        )}
                      </div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - Featured Products (4th column) */}
              {showProducts && <div className={cn("w-[340px] flex-shrink-0", isRTL ? "order-1" : "order-2")}>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  {menuData?.featuredProductIds && menuData.featuredProductIds.length > 0
                    ? (isRTL ? "منتجات مميزة" : "Featured Products")
                    : (isRTL ? "وصل حديثاً" : "New Arrivals")}
                </h3>
                                {productsLoading ? (
                                  <MiniProductGridSkeleton count={menuData?.featuredProductIds?.length || 4} />
                                ) : featuredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {featuredProducts.map((product) => {
                      const productSlug = getProductSlugFromPermalink(product.permalink, product.slug);
                      return (
                      <Link
                        key={product.id}
                        href={`${marketPrefix}/${locale}/product/${productSlug}`}
                        onClick={onClose}
                        className="group block"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg skeleton-shimmer">
                          {product.images?.[0]?.src ? (
                            <Image
                              src={product.images[0].src}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Grid3X3 className="h-12 w-12 text-brand-primary" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <h4 className="text-xs font-medium text-gray-900 group-hover:text-brand-primary transition-colors line-clamp-2 break-words min-w-0">
                            {decodeHtmlEntities(product.name)}
                          </h4>
                          <p className="text-xs text-brand-primary font-medium mt-1">
                            <FormattedPrice 
                              price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)} 
                              iconSize="xs" 
                            />
                          </p>
                        </div>
                      </Link>
                    );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Grid3X3 className="mb-2 h-8 w-8 text-gray-200" />
                    <p className="text-xs text-gray-400">{isRTL ? "لا توجد منتجات" : "No products"}</p>
                  </div>
                )}
              </div>}
            </div>
          )}
        </div>
      </div>
  );
}
