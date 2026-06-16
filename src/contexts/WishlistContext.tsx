"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import NProgress from "nprogress";
import {
  getWishlist as apiGetWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  syncWishlist as apiSyncWishlist,
  isProductInWishlist as checkIsInWishlist,
  type WishlistResponse,
  type WishlistItem,
} from "@/lib/api/wishlist";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { omnisendTrackAddedToWishlist } from "@/lib/utils/omnisend";

const WISHLIST_COUNT_CACHE_KEY = "sasanperfumes_wishlist_count";

type WishlistLocale = "en" | "ar";
const LOCALE_VALID_VALUES = new Set<WishlistLocale>(["en", "ar"]);

interface WishlistContextType {
  wishlist: WishlistResponse | null;
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  addToWishlist: (productId: number, variationId?: number) => Promise<boolean>;
  removeFromWishlist: (productId: number, itemId?: number) => Promise<boolean>;
  syncWishlist: (guestItems: Array<{ product_id: number; variation_id?: number }>) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  getWishlistItemId: (productId: number) => number | undefined;
  wishlistItemsCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

interface WishlistProviderProps {
  children: React.ReactNode;
  locale?: WishlistLocale | string;
}

function resolveLocale(locale?: WishlistLocale | string): WishlistLocale {
  return locale === "ar" ? "ar" : "en";
}

// Helper functions for localStorage caching (outside component to avoid SSR issues)
function getCachedWishlistCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const cached = localStorage.getItem(WISHLIST_COUNT_CACHE_KEY);
    return cached ? parseInt(cached, 10) : 0;
  } catch {
    return 0;
  }
}

function setCachedWishlistCount(count: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WISHLIST_COUNT_CACHE_KEY, count.toString());
  } catch {
    // Ignore localStorage errors
  }
}

