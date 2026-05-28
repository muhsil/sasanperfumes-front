import { NextResponse } from "next/server";
import { disableRuntimeCache, siteConfig } from "@/config/site";

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
export async function GET() {
  try {
    // Try to fetch currencies from WordPress REST API (ShapeHive Currencies plugin)
    const wpApiUrl = `${siteConfig.apiUrl}/wp-json/sasanperfumes/v1/currencies`;
    
    const response = await fetch(wpApiUrl, {
      ...(disableRuntimeCache ? { cache: "no-store" as const } : { next: { revalidate: 60 } }), // Cache for 60 seconds outside development
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (response.ok) {
      const currencies = await response.json();
      if (Array.isArray(currencies) && currencies.length > 0) {
        return NextResponse.json(currencies);
      }
    }
    
    // If WordPress API fails or returns empty, use default currencies
    console.log("WordPress currencies API not available, using defaults");
    return NextResponse.json(DEFAULT_CURRENCIES);
  } catch (error) {
    console.warn(`Failed to fetch currencies from WordPress: ${error instanceof Error ? error.message : String(error)}`);
    // Return default currencies on error
    return NextResponse.json(DEFAULT_CURRENCIES);
  }
}
