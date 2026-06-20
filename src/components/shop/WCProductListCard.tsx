"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Heart, Eye, Star } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { ProductBadges } from "@/components/shop/ProductBadges";
import { cn, decodeHtmlEntities, getProductSlugFromPermalink } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface WCProductListCardProps {
  product: WCProduct;
  locale: Locale;
  className?: string;
  bundleProductSlugs?: string[];
}

export function WCProductListCard({
  product,
  locale,
  className,
  bundleProductSlugs = [],
}: WCProductListCardProps) {
  const marketPrefix = useMarketPrefix();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId } = useWishlist();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const isRTL = locale === "ar";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, 1);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const isWishlisted = isInWishlist(product.id);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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

  const shortDescription = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, "").slice(0, 150)
    : "";

  // Use English slug from permalink to ensure consistent URLs across locales
  const productSlug = getProductSlugFromPermalink(product.permalink, product.slug);

  // Check if this product is a bundle product
  const isBundleProduct = bundleProductSlugs.includes(productSlug) || bundleProductSlugs.includes(product.slug);
  const extraBadgeSlugs: string[] = [];
  const priceSourceCurrency = product.prices.currency_code;

  return (
    <article className={cn("group relative", className)}>
      <Link
        href={`${marketPrefix}/${locale}/product/${productSlug}`}
        className="flex gap-4 rounded-lg border border-brand-border/70 bg-brand-ivory p-4 shadow-[0_16px_34px_rgba(20,15,10,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_22px_48px_rgba(20,15,10,0.12)] md:gap-6 md:p-6"
      >
        {/* Product Image */}
        <div className="relative h-40 w-32 flex-shrink-0 overflow-hidden rounded-md bg-brand-beige md:h-52 md:w-40">
          {mainImage ? (
            <Image
              src={mainImage.src}
              alt={mainImage.alt || product.name}
              fill
              sizes="160px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs text-brand-muted/40">{isRTL ? "لا توجد صورة" : "No image"}</span>
            </div>
          )}

          {/* Badges */}
          <div className={cn("absolute top-2 flex flex-col gap-1", isRTL ? "right-2 items-end" : "left-2 items-start")}>
            <ProductBadges
              tags={product.tags}
              locale={locale}
              onSale={product.on_sale}
              outOfStock={isOutOfStock}
              extraTagSlugs={extraBadgeSlugs}
              className={cn("flex-col flex-nowrap", isRTL ? "items-end" : "items-start")}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            {/* Category */}
            {product.categories?.[0] && (
              <p className="mb-1 text-[10px] font-semibold uppercase text-brand-gold">
                {decodeHtmlEntities(product.categories[0].name)}
              </p>
            )}

            {/* Name */}
            <h3 className="mb-2 text-sm font-semibold uppercase text-brand-primary md:text-base">
              {decodeHtmlEntities(product.name)}
            </h3>

            {reviewCount > 0 && (
              <div className={cn("mb-2 flex items-center gap-2 text-sm", isRTL && "flex-row-reverse justify-end")}>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3 w-3",
                        rating >= star ? "fill-brand-gold text-brand-gold" : "text-brand-primary/15"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-brand-primary/40">({reviewCount})</span>
              </div>
            )}

            {/* Description */}
            {shortDescription && (
              <p className="mb-3 hidden text-xs text-brand-muted line-clamp-2 md:block">
                {shortDescription}...
              </p>
            )}

            {/* Price */}
            <div className="flex items-center gap-2 text-sm md:text-base">
              {product.on_sale ? (
                <>
                  <FormattedPrice
                    price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
                    sourceCurrency={priceSourceCurrency}
                    className="font-medium text-brand-primary"
                    iconSize="xs"
                  />
                  <FormattedPrice
                    price={parseInt(product.prices.regular_price) / Math.pow(10, product.prices.currency_minor_unit)}
                    sourceCurrency={priceSourceCurrency}
                    className="text-brand-muted/50 line-through"
                    iconSize="xs"
                  />
                </>
              ) : (
                <FormattedPrice
                  price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
                  sourceCurrency={priceSourceCurrency}
                  className="font-medium text-brand-primary"
                  iconSize="xs"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            {isBundleProduct ? (
              <Link
                href={`${marketPrefix}/${locale}/product/${productSlug}`}
                className="inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-brand-ivory px-4 py-2 text-xs font-semibold uppercase text-brand-primary transition-all hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white"
              >
                <Eye className="h-3.5 w-3.5" />
                {isRTL ? "تخصيص" : "Customize"}
              </Link>
            ) : !isOutOfStock && product.is_purchasable && (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-brand-ivory px-4 py-2 text-xs font-semibold uppercase text-brand-primary transition-all disabled:opacity-50 hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white"
              >
                <ShoppingBag className={cn("h-3.5 w-3.5", isAddingToCart && "animate-pulse")} />
                {isRTL ? "أضف للسلة" : "Add to Cart"}
              </button>
            )}
            <button
              type="button"
              onClick={handleWishlistToggle}
              disabled={isAddingToWishlist}
              className={cn(
                "inline-flex items-center justify-center rounded-full border bg-brand-ivory p-2 transition-all hover:bg-brand-primary hover:text-white",
                isWishlisted
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-border/40 text-brand-primary hover:border-brand-border/60",
                isAddingToWishlist && "opacity-50"
              )}
              aria-label={isWishlisted ? (isRTL ? "إزالة من المفضلة" : "Remove from wishlist") : (isRTL ? "أضف إلى المفضلة" : "Add to wishlist")}
            >
              <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}