function clearCachedWishlistCount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WISHLIST_COUNT_CACHE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export function WishlistProvider({ children, locale = "en" }: WishlistProviderProps) {
  const [wishlist, setWishlist] = useState<WishlistResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [cachedCount, setCachedCount] = useState<number>(0);
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { notify } = useNotification();
  const resolvedLocale = LOCALE_VALID_VALUES.has(locale as WishlistLocale)
    ? (locale as WishlistLocale)
    : resolveLocale(locale);

  // Initialize cached count from localStorage on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      setCachedCount(getCachedWishlistCount());
    } else {
      setCachedCount(0);
      clearCachedWishlistCount();
    }
  }, [isAuthenticated, user]);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist(null);
      clearCachedWishlistCount();
      setCachedCount(0);
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiGetWishlist(resolvedLocale);
      if (response.success) {
        if (response.wishlist) {
          setWishlist(response.wishlist);
          // Update cache with fresh count
          const newCount = response.wishlist.items_count || response.wishlist.items?.length || 0;
          setCachedWishlistCount(newCount);
          setCachedCount(newCount);
        } else {
          // User has no wishlist yet - clear state to avoid stale data
          setWishlist(null);
          clearCachedWishlistCount();
          setCachedCount(0);
        }
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, resolvedLocale]);

  useEffect(() => {
    if (!isAuthLoading) {
      refreshWishlist();
    }
  }, [refreshWishlist, isAuthLoading]);

  const addToWishlist = useCallback(
    async (productId: number, variationId?: number): Promise<boolean> => {
      setIsLoading(true);
      NProgress.start();
      try {
        const response = await apiAddToWishlist(productId, variationId, resolvedLocale);
        if (response.success) {
          // Use mutation response directly instead of calling refreshWishlist()
          // This makes the operation faster by avoiding an extra API call
          if (response.wishlist) {
            setWishlist(response.wishlist);
            const newCount = response.wishlist.items_count || response.wishlist.items?.length || 0;
            setCachedWishlistCount(newCount);
            setCachedCount(newCount);
          }
          // Fire Omnisend "added to wishlist" event for wishlist reminder automation
          const addedWishlistItem = response.wishlist?.items?.find(
            (i) => i.product_id === productId
          );
          if (addedWishlistItem) {
            omnisendTrackAddedToWishlist({
              productID: String(addedWishlistItem.product_id),
              productTitle: addedWishlistItem.product_name || "",
              productPrice: parseFloat(addedWishlistItem.product_price || "0"),
              productImageURL: addedWishlistItem.product_image || "",
              productURL: addedWishlistItem.product_url || "",
              email: user?.user_email || "",
            });
          }

          notify("success", "Added to wishlist");
          return true;
        } else if (response.error) {
          // Check if item is already in wishlist
          if (response.error.code === "product_already_in_wishlist") {
            notify("info", "Already in your wishlist");
            return true;
          }
          console.error("Error adding to wishlist:", response.error.message);
          notify("error", response.error.message || "Failed to add to wishlist");
          return false;
        }
        return false;
      } catch (error) {
        console.error("Error adding to wishlist:", error);
        notify("error", "Failed to add to wishlist");
        return false;
      } finally {
        setIsLoading(false);
        NProgress.done();
      }
    },
    [notify, resolvedLocale, user]
  );

  const removeFromWishlist = useCallback(
    async (productId: number, itemId?: number): Promise<boolean> => {
      setIsLoading(true);
      NProgress.start();
      try {
        // If itemId not provided, try to find it from wishlist items
        let resolvedItemId = itemId;
        if (!resolvedItemId && wishlist?.items) {
          const item = wishlist.items.find((i) => i.product_id === productId);
          resolvedItemId = item?.id;
        }
        const response = await apiRemoveFromWishlist(productId, resolvedItemId, resolvedLocale);
        if (response.success) {
          // Use mutation response directly instead of calling refreshWishlist()
          // This makes the operation faster by avoiding an extra API call
          if (response.wishlist) {
            setWishlist(response.wishlist);
            const newCount = response.wishlist.items_count || response.wishlist.items?.length || 0;
            setCachedWishlistCount(newCount);
            setCachedCount(newCount);
          }
          notify("success", "Removed from wishlist");
          return true;
        } else if (response.error) {
          console.error("Error removing from wishlist:", response.error.message);
          notify("error", response.error.message || "Failed to remove from wishlist");
          return false;
        }
        return false;
      } catch (error) {
        console.error("Error removing from wishlist:", error);
        notify("error", "Failed to remove from wishlist");
        return false;
      } finally {
        setIsLoading(false);
        NProgress.done();
      }
    },
    [wishlist, notify, resolvedLocale]
  );

  const syncWishlist = useCallback(
    async (guestItems: Array<{ product_id: number; variation_id?: number }>) => {
      setIsLoading(true);
      try {
        const response = await apiSyncWishlist(guestItems, resolvedLocale);
        if (response.success && response.wishlist) {
          setWishlist(response.wishlist);
        } else if (response.error) {
          console.error("Error syncing wishlist:", response.error.message);
        }
      } catch (error) {
        console.error("Error syncing wishlist:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [resolvedLocale]
  );

  const isInWishlist = useCallback(
    (productId: number): boolean => {
      return checkIsInWishlist(wishlist?.items || [], productId);
    },
    [wishlist]
  );

  const getWishlistItemId = useCallback(
    (productId: number): number | undefined => {
      const item = wishlist?.items?.find((i) => i.product_id === productId);
      return item?.id;
    },
    [wishlist]
  );

  const wishlistItems = wishlist?.items || [];
  // Use cached count immediately while loading, then use actual count once loaded
  const wishlistItemsCount = wishlist?.items_count || wishlistItems.length || cachedCount;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistItems,
        isLoading,
        isWishlistOpen,
        setIsWishlistOpen,
        addToWishlist,
        removeFromWishlist,
        syncWishlist,
        refreshWishlist,
        isInWishlist,
        getWishlistItemId,
        wishlistItemsCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
