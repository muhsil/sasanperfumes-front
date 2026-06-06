"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, X, ArrowRight, ArrowLeft } from "lucide-react";
import { createPortal } from "react-dom";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";
import { searchProducts, type SearchSuggestion } from "@/lib/api/search";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { cn, getProductSlugFromPermalink, decodeHtmlEntities } from "@/lib/utils";
import { useFreeGift } from "@/contexts/FreeGiftContext";

interface DesktopSearchDropdownProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function DesktopSearchDropdown({
  locale,
  dictionary,
}: DesktopSearchDropdownProps) {
  const router = useRouter();
  const { getFreeGiftProductIds } = useFreeGift();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [didYouMean, setDidYouMean] = useState<SearchSuggestion | null>(null);
  const [matchMode, setMatchMode] = useState<"exact" | "fuzzy" | "fallback">("fallback");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRTL = locale === "ar";

  const resetSearchState = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setHighlightedIndex(-1);
    setLoading(false);
    setDidYouMean(null);
    setMatchMode("fallback");
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Small delay to allow portal to mount before animating in
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      document.body.style.overflow = "";
      setIsVisible(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && isVisible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Handle Escape key
  const handleClose = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    setIsVisible(false);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      resetSearchState();
      closeTimeoutRef.current = null;
    }, 300);
  }, [resetSearchState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isOpen]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      setDidYouMean(null);
      setMatchMode("fallback");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await searchProducts({
        query: searchQuery,
        perPage: 6,
        locale,
      });
      setDidYouMean(response.didYouMean);
      setMatchMode(response.matchMode);
      const freeGiftIds = getFreeGiftProductIds();
      const filteredProducts = response.products.filter(
        (product) => !freeGiftIds.includes(product.id)
      );
      setResults(filteredProducts);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setDidYouMean(null);
      setMatchMode("fallback");
    } finally {
      setLoading(false);
    }
  }, [locale, getFreeGiftProductIds]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        handleSearch(query);
      }, 300);
    } else {
      setResults([]);
      setHasSearched(false);
      setDidYouMean(null);
      setMatchMode("fallback");
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, handleSearch]);

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsOpen(true);
    resetSearchState();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      handleClose();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          e.preventDefault();
          const selectedProduct = results[highlightedIndex];
          const productSlug = getProductSlugFromPermalink(selectedProduct.permalink, selectedProduct.slug);
          router.push(`/${locale}/product/${productSlug}`);
          handleClose();
        } else {
          handleSubmit();
        }
        break;
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setDidYouMean(null);
    setMatchMode("fallback");
    inputRef.current?.focus();
  };

  const handleProductClick = () => {
    handleClose();
  };

  const handleViewAllResults = () => {
    handleSubmit();
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 text-brand-primary transition-colors hover:text-brand-primary-dark"
        aria-label={dictionary.common.searchPlaceholder || "Search"}
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center overflow-y-auto bg-brand-ivory/95 backdrop-blur-md transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={handleClose}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          "absolute top-4 rounded-full border border-brand-border/70 bg-brand-ivory p-2 text-brand-muted transition-colors hover:bg-brand-primary hover:text-white md:top-6",
          isRTL ? "left-4 md:left-8" : "right-4 md:right-8"
        )}
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Search input container */}
      <div
        className={cn(
          "w-full max-w-2xl px-6 pt-20 pb-10 transition-all duration-300 md:pt-28",
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search
              className={cn(
                "absolute top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted",
                isRTL ? "right-5" : "left-5"
              )}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={dictionary.common.searchPlaceholder || "Search products..."}
              className={cn(
                "w-full rounded-full border border-brand-border/80 bg-brand-beige/70 py-4 text-base text-brand-primary placeholder:text-brand-muted shadow-sm transition-all focus:border-brand-primary/55 focus:bg-brand-ivory focus:outline-none focus:ring-2 focus:ring-brand-gold/15 md:py-5 md:text-lg",
                isRTL ? "pr-14 pl-14" : "pl-14 pr-14"
              )}
              dir={isRTL ? "rtl" : "ltr"}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-primary",
                  isRTL ? "left-4" : "right-4"
                )}
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {loading && (
              <Loader2
                className={cn(
                  "absolute top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-brand-muted",
                  isRTL ? "left-12" : "right-12"
                )}
              />
            )}
          </div>
        </form>

        {/* Search Results */}
        {query.trim().length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-2xl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-border border-t-brand-primary" />
                  <p className="text-sm text-brand-muted">
                    {isRTL ? "جاري البحث..." : "Searching..."}
                  </p>
                </div>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-brand-beige p-4">
                  <Search className="h-8 w-8 text-brand-muted" />
                </div>
                <p className="text-base font-semibold text-brand-primary">
                  {dictionary.common.noResults || "No products found"}
                </p>
                <p className="mt-1 text-sm text-brand-muted">
                  {isRTL
                    ? `لا توجد نتائج لـ "${query}"`
                    : `No results for "${query}"`
                  }
                </p>
                {didYouMean && matchMode !== "exact" && (
                  <Link
                    href={`/${locale}/product/${didYouMean.slug}`}
                    onClick={handleClose}
                    className="mt-4 inline-flex items-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                  >
                    {isRTL ? "هل تقصد" : "Try"} {didYouMean.label}
                  </Link>
                )}
                <p className="mt-3 text-xs text-brand-muted/70">
                  {isRTL
                    ? "جرب كلمات بحث مختلفة"
                    : "Try different search terms"
                  }
                </p>
              </div>
            ) : results.length > 0 ? (
              <div>
                {didYouMean && matchMode !== "exact" && (
                  <div className="border-b border-brand-border/70 bg-brand-beige/40 px-6 py-3 text-sm text-brand-primary/75">
                    {isRTL ? "هل تقصد" : "Did you mean"}{" "}
                    <Link
                      href={`/${locale}/product/${didYouMean.slug}`}
                      onClick={handleClose}
                      className="font-semibold text-brand-primary underline decoration-brand-gold decoration-2 underline-offset-4"
                    >
                      {didYouMean.label}
                    </Link>
                    ?
                  </div>
                )}
                <div className="border-b border-brand-border/70 bg-brand-beige/45 px-6 py-3">
                  <p className="text-[11px] font-semibold uppercase text-brand-muted">
                    {isRTL ? "المنتجات" : "Products"}
                  </p>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {results.map((product, index) => {
                    const productSlug = getProductSlugFromPermalink(product.permalink, product.slug);
                    return (
                      <Link
                        key={product.id}
                        href={`/${locale}/product/${productSlug}`}
                        onClick={handleProductClick}
                        className={cn(
                          "group flex items-center gap-5 px-6 py-5 transition-all hover:bg-brand-beige/60",
                          index !== results.length - 1 && "border-b border-brand-border/45",
                          highlightedIndex === index && "bg-brand-beige"
                        )}
                      >
                        {product.images[0]?.src ? (
                          <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-md bg-brand-beige">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.images[0].src}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-md bg-brand-beige">
                            <Search className="h-5 w-5 text-brand-muted" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 py-0.5">
                          {product.categories?.[0] && (
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-gold/80 truncate">
                              {decodeHtmlEntities(product.categories[0].name)}
                            </p>
                          )}
                          <h3 className="truncate text-sm font-semibold uppercase text-brand-primary">
                            {decodeHtmlEntities(product.name)}
                          </h3>
                          <div className="mt-1.5">
                            <FormattedPrice
                              price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
                              className="text-sm font-bold text-brand-primary"
                              iconSize="xs"
                            />
                          </div>
                          {product.attributes && product.attributes.length > 0 && (
                            <p className="mt-1.5 truncate text-[10px] leading-relaxed text-brand-muted">
                              {product.attributes.slice(0, 2).map((attr) =>
                                `${attr.name}: ${attr.terms?.map(t => t.name).join(", ")}`
                              ).join(" | ")}
                            </p>
                          )}
                        </div>
                        <ArrowIcon className="h-4 w-4 flex-shrink-0 text-brand-muted/45 transition-colors group-hover:text-brand-primary" />
                      </Link>
                    );
                  })}
                </div>

                {/* View All Results */}
                <div className="border-t border-brand-border/70 bg-brand-beige/45 p-5">
                  <button
                    type="button"
                    onClick={handleViewAllResults}
                    className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-primary px-5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-brand-primary-dark hover:shadow-lg"
                  >
                    <span>{dictionary.common.viewAllResults || "View all results"}</span>
                    <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Quick suggestions / empty state hint */}
        {!query.trim() && (
          <div className={cn(
            "mt-8 text-center transition-all duration-500",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}>
            <Search className="mx-auto mb-3 h-10 w-10 text-brand-muted/35" />
            <p className="text-sm text-brand-muted">
              {isRTL ? "اكتب للبحث عن منتجاتك المفضلة" : "Type to search for your favorite products"}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
