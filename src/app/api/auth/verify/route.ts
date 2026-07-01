import { NextRequest, NextResponse } from "next/server";
import { backendMarketPostHeaders, noCacheUrl, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";

export async function POST(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const wpJsonBase = wpJsonBaseForMarket(market.code);
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, valid: false },
        { status: 401 }
      );
    }

    const response = await fetch(noCacheUrl(`${wpJsonBase}/cocart/jwt/validate-token`), {
      method: "POST",
      headers: backendMarketPostHeaders(market.code, { "Authorization": authHeader }),
      body: JSON.stringify({}),
    });

    if (response.ok) {
      return NextResponse.json({ success: true, valid: true });
    }

    return NextResponse.json(
      { success: false, valid: false },
      { status: response.status }
    );
  } catch {
    return NextResponse.json(
      { success: false, valid: false },
      { status: 500 }
    );
  }
}
