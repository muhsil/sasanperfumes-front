import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getEnvVar } from "@/lib/utils/loadEnv";

const TAMARA_API_URL = "https://api.tamara.co/checkout";

interface TamaraCheckoutRequest {
  order_id: number;
  order_key: string;
  total_amount: number;
  currency: string;
  country_code: string;
  payment_type?: string;
  locale?: string;
  consumer: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  billing_address: {
    first_name: string;
    last_name: string;
    line1: string;
    city: string;
    country_code: string;
    phone_number?: string;
  };
  shipping_address: {
    first_name: string;
    last_name: string;
    line1: string;
    city: string;
    country_code: string;
    phone_number?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    type?: string;
    sku?: string;
  }>;
  // Optional order totals for accurate payment gateway reporting
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  discount_name?: string;
  success_url: string;
  failure_url: string;
  cancel_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiToken = getEnvVar("TAMARA_API_TOKEN");

    if (!apiToken) {
      console.error("Tamara API Error: TAMARA_API_TOKEN environment variable is not configured");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_api_token",
            message: "Tamara API Token is not configured",
          },
        },
        { status: 500 }
      );
    }

    const body: TamaraCheckoutRequest = await request.json();
    
    console.log("Tamara create-checkout request:", {
      order_id: body.order_id,
      total_amount: body.total_amount,
      currency: body.currency,
      items_count: body.items?.length,
    });

    const {
      order_id,
      order_key,
      total_amount,
      currency,
      country_code,
      payment_type = "PAY_BY_INSTALMENTS",
      locale = "en_US",
      consumer,
      billing_address,
      shipping_address,
      items,
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      discount_name = "",
      success_url,
      failure_url,
      cancel_url,
    } = body;

    if (!order_id || !total_amount || !consumer || !items || !success_url || !failure_url || !cancel_url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_params",
            message: "Missing required parameters",
          },
        },
        { status: 400 }
      );
    }

    const tamaraPayload = {
      order_reference_id: `WC-${order_id}`,
      order_number: `${order_id}`,
      total_amount: {
        amount: total_amount.toFixed(2),
        currency: currency || siteConfig.defaultCurrency,
      },
      description: `Order #${order_id}`,
      country_code: country_code || "AE",
      payment_type: payment_type,
      locale: locale,
      items: items.map((item) => ({
        reference_id: item.sku || `item-${Math.random().toString(36).substr(2, 9)}`,
        type: item.type || "physical",
        name: item.name,
        sku: item.sku || "",
        quantity: item.quantity,
        unit_price: {
          amount: item.unit_price.toFixed(2),
          currency: currency || siteConfig.defaultCurrency,
        },
        total_amount: {
          amount: (item.unit_price * item.quantity).toFixed(2),
          currency: currency || siteConfig.defaultCurrency,
        },
      })),
      consumer: {
        first_name: consumer.first_name,
        last_name: consumer.last_name,
        phone_number: consumer.phone_number,
        email: consumer.email,
      },
      billing_address: {
        first_name: billing_address.first_name,
        last_name: billing_address.last_name,
        line1: billing_address.line1,
        city: billing_address.city,
        country_code: billing_address.country_code || "AE",
        phone_number: billing_address.phone_number || consumer.phone_number,
      },
      shipping_address: {
        first_name: shipping_address.first_name,
        last_name: shipping_address.last_name,
        line1: shipping_address.line1,
        city: shipping_address.city,
        country_code: shipping_address.country_code || "AE",
        phone_number: shipping_address.phone_number || consumer.phone_number,
      },
      merchant_url: {
        success: `${success_url}?order_id=${order_id}&order_key=${order_key}`,
        failure: `${failure_url}?order_id=${order_id}&order_key=${order_key}`,
        cancel: `${cancel_url}?order_id=${order_id}&order_key=${order_key}`,
        notification: `${success_url}`,
      },
      shipping_amount: {
        amount: shipping_amount.toFixed(2),
        currency: currency || siteConfig.defaultCurrency,
      },
      tax_amount: {
        amount: tax_amount.toFixed(2),
        currency: currency || siteConfig.defaultCurrency,
      },
      discount: {
        name: discount_name,
        amount: {
          amount: discount_amount.toFixed(2),
          currency: currency || siteConfig.defaultCurrency,
        },
      },
    };

    const response = await fetch(TAMARA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(tamaraPayload),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      const errorMessage =
        data.message ||
        data.errors?.[0]?.error_code ||
        "Failed to create Tamara checkout";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.errors?.[0]?.error_code || "tamara_error",
            message: errorMessage,
            details: data.errors,
          },
        },
        { status: response.status || 400 }
      );
    }

    if (!data.checkout_url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "no_checkout_url",
            message: "No checkout URL returned from Tamara",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      checkout_url: data.checkout_url,
      order_id: data.order_id,
    });
  } catch (error) {
    console.error("Tamara checkout creation error:", error);
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
