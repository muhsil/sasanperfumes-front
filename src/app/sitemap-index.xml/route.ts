import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { buildSitemapIndexXml } from "@/lib/utils/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = siteConfig.url;
  const sitemaps = [
    { url: `${baseUrl}/sitemap-intl.xml` },
    { url: `${baseUrl}/sitemap-qa.xml` },
    { url: `${baseUrl}/sitemap-om.xml` },
    { url: `${baseUrl}/sitemap-sa.xml` },
    { url: `${baseUrl}/image-sitemap.xml` },
  ];

  return new NextResponse(buildSitemapIndexXml(sitemaps), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
