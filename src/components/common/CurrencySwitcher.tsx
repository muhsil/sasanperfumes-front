"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronDown, Check, X, Globe } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { siteConfig, type Currency } from "@/config/site";
import { cn } from "@/lib/utils";

const currencyCountryCodes: Record<string, string> = {
  AED: "ae",
  SAR: "sa",
  QAR: "qa",
  KWD: "kw",
  BHD: "bh",
  OMR: "om",
  USD: "us",
  EUR: "eu",
  GBP: "gb",
  INR: "in",
  PKR: "pk",
  EGP: "eg",
  JOD: "jo",
  LBP: "lb",
  IQD: "iq",
  YER: "ye",
  SYP: "sy",
  TRY: "tr",
  MAD: "ma",
  TND: "tn",
  DZD: "dz",
  LYD: "ly",
  SDG: "sd",
};

function CountryFlag({ currencyCode, size = 20 }: { currencyCode: string; size?: number }) {
  const countryCode = currencyCountryCodes[currencyCode] || "un";
  const height = Math.round(size * 0.75);
  return (
    <Image
      src={`https://flagcdn.com/w40/${countryCode}.png`}
      alt={currencyCode}
      width={size}
      height={height}
      className="object-cover"
      unoptimized
      style={{ width: size, height: height }}
    />
  );
}

interface CurrencySwitcherProps {
  className?: string;
  locale?: "en" | "ar";
}

export function CurrencySwitcher({ className, locale = "en" }: CurrencySwitcherProps) {
  const { currency, setCurrency, currencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const isRTL = locale === "ar";

  const currentCurrency = currencies.find((c) => c.code === currency);
  const isLockedCurrency = currencies.length <= 1;

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [handleEscapeKey]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Hide completely on non-international markets (single currency)
  if (isLockedCurrency) return null;

  const handleSelect = (code: Currency) => {
    setCurrency(code);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    setIsOpen(true);
  };

  const translations = {
    en: {
      selectCurrency: "Choose Currency",
    },
    ar: {
      selectCurrency: "اختر العملة",
    },
  };

  const t = translations[locale];

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-brand-border/70 bg-brand-ivory/95 px-2.5 py-1 text-sm font-semibold text-brand-primary shadow-[0_8px_18px_rgba(20,15,10,0.08)] transition-all hover:border-brand-primary/35 hover:bg-white",
          className
        )}
        aria-label={t.selectCurrency}
        aria-haspopup={isLockedCurrency ? undefined : "dialog"}
        aria-disabled={isLockedCurrency}
      >
        <CountryFlag currencyCode={currentCurrency?.code || siteConfig.defaultCurrency} size={20} />
        {currentCurrency?.symbol && currentCurrency.symbol !== currentCurrency.code && (
          <span className="font-semibold text-brand-primary">{currentCurrency.symbol}</span>
        )}
        <span>{currentCurrency?.code}</span>
        {!isLockedCurrency && <ChevronDown className="h-3 w-3 text-brand-muted" />}
      </button>

      {/* Premium Currency Modal */}
      {isOpen && typeof window !== "undefined" && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal - Premium centered design */}
          <div
            className="fixed left-1/2 top-1/2 z-[100] w-[420px] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory/98 shadow-[0_28px_80px_rgba(20,15,10,0.2)] transition-all"
            dir={isRTL ? "rtl" : "ltr"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="currency-modal-title"
          >
            <div className="border-b border-brand-border/70 bg-brand-beige/45 px-4 py-4 md:px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-brand-border/70 bg-brand-ivory p-2 text-brand-primary shadow-[0_8px_18px_rgba(20,15,10,0.08)]">
                    <Globe className="h-5 w-5" />
                  </div>
                  <h2 id="currency-modal-title" className="text-base font-bold text-brand-primary md:text-lg">
                    {t.selectCurrency}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-transparent p-2 text-brand-muted transition-all hover:border-brand-border/70 hover:bg-brand-ivory hover:text-brand-primary"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Currency Options */}
            <div className="p-3 md:p-4">
              <div
                role="listbox"
                className="max-h-[min(64vh,520px)] overflow-y-auto rounded-lg border border-brand-border/70 bg-white/75 shadow-inner [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => handleSelect(curr.code as Currency)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-brand-border/55 px-3.5 py-3 text-left transition-all last:border-b-0 hover:bg-brand-beige/70",
                      currency === curr.code && "bg-brand-beige"
                    )}
                    role="option"
                    aria-selected={currency === curr.code}
                  >
                    <span className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-brand-ivory shadow-sm",
                      currency === curr.code ? "border-brand-primary ring-2 ring-brand-primary/15" : "border-brand-border/70"
                    )}>
                      <CountryFlag currencyCode={curr.code} size={26} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-brand-primary">{curr.code}</span>
                      <span className="block truncate text-xs text-brand-muted">{curr.label.replace(` (${curr.code})`, "")}</span>
                    </span>
                    {curr.symbol && curr.symbol !== curr.code && (
                      <span className="rounded-full border border-brand-border/70 bg-brand-ivory px-2.5 py-1 text-xs font-semibold text-brand-primary">
                        {curr.symbol}
                      </span>
                    )}
                    {currency === curr.code && (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
