"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, User, UserCheck, Tag, X, Gift } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { BundleItemsList } from "@/components/cart/BundleItemsList";
import { useCart } from "@/contexts/CartContext";
import { useFreeGift, getLocalizedProduct, containsArabic } from "@/contexts/FreeGiftContext";
import { useDiscountRules } from "@/contexts/DiscountRulesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { calculateCartDiscounts, getCartDiscountTotal } from "@/lib/discountRules";
import { featureFlags, type Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";
import { useProductMeta } from "@/hooks/useProductCategories";
import { SuggestedProducts } from "@/components/checkout/SuggestedProducts";
import { CartLoyaltyPoints } from "@/components/cart/CartLoyaltyPoints";
import type { CoCartItem } from "@/lib/api/cocart";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";



export default function CartPage() {
  const marketPrefix = useMarketPrefix();
  const { locale } = useParams<{ locale: string }>();
  const {
    cart,
    cartItems,
    cartSubtotal,
    cartTotal,
    isLoading,
    updateCartItem,
    removeCartItem,
    applyCoupon,
    removeCoupon,
    selectedCoupons,
    couponDiscount,
    refreshCart,
  } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { isFreeGiftItem, activeGifts, getGiftProgress, isLoading: isLoadingGiftRules, rules } = useFreeGift();
  const { rules: discountRules } = useDiscountRules();
  const { currency, convertPrice } = useCurrency();
  const giftProgress = getGiftProgress();

  const hasGiftItemsInCart = cartItems.some(item => isFreeGiftItem(item.item_key));

  // For variable products, use parent_id for brand/category lookup since
  // the product-categories API indexes by parent product ID, not variation ID.
  const getParentId = (item: CoCartItem): number => {
    const pid = item.meta?.variation?.Parent_id || item.meta?.variation?.parent_id;
    return pid ? parseInt(pid, 10) : item.id;
  };
  const productIds = cartItems.map((item) => getParentId(item));
  const { categories: productCategories, categoryIds: productCategoryIds, brands: productBrands } = useProductMeta(productIds, locale as Locale);
  // Map each cart item to its lookup ID for brand/category
  const getItemLookupId = (item: CoCartItem): number => getParentId(item);
  const currencyMinorUnit = cart?.currency?.currency_minor_unit ?? 2;
  const cartDiscounts = useMemo(
    () => calculateCartDiscounts(
      cartItems.filter((item) => !isFreeGiftItem(item.item_key)),
      discountRules,
      { categoryIdsByProductId: productCategoryIds, currencyMinorUnit }
    ),
    [cartItems, discountRules, isFreeGiftItem, productCategoryIds, currencyMinorUnit]
  );
  const promotionalDiscountTotal = getCartDiscountTotal(cartDiscounts);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const isRTL = locale === "ar";
  const isInitialCartLoading = isLoading && cartItems.length === 0;
  const isEmpty = !isInitialCartLoading && cartItems.length === 0;
  
  const divisor = Math.pow(10, currencyMinorUnit);
  const adjustedCartTotal = Math.max((parseFloat(cartTotal) || 0) - promotionalDiscountTotal, 0);

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const result = await applyCoupon(couponCode);
      if (!result.success) {
        setCouponError(result.error || (isRTL ? "كود الخصم غير صالح" : "Invalid coupon code"));
      } else {
        setCouponCode("");
      }
    } catch {
      setCouponError(isRTL ? "كود الخصم غير صالح" : "Invalid coupon code");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async (code: string) => {
    try {
      await removeCoupon(code);
    } catch (error) {
      console.error("Failed to remove coupon:", error);
    }
  };

  const breadcrumbItems = [
    { name: isRTL ? "السلة" : "Cart", href: `${marketPrefix}/${locale}/cart` },
  ];

  const formatVariationAttributes = (variation: Record<string, string>): string => {
    if (!variation || Object.keys(variation).length === 0) return "";
    return Object.entries(variation)
      .filter(([key]) => key.toLowerCase() !== "parent_id")
      .map(([key, value]) => {
        const label = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${value}`;
      })
      .join(", ");
  };

  const t = {
    en: {
      cart: "Shopping Cart",
      emptyCart: "Your cart is empty",
      emptyCartDesc: "You haven't added any products to your cart yet.",
      continueShopping: "Continue Shopping",
      product: "Product",
      price: "Price",
      quantity: "Quantity",
      total: "Total",
      remove: "Remove",
      orderSummary: "Order Summary",
      subtotal: "Subtotal",
      shipping: "Shipping",
      discount: "Discount",
      vat: "VAT",
      orderTotal: "Total",
      checkout: "Proceed to Checkout",
      calculatedAtCheckout: "Calculated at checkout",
      backToShop: "Continue Shopping",
      loggedInAs: "Logged in as",
      guestCheckout: "You are checking out as a guest",
      loginForBenefits: "Login for faster checkout",
      couponCode: "Coupon Code",
      enterCouponCode: "Enter coupon code",
      apply: "Apply",
    },
    ar: {
      cart: "سلة التسوق",
      emptyCart: "سلة التسوق فارغة",
      emptyCartDesc: "لم تقم بإضافة أي منتجات إلى سلة التسوق بعد.",
      continueShopping: "متابعة التسوق",
      product: "المنتج",
      price: "السعر",
      quantity: "الكمية",
      total: "المجموع",
      remove: "إزالة",
      orderSummary: "ملخص الطلب",
      subtotal: "المجموع الفرعي",
      shipping: "الشحن",
      discount: "الخصم",
      vat: "ضريبة القيمة المضافة",
      orderTotal: "الإجمالي",
      checkout: "المتابعة للدفع",
      calculatedAtCheckout: "يحسب عند الدفع",
      backToShop: "متابعة التسوق",
      loggedInAs: "تم تسجيل الدخول كـ",
      guestCheckout: "أنت تتسوق كضيف",
      loginForBenefits: "سجل دخولك لتجربة أسرع",
      couponCode: "كود الخصم",
      enterCouponCode: "أدخل كود الخصم",
      apply: "تطبيق",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

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

  return (
    <div className="page-flush min-h-screen bg-transparent pb-44 md:pb-8">
      <div className="container mx-auto px-4 py-2 md:py-3">
        <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

        {/* Login Status Indicator */}
        {!isEmpty && (
          <div className="luxury-panel mb-3 flex items-center gap-2.5 p-3 md:mb-6 md:gap-3 md:p-4">
            {isAuthenticated ? (
              <>
                <UserCheck className="h-4 w-4 text-green-600 md:h-5 md:w-5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-brand-primary md:text-sm">
                    {texts.loggedInAs} <span className="font-semibold">{user?.user_email}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-brand-gold md:h-5 md:w-5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-brand-primary md:text-sm">{texts.guestCheckout}</p>
                  <Link href={`${marketPrefix}/${locale}/login`} className="text-xs text-brand-muted underline hover:text-brand-primary md:text-sm">
                    {texts.loginForBenefits}
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        <h1 className="mb-3 font-title text-[30px] leading-none text-brand-primary md:mb-5 md:text-5xl">
          {texts.cart}
        </h1>

      {isInitialCartLoading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" />
          <p className="text-brand-muted">Loading your cart...</p>
        </div>
      ) : isEmpty ? (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-brand-muted/45" />
          <h2 className="mb-2 font-title text-3xl text-brand-primary">
            {texts.emptyCart}
          </h2>
          <p className="mb-8 text-brand-muted">{texts.emptyCartDesc}</p>
          <Button asChild>
            <Link href={`${marketPrefix}/${locale}/shop`}>{texts.continueShopping}</Link>
          </Button>
        </div>
      ) : (
        <>
        {/* Free Gift Progress & Messages Section - At Top */}
        <div className="luxury-panel mb-3 overflow-hidden md:mb-6">
          {/* Gift Progress - Show how much more to spend */}
          {giftProgress.hasNextGift && (
            <div className="border-b border-brand-border/70 bg-brand-beige/55 p-3 md:p-4">
              <div className="flex items-center gap-2.5 md:gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary md:h-10 md:w-10">
                  <Gift className="h-4 w-4 text-white md:h-5 md:w-5" />
                </div>
                <div className="flex-1">
                                    <p className="text-xs font-semibold text-brand-primary md:text-sm">
                                      {isRTL 
                                        ? `أضف ${Math.ceil(convertPrice(giftProgress.amountNeeded, giftProgress.amountNeededCurrency))} ${currency} للحصول على هدية مجانية!`
                                        : `Add ${Math.ceil(convertPrice(giftProgress.amountNeeded, giftProgress.amountNeededCurrency))} ${currency} more to get a free gift!`
                                      }
                                    </p>
                  <p className="text-[11px] text-brand-primary md:text-xs">
                    {isRTL 
                      ? `الهدية التالية: ${(giftProgress.nextGiftRule && getLocalizedProduct(giftProgress.nextGiftRule, locale as string)?.name) || giftProgress.nextGiftRule?.name || "هدية مجانية"}`
                      : `Next gift: ${(giftProgress.nextGiftRule && getLocalizedProduct(giftProgress.nextGiftRule, locale as string)?.name) || ((giftProgress.nextGiftRule?.name && !containsArabic(giftProgress.nextGiftRule.name)) ? giftProgress.nextGiftRule.name : "Free Gift")}`
                    }
                  </p>
                </div>
              </div>
              {/* Progress Bar */}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-ivory">
                <div
                      className="h-full bg-brand-primary transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (giftProgress.currentSubtotal / (giftProgress.nextGiftRule?.min_cart_value || 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Active Gifts - Show unlocked gifts */}
          {activeGifts.length > 0 && (
            <div className="p-3 md:p-4">
              <div className="flex items-start gap-2.5 md:gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary md:h-10 md:w-10">
                  <Gift className="h-4 w-4 text-white md:h-5 md:w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-sm font-semibold text-brand-primary md:text-base">
                    {isRTL ? "تهانينا! لقد حصلت على هدايا مجانية" : "Congratulations! You've unlocked free gifts"}
                  </h3>
                  <div className="space-y-2">
                    {activeGifts.map((gift, index) => (
                      <div key={index} className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-ivory/75 px-4 py-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-beige">
                          <Gift className="h-3 w-3 text-brand-gold" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-brand-primary">
                            {getLocalizedProduct(gift, locale as string)?.name || (isRTL ? "هدية مجانية" : "Free Gift")}
                          </p>
                          {(isRTL ? gift.message_ar : gift.message_en) && (
                            <p className="text-xs text-brand-primary">
                              {isRTL ? gift.message_ar : gift.message_en}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          {isRTL ? "مجاني" : "FREE"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback: Show congratulations when gift items are in cart but activeGifts hasn't been populated yet */}
          {activeGifts.length === 0 && hasGiftItemsInCart && (
            <div className="p-3 md:p-4">
              <div className="flex items-start gap-2.5 md:gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary md:h-10 md:w-10">
                  <Gift className="h-4 w-4 text-white md:h-5 md:w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-sm font-semibold text-brand-primary md:text-base">
                    {isRTL ? "تهانينا! لقد حصلت على هدايا مجانية" : "Congratulations! You've unlocked free gifts"}
                  </h3>
                  <p className="text-sm text-brand-primary">
                    {isRTL ? "هديتك المجانية موجودة في سلة التسوق" : "Your free gift is in your cart"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show message when no gifts and no progress - but not if there are gift items in cart or rules are loading */}
          {!giftProgress.hasNextGift && activeGifts.length === 0 && !hasGiftItemsInCart && !isLoadingGiftRules && rules.length > 0 && (
            <div className="p-3 text-center text-xs text-brand-primary md:p-4 md:text-sm">
              {isRTL ? "لا توجد هدايا متاحة حالياً" : "No gifts available at this time"}
            </div>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-3 lg:items-start lg:gap-3">
          <div className="lg:col-span-2">
            <div className="luxury-panel overflow-hidden">
              <div className="hidden border-b border-brand-border/70 bg-brand-beige/45 p-4 md:grid md:grid-cols-12 md:gap-4">
                <div className="col-span-6 text-sm font-semibold text-brand-muted">
                  {texts.product}
                </div>
                <div className="col-span-2 text-center text-sm font-semibold text-brand-muted">
                  {texts.price}
                </div>
                <div className="col-span-2 text-center text-sm font-semibold text-brand-muted">
                  {texts.quantity}
                </div>
                <div className="col-span-2 text-center text-sm font-semibold text-brand-muted">
                  {texts.total}
                </div>
              </div>

                            <ul className="divide-y divide-brand-border/60">
                              {cartItems.map((item) => {
                                const isGiftItem = isFreeGiftItem(item.item_key);
                                return (
                                <li key={item.item_key} className={`p-3 md:p-4 ${isGiftItem ? "bg-brand-beige/70" : ""}`}>
                                  <div className="grid items-center gap-3 md:grid-cols-12 md:gap-4">
                                    <div className="flex gap-3 md:col-span-6 md:gap-4">
                                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-brand-border/70 bg-brand-beige md:h-24 md:w-24">
                                        {item.featured_image ? (
                                          <Image
                                            src={item.featured_image}
                                            alt={item.name}
                                            fill
                                          sizes="(max-width: 767px) 80px, 96px"
                                            className="object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center">
                                            <ShoppingBag className="h-8 w-8 text-brand-muted" />
                                          </div>
                                        )}
                                        {isGiftItem && (
                                          <div className="absolute left-0 top-0 flex items-center gap-0.5 rounded-br-lg bg-brand-primary px-1.5 py-0.5 text-[9px] font-bold text-white md:text-[10px]">
                                            <Gift className="h-3 w-3" />
                                            FREE
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col justify-center">
                                        <Link
                                          href={`${marketPrefix}/${locale}/product/${item.slug}`}
                                          className="line-clamp-2 text-sm font-medium leading-tight text-brand-primary hover:text-brand-primary/75 md:text-base"
                                        >
                                          {decodeHtmlEntities(item.name)}
                                        </Link>
                                        {(productBrands[getItemLookupId(item)] || productCategories[getItemLookupId(item)]) && (
                                          <p className="font-medium uppercase tracking-wider text-brand-gold mt-0.5" style={{ fontSize: '9px' }}>
                                            {productBrands[getItemLookupId(item)] && <span>{decodeHtmlEntities(productBrands[getItemLookupId(item)])}</span>}
                                            {productBrands[getItemLookupId(item)] && productCategories[getItemLookupId(item)] && <span className="mx-1 text-brand-muted/45">/</span>}
                                            {productCategories[getItemLookupId(item)] && <span className="text-brand-muted">{decodeHtmlEntities(productCategories[getItemLookupId(item)])}</span>}
                                          </p>
                                        )}
                                        {item.meta?.sku && (
                                          <p className="mt-0.5 text-[10px] uppercase text-brand-muted">
                                            SKU: {item.meta.sku}
                                          </p>
                                        )}
                                        {formatVariationAttributes(item.meta.variation) && (
                                           <p className="mt-1 text-[11px] leading-snug text-brand-muted md:text-xs">
                                            {formatVariationAttributes(item.meta.variation)}
                                          </p>
                                        )}
                                        {isGiftItem && (
                                          <p className="mt-1 text-sm font-medium text-brand-gold inline-flex items-center gap-1">
                                            <Gift className="h-3 w-3" />
                                            {isRTL ? "هدية مجانية" : "Free Gift"}
                                          </p>
                                        )}
                                        {/* Mobile: show price with strikethrough */}
                                        {!isGiftItem && (
                                          <div className="mt-1.5 flex items-center gap-2 md:hidden">
                                            {item.regular_price && item.sale_price && parseFloat(item.sale_price) < parseFloat(item.regular_price) ? (
                                              <>
                                                <FormattedPrice
                                                  price={parseFloat(item.sale_price) / divisor}
                                                  className="text-sm font-semibold text-red-600"
                                                  iconSize="xs"
                                                />
                                                <FormattedPrice
                                                  price={parseFloat(item.regular_price) / divisor}
                                                  className="text-xs text-gray-400 line-through"
                                                  iconSize="xs"
                                                />
                                              </>
                                            ) : (
                                              <FormattedPrice
                                                price={parseFloat(item.price) / divisor}
                                                className="text-sm font-semibold"
                                                iconSize="xs"
                                              />
                                            )}
                                          </div>
                                        )}
                                        <BundleItemsList item={item} locale={locale} />
                                        {!isGiftItem && (
                                          <button
                                            onClick={() => handleRemoveItem(item.item_key)}
                                            className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-700 md:hidden"
                                            disabled={isLoading}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            {texts.remove}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="hidden text-center md:col-span-2 md:block">
                                      {isGiftItem ? (
                                        <span className="text-brand-gold font-medium">{isRTL ? "مجاني" : "FREE"}</span>
                                      ) : item.regular_price && item.sale_price && parseFloat(item.sale_price) < parseFloat(item.regular_price) ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <FormattedPrice
                                            price={parseFloat(item.regular_price) / divisor}
                                            className="text-xs text-gray-400 line-through"
                                            iconSize="xs"
                                          />
                                          <FormattedPrice
                                            price={parseFloat(item.sale_price) / divisor}
                                            className="font-medium text-red-600"
                                            iconSize="xs"
                                          />
                                        </div>
                                      ) : (
                                        <FormattedPrice
                                          price={parseFloat(item.price) / divisor}
                                          className="font-medium"
                                          iconSize="xs"
                                        />
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between md:col-span-2 md:justify-center">
                                      <span className="text-xs text-gray-500 md:hidden">
                                        {texts.quantity}:
                                      </span>
                                      {isGiftItem ? (
                                        <span className="text-center font-medium">1</span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                          <button
                                            onClick={() =>
                                              handleQuantityChange(
                                                item.item_key,
                                                item.quantity.value - 1
                                              )
                                            }
                                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory text-brand-primary transition-all hover:border-brand-primary/45 hover:bg-brand-beige disabled:opacity-50 md:h-8 md:w-8"
                                            disabled={isLoading || updatingItems.has(item.item_key) || item.quantity.value <= 1}
                                          >
                                            <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                          </button>
                                          <span className="relative w-7 text-center text-sm md:w-8">
                                            {updatingItems.has(item.item_key) ? (
                                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-primary"></span>
                                            ) : (
                                              item.quantity.value
                                            )}
                                          </span>
                                          <button
                                            onClick={() =>
                                              handleQuantityChange(
                                                item.item_key,
                                                item.quantity.value + 1
                                              )
                                            }
                                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory text-brand-primary transition-all hover:border-brand-primary/45 hover:bg-brand-beige disabled:opacity-50 md:h-8 md:w-8"
                                            disabled={isLoading || updatingItems.has(item.item_key)}
                                          >
                                            <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between md:col-span-2 md:justify-center">
                                      <span className="text-xs text-gray-500 md:hidden">
                                        {texts.total}:
                                      </span>
                                      {isGiftItem ? (
                                        <span className="text-brand-gold font-semibold">{isRTL ? "مجاني" : "FREE"}</span>
                                      ) : (
                                        <FormattedPrice
                                          price={parseFloat(item.price) * item.quantity.value / divisor}
                                          className="font-semibold"
                                          iconSize="xs"
                                        />
                                      )}
                                    </div>

                                    {!isGiftItem && (
                                      <div className="hidden md:col-span-12 md:flex md:justify-end">
                                        <button
                                          onClick={() => handleRemoveItem(item.item_key)}
                                          className="text-brand-muted hover:text-red-500"
                                          aria-label={texts.remove}
                                          disabled={isLoading}
                                        >
                                          <Trash2 className="h-5 w-5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </li>
                                );
                              })}
                            </ul>
            </div>
          </div>

          <div className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <div className="luxury-panel p-4 md:p-6">
              <h2 className="mb-3 font-title text-xl text-brand-primary md:mb-4 md:text-2xl">
                {texts.orderSummary}
              </h2>

              {/* Coupon Code Section */}
              {featureFlags.enableCoupons && (
              <div className="mb-4 border-b border-brand-border/70 pb-4">
                <div className="mb-3">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-primary">
                    <Tag className="h-4 w-4" />
                    {texts.couponCode}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder={texts.enterCouponCode}
                      className="flex-1"
                      error={couponError}
                    />
                    <Button
                      type="button"
                      onClick={handleApplyCoupon}
                      isLoading={couponLoading}
                      disabled={couponLoading || !couponCode.trim()}
                      size="sm"
                    >
                      {texts.apply}
                    </Button>
                  </div>
                </div>

                {/* Applied Coupons */}
                {selectedCoupons.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {selectedCoupons.map((coupon) => (
                      <div
                        key={coupon.code}
                        className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {coupon.code}
                          </span>
                          {parseFloat(coupon.discount) > 0 && (
                            <span className="text-xs text-green-600">
                              -<FormattedPrice
                                price={parseFloat(coupon.discount) / divisor}
                                iconSize="xs"
                              />
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoupon(coupon.code)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}


              </div>
              )}

              <div className="space-y-3 border-b border-brand-border/70 pb-4">
                <div className="flex justify-between text-brand-muted">
                  <span>{texts.subtotal}</span>
                  <FormattedPrice
                    price={parseFloat(cartSubtotal) / divisor}
                    iconSize="xs"
                  />
                </div>
                {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{texts.discount}</span>
                      <span className="inline-flex items-center gap-1">
                        -<FormattedPrice
                          price={couponDiscount / divisor}
                          iconSize="xs"
                        />
                      </span>
                    </div>
                  )}
                {cartDiscounts.map((discount) => (
                  <div key={discount.ruleId} className="flex justify-between text-green-600">
                    <span>{discount.label}</span>
                    <span className="inline-flex items-center gap-1">
                      -<FormattedPrice
                        price={discount.amount / divisor}
                        iconSize="xs"
                      />
                    </span>
                  </div>
                ))}
                              <div className="flex justify-between text-brand-muted">
                                <span>{texts.shipping}</span>
                                <span>
                                  {cart?.totals?.shipping_total &&
                                  parseFloat(cart.totals.shipping_total) > 0
                                    ? <FormattedPrice
                                        price={parseFloat(cart.totals.shipping_total) / divisor}
                                        iconSize="xs"
                                      />
                                    : texts.calculatedAtCheckout}
                                </span>
                              </div>
                              {/* Customs Fees */}
                              {cart?.fees && cart.fees.length > 0 && cart.fees.map((fee, index) => (
                                <div key={index} className="flex justify-between text-brand-muted">
                                  <span>{isRTL ? "رسوم جمركية" : fee.name}</span>
                                  <FormattedPrice
                                    price={parseFloat(fee.fee) / divisor}
                                    iconSize="xs"
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between py-3 text-base font-semibold text-brand-primary md:py-4 md:text-lg">
                <span>{texts.orderTotal}</span>
                <FormattedPrice
                  price={adjustedCartTotal / divisor}
                  iconSize="sm"
                />
              </div>

              <CartLoyaltyPoints
                subtotal={cartSubtotal}
                isRTL={isRTL}
                divisor={divisor}
              />

              <p className="mb-3 text-center text-xs text-brand-muted">
                {isRTL ? "جميع الأسعار شاملة ضريبة القيمة المضافة" : "All prices are inclusive of VAT"}
              </p>

              <Button className="w-full" size="lg" asChild>
                <Link href={`${marketPrefix}/${locale}/checkout`}>{texts.checkout}</Link>
              </Button>

              <Link
                href={`${marketPrefix}/${locale}/shop`}
                className="mt-4 flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-brand-primary"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                {texts.backToShop}
              </Link>

              {/* WhatsApp Help */}
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-sm text-brand-primary">
                  {isRTL ? "هل تحتاج مساعدة في طلبك؟" : "Need help with your order?"}
                </p>
                <a
                  href="https://wa.me/97143442448"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {isRTL ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* You Might Like - Suggested Products */}
        <div className="lg:col-span-3">
          <SuggestedProducts
            cartItemIds={productIds}
            locale={locale}
            isRTL={isRTL}
          />
        </div>
        </>
      )}
      </div>

      {/* Mobile Sticky Order Summary */}
      {!isEmpty && (
        <div
          className="fixed left-3 right-3 z-40 rounded-full border border-brand-border/70 bg-brand-ivory/96 px-4 py-2 shadow-[0_16px_40px_rgba(20,15,10,0.16)] backdrop-blur-xl lg:hidden"
          style={{ bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 4.75rem)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-brand-muted">{texts.orderTotal}</span>
              <FormattedPrice
                price={adjustedCartTotal / divisor}
                className="text-base font-bold text-brand-primary"
                iconSize="xs"
              />
            </div>
            <Button size="lg" className="h-10 max-w-[180px] flex-1 px-4 text-xs" asChild>
              <Link href={`${marketPrefix}/${locale}/checkout`}>{texts.checkout}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
