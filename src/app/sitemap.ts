import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getProducts, getCategories } from "@/lib/api/woocommerce";
import { getGuidePages } from "@/lib/api/wordpress";
import { getMarketPathPrefix, marketConfigs } from "@/config/market";
import type { MarketCode } from "@/config/market";
import type { Currency } from "@/config/site";

const PRODUCT_PAGE_SIZE = 100;

function marketFrontendHost(marketCode: string): string {
  return marketCode === "intl" ? "shapehive.com" : `shapehive.com/${marketCode}`;
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const locales = siteConfig.locales;

  // Static pages that should be indexed
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
  ];

  // Generate static page entries for all locales and markets.
  const staticEntries: MetadataRoute.Sitemap = [];
  for (const market of marketConfigs) {
    for (const locale of locales) {
      for (const page of staticPages) {
        staticEntries.push({
          url: marketUrl(baseUrl, market.code, locale, page),
          lastModified: new Date(),
          changeFrequency: page === "" ? "daily" : "weekly",
          priority: market.code === "intl" && page === "" ? 1.0 : page === "" ? 0.95 : 0.8,
          alternates: {
            languages: {
              en: marketUrl(baseUrl, market.code, "en", page),
              ar: marketUrl(baseUrl, market.code, "ar", page),
            },
          },
        });
      }
    }
  }

  // Fetch products and categories for dynamic pages
  const productEntries: MetadataRoute.Sitemap = [];
  const categoryEntries: MetadataRoute.Sitemap = [];

  try {
    for (const market of marketConfigs) {
      const frontendHost = marketFrontendHost(market.code);
      const products = await getAllProductsForMarket(
        market.code,
        market.defaultCurrency,
        frontendHost
      );

      // Generate product page entries for all locales.
      for (const product of products) {
        for (const locale of locales) {
          productEntries.push({
            url: marketUrl(baseUrl, market.code, locale, `/product/${product.slug}`),
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
            alternates: {
              languages: {
                en: marketUrl(baseUrl, market.code, "en", `/product/${product.slug}`),
                ar: marketUrl(baseUrl, market.code, "ar", `/product/${product.slug}`),
              },
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch products for sitemap:", error);
  }

  try {
    for (const market of marketConfigs) {
      const frontendHost = marketFrontendHost(market.code);
      const categories = await getCategories("en", market.defaultCurrency, frontendHost);

      // Generate category page entries for all locales.
      for (const category of categories) {
        for (const locale of locales) {
          categoryEntries.push({
            url: marketUrl(baseUrl, market.code, locale, `/category/${category.slug}`),
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
            alternates: {
              languages: {
                en: marketUrl(baseUrl, market.code, "en", `/category/${category.slug}`),
                ar: marketUrl(baseUrl, market.code, "ar", `/category/${category.slug}`),
              },
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch categories for sitemap:", error);
  }

  // Generate guide page entries for all locales (fetched from WordPress)
  const guideEntries: MetadataRoute.Sitemap = [];
  try {
    const wpGuides = await getGuidePages();
    for (const market of marketConfigs) {
      for (const guide of wpGuides) {
        for (const locale of locales) {
          guideEntries.push({
            url: marketUrl(baseUrl, market.code, locale, `/guides/${guide.slug}`),
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
            alternates: {
              languages: {
                en: marketUrl(baseUrl, market.code, "en", `/guides/${guide.slug}`),
                ar: marketUrl(baseUrl, market.code, "ar", `/guides/${guide.slug}`),
              },
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch guides for sitemap:", error);
  }

  // Combine all entries, removing duplicates by URL
  const allEntries = [...staticEntries, ...productEntries, ...categoryEntries, ...guideEntries];
  const uniqueEntries = allEntries.filter(
    (entry, index, self) => index === self.findIndex((e) => e.url === entry.url)
  );

  return uniqueEntries;
}
