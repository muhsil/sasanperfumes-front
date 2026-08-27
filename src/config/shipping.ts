export type FreightCountryCode = "SA" | "OM" | "BH" | "KW" | "QA";

export interface FreightChargeRow {
  weightKg: number;
  weightLabel: string;
  pcs: number;
  charges: Record<FreightCountryCode, number>;
}

export interface FreightChargeDisplayRow {
  weight: string;
  pcs: string;
  saudi_arabia: string;
  oman: string;
  bahrain: string;
  kuwait: string;
  qatar: string;
}

/**
 * Aramex freight, held in each destination's own currency.
 *
 * Every figure is the Aramex charge in AED plus a 5 AED handling allowance,
 * converted at the market rate (SAR 1.02, QAR 0.99, BHD 0.103, KWD 0.083). The
 * allowance is part of the published rate — the customer sees a single shipping
 * amount, never a breakdown.
 *
 * Oman uses Bahrain's column as a stand-in. The supplied sheet carries no Oman
 * figures, and none exist in the Aramex plugin (its freight fields are empty and
 * the rate calculator is off) or in the shipping zones, which are unconfigured
 * on that site. Bahrain is the closest comparable — the cheapest destination on
 * the sheet and the nearest to Oman — so it is the least-wrong basis available.
 * Replace these ten values once the real Oman rates are to hand.
 */
const DEFAULT_FREIGHT_TABLE: FreightChargeRow[] = [
  { weightKg: 0.5, weightLabel: "0.5KG", pcs: 1, charges: { SA: 107.1, OM: 10.08, BH: 9.888, KW: 9.296, QA: 102.96 } },
  { weightKg: 1, weightLabel: "1KG", pcs: 2, charges: { SA: 114.24, OM: 12.075, BH: 11.845, KW: 11.039, QA: 110.88 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 3, charges: { SA: 122.4, OM: 13.65, BH: 13.39, KW: 12.45, QA: 116.82 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 4, charges: { SA: 122.4, OM: 13.65, BH: 13.39, KW: 12.45, QA: 116.82 } },
  { weightKg: 2, weightLabel: "2KG", pcs: 5, charges: { SA: 128.52, OM: 15.225, BH: 14.935, KW: 13.861, QA: 123.75 } },
  { weightKg: 2.5, weightLabel: "2.5KG", pcs: 6, charges: { SA: 134.64, OM: 16.695, BH: 16.377, KW: 15.189, QA: 130.68 } },
  { weightKg: 3, weightLabel: "3KG", pcs: 8, charges: { SA: 142.8, OM: 18.27, BH: 17.922, KW: 16.6, QA: 136.62 } },
  { weightKg: 3.5, weightLabel: "3.5KG", pcs: 9, charges: { SA: 148.92, OM: 19.74, BH: 19.364, KW: 18.011, QA: 143.55 } },
  { weightKg: 4, weightLabel: "4KG", pcs: 10, charges: { SA: 155.04, OM: 21.525, BH: 21.115, KW: 19.422, QA: 150.48 } },
  { weightKg: 5, weightLabel: "5KG", pcs: 12, charges: { SA: 169.32, OM: 24.255, BH: 23.793, KW: 22.244, QA: 163.35 } },
];

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function normalizeCountryCode(value: unknown): FreightCountryCode | null {
  const code = String(value || "").trim().toUpperCase();
  if (code === "SA" || code === "OM" || code === "BH" || code === "KW" || code === "QA") {
    return code;
  }
  return null;
}

export function getShippingFreightTable(): FreightChargeRow[] {
  return [...DEFAULT_FREIGHT_TABLE].sort((a, b) => a.weightKg - b.weightKg || a.pcs - b.pcs);
}

export function getShippingFreightCountries(): FreightCountryCode[] {
  return ["SA", "OM", "BH", "KW", "QA"];
}

export function getShippingFreightDisplayRows(): FreightChargeDisplayRow[] {
  return getShippingFreightTable().map((row) => ({
    weight: row.weightLabel,
    pcs: String(row.pcs),
    saudi_arabia: formatNumber(row.charges.SA),
    oman: formatNumber(row.charges.OM),
    bahrain: formatNumber(row.charges.BH),
    kuwait: formatNumber(row.charges.KW),
    qatar: formatNumber(row.charges.QA),
  }));
}

export function resolveFreightRow(country: string, cartWeight: number): FreightChargeRow | null {
  const code = normalizeCountryCode(country);
  if (!code) return null;

  const rows = getShippingFreightTable();
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => a.weightKg - b.weightKg || a.pcs - b.pcs);
  let matched = sorted.find((row) => cartWeight <= row.weightKg);
  if (!matched) {
    matched = sorted[sorted.length - 1] || null;
  }

  return matched || null;
}

/**
 * The freight table is written in each destination's own currency, which is
 * correct for that market's own storefront. An order placed on the AED store
 * and shipped to one of these countries was charged the figure as-is, so a
 * parcel to Oman collected 13.65 AED against a 13.65 OMR rate — about a tenth
 * of the intended amount. Bahrain and Kuwait were the same.
 *
 * Rates are units of the destination currency per AED, matching the storefront.
 */
const FREIGHT_CURRENCY_BY_COUNTRY: Record<FreightCountryCode, string> = {
  SA: "SAR",
  QA: "QAR",
  OM: "OMR",
  BH: "BHD",
  KW: "KWD",
};

const CURRENCY_RATE_FROM_AED: Record<string, number> = {
  AED: 1,
  SAR: 1.02,
  QAR: 0.99,
  OMR: 0.105,
  BHD: 0.103,
  KWD: 0.083,
  USD: 0.27,
};

/** Converts a freight charge into the currency the order is priced in. */
export function convertFreightPrice(
  price: number,
  country: FreightCountryCode,
  targetCurrency: string
): number {
  const sourceRate = CURRENCY_RATE_FROM_AED[FREIGHT_CURRENCY_BY_COUNTRY[country]];
  const targetRate = CURRENCY_RATE_FROM_AED[String(targetCurrency || "AED").toUpperCase()];

  // An unknown currency is left alone rather than converted by a guessed rate.
  if (!sourceRate || !targetRate) return price;

  return (price / sourceRate) * targetRate;
}

export function resolveFreightPrice(country: string, cartWeight: number): { row: FreightChargeRow; price: number } | null {
  const code = normalizeCountryCode(country);
  if (!code) return null;

  const row = resolveFreightRow(code, cartWeight);
  if (!row) return null;

  const price = row.charges[code];
  if (!Number.isFinite(price)) return null;

  return { row, price };
}
