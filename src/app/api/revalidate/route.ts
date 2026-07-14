import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

/**
 * On-demand revalidation API endpoint for WordPress webhooks.
 * 
 * This endpoint allows WordPress/WooCommerce to trigger cache invalidation
 * when products, categories, or other content is updated.
 * 
 * Usage:
 * POST /api/revalidate
 * Headers:
 *   x-revalidate-token: <REVALIDATE_SECRET_TOKEN>
 * Body (JSON):
 *   {
 *     "type": "products" | "categories" | "pages" | "page-seo" | "free-gifts" | "site-settings" | "menus" | "all",
 *     "slug": "optional-product-slug",
 *     "id": "optional-product-id",
 *     "path": "optional-path-to-revalidate"
 *   }
 * 
 * Environment variable required:
 *   REVALIDATE_SECRET_TOKEN - Secret token for authentication
 */

// Cache tags used in the application
const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  pages: "pages",
  pageSeo: "page-seo",
  bundleConfig: "bundle-config",
  freeGifts: "free-gifts",
  siteSettings: "site-settings",
  menus: "menus",
} as const;

export async function POST(request: NextRequest) {
  try {
    // Verify the secret token
    const token = request.headers.get("x-revalidate-token");
    const secretToken = process.env.REVALIDATE_SECRET_TOKEN;

    // If no secret token is configured, reject all requests
    if (!secretToken) {
      console.error("REVALIDATE_SECRET_TOKEN is not configured");
      return NextResponse.json(
        { error: "Revalidation is not configured" },
        { status: 500 }
      );
    }

    // Validate the token
    if (!token || token !== secretToken) {
      return NextResponse.json(
        { error: "Invalid or missing revalidation token" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json().catch(() => ({}));
    const { type, slug, id, path } = body as {
      type?: "products" | "categories" | "pages" | "page-seo" | "free-gifts" | "site-settings" | "menus" | "all";
      slug?: string;
      id?: string | number;
      path?: string;
    };

    const revalidatedTags: string[] = [];
    const revalidatedPaths: string[] = [];

    // Use { expire: 0 } for immediate cache expiration (recommended for webhooks)
    // This ensures data is expired immediately when WordPress triggers revalidation
    const revalidateOptions = { expire: 0 };

    // Revalidate based on type
    switch (type) {
      case "products":
        // Revalidate all products
        revalidateTag(CACHE_TAGS.products, revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.products);

        // If a specific slug is provided, revalidate that product's tags
        if (slug) {
          revalidateTag(`product-${slug}`, revalidateOptions);
          revalidateTag(`product-${slug}-en`, revalidateOptions);
          revalidateTag(`product-${slug}-ar`, revalidateOptions);
          revalidatedTags.push(`product-${slug}`, `product-${slug}-en`, `product-${slug}-ar`);
          
          // Also revalidate the product page paths
          revalidatePath(`/en/product/${slug}`);
          revalidatePath(`/ar/product/${slug}`);
          revalidatedPaths.push(`/en/product/${slug}`, `/ar/product/${slug}`);
        }

        // If a specific ID is provided, revalidate that product's tags
        if (id) {
          revalidateTag(`product-${id}`, revalidateOptions);
          revalidatedTags.push(`product-${id}`);
        }

        // Revalidate shop pages
        revalidatePath("/en/shop");
        revalidatePath("/ar/shop");
        revalidatedPaths.push("/en/shop", "/ar/shop");

        // Revalidate home pages (they often show products)
        revalidatePath("/en");
        revalidatePath("/ar");
        revalidatedPaths.push("/en", "/ar");
        break;

      case "categories":
        // Revalidate all categories
        revalidateTag(CACHE_TAGS.categories, revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.categories);

        // If a specific slug is provided, revalidate that category's page
        if (slug) {
          revalidatePath(`/en/category/${slug}`);
          revalidatePath(`/ar/category/${slug}`);
          revalidatedPaths.push(`/en/category/${slug}`, `/ar/category/${slug}`);
        }
        break;

      case "pages":
        // Revalidate all pages
        revalidateTag(CACHE_TAGS.pages, revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.pages);

        // If a specific slug is provided, revalidate that page
        if (slug) {
          revalidateTag(`page-${slug}`, revalidateOptions);
          revalidatedTags.push(`page-${slug}`);
          revalidatePath(`/en/${slug}`);
          revalidatePath(`/ar/${slug}`);
          revalidatedPaths.push(`/en/${slug}`, `/ar/${slug}`);
        }
        break;

      case "page-seo":
        // Revalidate page SEO data fetched from WordPress
        revalidateTag(CACHE_TAGS.pageSeo, revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.pageSeo);

        // If a specific slug is provided, revalidate that page's SEO
        if (slug) {
          revalidateTag(`page-seo-${slug}`, revalidateOptions);
          revalidateTag(`page-seo-${slug}-en`, revalidateOptions);
          revalidateTag(`page-seo-${slug}-ar`, revalidateOptions);
          revalidatedTags.push(`page-seo-${slug}`, `page-seo-${slug}-en`, `page-seo-${slug}-ar`);
          revalidatePath(`/en/${slug}`);
          revalidatePath(`/ar/${slug}`);
          revalidatedPaths.push(`/en/${slug}`, `/ar/${slug}`);
        }
        break;

      case "free-gifts":
        // Revalidate free gift rules cache
        revalidateTag(CACHE_TAGS.freeGifts, revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.freeGifts);

        // Revalidate cart pages where free gifts are displayed
        revalidatePath("/en/cart");
        revalidatePath("/ar/cart");
        revalidatedPaths.push("/en/cart", "/ar/cart");
        break;

      case "site-settings":
        // Revalidate site settings (logo, site name, favicon, header, footer, etc.)
        revalidateTag(CACHE_TAGS.siteSettings, revalidateOptions);
        revalidateTag("logo", revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.siteSettings, "logo");

        // Revalidate all pages since site settings affect the entire layout
        revalidatePath("/en");
        revalidatePath("/ar");
        revalidatedPaths.push("/en", "/ar");
        break;

      case "menus": {
        // Revalidate all menu caches (primary, mobile-header, mobile-bottom, categories-drawer, footer)
        revalidateTag(CACHE_TAGS.menus, revalidateOptions);
        revalidatedTags.push(CACHE_TAGS.menus);

        // Also revalidate specific menu tags
        const menuSlugs = [
          "primary",
          "primary-ar",
          "mobile-header",
          "mobile-header-ar",
          "mobile-bottom",
          "mobile-bottom-ar",
          "categories-drawer",
          "categories-drawer-ar",
          "footer",
          "footer-ar",
        ];
        menuSlugs.forEach((menuSlug) => {
          revalidateTag(`menu-${menuSlug}`, revalidateOptions);
          revalidateTag(`menu-slug-${menuSlug}`, revalidateOptions);
          revalidatedTags.push(`menu-${menuSlug}`, `menu-slug-${menuSlug}`);
        });

        // Revalidate all pages since menus appear on every page
        revalidatePath("/en");
        revalidatePath("/ar");
        revalidatedPaths.push("/en", "/ar");
        break;
      }

      case "all":
        // Revalidate everything
        Object.values(CACHE_TAGS).forEach((tag) => {
          revalidateTag(tag, revalidateOptions);
          revalidatedTags.push(tag);
        });

        // Revalidate main pages
        revalidatePath("/en");
        revalidatePath("/ar");
        revalidatePath("/en/shop");
        revalidatePath("/ar/shop");
        revalidatedPaths.push("/en", "/ar", "/en/shop", "/ar/shop");
        break;

      default:
        // If a specific path is provided, revalidate it
        if (path) {
          revalidatePath(path);
          revalidatedPaths.push(path);
        } else {
          return NextResponse.json(
            { error: "Invalid revalidation type. Use: products, categories, pages, page-seo, free-gifts, site-settings, menus, all, or provide a path" },
            { status: 400 }
          );
        }
    }

    console.log(`Revalidation triggered: tags=[${revalidatedTags.join(", ")}], paths=[${revalidatedPaths.join(", ")}]`);

    return NextResponse.json({
      success: true,
      revalidated: {
        tags: revalidatedTags,
        paths: revalidatedPaths,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Also support GET for simple revalidation (with token in query string)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const type = searchParams.get("type") as "products" | "categories" | "pages" | "page-seo" | "free-gifts" | "site-settings" | "menus" | "all" | undefined;
  const slug = searchParams.get("slug") || undefined;
  const id = searchParams.get("id") || undefined;
  const path = searchParams.get("path") || undefined;

  // Create a mock request with the token in headers
  const headers = new Headers();
  headers.set("x-revalidate-token", token || "");

  // Create a new request with the body
  const mockRequest = new NextRequest(request.url, {
    method: "POST",
    headers,
  });

  // Override the json method to return our params
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const originalJson = mockRequest.json.bind(mockRequest);
  mockRequest.json = async () => ({ type, slug, id, path });

  return POST(mockRequest);
}
