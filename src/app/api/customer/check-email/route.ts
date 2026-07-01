import { NextRequest, NextResponse } from "next/server";
import { backendMarketHeaders, safeJsonResponse, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

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

    const response = await fetch(
      `${wpJsonBaseForMarket(market.code)}/sasanperfumes/v1/customers/check-email?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: backendMarketHeaders(market.code, {
          "Content-Type": "application/json",
        }),
      }
    );

    const data = await safeJsonResponse(response);

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

    const isRegistered = Boolean(data.isRegistered || data.is_registered);

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
