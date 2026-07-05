import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getEnvVar } from "@/lib/utils/loadEnv";

const TABBY_API_URL = "https://api.tabby.ai/api/v2/checkout";

interface TabbySessionRequest {
  order_id: number;
  order_key: string;
  amount: number;
  currency: string;
  description?: string;
  buyer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    city: string;
    address: string;
    zip?: string;
  };
  order_items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    category?: string;
  }>;
  // Optional order totals for accurate payment gateway reporting
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  language?: string;
  success_url: string;
  cancel_url: string;
  failure_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = getEnvVar("TABBY_SECRET_KEY");
    const merchantCode = getEnvVar("TABBY_MERCHANT_CODE") || "default";

    if (!secretKey) {
      console.error("Tabby API Error: TABBY_SECRET_KEY environment variable is not configured");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_api_key",
            message: "Tabby Secret Key is not configured",
          },
        },
        { status: 500 }
      );
    }

    const body: TabbySessionRequest = await request.json();
    
    console.log("Tabby create-session request:", {
      order_id: body.order_id,
      amount: body.amount,
      currency: body.currency,
      items_count: body.order_items?.length,
    });

    const {
      order_id,
      order_key,
      amount,
      currency,
      description,
      buyer,
      shipping_address,
      order_items,
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      language = "en",
      success_url,
      cancel_url,
      failure_url,
    } = body;

    if (!order_id || !amount || !buyer || !success_url || !cancel_url || !failure_url) {
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

    const tabbyPayload = {
      payment: {
        amount: amount.toFixed(2),
        currency: currency || siteConfig.defaultCurrency,
        description: description || `Order #${order_id}`,
        buyer: {
          phone: buyer.phone,
          email: buyer.email,
          name: buyer.name,
        },
        shipping_address: {
          city: shipping_address?.city || "",
          address: shipping_address?.address || "",
          zip: shipping_address?.zip || "",
        },
        order: {
          tax_amount: tax_amount.toFixed(2),
          shipping_amount: shipping_amount.toFixed(2),
          discount_amount: discount_amount.toFixed(2),
          reference_id: `WC-${order_id}`,
          items: order_items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            unit_price: item.unit_price.toFixed(2),
            category: item.category || "General",
          })),
        },
        buyer_history: {
          registered_since: new Date().toISOString().split("T")[0],
          loyalty_level: 0,
        },
      },
      lang: language,
      merchant_code: merchantCode,
      merchant_urls: {
        success: `${success_url}?order_id=${order_id}&order_key=${order_key}`,
        cancel: `${cancel_url}?order_id=${order_id}&order_key=${order_key}`,
        failure: `${failure_url}?order_id=${order_id}&order_key=${order_key}`,
      },
    };

    const response = await fetch(TABBY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(tabbyPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.error?.message ||
        data.rejection_reason ||
        "Failed to create Tabby session";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.status || "tabby_error",
            message: errorMessage,
            rejection_reason: data.rejection_reason,
          },
        },
        { status: response.status }
      );
    }

    // Find the installments product web_url
    const installmentsProduct = data.configuration?.available_products?.installments?.[0];
    const webUrl = installmentsProduct?.web_url;

    if (!webUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "no_payment_url",
            message: "No payment URL returned from Tabby",
            rejection_reason: data.configuration?.products?.installments?.rejection_reason,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_url: webUrl,
      session_id: data.id,
      status: data.status,
    });
  } catch (error) {
    console.error("Tabby session creation error:", error);
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
