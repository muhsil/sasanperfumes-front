"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getCookie, setCookie } from "cookies-next";
import { siteConfig, API_BASE_CURRENCY, type Currency } from "@/config/site";
import { filterCurrenciesForMarket, isCurrencyAllowedForMarket, internationalMarket, type MarketConfig } from "@/config/market";

// Default currencies (will be replaced by API data)
const DEFAULT_CURRENCIES: CurrencyData[] = [
  { code: "AED", label: "UAE (AED)", symbol: "د.إ", decimals: 2, rateFromAED: 1 },
  { code: "BHD", label: "Bahrain (BHD)", symbol: "BD", decimals: 3, rateFromAED: 0.103 },
  { code: "KWD", label: "Kuwait (KWD)", symbol: "KD", decimals: 3, rateFromAED: 0.083 },
  { code: "OMR", label: "Oman (OMR)", symbol: "ر.ع.", decimals: 3, rateFromAED: 0.105 },
  { code: "QAR", label: "Qatar (QAR)", symbol: "QR", decimals: 2, rateFromAED: 0.99 },
  { code: "SAR", label: "Saudi Arabia (SAR)", symbol: "ر.س", decimals: 2, rateFromAED: 1.02 },
  { code: "USD", label: "United States (USD)", symbol: "$", decimals: 2, rateFromAED: 0.27 },
];

// Dynamic currency data type (matches API response)
export interface CurrencyData {
  code: string;
  label: string;
  symbol: string;
  decimals: number;
  rateFromAED: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: string | number | null | undefined, showCode?: boolean) => string;
  formatCartPrice: (price: string | number | null | undefined, minorUnit?: number, showCode?: boolean) => string;
  convertPrice: (price: number, fromCurrency?: Currency) => number;
  getCurrencySymbol: () => string;
  getCurrencyInfo: () => CurrencyData;
  currencies: CurrencyData[];
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_COOKIE_NAME = "wcml_currency";
const CURRENCY_LOCALSTORAGE_KEY = "sasanperfumes_currency";

// Helper to safely get currency from localStorage (client-side only)
const getStoredCurrency = (): Currency | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CURRENCY_LOCALSTORAGE_KEY);
    if (stored) return stored as Currency;
  } catch {
    // Ignore localStorage errors (e.g., private browsing)
  }
  return null;
};

// Helper to safely set currency in localStorage
const setStoredCurrency = (currency: Currency): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENCY_LOCALSTORAGE_KEY, currency);
  } catch {
    // Ignore localStorage errors
  }
};

interface CurrencyProviderProps {
  children: React.ReactNode;
  market?: MarketConfig;
}

