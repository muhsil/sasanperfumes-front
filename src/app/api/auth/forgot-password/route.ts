import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { checkRateLimit, rateLimitResponse, FORGOT_PASSWORD_RATE_LIMIT } from "@/lib/security";

const API_BASE = siteConfig.apiUrl;

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

async function tryWooCommerceLostPassword(email: string): Promise<boolean> {
  try {
    const lostPasswordUrl = `${API_BASE}/my-account/lost-password/`;
    const pageResponse = await fetch(lostPasswordUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; sasanperfumes-Frontend/1.0)",
      },
    });

    if (!pageResponse.ok) {
      return false;
    }

    const html = await pageResponse.text();
    
    const nonceMatch = html.match(/name="woocommerce-lost-password-nonce"\s+value="([^"]+)"/);
    if (!nonceMatch) {
      return false;
    }
    const nonce = nonceMatch[1];

    const cookies = pageResponse.headers.get("set-cookie") || "";

    const formData = new URLSearchParams();
    formData.append("user_login", email);
    formData.append("wc_reset_password", "true");
    formData.append("woocommerce-lost-password-nonce", nonce);
    formData.append("_wp_http_referer", "/my-account/lost-password/");

    const submitResponse = await fetch(lostPasswordUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; sasanperfumes-Frontend/1.0)",
        "Cookie": cookies,
        "Referer": lostPasswordUrl,
      },
      body: formData.toString(),
      redirect: "manual",
    });

    if (submitResponse.status === 302 || submitResponse.status === 200) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("WooCommerce lost password error:", error);
    return false;
  }
}

async function trySasanPasswordReset(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/wp-json/sasanperfumes/v1/account/request-password-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      return true;
    }

    const errorData = await response.json().catch(() => ({}));
    if (response.status !== 404 && errorData.code !== "rest_no_route") {
      console.error("Sasan password reset endpoint failed:", response.status, errorData);
    }

    return false;
  } catch (error) {
    console.error("Sasan password reset endpoint error:", error);
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ForgotPasswordResponse>> {
  // Check rate limit
  const rateLimitResult = checkRateLimit(request, FORGOT_PASSWORD_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.resetTime) as NextResponse<ForgotPasswordResponse>;
  }

  try {
    const body: ForgotPasswordRequest = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_email",
            message: "Email address is required",
          },
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_email",
            message: "Please enter a valid email address",
          },
        },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    if (await trySasanPasswordReset(trimmedEmail)) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      });
    }

    const bdpwrResponse = await fetch(`${API_BASE}/wp-json/bdpwr/v1/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: trimmedEmail }),
    });

    if (bdpwrResponse.ok) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      });
    }

    const errorData = await bdpwrResponse.json().catch(() => ({}));
    
    if (bdpwrResponse.status === 404 || errorData.code === "rest_no_route") {
      const wpResponse = await fetch(`${API_BASE}/wp-json/wp/v2/users/lostpassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_login: trimmedEmail }),
      });

      if (wpResponse.ok) {
        return NextResponse.json({
          success: true,
          message: "If an account exists with this email, you will receive a password reset link shortly.",
        });
      }

      const wpErrorData = await wpResponse.json().catch(() => ({}));
      if (wpResponse.status === 404 || wpErrorData.code === "rest_no_route") {
        await tryWooCommerceLostPassword(trimmedEmail);
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
    });
  }
}
