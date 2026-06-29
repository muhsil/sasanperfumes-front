"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Heart, GitCompare, Search, Check } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { ProductBadges } from "@/components/shop/ProductBadges";
import { DiscountBadge } from "@/components/shop/DiscountBadge";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useComparison } from "@/contexts/ComparisonContext";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import type { Product } from "@/types";
import type { Locale } from "@/config/site";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface ProductCardProps {
  product: Product;
  locale: Locale;
  className?: string;
  wcProduct?: { tags?: { slug: string }[]; sale_end?: string | null };
}

export function ProductCard({ product, locale, className, wcProduct }: ProductCardProps) {
  const marketPrefix = useMarketPrefix();
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const { addToCart, isLoading } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, isLoading: isWishlistLoading } = useWishlist();
  const { add: addToCompare, remove: removeFromCompare, has: inCompare, isFull } = useComparison();

  const isWishlisted = isInWishlist(product.databaseId);
  const isOutOfStock = product.stockStatus === "OUT_OF_STOCK";
  const isAr = locale === "ar";
  const labels = {
    noImage: isAr ? "\u0628\u062f\u0648\u0646 \u0635\u0648\u0631\u0629" : "No image",
    sale: isAr ? "\u062a\u062e\u0641\u064a\u0636" : "Sale",
    outOfStock: isAr ? "\u0646\u0641\u062f \u0627\u0644\u0645\u062e\u0632\u0648\u0646" : "Out of Stock",
    adding: isAr ? "..." : "...",
    addToCart: isAr ? "\u0623\u0636\u0641 \u0644\u0644\u0633\u0644\u0629" : "Add to cart",
    chooseOptions: isAr ? "\u0627\u062e\u062a\u0631 \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a" : "Choose options",
    options: isAr ? "\u062e\u064a\u0627\u0631\u0627\u062a" : "options",
    removeWishlist: isAr ? "\u0625\u0632\u0627\u0644\u0629" : "Remove",
    addWishlist: isAr ? "\u0645\u0641\u0636\u0644\u0629" : "Wishlist",
    removeCompare: isAr ? "\u0625\u0632\u0627\u0644\u0629" : "Remove",
    addCompare: isAr ? "\u0645\u0642\u0627\u0631\u0646\u0629" : "Compare",
    quickView: isAr ? "\u0646\u0638\u0631\u0629 \u0633\u0631\u064a\u0639\u0629" : "Quick view",
  };

  const productHref = `${marketPrefix}/${locale}/product/${product.slug}`;
  const productName = decodeHtmlEntities(product.name);
  const variationAttributes = product.attributes.nodes.filter((attribute) => attribute.variation && attribute.options.length > 0);
  const variationTerms = variationAttributes.flatMap((attribute) =>
    attribute.options.map((option) => decodeHtmlEntities(option))
  );
  const visibleVariationTerms = variationTerms.slice(0, 3);
  const extraVariationCount = Math.max(variationTerms.length - visibleVariationTerms.length, 0);
  const hasVariations = Boolean(product.variations?.nodes.length) || variationAttributes.length > 0;

  const saleEnd = product.sale_end ?? wcProduct?.sale_end ?? null;

  const comparisonProduct = {
    id: product.databaseId,
    name: product.name,
    slug: product.slug,
    images: product.image ? [{ id: 0, src: product.image.sourceUrl, thumbnail: product.image.sourceUrl, srcset: "", sizes: "", name: "", alt: product.image.altText }] : [],
    prices: { price: "0", regular_price: "0", sale_price: "0", price_range: null, currency_code: "AED", currency_symbol: "AED", currency_minor_unit: 2, currency_decimal_separator: ".", currency_thousand_separator: ",", currency_prefix: "", currency_suffix: "" },
    on_sale: product.onSale,
    is_in_stock: !isOutOfStock,
    average_rating: "",
    review_count: 0,
    tags: [],
    brands: [],
    categories: [],
    attributes: [],
    variations: [],
    grouped_products: [],
    has_options: false,
    is_purchasable: !isOutOfStock,
    catalog_visibility: "visible" as const,
    is_on_backorder: false,
    low_stock_remaining: null,
    stock_availability: { text: "", class: "" },
    sold_individually: false,
    add_to_cart: { text: "", description: "", url: "", single_text: "", minimum: 1, maximum: 9999, multiple_of: 1 },
    extensions: {},
    type: "simple" as const,
    variation: "",
    permalink: "",
    sku: product.sku || "",
    short_description: product.shortDescription || "",
    description: product.description || "",
    price_html: "",
    parent: 0,
  };
  const isInCompare = inCompare(product.databaseId);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.databaseId);
    setIsAddedToCart(true);
    window.setTimeout(() => setIsAddedToCart(false), 1800);
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisted) {
      await removeFromWishlist(product.databaseId);
    } else {
      await addToWishlist(product.databaseId);
    }
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInCompare) {
      removeFromCompare(product.databaseId);
    } else if (!isFull) {
      addToCompare(comparisonProduct as Parameters<typeof addToCompare>[0]);
    }
  };
  return (
    <article className={cn("group flex h-full flex-col", className)}>
      <div className="flex h-full flex-col overflow-hidden border-r border-b border-[#e7ded7] bg-transparent shadow-[0_4px_20px_rgba(74,22,51,0.06)]">
        {/* Image */}
        <div className="relative">
          <Link href={productHref} className="block" aria-label={productName}>
            <div className="relative aspect-[4/5] overflow-hidden bg-[#F8F5F0]">
              {product.image ? (
                <Image
                  src={product.image.sourceUrl}
                  alt={product.image.altText || product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-beige">
                  <span className="!text-xs font-medium uppercase tracking-[0.16em] text-brand-primary/40">
                    {labels.noImage}
                  </span>
                </div>
              )}
            </div>
          </Link>

          {/* Badges */}
          <div className={cn("absolute top-3 flex max-w-[60%] flex-col gap-1", isAr ? "right-3 items-end" : "left-3 items-start")}>
            <ProductBadges
              tags={product.tags ?? wcProduct?.tags}
              locale={locale}
              onSale={product.onSale}
              outOfStock={isOutOfStock}
              className={cn("flex-col flex-nowrap", isAr ? "items-end" : "items-start")}
            />
            <DiscountBadge
              productId={product.databaseId}
              className="inline-flex items-center rounded-sm border px-2 py-0.5 !text-[9px] font-bold uppercase leading-tight tracking-[0.12em] shadow-sm"
            />
          </div>

          {/* Hover icons — top right */}
          <div className={cn("absolute top-3 flex flex-col gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100", isAr ? "left-3" : "right-3")}>
            <Link
              href={productHref}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-brand-primary shadow-md backdrop-blur-sm transition-all hover:bg-brand-primary hover:text-white hover:scale-110"
              aria-label={labels.quickView}
            >
              <Search className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleWishlistToggle}
              disabled={isWishlistLoading}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/10 bg-white/95 text-brand-primary shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-brand-primary hover:text-white",
                isWishlisted && "border-brand-primary bg-brand-primary text-white",
                isWishlistLoading && "opacity-50"
              )}
              aria-label={isWishlisted ? labels.removeWishlist : labels.addWishlist}
            >
              <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={handleCompareToggle}
              disabled={!isInCompare && isFull}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/10 bg-white/95 text-brand-primary shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-brand-primary hover:text-white disabled:opacity-50",
                isInCompare && "border-brand-primary bg-brand-primary text-white"
              )}
              aria-label={isInCompare ? labels.removeCompare : labels.addCompare}
            >
              <GitCompare className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add button — bottom corner */}
          {hasVariations ? (
            <Link
              href={productHref}
              className={cn(
                "absolute bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-primary shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100 hover:scale-110 hover:bg-brand-primary hover:text-white",
                isAr ? "left-3" : "right-3"
              )}
              aria-label={labels.chooseOptions}
            >
              <Plus className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isLoading}
              className={cn(
                "absolute bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-primary shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100 hover:scale-110 hover:bg-brand-primary hover:text-white disabled:opacity-50",
                isAr ? "left-3" : "right-3"
              )}
              aria-label={labels.addToCart}
            >
              {isAddedToCart ? <Check className="h-4 w-4" /> : <Plus className={cn("h-4 w-4", isLoading && "animate-pulse")} />}
            </button>
          )}

        </div>

        {/* Info */}
        <div className="relative flex min-h-20 flex-1 items-center justify-center overflow-hidden p-2 text-center">
          <div className="flex w-full flex-col items-center">
          {/* Variation terms */}
          <div className="w-full mb-0">
            {hasVariations && visibleVariationTerms.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {visibleVariationTerms.map((term) => (
                  <span key={term} className="max-w-20 truncate rounded-sm bg-brand-beige px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-primary/60">
                    {term}
                  </span>
                ))}
                {extraVariationCount > 0 && (
                  <span className="rounded-sm bg-brand-primary px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    +{extraVariationCount}
                  </span>
                )}
              </div>
            )}
          </div>

          <Link href={productHref} className="block w-full">
            <h3 className="line-clamp-2 text-[12px] font-bold leading-tight text-brand-primary-dark">
              {productName}
            </h3>
          </Link>

          {product.onSale && saleEnd && (
            <div className="mt-1">
              <CountdownTimer endDate={saleEnd} locale={locale} compact />
            </div>
          )}

          <div className="mt-0.5 w-full">
            <div className="flex flex-wrap items-center justify-center gap-1">
              {product.onSale && product.salePrice ? (
                <>
                  <FormattedPrice price={product.salePrice} className="text-xs font-bold text-brand-primary" iconSize="xs" />
                  <FormattedPrice price={product.regularPrice} className="text-[11px] font-medium text-brand-primary/35" iconSize="xs" strikethrough />
                </>
              ) : (
                <FormattedPrice price={product.price} className="text-xs font-bold text-brand-primary" iconSize="xs" />
              )}
            </div>
          </div>
          </div>

          {/* Add to Cart button hidden on hover */}
        </div>
      </div>
    </article>
  );
}
