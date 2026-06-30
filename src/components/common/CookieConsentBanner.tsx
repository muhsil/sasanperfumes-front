"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { X, Cookie } from "lucide-react";
import { getCookie, setCookie } from "cookies-next";
import { cn } from "@/lib/utils";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface CookieConsentBannerProps {
  locale?: "en" | "ar";
}

const COOKIE_CONSENT_KEY = "sasanperfumes_cookie_consent";

const mobileQuery = "(max-width: 767px)";
const subscribeMobile = (callback: () => void) => {
  const mql = window.matchMedia(mobileQuery);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const getIsMobile = () => window.matchMedia(mobileQuery).matches;
const getIsMobileServer = () => false;

export function CookieConsentBanner({ locale = "en" }: CookieConsentBannerProps) {
  const marketPrefix = useMarketPrefix();
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);
  const isRTL = locale === "ar";

  useEffect(() => {
    const consent = getCookie(COOKIE_CONSENT_KEY);
    // Also check localStorage as a backup (cookie may be blocked by browser)
    const lsConsent = typeof window !== "undefined" ? localStorage.getItem(COOKIE_CONSENT_KEY) : null;
    if (!consent && !lsConsent) {
      // Small delay to avoid layout shift on initial load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const persistConsent = (value: string) => {
    setCookie(COOKIE_CONSENT_KEY, value, {
      maxAge: 60 * 60 * 24 * 180, // 6 months
      path: "/",
      sameSite: "lax",
    });
    // Also store in localStorage as backup in case cookies are blocked
    if (typeof window !== "undefined") {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    }
  };

  const handleAccept = () => {
    persistConsent("accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    persistConsent("rejected");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    persistConsent("dismissed");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const translations = {
    en: {
      message: "We use cookies to keep your cart, preferences, and store experience working smoothly.",
      accept: "Accept All",
      reject: "Reject",
      learnMore: "Learn More",
    },
    ar: {
      message: "نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتحليل حركة المرور.",
      accept: "قبول الكل",
      reject: "رفض",
      learnMore: "اعرف المزيد",
    },
  };

  const t = translations[locale];

  return (
    <div
      className={cn(
        "fixed z-[60] transform transition-all duration-300 ease-out",
        "left-3 right-3 rounded-lg border border-brand-border/80 bg-white/95 text-brand-primary shadow-[0_18px_48px_rgba(20,15,10,0.14)] backdrop-blur-xl",
        "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:max-w-md"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative px-4 py-3 md:px-4 md:py-4">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute rounded-full p-1 text-brand-muted transition-colors hover:bg-brand-beige hover:text-brand-primary",
            isMobile ? "top-2" : "top-3",
            isRTL ? "left-2" : "right-2"
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={cn(
            "flex items-start gap-3",
            isRTL ? "pl-7 md:pl-8" : "pr-7 md:pr-8"
          )}
        >
          <div className="flex-shrink-0 rounded-full bg-brand-beige p-2">
            <Cookie className={cn("text-brand-primary", isMobile ? "h-4 w-4" : "h-5 w-5")} />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn("leading-relaxed text-brand-muted", isMobile ? "text-xs" : "text-sm")}>{t.message}</p>

            <div className={cn("mt-3 flex flex-wrap items-center gap-2", isMobile ? "mt-2" : "mt-3")}>
              <button
                onClick={handleAccept}
                className={cn(
                  "rounded-full border border-brand-primary bg-brand-primary font-semibold text-white shadow-sm transition-colors hover:border-brand-primary-dark hover:bg-brand-primary-dark",
                  isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                )}
              >
                {t.accept}
              </button>
              <button
                onClick={handleReject}
                className={cn(
                  "rounded-full border border-brand-border bg-brand-ivory font-medium text-brand-muted transition-colors hover:border-brand-primary/30 hover:bg-brand-beige hover:text-brand-primary",
                  isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                )}
              >
                {t.reject}
              </button>
              <a
                href={`${marketPrefix}/${locale}/privacy`}
                className={cn("text-brand-muted underline-offset-4 hover:text-brand-primary hover:underline", isMobile ? "text-xs" : "text-sm")}
              >
                {t.learnMore}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
