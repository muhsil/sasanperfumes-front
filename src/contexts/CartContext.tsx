"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import useSWR, { mutate } from "swr";
import type { CoCartResponse, CoCartItem } from "@/lib/api/cocart";
import { getAuthToken } from "@/lib/api/auth";
import { useNotification } from "./NotificationContext";
import { useAuth } from "./AuthContext";
import { useCurrency } from "./CurrencyContext";
import { getBundleItems, getBundleItemsTotal } from "@/components/cart/BundleItemsList";
import { getBundleData } from "@/lib/utils/bundleStorage";
import { decodeHtmlEntities, getLocalizedMarketPath, getMarketPrefixFromPath } from "@/lib/utils";
import { omnisendTrackAddToCart, type OmnisendLineItem } from "@/lib/utils/omnisend";
import { fbTrackAddToCart } from "@/lib/utils/fbpixel";
import { trackAnalyticsEvent } from "@/lib/utils/analytics";

// Cache key now includes locale for proper multilingual support
const getCartCacheKey = (locale: string) => `/api/cart?locale=${locale}`;

function getCartActionUrl(locale: string, action: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({ action, locale });
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return `/api/cart?${searchParams.toString()}`;
}

function getCurrentMarketPrefix(): string {
  if (typeof window === "undefined") return "";
  return getMarketPrefixFromPath(window.location.pathname);
}

function getTrackingProductUrl(slug: string | undefined, locale: string): string {
  if (!slug || typeof window === "undefined") return "";
  return `${window.location.origin}${getLocalizedMarketPath(`/product/${slug}`, locale, getCurrentMarketPrefix())}`;
}

