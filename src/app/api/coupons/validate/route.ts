import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { API_BASE as BASE_URL, backendHeaders, noCacheUrl } from "@/lib/utils/backendFetch";

const API_BASE = `${BASE_URL}/wp-json/wc/v3`;

function getBasicAuthParams(): string {
  const { consumerKey, consumerSecret } = getWcCredentials();
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

interface WCCoupon {
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

interface ValidateRequest {
  code: string;
  subtotal?: number;
}

interface ValidateResponse {
  valid: boolean;
  code?: string;
  message?: string;
  coupon?: PublicCoupon;
}

export async function POST(request: Request): Promise<NextResponse<ValidateResponse>> {
  try {
    const body: ValidateRequest = await request.json();
    const { code, subtotal = 0 } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        {
          valid: false,
          code: "invalid_request",
          message: "Coupon code is required",
        },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Fetch coupon by specific code from WooCommerce
    const url = `${API_BASE}/coupons?code=${encodeURIComponent(normalizedCode)}&${getBasicAuthParams()}`;

    const response = await fetch(noCacheUrl(url), {
      method: "GET",
      headers: backendHeaders(),
      next: {
        revalidate: 0, // No caching for validation
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          valid: false,
          code: "coupon_fetch_error",
          message: "Failed to validate coupon. Please try again.",
        },
        { status: response.status }
      );
    }

    // Check if coupon was found
    const coupons: WCCoupon[] = Array.isArray(data) ? data : [];
    if (coupons.length === 0) {
      return NextResponse.json({
        valid: false,
        code: "invalid_coupon",
        message: "Invalid coupon code",
      });
    }

    const coupon = coupons[0];
    const now = new Date();

    // Check if expired
    if (coupon.date_expires) {
      const expiryDate = new Date(coupon.date_expires);
      if (expiryDate < now) {
        return NextResponse.json({
          valid: false,
          code: "coupon_expired",
          message: "This coupon has expired",
        });
      }
    }

    // Check if usage limit reached
    if (coupon.usage_limit && coupon.usage_limit > 0) {
      if (coupon.usage_count >= coupon.usage_limit) {
        return NextResponse.json({
          valid: false,
          code: "usage_limit",
          message: "Coupon usage limit has been reached",
        });
      }
    }

    // Check minimum spend requirement
    const minimumAmount = parseFloat(coupon.minimum_amount || "0");
    if (minimumAmount > 0 && subtotal < minimumAmount) {
      return NextResponse.json({
        valid: false,
        code: "min_spend",
        message: `Minimum spend of ${minimumAmount.toFixed(2)} ${siteConfig.defaultCurrency} required for this coupon`,
      });
    }

    // Check maximum spend limit
    const maximumAmount = parseFloat(coupon.maximum_amount || "0");
    if (maximumAmount > 0 && subtotal > maximumAmount) {
      return NextResponse.json({
        valid: false,
        code: "max_spend",
        message: `Maximum spend of ${maximumAmount.toFixed(2)} ${siteConfig.defaultCurrency} exceeded for this coupon`,
      });
    }

    // Coupon is valid - return public data
    const publicCoupon: PublicCoupon = {
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      amount: coupon.amount,
      minimum_amount: coupon.minimum_amount,
      maximum_amount: coupon.maximum_amount,
      individual_use: coupon.individual_use,
      exclude_sale_items: coupon.exclude_sale_items,
      free_shipping: coupon.free_shipping,
    };

    return NextResponse.json({
      valid: true,
      coupon: publicCoupon,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        code: "validation_error",
        message: error instanceof Error ? error.message : "An error occurred during validation",
      },
      { status: 500 }
    );
  }
}
