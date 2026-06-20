"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { ProductListing } from "@/components/shop/ProductListing";
import { searchProducts, type SearchSuggestion } from "@/lib/api/search";
import { trackAnalyticsEvent } from "@/lib/utils/analytics";
import { cn } from "@/lib/utils";
import type { Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface SearchResultsClientProps {
  locale: Locale;
  initialQuery: string;
  hiddenGiftProductIds?: number[];
  bundleProductSlugs?: string[];
}

const translations = {
  en: {
    searchResults: "search",
    resultsFor: "results for",
    noResults: "No products found",
    noResultsDesc: "We couldn't find any products matching your search.",
    tryDifferent: "Try different keywords or browse the shop.",
    searchPlaceholder: "Search for products...",
    productsFound: "products found",
    productFound: "product found",
    browseAll: "Browse all products",
    backToShop: "Back to shop",
    startSearching: "Start searching",
    startSearchingDesc: "Enter a search term to find products.",
  },
  ar: {
    searchResults: "\u0627\u0644\u0628\u062d\u062b",
    resultsFor: "\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b \u0639\u0646",
    noResults: "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0646\u062a\u062c\u0627\u062a",
    noResultsDesc: "\u0644\u0645 \u0646\u062a\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0623\u064a \u0645\u0646\u062a\u062c\u0627\u062a \u062a\u0637\u0627\u0628\u0642 \u0628\u062d\u062b\u0643.",
    tryDifferent: "\u062c\u0631\u0628 \u0643\u0644\u0645\u0627\u062a \u0645\u062e\u062a\u0644\u0641\u0629 \u0623\u0648 \u062a\u0635\u0641\u062d \u0627\u0644\u0645\u062a\u062c\u0631.",
    searchPlaceholder: "\u0627\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a...",
    productsFound: "\u0645\u0646\u062a\u062c\u0627\u062a",
    productFound: "\u0645\u0646\u062a\u062c",
    browseAll: "\u062a\u0635\u0641\u062d \u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    backToShop: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0645\u062a\u062c\u0631",
    startSearching: "\u0627\u0628\u062f\u0623 \u0627\u0644\u0628\u062d\u062b",
    startSearchingDesc: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0628\u062d\u062b \u0644\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a.",
  },
};

export function SearchResultsClient({
  locale,
  initialQuery,
  hiddenGiftProductIds = [],
  bundleProductSlugs = [],
}: SearchResultsClientProps) {
  const marketPrefix = useMarketPrefix();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [didYouMean, setDidYouMean] = useState<SearchSuggestion | null>(null);
  const [matchMode, setMatchMode] = useState<"exact" | "fuzzy" | "fallback">("fallback");
  const lastTrackedQueryRef = useRef("");
  const isRTL = locale === "ar";
  const t = translations[locale];

  const fetchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setDidYouMean(null);
      setMatchMode("fallback");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await searchProducts({
        query: searchQuery,
        perPage: 40,
        locale,
      });

      const filteredProducts = response.products.filter((product) => !hiddenGiftProductIds.includes(product.id));
      setProducts(filteredProducts);
      setDidYouMean(response.didYouMean);
      setMatchMode(response.matchMode);

      if (lastTrackedQueryRef.current !== response.query) {
        trackAnalyticsEvent("site_search", {
          search_term: response.query,
          results_count: filteredProducts.length,
          total_results: response.total,
          match_mode: response.matchMode,
          did_you_mean: response.didYouMean?.label || "",
          locale,
        });
        lastTrackedQueryRef.current = response.query;
      }
    } catch (error) {
      console.error("Search error:", error);
      setProducts([]);
      setDidYouMean(null);
      setMatchMode("fallback");
    } finally {
      setLoading(false);
    }
  }, [hiddenGiftProductIds, locale]);

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    setQuery(nextQuery);
    setInputValue(nextQuery);
    fetchProducts(nextQuery);
  }, [fetchProducts, searchParams]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim()) {
      router.push(`${marketPrefix}/${locale}/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handleClearSearch = () => {
    setInputValue("");
    router.push(`${marketPrefix}/${locale}/search`);
  };

  const showSuggestion = Boolean(query && didYouMean && matchMode !== "exact");

  return (
    <div className="min-h-screen bg-[#f8f3ef] text-brand-primary" dir={isRTL ? "rtl" : "ltr"}>
      <section className="px-4 pb-10 pt-12 md:pb-12 md:pt-16">
        <h1 className="max-w-[900px] text-[24px] font-normal leading-tight tracking-normal md:text-[32px] lg:text-[38px]">
          {query ? (
            <>
              {t.resultsFor} &ldquo;{query}&rdquo;
            </>
          ) : (
            t.searchResults
          )}
        </h1>

        <form onSubmit={handleSearch} className="mt-8 max-w-[620px]">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={t.searchPlaceholder}
              className={cn(
                "h-[52px] w-full rounded-full border border-[#3b2424] bg-transparent text-[15px] font-normal tracking-normal text-brand-primary placeholder:text-brand-primary/45 focus:outline-none focus:ring-1 focus:ring-brand-primary",
                isRTL ? "pr-12 pl-12" : "pl-12 pr-12"
              )}
            />
            <Search className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 text-brand-primary", isRTL ? "right-5" : "left-5")} />
            {inputValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={cn("absolute top-1/2 -translate-y-1/2 p-2 text-brand-primary/55 transition-opacity hover:opacity-70", isRTL ? "left-3" : "right-3")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {!loading && showSuggestion && didYouMean && (
          <div className="mt-4 rounded-2xl border border-brand-border/70 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-brand-primary/70">
              {isRTL ? "هل تقصد" : "Did you mean"}{" "}
              <Link
                href={`${marketPrefix}/${locale}/product/${didYouMean.slug}`}
                className="font-semibold text-brand-primary underline decoration-brand-gold decoration-2 underline-offset-4 transition-colors hover:text-brand-primary-dark"
              >
                {didYouMean.label}
              </Link>
              ?
            </p>
          </div>
        )}

        {query && !loading && (
          <p className="mt-4 text-[13px] font-normal tracking-normal text-brand-primary/70">
            {products.length} {products.length === 1 ? t.productFound : t.productsFound}
          </p>
        )}
      </section>

      {query && products.length > 0 && (
        <div className="px-4 pb-4">
          <Link
            href={`${marketPrefix}/${locale}/shop`}
            className="inline-flex items-center gap-2 text-[13px] font-normal tracking-normal text-brand-primary/70 transition-opacity hover:opacity-70"
          >
            <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
            {t.backToShop}
          </Link>
        </div>
      )}

      {loading && (
        <div className="px-4 py-8">
          <ProductGridSkeleton count={12} columns={6} />
        </div>
      )}

      {!loading && !query && (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Search className="mb-5 h-10 w-10 text-brand-primary/35" />
          <h2 className="mb-2 text-2xl font-normal tracking-normal text-brand-primary">{t.startSearching}</h2>
          <p className="mb-8 max-w-md text-sm leading-6 tracking-normal text-brand-primary/60">{t.startSearchingDesc}</p>
          <Link
            href={`${marketPrefix}/${locale}/shop`}
            className="inline-flex items-center justify-center rounded-full border border-brand-primary px-8 py-3 text-[13px] font-normal tracking-normal text-brand-primary transition-colors hover:bg-white"
          >
            {t.browseAll}
          </Link>
        </div>
      )}

      {!loading && query && products.length === 0 && (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Search className="mb-5 h-10 w-10 text-brand-primary/35" />
          <h2 className="mb-2 text-2xl font-normal tracking-normal text-brand-primary">{t.noResults}</h2>
          <p className="mb-2 max-w-md text-sm leading-6 tracking-normal text-brand-primary/60">{t.noResultsDesc}</p>
          <p className="mb-8 text-sm tracking-normal text-brand-primary/45">{t.tryDifferent}</p>
          {didYouMean && (
            <Link
              href={`${marketPrefix}/${locale}/product/${didYouMean.slug}`}
              className="mb-4 inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-primary-dark"
            >
              {isRTL ? "اذهب إلى المنتج المقترح" : `Try "${didYouMean.label}"`}
            </Link>
          )}
          <Link
            href={`${marketPrefix}/${locale}/shop`}
            className="inline-flex items-center justify-center rounded-full border border-brand-primary px-8 py-3 text-[13px] font-normal tracking-normal text-brand-primary transition-colors hover:bg-white"
          >
            {t.browseAll}
          </Link>
        </div>
      )}

      {!loading && query && products.length > 0 && (
        <ProductListing
          products={products}
          locale={locale}
          showToolbar
          bundleProductSlugs={bundleProductSlugs}
        />
      )}
    </div>
  );
}
