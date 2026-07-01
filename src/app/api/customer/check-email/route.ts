import { NextRequest, NextResponse } from "next/server";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { backendMarketHeaders, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

function getBasicAuthParams(marketCode?: string | null): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { success: false, error: { code: "missing_email", message: "Email is required" } },
      { status: 400 }
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_email", message: "Invalid email format" } },
      { status: 400 }
    );
  }

  try {
    const market = await getRequestMarket();
    const apiBase = `${wpJsonBaseForMarket(market.code)}/wc/v3`;

    // Search for customers with this email
    const response = await fetch(
      `${apiBase}/customers?email=${encodeURIComponent(email)}&${getBasicAuthParams(market.code)}`,
      {
        method: "GET",
        headers: backendMarketHeaders(market.code, {
          "Content-Type": "application/json",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "check_email_error",
            message: data.message || "Failed to check email.",
          },
        },
        { status: response.status }
      );
    }

    // Check if any customers were found with this email
    const isRegistered = Array.isArray(data) && data.length > 0;

    return NextResponse.json({ 
      success: true, 
      data: { 
        isRegistered,
        // Don't expose customer details for security
      } 
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
