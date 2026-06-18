import { NextRequest, NextResponse } from "next/server";
import { disableRuntimeCache, siteConfig } from "@/config/site";
import { filterCurrenciesForMarket, getMarketByHost, normalizeMarketHost } from "@/config/market";
import { backendHeaders } from "@/lib/utils/backendFetch";

// Default currencies (fallback if WordPress API is unavailable)
const DEFAULT_CURRENCIES = [
  { code: "AED", label: "UAE (AED)", symbol: "د.إ", decimals: 2, rateFromAED: 1 },
  { code: "BHD", label: "Bahrain (BHD)", symbol: "BD", decimals: 3, rateFromAED: 0.103 },
  { code: "KWD", label: "Kuwait (KWD)", symbol: "KD", decimals: 3, rateFromAED: 0.083 },
  { code: "OMR", label: "Oman (OMR)", symbol: "ر.ع.", decimals: 3, rateFromAED: 0.105 },
  { code: "QAR", label: "Qatar (QAR)", symbol: "QR", decimals: 2, rateFromAED: 0.99 },
  { code: "SAR", label: "Saudi Arabia (SAR)", symbol: "ر.س", decimals: 2, rateFromAED: 1.02 },
  { code: "USD", label: "United States (USD)", symbol: "$", decimals: 2, rateFromAED: 0.27 },
];

export interface CurrencyData {
  code: string;
  label: string;
  symbol: string;
  decimals: number;
  rateFromAED: number;
}

// GET - Retrieve all currencies from WordPress API
function marketForRequest(request: NextRequest) {
  return getMarketByHost(
    request.headers.get("x-frontend-host") ||
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host")
  );
}

function marketCurrencyResponse(currencies: CurrencyData[], request: NextRequest) {
  const market = marketForRequest(request);
  const filtered = filterCurrenciesForMarket(currencies, market);
  return filtered.length > 0 ? filtered : currencies.filter((currency) => currency.code === market.defaultCurrency);
}

export async function GET(request: NextRequest) {
  try {
    // Try to fetch currencies from WordPress REST API (ShapeHive Currencies plugin)
    const frontendHost = normalizeMarketHost(
      request.headers.get("x-frontend-host") ||
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host")
    );
    const wpApiUrl = `${siteConfig.apiUrl}/wp-json/sasanperfumes/v1/currencies${frontendHost ? `?frontend_host=${encodeURIComponent(frontendHost)}` : ""}`;
    
    const response = await fetch(wpApiUrl, {
      ...(disableRuntimeCache ? { cache: "no-store" as const } : { next: { revalidate: 60 } }), // Cache for 60 seconds outside development
      headers: backendHeaders(),
    });
    
    if (response.ok) {
      const currencies = await response.json();
      if (Array.isArray(currencies) && currencies.length > 0) {
        return NextResponse.json(marketCurrencyResponse(currencies, request));
      }
    }
    
    // If WordPress API fails or returns empty, use default currencies
    console.log("WordPress currencies API not available, using defaults");
    return NextResponse.json(marketCurrencyResponse(DEFAULT_CURRENCIES, request));
  } catch (error) {
    console.warn(`Failed to fetch currencies from WordPress: ${error instanceof Error ? error.message : String(error)}`);
    // Return default currencies on error
    return NextResponse.json(marketCurrencyResponse(DEFAULT_CURRENCIES, request));
  }
}
