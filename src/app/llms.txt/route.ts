import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export async function GET() {
  const content = `# ${siteConfig.name}

> Premium handcrafted fragrances made in the UAE

## About
ShapeHive is a luxury fragrance house based in the United Arab Emirates, specializing in handcrafted perfumes, ouds, and personal care products. We offer a curated collection of premium scents inspired by Arabian heritage.

## Links
- Website: ${siteConfig.url}
- Shop: ${siteConfig.url}/en/shop
- Store Locator: ${siteConfig.url}/en/store-locator
- About Us: ${siteConfig.url}/en/about
- Contact: ${siteConfig.url}/en/contact
- Full LLM Context: ${siteConfig.url}/llms-full.txt

## Product Categories
- Perfumes: ${siteConfig.url}/en/category/perfumes
- Oud: ${siteConfig.url}/en/category/oud
- Personal Care: ${siteConfig.url}/en/category/personal-care
- Gift Sets: ${siteConfig.url}/en/category/gift-sets
- Build Your Own Set: ${siteConfig.url}/en/category/build-your-own-set

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
