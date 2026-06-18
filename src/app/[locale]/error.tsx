import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export async function GET() {
  const content = `# ${siteConfig.name}

> UAE perfume store for everyday fragrances, hair mist, all over sprays, and gift sets

## About
Sasan Perfumes is a UAE fragrance store offering perfumes, hair mist, all over sprays, and gift-ready scent collections online.

## Links
- Website: ${siteConfig.url}
- Shop: ${siteConfig.url}/en/shop
- About Us: ${siteConfig.url}/en/about-us
- Contact: ${siteConfig.url}/en/contact-us
- Full LLM Context: ${siteConfig.url}/llms-full.txt

## Product Categories
- Perfumes: ${siteConfig.url}/en/category/perfumes
- All Over Spray: ${siteConfig.url}/en/category/all-over-spray
- Hair Mist: ${siteConfig.url}/en/category/sasan-hair-mist
- Gift Sets: ${siteConfig.url}/en/category/gift-set

## Languages
- English: ${siteConfig.url}/en
- Arabic: ${siteConfig.url}/ar
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
