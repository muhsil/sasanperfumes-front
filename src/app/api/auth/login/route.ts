import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, LOGIN_RATE_LIMIT } from "@/lib/security";
import { backendMarketPostHeaders, noCacheUrl, safeJsonResponse, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    token: string;
    wp_token?: string;
    refresh_token?: string;
    user_id: number;
    user_email: string;
    user_nicename: string;
    user_display_name: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  // Check rate limit
  const rateLimitResult = checkRateLimit(request, LOGIN_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.resetTime) as NextResponse<LoginResponse>;
  }

  try {
    const market = await getRequestMarket();
    const wpJsonBase = wpJsonBaseForMarket(market.code);
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    if (!username || !username.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_username",
            message: "Email is required",
          },
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_password",
            message: "Password is required",
          },
        },
        { status: 400 }
      );
    }

    const response = await fetch(noCacheUrl(`${wpJsonBase}/cocart/v2/login`), {
      method: "POST",
      headers: backendMarketPostHeaders(market.code),
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const data = await safeJsonResponse(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: String(data.code || "login_failed"),
            message: String(data.message || "Login failed. Please check your credentials."),
          },
        },
        { status: response.status }
      );
    }

    let wpToken: string | undefined;
    try {
      const wpResponse = await fetch(noCacheUrl(`${wpJsonBase}/jwt-auth/v1/token`), {
        method: "POST",
        headers: backendMarketPostHeaders(market.code),
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (wpResponse.ok) {
        const wpData = await safeJsonResponse(wpResponse);
        wpToken = wpData.token as string;
      }
    } catch {
    }

    return NextResponse.json({
      success: true,
      user: {
        token: String((data.extras as Record<string, unknown>)?.jwt_token || data.jwt_token || data.token || ""),
        wp_token: wpToken,
        refresh_token: String((data.extras as Record<string, unknown>)?.jwt_refresh || data.jwt_refresh_token || data.refresh_token || ""),
        user_id: parseInt(String(data.user_id || "0")) || (data.id as number) || 0,
        user_email: String(data.email || data.user_email || ""),
        user_nicename: String(data.user_nicename || data.nicename || data.username || ""),
        user_display_name: String(data.display_name || data.user_display_name || data.username || ""),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
