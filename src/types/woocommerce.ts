// WooCommerce Store API Types
// Based on https://cms.shapehive.com/wp-json/wc/store/v1/

export interface WCProductImage {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  name: string;
  alt: string;
}

export interface WCProductCategory {
  id: number;
  name: string;
  slug: string;
  link: string;
}

export interface WCProductPrices {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: {
    min_amount: string;
    max_amount: string;
  } | null;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WCProductAttribute {
  id: number;
  name: string;
  taxonomy: string;
  has_variations: boolean;
  terms: {
    id: number;
    name: string;
    slug: string;
  }[];
}

export interface WCProductVariation {
  id: number;
  attributes: {
    name: string;
    value: string;
  }[];
  image?: {
    src: string;
    alt?: string;
  };
  prices?: WCProductPrices;
  price?: string;
  sale_price?: string;
  regular_price?: string;
  sku?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  stock_quantity?: number | null;
  low_stock_remaining?: number | null;
  purchasable?: boolean;
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: "simple" | "variable" | "grouped" | "external";
  variation: string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: WCProductPrices;
  price_html: string;
  average_rating: string;
  review_count: number;
  images: WCProductImage[];
  categories: WCProductCategory[];
  tags: { id: number; name: string; slug: string }[];
  brands: { id: number; name: string; slug: string }[];
  attributes: WCProductAttribute[];
  variations: WCProductVariation[];
  grouped_products: number[];
  has_options: boolean;
  is_purchasable: boolean;
  is_in_stock: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  is_on_backorder: boolean;
  low_stock_remaining: number | null;
  stock_availability: {
    text: string;
    class: string;
  };
  sold_individually: boolean;
  add_to_cart: {
    text: string;
    description: string;
    url: string;
    single_text: string;
    minimum: number;
    maximum: number;
    multiple_of: number;
  };
  extensions: Record<string, unknown>;
  sale_end?: string | null;
  sale_start?: string | null;
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image: WCProductImage | null;
  review_count: number;
  permalink: string;
}

export interface WCProductsResponse {
  products: WCProduct[];
  total: number;
  totalPages: number;
}

export interface WCCategoriesResponse {
  categories: WCCategory[];
}

/**
 * Lightweight product type for product listings
 * Contains fields needed for ProductCard/ProductListCard components
 * Mirrors WCProduct shape so cards can render without crashing
 */
export interface WCProductLightweight {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  short_description: string;
  on_sale: boolean;
  type: string;
  has_options: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_minor_unit: number;
    currency_decimal_separator?: string;
    currency_thousand_separator?: string;
    currency_prefix?: string;
    currency_suffix?: string;
    price_range: { min_amount: string; max_amount: string } | null;
  };
  images: WCProductImage[];
  categories: WCProductCategory[];
  tags: { id: number; name: string; slug: string }[];
  brands: { id: number; name: string; slug: string }[];
  attributes: WCProductAttribute[];
  variations: WCProductVariation[];
  average_rating: string;
  review_count: number;
  is_in_stock: boolean;
  is_purchasable: boolean;
}

export interface WCProductsLightweightResponse {
  products: WCProductLightweight[];
  total: number;
  totalPages: number;
}
