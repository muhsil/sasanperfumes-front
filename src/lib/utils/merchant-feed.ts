import { siteConfig } from "@/config/site";
import type { Currency } from "@/config/site";
import { getMarketPathPrefix } from "@/config/market";
import type { MarketCode } from "@/config/market";
import { getProducts } from "@/lib/api/woocommerce";
import type { WCProduct } from "@/types/woocommerce";

const PAGE_SIZE = 100;

// WPML Arabic translations exist on the SA blog as standalone published
// products that share the parent's SKU and carry an untranslated name. A
// Google feed is per language, so the English feed must exclude them or
// Merchant Center receives two offers for the same product.
const AR_TRANSLATION_SLUG = /-ar(-\d+)?$/;

function marketFrontendHost(marketCode: MarketCode): string {
  return marketCode === "intl" ? "sasanperfumes.com" : `sasanperfumes.com/${marketCode}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toPlainText(html: string, maxLength = 4900): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

// Store API amounts are integers scaled by currency_minor_unit. Reproducing the
// scale exactly matters twice over: Merchant Center rejects an offer whose feed
// price differs from its landing page, and OMR carries three decimals where the
// other market currencies carry two.
function formatPrice(amount: string | undefined, minorUnit: number): string | null {
  if (!amount) return null;
  const raw = Number.parseInt(amount, 10);
  if (!Number.isFinite(raw)) return null;
  const unit = Number.isFinite(minorUnit) ? minorUnit : 2;
  return (raw / Math.pow(10, unit)).toFixed(unit);
}

async function getAllProductsForMarket(marketCode: MarketCode, currency: Currency): Promise<WCProduct[]> {
  const frontendHost = marketFrontendHost(marketCode);
  const products: WCProduct[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await getProducts({
      page,
      per_page: PAGE_SIZE,
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

function buildItem(product: WCProduct, marketCode: MarketCode): string | null {
  const price = formatPrice(product.prices?.price, product.prices?.currency_minor_unit);
  const currencyCode = product.prices?.currency_code;
  if (!price || !currencyCode) return null;

  const link = `${siteConfig.url}${getMarketPathPrefix(marketCode)}/en/product/${product.slug}`;
  const image = product.images?.[0]?.src;
  const brand = product.brands?.[0]?.name || siteConfig.name;
  const description = toPlainText(product.short_description || product.description || product.name);

  const regular = formatPrice(product.prices?.regular_price, product.prices?.currency_minor_unit);
  const onSale = product.on_sale && regular && regular !== price;

  const fields: string[] = [
    // g:id is the blog-local product ID rather than the SKU: the SA catalogue
    // has 307 duplicate SKUs, which would produce duplicate feed IDs and be
    // rejected. The SKU is still published as g:mpn.
    `<g:id>${product.id}</g:id>`,
    `<title>${escapeXml(product.name)}</title>`,
    `<description>${escapeXml(description)}</description>`,
    `<link>${escapeXml(link)}</link>`,
    ...(image ? [`<g:image_link>${escapeXml(image)}</g:image_link>`] : []),
    ...(product.images?.slice(1, 11).map((img) => `<g:additional_image_link>${escapeXml(img.src)}</g:additional_image_link>`) || []),
    `<g:availability>${product.is_in_stock ? "in_stock" : "out_of_stock"}</g:availability>`,
    // Sale pricing must go in g:sale_price with g:price holding the regular
    // amount, otherwise Merchant Center reports a price mismatch.
    `<g:price>${onSale && regular ? regular : price} ${currencyCode}</g:price>`,
    ...(onSale ? [`<g:sale_price>${price} ${currencyCode}</g:sale_price>`] : []),
    `<g:condition>new</g:condition>`,
    `<g:brand>${escapeXml(brand)}</g:brand>`,
    ...(product.sku ? [`<g:mpn>${escapeXml(product.sku)}</g:mpn>`] : []),
    // No GTINs are held in the catalogue, so declare identifiers absent and let
    // brand + MPN carry identification.
    `<g:identifier_exists>${product.sku ? "yes" : "no"}</g:identifier_exists>`,
    ...(product.categories?.[0]?.name ? [`<g:product_type>${escapeXml(product.categories.map((c) => c.name).join(" > "))}</g:product_type>`] : []),
  ];

  return `  <item>\n    ${fields.join("\n    ")}\n  </item>`;
}

export async function buildGoogleMerchantFeed(marketCode: MarketCode, currency: Currency): Promise<string> {
  const products = await getAllProductsForMarket(marketCode, currency);

  const items = products
    .filter((p) => p.is_purchasable !== false)
    .filter((p) => p.catalog_visibility === undefined || p.catalog_visibility === "visible" || p.catalog_visibility === "catalog")
    .filter((p) => !AR_TRANSLATION_SLUG.test(p.slug))
    .map((p) => buildItem(p, marketCode))
    .filter((item): item is string => item !== null);

  const title = `${siteConfig.name} — ${marketCode === "intl" ? "UAE" : marketCode.toUpperCase()} product feed`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${escapeXml(title)}</title>
  <link>${siteConfig.url}${getMarketPathPrefix(marketCode)}/en</link>
  <description>${escapeXml(`${products.length} products, prices in ${currency}`)}</description>
${items.join("\n")}
</channel>
</rss>
`;
}
