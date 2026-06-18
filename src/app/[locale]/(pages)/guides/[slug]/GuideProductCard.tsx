"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Heart, Check } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { cn, decodeHtmlEntities, BLUR_DATA_URL } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/utils/haptics";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

interface GuideProductCardProps {
  product: WCProduct;
  rank: number;
  pickReason: string;
  description: string;
  locale: Locale;
  productSlug: string;
}

export function GuideProductCard({
  product,
  rank,
  pickReason,
  description,
  locale,
  productSlug,
}: GuideProductCardProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId } =
    useWishlist();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const isRTL = locale === "ar";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, 1);
      setIsAddedToCart(true);
      setTimeout(() => setIsAddedToCart(false), 1500);
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
    triggerHaptic();

    if (!isAuthenticated) {
      router.push(`/${locale}/login`);
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

  const mainImage = product.images[0];
  const isOutOfStock = !product.is_in_stock;
  const isBestseller = product.tags?.some((tag) => tag.slug === "bestseller");
  const priceSourceCurrency = product.prices.currency_code;

  return (
    <article className="group overflow-hidden border border-[#e7ded7] bg-white">
      {/* Mobile: Compact horizontal layout */}
      <div className="flex flex-col md:flex-row">
        {/* Rank Badge + Image */}
        <div className="relative w-full md:w-80 lg:w-96 shrink-0">
          {/* Rank Number */}
          <div
            className={cn(
              "absolute top-3 z-10 flex h-8 w-8 items-center justify-center bg-brand-primary text-sm font-normal text-white md:top-4 md:h-10 md:w-10 md:text-lg",
              isRTL ? "right-3 md:right-4" : "left-3 md:left-4"
            )}
          >
            {rank}
          </div>

          {/* Badges */}
          <div
            className={cn(
              "absolute top-12 z-10 flex flex-col gap-1 md:top-16 md:gap-1.5",
              isRTL ? "right-3 items-end md:right-4" : "left-3 items-start md:left-4"
            )}
          >
            {isBestseller && (
              <Badge variant="bestseller" className="shadow-sm text-[10px] md:text-xs">
                {isRTL ? "الأكثر مبيعاً" : "Bestseller"}
              </Badge>
            )}
            {product.on_sale && (
              <Badge variant="error" className="shadow-sm text-[10px] md:text-xs">
                {isRTL ? "تخفيض" : "Sale"}
              </Badge>
            )}
          </div>

          <Link
            href={`/${locale}/product/${productSlug}`}
            className="block"
          >
            <div className="relative aspect-[4/3] overflow-hidden sm:aspect-square md:aspect-[4/5]">
              {mainImage && !imageError ? (
                <Image
                  src={mainImage.src}
                  alt={mainImage.alt || product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="h-full bg-gray-100" aria-hidden="true" />
              )}
            </div>
          </Link>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 md:p-8">
          <div>
            {/* Pick Reason / Award */}
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-beige px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-brand-primary sm:mb-3 sm:gap-2 sm:px-3 sm:text-xs">
              <span className="h-1 w-1 rounded-full bg-brand-gold sm:h-1.5 sm:w-1.5" />
              {pickReason}
            </div>

            {/* Product Name */}
            <Link href={`/${locale}/product/${productSlug}`}>
              <h3 className="mb-1 text-lg font-bold text-brand-primary transition-colors hover:text-brand-primary sm:mb-2 sm:text-xl md:text-2xl">
                {decodeHtmlEntities(product.name)}
              </h3>
            </Link>

            {/* Category */}
            {product.categories?.[0] && (
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-brand-gold sm:mb-3 sm:text-xs">
                {decodeHtmlEntities(product.categories[0].name)}
              </p>
            )}

            {/* Editorial Description */}
            <p className="mb-3 text-sm leading-relaxed text-brand-primary/80 sm:mb-4 sm:text-base">
              {description}
            </p>
          </div>

          {/* Price + Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-brand-primary/15 pt-3 sm:gap-4 sm:pt-4">
            {/* Price */}
            <div className="flex items-center gap-2">
              {product.on_sale ? (
                <>
                  <FormattedPrice
                    price={
                      parseInt(product.prices.price) /
                      Math.pow(10, product.prices.currency_minor_unit)
                    }
                    sourceCurrency={priceSourceCurrency}
                    className="text-lg font-bold text-brand-primary"
                    iconSize="sm"
                  />
                  <FormattedPrice
                    price={
                      parseInt(product.prices.regular_price) /
                      Math.pow(10, product.prices.currency_minor_unit)
                    }
                    sourceCurrency={priceSourceCurrency}
                    className="text-sm text-gray-400"
                    iconSize="xs"
                    strikethrough
                  />
                </>
              ) : (
                <FormattedPrice
                  price={
                    parseInt(product.prices.price) /
                    Math.pow(10, product.prices.currency_minor_unit)
                  }
                  sourceCurrency={priceSourceCurrency}
                  className="text-lg font-bold text-brand-primary"
                  iconSize="sm"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isOutOfStock && product.is_purchasable && (
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:px-6 sm:py-2.5 sm:text-sm",
                    isAddedToCart
                      ? "bg-green-500 text-white"
                      : "bg-brand-gold text-white hover:bg-brand-primary"
                  )}
                >
                  {isAddedToCart ? (
                    <>
                      <Check className="h-4 w-4" />
                      {isRTL ? "تمت الإضافة!" : "Added!"}
                    </>
                  ) : (
                    <>
                      <ShoppingBag
                        className={cn(
                          "h-4 w-4",
                          isAddingToCart && "animate-pulse"
                        )}
                      />
                      {isAddingToCart
                        ? isRTL
                          ? "جاري الإضافة..."
                          : "Adding..."
                        : isRTL
                          ? "أضف للسلة"
                          : "Add to Cart"}
                    </>
                  )}
                </button>
              )}

              {isOutOfStock && (
                <span className="text-sm font-medium text-gray-400">
                  {isRTL ? "غير متوفر" : "Out of Stock"}
                </span>
              )}

              <button
                onClick={handleWishlistToggle}
                disabled={isAddingToWishlist}
                className={cn(
                  "rounded-full p-2.5 transition-all duration-300",
                  isWishlisted
                    ? "bg-brand-gold/10 text-brand-gold"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  isAddingToWishlist && "opacity-50 cursor-not-allowed"
                )}
                aria-label={
                  isWishlisted
                    ? isRTL
                      ? "إزالة من المفضلة"
                      : "Remove from wishlist"
                    : isRTL
                      ? "أضف إلى المفضلة"
                      : "Add to wishlist"
                }
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isWishlisted && "fill-brand-primary"
                  )}
                />
              </button>
            </div>

            {/* View Product Link */}
            <Link
              href={`/${locale}/product/${productSlug}`}
              className="text-sm font-medium text-brand-gold underline-offset-4 transition-colors hover:text-brand-primary hover:underline"
            >
              {isRTL ? "عرض التفاصيل" : "View Details"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