function getTrackingCartUrl(locale: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${getLocalizedMarketPath("/cart", locale, getCurrentMarketPrefix())}`;
}

// LocalStorage cache key for cart data (temporary caching strategy)
const CART_STORAGE_KEY = "sasanperfumes_cart_cache";
const CART_CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL for localStorage cache

interface CachedCartData {
  cart: CoCartResponse;
  locale: string;
  timestamp: number;
}

// Get cached cart from localStorage
function getCachedCart(locale: string): CoCartResponse | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(CART_STORAGE_KEY);
    if (!cached) return null;
    
    const data: CachedCartData = JSON.parse(cached);
    
    // Check if cache is for the same locale and not expired
    if (data.locale !== locale) return null;
    if (Date.now() - data.timestamp > CART_CACHE_TTL) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return null;
    }
    
    return data.cart;
  } catch {
    return null;
  }
}

// Save cart to localStorage cache
function setCachedCart(cart: CoCartResponse, locale: string): void {
  if (typeof window === "undefined") return;
  if (cart.items.some((item) => item.item_key.startsWith("temp-"))) return;
  
  try {
    const data: CachedCartData = {
      cart,
      locale,
      timestamp: Date.now(),
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

// Clear cart cache from localStorage
function clearCachedCart(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function isValidCartResponse(cart: unknown): cart is CoCartResponse {
  return Boolean(
    cart &&
    typeof cart === "object" &&
    Array.isArray((cart as CoCartResponse).items) &&
    typeof (cart as CoCartResponse).item_count === "number"
  );
}

function createOptimisticCart(
  currentCart: CoCartResponse | null | undefined,
  optimisticItem: CoCartItem,
  quantity: number,
  currencyCode: string,
  currencyMinorUnit: number
): CoCartResponse {
  if (currentCart) {
    return {
      ...currentCart,
      items: [...currentCart.items, optimisticItem],
      item_count: currentCart.item_count + quantity,
    };
  }

  return {
    cart_hash: "optimistic",
    cart_key: "",
    currency: {
      currency_code: currencyCode,
      currency_symbol: currencyCode,
      currency_minor_unit: currencyMinorUnit,
      currency_decimal_separator: ".",
      currency_thousand_separator: ",",
      currency_prefix: "",
      currency_suffix: ` ${currencyCode}`,
    },
    customer: {
      billing_address: {},
      shipping_address: {},
    },
    items: [optimisticItem],
    item_count: quantity,
    items_weight: 0,
    coupons: [],
    needs_payment: true,
    needs_shipping: false,
    shipping: {
      total_packages: 0,
      show_package_details: false,
      has_calculated_shipping: false,
      packages: {},
    },
    fees: [],
    taxes: [],
    totals: {
      subtotal: "0",
      subtotal_tax: "0",
      fee_total: "0",
      fee_tax: "0",
      discount_total: "0",
      discount_tax: "0",
      shipping_total: "0",
      shipping_tax: "0",
      total: "0",
      total_tax: "0",
    },
    removed_items: [],
    cross_sells: [],
    notices: [],
  };
}

function deferCartSideEffects(callback: () => void) {
  if (typeof window === "undefined") {
    callback();
    return;
  }

  window.setTimeout(callback, 0);
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

// Fetcher that extracts locale from the cache key URL
async function cartFetcher(url: string): Promise<CoCartResponse | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      console.warn(`Failed to fetch cart: ${data.error?.message || "Unknown cart error"}`);
      return null;
    }

    return data.cart || null;
  } catch (error) {
    console.warn("Cart fetch failed:", error instanceof Error ? error.message : "Network error");
    return null;
  }
}

export interface SelectedCoupon {
  code: string;
  label: string;
  discount: string;
  discount_tax: string;
}

interface CartItemData {
  wcpa_data?: Record<string, unknown>;
  bundle_items?: Array<{ product_id: number; quantity?: number }>;
  [key: string]: unknown;
}

interface CartContextType {
  cart: CoCartResponse | null;
  cartItems: CoCartItem[];
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (productId: number, quantity?: number, variationId?: number, variation?: Record<string, string>, itemData?: CartItemData) => Promise<void>;
  updateCartItem: (key: string, quantity: number) => Promise<void>;
  removeCartItem: (key: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: (code: string) => Promise<boolean>;
  refreshCart: () => Promise<void>;
  cartItemsCount: number;
  cartSubtotal: string;
  cartTotal: string;
  selectedCoupons: SelectedCoupon[];
  couponDiscount: number;
  clearSelectedCoupons: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: React.ReactNode;
  locale: string;
}

export function CartProvider({ children, locale }: CartProviderProps) {
  // Use locale-aware cache key for proper multilingual support
  const cacheKey = getCartCacheKey(locale);
  
  // Get authentication state to refresh cart after login
  const { isAuthenticated, user } = useAuth();
  const { currency: activeCurrency, getCurrencyInfo } = useCurrency();
  const activeCurrencyInfo = getCurrencyInfo();
  const wasAuthenticatedRef = useRef(isAuthenticated);
  
  // Use SWR for cart data - always start with null to match server-rendered HTML
  // and avoid React hydration error #418. LocalStorage cache is loaded post-mount.
  const { data: cart, isLoading: swrLoading, isValidating, mutate: mutateCart } = useSWR<CoCartResponse | null>(
    cacheKey,
    cartFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
      dedupingInterval: 30000,
      errorRetryCount: 2,
      keepPreviousData: false,
    }
  );

  // Update localStorage cache whenever cart data changes
  // Only cache carts with items — don't overwrite a good cache with an empty
  // fallback returned by the API when the backend is temporarily down.
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      setCachedCart(cart, locale);
    }
  }, [cart, locale]);

  // Seed SWR cache with localStorage data after hydration to avoid
  // server/client mismatch (React error #418). This runs only on the client
  // after the initial render, so both server and client start with null.
  // Also re-runs whenever `cart` changes so that if the SWR fetch completed
  // with null/empty (backend error), we fall back to the localStorage cache
  // instead of showing an empty cart and redirecting.
  useEffect(() => {
    // Only apply fallback if the current cart is null or empty
    if (cart && cart.items && cart.items.length > 0) return;
    const cached = getCachedCart(locale);
    if (cached && cached.items && cached.items.length > 0) {
      mutateCart(cached, { revalidate: false });
    }
  }, [cart, locale, mutateCart]);

  // Refresh cart when user logs in - this ensures the authenticated user's
  // cart is loaded immediately after login
  useEffect(() => {
    // Check if user just logged in (transition from not authenticated to authenticated)
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      // Clear cached cart on login to ensure fresh data for authenticated user
      clearCachedCart();
      // Small delay to ensure auth cookies are set before fetching cart
      const timer = setTimeout(() => {
        mutateCart();
      }, 200);
      return () => clearTimeout(timer);
    }
    // Update the ref to track current auth state
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, user, mutateCart]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const { notify } = useNotification();

  // Combined loading state
  const isLoading = swrLoading || isOperationLoading || isValidating;

  const refreshCart = useCallback(async () => {
    await mutate(cacheKey);
  }, [cacheKey]);

  const addToCart = useCallback(
    async (productId: number, quantity = 1, variationId?: number, variation?: Record<string, string>, itemData?: CartItemData) => {
      setIsOperationLoading(true);
      setIsCartOpen(true);
      
      // Optimistic update - add a placeholder item immediately
      const optimisticItem: CoCartItem = {
        item_key: `temp-${productId}-${Date.now()}`,
        id: productId,
        name: "Adding...",
        title: "Adding...",
        price: "0",
        quantity: { value: quantity, min_purchase: 1, max_purchase: 99 },
        totals: { subtotal: "0", subtotal_tax: "0", total: "0", tax: "0" },
        slug: "",
        meta: { product_type: "simple", sku: "", dimensions: { length: "", width: "", height: "", unit: "" }, weight: 0, variation: {} },
        backorders: "no",
        cart_item_data: itemData || {},
        featured_image: "",
      };

      // Optimistically update the cache
      void mutate(
        cacheKey,
        (currentCart: CoCartResponse | null | undefined) =>
          createOptimisticCart(
            currentCart,
            optimisticItem,
            quantity,
            activeCurrencyInfo.code,
            activeCurrencyInfo.decimals
          ),
        false // Don't revalidate yet
      );

      try {
        const body: Record<string, unknown> = { id: String(productId), quantity: String(quantity) };
        if (variationId) body.variation_id = String(variationId);
        if (variation) body.variation = variation;
        if (itemData) body.cart_item_data = itemData;

        const response = await fetch(getCartActionUrl(locale, "add"), {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!data.success) {
          // Rollback on error
          void mutate(cacheKey);
          const errMsg = decodeHtmlEntities(data.error?.message || "Failed to add item to cart");
          notify("error", errMsg);
          throw new Error(errMsg);
        }

        const updatedCart: CoCartResponse | null | undefined = isValidCartResponse(data.cart)
          ? data.cart
          : null;

        if (updatedCart) {
          void mutate(cacheKey, updatedCart, false);
        }

        if (updatedCart) {
          const cartForTracking = updatedCart;
          deferCartSideEffects(() => {
            const addedItem = cartForTracking.items.find(
              (i: CoCartItem) => i.id === productId || i.variation_id === variationId
            );
            if (!addedItem) return;
            const currMinorUnit = cartForTracking.currency?.currency_minor_unit ?? 2;
            const currDivisor = Math.pow(10, currMinorUnit);
            const cartValue = parseFloat(cartForTracking.totals?.total || "0") / currDivisor;
            const itemPrice = parseFloat(addedItem.price || "0") / currDivisor;
            const itemQuantity = addedItem.quantity?.value ?? quantity;

          // Build line items for all cart items
          const lineItems: OmnisendLineItem[] = cartForTracking.items.map((ci: CoCartItem) => ({
            productID: String(ci.id),
            productTitle: ci.name || ci.title || "",
            productPrice: parseFloat(ci.price || "0") / currDivisor,
            productImageURL: ci.featured_image || "",
            productURL: getTrackingProductUrl(ci.slug, locale),
          }));

          // Facebook Pixel: AddToCart
            fbTrackAddToCart({
              productId: addedItem.id,
              productName: addedItem.name || addedItem.title || "",
              value: itemPrice * itemQuantity,
              currency: cartForTracking.currency?.currency_code || activeCurrency,
              quantity: itemQuantity,
            });

            trackAnalyticsEvent("add_to_cart", {
              product_id: addedItem.id,
              product_name: addedItem.name || addedItem.title || "",
              quantity: itemQuantity,
              value: itemPrice * itemQuantity,
              currency: cartForTracking.currency?.currency_code || activeCurrency,
              variation_id: variationId || null,
              items: [
              {
                item_id: String(addedItem.id),
                item_name: addedItem.name || addedItem.title || "",
                price: itemPrice,
                quantity: itemQuantity,
                item_variant: variationId ? String(variationId) : undefined,
              },
            ],
          });

          // 1. Fire JS snippet event (shows in Omnisend Live View)
            omnisendTrackAddToCart({
            addedItem: {
              productID: String(addedItem.id),
              productTitle: addedItem.name || addedItem.title || "",
              productPrice: itemPrice,
              productImageURL: addedItem.featured_image || "",
              productURL: getTrackingProductUrl(addedItem.slug, locale),
            },
            lineItems,
            value: cartValue,
              currency: cartForTracking.currency?.currency_code || activeCurrency,
              cartID: cartForTracking.cart_key || "",
              email: user?.user_email || "",
            });

          // 2. Create/update cart in Omnisend via REST API (required for
          //    the built-in "Abandoned Cart" automation workflow to trigger).
          //    The JS snippet events show in Live View but don't create the
          //    cart objects that the pre-built workflow monitors.
          if (user?.user_email) {
            const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
            const omnisendProducts = cartForTracking.items.map((ci: CoCartItem) => ({
              cartProductID: ci.item_key,
              productID: String(ci.id),
              variantID: String(ci.id),
              title: ci.name || ci.title || "",
              quantity: ci.quantity.value,
              price: Math.round(parseFloat(ci.price || "0")),
              imageUrl: ci.featured_image || "",
              productUrl: ci.slug ? `${siteOrigin}${getLocalizedMarketPath(`/product/${ci.slug}`, locale, getCurrentMarketPrefix())}` : "",
            }));

            fetch("/api/omnisend/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cartID: cartForTracking.cart_key || "",
                email: user.user_email,
                currency: cartForTracking.currency?.currency_code || activeCurrency,
                cartSum: Math.round(parseFloat(cartForTracking.totals?.total || "0")),
                cartRecoveryUrl: siteOrigin ? getTrackingCartUrl(locale) : "",
                products: omnisendProducts,
              }),
            }).catch((err) => {
              // Non-blocking — don't break the cart flow
              console.error("[Omnisend] Cart sync error:", err);
            });
            }
          });
        }

        notify("cart", "Item added to cart");
      } catch (error) {
        // Rollback on error
        void mutate(cacheKey);
        console.error("Error adding to cart:", error);
        throw error;
      } finally {
        setIsOperationLoading(false);
      }
    },
    [notify, cacheKey, locale, user, activeCurrency, activeCurrencyInfo.code, activeCurrencyInfo.decimals]
  );

  const updateCartItem = useCallback(
    async (key: string, quantity: number) => {
      setIsOperationLoading(true);

      // Optimistically update the quantity
      await mutate(
        cacheKey,
        (currentCart: CoCartResponse | null | undefined) => {
          if (!currentCart) return currentCart;
          return {
            ...currentCart,
            items: currentCart.items.map((item) =>
              item.item_key === key ? { ...item, quantity: { ...item.quantity, value: quantity } } : item
            ),
          };
        },
        false
      );

      try {
        const response = await fetch(getCartActionUrl(locale, "update", { item_key: key }), {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ quantity: String(quantity) }),
        });

        const data = await response.json();

        if (!data.success) {
          await mutate(cacheKey);
          const errMsg = decodeHtmlEntities(data.error?.message || "Failed to update cart");
          notify("error", errMsg);
          throw new Error(errMsg);
        }

        if (isValidCartResponse(data.cart)) {
          await mutate(cacheKey, data.cart, false);
        } else {
          await mutate(cacheKey);
        }
        notify("cart", "Cart updated");
      } catch (error) {
        await mutate(cacheKey);
        console.error("Error updating cart:", error);
        throw error;
      } finally {
        setIsOperationLoading(false);
      }
    },
    [notify, cacheKey, locale]
  );

  const removeCartItem = useCallback(
    async (key: string) => {
      setIsOperationLoading(true);
      const removedItemSnapshot = cart?.items.find((item) => item.item_key === key);
      const currencyCode = cart?.currency?.currency_code || activeCurrency;
      const currMinorUnit = cart?.currency?.currency_minor_unit ?? 2;
      const currDivisor = Math.pow(10, currMinorUnit);
      const removedItemPrice = parseFloat(removedItemSnapshot?.price || "0") / currDivisor;
      const removedItemQuantity = removedItemSnapshot?.quantity?.value || 0;

      // Optimistically remove the item
      await mutate(
        cacheKey,
        (currentCart: CoCartResponse | null | undefined) => {
          if (!currentCart) return currentCart;
          const removedItem = currentCart.items.find((item) => item.item_key === key);
          return {
            ...currentCart,
            items: currentCart.items.filter((item) => item.item_key !== key),
            item_count: currentCart.item_count - (removedItem?.quantity.value || 0),
          };
        },
        false
      );

      try {
        const response = await fetch(getCartActionUrl(locale, "remove", { item_key: key }), {
          method: "POST",
          headers: getHeaders(),
        });

        const data = await response.json();

        if (!data.success) {
          await mutate(cacheKey);
          const errMsg = decodeHtmlEntities(data.error?.message || "Failed to remove item");
          notify("error", errMsg);
          throw new Error(errMsg);
        }

        if (isValidCartResponse(data.cart)) {
          await mutate(cacheKey, data.cart, false);
        } else {
          await mutate(cacheKey);
        }

        if (removedItemSnapshot) {
          trackAnalyticsEvent("remove_from_cart", {
            currency: currencyCode,
            value: removedItemPrice * removedItemQuantity,
            items: [
              {
                item_id: String(removedItemSnapshot.id),
                item_name: removedItemSnapshot.name || removedItemSnapshot.title || "",
                price: removedItemPrice,
                quantity: removedItemQuantity,
                item_variant: removedItemSnapshot.variation_id ? String(removedItemSnapshot.variation_id) : undefined,
              },
            ],
          });
        }
        notify("cart", "Item removed from cart");
      } catch (error) {
        await mutate(cacheKey);
        console.error("Error removing from cart:", error);
        throw error;
      } finally {
        setIsOperationLoading(false);
      }
    },
    [notify, cacheKey, locale, cart, activeCurrency]
  );

  const clearCart = useCallback(async () => {
    setIsOperationLoading(true);

    // Clear localStorage cache immediately
    clearCachedCart();

    // Delete cart from Omnisend so the abandoned cart workflow stops
    const cartKey = cart?.cart_key;
    if (cartKey) {
      fetch("/api/omnisend/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartID: cartKey }),
      }).catch((err) => {
        console.error("[Omnisend] Cart delete error:", err);
      });
    }

    // Optimistically clear the cart
    await mutate(
      cacheKey,
      (currentCart: CoCartResponse | null | undefined) => {
        if (!currentCart) return currentCart;
        return { ...currentCart, items: [], item_count: 0 };
      },
      false
    );

    try {
      const response = await fetch(getCartActionUrl(locale, "clear"), {
        method: "POST",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        await mutate(cacheKey);
        throw new Error(data.error?.message || "Failed to clear cart");
      }

      if (isValidCartResponse(data.cart)) {
        await mutate(cacheKey, data.cart, false);
      } else {
        await mutate(cacheKey);
      }
    } catch (error) {
      await mutate(cacheKey);
      console.error("Error clearing cart:", error);
      throw error;
    } finally {
      setIsOperationLoading(false);
    }
  }, [cacheKey, cart?.cart_key, locale]);

  const selectedCoupons = useMemo<SelectedCoupon[]>(() => {
    return (cart?.coupons || []).map((coupon) => ({
      code: coupon.coupon,
      label: coupon.label,
      discount: coupon.discount,
      discount_tax: coupon.discount_tax,
    }));
  }, [cart?.coupons]);

  const applyCoupon = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedCode = code.trim();

    if (selectedCoupons.some(c => c.code.toLowerCase() === normalizedCode.toLowerCase())) {
      notify("error", "Coupon already applied");
      return { success: false, error: "Coupon already applied" };
    }

    try {
      const response = await fetch(getCartActionUrl(locale, "apply-coupon"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ code: normalizedCode }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMsg = decodeHtmlEntities(data.error?.message || "Invalid coupon code");
        notify("error", errorMsg);
        return { success: false, error: errorMsg };
      }

      if (isValidCartResponse(data.cart)) {
        await mutate(cacheKey, data.cart, false);
      } else {
        await mutate(cacheKey);
      }

      notify("success", "Coupon applied successfully");
      return { success: true };
    } catch (error) {
      console.error("Error applying coupon:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to apply coupon";
      notify("error", errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [cacheKey, locale, notify, selectedCoupons]);

  const removeCoupon = useCallback(async (code: string): Promise<boolean> => {
    try {
      const response = await fetch(getCartActionUrl(locale, "remove-coupon"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!data.success) {
        const errMsg = decodeHtmlEntities(data.error?.message || "Failed to remove coupon");
        notify("error", errMsg);
        return false;
      }

      if (isValidCartResponse(data.cart)) {
        await mutate(cacheKey, data.cart, false);
      } else {
        await mutate(cacheKey);
      }

      notify("success", "Coupon removed");
      return true;
    } catch (error) {
      console.error("Error removing coupon:", error);
      notify("error", "Failed to remove coupon");
      return false;
    }
  }, [cacheKey, locale, notify]);

  const clearSelectedCoupons = useCallback(() => {
    void mutate(cacheKey);
  }, [cacheKey]);

  const cartItems = useMemo(() => cart?.items || [], [cart?.items]);
  const cartItemsCount = cart?.item_count || 0;
  // CoCart's subtotal is always the net amount (excl. tax).  Since all
  // prices are tax-inclusive, add subtotal_tax so the UI shows gross values.
  const rawCartSubtotal = String(
    (parseFloat(cart?.totals?.subtotal || "0") || 0) +
    (parseFloat(cart?.totals?.subtotal_tax || "0") || 0)
  );
  const rawCartTotal = cart?.totals?.total || "0";

  // Calculate the total bundle items price across all cart items
  // This is needed because CoCart only knows about the base product price, not the bundle items
  // However, if pricing_mode is set (from PHP backend), the cart item price is already correct
  // and we should NOT add any adjustment to avoid double-counting
  const bundleItemsAdjustment = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return 0;
    
    const currencyMinorUnit = cart?.currency?.currency_minor_unit ?? 2;
    const divisor = Math.pow(10, currencyMinorUnit);
    
    return cartItems.reduce((total, item) => {
      const bundleItems = getBundleItems(item);
      if (bundleItems && bundleItems.length > 0) {
        // Check if pricing_mode was explicitly set (not just defaulting to "sum")
        // We check both cart_item_data (from PHP) and localStorage (from bundle builder)
        // The localStorage uses the bundleStorage utility which stores data under "sasanperfumes_bundle_cart_data"
        // with product IDs as keys
        const storedBundleData = getBundleData(item.id);
        const hasExplicitPricingMode = 
          item.cart_item_data?.pricing_mode !== undefined ||
          storedBundleData?.pricing_mode !== undefined;
        
        // If pricing_mode is explicitly set, skip adjustment - the bundle builder
        // has already calculated the correct total (either fixed price or sum)
        // and the cart item price reflects this
        if (hasExplicitPricingMode) {
          return total;
        }
        
        // Legacy fallback: if no pricing_mode anywhere, add bundle items total (old behavior)
        const bundleItemsTotal = getBundleItemsTotal(bundleItems);
        const quantity = item.quantity?.value || 1;
        // Convert to minor units (same format as CoCart subtotal)
        return total + (bundleItemsTotal * quantity * divisor);
      }
      return total;
    }, 0);
  }, [cartItems, cart?.currency?.currency_minor_unit]);

  // Adjusted cart subtotal that includes bundle items price
  // Round to avoid floating-point precision errors
  const cartSubtotal = useMemo(() => {
    const rawSubtotal = parseFloat(rawCartSubtotal) || 0;
    const total = rawSubtotal + bundleItemsAdjustment;
    // Round to nearest integer (minor units are already integers)
    return Math.round(total).toString();
  }, [rawCartSubtotal, bundleItemsAdjustment]);

  // Adjusted cart total that includes bundle items price
  // The total from CoCart doesn't include bundle items, so we need to add the adjustment
  // Round to avoid floating-point precision errors
  const cartTotal = useMemo(() => {
    const rawTotal = parseFloat(rawCartTotal) || 0;
    const total = rawTotal + bundleItemsAdjustment;
    // Round to nearest integer (minor units are already integers)
    return Math.round(total).toString();
  }, [rawCartTotal, bundleItemsAdjustment]);

  const couponDiscount = useMemo(() => {
    return Math.round(
      (parseFloat(cart?.totals?.discount_total || "0") || 0) +
      (parseFloat(cart?.totals?.discount_tax || "0") || 0)
    );
  }, [cart?.totals?.discount_total, cart?.totals?.discount_tax]);

  // Normalize cart to null if undefined (SWR returns undefined before first fetch)
  const normalizedCart = cart ?? null;

  return (
    <CartContext.Provider
      value={{
        cart: normalizedCart,
        cartItems,
        isLoading,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart,
        cartItemsCount,
        cartSubtotal,
        cartTotal,
        selectedCoupons,
        couponDiscount,
        clearSelectedCoupons,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
