import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getProducts, getCategories } from "@/lib/api/woocommerce";
import { getGuidePages } from "@/lib/api/wordpress";

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

  // Generate static page entries for all locales
  const staticEntries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const page of staticPages) {
      staticEntries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : 0.8,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page}`,
            ar: `${baseUrl}/ar${page}`,
          },
        },
      });
    }
  }

  // Fetch products and categories for dynamic pages
  const productEntries: MetadataRoute.Sitemap = [];
  const categoryEntries: MetadataRoute.Sitemap = [];

  try {
    // Fetch all products (using English locale for consistent slugs)
    const { products } = await getProducts({ per_page: 100, locale: "en" });

    // Generate product page entries for all locales
    for (const product of products) {
      for (const locale of locales) {
        productEntries.push({
          url: `${baseUrl}/${locale}/product/${product.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.9,
          alternates: {
            languages: {
              en: `${baseUrl}/en/product/${product.slug}`,
              ar: `${baseUrl}/ar/product/${product.slug}`,
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch products for sitemap:", error);
  }

  try {
    // Fetch all categories (using English locale for consistent slugs)
    const categories = await getCategories("en");

    // Generate category page entries for all locales
    for (const category of categories) {
      for (const locale of locales) {
        categoryEntries.push({
          url: `${baseUrl}/${locale}/category/${category.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: {
              en: `${baseUrl}/en/category/${category.slug}`,
              ar: `${baseUrl}/ar/category/${category.slug}`,
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch categories for sitemap:", error);
  }

  // Generate guide page entries for all locales (fetched from WordPress)
  const guideEntries: MetadataRoute.Sitemap = [];
  try {
    const wpGuides = await getGuidePages();
    for (const guide of wpGuides) {
      for (const locale of locales) {
        guideEntries.push({
          url: `${baseUrl}/${locale}/guides/${guide.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: {
              en: `${baseUrl}/en/guides/${guide.slug}`,
              ar: `${baseUrl}/ar/guides/${guide.slug}`,
            },
          },
        });
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
