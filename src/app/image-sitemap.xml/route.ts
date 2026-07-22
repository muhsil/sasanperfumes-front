import { getProducts, getCategories } from "@/lib/api/woocommerce";
import { siteConfig } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";
import { marketConfigs, getMarketPathPrefix } from "@/config/market";
import { dedupeProductsForSitemap } from "@/app/sitemap";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function marketFrontendHost(marketCode: string): string {
  return marketCode === "intl" ? "sasanperfumes.com" : `sasanperfumes.com/${marketCode}`;
}

export const revalidate = 3600;

export async function GET() {
  const baseUrl = siteConfig.url;
  const locales = siteConfig.locales;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  for (const market of marketConfigs) {
    const prefix = getMarketPathPrefix(market.code);
    const frontendHost = marketFrontendHost(market.code);

    try {
      let page = 1;
      let totalPages = 1;
      const allProducts = [];
      do {
        const result = await getProducts({ page, per_page: 100, locale: "en", currency: market.defaultCurrency, frontendHost });
        allProducts.push(...result.products);
        totalPages = result.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      for (const product of dedupeProductsForSitemap(allProducts)) {
        for (const locale of locales) {
          const pageUrl = `${baseUrl}${prefix}/${locale}/product/${product.slug}`;
          const images = product.images || [];
          if (images.length === 0) continue;

          xml += `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>`;

          for (const img of images) {
            if (!img.src) continue;
            const categoryNames = product.categories?.map((c) => decodeHtmlEntities(c.name)).join(", ") || siteConfig.name;
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
      console.error(`Failed to fetch products for image sitemap (${market.code}):`, error);
    }

    try {
      const categories = await getCategories("en", market.defaultCurrency, frontendHost);

      const uniqueCategories = categories.filter(
        (category, index, all) => index === all.findIndex((candidate) => candidate.slug === category.slug)
      );
      for (const category of uniqueCategories) {
        if (!category.image?.src) continue;

        for (const locale of locales) {
          const pageUrl = `${baseUrl}${prefix}/${locale}/category/${category.slug}`;

          xml += `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(category.image.src)}</image:loc>
      <image:title>${escapeXml(decodeHtmlEntities(category.name))}</image:title>
      <image:caption>${escapeXml(`${decodeHtmlEntities(category.name)} - ${siteConfig.name}`)}</image:caption>
    </image:image>
  </url>`;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch categories for image sitemap (${market.code}):`, error);
    }
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
