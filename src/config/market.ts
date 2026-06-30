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
    hostnames: [
      "sasanperfumes.com/qa",
      "store.sasanperfumes.com/qa",
      "localhost/qa",
      "127.0.0.1/qa",
    ],
    defaultCurrency: "QAR",
    allowedCurrencies: ["QAR"],
  },
  {
    code: "om",
    hostnames: [
      "sasanperfumes.com/om",
      "store.sasanperfumes.com/om",
      "localhost/om",
      "127.0.0.1/om",
    ],
    defaultCurrency: "OMR",
    allowedCurrencies: ["OMR"],
  },
  {
    code: "sa",
    hostnames: [
      "sasanperfumes.com/sa",
      "store.sasanperfumes.com/sa",
      "localhost/sa",
      "127.0.0.1/sa",
    ],
    defaultCurrency: "SAR",
    allowedCurrencies: ["SAR"],
  },
  {
    code: "intl",
    hostnames: [
      "sasanperfumes.com",
      "store.sasanperfumes.com",
      "localhost",
      "127.0.0.1",
    ],
    defaultCurrency: "AED",
    allowedCurrencies: "all",
  },
];

export const internationalMarket = marketConfigs.find((market) => market.code === "intl")!;

export function normalizeMarketHost(value?: string | null): string {
  if (!value) return "";

  const marketCodes = new Set(["qa", "om", "sa"]);
  const first = value.split(",")[0]?.trim() || "";
  if (!first) return "";

  const withoutProtocol = first.replace(/^https?:\/\//i, "");
  const segments = withoutProtocol.split("/").filter(Boolean);
  if (segments.length === 0) return "";

  const host = segments[0]
    .replace(/:\d+$/, "")
    .replace(/^www\./, "")
    .toLowerCase();

  const hostParts = host.split(".");
  const subdomainMarket = hostParts[0];
  if (hostParts.length > 2 && marketCodes.has(subdomainMarket)) {
    return `${hostParts.slice(1).join(".")}/${subdomainMarket}`;
  }

  if (segments.length > 1) {
    const firstPath = segments[1].toLowerCase();
    if (marketCodes.has(firstPath)) {
      return `${host}/${firstPath}`;
    }
  }

  return host;
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

/**
 * Returns the URL path prefix for a market.
 * International returns "" (no prefix), others return "/qa", "/om", "/sa".
 */
export function getMarketPathPrefix(marketCode: MarketCode): string {
  if (marketCode === "intl") return "";
  return `/${marketCode}`;
}
