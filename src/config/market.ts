import type { Currency } from "@/config/site";

export type MarketCode = "intl" | "qa" | "om" | "sa";

export interface MarketConfig {
  code: MarketCode;
  hostnames: string[];
  defaultCurrency: Currency;
  allowedCurrencies: Currency[] | "all";
}

export const marketConfigs: MarketConfig[] = [
  {
    code: "qa",
    hostnames: ["qa.shapehive.com"],
    defaultCurrency: "QAR",
    allowedCurrencies: ["QAR"],
  },
  {
    code: "om",
    hostnames: ["om.shapehive.com"],
    defaultCurrency: "OMR",
    allowedCurrencies: ["OMR"],
  },
  {
    code: "sa",
    hostnames: ["sa.shapehive.com"],
    defaultCurrency: "SAR",
    allowedCurrencies: ["SAR"],
  },
  {
    code: "intl",
    hostnames: ["shapehive.com", "www.shapehive.com", "localhost", "127.0.0.1"],
    defaultCurrency: "AED",
    allowedCurrencies: "all",
  },
];

export const internationalMarket = marketConfigs.find((market) => market.code === "intl")!;

export function normalizeMarketHost(value?: string | null): string {
  if (!value) return "";

  const first = value.split(",")[0]?.trim() || "";
  if (!first) return "";

  const withoutProtocol = first.replace(/^https?:\/\//i, "");
  return withoutProtocol
    .split("/")[0]
    .replace(/:\d+$/, "")
    .replace(/^www\./, "")
    .toLowerCase();
}

export function getMarketByHost(host?: string | null): MarketConfig {
  const normalizedHost = normalizeMarketHost(host);
  return (
    marketConfigs.find((market) =>
      market.hostnames.some((marketHost) => normalizeMarketHost(marketHost) === normalizedHost)
    ) || internationalMarket
  );
}

export function filterCurrenciesForMarket<T extends { code: string }>(
  currencies: T[],
  market: MarketConfig
): T[] {
  if (market.allowedCurrencies === "all") {
    return currencies;
  }

  const allowed = new Set(market.allowedCurrencies.map((code) => code.toUpperCase()));
  return currencies.filter((currency) => allowed.has(currency.code.toUpperCase()));
}

export function isCurrencyAllowedForMarket(currency: Currency, market: MarketConfig): boolean {
  if (market.allowedCurrencies === "all") return true;
  return market.allowedCurrencies.includes(currency);
}
