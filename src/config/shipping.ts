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
 * Oman is still the previous flat rate: the Aramex sheet carries no Oman
 * column, and its freight cost has not been supplied.
 */
const DEFAULT_FREIGHT_TABLE: FreightChargeRow[] = [
  { weightKg: 0.5, weightLabel: "0.5KG", pcs: 1, charges: { SA: 107.1, OM: 3, BH: 9.888, KW: 9.296, QA: 102.96 } },
  { weightKg: 1, weightLabel: "1KG", pcs: 2, charges: { SA: 114.24, OM: 3, BH: 11.845, KW: 11.039, QA: 110.88 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 3, charges: { SA: 122.4, OM: 3, BH: 13.39, KW: 12.45, QA: 116.82 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 4, charges: { SA: 122.4, OM: 3, BH: 13.39, KW: 12.45, QA: 116.82 } },
  { weightKg: 2, weightLabel: "2KG", pcs: 5, charges: { SA: 128.52, OM: 3, BH: 14.935, KW: 13.861, QA: 123.75 } },
  { weightKg: 2.5, weightLabel: "2.5KG", pcs: 6, charges: { SA: 134.64, OM: 3, BH: 16.377, KW: 15.189, QA: 130.68 } },
  { weightKg: 3, weightLabel: "3KG", pcs: 8, charges: { SA: 142.8, OM: 3, BH: 17.922, KW: 16.6, QA: 136.62 } },
  { weightKg: 3.5, weightLabel: "3.5KG", pcs: 9, charges: { SA: 148.92, OM: 3, BH: 19.364, KW: 18.011, QA: 143.55 } },
  { weightKg: 4, weightLabel: "4KG", pcs: 10, charges: { SA: 155.04, OM: 3, BH: 21.115, KW: 19.422, QA: 150.48 } },
  { weightKg: 5, weightLabel: "5KG", pcs: 12, charges: { SA: 169.32, OM: 3, BH: 23.793, KW: 22.244, QA: 163.35 } },
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

export function resolveFreightPrice(country: string, cartWeight: number): { row: FreightChargeRow; price: number } | null {
  const code = normalizeCountryCode(country);
  if (!code) return null;

  const row = resolveFreightRow(code, cartWeight);
  if (!row) return null;

  const price = row.charges[code];
  if (!Number.isFinite(price)) return null;

  return { row, price };
}
