import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/security";

const API_BASE = `${siteConfig.apiUrl}/wp-json/wc/v3`;

function getBasicAuthParams(): string {
  const { consumerKey, consumerSecret } = getWcCredentials();
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

const CANCELLABLE_STATUSES = ["pending", "processing", "on-hold"];

interface CancelOrderRequest {
  order_id: number;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error);
    }

    const body: CancelOrderRequest = await request.json();

    if (!body.order_id) {
      return NextResponse.json(
        { success: false, error: { code: "missing_params", message: "Order ID is required" } },
        { status: 400 }
      );
    }

    const cancellationReason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!cancellationReason) {
      return NextResponse.json(
        { success: false, error: { code: "reason_required", message: "Cancellation reason is required" } },
        { status: 400 }
      );
    }

    if (cancellationReason.length > 500) {
      return NextResponse.json(
        { success: false, error: { code: "reason_too_long", message: "Cancellation reason must be 500 characters or fewer" } },
        { status: 400 }
      );
    }

    const orderUrl = `${API_BASE}/orders/${body.order_id}?${getBasicAuthParams()}`;
    const orderResponse = await fetch(orderUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorData.code || "order_error",
            message: errorData.message || "Failed to get order.",
          },
        },
        { status: orderResponse.status }
      );
    }

    const orderData = await orderResponse.json();

    if (orderData.customer_id !== authResult.user.user_id) {
      return forbiddenResponse("You do not have permission to cancel this order");
    }

    if (!CANCELLABLE_STATUSES.includes(orderData.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "order_not_cancellable",
            message: `Order cannot be cancelled. Current status: ${orderData.status}`,
          },
        },
        { status: 400 }
      );
    }

    const noteText = `Customer requested order cancellation. Reason: ${cancellationReason}`;

    const noteUrl = `${API_BASE}/orders/${body.order_id}/notes?${getBasicAuthParams()}`;
    const noteResponse = await fetch(noteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note: noteText,
        customer_note: true,
      }),
    });

    if (!noteResponse.ok) {
      const noteError = await noteResponse.json();
      return NextResponse.json(
        {
          success: false,
          error: {
            code: noteError.code || "note_error",
            message: noteError.message || "Failed to add cancellation note.",
          },
        },
        { status: noteResponse.status }
      );
    }

    const updateUrl = `${API_BASE}/orders/${body.order_id}?${getBasicAuthParams()}`;
    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "cancelled",
        meta_data: [
          { key: "_sasan_cancellation_reason", value: cancellationReason },
          { key: "_sasan_cancellation_source", value: "customer" },
        ],
      }),
    });

    if (!updateResponse.ok) {
      const updateError = await updateResponse.json();
      return NextResponse.json(
        {
          success: false,
          error: {
            code: updateError.code || "update_error",
            message: updateError.message || "Failed to update order status.",
          },
        },
        { status: updateResponse.status }
      );
    }

    const updatedOrder = await updateResponse.json();

    return NextResponse.json({
      success: true,
      message: "Order cancellation request submitted successfully",
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
      },
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
