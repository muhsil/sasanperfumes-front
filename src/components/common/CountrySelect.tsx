"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CountryOption {
  value: string;
  label: string;
  labelAr?: string;
}

export const countries: CountryOption[] = [
  { value: "AE", label: "United Arab Emirates", labelAr: "الإمارات العربية المتحدة" },
  { value: "SA", label: "Saudi Arabia", labelAr: "المملكة العربية السعودية" },
  { value: "KW", label: "Kuwait", labelAr: "الكويت" },
  { value: "BH", label: "Bahrain", labelAr: "البحرين" },
  { value: "OM", label: "Oman", labelAr: "عمان" },
  { value: "QA", label: "Qatar", labelAr: "قطر" },
  { value: "EG", label: "Egypt", labelAr: "مصر" },
  { value: "JO", label: "Jordan", labelAr: "الأردن" },
  { value: "LB", label: "Lebanon", labelAr: "لبنان" },
  { value: "SY", label: "Syria", labelAr: "سوريا" },
  { value: "PS", label: "Palestine", labelAr: "فلسطين" },
  { value: "YE", label: "Yemen", labelAr: "اليمن" },
  { value: "LY", label: "Libya", labelAr: "ليبيا" },
  { value: "TN", label: "Tunisia", labelAr: "تونس" },
  { value: "DZ", label: "Algeria", labelAr: "الجزائر" },
  { value: "MA", label: "Morocco", labelAr: "المغرب" },
  { value: "SD", label: "Sudan", labelAr: "السودان" },
  { value: "US", label: "United States", labelAr: "الولايات المتحدة" },
  { value: "GB", label: "United Kingdom", labelAr: "المملكة المتحدة" },
  { value: "CA", label: "Canada", labelAr: "كندا" },
  { value: "AU", label: "Australia", labelAr: "أستراليا" },
  { value: "DE", label: "Germany", labelAr: "ألمانيا" },
  { value: "FR", label: "France", labelAr: "فرنسا" },
  { value: "IT", label: "Italy", labelAr: "إيطاليا" },
  { value: "ES", label: "Spain", labelAr: "إسبانيا" },
  { value: "NL", label: "Netherlands", labelAr: "هولندا" },
  { value: "BE", label: "Belgium", labelAr: "بلجيكا" },
  { value: "CH", label: "Switzerland", labelAr: "سويسرا" },
  { value: "AT", label: "Austria", labelAr: "النمسا" },
  { value: "SE", label: "Sweden", labelAr: "السويد" },
  { value: "NO", label: "Norway", labelAr: "النرويج" },
  { value: "DK", label: "Denmark", labelAr: "الدنمارك" },
  { value: "FI", label: "Finland", labelAr: "فنلندا" },
  { value: "PL", label: "Poland", labelAr: "بولندا" },
  { value: "PT", label: "Portugal", labelAr: "البرتغال" },
  { value: "GR", label: "Greece", labelAr: "اليونان" },
  { value: "TR", label: "Turkey", labelAr: "تركيا" },
  { value: "IN", label: "India", labelAr: "الهند" },
  { value: "PK", label: "Pakistan", labelAr: "باكستان" },
  { value: "BD", label: "Bangladesh", labelAr: "بنغلاديش" },
  { value: "PH", label: "Philippines", labelAr: "الفلبين" },
  { value: "ID", label: "Indonesia", labelAr: "إندونيسيا" },
  { value: "MY", label: "Malaysia", labelAr: "ماليزيا" },
  { value: "SG", label: "Singapore", labelAr: "سنغافورة" },
  { value: "TH", label: "Thailand", labelAr: "تايلاند" },
  { value: "VN", label: "Vietnam", labelAr: "فيتنام" },
  { value: "JP", label: "Japan", labelAr: "اليابان" },
  { value: "KR", label: "South Korea", labelAr: "كوريا الجنوبية" },
  { value: "CN", label: "China", labelAr: "الصين" },
  { value: "HK", label: "Hong Kong", labelAr: "هونغ كونغ" },
  { value: "TW", label: "Taiwan", labelAr: "تايوان" },
  { value: "NZ", label: "New Zealand", labelAr: "نيوزيلندا" },
  { value: "ZA", label: "South Africa", labelAr: "جنوب أفريقيا" },
  { value: "NG", label: "Nigeria", labelAr: "نيجيريا" },
  { value: "KE", label: "Kenya", labelAr: "كينيا" },
  { value: "BR", label: "Brazil", labelAr: "البرازيل" },
  { value: "MX", label: "Mexico", labelAr: "المكسيك" },
  { value: "AR", label: "Argentina", labelAr: "الأرجنتين" },
  { value: "CL", label: "Chile", labelAr: "تشيلي" },
  { value: "CO", label: "Colombia", labelAr: "كولومبيا" },
  { value: "AF", label: "Afghanistan", labelAr: "أفغانستان" },
  { value: "AL", label: "Albania", labelAr: "ألبانيا" },
  { value: "AD", label: "Andorra", labelAr: "أندورا" },
  { value: "AO", label: "Angola", labelAr: "أنغولا" },
  { value: "AG", label: "Antigua and Barbuda", labelAr: "أنتيغوا وبربودا" },
  { value: "AM", label: "Armenia", labelAr: "أرمينيا" },
  { value: "AZ", label: "Azerbaijan", labelAr: "أذربيجان" },
  { value: "BS", label: "Bahamas", labelAr: "الباهاماس" },
  { value: "BB", label: "Barbados", labelAr: "بربادوس" },
  { value: "BZ", label: "Belize", labelAr: "بليز" },
  { value: "BJ", label: "Benin", labelAr: "بنين" },
  { value: "BT", label: "Bhutan", labelAr: "بوتان" },
  { value: "BO", label: "Bolivia", labelAr: "بوليفيا" },
  { value: "BA", label: "Bosnia and Herzegovina", labelAr: "البوسنة والهرسك" },
  { value: "BW", label: "Botswana", labelAr: "بوتسوانا" },
  { value: "BN", label: "Brunei", labelAr: "بروناي" },
  { value: "BG", label: "Bulgaria", labelAr: "بلغاريا" },
  { value: "BF", label: "Burkina Faso", labelAr: "بوركينا فاسو" },
  { value: "BI", label: "Burundi", labelAr: "بوروندي" },
  { value: "KH", label: "Cambodia", labelAr: "كمبوديا" },
  { value: "CM", label: "Cameroon", labelAr: "الكاميرون" },
  { value: "CV", label: "Cape Verde", labelAr: "الرأس الأخضر" },
  { value: "CF", label: "Central African Republic", labelAr: "جمهورية أفريقيا الوسطى" },
  { value: "TD", label: "Chad", labelAr: "تشاد" },
  { value: "KM", label: "Comoros", labelAr: "جزر القمر" },
  { value: "CG", label: "Congo", labelAr: "الكونغو" },
  { value: "CD", label: "Congo (DRC)", labelAr: "جمهورية الكونغو الديمقراطية" },
  { value: "CR", label: "Costa Rica", labelAr: "كوستاريكا" },
  { value: "CI", label: "Côte d'Ivoire", labelAr: "ساحل العاج" },
  { value: "HR", label: "Croatia", labelAr: "كرواتيا" },
  { value: "CU", label: "Cuba", labelAr: "كوبا" },
  { value: "CY", label: "Cyprus", labelAr: "قبرص" },
  { value: "CZ", label: "Czech Republic", labelAr: "جمهورية التشيك" },
  { value: "DJ", label: "Djibouti", labelAr: "جيبوتي" },
  { value: "DM", label: "Dominica", labelAr: "دومينيكا" },
  { value: "DO", label: "Dominican Republic", labelAr: "جمهورية الدومينيكان" },
  { value: "EC", label: "Ecuador", labelAr: "الإكوادور" },
  { value: "SV", label: "El Salvador", labelAr: "السلفادور" },
  { value: "GQ", label: "Equatorial Guinea", labelAr: "غينيا الاستوائية" },
  { value: "ER", label: "Eritrea", labelAr: "إريتريا" },
  { value: "EE", label: "Estonia", labelAr: "إستونيا" },
  { value: "SZ", label: "Eswatini", labelAr: "إسواتيني" },
  { value: "ET", label: "Ethiopia", labelAr: "إثيوبيا" },
  { value: "FJ", label: "Fiji", labelAr: "فيجي" },
  { value: "GA", label: "Gabon", labelAr: "الغابون" },
  { value: "GM", label: "Gambia", labelAr: "غامبيا" },
  { value: "GE", label: "Georgia", labelAr: "جورجيا" },
  { value: "GH", label: "Ghana", labelAr: "غانا" },
  { value: "GD", label: "Grenada", labelAr: "غرينادا" },
  { value: "GT", label: "Guatemala", labelAr: "غواتيمالا" },
  { value: "GN", label: "Guinea", labelAr: "غينيا" },
  { value: "GW", label: "Guinea-Bissau", labelAr: "غينيا بيساو" },
  { value: "GY", label: "Guyana", labelAr: "غيانا" },
  { value: "HT", label: "Haiti", labelAr: "هايتي" },
  { value: "HN", label: "Honduras", labelAr: "هندوراس" },
  { value: "HU", label: "Hungary", labelAr: "المجر" },
  { value: "IS", label: "Iceland", labelAr: "آيسلندا" },
  { value: "IR", label: "Iran", labelAr: "إيران" },
  { value: "IE", label: "Ireland", labelAr: "أيرلندا" },
  { value: "IL", label: "Israel", labelAr: "إسرائيل" },
  { value: "JM", label: "Jamaica", labelAr: "جامايكا" },
  { value: "KZ", label: "Kazakhstan", labelAr: "كازاخستان" },
  { value: "KG", label: "Kyrgyzstan", labelAr: "قيرغيزستان" },
  { value: "LA", label: "Laos", labelAr: "لاوس" },
  { value: "LV", label: "Latvia", labelAr: "لاتفيا" },
  { value: "LR", label: "Liberia", labelAr: "ليبيريا" },
  { value: "LI", label: "Liechtenstein", labelAr: "ليختنشتاين" },
  { value: "LT", label: "Lithuania", labelAr: "ليتوانيا" },
  { value: "LU", label: "Luxembourg", labelAr: "لوكسمبورغ" },
  { value: "MO", label: "Macau", labelAr: "ماكاو" },
  { value: "MK", label: "North Macedonia", labelAr: "مقدونيا الشمالية" },
  { value: "MG", label: "Madagascar", labelAr: "مدغشقر" },
  { value: "MW", label: "Malawi", labelAr: "مالاوي" },
  { value: "MV", label: "Maldives", labelAr: "المالديف" },
  { value: "ML", label: "Mali", labelAr: "مالي" },
  { value: "MT", label: "Malta", labelAr: "مالطا" },
  { value: "MR", label: "Mauritania", labelAr: "موريتانيا" },
  { value: "MU", label: "Mauritius", labelAr: "موريشيوس" },
  { value: "MD", label: "Moldova", labelAr: "مولدوفا" },
  { value: "MC", label: "Monaco", labelAr: "موناكو" },
  { value: "MN", label: "Mongolia", labelAr: "منغوليا" },
  { value: "ME", label: "Montenegro", labelAr: "الجبل الأسود" },
  { value: "MZ", label: "Mozambique", labelAr: "موزمبيق" },
  { value: "MM", label: "Myanmar", labelAr: "ميانمار" },
  { value: "NA", label: "Namibia", labelAr: "ناميبيا" },
  { value: "NP", label: "Nepal", labelAr: "نيبال" },
  { value: "NI", label: "Nicaragua", labelAr: "نيكاراغوا" },
  { value: "NE", label: "Niger", labelAr: "النيجر" },
  { value: "KP", label: "North Korea", labelAr: "كوريا الشمالية" },
  { value: "PA", label: "Panama", labelAr: "بنما" },
  { value: "PG", label: "Papua New Guinea", labelAr: "بابوا غينيا الجديدة" },
  { value: "PY", label: "Paraguay", labelAr: "باراغواي" },
  { value: "PE", label: "Peru", labelAr: "بيرو" },
  { value: "PR", label: "Puerto Rico", labelAr: "بورتوريكو" },
  { value: "RO", label: "Romania", labelAr: "رومانيا" },
  { value: "RW", label: "Rwanda", labelAr: "رواندا" },
  { value: "KN", label: "Saint Kitts and Nevis", labelAr: "سانت كيتس ونيفيس" },
  { value: "LC", label: "Saint Lucia", labelAr: "سانت لوسيا" },
  { value: "VC", label: "Saint Vincent and the Grenadines", labelAr: "سانت فنسنت والغرينادين" },
  { value: "WS", label: "Samoa", labelAr: "ساموا" },
  { value: "SM", label: "San Marino", labelAr: "سان مارينو" },
  { value: "ST", label: "São Tomé and Príncipe", labelAr: "ساو تومي وبرينسيبي" },
  { value: "SN", label: "Senegal", labelAr: "السنغال" },
  { value: "RS", label: "Serbia", labelAr: "صربيا" },
  { value: "SC", label: "Seychelles", labelAr: "سيشل" },
  { value: "SL", label: "Sierra Leone", labelAr: "سيراليون" },
  { value: "SK", label: "Slovakia", labelAr: "سلوفاكيا" },
  { value: "SI", label: "Slovenia", labelAr: "سلوفينيا" },
  { value: "SB", label: "Solomon Islands", labelAr: "جزر سليمان" },
  { value: "SO", label: "Somalia", labelAr: "الصومال" },
  { value: "LK", label: "Sri Lanka", labelAr: "سريلانكا" },
  { value: "SR", label: "Suriname", labelAr: "سورينام" },
  { value: "TJ", label: "Tajikistan", labelAr: "طاجيكستان" },
  { value: "TZ", label: "Tanzania", labelAr: "تنزانيا" },
  { value: "TL", label: "Timor-Leste", labelAr: "تيمور الشرقية" },
  { value: "TG", label: "Togo", labelAr: "توغو" },
  { value: "TO", label: "Tonga", labelAr: "تونغا" },
  { value: "TT", label: "Trinidad and Tobago", labelAr: "ترينيداد وتوباغو" },
  { value: "TM", label: "Turkmenistan", labelAr: "تركمانستان" },
  { value: "UG", label: "Uganda", labelAr: "أوغندا" },
  { value: "UY", label: "Uruguay", labelAr: "أوروغواي" },
  { value: "UZ", label: "Uzbekistan", labelAr: "أوزبكستان" },
  { value: "VU", label: "Vanuatu", labelAr: "فانواتو" },
  { value: "VE", label: "Venezuela", labelAr: "فنزويلا" },
  { value: "ZM", label: "Zambia", labelAr: "زامبيا" },
  { value: "ZW", label: "Zimbabwe", labelAr: "زيمبابوي" },
];

