"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ProductListing } from "@/components/shop/ProductListing";
import type { WCProduct, WCProductsResponse } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

const PER_PAGE = 30;
const LOAD_AHEAD_MARGIN = "1200px 0px";

interface FeaturedProductsClientProps {
  products: WCProduct[];
  locale: Locale;
  initialTotal?: number;
  initialTotalPages?: number;
  giftProductIds?: number[];
  bundleProductSlugs?: string[];
}

export function FeaturedProductsClient({
  products: initialProducts,
  locale,
  initialTotal = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialTotalPages = 1,
  giftProductIds = [],
  bundleProductSlugs = [],
}: FeaturedProductsClientProps) {
  const [products, setProducts] = useState<WCProduct[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(initialTotal);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
    setHasMore(initialProducts.length < initialTotal);
    isInitialMount.current = false;
  }, [initialProducts, initialTotal, locale]);

  const loadMoreProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    try {
      const response = await fetch(
        `/api/products?featured=true&page=${nextPage}&per_page=${PER_PAGE}&locale=${locale}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data: WCProductsResponse = await response.json();

      if (data.products.length === 0) {
        setHasMore(false);
      } else {
        const filteredNewProducts = data.products.filter(
          (product: WCProduct) => !giftProductIds.includes(product.id)
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
        const adjustedTotal = data.total - (data.products.length - filteredNewProducts.length);
        setTotal(adjustedTotal);
        setHasMore(uniqueProducts.length < adjustedTotal);
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, currentPage, products, locale, giftProductIds]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
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
  }, [hasMore, isLoading, loadMoreProducts]);

  return (
    <div>
      <ProductListing
        products={products}
        locale={locale}
        showToolbar={true}
        bundleProductSlugs={bundleProductSlugs}
      />

      <div ref={loadMoreRef} className="flex min-h-12 justify-center py-5">
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="h-5 w-5 animate-spin"
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

        {!hasMore && products.length > 0 && (
          <p className="text-sm text-gray-500">
            {locale === "ar"
              ? `عرض جميع المنتجات (${total})`
              : `Showing all ${total} products`}
          </p>
        )}
      </div>
    </div>
  );
}
