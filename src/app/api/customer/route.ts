import { NextRequest, NextResponse } from "next/server";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { backendMarketHeaders, backendMarketPostHeaders, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

function getCustomersApiBase(marketCode?: string | null): string {
  return `${wpJsonBaseForMarket(marketCode)}/wc/v3`;
}

function getBasicAuthParams(marketCode?: string | null): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { success: false, error: { code: "missing_customer_id", message: "Customer ID is required" } },
      { status: 400 }
    );
  }

  try {
    const market = await getRequestMarket();
    const response = await fetch(
      `${getCustomersApiBase(market.code)}/customers/${customerId}?${getBasicAuthParams(market.code)}`,
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
            code: data.code || "customer_error",
            message: data.message || "Failed to get customer.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
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

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { success: false, error: { code: "missing_customer_id", message: "Customer ID is required" } },
      { status: 400 }
    );
  }

  try {
    const market = await getRequestMarket();
    const body = await request.json();

    const response = await fetch(
      `${getCustomersApiBase(market.code)}/customers/${customerId}?${getBasicAuthParams(market.code)}`,
      {
        method: "PUT",
        headers: backendMarketPostHeaders(market.code, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "customer_update_error",
            message: data.message || "Failed to update customer.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
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

export async function POST(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const body = await request.json();

    const response = await fetch(
      `${getCustomersApiBase(market.code)}/customers?${getBasicAuthParams(market.code)}`,
      {
        method: "POST",
        headers: backendMarketPostHeaders(market.code, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: data.code || "customer_create_error",
            message: data.message || "Failed to create customer.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
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
