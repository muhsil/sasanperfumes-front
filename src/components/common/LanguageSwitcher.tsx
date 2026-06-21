"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { type Locale } from "@/config/site";
import { getLocalizedPath, cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  locale: Locale;
  className?: string;
  alternateUrl?: string;
}

const locales: { code: Locale; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
];

export function LanguageSwitcher({ locale, className, alternateUrl }: LanguageSwitcherProps) {
  const pathname = usePathname();

  // Get the target locale (opposite of current)
  const targetLocale = locale === "en" ? "ar" : "en";
  const targetLocaleData = locales.find((l) => l.code === targetLocale);

  const handleSwitch = () => {
    const currentPathname = window.location.pathname || pathname;
    const newHref = alternateUrl || getLocalizedPath(currentPathname, targetLocale);
    // Full page reload to ensure all server/client state (dictionary, layout)
    // is refreshed for the new locale. router.push() does a soft navigation
    // which can leave stale Arabic/English dictionary text in client components.
    window.location.href = newHref;
  };

  const translations = {
    en: {
      switchLanguage: "Switch to Arabic",
    },
    ar: {
      switchLanguage: "Switch to English",
    },
  };

  const t = translations[locale];

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition-all hover:bg-gray-100",
        className
      )}
      aria-label={t.switchLanguage}
    >
      <Globe className="h-3.5 w-3.5 text-brand-primary" />
      <span className="text-gray-600">{targetLocaleData?.nativeName}</span>
    </button>
  );
}
