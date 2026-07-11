"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Get the target locale (opposite of current)
  const targetLocale = locale === "en" ? "ar" : "en";
  const targetLocaleData = locales.find((l) => l.code === targetLocale);
  const newHref = alternateUrl || getLocalizedPath(pathname, targetLocale);

  useEffect(() => {
    router.prefetch(newHref);
  }, [newHref, router]);

  const handleSwitch = () => {
    startTransition(() => {
      router.push(newHref);
    });
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
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition-all hover:bg-gray-100",
        isPending && "cursor-wait opacity-70",
        className
      )}
      aria-label={t.switchLanguage}
    >
      <Globe className="h-3.5 w-3.5 text-brand-primary" />
      <span className="text-gray-600">{targetLocaleData?.nativeName}</span>
    </button>
  );
}
