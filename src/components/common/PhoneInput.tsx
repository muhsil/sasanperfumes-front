"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  countryPhoneConfigs,
  getPhoneConfigByCountry,
  parsePhoneNumber,
  formatPhoneWithCountryCode,
  validatePhoneNumber,
} from "@/lib/utils/phone";
import { countries, getMarketCountryCode } from "@/components/common/CountrySelect";

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (fullPhone: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  countryCode?: string;
  onCountryCodeChange?: (countryCode: string) => void;
  error?: string;
  required?: boolean;
  isRTL?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

function getCountryFlagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export function PhoneInput({
  label,
  value,
  onChange,
  onValidationChange,
  countryCode: externalCountryCode,
  onCountryCodeChange,
  error: externalError,
  required,
  isRTL = false,
  className,
  disabled,
  placeholder,
}: PhoneInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const marketCountryCode = getMarketCountryCode(pathname);

  const initialParsed = useMemo(() => {
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed.dialCode) {
        const matchedConfig = countryPhoneConfigs.find((c) => c.dialCode === parsed.dialCode);
        return {
          country: marketCountryCode || matchedConfig?.code || externalCountryCode || "AE",
          localNumber: parsed.localNumber,
        };
      }
      return { country: marketCountryCode || externalCountryCode || "AE", localNumber: parsed.localNumber };
    }
    return { country: marketCountryCode || externalCountryCode || "AE", localNumber: "" };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedCountry, setSelectedCountry] = useState<string>(initialParsed.country);
  const [localNumber, setLocalNumber] = useState(initialParsed.localNumber);

  useEffect(() => {
    const forcedCountry = marketCountryCode || externalCountryCode || initialParsed.country;
    if (forcedCountry !== selectedCountry) {
      // Keep the input synchronized with a market-enforced country.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCountry(forcedCountry);
      setLocalNumber("");
      setInternalError(null);
      onChange("");
      if (onCountryCodeChange) onCountryCodeChange(forcedCountry);
      if (onValidationChange) onValidationChange(!required);
    }
  }, [
    externalCountryCode,
    initialParsed.country,
    marketCountryCode,
    onChange,
    onCountryCodeChange,
    onValidationChange,
    required,
    selectedCountry,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const currentConfig = getPhoneConfigByCountry(selectedCountry);

  const handleLocalNumberChange = useCallback(
    (inputValue: string) => {
      const digitsOnly = inputValue.replace(/\D/g, "");
      const config = getPhoneConfigByCountry(selectedCountry);
      const truncated = digitsOnly.slice(0, config.maxLength);
      setLocalNumber(truncated);

      const fullPhone = formatPhoneWithCountryCode(config.dialCode, truncated);
      onChange(fullPhone);

      if (truncated) {
        const validation = validatePhoneNumber(truncated, selectedCountry);
        if (!validation.isValid) {
          setInternalError(isRTL ? (validation.errorAr || null) : (validation.error || null));
          if (onValidationChange) onValidationChange(false);
        } else {
          setInternalError(null);
          if (onValidationChange) onValidationChange(true);
        }
      } else {
        setInternalError(null);
        if (onValidationChange) onValidationChange(!required);
      }
    },
    [selectedCountry, onChange, onValidationChange, required, isRTL]
  );

  const handleCountrySelect = useCallback(
    (code: string) => {
      setSelectedCountry(code);
      setIsDropdownOpen(false);
      setSearchQuery("");
      if (onCountryCodeChange) onCountryCodeChange(code);

      const config = getPhoneConfigByCountry(code);
      const digitsOnly = localNumber.replace(/\D/g, "");
      const truncated = digitsOnly.slice(0, config.maxLength);
      setLocalNumber(truncated);

      const fullPhone = formatPhoneWithCountryCode(config.dialCode, truncated);
      onChange(fullPhone);

      if (truncated) {
        const validation = validatePhoneNumber(truncated, code);
        if (!validation.isValid) {
          setInternalError(isRTL ? (validation.errorAr || null) : (validation.error || null));
          if (onValidationChange) onValidationChange(false);
        } else {
          setInternalError(null);
          if (onValidationChange) onValidationChange(true);
        }
      }
    },
    [localNumber, onChange, onCountryCodeChange, onValidationChange, isRTL]
  );

  const phoneConfigsWithLabels = countryPhoneConfigs.map((config) => {
    const country = countries.find((c) => c.value === config.code);
    return {
      ...config,
      label: country?.label || config.code,
      labelAr: country?.labelAr || config.code,
    };
  });

  const visiblePhoneConfigs = marketCountryCode
    ? phoneConfigsWithLabels.filter((config) => config.code === marketCountryCode)
    : phoneConfigsWithLabels;

  const filteredConfigs = visiblePhoneConfigs.filter((config) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      config.label.toLowerCase().includes(searchLower) ||
      config.labelAr?.includes(searchQuery) ||
      config.code.toLowerCase().includes(searchLower) ||
      config.dialCode.includes(searchQuery)
    );
  });

  const displayError = externalError || internalError;
  const selectedConfig = visiblePhoneConfigs.find((c) => c.code === selectedCountry);

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex">
        <button
          type="button"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className={cn(
            "flex h-10 items-center gap-1 border bg-white px-2 text-sm transition-colors flex-shrink-0",
            "hover:border-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            displayError ? "border-red-500 hover:border-red-500" : "border-gray-900/20",
            isRTL ? "rounded-r-md border-l-0" : "rounded-l-md border-r-0"
          )}
        >
          <img src={getCountryFlagUrl(selectedCountry)} alt={selectedCountry} width={20} height={15} className="inline-block flex-shrink-0" />
          <span className="text-gray-700 font-medium whitespace-nowrap">
            {currentConfig.dialCode}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-gray-400 transition-transform",
              isDropdownOpen && "rotate-180"
            )}
          />
        </button>

        <input
          type="tel"
          value={localNumber}
          onChange={(e) => handleLocalNumberChange(e.target.value)}
          placeholder={
            placeholder ||
            (isRTL ? "رقم الهاتف" : `${currentConfig.minLength} digits`)
          }
          required={required}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full border bg-white px-3 py-2 text-base sm:text-sm transition-colors flex-1 min-w-0",
            "placeholder:text-gray-400",
            "hover:border-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            displayError ? "border-red-500 hover:border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-900/20",
            isRTL ? "rounded-l-md" : "rounded-r-md"
          )}
          dir="ltr"
        />

        {isDropdownOpen && (
          <div
            className={cn(
              "absolute z-50 mt-11 w-72 rounded-md border border-gray-200 bg-white shadow-lg",
              isRTL ? "right-0" : "left-0"
            )}
          >
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? "ابحث عن دولة..." : "Search country..."}
                  className="w-full rounded-md border border-gray-900/20 py-2 pl-9 pr-3 text-sm hover:border-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/15"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredConfigs.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  {isRTL ? "لم يتم العثور على نتائج" : "No results found"}
                </div>
              ) : (
                filteredConfigs.map((config) => (
                  <button
                    key={config.code}
                    type="button"
                    onClick={() => handleCountrySelect(config.code)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50",
                      selectedCountry === config.code && "bg-gray-50"
                    )}
                  >
                    <img src={getCountryFlagUrl(config.code)} alt={config.code} width={20} height={15} className="inline-block flex-shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {isRTL && config.labelAr ? config.labelAr : config.label}
                    </span>
                    <span className="text-gray-500 text-xs whitespace-nowrap">{config.dialCode}</span>
                    {selectedCountry === config.code && (
                      <Check className="h-4 w-4 text-gray-900 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {displayError && (
        <p className="mt-1.5 text-sm text-red-500">{displayError}</p>
      )}
      {!displayError && selectedConfig && (
        <p className="mt-1 text-xs text-gray-400">
          {isRTL
            ? `${currentConfig.minLength === currentConfig.maxLength ? currentConfig.minLength : `${currentConfig.minLength}-${currentConfig.maxLength}`} أرقام`
            : `${currentConfig.minLength === currentConfig.maxLength ? currentConfig.minLength : `${currentConfig.minLength}-${currentConfig.maxLength}`} digits`}
        </p>
      )}
    </div>
  );
}
