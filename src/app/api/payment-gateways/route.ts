import { NextResponse } from "next/server";
import { getEnvVar, getWcCredentials } from "@/lib/utils/loadEnv";
import { API_BASE as BASE_URL, backendHeaders, noCacheUrl } from "@/lib/utils/backendFetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = `${BASE_URL}/wp-json/wc/v3`;
const STORE_API_BASE = `${BASE_URL}/wp-json/wc/store/v1`;

const GATEWAYS_CACHE_TTL = 0;
interface CachedGateways {
  data: Record<string, unknown>;
  timestamp: number;
}
let gatewaysCache: CachedGateways | null = null;

function gatewaysJson(data: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Vary", "Host, X-Frontend-Host, Referer");
  return NextResponse.json(data, { ...init, headers });
}

function getBasicAuthParams(): string {
  const { consumerKey, consumerSecret } = getWcCredentials();
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

const PAYMENT_METHOD_DETAILS: Record<string, { title: string; description: string }> = {
  myfatoorah_v2: {
    title: "Credit/Debit Card",
    description: "Pay securely with your credit or debit card via MyFatoorah",
  },
  myfatoorah: {
    title: "Credit/Debit Card",
    description: "Pay securely with your credit or debit card via MyFatoorah",
  },
  myfatoorah_cards: {
    title: "Credit/Debit Card",
    description: "Pay securely with your credit or debit card via MyFatoorah",
  },
  myfatoorah_embedded: {
    title: "Credit/Debit Card",
    description: "Pay securely with your credit or debit card via MyFatoorah",
  },
  tabby_installments: {
    title: "Tabby - Pay in Installments",
    description: "Split your purchase into 4 interest-free payments",
  },
  tabby_checkout: {
    title: "Tabby - Pay in Installments",
    description: "Split your purchase into 4 interest-free payments",
  },
  tabby: {
    title: "Tabby - Pay in Installments",
    description: "Split your purchase into 4 interest-free payments",
  },
  "tamara-gateway": {
    title: "Tamara - Buy Now Pay Later",
    description: "Pay in easy installments with Tamara",
  },
  tamara: {
    title: "Tamara - Buy Now Pay Later",
    description: "Pay in easy installments with Tamara",
  },
  bacs: {
    title: "Bank Transfer",
    description: "Make your payment directly into our bank account",
  },
  cod: {
    title: "Cash on Delivery",
    description: "Pay with cash upon delivery",
  },
};

interface WCPaymentGateway {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  method_title: string;
  method_description: string;
  settings?: Record<string, { value: string }>;
}

interface CartResponse {
  payment_methods?: string[];
}

export async function GET() {
  try {
    if (gatewaysCache && Date.now() - gatewaysCache.timestamp < GATEWAYS_CACHE_TTL) {
      return gatewaysJson(gatewaysCache.data);
    }

    const { consumerKey, consumerSecret } = getWcCredentials();
    
    if (consumerKey && consumerSecret) {
      const url = `${API_BASE}/payment_gateways?${getBasicAuthParams()}`;
      
      const response = await fetch(noCacheUrl(url), {
        method: "GET",
        headers: backendHeaders(),
        cache: "no-store",
      });

      if (response.ok) {
        const data: WCPaymentGateway[] = await response.json();
        
        const enabledGateways = data
          .filter((gateway) => gateway.enabled)
          .sort((a, b) => a.order - b.order)
          .map((gateway) => {
            const details = PAYMENT_METHOD_DETAILS[gateway.id];
            return {
              id: gateway.id,
              title: details?.title || gateway.title,
              description: details?.description || gateway.description || "",
              method_title: gateway.method_title,
              order: gateway.order,
              enabled: true, // Confirmed enabled from WooCommerce REST API
            };
          });

        // Check if MyFatoorah test mode is enabled
        const myFatoorahTestMode = getEnvVar("MYFATOORAH_TEST_MODE") === "true";

        const responseData = { 
          success: true, 
          gateways: enabledGateways,
          source: "woocommerce_rest_api",
          myfatoorah_test_mode: myFatoorahTestMode,
        };
        gatewaysCache = { data: responseData, timestamp: Date.now() };
        return gatewaysJson(responseData);
      }
    }
    
    const storeUrl = `${STORE_API_BASE}/cart`;
    
    const storeResponse = await fetch(noCacheUrl(storeUrl), {
      method: "GET",
      headers: backendHeaders(),
      cache: "no-store",
    });

    const storeData: CartResponse = await storeResponse.json();

    if (!storeResponse.ok) {
      return gatewaysJson(
        {
          success: false,
          error: {
            code: "payment_gateways_error",
            message: "Failed to get payment gateways.",
          },
        },
        { status: storeResponse.status }
      );
    }

    const paymentMethodIds = storeData.payment_methods || [];
    
    // When using Store API fallback, we cannot verify if payment methods are actually enabled
    // in the WooCommerce settings. Only include basic payment methods (COD, bank transfer)
    // and exclude BNPL providers (Tamara, Tabby) since we can't confirm their enabled status.
    const excludedFromFallback = ["tamara", "tamara-gateway", "tabby", "tabby_installments", "tabby_checkout"];
    
    const fallbackPaymentMethodIds = Array.from(new Set([...paymentMethodIds, "cod"]));

    const gateways = fallbackPaymentMethodIds
      .filter((id: string) => !excludedFromFallback.includes(id))
      .map((id: string, index: number) => {
        const details = PAYMENT_METHOD_DETAILS[id] || {
          title: id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          description: "",
        };
        return {
          id,
          title: details.title,
          description: details.description,
          method_title: details.title,
          order: index,
          enabled: true, // Assumed enabled since it's in the cart response
        };
      });

    // Check if MyFatoorah test mode is enabled
    const myFatoorahTestMode = getEnvVar("MYFATOORAH_TEST_MODE") === "true";

    const fallbackData = { 
      success: true, 
      gateways,
      source: "store_api_fallback",
      myfatoorah_test_mode: myFatoorahTestMode,
    };
    gatewaysCache = { data: fallbackData, timestamp: Date.now() };
    return gatewaysJson(fallbackData);
  } catch (error) {
    return gatewaysJson(
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
