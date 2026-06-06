import type { Locale } from "@/config/site";
import type { WCProductsResponse } from "@/types/woocommerce";

export interface SearchProductsParams {
  query: string;
  locale?: Locale;
  perPage?: number;
}

export interface SearchSuggestion {
  label: string;
  slug: string;
  productId: number;
  href?: string;
}

export interface SearchProductsResponse extends WCProductsResponse {
  query: string;
  didYouMean: SearchSuggestion | null;
  matchMode: "exact" | "fuzzy" | "fallback";
}

export async function searchProducts({
  query,
  locale,
  perPage = 12,
}: SearchProductsParams): Promise<SearchProductsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", query);
  searchParams.set("per_page", String(perPage));
  if (locale) {
    searchParams.set("locale", locale);
  }

  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Search API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<SearchProductsResponse>;
}
