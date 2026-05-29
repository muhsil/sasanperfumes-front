"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { useFreeGift, NEW_GIFT_ADDED_EVENT } from "@/contexts/FreeGiftContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { CartItemSkeleton } from "@/components/common/Skeleton";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Button } from "@/components/common/Button";
import { EmptyCart } from "./EmptyCart";
import { GiftSection } from "./GiftSection";
import { CartItem } from "./CartItem";
import { useProductCategories } from "@/hooks/useProductCategories";
import type { MiniCartDrawerProps } from "./types";

export function MiniCartDrawer({ locale, dictionary }: MiniCartDrawerProps) {
  const {
    cart,
    cartItems,
    cartSubtotal,
    selectedCoupons,
    couponDiscount,
    isCartOpen,
    setIsCartOpen,
    isLoading,
    updateCartItem,
    removeCartItem,
  } = useCart();

    const { isFreeGiftItem, activeGifts, getGiftProgress } = useFreeGift();
    const { currency } = useCurrency();
    const giftProgress = getGiftProgress();

    const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
    const [newlyAddedGiftId, setNewlyAddedGiftId] = useState<number | null>(null);
    const isRTL = locale === "ar";

    const handleClose = useCallback(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setIsCartOpen(false);
    }, [setIsCartOpen]);

  useEffect(() => {
    const handleNewGift = (event: CustomEvent<{ giftName: string; productId: number }>) => {
      setNewlyAddedGiftId(event.detail.productId);
      setTimeout(() => {
        setNewlyAddedGiftId(null);
      }, 3000);
    };

    window.addEventListener(NEW_GIFT_ADDED_EVENT, handleNewGift as EventListener);
    return () => {
      window.removeEventListener(NEW_GIFT_ADDED_EVENT, handleNewGift as EventListener);
    };
  }, []);

  const currencyMinorUnit = cart?.currency?.currency_minor_unit ?? 2;
  const divisor = Math.pow(10, currencyMinorUnit);

  const handleQuantityChange = async (itemKey: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdatingItems(prev => new Set(prev).add(itemKey));
    try {
      await updateCartItem(itemKey, newQuantity);
    } catch (error) {
      console.error("Failed to update quantity:", error);
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleRemoveItem = async (itemKey: string) => {
    try {
      await removeCartItem(itemKey);
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const cartFooter = cartItems.length > 0 ? (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-brand-muted">{dictionary.subtotal}</span>
        <FormattedPrice
          price={parseFloat(cartSubtotal) / divisor}
          className="text-lg font-semibold"
          iconSize="sm"
        />
      </div>
      {/* Coupon Discount */}
      {couponDiscount > 0 && (
        <div className="flex items-center justify-between text-green-600">
          <span className="text-sm font-medium">{selectedCoupons.length > 0 ? selectedCoupons[0].code : ""} {isRTL ? "الخصم" : "Discount"}</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium">
            -<FormattedPrice
              price={couponDiscount / divisor}
              iconSize="xs"
            />
          </span>
        </div>
      )}
      {/* Customs Fees */}
      {cart?.fees && cart.fees.length > 0 && cart.fees.map((fee, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-brand-muted">{isRTL ? "رسوم جمركية" : fee.name}</span>
          <FormattedPrice
            price={parseFloat(fee.fee) / divisor}
            className="text-sm font-medium"
            iconSize="xs"
          />
        </div>
      ))}

            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href={`/${locale}/cart`} onClick={handleClose}>
                  {dictionary.viewCart}
                </Link>
              </Button>
              <Button asChild variant="primary" size="lg" className="w-full">
                <Link href={`/${locale}/checkout`} onClick={handleClose}>
                  {dictionary.checkout}
                </Link>
              </Button>
            </div>
    </div>
  ) : undefined;

  const productIds = cartItems.map((item) => item.id);
  const productCategories = useProductCategories(productIds);

  const renderCartItems = () => (
    <ul className="divide-y divide-brand-border/60">
      {cartItems.map((item) => {
        const isAddingItem = item.item_key.startsWith("temp-");
        const isGiftItem = isFreeGiftItem(item.item_key);
        const isNewlyAddedGift = isGiftItem && newlyAddedGiftId === item.id;
  
        if (isAddingItem) {
          return (
            <li key={item.item_key}>
              <CartItemSkeleton />
            </li>
          );
        }
  
        return (
          <CartItem
            key={item.item_key}
            item={item}
            locale={locale}
            dictionary={{ remove: dictionary.remove }}
            isLoading={isLoading}
            isUpdating={updatingItems.has(item.item_key)}
            isGiftItem={isGiftItem}
            isNewlyAddedGift={isNewlyAddedGift}
            divisor={divisor}
            categoryName={productCategories[item.id]}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
          />
        );
      })}
    </ul>
  );

  return (
    <MuiDrawer
      anchor={isRTL ? "left" : "right"}
      open={isCartOpen}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 400 },
          maxWidth: "100%",
          backgroundColor: "var(--color-ivory)",
          color: "var(--color-primary)",
          borderLeft: isRTL ? "none" : "1px solid var(--color-border)",
          borderRight: isRTL ? "1px solid var(--color-border)" : "none",
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "var(--color-border)",
            backgroundColor: "color-mix(in srgb, var(--color-beige) 55%, white 45%)",
            px: 2,
            py: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShoppingBag className="h-5 w-5" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {dictionary.cart}
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

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {cartItems.length === 0 ? (
            <EmptyCart 
              locale={locale} 
              dictionary={{
                cart: dictionary.cart,
                emptyCart: dictionary.emptyCart,
                continueShopping: dictionary.continueShopping,
              }}
              onClose={handleClose} 
            />
          ) : (
            <>
                            {(giftProgress.hasNextGift || activeGifts.length > 0) && (
                              <GiftSection 
                                locale={locale}
                                currency={currency}
                                giftProgress={giftProgress} 
                                activeGifts={activeGifts} 
                              />
                            )}
              {renderCartItems()}
            </>
          )}
        </Box>

        {cartFooter && (
          <Box sx={{ borderTop: "1px solid", borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-beige) 45%, white 55%)", p: 2 }}>
            {cartFooter}
          </Box>
        )}
      </Box>
    </MuiDrawer>
  );
}
