import { getEnvVar } from "@/lib/utils/loadEnv";

export type FreightCountryCode = "SA" | "BH" | "KW" | "QA";

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
  bahrain: string;
  kuwait: string;
  qatar: string;
}

const DEFAULT_FREIGHT_TABLE: FreightChargeRow[] = [
  { weightKg: 0.5, weightLabel: "0.5KG", pcs: 1, charges: { SA: 100, BH: 91, KW: 107, QA: 99 } },
  { weightKg: 1, weightLabel: "1KG", pcs: 2, charges: { SA: 107, BH: 110, KW: 128, QA: 107 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 3, charges: { SA: 115, BH: 125, KW: 145, QA: 113 } },
  { weightKg: 1.5, weightLabel: "1.5KG", pcs: 4, charges: { SA: 115, BH: 125, KW: 145, QA: 113 } },
  { weightKg: 2, weightLabel: "2KG", pcs: 5, charges: { SA: 121, BH: 140, KW: 162, QA: 120 } },
  { weightKg: 2.5, weightLabel: "2.5KG", pcs: 6, charges: { SA: 127, BH: 154, KW: 178, QA: 127 } },
  { weightKg: 3, weightLabel: "3KG", pcs: 8, charges: { SA: 135, BH: 169, KW: 195, QA: 133 } },
  { weightKg: 3.5, weightLabel: "3.5KG", pcs: 9, charges: { SA: 141, BH: 183, KW: 212, QA: 140 } },
  { weightKg: 4, weightLabel: "4KG", pcs: 10, charges: { SA: 147, BH: 200, KW: 229, QA: 146 } },
  { weightKg: 5, weightLabel: "5KG", pcs: 12, charges: { SA: 161, BH: 226, KW: 263, QA: 160 } },
];

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeCountryCode(value: unknown): FreightCountryCode | null {
  const code = String(value || "").trim().toUpperCase();
  if (code === "SA" || code === "BH" || code === "KW" || code === "QA") {
    return code;
  }
  return null;
}

function parseFreightRow(row: Record<string, unknown>): FreightChargeRow | null {
  const weightLabel = String(row.weightLabel ?? row.weight ?? row.weight_kg ?? "").trim();
  const weightKg = toNumber(row.weightKg ?? row.weight_kg ?? row.weight ?? weightLabel, Number.NaN);
  const pcs = Math.max(0, Math.round(toNumber(row.pcs ?? row.pieces ?? row.quantity, 0)));

  const charges = {
    SA: toNumber(row.saudi_arabia ?? row.saudiArabia ?? row.sa ?? row.sa_cost ?? row.saudi_cost, Number.NaN),
    BH: toNumber(row.bahrain ?? row.bh ?? row.bh_cost, Number.NaN),
    KW: toNumber(row.kuwait ?? row.kw ?? row.kw_cost, Number.NaN),
    QA: toNumber(row.qatar ?? row.qa ?? row.qa_cost, Number.NaN),
  };

  if (!weightLabel && !Number.isFinite(weightKg)) {
    return null;
  }

  if (![charges.SA, charges.BH, charges.KW, charges.QA].some((value) => Number.isFinite(value))) {
    return null;
  }

  return {
    weightKg: Number.isFinite(weightKg) ? weightKg : toNumber(weightLabel, 0),
    weightLabel: weightLabel || `${weightKg}KG`,
    pcs,
    charges: {
      SA: Number.isFinite(charges.SA) ? charges.SA : 0,
      BH: Number.isFinite(charges.BH) ? charges.BH : 0,
      KW: Number.isFinite(charges.KW) ? charges.KW : 0,
      QA: Number.isFinite(charges.QA) ? charges.QA : 0,
    },
  };
}

function parseFreightTableEnv(raw: string | undefined): FreightChargeRow[] | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const rows = parsed
      .map((item) => (item && typeof item === "object" ? parseFreightRow(item as Record<string, unknown>) : null))
      .filter((row): row is FreightChargeRow => Boolean(row));

    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

export function getShippingFreightTable(): FreightChargeRow[] {
  const raw =
    getEnvVar("SHIPPING_FREIGHT_TABLE_JSON") ||
    getEnvVar("NEXT_PUBLIC_SHIPPING_FREIGHT_TABLE_JSON");

  const rows = parseFreightTableEnv(raw);
  if (rows && rows.length > 0) {
    return rows.sort((a, b) => a.weightKg - b.weightKg || a.pcs - b.pcs);
  }

  return [...DEFAULT_FREIGHT_TABLE].sort((a, b) => a.weightKg - b.weightKg || a.pcs - b.pcs);
}

export function getShippingFreightCountries(): FreightCountryCode[] {
  return ["SA", "BH", "KW", "QA"];
}

export function getShippingFreightDisplayRows(): FreightChargeDisplayRow[] {
  return getShippingFreightTable().map((row) => ({
    weight: row.weightLabel,
    pcs: String(row.pcs),
    saudi_arabia: formatNumber(row.charges.SA),
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