const MARKET_COUNTRY_CODES = new Set(["qa", "om", "sa"]);

export function getMarketCountryCode(pathname?: string | null): string | null {
  const firstSegment = pathname?.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!firstSegment || !MARKET_COUNTRY_CODES.has(firstSegment)) return null;
  return firstSegment.toUpperCase();
}

export function getCountriesForPathname(
  countryList: CountryOption[],
  pathname?: string | null
): CountryOption[] {
  const marketCountryCode = getMarketCountryCode(pathname);
  if (!marketCountryCode) return countryList;
  return countryList.filter((country) => country.value === marketCountryCode);
}

export interface CountrySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  isRTL?: boolean;
  className?: string;
  availableCountries?: CountryOption[];
}

export function CountrySelect({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  isRTL = false,
  className,
  availableCountries,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const marketCountryCode = getMarketCountryCode(pathname);
  const countryList = getCountriesForPathname(availableCountries || countries, pathname);
  const effectiveValue = marketCountryCode || value;

  useEffect(() => {
    if (marketCountryCode && value !== marketCountryCode) {
      onChange(marketCountryCode);
    }
  }, [marketCountryCode, onChange, value]);

  const selectedCountry = countryList.find((c) => c.value === effectiveValue);
  const displayLabel = selectedCountry
    ? isRTL && selectedCountry.labelAr
      ? selectedCountry.labelAr
      : selectedCountry.label
    : "";

  const filteredCountries = countryList.filter((country) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      country.label.toLowerCase().includes(searchLower) ||
      country.labelAr?.includes(searchQuery) ||
      country.value.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (countryValue: string) => {
    onChange(countryValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm transition-colors",
            "hover:border-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/15",
            error ? "border-red-500 hover:border-red-500" : "border-gray-900/20",
            !displayLabel && "text-gray-500"
          )}
        >
          <span className="truncate">
            {displayLabel || placeholder || (isRTL ? "اختر الدولة" : "Select country")}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? "ابحث عن دولة..." : "Search country..."}
                  className="w-full rounded-md border border-gray-900/20 py-2 pl-9 pr-3 text-sm hover:border-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/15"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  {isRTL ? "لم يتم العثور على نتائج" : "No results found"}
                </div>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.value}
                    type="button"
                    onClick={() => handleSelect(country.value)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50",
                      value === country.value && "bg-gray-50"
                    )}
                  >
                    <span>
                      {isRTL && country.labelAr ? country.labelAr : country.label}
                    </span>
                    {value === country.value && (
                      <Check className="h-4 w-4 text-gray-900" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}
