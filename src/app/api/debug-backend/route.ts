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

async function testHomeSettings(label: string, url: string, headers?: HeadersInit) {
  try {
    const response = await fetch(url, { headers });
    const text = await response.text();
    let hero = "";
    try {
      const data = parseBackendJson<{ hero?: { slides?: { image?: string }[] } }>(text);
      hero = data.hero?.slides?.[0]?.image || "";
    } catch {
      // Keep the raw diagnostics below when JSON parsing fails.
    }

    return {
      label,
      url,
      headers_sent: headers ? Object.keys(headers) : "none",
      status: response.status,
      is_json: (() => { try { parseBackendJson(text); return true; } catch { return false; } })(),
      hero,
      is_market_hero: hero.includes("/qa/wp-content/") || hero.includes("/om/wp-content/") || hero.includes("/sa/wp-content/"),
      is_default_buy_hero: hero.includes("BUY-scaled.webp"),
      snippet: text.slice(0, 300),
    };
  } catch (error) {
    return { label, url, error: error instanceof Error ? error.message : "Unknown" };
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
  const homeHeaders = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  };

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
    testHomeSettings("14_home_settings_qa_direct", `${BASE}/qa/wp-json/sasanperfumes/v1/home-settings?lang=en&_t=${Date.now()}`, homeHeaders),
    testHomeSettings("15_home_settings_qa_rest_route", `${BASE}/qa/?rest_route=/sasanperfumes/v1/home-settings&lang=en&_t=${Date.now()}`, homeHeaders),
    testHomeSettings("16_home_settings_qa_with_frontend_host", `${BASE}/qa/wp-json/sasanperfumes/v1/home-settings?lang=en&frontend_host=store.sasanperfumes.com%2Fqa&_t=${Date.now()}`, homeHeaders),
    testHomeSettings("17_home_settings_main_qa_frontend_host", `${BASE}/wp-json/sasanperfumes/v1/home-settings?lang=en&frontend_host=store.sasanperfumes.com%2Fqa&_t=${Date.now()}`, homeHeaders),
    testHomeSettings("18_home_settings_main_qa_frontend_host_https", `${BASE}/wp-json/sasanperfumes/v1/home-settings?lang=en&frontend_host=https%3A%2F%2Fstore.sasanperfumes.com%2Fqa&_t=${Date.now()}`, homeHeaders),
    testHomeSettings("19_home_settings_main_qa_with_market", `${BASE}/wp-json/sasanperfumes/v1/home-settings?lang=en&market=qa&frontend_host=store.sasanperfumes.com%2Fqa&_t=${Date.now()}`, homeHeaders),
    testHomeSettings("20_home_settings_main_qa_header", `${BASE}/wp-json/sasanperfumes/v1/home-settings?lang=en&_t=${Date.now()}`, {
      ...homeHeaders,
      "X-Frontend-Host": "store.sasanperfumes.com/qa",
      "X-Market": "qa",
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
