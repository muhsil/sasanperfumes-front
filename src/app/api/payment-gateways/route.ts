import { NextResponse } from "next/server";
import { getEnvVar, getWcCredentials } from "@/lib/utils/loadEnv";
import { getPaymentGatewayFilters, getPaymentGatewayOverrides } from "@/config/payment";
import {
  backendHeaders,
  noCacheUrl,
  safeJsonResponse,
  wpJsonBaseForMarket,
} from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";
import { isStripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

const PAYMENT_METHOD_DETAILS: Record<string, { title: string; description: string }> = {
  woocommerce_payments: {
    title: "Credit/Debit Card",
    description: "Pay securely with your card via WooPayments",
  },
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
  card: {
    title: "Credit/Debit Card",
    description: "Pay securely with your card",
  },
  stripe: {
    title: "Credit/Debit Card",
    description: "Pay securely with your card",
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

interface PaymentGatewayResponseItem {
  id: string;
  title: string;
  description: string;
  method_title: string;
  order: number;
  enabled: boolean;
}

function expandPaymentGatewayIdAliases(ids: string[]): Set<string> {
  const normalized = new Set(ids.map((id) => id.toLowerCase()));

  if (normalized.has("stripe")) {
    normalized.add("woocommerce_payments");
    normalized.add("card");
  }

  if (normalized.has("woocommerce_payments")) {
    normalized.add("stripe");
    normalized.add("card");
  }

  if (normalized.has("card")) {
    normalized.add("stripe");
    normalized.add("woocommerce_payments");
  }

  return normalized;
}

function isPaymentGatewayAllowed(
  id: string,
  allowedSet: Set<string>,
  isAllowedFilterEnabled: boolean
): boolean {
  if (!isAllowedFilterEnabled) return true;

  return allowedSet.has(id.toLowerCase());
}

function isGatewayArray(value: unknown): value is WCPaymentGateway[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && "id" in item);
}

function applyPaymentGatewayFilters(
  gateways: PaymentGatewayResponseItem[],
  filters: { allowed: string[]; blocked: string[] }
): PaymentGatewayResponseItem[] {
  if (filters.allowed.length > 0) {
    const allowSet = expandPaymentGatewayIdAliases(filters.allowed);
    gateways = gateways.filter((gateway) => allowSet.has(gateway.id.toLowerCase()));
  }

  if (filters.blocked.length > 0) {
    const blockSet = new Set(filters.blocked.map((id) => id.toLowerCase()));
    gateways = gateways.filter((gateway) => !blockSet.has(gateway.id.toLowerCase()));
  }

  return gateways;
}

function mergeGatewayOverrides(
  gateways: PaymentGatewayResponseItem[],
  overrides: ReturnType<typeof getPaymentGatewayOverrides>
): PaymentGatewayResponseItem[] {
  const gatewayMap = new Map<string, PaymentGatewayResponseItem>();

  for (const gateway of gateways) {
    gatewayMap.set(gateway.id, { ...gateway });
  }

  for (const override of overrides) {
    if (!override.id) continue;

    if (override.enabled === false) {
      gatewayMap.delete(override.id);
      continue;
    }

    const existing = gatewayMap.get(override.id);
    const fallbackTitle = override.title || existing?.title || override.id;

    gatewayMap.set(override.id, {
      id: override.id,
      title: fallbackTitle,
      description: override.description ?? existing?.description ?? "",
      method_title: override.title || existing?.method_title || fallbackTitle,
      order: override.order ?? existing?.order ?? gateways.length,
      enabled: true,
    });
  }

  return Array.from(gatewayMap.values()).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function addStripeFallbackGateway(
  gateways: PaymentGatewayResponseItem[],
  filters: { allowed: string[]; blocked: string[] }
): PaymentGatewayResponseItem[] {
  if (!isStripeConfigured()) {
    return gateways;
  }

  const allowedSet = expandPaymentGatewayIdAliases(filters.allowed);
  const blockedSet = new Set(filters.blocked.map((id) => id.toLowerCase()));

  if (allowedSet.size === 0) {
    return gateways;
  }

  const allowStripe = allowedSet.has("stripe") || allowedSet.has("woocommerce_payments");
  const blockStripe = blockedSet.has("stripe");

  if (!allowStripe || blockStripe) {
    return gateways;
  }

  const hasStripeGateway = gateways.some((gateway) => {
    const id = gateway.id.toLowerCase();
    return id === "stripe" || id === "woocommerce_payments";
  });

  if (hasStripeGateway) {
    return gateways;
  }

  const fallbackOrder = gateways.length + 1;
  const fallbackGateway: PaymentGatewayResponseItem = {
    id: "stripe",
    title: PAYMENT_METHOD_DETAILS.stripe.title,
    description: PAYMENT_METHOD_DETAILS.stripe.description,
    method_title: PAYMENT_METHOD_DETAILS.stripe.title,
    order: fallbackOrder,
    enabled: true,
  };

  return [...gateways, fallbackGateway].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export async function GET() {
  try {
    const market = await getRequestMarket();
    const gatewayOverrides = getPaymentGatewayOverrides();
    const gatewayFilters = getPaymentGatewayFilters(market.code);
    const wpJsonBase = wpJsonBaseForMarket(market.code);
    const apiBase = `${wpJsonBase}/wc/v3`;
    const storeApiBase = `${wpJsonBase}/wc/store/v1`;

    if (gatewaysCache && Date.now() - gatewaysCache.timestamp < GATEWAYS_CACHE_TTL) {
      return gatewaysJson(gatewaysCache.data);
    }

    const { consumerKey, consumerSecret } = getWcCredentials(market.code);
    const allowedGatewaySet = expandPaymentGatewayIdAliases(gatewayFilters.allowed);
    const hasAllowFilter = gatewayFilters.allowed.length > 0;
    
    if (consumerKey && consumerSecret) {
      const url = `${apiBase}/payment_gateways?${getBasicAuthParams(market.code)}`;
      
      const response = await fetch(noCacheUrl(url), {
        method: "GET",
        headers: backendHeaders(),
        cache: "no-store",
      });

      if (response.ok) {
        const data = await safeJsonResponse(response);

        if (isGatewayArray(data)) {
        const enabledGateways: PaymentGatewayResponseItem[] = data
            .filter((gateway) => {
              if (gateway.enabled) {
                return isPaymentGatewayAllowed(gateway.id, allowedGatewaySet, hasAllowFilter);
              }
              return false;
            })
            .sort((a, b) => a.order - b.order)
            .map((gateway) => {
              const details = PAYMENT_METHOD_DETAILS[gateway.id];
              return {
                id: gateway.id,
                title: details?.title || gateway.title,
                description: details?.description || gateway.description || "",
                method_title: gateway.method_title,
                order: gateway.order,
                enabled: true,
              };
            });

          const mergedGateways = addStripeFallbackGateway(
            applyPaymentGatewayFilters(
              mergeGatewayOverrides(enabledGateways, gatewayOverrides),
              gatewayFilters
            ),
            gatewayFilters
          );

          // Check if MyFatoorah test mode is enabled
          const myFatoorahTestMode = getEnvVar("MYFATOORAH_TEST_MODE") === "true";

            const responseData = {
              success: true,
              gateways: mergedGateways,
              source: gatewayOverrides.length > 0 ? "woocommerce_rest_api+hostinger_env" : "woocommerce_rest_api",
              myfatoorah_test_mode: myFatoorahTestMode,
            };
          gatewaysCache = { data: responseData, timestamp: Date.now() };
          return gatewaysJson(responseData);
        }
      }
    }
    
    const storeUrl = `${storeApiBase}/cart`;
    
    const storeResponse = await fetch(noCacheUrl(storeUrl), {
      method: "GET",
      headers: backendHeaders(),
      cache: "no-store",
    });

    const storeData = await safeJsonResponse(storeResponse);

    if (!storeResponse.ok) {
      const envFallbackGateways = addStripeFallbackGateway(
        applyPaymentGatewayFilters(
          mergeGatewayOverrides([], gatewayOverrides),
          gatewayFilters
        ),
        gatewayFilters
      );

      if (envFallbackGateways.length > 0) {
        const fallbackData = {
          success: true,
          gateways: envFallbackGateways,
          source: gatewayOverrides.length > 0 ? "hostinger_env_fallback+overrides" : "hostinger_env_fallback",
          myfatoorah_test_mode: getEnvVar("MYFATOORAH_TEST_MODE") === "true",
        };
        gatewaysCache = { data: fallbackData, timestamp: Date.now() };
        return gatewaysJson(fallbackData);
      }

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

    const paymentMethodIds = Array.isArray((storeData as CartResponse).payment_methods)
      ? (storeData as CartResponse).payment_methods || []
      : [];
    
    // When using Store API fallback, we cannot verify if payment methods are actually enabled
    // in the WooCommerce settings. Only include basic payment methods (COD, bank transfer)
    // and exclude BNPL providers (Tamara, Tabby) since we can't confirm their enabled status.
    const excludedFromFallback = ["tamara", "tamara-gateway", "tabby", "tabby_installments", "tabby_checkout"];
    
    const fallbackPaymentMethodIds = Array.from(new Set([...paymentMethodIds, "cod"]));

    const gateways = addStripeFallbackGateway(
      applyPaymentGatewayFilters(
        mergeGatewayOverrides(
          fallbackPaymentMethodIds
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
            }),
          gatewayOverrides
        ),
        gatewayFilters
      ),
      gatewayFilters
    );

    // Check if MyFatoorah test mode is enabled
    const myFatoorahTestMode = getEnvVar("MYFATOORAH_TEST_MODE") === "true";

    const fallbackData = { 
      success: true, 
      gateways,
      source: gatewayOverrides.length > 0 ? "store_api_fallback+hostinger_env" : "store_api_fallback",
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
