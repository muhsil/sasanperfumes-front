import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/lib/api/wordpress";

export async function GET(request: NextRequest) {
  const siteSettings = await getSiteSettings(siteConfig.defaultLocale);
  const faviconUrl = siteSettings.favicon?.url;

  if (faviconUrl) {
    const proxiedFaviconUrl = faviconUrl.replace(
      /^https?:\/\/[^/]+\/wp-content\/uploads\//,
      "/cms-media/"
    );
    const redirectUrl = new URL(proxiedFaviconUrl, request.url);

    if (siteSettings.favicon?.id) {
      redirectUrl.searchParams.set("v", String(siteSettings.favicon.id));
    }

    return NextResponse.redirect(redirectUrl, {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return NextResponse.redirect(new URL("/sasan-fav.png", request.url), {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=86400",
    }
  });
}
