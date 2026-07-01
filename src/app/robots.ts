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
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/image-sitemap.xml`,
    ],
  };
}
