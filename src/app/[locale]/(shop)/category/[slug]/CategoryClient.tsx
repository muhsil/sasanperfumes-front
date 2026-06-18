"use client";

import { ProductListing } from "@/components/shop/ProductListing";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

interface CategoryClientProps {
  products: WCProduct[];
  locale: Locale;
  toolbarTitle?: string;
  bundleProductSlugs?: string[];
}

export function CategoryClient({ products, locale, toolbarTitle, bundleProductSlugs = [] }: CategoryClientProps) {
  return (
    <ProductListing
      products={products}
      locale={locale}
      toolbarTitle={toolbarTitle}
      showToolbar={true}
      bundleProductSlugs={bundleProductSlugs}
    />
  );
}
