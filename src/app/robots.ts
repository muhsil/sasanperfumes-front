import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/cms-media/",
          "/_next/",
          "/*/cart",
          "/*/checkout",
          "/*/account",
          "/*/account/*",
          "/*/wishlist",
          "/*/compare",
        ],
      },
    ],
    sitemap: [
      `${siteConfig.url}/sitemap-index.xml`,
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/sitemap-intl.xml`,
      `${siteConfig.url}/sitemap-qa.xml`,
      `${siteConfig.url}/sitemap-om.xml`,
      `${siteConfig.url}/sitemap-sa.xml`,
      `${siteConfig.url}/image-sitemap.xml`,
    ],
  };
}
