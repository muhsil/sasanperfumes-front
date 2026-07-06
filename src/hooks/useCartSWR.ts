"use client";

import useSWR, { mutate } from "swr";
import type { CoCartResponse, CoCartItem, CartOperationResponse } from "@/lib/api/cocart";
import { getAuthToken } from "@/lib/api/auth";

const CART_CACHE_KEY = "/api/cart";

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

async function cartFetcher(): Promise<CoCartResponse | null> {
  const response = await fetch(CART_CACHE_KEY, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || "Failed to fetch cart");
  }
  
  return data.cart || null;
}

export function useCartSWR() {
  const { data: cart, error, isLoading, isValidating } = useSWR<CoCartResponse | null>(
    CART_CACHE_KEY,
    cartFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 2,
      keepPreviousData: true,
    }
  );

  const cartItems = cart?.items || [];
  const cartItemsCount = cart?.item_count || 0;
  const cartSubtotal = String(
    (parseFloat(cart?.totals?.subtotal || "0") || 0) +
    (parseFloat(cart?.totals?.subtotal_tax || "0") || 0)
  );
  const cartTotal = cart?.totals?.total || "0";

  const addToCart = async (
    productId: number,
    quantity: number = 1,
    variationId?: number,
    variation?: Record<string, string>
  ): Promise<CartOperationResponse> => {
    const body: Record<string, unknown> = {
      id: String(productId),
      quantity: String(quantity),
    };

    if (variationId) {
      body.variation_id = String(variationId);
    }

    if (variation) {
      body.variation = variation;
    }

    // Optimistic update - add a placeholder item
    const optimisticItem: CoCartItem = {
      item_key: `temp-${productId}-${Date.now()}`,
      id: productId,
      name: "Loading...",
      title: "Loading...",
      price: "0",
      quantity: {
        value: quantity,
        min_purchase: 1,
        max_purchase: 99,
      },
      totals: {
        subtotal: "0",
        subtotal_tax: "0",
        total: "0",
        tax: "0",
      },
      slug: "",
      meta: {
        product_type: "simple",
        sku: "",
        dimensions: { length: "", width: "", height: "", unit: "" },
        weight: 0,
        variation: {},
      },
      backorders: "no",
      cart_item_data: {},
      featured_image: "",
    };

    // Optimistically update the cache
    await mutate(
      CART_CACHE_KEY,
      (currentCart: CoCartResponse | null | undefined) => {
        if (!currentCart) return currentCart;
        return {
          ...currentCart,
          items: [...currentCart.items, optimisticItem],
          item_count: currentCart.item_count + quantity,
        };
      },
      false // Don't revalidate yet
    );

    try {
      const response = await fetch("/api/cart?action=add", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        // Rollback on error
        await mutate(CART_CACHE_KEY);
        return {
          success: false,
          error: {
            code: data.error?.code || "add_to_cart_error",
            message: data.error?.message || "Failed to add item to cart.",
            data: { status: response.status },
          },
        };
      }

      // Update cache with actual data
      await mutate(CART_CACHE_KEY, data.cart, false);

      return {
        success: true,
        cart: data.cart,
      };
    } catch (error) {
      // Rollback on error
      await mutate(CART_CACHE_KEY);
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  };

  const updateCartItem = async (
    itemKey: string,
    quantity: number
  ): Promise<CartOperationResponse> => {
    // Optimistically update the quantity
    await mutate(
      CART_CACHE_KEY,
      (currentCart: CoCartResponse | null | undefined) => {
        if (!currentCart) return currentCart;
        return {
          ...currentCart,
          items: currentCart.items.map((item) =>
            item.item_key === itemKey
              ? { ...item, quantity: { ...item.quantity, value: quantity } }
              : item
          ),
        };
      },
      false
    );

    try {
      const response = await fetch(`/api/cart?action=update&item_key=${encodeURIComponent(itemKey)}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ quantity: String(quantity) }),
      });

      const data = await response.json();

      if (!data.success) {
        await mutate(CART_CACHE_KEY);
        return {
          success: false,
          error: {
            code: data.error?.code || "update_cart_error",
            message: data.error?.message || "Failed to update cart item.",
            data: { status: response.status },
          },
        };
      }

      await mutate(CART_CACHE_KEY, data.cart, false);

      return {
        success: true,
        cart: data.cart,
      };
    } catch (error) {
      await mutate(CART_CACHE_KEY);
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  };

  const removeCartItem = async (itemKey: string): Promise<CartOperationResponse> => {
    // Optimistically remove the item
    await mutate(
      CART_CACHE_KEY,
      (currentCart: CoCartResponse | null | undefined) => {
        if (!currentCart) return currentCart;
        const removedItem = currentCart.items.find((item) => item.item_key === itemKey);
        return {
          ...currentCart,
          items: currentCart.items.filter((item) => item.item_key !== itemKey),
          item_count: currentCart.item_count - (removedItem?.quantity.value || 0),
        };
      },
      false
    );

    try {
      const response = await fetch(`/api/cart?action=remove&item_key=${encodeURIComponent(itemKey)}`, {
        method: "POST",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        await mutate(CART_CACHE_KEY);
        return {
          success: false,
          error: {
            code: data.error?.code || "remove_cart_error",
            message: data.error?.message || "Failed to remove cart item.",
            data: { status: response.status },
          },
        };
      }

      await mutate(CART_CACHE_KEY, data.cart, false);

      return {
        success: true,
        cart: data.cart,
      };
    } catch (error) {
      await mutate(CART_CACHE_KEY);
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  };

  const clearCart = async (): Promise<CartOperationResponse> => {
    // Optimistically clear the cart
    await mutate(
      CART_CACHE_KEY,
      (currentCart: CoCartResponse | null | undefined) => {
        if (!currentCart) return currentCart;
        return {
          ...currentCart,
          items: [],
          item_count: 0,
        };
      },
      false
    );

    try {
      const response = await fetch("/api/cart?action=clear", {
        method: "POST",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        await mutate(CART_CACHE_KEY);
        return {
          success: false,
          error: {
            code: data.error?.code || "clear_cart_error",
            message: data.error?.message || "Failed to clear cart.",
            data: { status: response.status },
          },
        };
      }

      await mutate(CART_CACHE_KEY, data.cart, false);

      return {
        success: true,
        cart: data.cart,
      };
    } catch (error) {
      await mutate(CART_CACHE_KEY);
      return {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  };

  const refreshCart = async () => {
    await mutate(CART_CACHE_KEY);
  };

  return {
    cart,
    cartItems,
    cartItemsCount,
    cartSubtotal,
    cartTotal,
    isLoading,
    isValidating,
    error,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    refreshCart,
  };
}

// Export mutate function for external cache invalidation
export const invalidateCartCache = () => mutate(CART_CACHE_KEY);
