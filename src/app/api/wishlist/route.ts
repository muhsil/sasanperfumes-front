import { NextRequest, NextResponse } from "next/server";
import {
  areCredentialsConfigured,
  getUserId,
  getOrCreateWishlist,
  getUserWishlistShareKey,
  addProductToWishlist,
  removeProductFromWishlist,
  fetchEnrichedWishlistItems,
  wishlistSuccessResponse,
  errorResponse,
  misconfiguredResponse,
  unauthorizedResponse,
  upstreamAuthErrorResponse,
  getBasicAuthParams,
} from "./helpers";
import { API_BASE, backendHeaders, noCacheUrl } from "@/lib/utils/backendFetch";
import { type Locale } from "@/config/site";
import { cookies } from "next/headers";

const WISHLIST_BASE = `${API_BASE}/wp-json/wc/v3/wishlist`;
const LOCALE_COOKIE = "NEXT_LOCALE";

function parseLocale(value: string | null): Locale | null {
  return value === "ar" || value === "en" ? value : null;
}

async function getLocale(request: NextRequest): Promise<Locale | null> {
  const localeQuery = parseLocale(request.nextUrl.searchParams.get("locale"));
  if (localeQuery) return localeQuery;

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const cookieLocale = parseLocale(localeCookie || null);
  if (cookieLocale) return cookieLocale;

  const referer = request.headers.get("referer");
  if (referer) {
    const match = referer.match(/\/(en|ar)\//);
    return parseLocale(match?.[1] || null);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    if (!areCredentialsConfigured()) {
      return misconfiguredResponse();
    }
    const locale = await getLocale(request);

    const userId = await getUserId();
    if (!userId) {
      return errorResponse("unauthorized", "You must be logged in to view your wishlist.", 401);
    }

    const response = await fetch(noCacheUrl(`${WISHLIST_BASE}/get_by_user/${userId}?${getBasicAuthParams()}`), {
      method: "GET",
      headers: backendHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      if (response.status === 404) {
        return NextResponse.json({ success: true, wishlist: null, items: [] });
      }

      if (response.status === 401 || response.status === 403) {
        console.error("[Wishlist API] Upstream auth error:", errorData);
        return upstreamAuthErrorResponse();
      }

      return errorResponse(
        errorData.code || "wishlist_error",
        errorData.message || "Failed to get wishlist.",
        response.status
      );
    }

    const data = await response.json();

    let wishlistMeta = null;
    let shareKey: string | null = null;

    if (data && data.share_key) {
      wishlistMeta = data;
      shareKey = data.share_key;
    } else if (Array.isArray(data) && data.length > 0) {
      wishlistMeta = data[0];
      shareKey = wishlistMeta?.share_key || null;
    }

    if (!shareKey) {
      return NextResponse.json({ success: true, wishlist: null, items: [] });
    }

    const enrichedItems = await fetchEnrichedWishlistItems(shareKey, locale || undefined);

    const wishlist = wishlistMeta ? {
      ...wishlistMeta,
      items: enrichedItems,
      items_count: enrichedItems.length,
    } : null;

    return NextResponse.json({ success: true, wishlist, items: enrichedItems });
  } catch (error) {
    return errorResponse(
      "network_error",
      error instanceof Error ? error.message : "Network error occurred",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  const locale = await getLocale(request);

  try {
    if (!areCredentialsConfigured()) {
      return misconfiguredResponse();
    }

    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => ({}));

    switch (action) {
      case "add": {
        const { shareKey, error } = await getOrCreateWishlist(userId);

        if (error === "upstream_unauthorized") {
          console.error("[Wishlist API] Upstream auth error when getting wishlist for add");
          return upstreamAuthErrorResponse();
        }

        if (!shareKey) {
          return errorResponse("wishlist_create_error", "Could not create wishlist. Please try again later.", 500);
        }

        const result = await addProductToWishlist(
          shareKey,
          body.product_id,
          body.variation_id || 0,
          body.quantity || 1
        );

        if (!result.ok) {
          return errorResponse(
            (result.data.code as string) || "add_to_wishlist_error",
            (result.data.message as string) || "Failed to add item to wishlist.",
            400
          );
        }

        const enrichedItems = await fetchEnrichedWishlistItems(shareKey, locale || undefined);
        return wishlistSuccessResponse(shareKey, enrichedItems, { added_to: shareKey });
      }

      case "remove": {
        const itemId = body.item_id || body.product_id;
        let shareKey = body.share_key || body.wishlist_id;

        if (!shareKey) {
          const result = await getUserWishlistShareKey(userId);

          if (result.error === "upstream_unauthorized") {
            console.error("[Wishlist API] Upstream auth error when getting wishlist for remove");
            return upstreamAuthErrorResponse();
          }

          shareKey = result.shareKey;
        }

        if (!shareKey) {
          return errorResponse("wishlist_error", "Could not find wishlist.", 404);
        }

        const removeResult = await removeProductFromWishlist(shareKey, itemId);

        if (!removeResult.ok) {
          return errorResponse(
            (removeResult.data.code as string) || "remove_from_wishlist_error",
            (removeResult.data.message as string) || "Failed to remove item from wishlist.",
            removeResult.status
          );
        }

        const enrichedItems = await fetchEnrichedWishlistItems(shareKey, locale || undefined);
        return wishlistSuccessResponse(shareKey, enrichedItems);
      }

      case "sync": {
        const guestItems = body.items || [];
        const results: Array<{ product_id: number; success: boolean }> = [];

        const { shareKey, error } = await getOrCreateWishlist(userId);

        if (error === "upstream_unauthorized") {
          console.error("[Wishlist API] Upstream auth error when getting wishlist for sync");
          return upstreamAuthErrorResponse();
        }

        if (!shareKey) {
          return errorResponse("wishlist_error", "Could not create wishlist for sync.", 500);
        }

        for (const item of guestItems) {
          try {
            const result = await addProductToWishlist(
              shareKey,
              item.product_id,
              item.variation_id || 0,
              item.quantity || 1
            );
            results.push({
              product_id: item.product_id,
              success: result.ok || result.data.code === "product_already_in_wishlist",
            });
          } catch {
            results.push({ product_id: item.product_id, success: false });
          }
        }

        const enrichedItems = await fetchEnrichedWishlistItems(shareKey, locale || undefined);
        return wishlistSuccessResponse(shareKey, enrichedItems, { syncResults: results });
      }

      default:
        return errorResponse("invalid_action", "Invalid action", 400);
    }
  } catch (error) {
    return errorResponse(
      "network_error",
      error instanceof Error ? error.message : "Network error occurred",
      500
    );
  }
}
