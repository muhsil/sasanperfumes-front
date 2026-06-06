"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X, Search, Loader2 } from "lucide-react";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";
import { searchProducts, type SearchSuggestion } from "@/lib/api/search";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { getProductSlugFromPermalink, decodeHtmlEntities } from "@/lib/utils";
import { useFreeGift } from "@/contexts/FreeGiftContext";

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  dictionary: Dictionary;
}

export function SearchDrawer({
  isOpen,
  onClose,
  locale,
  dictionary,
}: SearchDrawerProps) {
  const router = useRouter();
  const { getFreeGiftProductIds } = useFreeGift();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [didYouMean, setDidYouMean] = useState<SearchSuggestion | null>(null);
  const [matchMode, setMatchMode] = useState<"exact" | "fuzzy" | "fallback">("fallback");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isRTL = locale === "ar";

  const resetSearchState = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setLoading(false);
    setDidYouMean(null);
    setMatchMode("fallback");
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
      // Filter out free gift products from search results
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      setHasSearched(false);
      setDidYouMean(null);
      setMatchMode("fallback");
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleClose = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    resetSearchState();
    onClose();
  }, [onClose, resetSearchState]);

  const handleViewAllResults = useCallback(() => {
    if (!query.trim()) {
      return;
    }

    router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
    handleClose();
  }, [handleClose, locale, query, router]);

  return (
    <MuiDrawer
      anchor="bottom"
      open={isOpen}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          width: "100%",
          maxHeight: "85vh",
          backgroundColor: "var(--color-ivory)",
          color: "var(--color-primary)",
          borderTop: "1px solid var(--color-border)",
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
          <div className="h-1 w-10 rounded-full bg-brand-border" />
        </div>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "var(--color-border)",
            px: 2,
            py: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Search className="h-5 w-5" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {dictionary.common.search}
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

        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder={dictionary.common.searchPlaceholder || "Search products..."}
                className="w-full rounded-full border border-brand-border/80 bg-brand-beige/70 px-5 py-3 pl-12 text-base text-brand-primary outline-none transition-all placeholder:text-brand-muted focus:border-brand-primary/55 focus:ring-2 focus:ring-brand-gold/15"
                autoFocus
              />
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
              {loading && (
                <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-brand-muted" />
              )}
            </div>
          </form>
        </div>

        <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 2 }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary" />
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="mb-4 h-12 w-12 text-brand-muted/45" />
              <p className="text-brand-muted">{dictionary.common.noResults || "No products found"}</p>
              {didYouMean && matchMode !== "exact" && (
                <Link
                  href={`/${locale}/product/${didYouMean.slug}`}
                  onClick={handleClose}
                  className="mt-4 inline-flex items-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                >
                  {isRTL ? "هل تقصد" : "Try"} {didYouMean.label}
                </Link>
              )}
            </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
              {didYouMean && matchMode !== "exact" && (
                <div className="mx-3 mt-3 rounded-lg border border-brand-border/70 bg-brand-beige/50 px-3 py-2 text-sm text-brand-primary/75">
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
              {results.map((product) => {
                const productSlug = getProductSlugFromPermalink(product.permalink, product.slug);
                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/product/${productSlug}`}
                    onClick={handleClose}
                    className="flex items-center gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-brand-border/60 hover:bg-brand-beige active:scale-[0.98]"
                  >
                    {product.images[0] ? (
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-brand-beige">
                        <Image
                          src={product.images[0].src}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-brand-beige">
                        <Search className="h-6 w-6 text-brand-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {product.categories?.[0] && (
                        <p className="truncate text-[10px] font-semibold uppercase text-brand-gold">
                          {decodeHtmlEntities(product.categories[0].name)}
                        </p>
                      )}
                      <h3 className="truncate font-semibold uppercase text-brand-primary">{decodeHtmlEntities(product.name)}</h3>
                      <FormattedPrice
                        price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
                        className="text-sm font-semibold text-brand-primary"
                        iconSize="xs"
                      />
                      {product.attributes && product.attributes.length > 0 && (
                        <p className="mt-0.5 truncate text-[10px] text-brand-muted">
                          {product.attributes.slice(0, 2).map((attr) => 
                            `${attr.name}: ${attr.terms?.map(t => t.name).join(", ")}`
                          ).join(" | ")}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
              
              {query.trim() && (
                <button
                  type="button"
                  onClick={handleViewAllResults}
                  className="mt-4 flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-3 font-semibold text-white transition-all hover:bg-brand-primary-dark active:scale-[0.98]"
                >
                  {dictionary.common.viewAllResults || "View all results"}
                </button>
              )}
            </div>
          ) : null}
        </Box>
      </Box>
    </MuiDrawer>
  );
}
