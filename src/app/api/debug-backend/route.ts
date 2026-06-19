import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { parseBackendJson } from "@/lib/utils/backendFetch";

const BASE = siteConfig.apiUrl;

async function testEndpoint(label: string, url: string, method: string, headers?: HeadersInit, body?: string) {
  const opts: RequestInit = { method };
  if (headers) opts.headers = headers;
  if (body) opts.body = body;

  try {
    const response = await fetch(url, opts);
    const text = await response.text();
    return {
      label,
      url,
      method,
      headers_sent: headers ? Object.keys(headers) : "none",
      status: response.status,
      is_json: (() => { try { parseBackendJson(text); return true; } catch { return false; } })(),
      snippet: text.slice(0, 300),
    };
  } catch (error) {
    return { label, url, method, error: error instanceof Error ? error.message : "Unknown" };
  }
}

export async function GET() {
  const cocartUrl = `${BASE}/wp-json/cocart/v2/cart`;
  const cocartAddUrl = `${BASE}/wp-json/cocart/v2/cart/add-item`;
  const storeApiProducts = `${BASE}/wp-json/wc/store/v1/products`;
  const storeApiCart = `${BASE}/wp-json/wc/store/v1/cart`;
  const wpPosts = `${BASE}/wp-json/wp/v2/posts`;
  const freeGiftsRules = `${BASE}/wp-json/sasanperfumes-free-gifts/v1/rules`;
  const timestamp = `_t=${Date.now()}`;

  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;
  const hasWcConsumerKey = Boolean(consumerKey);
  const hasWcConsumerSecret = Boolean(consumerSecret);
  const hasWcAuth = hasWcConsumerKey && hasWcConsumerSecret;

  const wcV3Products = `${BASE}/wp-json/wc/v3/products?per_page=1&status=publish`;
  const wcV3Headers = hasWcAuth
    ? ({
        Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
      } satisfies HeadersInit)
    : undefined;

  const results = await Promise.all([
    testEndpoint("1_cocart_bare", cocartUrl, "GET"),
    testEndpoint("2_cocart_with_timestamp", `${cocartUrl}?${timestamp}`, "GET"),
    testEndpoint("3_cocart_with_headers", cocartUrl, "GET", {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }),
    testEndpoint("4_cocart_headers_and_timestamp", `${cocartUrl}?${timestamp}`, "GET", {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }),
    testEndpoint("5_store_api_products_bare", storeApiProducts, "GET"),
    testEndpoint("6_store_api_cart_bare", storeApiCart, "GET"),
    testEndpoint("7_store_api_cart_with_headers", storeApiCart, "GET", {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }),
    testEndpoint("8_wp_posts_bare", wpPosts, "GET"),
    testEndpoint("8b_free_gifts_rules", freeGiftsRules, "GET"),
    testEndpoint("9_cocart_accept_only", cocartUrl, "GET", {
      "Accept": "application/json",
    }),
    testEndpoint("10_cocart_post_bare", cocartAddUrl, "POST", undefined,
      JSON.stringify({ id: "99999", quantity: "1" })
    ),
    testEndpoint("11_cocart_post_with_headers", cocartAddUrl, "POST", {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }, JSON.stringify({ id: "99999", quantity: "1" })),
    testEndpoint("12_cocart_with_useragent", cocartUrl, "GET", {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    }),
    ...(hasWcAuth ? [testEndpoint("13_wc_v3_products_with_auth", wcV3Products, "GET", wcV3Headers)] : []),
  ]);

  const summary: Record<string, unknown> = {
    backend_url: BASE,
    has_wc_consumer_key: hasWcConsumerKey,
    has_wc_consumer_secret: hasWcConsumerSecret,
  };
  for (const r of results) {
    const key = (r as Record<string, unknown>).label as string;
    summary[key] = r;
  }

  return NextResponse.json(summary);
}
