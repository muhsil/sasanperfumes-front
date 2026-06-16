import { getAuthToken } from "./auth";

export interface WishlistItem {
  id: number;
  product_id: number;
  variation_id?: number;
  quantity?: number;
  user_id?: number;
  dateadded?: string;
  dateadded_formatted?: string;
  product_name: string;
  product_price?: string;
  product_price_html?: string;
  product_image?: string;
  product_url?: string;
  stock_status?: string;
  is_in_stock?: boolean;
}

export interface WishlistResponse {
  id: number;
  user_id: number;
  name: string;
  token: string;
  privacy: string;
  is_default: boolean;
  items: WishlistItem[];
  items_count: number;
  date_added: string;
}

export interface WishlistError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

export interface WishlistOperationResponse {
  success: boolean;
  wishlist?: WishlistResponse;
  items?: WishlistItem[];
  error?: WishlistError;
}

type WishlistLocale = "en" | "ar";

function withLocale(url: string, locale?: WishlistLocale): string {
  if (!locale) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}locale=${locale}`;
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

function isWishlistLocale(value: string | null | undefined): value is WishlistLocale {
  return value === "ar" || value === "en";
}

export async function getWishlist(locale?: string): Promise<WishlistOperationResponse> {
  try {
    const validLocale = isWishlistLocale(locale) ? locale : undefined;

    const response = await fetch(withLocale("/api/wishlist", validLocale), {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: {
          code: data.error?.code || "wishlist_error",
          message: data.error?.message || "Failed to get wishlist.",
          data: { status: response.status },
        },
      };
    }

    return {
      success: true,
      wishlist: data.wishlist,
      items: data.items || [],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function addToWishlist(
  productId: number,
  variationId?: number,
  locale?: string
): Promise<WishlistOperationResponse> {
  try {
    const validLocale = isWishlistLocale(locale) ? locale : undefined;
    const body: Record<string, unknown> = {
      product_id: productId,
    };

    if (variationId) {
      body.variation_id = variationId;
    }

    const response = await fetch(withLocale("/api/wishlist?action=add", validLocale), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: {
          code: data.error?.code || "add_to_wishlist_error",
          message: data.error?.message || "Failed to add item to wishlist.",
          data: { status: response.status },
        },
      };
    }

    return {
      success: true,
      wishlist: data.wishlist,
      items: data.items || [],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function removeFromWishlist(
  productId: number,
  itemId?: number,
  locale?: string
): Promise<WishlistOperationResponse> {
  try {
    const validLocale = isWishlistLocale(locale) ? locale : undefined;
    const body: Record<string, unknown> = { product_id: productId };
    if (itemId) {
      body.item_id = itemId;
    }
    const response = await fetch(withLocale("/api/wishlist?action=remove", validLocale), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: {
          code: data.error?.code || "remove_from_wishlist_error",
          message: data.error?.message || "Failed to remove item from wishlist.",
          data: { status: response.status },
        },
      };
    }

    return {
      success: true,
      wishlist: data.wishlist,
      items: data.items || [],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function syncWishlist(
  guestItems: Array<{ product_id: number; variation_id?: number }>,
  locale?: string
): Promise<WishlistOperationResponse> {
  try {
    const validLocale = isWishlistLocale(locale) ? locale : undefined;
    const response = await fetch(withLocale("/api/wishlist?action=sync", validLocale), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ items: guestItems }),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: {
          code: data.error?.code || "sync_wishlist_error",
          message: data.error?.message || "Failed to sync wishlist.",
          data: { status: response.status },
        },
      };
    }

    return {
      success: true,
      wishlist: data.wishlist,
      items: data.items || [],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export function isProductInWishlist(
  items: WishlistItem[],
  productId: number
): boolean {
  return items.some((item) => item.product_id === productId);
}
