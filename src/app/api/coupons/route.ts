import { NextResponse } from "next/server";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { API_BASE as BASE_URL, backendMarketHeaders, noCacheUrl } from "@/lib/utils/backendFetch";
import { marketFromRequest } from "@/lib/utils/requestMarket";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = `${BASE_URL}/wp-json/wc/v3`;

function getBasicAuthParams(): string {
  const { consumerKey, consumerSecret } = getWcCredentials();
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

export interface WCCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  description: string;
  date_expires: string | null;
  usage_count: number;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  minimum_amount: string;
  maximum_amount: string;
  individual_use: boolean;
  exclude_sale_items: boolean;
  free_shipping: boolean;
}

export interface PublicCoupon {
  code: string;
  description: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  amount: string;
  minimum_amount: string;
  maximum_amount: string;
  individual_use: boolean;
  exclude_sale_items: boolean;
  free_shipping: boolean;
}

export async function GET(request: Request) {
  try {
    // Each market is its own store, so a request without the market header is
    // answered with the main store's coupons — codes the caller cannot use.
    const market = marketFromRequest(request);
    const url = `${API_BASE}/coupons?${getBasicAuthParams()}&per_page=20&status=publish`;

    const response = await fetch(noCacheUrl(url), {
      method: "GET",
      headers: backendMarketHeaders(market),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "coupons_error",
            message: data.message || "Failed to get coupons.",
          },
        },
        { status: response.status }
      );
    }

    const now = new Date();
    const validCoupons: PublicCoupon[] = (data as WCCoupon[])
      .filter((coupon) => {
        if (coupon.date_expires) {
          const expiryDate = new Date(coupon.date_expires);
          if (expiryDate < now) return false;
        }
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
          return false;
        }
        return true;
      })
      .map((coupon) => ({
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        amount: coupon.amount,
        minimum_amount: coupon.minimum_amount,
        maximum_amount: coupon.maximum_amount,
        individual_use: coupon.individual_use,
        exclude_sale_items: coupon.exclude_sale_items,
        free_shipping: coupon.free_shipping,
      }));

    return NextResponse.json({ success: true, coupons: validCoupons });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      },
      { status: 500 }
    );
  }
}
