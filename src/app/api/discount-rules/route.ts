import { NextRequest, NextResponse } from "next/server";
import { getDiscountRules } from "@/lib/api/wordpress";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") || "";
  const baseHost = siteConfig.apiUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const frontendHost = market ? `${baseHost}/${market}` : "";

  const rules = await getDiscountRules(frontendHost);
  return NextResponse.json(rules);
}
