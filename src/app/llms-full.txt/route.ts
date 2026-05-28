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
- Oud: ${siteConfig.url}/en/category/oud
- Personal Care: ${siteConfig.url}/en/category/personal-care
- Gift Sets: ${siteConfig.url}/en/category/gift-sets
- Build Your Own Set: ${siteConfig.url}/en/category/build-your-own-set`;
  }

  const content = `# ${siteConfig.name}

> Premium handcrafted fragrances made in the UAE

## About
ShapeHive is a luxury fragrance house based in the United Arab Emirates. We specialize in creating handcrafted perfumes, ouds, and personal care products that blend traditional Arabian fragrance artistry with modern techniques.

Our products are made locally in the UAE using premium ingredients. We offer free delivery on orders over 500 AED within the UAE, and ship internationally to Oman and other GCC countries.

## Website
- Homepage: ${siteConfig.url}
- English: ${siteConfig.url}/en
- Arabic: ${siteConfig.url}/ar

## Shopping
- All Products: ${siteConfig.url}/en/shop
- Build Your Own Set: ${siteConfig.url}/en/category/build-your-own-set

${categoriesSection}

## Store Locations
We have physical retail stores in the UAE and Oman:

### UAE - Abu Dhabi
- Yas Mall (Ground Floor)
- Bawabat Al Sharq Mall (First Floor)

### UAE - Al Ain
- Bawadi Mall (Ground Floor)
- Makani Zakher Mall (Ground Floor)

### UAE - Fujairah
- Fujairah City Centre (Ground Floor)

### Oman - Muscat
- Oman Mall (Ground Floor)

Opening Hours: 10:00 AM - 10:00 PM daily

## Customer Information
- Store Locator: ${siteConfig.url}/en/store-locator
- About Us: ${siteConfig.url}/en/about
- Contact Us: ${siteConfig.url}/en/contact
- Guides: ${siteConfig.url}/en/guides
- Phone: +971 4 344 2448

## Policies
- Return Policy: ${siteConfig.url}/en/return-policy
- Privacy Policy: ${siteConfig.url}/en/privacy-policy
- Terms of Service: ${siteConfig.url}/en/terms-conditions
- Shipping Policy: ${siteConfig.url}/en/shipping-policy

## Key Features
- Handcrafted in the UAE
- Premium natural ingredients
- Bilingual (English & Arabic)
- Free delivery on orders over 500 AED (UAE)
- International shipping available
- Gift wrapping available
- Build Your Own Set customization
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
