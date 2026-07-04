import { NextResponse } from "next/server";
import { generateMarketSitemap } from "../sitemap";
import { buildSitemapXml } from "@/lib/utils/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const entries = await generateMarketSitemap("qa", "QAR");
  return new NextResponse(buildSitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