export function CurrencyProvider({ children, market = internationalMarket }: CurrencyProviderProps) {
  const defaultCurrency = market.defaultCurrency || siteConfig.defaultCurrency;
  const defaultMarketCurrencies = filterCurrenciesForMarket(DEFAULT_CURRENCIES, market);

  // Always initialize with default currency to match server-rendered HTML
  // and avoid hydration mismatch (React error #418)
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency);
  const [currencies, setCurrencies] = useState<CurrencyData[]>(
    defaultMarketCurrencies.length > 0 ? defaultMarketCurrencies : DEFAULT_CURRENCIES
  );
  const [isLoading, setIsLoading] = useState(true);
  const hasHydrated = useRef(false);
  const hasFetchedCurrencies = useRef(false);

  // Restore currency from localStorage after hydration to avoid server/client mismatch
  useEffect(() => {
    const stored = getStoredCurrency();
    if (stored && stored !== defaultCurrency && isCurrencyAllowedForMarket(stored, market)) {
      setCurrencyState(stored);
    }
  }, [defaultCurrency, market]);

  // Fetch currencies from API on mount
  useEffect(() => {
    if (hasFetchedCurrencies.current) return;
    hasFetchedCurrencies.current = true;

    const fetchCurrencies = async () => {
      try {
        const response = await fetch("/api/currencies");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const marketCurrencies = filterCurrenciesForMarket(data, market);
            setCurrencies(marketCurrencies.length > 0 ? marketCurrencies : defaultMarketCurrencies);
          }
        }
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
        // Keep using default currencies on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
  }, [defaultMarketCurrencies, market]);

  // Load currency from cookie after hydration and after currencies are loaded
  useEffect(() => {
    if (isLoading) return;
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    
    const savedCurrency = getCookie(CURRENCY_COOKIE_NAME) as Currency | undefined;
    if (
      savedCurrency &&
      isCurrencyAllowedForMarket(savedCurrency, market) &&
      currencies.some((c) => c.code === savedCurrency)
    ) {
      setCurrencyState(savedCurrency);
    } else if (!currencies.some((c) => c.code === currency)) {
      setCurrencyState(defaultCurrency);
      setCookie(CURRENCY_COOKIE_NAME, defaultCurrency, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      setStoredCurrency(defaultCurrency);
    }
  }, [currencies, currency, defaultCurrency, isLoading, market]);

  const setCurrency = useCallback((newCurrency: Currency) => {
    if (!isCurrencyAllowedForMarket(newCurrency, market)) return;
    setCurrencyState(newCurrency);
    // Save to both cookie (for SSR) and localStorage (for instant client-side reads)
    setCookie(CURRENCY_COOKIE_NAME, newCurrency, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    setStoredCurrency(newCurrency);
  }, [market]);

  const getCurrencyInfo = useCallback(() => {
    return currencies.find((c) => c.code === currency) || currencies[0];
  }, [currency, currencies]);

    const getCurrencySymbol = useCallback(() => {
      return getCurrencyInfo().symbol;
    }, [getCurrencyInfo]);

    const convertPrice = useCallback(
      (price: number, fromCurrency: Currency = API_BASE_CURRENCY): number => {
        if (price === 0) return 0;
      
        const toCurrencyInfo = getCurrencyInfo();
        if (!toCurrencyInfo) return price;
        if (fromCurrency === currency) return price;

        // Sub-market storefronts (OM / SA / QA) only expose one active currency.
        // Their product feeds already come through in the market currency amount,
        // but the Store API still labels those values as AED. If we convert them
        // again here, we undercut prices on the localized storefront by a second
        // exchange step. In single-currency markets, preserve the backend amount
        // and only format it with the market currency.
        if (
          market.code !== "intl" &&
          currencies.length === 1 &&
          currency === defaultCurrency &&
          fromCurrency === API_BASE_CURRENCY
        ) {
          return price;
        }
      
        // Look up source currency rate. If not found in the filtered list
        // (e.g. sub-site markets only keep their own currency), fall back to
        // rateFromAED = 1 when the source is the API base currency (AED).
        const fromCurrencyInfo = currencies.find((c) => c.code === fromCurrency);
        const fromRate = fromCurrencyInfo
          ? fromCurrencyInfo.rateFromAED
          : fromCurrency === API_BASE_CURRENCY
            ? 1
            : null;
        if (fromRate === null) return price;
      
        const priceInAED = price / fromRate;
        const convertedPrice = priceInAED * toCurrencyInfo.rateFromAED;
      
        // Round to currency's decimal precision to avoid floating-point errors
        const multiplier = Math.pow(10, toCurrencyInfo.decimals);
        return Math.round(convertedPrice * multiplier) / multiplier;
      },
      [currency, currencies, getCurrencyInfo]
    );

    const formatPrice = useCallback(
    (price: string | number | null | undefined, showCode = true) => {
      const currencyInfo = getCurrencyInfo();
      
      // Handle undefined, null, or empty price
      if (price === undefined || price === null || price === "") {
        return "—";
      }
      
      const numericPrice = typeof price === "string" ? parseFloat(price.replace(/[^0-9.-]+/g, "")) : price;

      if (isNaN(numericPrice)) {
        return String(price);
      }

      const formattedNumber = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: currencyInfo.decimals,
        maximumFractionDigits: currencyInfo.decimals,
      }).format(numericPrice);

      return showCode ? `${formattedNumber} ${currencyInfo.code}` : `${currencyInfo.symbol}${formattedNumber}`;
    },
    [getCurrencyInfo]
  );

  const formatCartPrice = useCallback(
    (price: string | number | null | undefined, minorUnit = 2, showCode = true) => {
      const currencyInfo = getCurrencyInfo();
      
      // Handle undefined, null, or empty price
      if (price === undefined || price === null || price === "") {
        return "—";
      }
      
      const numericPrice = typeof price === "string" ? parseFloat(price.replace(/[^0-9.-]+/g, "")) : price;

      if (isNaN(numericPrice)) {
        return String(price);
      }

      const divisor = Math.pow(10, minorUnit);
      const convertedPrice = numericPrice / divisor;

      const formattedNumber = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: currencyInfo.decimals,
        maximumFractionDigits: currencyInfo.decimals,
      }).format(convertedPrice);

      return showCode ? `${formattedNumber} ${currencyInfo.code}` : `${currencyInfo.symbol}${formattedNumber}`;
    },
    [getCurrencyInfo]
  );

  return (
    <CurrencyContext.Provider
            value={{
              currency,
              setCurrency,
              formatPrice,
              formatCartPrice,
              convertPrice,
              getCurrencySymbol,
              getCurrencyInfo,
              currencies,
              isLoading,
            }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
