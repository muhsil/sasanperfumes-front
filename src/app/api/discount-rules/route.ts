import { NextRequest, NextResponse } from "next/server";
import { getDiscountRules } from "@/lib/api/wordpress";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const VALID_MARKETS = new Set(["qa", "om", "sa"]);

export async function GET(request: NextRequest) {
  const rawMarket = request.nextUrl.searchParams.get("market") || "";
  const market = VALID_MARKETS.has(rawMarket) ? rawMarket : "";
  const baseHost = siteConfig.apiUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const frontendHost = market ? `${baseHost}/${market}` : "";

  const rules = await getDiscountRules(frontendHost);
  return NextResponse.json(rules);
}
