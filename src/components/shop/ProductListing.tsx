"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { WCProductGrid } from "./WCProductGrid";
import { ProductViewToggle, type GridColumns, type SortOption, type ViewMode } from "./ProductViewToggle";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { cn } from "@/lib/utils";
import type { Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";

const STORAGE_KEY = "sasanperfumes_product_view_preference_v4";
const PREFERENCE_CHANGE_EVENT = "sasanperfumes_preference_change";

let cachedPreference: ViewPreference | null = null;
let cachedStorageValue: string | null = null;

interface ViewPreference {
  viewMode: ViewMode;
  gridColumns: GridColumns;
}

interface ProductListingProps {
  products: WCProduct[];
  locale: Locale;
  isLoading?: boolean;
  className?: string;
  toolbarTitle?: string;
  showToolbar?: boolean;
  toolbarClassName?: string;
  bundleProductSlugs?: string[];
}

const DEFAULT_PREFERENCE: ViewPreference = {
  viewMode: "grid",
  gridColumns: 6,
};

function getProductPrice(product: WCProduct): number {
  const price = Number.parseFloat(product.prices?.price || "0");
  return Number.isNaN(price) ? 0 : price;
}

function sortProducts(products: WCProduct[], sortBy: SortOption): WCProduct[] {
  if (sortBy === "default") return products;

  const sorted = [...products];

  switch (sortBy) {
    case "price-asc":
      sorted.sort((a, b) => getProductPrice(a) - getProductPrice(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => getProductPrice(b) - getProductPrice(a));
      break;
    case "name-asc":
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
    case "name-desc":
      sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      break;
    case "date-desc":
      sorted.sort((a, b) => b.id - a.id);
      break;
    default:
      break;
  }

  return sorted;
}

function getPreferenceSnapshot(): ViewPreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === cachedStorageValue && cachedPreference !== null) {
      return cachedPreference;
    }

    cachedStorageValue = stored;
    if (stored) {
      const parsed = JSON.parse(stored) as ViewPreference;
      if (parsed.gridColumns === 6) {
        cachedPreference = { viewMode: "grid", gridColumns: 6 };
        return cachedPreference;
      }
    }
  } catch {
    // Ignore localStorage errors.
  }

  cachedPreference = DEFAULT_PREFERENCE;
  return cachedPreference;
}

function getServerSnapshot(): ViewPreference {
  return DEFAULT_PREFERENCE;
}

function subscribeToPreference(callback: () => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  const handlePreferenceChange = () => callback();

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(PREFERENCE_CHANGE_EVENT, handlePreferenceChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(PREFERENCE_CHANGE_EVENT, handlePreferenceChange);
  };
}

function savePreference(preference: ViewPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
  } catch {
    // Ignore localStorage errors.
  }
}

export function ProductListing({
  products,
  locale,
  isLoading = false,
  className,
  toolbarTitle,
  showToolbar = true,
  toolbarClassName,
  bundleProductSlugs = [],
}: ProductListingProps) {
  const preference = useSyncExternalStore(
    subscribeToPreference,
    getPreferenceSnapshot,
    getServerSnapshot
  );
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const viewMode: ViewMode = "grid";
  const gridColumns = preference.gridColumns;
  const sortedProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    savePreference({ viewMode: mode, gridColumns });
  }, [gridColumns]);

  const handleGridColumnsChange = useCallback((columns: GridColumns) => {
    savePreference({ viewMode: "grid", gridColumns: columns });
  }, []);

  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
  }, []);

  if (isLoading) {
    return <ProductGridSkeleton count={12} />;
  }

  if (products.length === 0) {
    return (
      <div className="section-band py-14 text-center">
        <p className="text-sm font-semibold text-brand-muted">
          {locale === "ar" ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a" : "No products found"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("bg-transparent pb-4 pt-3 md:pt-6", className)}>
      {showToolbar && (
        <div className={cn("mb-3 md:mb-6", toolbarClassName)}>
          {toolbarTitle ? (
            <div className="section-band relative flex items-center justify-between gap-3 px-4 py-2 text-brand-primary md:gap-4 md:px-7 md:py-3">
              <h2 className="truncate text-[15px] font-semibold leading-tight md:text-[17px] lg:text-[20px]">
                {toolbarTitle}
              </h2>
              <ProductViewToggle
                viewMode={viewMode}
                gridColumns={gridColumns}
                onViewModeChange={handleViewModeChange}
                onGridColumnsChange={handleGridColumnsChange}
                locale={locale}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                variant="compact"
              />
            </div>
          ) : (
            <ProductViewToggle
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={handleViewModeChange}
              onGridColumnsChange={handleGridColumnsChange}
              locale={locale}
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />
          )}
        </div>
      )}

      <WCProductGrid
        products={sortedProducts}
        locale={locale}
        columns={gridColumns}
        bundleProductSlugs={bundleProductSlugs}
        productNameLines={2}
      />
    </div>
  );
}
