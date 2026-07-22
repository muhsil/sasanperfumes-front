import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getProducts, getCategories } from "@/lib/api/woocommerce";
import { getGuidePages } from "@/lib/api/wordpress";
import { getMarketPathPrefix, marketConfigs } from "@/config/market";
import type { MarketCode } from "@/config/market";
import type { Currency } from "@/config/site";

const PRODUCT_PAGE_SIZE = 100;

function marketFrontendHost(marketCode: string): string {
  return marketCode === "intl" ? "sasanperfumes.com" : `sasanperfumes.com/${marketCode}`;
}

function marketUrl(baseUrl: string, marketCode: MarketCode, locale: string, path = ""): string {
  return `${baseUrl}${getMarketPathPrefix(marketCode)}/${locale}${path}`;
}

async function getAllProductsForMarket(marketCode: string, currency: Currency, frontendHost: string) {
  const products = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await getProducts({
      page,
      per_page: PRODUCT_PAGE_SIZE,
      locale: "en",
      currency,
      frontendHost,
    });
    products.push(...result.products);
    totalPages = result.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return products;
}

const staticPages = [
  "",
  "/shop",
  "/about-us",
  "/contact-us",
  "/faq",
  "/new-products",
  "/featured-products",
  "/build-your-own-set",
  "/store-listing",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms-and-conditions",
  "/notes/oud",
  "/notes/musk",
  "/notes/vanilla",
  "/notes/rose",
  "/notes/amber",
];

function withLanguageAlternates(baseUrl: string, marketCode: MarketCode, page: string) {
  const en = marketUrl(baseUrl, marketCode, "en", page);
  return {
    en,
    ar: marketUrl(baseUrl, marketCode, "ar", page),
    "x-default": en,
  };
}

function canonicalProductKey(product: Awaited<ReturnType<typeof getAllProductsForMarket>>[number]): string {
  const normalizedName = product.name.replace(/<[^>]*>/g, " ").replace(/&(?:amp|#038);/gi, "&").replace(/\s+/g, " ").trim().toLowerCase();
  const category = product.categories?.[0]?.slug || "uncategorized";
  const sku = product.sku?.trim().toLowerCase();
  const image = product.images?.[0]?.src?.split("/").pop()?.toLowerCase() || "";
  return sku ? `sku:${sku}|${normalizedName}` : `content:${normalizedName}|${category}|${image}`;
}

function canonicalSlugScore(slug: string): number {
  let score = slug.length;
  if (/-ar(?:-|$)/i.test(slug)) score += 100;
  if (/-\d+$/.test(slug)) score += 50;
  return score;
}

export function dedupeProductsForSitemap<T extends Awaited<ReturnType<typeof getAllProductsForMarket>>[number]>(products: T[]): T[] {
  const canonicalProducts = new Map<string, T>();
  for (const product of products) {
    const key = canonicalProductKey(product);
    const current = canonicalProducts.get(key);
    if (!current || canonicalSlugScore(product.slug) < canonicalSlugScore(current.slug)) {
      canonicalProducts.set(key, product);
    }
  }
  return Array.from(canonicalProducts.values());
}

async function generateMarketSitemap(marketCode: MarketCode, currency: Currency): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const locales = siteConfig.locales;
  const frontendHost = marketFrontendHost(marketCode);
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: marketUrl(baseUrl, marketCode, locale, page),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: marketCode === "intl" && page === "" ? 1.0 : page === "" ? 0.95 : 0.8,
        alternates: {
          languages: withLanguageAlternates(baseUrl, marketCode, page),
        },
      });
    }
  }

  try {
    const products = dedupeProductsForSitemap(await getAllProductsForMarket(marketCode, currency, frontendHost));
    for (const product of products) {
      for (const locale of locales) {
        entries.push({
          url: marketUrl(baseUrl, marketCode, locale, `/product/${product.slug}`),
          changeFrequency: "weekly",
          priority: 0.9,
          alternates: {
            languages: withLanguageAlternates(baseUrl, marketCode, `/product/${product.slug}`),
          },
        });
      }
    }
  } catch (error) {
    console.error(`Failed to fetch products for ${marketCode} sitemap:`, error);
  }

  try {
    const categories = await getCategories("en", currency, frontendHost);
    const uniqueCategories = categories.filter(
      (category, index, all) => index === all.findIndex((candidate) => candidate.slug === category.slug)
    );
    for (const category of uniqueCategories) {
      for (const locale of locales) {
        entries.push({
          url: marketUrl(baseUrl, marketCode, locale, `/category/${category.slug}`),
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: withLanguageAlternates(baseUrl, marketCode, `/category/${category.slug}`),
          },
        });
      }
    }
  } catch (error) {
    console.error(`Failed to fetch categories for ${marketCode} sitemap:`, error);
  }

  try {
    const wpGuides = await getGuidePages();
    for (const guide of wpGuides) {
      for (const locale of locales) {
        entries.push({
          url: marketUrl(baseUrl, marketCode, locale, `/guides/${guide.slug}`),
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: withLanguageAlternates(baseUrl, marketCode, `/guides/${guide.slug}`),
          },
        });
      }
    }
  } catch (error) {
    console.error(`Failed to fetch guides for ${marketCode} sitemap:`, error);
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allEntries: MetadataRoute.Sitemap = [];

  for (const market of marketConfigs) {
    const marketEntries = await generateMarketSitemap(market.code, market.defaultCurrency);
    allEntries.push(...marketEntries);
  }

  const uniqueEntries = allEntries.filter(
    (entry, index, self) => index === self.findIndex((e) => e.url === entry.url)
  );

  return uniqueEntries;
}

export { generateMarketSitemap };
