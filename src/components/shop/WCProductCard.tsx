"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Heart, Search, Check, Star } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { ProductBadges } from "@/components/shop/ProductBadges";
import { DiscountBadge } from "@/components/shop/DiscountBadge";
import { cn, decodeHtmlEntities, getProductSlugFromPermalink, BLUR_DATA_URL } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/utils/haptics";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

const RATING_STARS = [1, 2, 3, 4, 5];
const QuickViewModal = dynamic(() => import("./QuickViewModal").then((mod) => mod.QuickViewModal), {
  ssr: false,
});

interface WCProductCardProps {
  product: WCProduct;
  locale: Locale;
  className?: string;
  bundleProductSlugs?: string[];
  englishSlug?: string;
  productNameLines?: 1 | 2;
}

export function WCProductCard({
  product,
  locale,
  className,
  bundleProductSlugs = [],
  englishSlug,
  productNameLines = 2,
}: WCProductCardProps) {
  const marketPrefix = useMarketPrefix();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId } = useWishlist();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const prefetchedHrefRef = useRef<string | null>(null);
  const isRTL = locale === "ar";

  const labels = {
    outOfStock: isRTL ? "غير متوفر" : "Out of Stock",
    removeWishlist: isRTL ? "إزالة من المفضلة" : "Remove from wishlist",
    addWishlist: isRTL ? "أضف إلى المفضلة" : "Add to wishlist",
    customize: isRTL ? "تخصيص" : "Customize",
    chooseOptions: isRTL ? "اختر الخيارات" : "Choose options",
    addToCart: isRTL ? "أضف للسلة" : "Add to cart",
    added: isRTL ? "تم!" : "Added!",
    adding: isRTL ? "..." : "...",
    quickView: isRTL ? "نظرة سريعة" : "Quick view",
    from: isRTL ? "من " : "From ",
  };

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, 1);
      setIsAddedToCart(true);
      setTimeout(() => setIsAddedToCart(false), 1800);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAddingToCart(false);
    }
  }, [addToCart, product.id]);

  const isWishlisted = isInWishlist(product.id);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    if (!isAuthenticated) {
      router.push(`${marketPrefix}/${locale}/login`);
      return;
    }
    setIsAddingToWishlist(true);
    try {
      if (isWishlisted) {
        const itemId = getWishlistItemId(product.id);
        await removeFromWishlist(product.id, itemId);
      } else {
        await addToWishlist(product.id);
      }
    } catch (error) {
      console.error("Failed to update wishlist:", error);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const isOutOfStock = !product.is_in_stock;
  const mainImage = product.images[0];
  const rating = Number(product.average_rating || 0);
  const reviewCount = Number(product.review_count || 0);

  const productSlug = englishSlug || getProductSlugFromPermalink(product.permalink, product.slug);
  const isBundleProduct = bundleProductSlugs.includes(productSlug) || bundleProductSlugs.includes(product.slug);
  const productHref = `${marketPrefix}/${locale}/product/${productSlug}`;
  const priceSourceCurrency = product.prices.currency_code;
  const prefetchProduct = useCallback(() => {
    if (prefetchedHrefRef.current === productHref) return;
    prefetchedHrefRef.current = productHref;
    router.prefetch(productHref);
  }, [productHref, router]);
  const productName = decodeHtmlEntities(product.name);
  const extraBadgeSlugs: string[] = [];

  const priceDivider = Math.pow(10, product.prices.currency_minor_unit);
  const price = parseInt(product.prices.price || "0") / priceDivider;
  const regularPrice = parseInt(product.prices.regular_price || product.prices.price || "0") / priceDivider;
  const hasPrice = Number.isFinite(price) && price > 0;
  const canPurchase = !isOutOfStock && product.is_purchasable && hasPrice;

  const hasPriceRange = product.prices.price_range != null;
  const minPrice = hasPriceRange ? parseInt(product.prices.price_range!.min_amount) / priceDivider : price;
  const maxPrice = hasPriceRange ? parseInt(product.prices.price_range!.max_amount) / priceDivider : price;

  const variationAttributes = (product.attributes || []).filter((attribute) => attribute.has_variations && attribute.terms.length > 0);
  const variationTerms = variationAttributes.flatMap((attribute) =>
    attribute.terms.map((term) => decodeHtmlEntities(term.name))
  );
  const visibleVariationTerms = variationTerms.slice(0, 3);
  const extraVariationCount = Math.max(variationTerms.length - visibleVariationTerms.length, 0);
  const hasVariations = product.type === "variable" || product.has_options || (product.variations || []).length > 0 || variationAttributes.length > 0;

  const showAsVariable = hasVariations || isBundleProduct;
  const actionControlClassName =
    "flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-4 text-center !text-[11px] font-bold uppercase text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-brand-primary-dark disabled:opacity-50";

  const renderActionControl = (className?: string) => {
    if (showAsVariable) {
      return (
        <Link
          href={productHref}
          className={cn(actionControlClassName, className)}
        >
          {isBundleProduct ? labels.customize : labels.chooseOptions}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!canPurchase || isAddingToCart}
        className={cn(actionControlClassName, className)}
      >
        {isAddedToCart ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span className="!text-[11px]">{labels.added}</span>
          </>
        ) : isOutOfStock ? (
          <span className="!text-[11px]">{labels.outOfStock}</span>
        ) : !canPurchase ? (
          <span className="!text-[11px]">{isRTL ? "غير متاح" : "Unavailable"}</span>
        ) : (
          <>
            <Plus className={cn("h-3.5 w-3.5", isAddingToCart && "animate-pulse")} />
            <span className="!text-[11px]">{labels.addToCart}</span>
          </>
        )}
      </button>
    );
  };
  void renderActionControl;
  const quickActionClassName =
    "absolute inset-x-2 bottom-2 z-10 hidden h-9 items-center justify-center gap-1.5 rounded-md bg-brand-primary px-2 text-center text-[10px] font-bold uppercase text-white shadow-[0_12px_24px_rgba(20,15,10,0.22)] transition-all duration-300 hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:bg-brand-primary/70 sm:inset-x-3 sm:bottom-3 sm:flex sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100";

  return (
    <>
      <article className={cn("group flex h-full flex-col", className)}>
        <div className="flex h-full flex-col overflow-hidden rounded-md border border-brand-border/70 bg-white shadow-[0_8px_24px_rgba(20,15,10,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_16px_34px_rgba(20,15,10,0.1)]">
          {/* Image */}
          <div className="relative">
            <Link
              href={productHref}
              className="block"
              aria-label={productName}
              onFocus={prefetchProduct}
              onMouseEnter={prefetchProduct}
              onTouchStart={prefetchProduct}
            >
              <div className="relative aspect-square overflow-hidden bg-[#fbf8f4]">
                {mainImage && !imageError ? (
                  <Image
                    src={mainImage.src}
                    alt={mainImage.alt || product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="h-full bg-brand-beige" aria-hidden="true" />
                )}
              </div>
            </Link>

            {/* Badges */}
            <div className={cn("absolute top-2 flex max-w-[58%] flex-col gap-1 sm:top-3", isRTL ? "right-2 items-end sm:right-3" : "left-2 items-start sm:left-3")}>
              <ProductBadges
                tags={product.tags}
                locale={locale}
                onSale={product.on_sale}
                outOfStock={isOutOfStock}
                extraTagSlugs={extraBadgeSlugs}
                className={cn("flex-col flex-nowrap", isRTL ? "items-end" : "items-start")}
              />
              <DiscountBadge
                productId={product.id}
                categoryIds={product.categories?.map(c => c.id)}
                className="inline-flex items-center rounded-sm border px-2 py-0.5 !text-[9px] font-bold uppercase leading-tight tracking-[0.12em] shadow-sm"
              />
            </div>

            {/* Hover icons — top right */}
            <div className={cn("absolute top-2 flex flex-col gap-2 opacity-100 transition-all duration-300 sm:top-3 sm:opacity-0 sm:group-hover:opacity-100", isRTL ? "left-2 sm:left-3" : "right-2 sm:right-3")}>
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-brand-border/60 bg-white/95 text-brand-primary shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-brand-primary hover:text-white sm:flex"
                aria-label={labels.quickView}
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={isAddingToWishlist}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border border-brand-border/60 bg-white/95 text-brand-primary shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-brand-primary hover:text-white",
                  isWishlisted && "border-brand-primary bg-brand-primary text-white",
                  isAddingToWishlist && "opacity-50"
                )}
                aria-label={isWishlisted ? labels.removeWishlist : labels.addWishlist}
              >
                <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
              </button>
            </div>

            {/* Add button — bottom corner */}
            {showAsVariable ? (
              <Link
                href={productHref}
                onFocus={prefetchProduct}
                onMouseEnter={prefetchProduct}
                onTouchStart={prefetchProduct}
                className={quickActionClassName}
                aria-label={isBundleProduct ? labels.customize : labels.chooseOptions}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{isBundleProduct ? labels.customize : labels.chooseOptions}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canPurchase || isAddingToCart}
                className={quickActionClassName}
                aria-label={labels.addToCart}
              >
                {isAddedToCart ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{labels.added}</span>
                  </>
                ) : isOutOfStock ? (
                  <span className="truncate">{labels.outOfStock}</span>
                ) : !canPurchase ? (
                  <span className="truncate">{isRTL ? "غير متاح" : "Unavailable"}</span>
                ) : (
                  <>
                    <Plus className={cn("h-3.5 w-3.5 shrink-0", isAddingToCart && "animate-pulse")} />
                    <span className="truncate">{labels.addToCart}</span>
                  </>
                )}
              </button>
            )}

          </div>

          {/* Info */}
          <div className="relative flex min-h-[68px] flex-1 items-center justify-center overflow-hidden px-2 py-1.5 text-center sm:min-h-[82px] sm:px-3 sm:py-2">
            <div className="flex w-full flex-col items-center gap-0">
            {/* Variation terms */}
            {hasVariations && visibleVariationTerms.length > 0 && (
              <div className="hidden flex-wrap justify-center gap-1 sm:flex">
                {visibleVariationTerms.map((term) => (
                  <span key={term} className="max-w-20 truncate rounded-full bg-brand-beige px-2 py-0.5 text-[9px] font-semibold uppercase text-brand-primary/60">
                    {term}
                  </span>
                ))}
                {extraVariationCount > 0 && (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[9px] font-semibold text-white">
                    +{extraVariationCount}
                  </span>
                )}
              </div>
            )}

            <Link
              href={productHref}
              className="block w-full"
              onFocus={prefetchProduct}
              onMouseEnter={prefetchProduct}
              onTouchStart={prefetchProduct}
            >
              <h3 className={cn(
                "text-[12px] font-semibold leading-tight text-brand-primary-dark sm:text-sm",
                productNameLines === 1 ? "line-clamp-1" : "line-clamp-2"
              )}>
                {productName}
              </h3>
            </Link>

            {reviewCount > 0 && (
              <div className={cn("mt-0.5 flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                <div className="flex items-center gap-0.5">
                  {RATING_STARS.map((star) => (
                    <Star key={star} className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", rating >= star ? "fill-brand-gold text-brand-gold" : "text-brand-primary/15")} />
                  ))}
                </div>
                <span className="text-[10px] text-brand-primary/40">({reviewCount})</span>
              </div>
            )}

            {/* Price */}
            <div className={cn(reviewCount > 0 ? "mt-0.5" : "mt-0")}>
              {!hasPrice && !hasPriceRange ? (
                <span className="text-[11px] font-bold text-brand-primary/45 sm:text-xs">{isRTL ? "غير متاح" : "Unavailable"}</span>
              ) : showAsVariable && hasPriceRange && minPrice !== maxPrice ? (
                <div className="flex items-center justify-center gap-1">
                  <FormattedPrice price={minPrice} sourceCurrency={priceSourceCurrency} className="text-[11px] font-bold text-brand-primary sm:text-xs" iconSize="xs" />
                  <span className="text-xs text-brand-primary/40">–</span>
                  <FormattedPrice price={maxPrice} sourceCurrency={priceSourceCurrency} className="text-[11px] font-bold text-brand-primary sm:text-xs" iconSize="xs" />
                </div>
              ) : product.on_sale ? (
                <div className="flex items-center justify-center gap-1">
                  <FormattedPrice price={price} sourceCurrency={priceSourceCurrency} className="text-[11px] font-bold text-brand-primary sm:text-xs" iconSize="xs" />
                  <FormattedPrice price={regularPrice} sourceCurrency={priceSourceCurrency} className="text-[11px] font-medium text-brand-primary/35" iconSize="xs" strikethrough />
                </div>
              ) : (
                <FormattedPrice price={price} sourceCurrency={priceSourceCurrency} className="text-[11px] font-bold text-brand-primary sm:text-xs" iconSize="xs" />
              )}
              </div>
            </div>

            {/* Add to Cart button hidden on hover */}
          </div>
        </div>
      </article>

      {quickViewOpen && (
        <QuickViewModal
          product={product}
          locale={locale}
          isOpen={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
          englishSlug={englishSlug}
        />
      )}
    </>
  );
}
