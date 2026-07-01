import { NextRequest, NextResponse } from "next/server";
import { backendMarketPostHeaders, noCacheUrl, safeJsonResponse, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

export async function POST(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const wpJsonBase = wpJsonBaseForMarket(market.code);
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "missing_token", message: "Refresh token is required" },
        },
        { status: 400 }
      );
    }

    const response = await fetch(noCacheUrl(`${wpJsonBase}/cocart/jwt/refresh-token`), {
      method: "POST",
      headers: backendMarketPostHeaders(market.code),
      body: JSON.stringify({ refresh_token }),
    });

    const data = await safeJsonResponse(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (data.code as string) || "refresh_failed",
            message: (data.message as string) || "Token refresh failed.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      token: (data.jwt_token as string) || (data.token as string),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "network_error", message: "Network error occurred" },
      },
      { status: 500 }
    );
  }
}
