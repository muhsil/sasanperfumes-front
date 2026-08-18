import { NextResponse } from "next/server";
import { buildGoogleMerchantFeed } from "@/lib/utils/merchant-feed";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const feed = await buildGoogleMerchantFeed("sa", "SAR");
  return new NextResponse(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
