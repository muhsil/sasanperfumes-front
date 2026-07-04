import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { buildSitemapIndexXml } from "@/lib/utils/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = siteConfig.url;
  const now = new Date();

  const sitemaps = [
    { url: `${baseUrl}/sitemap.xml`, lastModified: now },
    { url: `${baseUrl}/sitemap-intl.xml`, lastModified: now },
    { url: `${baseUrl}/sitemap-qa.xml`, lastModified: now },
    { url: `${baseUrl}/sitemap-om.xml`, lastModified: now },
    { url: `${baseUrl}/sitemap-sa.xml`, lastModified: now },
    { url: `${baseUrl}/image-sitemap.xml`, lastModified: now },
  ];

  return new NextResponse(buildSitemapIndexXml(sitemaps), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
