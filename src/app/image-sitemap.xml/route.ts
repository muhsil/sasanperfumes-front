import { getProducts, getCategories } from "@/lib/api/woocommerce";
import { siteConfig } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  const baseUrl = siteConfig.url;
  const locales = siteConfig.locales;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  // --- Product pages with all product images ---
  try {
    const { products } = await getProducts({ per_page: 100, locale: "en" });

    for (const product of products) {
      for (const locale of locales) {
        const pageUrl = `${baseUrl}/${locale}/product/${product.slug}`;
        const images = product.images || [];

        if (images.length === 0) continue;

        xml += `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>`;

        for (const img of images) {
          if (!img.src) continue;
          const categoryNames = product.categories?.map((c) => decodeHtmlEntities(c.name)).join(", ") || "ShapeHive";
          xml += `
    <image:image>
      <image:loc>${escapeXml(img.src)}</image:loc>
      <image:title>${escapeXml(decodeHtmlEntities(product.name))}</image:title>
      <image:caption>${escapeXml(`${decodeHtmlEntities(product.name)} - ${categoryNames}`)}</image:caption>
    </image:image>`;
        }

        xml += `
  </url>`;
      }
    }
  } catch (error) {
    console.error("Failed to fetch products for image sitemap:", error);
  }

  // --- Category pages with category images ---
  try {
    const categories = await getCategories("en");

    for (const category of categories) {
      if (!category.image?.src) continue;

      for (const locale of locales) {
        const pageUrl = `${baseUrl}/${locale}/category/${category.slug}`;

        xml += `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(category.image.src)}</image:loc>
      <image:title>${escapeXml(decodeHtmlEntities(category.name))}</image:title>
      <image:caption>${escapeXml(`${decodeHtmlEntities(category.name)} - ShapeHive`)}</image:caption>
    </image:image>
  </url>`;
      }
    }
  } catch (error) {
    console.error("Failed to fetch categories for image sitemap:", error);
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
