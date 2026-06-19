import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { parseBackendJson } from "@/lib/utils/backendFetch";

const API_BASE = `${siteConfig.apiUrl}/wp-json/sasanperfumes/v1`;

interface ContactFormData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

function parseJsonResponse(text: string) {
  try {
    return text ? parseBackendJson<Record<string, unknown>>(text) : {};
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();
    const fullName =
      body.name?.trim() ||
      [body.firstName, body.lastName]
        .filter((part): part is string => Boolean(part?.trim()))
        .join(" ")
        .trim();
    const email = body.email?.trim() || "";
    const message = body.message?.trim() || "";

    if (!fullName || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "missing_fields",
            message: "Name, email, and message are required.",
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
            message: "Please enter a valid email address.",
          },
        },
        { status: 400 }
      );
    }

    const nameParts = fullName.split(/\s+/);
    const firstName = body.firstName?.trim() || nameParts[0] || fullName;
    const lastName = body.lastName?.trim() || nameParts.slice(1).join(" ");

    const url = `${API_BASE}/contact`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: body.phone || "",
        subject: body.subject || "General Inquiry",
        message,
      }),
    });

    const responseText = await response.text();
    const data = parseJsonResponse(responseText);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_backend_response",
            message: "Contact service returned an invalid response. Please try again.",
          },
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    if (data.success) {
      return NextResponse.json({
        success: true,
        message: data.message || "Your message has been sent successfully.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: data.code || "submission_error",
          message: data.message || "Failed to send message. Please try again.",
        },
      },
      { status: response.ok ? 400 : response.status }
    );
  } catch (error) {
    console.error("Contact form submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
