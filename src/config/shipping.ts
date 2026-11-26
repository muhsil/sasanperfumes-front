const GCC_SHIPPING_COUNTRIES: readonly string[] = ["SA", "OM", "BH", "KW", "QA"];

const SHIPPING_CURRENCY_BY_COUNTRY: Readonly<Record<string, string>> = {
  AE: "AED",
  BH: "BHD",
  KW: "KWD",
  QA: "QAR",
  OM: "OMR",
  SA: "SAR",
  US: "USD",
};

export function getShippingCurrencyForCountry(country: string): string | undefined {
  return SHIPPING_CURRENCY_BY_COUNTRY[country.trim().toUpperCase()];
}

export function getShippingCurrencyDecimals(currency: string): number {
  return ["BHD", "KWD", "OMR"].includes(currency.toUpperCase()) ? 3 : 2;
}

interface ShippingPolicy {
  baseAed: number;
  perBottleAed: number;
  maxBottles?: number;
}

const SAUDI_SHIPPING: ShippingPolicy = { baseAed: 160, perBottleAed: 30 };
const OTHER_GCC_SHIPPING: ShippingPolicy = { baseAed: 150, perBottleAed: 30 };
const INTERNATIONAL_SHIPPING: ShippingPolicy = { baseAed: 200, perBottleAed: 30, maxBottles: 7 };

export function getGccShippingCountries(): readonly string[] {
  return GCC_SHIPPING_COUNTRIES;
}

export function getCrossBorderShippingPolicy(country: string): ShippingPolicy | null {
  const code = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "AE") return null;
  if (code === "SA") return SAUDI_SHIPPING;
  if (GCC_SHIPPING_COUNTRIES.includes(code)) return OTHER_GCC_SHIPPING;
  return INTERNATIONAL_SHIPPING;
}

// Fixed gift sets are single WooCommerce products. Match their portable SKU,
// using the catalog slug for the two sets currently sold without a SKU.
const FIXED_SET_BOTTLES = new Map([
  ["SA00040", 3], // The Secret Garden
  ["SA00041", 3], // The Regal Code
  ["SA00043", 4], // 24 Signature Collection
  ["SA00048", 3], // Vibrant Collection
  ["SA00049", 3], // Signature Collection
  ["SA00049-1", 3], // L'essense Royale
  ["SA00734", 4], // Eternal Bloom Set Box 50ML
  ["SASAN-5612", 3], // Box 100ML
  ["eternal-bloom-set-box-edp-50ml-x-4-2", 4],
  ["eternal-bloom-set-box-edp-50ml-x-4", 3], // Box Women Edition
]);

export function countShippingBottles(
  quantity: number,
  bundleContents?: unknown,
  product?: { sku?: string; slug?: string }
): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return 0;
  const fixedContents = FIXED_SET_BOTTLES.get(product?.sku?.trim().toUpperCase() || "")
    ?? FIXED_SET_BOTTLES.get(product?.slug?.trim().toLowerCase() || "");
  if (fixedContents) return quantity * fixedContents;

  if (typeof bundleContents === "string") {
    try {
      bundleContents = JSON.parse(bundleContents);
    } catch {
      return quantity;
    }
  }
  if (!Array.isArray(bundleContents)) return quantity;

  let bottlesPerBundle = 0;
  for (const item of bundleContents) {
    if (!item || typeof item.product_id !== "number" || item.product_id <= 0) continue;
    const bottleQuantity = Number(item.quantity ?? 1);
    if (Number.isSafeInteger(bottleQuantity) && bottleQuantity > 0) bottlesPerBundle += bottleQuantity;
  }
  return quantity * Math.max(1, bottlesPerBundle);
}

export function getShippingQuantityLimitMessage(limit: number, locale = "en"): string {
  return locale === "ar"
    ? `الحد الأقصى ${limit} زجاجات لكل طلب خارج دول مجلس التعاون الخليجي. يرجى تقسيم المشتريات إلى طلبات منفصلة.`
    : `Maximum ${limit} bottles per order outside the GCC. Please split into separate orders.`;
}

export function calculateCrossBorderShipping(policy: ShippingPolicy, quantity: number, currency: string): number {
  return convertCurrencyAmount(policy.baseAed + policy.perBottleAed * quantity, "AED", currency);
}

const CURRENCY_RATE_FROM_AED: Record<string, number> = {
  AED: 1,
  SAR: 1.02,
  QAR: 0.99,
  OMR: 0.105,
  BHD: 0.103,
  KWD: 0.083,
  USD: 0.27,
};

/**
 * Converts between any two of the currencies above.
 *
 * WooCommerce holds a shipping zone's cost as a bare number in the store's own
 * currency, and the storefront was stamping that number with whichever currency
 * the customer was browsing in. A 250.00 AED rate to the UK was shown to a
 * customer shopping in dollars as USD 250.00 — about three and a half times the
 * real charge.
 *
 * An unknown currency on either side returns the amount untouched rather than
 * converting it by a guessed rate.
 */
export function convertCurrencyAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const from = CURRENCY_RATE_FROM_AED[String(fromCurrency || "").toUpperCase()];
  const to = CURRENCY_RATE_FROM_AED[String(toCurrency || "").toUpperCase()];

  if (!from || !to || !Number.isFinite(amount)) return amount;

  return (amount / from) * to;
}
