"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ProductListing } from "@/components/shop/ProductListing";
import type { WCProduct, WCProductsResponse } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

const PER_PAGE = 30;
const LOAD_AHEAD_MARGIN = "1200px 0px";

interface ShopClientProps {
  products: WCProduct[];
  locale: Locale;
  toolbarTitle?: string;
  initialTotal?: number;
  giftProductIds?: number[];
  giftProductSlugs?: string[];
  bundleProductSlugs?: string[];
}

export function ShopClient({ 
  products: initialProducts, 
  locale,
  toolbarTitle,
  initialTotal = 0,
  giftProductIds = [],
  giftProductSlugs = [],
  bundleProductSlugs = [],
}: ShopClientProps) {
  const [products, setProducts] = useState<WCProduct[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(initialTotal);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Use initial products as-is — order is controlled by WP Admin menu_order
    setProducts(initialProducts);
    setTotal(initialTotal);
    setHasMore(initialProducts.length < initialTotal);
    isInitialMount.current = false;
  }, [initialProducts, initialTotal, locale]);

  const loadMoreProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    setLoadError(false);
    const nextPage = currentPage + 1;
    
    try {
      const response = await fetch(
        `/api/products?page=${nextPage}&per_page=${PER_PAGE}&locale=${locale}&lightweight=true`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data: WCProductsResponse = await response.json();
      
      if (data.products.length === 0) {
        setHasMore(false);
      } else {
        const giftIdsSet = new Set(giftProductIds);
        const giftSlugsSet = new Set(giftProductSlugs);
        const filteredNewProducts = data.products.filter(
          (product: WCProduct) => !giftIdsSet.has(product.id) && !giftSlugsSet.has(product.slug)
        );
        
        const seenProductIds = new Set(products.map((product) => product.id));
        const uniqueNewProducts = filteredNewProducts.filter((product) => {
          if (seenProductIds.has(product.id)) return false;
          seenProductIds.add(product.id);
          return true;
        });
        const uniqueProducts = [...products, ...uniqueNewProducts];
        
        setProducts(uniqueProducts);
        setCurrentPage(nextPage);
        const giftCountInThisPage = data.products.length - filteredNewProducts.length;
        const newTotal = total - giftCountInThisPage;
        setTotal(newTotal);
        setHasMore(uniqueProducts.length < newTotal);
        

      }
    } catch (error) {
      console.error("Error loading more products:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, currentPage, products, total, locale, giftProductIds, giftProductSlugs]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading && !loadError) {
          loadMoreProducts();
        }
      },
      {
        root: null,
        rootMargin: LOAD_AHEAD_MARGIN,
        threshold: 0,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, loadMoreProducts, loadError]);

  return (
    <div>
      <ProductListing
        products={products}
        locale={locale}
        toolbarTitle={toolbarTitle}
        showToolbar={true}
        bundleProductSlugs={bundleProductSlugs}
      />
      
      <div ref={loadMoreRef} className="flex min-h-12 justify-center py-5">
        {isLoading && (
          <div className="flex items-center gap-2 text-brand-muted">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{locale === "ar" ? "جاري التحميل..." : "Loading more..."}</span>
          </div>
        )}

        {loadError && !isLoading && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-brand-muted">
              {locale === "ar" ? "حدث خطأ أثناء تحميل المنتجات" : "Failed to load more products"}
            </p>
            <button
              onClick={() => loadMoreProducts()}
              className="text-sm text-brand-primary underline hover:no-underline"
            >
              {locale === "ar" ? "حاول مرة أخرى" : "Try again"}
            </button>
          </div>
        )}
        
        {!hasMore && products.length > 0 && (
          <p className="text-sm text-brand-muted">
            {locale === "ar" 
              ? `عرض جميع المنتجات (${products.length})` 
              : `Showing all ${products.length} products`}
          </p>
        )}
      </div>
    </div>
  );
}
