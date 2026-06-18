import type { Currency } from "@/config/site";

export type MarketCode = "intl" | "qa" | "om" | "sa";

export const MARKET_PREFIX_SEGMENTS = ["qa", "om", "sa"] as const;

const marketPrefixSet = new Set<string>(MARKET_PREFIX_SEGMENTS);

export interface MarketConfig {
  code: MarketCode;
  hostnames: string[];
  defaultCurrency: Currency;
  allowedCurrencies: Currency[] | "all";
}

export const marketConfigs: MarketConfig[] = [
  {
    code: "qa",
    hostnames: ["shapehive.com/qa", "www.shapehive.com/qa"],
    defaultCurrency: "QAR",
    allowedCurrencies: ["QAR"],
  },
  {
    code: "om",
    hostnames: ["shapehive.com/om", "www.shapehive.com/om"],
    defaultCurrency: "OMR",
    allowedCurrencies: ["OMR"],
  },
  {
    code: "sa",
    hostnames: ["shapehive.com/sa", "www.shapehive.com/sa"],
    defaultCurrency: "SAR",
    allowedCurrencies: ["SAR"],
  },
  {
    code: "intl",
    hostnames: [
      "shapehive.com",
      "www.shapehive.com",
      "localhost",
      "127.0.0.1",
      "localhost:3000",
      "127.0.0.1:3000",
      "localhost:3010",
      "127.0.0.1:3010",
    ],
    defaultCurrency: "AED",
    allowedCurrencies: "all",
  },
];

export const internationalMarket = marketConfigs.find((market) => market.code === "intl")!;

export function getMarketCodeFromHost(value?: string | null): MarketCode | null {
  const normalized = normalizeMarketHost(value);
  if (!normalized) return null;
  const marketFromPath = normalized.split("/")[1];
  if (marketFromPath && marketPrefixSet.has(marketFromPath)) {
    return marketFromPath as MarketCode;
  }
  if (marketPrefixSet.has(normalized)) {
    return normalized as MarketCode;
  }
  return null;
}

export function normalizeMarketHost(value?: string | null): string {
  if (!value) return "";

  const first = value.split(",")[0]?.trim() || "";
  if (!first) return "";

  const withoutProtocol = first.replace(/^https?:\/\//i, "").split(/[?#]/)[0];
  const [hostPart, ...pathSegments] = withoutProtocol.split("/");
  const normalizedHost = hostPart
    .replace(/:\d+$/, "")
    .replace(/^www\./, "")
    .toLowerCase();
  if (!normalizedHost) return "";

  const pathMarket = pathSegments.find((segment) => segment.trim() !== "");
  if (!pathMarket) return normalizedHost;

  const lowerMarket = pathMarket.toLowerCase();
  if (!marketPrefixSet.has(lowerMarket)) return normalizedHost;

  return `${normalizedHost}/${lowerMarket}`;
}

export function getMarketByHostName(host?: string | null): MarketConfig {
  const normalizedHost = normalizeMarketHost(host);
  return (
    marketConfigs.find((market) =>
      market.hostnames.some((marketHost) => normalizeMarketHost(marketHost) === normalizedHost)
    ) || internationalMarket
  );
}

export function getMarketByHost(host?: string | null): MarketConfig {
  const code = getMarketCodeFromHost(host);
  if (code) {
    const marketByCode = marketConfigs.find((market) => market.code === code);
    if (marketByCode) return marketByCode;
  }

  return getMarketByHostName(host);
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
