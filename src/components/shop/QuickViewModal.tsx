"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Heart, Check, Minus, Plus } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { ProductAddToCartButton } from "@/components/shop/ProductAddToCartButton";
import { cn, decodeHtmlEntities, BLUR_DATA_URL } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/utils/haptics";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

interface QuickViewModalProps {
  product: WCProduct;
  locale: Locale;
  isOpen: boolean;
  onClose: () => void;
  englishSlug?: string;
}

function sanitizeQuickViewDescription(html: string): string {
  if (!html) return "";

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:strong|b)[^>]*>/gi, "")
    .replace(/\/(?:strong|b)>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
}

export function QuickViewModal({ product, locale, isOpen, onClose, englishSlug }: QuickViewModalProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [variationError, setVariationError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId } = useWishlist();
  const { isAuthenticated } = useAuth();
  const isRTL = locale === "ar";

  const labels = {
    addToCart: isRTL ? "أضف للسلة" : "Add to Cart",
    adding: isRTL ? "جاري..." : "Adding...",
    added: isRTL ? "تم!" : "Added!",
    outOfStock: isRTL ? "غير متوفر" : "Out of Stock",
    viewDetails: isRTL ? "عرض التفاصيل" : "View Details",
    close: isRTL ? "إغلاق" : "Close",
    selectOptions: isRTL ? "اختر الخيارات" : "Select Options",
    wishlistAdd: isRTL ? "أضف للمفضلة" : "Add to Wishlist",
    wishlistRemove: isRTL ? "إزالة من المفضلة" : "Remove from Wishlist",
    pleaseSelect: isRTL ? "يرجى اختيار جميع الخيارات" : "Please select all options",
    qty: isRTL ? "الكمية" : "Quantity",
  };

  const productName = decodeHtmlEntities(product.name);
  const shortDescription = sanitizeQuickViewDescription(product.short_description || "");
  const productSlug = englishSlug || product.slug;
  const productHref = `/${locale}/product/${productSlug}`;
  const mainImage = product.images[0];
  const isOutOfStock = !product.is_in_stock;

  const priceDivider = Math.pow(10, product.prices.currency_minor_unit);
  const price = parseInt(product.prices.price || "0") / priceDivider;
  const regularPrice = parseInt(product.prices.regular_price || product.prices.price || "0") / priceDivider;
  const priceSourceCurrency = product.prices.currency_code;
  const hasPrice = Number.isFinite(price) && price > 0;
  const canPurchase = !isOutOfStock && product.is_purchasable && hasPrice;

  const variationAttributes = useMemo(() => {
    if (product.type !== "variable") return [];
    return (product.attributes || []).filter((attr) => attr.has_variations && (attr.terms?.length ?? 0) > 0);
  }, [product.attributes, product.type]);

  const hasVariations = product.type === "variable" || product.has_options || product.variations.length > 0 || variationAttributes.length > 0;

  const selectedVariation = useMemo(() => {
    if (product.type !== "variable") return null;
    if (variationAttributes.length === 0) return null;
    if ((product.variations?.length ?? 0) === 0) return null;

    const normalizeKey = (key: string) => key.toLowerCase().replace(/^attribute_/, "");
    const normalizeValue = (value: string) => decodeHtmlEntities(value).toLowerCase().trim();

    const allSelected = variationAttributes.every((attr) => {
      const key = attr.taxonomy || attr.name;
      return Boolean(selectedVariations[key]);
    });
    if (!allSelected) return null;

    return product.variations.find((variation) => {
      return variationAttributes.every((attr) => {
        const key = attr.taxonomy || attr.name;
        const selectedValue = selectedVariations[key];
        const selectedTermName = attr.terms.find((t) => t.slug === selectedValue)?.name || selectedValue;

        const vAttr = variation.attributes.find((a) => {
          const vKey = normalizeKey(a.name);
          const targetKey = normalizeKey(key);
          if (vKey === targetKey) return true;
          if (targetKey.startsWith("pa_") && vKey === targetKey.replace(/^pa_/, "")) return true;
          if (!targetKey.startsWith("pa_") && vKey === `pa_${targetKey}`) return true;
          return false;
        });

        if (!vAttr) return false;
        return normalizeValue(vAttr.value) === normalizeValue(selectedTermName);
      });
    }) || null;
  }, [product.type, product.variations, selectedVariations, variationAttributes]);

  const canAddToCart = useMemo(() => {
    if (product.type !== "variable" || variationAttributes.length === 0) return true;
    return variationAttributes.every((attr) => Boolean(selectedVariations[attr.taxonomy || attr.name])) && Boolean(selectedVariation);
  }, [product.type, variationAttributes, selectedVariations, selectedVariation]);

  const handleVariationSelect = (attrKey: string, termSlug: string) => {
    setSelectedVariations((prev) => ({ ...prev, [attrKey]: termSlug }));
    setVariationError(null);
  };

  const handleAddToCart = useCallback(async () => {
    if (product.type === "variable" && variationAttributes.length > 0) {
      const allSelected = variationAttributes.every((attr) => {
        const key = attr.taxonomy || attr.name;
        return Boolean(selectedVariations[key]);
      });
      if (!allSelected || !selectedVariation) {
        setVariationError(labels.pleaseSelect);
        return;
      }
    }
    if (!canPurchase) return;

    triggerHaptic();
    setIsAddingToCart(true);
    try {
      const variationId = product.type === "variable" ? selectedVariation?.id : undefined;
      const variation =
        product.type === "variable" && variationAttributes.length > 0
          ? Object.fromEntries(
              variationAttributes.map((attr) => {
                const key = attr.taxonomy || attr.name;
                const normalizedKey = key.toLowerCase().replace(/^attribute_/, "");
                return [`attribute_${normalizedKey}`, selectedVariations[key]];
              })
            )
          : undefined;

      await addToCart(product.id, quantity, variationId, variation);
      setIsAddedToCart(true);
      setTimeout(() => setIsAddedToCart(false), 2000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAddingToCart(false);
    }
  }, [addToCart, product.id, product.type, canPurchase, variationAttributes, selectedVariations, selectedVariation, quantity, labels.pleaseSelect]);

  const isWishlisted = isInWishlist(product.id);
  const handleWishlistToggle = async () => {
    triggerHaptic();
    if (!isAuthenticated) {
      window.location.href = `/${locale}/login`;
      return;
    }
    try {
      if (isWishlisted) {
        const itemId = getWishlistItemId(product.id);
        await removeFromWishlist(product.id, itemId);
      } else {
        await addToWishlist(product.id);
      }
    } catch (error) {
      console.error("Failed to update wishlist:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedVariations({});
      setVariationError(null);
      setIsAddedToCart(false);
      setQuantity(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      dir={isRTL ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={productName}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-[860px] sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/10 bg-white/95 text-brand-primary shadow-sm backdrop-blur-sm transition-all hover:bg-brand-primary hover:text-white"
          aria-label={labels.close}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: Image */}
        <div className="relative h-[280px] w-full shrink-0 overflow-hidden bg-gradient-to-b from-brand-beige to-white sm:h-auto sm:min-h-[560px] sm:w-[360px]">
          {mainImage && !imageError ? (
            <Image
              src={mainImage.src}
              alt={mainImage.alt || productName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 360px"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-brand-beige">
              <span className="text-sm text-brand-primary/40">{isRTL ? "بدون صورة" : "No Image"}</span>
            </div>
          )}
        </div>

        {/* Right: Content */}
        <div className="flex h-auto w-full flex-col overflow-y-auto p-5 sm:h-auto sm:max-h-[85vh] sm:w-[500px] sm:p-8">
          {/* Category */}
          {product.categories?.[0] && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary/40">
              {decodeHtmlEntities(product.categories[0].name)}
            </p>
          )}

          {/* Title */}
          <h2 className="text-lg font-bold leading-snug text-brand-primary-dark sm:text-2xl">
            {productName}
          </h2>

          {/* Price */}
          <div className="mt-2 flex items-baseline gap-2.5">
            {!hasPrice ? (
              <span className="text-lg font-bold text-brand-primary/45">{isRTL ? "غير متاح" : "Unavailable"}</span>
            ) : product.on_sale ? (
              <>
                <FormattedPrice price={price} sourceCurrency={priceSourceCurrency} className="text-lg font-bold text-brand-primary" iconSize="sm" />
                <FormattedPrice price={regularPrice} sourceCurrency={priceSourceCurrency} className="text-sm font-medium text-brand-primary/35" iconSize="xs" strikethrough />
              </>
            ) : (
              <FormattedPrice price={price} sourceCurrency={priceSourceCurrency} className="text-lg font-bold text-brand-primary" iconSize="sm" />
            )}
          </div>

          {/* Short description */}
          {shortDescription && (
            <div
              className="mt-3 line-clamp-4 text-sm leading-relaxed text-brand-primary/60 [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: shortDescription }}
            />
          )}

          {/* Variation selectors */}
          {variationAttributes.length > 0 && (
            <div className="mt-4 space-y-3">
              {variationAttributes.map((attr) => {
                const attrKey = attr.taxonomy || attr.name;
                const selectedSlug = selectedVariations[attrKey];
                return (
                  <div key={attrKey}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary/50">
                      {decodeHtmlEntities(attr.name)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attr.terms.map((term) => {
                        const isSelected = selectedSlug === term.slug;
                        return (
                          <button
                            key={term.slug}
                            type="button"
                            onClick={() => handleVariationSelect(attrKey, term.slug)}
                            className={cn(
                              "min-w-[3rem] rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all",
                              isSelected
                                ? "border-brand-primary bg-brand-primary text-white"
                                : "border-brand-primary/15 bg-white text-brand-primary/70 hover:border-brand-primary/40 hover:text-brand-primary"
                            )}
                          >
                            {decodeHtmlEntities(term.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {variationError && (
                <p className="text-xs font-medium text-red-500">{variationError}</p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-primary/50">
              {labels.qty}
            </p>
            <div className="inline-flex items-center rounded-full border border-brand-primary/15">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center text-brand-primary transition-colors hover:bg-brand-beige"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex h-9 w-10 items-center justify-center text-sm font-semibold text-brand-primary">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center text-brand-primary transition-colors hover:bg-brand-beige"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Spacer to push actions down */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <ProductAddToCartButton
              type="button"
              onClick={handleAddToCart}
              disabled={!canPurchase || isAddingToCart || (hasVariations && variationAttributes.length > 0 && !canAddToCart)}
              isAdded={isAddedToCart}
              className="flex-1 py-3 text-xs font-bold uppercase tracking-[0.1em]"
            >
              {isAddedToCart ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>{labels.added}</span>
                </>
              ) : hasVariations && variationAttributes.length > 0 && !canAddToCart ? (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>{labels.selectOptions}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>{isOutOfStock ? labels.outOfStock : !canPurchase ? (isRTL ? "غير متاح" : "Unavailable") : isAddingToCart ? labels.adding : labels.addToCart}</span>
                </>
              )}
            </ProductAddToCartButton>

            <button
              type="button"
              onClick={handleWishlistToggle}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-primary/15 text-brand-primary transition-all hover:bg-brand-primary hover:text-white",
                isWishlisted && "border-brand-primary bg-brand-primary text-white"
              )}
              aria-label={isWishlisted ? labels.wishlistRemove : labels.wishlistAdd}
            >
              <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
            </button>
          </div>

          {/* View full details */}
          <div className="mt-4 text-center">
            <Link
              href={productHref}
              onClick={onClose}
              className="text-xs font-medium text-brand-primary/50 underline underline-offset-2 transition-colors hover:text-brand-primary"
            >
              {labels.viewDetails}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
