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

const DEFAULT_FREIGHT_TABLE: FreightChargeRow[] = [
  { weightKg: 0.5, weightLabel: "0.5KG", pcs: 1, charges: { SA: 30, OM: 3, BH: 9.373, KW: 8.881, QA: 30 } },
  { weightKg: 1, weightLabel: "1KG", pcs: 2, charges: { SA: 30, OM: 3, BH: 11.33, KW: 10.624, QA: 30 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 3, charges: { SA: 30, OM: 3, BH: 12.875, KW: 12.035, QA: 30 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 4, charges: { SA: 30, OM: 3, BH: 12.875, KW: 12.035, QA: 30 } },
  { weightKg: 2, weightLabel: "2KG", pcs: 5, charges: { SA: 30, OM: 3, BH: 14.42, KW: 13.446, QA: 30 } },
  { weightKg: 2.5, weightLabel: "2.5KG", pcs: 6, charges: { SA: 30, OM: 3, BH: 15.862, KW: 14.774, QA: 30 } },
  { weightKg: 3, weightLabel: "3KG", pcs: 8, charges: { SA: 30, OM: 3, BH: 17.407, KW: 16.185, QA: 30 } },
  { weightKg: 3.5, weightLabel: "3.5KG", pcs: 9, charges: { SA: 30, OM: 3, BH: 18.849, KW: 17.596, QA: 30 } },
  { weightKg: 4, weightLabel: "4KG", pcs: 10, charges: { SA: 30, OM: 3, BH: 20.6, KW: 19.007, QA: 30 } },
  { weightKg: 5, weightLabel: "5KG", pcs: 12, charges: { SA: 30, OM: 3, BH: 23.278, KW: 21.829, QA: 30 } },
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
