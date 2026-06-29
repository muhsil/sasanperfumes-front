import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import https from "https";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/security";
import { API_BASE, backendHeaders, backendMarketHeaders, backendPostHeaders, noCacheUrl, parseBackendJson, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

function getOrdersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

function getBasicAuthHeader(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

const MARKET_CODES = new Set(["qa", "om", "sa"]);
const BACKEND_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "https://cms.sasanperfumes.com";
  }
})();

function responseHeadersFromNode(headers: Record<string, string | string[] | undefined>): Headers {
  const responseHeaders = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => responseHeaders.append(key, entry));
    } else if (value !== undefined) {
      responseHeaders.set(key, value);
    }
  });
  return responseHeaders;
}

function fetchWithPublicDns(url: string, init: RequestInit = {}): Promise<Response> {
  const parsed = new URL(url);
  const body = typeof init.body === "string" || Buffer.isBuffer(init.body) ? init.body : undefined;
  const headers = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : Array.isArray(init.headers)
      ? Object.fromEntries(init.headers.map(([key, value]) => [key, String(value)]))
      : Object.fromEntries(Object.entries(init.headers || {}).map(([key, value]) => [key, String(value)]));

  return new Promise<Response>((resolve, reject) => {
    const request = https.request(
      parsed,
      {
        method: init.method || "GET",
        headers,
        lookup: (hostname, options, callback) => {
          dns.resolve4(hostname, (error, addresses) => {
            if (error || addresses.length === 0) {
              callback(error || new Error(`No public DNS A record for ${hostname}`), undefined as never, undefined as never);
              return;
            }
            if (typeof options === "object" && options.all) {
              (callback as (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void)(
                null,
                addresses.map((address) => ({ address, family: 4 }))
              );
              return;
            }
            callback(null, addresses[0], 4);
          });
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("end", () => {
          resolve(new Response(Buffer.concat(chunks), {
            status: incoming.statusCode || 200,
            statusText: incoming.statusMessage || "",
            headers: responseHeadersFromNode(incoming.headers),
          }));
        });
      }
    );

    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function fetchOrdersBackend(url: string, init: RequestInit, marketCode?: string | null): Promise<Response> {
  const code = marketCode?.toLowerCase() || "";
  if (!MARKET_CODES.has(code)) {
    return fetch(noCacheUrl(url), init);
  }

  const headers = {
    ...(backendMarketHeaders(code, init.headers) as Record<string, string>),
    Origin: BACKEND_ORIGIN,
  };

  return fetchWithPublicDns(noCacheUrl(url), {
    ...init,
    headers,
  });
}

interface OrderLineItemMeta {
  key: string;
  value: string;
}

interface OrderLineItem {
  product_id: number;
  quantity: number;
  variation_id?: number;
  subtotal?: string;
  total?: string;
  meta_data?: OrderLineItemMeta[];
}

interface OrderAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string;
  email?: string;
  phone?: string;
}

interface CouponLine {
  code: string;
}

interface FeeLine {
  name: string;
  total: string;
  tax_status?: string;
  tax_class?: string;
}

interface ShippingLine {
  method_id: string;
  method_title: string;
  total: string;
}

interface CreateOrderRequest {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  currency?: string;
  billing: OrderAddress;
  shipping: OrderAddress;
  line_items: OrderLineItem[];
  shipping_lines?: ShippingLine[];
  coupon_lines?: CouponLine[];
  fee_lines?: FeeLine[];
  customer_note?: string;
  customer_id?: number;
  meta_data?: Array<{ key: string; value: string }>;
}

const PAYMENT_METHOD_TITLES: Record<string, string> = {
  woocommerce_payments: "Credit/Debit Card",
  cod: "Cash on Delivery",
  bacs: "Bank Transfer",
  cheque: "Check Payment",
  paypal: "PayPal",
  stripe: "Credit Card",
  tabby: "Tabby - Pay in Installments",
  tabby_checkout: "Tabby - Pay in Installments",
  tabby_installments: "Tabby - Pay in Installments",
  tamara: "Tamara - Buy Now Pay Later",
  "tamara-gateway": "Tamara - Buy Now Pay Later",
};

function resolvePaymentMethodTitle(paymentMethod: string, providedTitle: unknown): string {
  if (typeof providedTitle === "string" && providedTitle.trim()) {
    return providedTitle.trim();
  }

  const normalizedMethod = paymentMethod.toLowerCase();
  if (PAYMENT_METHOD_TITLES[normalizedMethod]) {
    return PAYMENT_METHOD_TITLES[normalizedMethod];
  }
  if (normalizedMethod.startsWith("woocommerce_payments")) {
    return "Credit/Debit Card";
  }
  if (normalizedMethod.startsWith("stripe")) {
    return "Credit/Debit Card";
  }
  if (normalizedMethod.startsWith("tabby")) {
    return "Tabby - Pay in Installments";
  }
  if (normalizedMethod.startsWith("tamara")) {
    return "Tamara - Buy Now Pay Later";
  }

  return paymentMethod.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get("orderId");
  const orderKey = searchParams.get("order_key");
  const customerId = searchParams.get("customerId");
  const page = searchParams.get("page");
  const perPage = searchParams.get("per_page");
  const status = searchParams.get("status");

  try {
    const market = await getRequestMarket();
    let url: string;
    
    if (orderId) {
      // First fetch the order
      const orderUrl = `${getOrdersApiBase(market.code)}/orders/${orderId}?${getBasicAuthParams(market.code)}`;
      const orderResponse = await fetchOrdersBackend(orderUrl, {
        method: "GET",
        headers: backendHeaders(),
      }, market.code);
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        return NextResponse.json(
          {
            success: false,
            error: {
              code: errorData.code || "orders_error",
              message: errorData.message || "Failed to get order.",
            },
          },
          { status: orderResponse.status }
        );
      }
      
      const orderData = await orderResponse.json();
      
      // Security check: Either order_key must match OR user must be authenticated and own the order
      if (orderKey) {
        // Guest checkout flow: Verify order_key matches (WooCommerce standard pattern)
        // The order_key is a secret token that proves legitimate access to the order
        if (orderData.order_key !== orderKey) {
          return forbiddenResponse("Invalid order key");
        }
      } else {
        // Authenticated user flow: Verify user owns this order
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
          return unauthorizedResponse(authResult.error);
        }
        
        if (orderData.customer_id !== authResult.user.user_id) {
          return forbiddenResponse("You do not have permission to view this order");
        }
      }
      
      // Enrich bundle items with is_free detection server-side
      // so the client always receives correctly-flagged data
      if (orderData.line_items && Array.isArray(orderData.line_items)) {
        for (const lineItem of orderData.line_items) {
          if (!lineItem.meta_data || !Array.isArray(lineItem.meta_data)) continue;
          const bundleMeta = lineItem.meta_data.find(
            (m: { key: string }) => m.key === "_bundle_items" || m.key === "bundle_items"
          );
          if (!bundleMeta) continue;
          let items = bundleMeta.value;
          if (typeof items === "string") {
            try { items = JSON.parse(items); } catch { continue; }
          }
          if (!Array.isArray(items) || items.length === 0) continue;
          // Skip if any item already has is_free explicitly set
          const hasFlag = items.some((bi: { is_free?: boolean }) => bi.is_free === true || bi.is_free === false);
          if (hasFlag) continue;
          const lineTotal = parseFloat(lineItem.total) || 0;
          if (lineTotal <= 0) continue;
          const oQty = lineItem.quantity || 1;
          const sumAll = items.reduce((s: number, bi: { price?: string | number; quantity?: number }) => {
            const p = typeof bi.price === "string" ? parseFloat(bi.price) : (bi.price || 0);
            const q = bi.quantity || 1;
            return s + (p * q * oQty);
          }, 0);
          const freeAmt = sumAll - lineTotal;
          if (freeAmt <= 0.01) continue;
          let rem = freeAmt;
          for (let i = items.length - 1; i >= 0 && rem > 0.01; i--) {
            const p = typeof items[i].price === "string" ? parseFloat(items[i].price) : (items[i].price || 0);
            const q = items[i].quantity || 1;
            const iTotal = p * q * oQty;
            if (iTotal > 0 && iTotal <= rem + 0.01) {
              items[i].is_free = true;
              items[i].is_addon = true;
              rem -= iTotal;
            }
          }
          bundleMeta.value = items;
        }
      }

      return NextResponse.json({ success: true, data: orderData });
    } else if (customerId) {
      // For listing orders by customer, always require authentication
      const authResult = await verifyAuth(request);
      if (!authResult.authenticated || !authResult.user) {
        return unauthorizedResponse(authResult.error);
      }
      
      // Verify the authenticated user is requesting their own orders
      if (parseInt(customerId) !== authResult.user.user_id) {
        return forbiddenResponse("You can only view your own orders");
      }
      
      const params = new URLSearchParams();
      params.set("customer", customerId);
      if (page) params.set("page", page);
      if (perPage) params.set("per_page", perPage);
      if (status) params.set("status", status);
      url = `${getOrdersApiBase(market.code)}/orders?${params.toString()}&${getBasicAuthParams(market.code)}`;
    } else {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID or Customer ID is required" } },
        { status: 400 }
      );
    }

    const response = await fetchOrdersBackend(url, {
      method: "GET",
      headers: backendHeaders(),
    }, market.code);

    let data: { code?: string; message?: string } | unknown[];
    const responseText = await response.text();
    try {
      data = parseBackendJson<{ code?: string; message?: string } | unknown[]>(responseText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_response",
            message: "Backend returned non-JSON response. If using LiteSpeed Cache, exclude /wp-json/* paths from caching.",
          },
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const errorData = Array.isArray(data) ? {} : data;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorData.code || "orders_error",
            message: errorData.message || "Failed to get orders.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
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

export async function POST(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const body = await request.json();
    const paymentMethod =
      typeof body.payment_method === "string" && body.payment_method.trim()
        ? body.payment_method.trim()
        : "stripe";
    
    const orderData: CreateOrderRequest = {
      payment_method: paymentMethod,
      payment_method_title: resolvePaymentMethodTitle(paymentMethod, body.payment_method_title),
      set_paid: false,
      ...(body.currency ? { currency: body.currency } : {}),
      billing: {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        address_1: body.billing.address_1,
        city: body.billing.city,
        state: body.billing.state || "",
        postcode: body.billing.postcode || "",
        country: body.billing.country,
        email: body.billing.email,
        phone: body.billing.phone,
      },
      shipping: {
        first_name: body.shipping?.first_name || body.billing.first_name,
        last_name: body.shipping?.last_name || body.billing.last_name,
        address_1: body.shipping?.address_1 || body.billing.address_1,
        city: body.shipping?.city || body.billing.city,
        state: body.shipping?.state || body.billing.state || "",
        postcode: body.shipping?.postcode || body.billing.postcode || "",
        country: body.shipping?.country || body.billing.country,
      },
      line_items: body.line_items,
      customer_note: body.customer_note || "",
    };

    if (body.shipping_lines && body.shipping_lines.length > 0) {
      orderData.shipping_lines = body.shipping_lines;
    }

    if (body.coupon_lines && body.coupon_lines.length > 0) {
      orderData.coupon_lines = body.coupon_lines;
    }

    if (body.fee_lines && body.fee_lines.length > 0) {
      orderData.fee_lines = body.fee_lines;
    }

    if (body.customer_id) {
      orderData.customer_id = body.customer_id;
    }

    if (body.meta_data && body.meta_data.length > 0) {
      orderData.meta_data = body.meta_data;
    }

    const url = `${getOrdersApiBase(market.code)}/orders?${getBasicAuthParams(market.code)}`;
    
    const response = await fetchOrdersBackend(url, {
      method: "POST",
      headers: backendPostHeaders({
        Authorization: getBasicAuthHeader(market.code),
      }),
      body: JSON.stringify(orderData),
    }, market.code);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "order_creation_error",
            message: data.message || "Failed to create order.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      order: data,
      order_id: data.id,
      order_key: data.order_key,
      payment_url: data.payment_url || null,
    });
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

interface UpdateOrderRequest {
  order_id: number;
  status?: string;
  set_paid?: boolean;
  transaction_id?: string;
  payment_method?: string;
  payment_method_title?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const body: UpdateOrderRequest = await request.json();
    
    if (!body.order_id) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID is required" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.status) {
      updateData.status = body.status;
    }
    
    if (body.set_paid !== undefined) {
      updateData.set_paid = body.set_paid;
    }
    
    if (body.transaction_id) {
      updateData.transaction_id = body.transaction_id;
    }
    
    if (body.payment_method) {
      updateData.payment_method = body.payment_method;
    }
    
    if (body.payment_method_title) {
      updateData.payment_method_title = body.payment_method_title;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "no_updates", message: "No update fields provided" } },
        { status: 400 }
      );
    }

    const url = `${getOrdersApiBase(market.code)}/orders/${body.order_id}?${getBasicAuthParams(market.code)}`;
    
    const response = await fetchOrdersBackend(url, {
      method: "PUT",
      headers: backendPostHeaders({
        Authorization: getBasicAuthHeader(market.code),
      }),
      body: JSON.stringify(updateData),
    }, market.code);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "order_update_error",
            message: data.message || "Failed to update order.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      order: data,
      order_id: data.id,
      status: data.status,
    });
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
