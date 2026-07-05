import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getCategories } from "@/lib/api/woocommerce";
import type { Locale } from "@/config/site";

export const revalidate = 3600;

export async function GET() {
  let categoriesSection = "";

  try {
    const categories = await getCategories("en" as Locale);
    if (categories.length > 0) {
      categoriesSection = `## Product Categories\n${categories
        .filter((c) => c.count > 0)
        .map(
          (c) =>
            `- ${c.name} (${c.count} products): ${siteConfig.url}/en/category/${c.slug}`
        )
        .join("\n")}`;
    }
  } catch {
    categoriesSection = `## Product Categories
- Perfumes: ${siteConfig.url}/en/category/perfumes
- All Over Spray: ${siteConfig.url}/en/category/all-over-spray
- Hair Mist: ${siteConfig.url}/en/category/sasan-hair-mist
- Gift Sets: ${siteConfig.url}/en/category/gift-set`;
  }

  const content = `# ${siteConfig.name}

> UAE perfume store for everyday fragrances, hair mist, all over sprays, and gift sets

## About
Sasan Perfumes is a UAE fragrance store offering perfumes, hair mist, all over sprays, and gift-ready scent collections online.

Our focus is a simple, polished fragrance experience: discover a scent, choose a thoughtful gift, or request private-label perfume support.

## Website
- Homepage: ${siteConfig.url}
- English: ${siteConfig.url}/en
- Arabic: ${siteConfig.url}/ar

## Shopping
- All Products: ${siteConfig.url}/en/shop
- Private Labeling: ${siteConfig.url}/en/private-labeling

${categoriesSection}

## Customer Information
- About Us: ${siteConfig.url}/en/about-us
- Contact Us: ${siteConfig.url}/en/contact-us
- Guides: ${siteConfig.url}/en/guides
- WhatsApp: ${siteConfig.contact.whatsapp}
- Complaints & Calls: ${siteConfig.contact.callPhone}

## Policies
- Return Policy: ${siteConfig.url}/en/returns
- Privacy Policy: ${siteConfig.url}/en/privacy
- Terms of Service: ${siteConfig.url}/en/terms-and-conditions
- Shipping Policy: ${siteConfig.url}/en/shipping

## Key Features
- Bilingual (English & Arabic)
- Free delivery available on eligible orders in the UAE
- International shipping available
- Gift wrapping available
- Private-label perfume support
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
