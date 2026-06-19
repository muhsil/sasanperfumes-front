"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { X, Cookie } from "lucide-react";
import { getCookie, setCookie } from "cookies-next";
import { cn } from "@/lib/utils";

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
      message: "This site uses cookies for a smoother shopping experience and traffic insights.",
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
        "bg-[#111111] text-white shadow-2xl",
        "left-3 right-3 bottom-16 rounded-xl border border-white/10 md:bottom-4 md:left-auto md:right-4 md:max-w-md"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative px-4 py-3 md:px-4 md:py-4">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white",
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
          <div className="flex-shrink-0 rounded-full bg-white/10 p-2">
            <Cookie className={cn("text-brand-gold", isMobile ? "h-4 w-4" : "h-5 w-5")} />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn("leading-relaxed text-white/80", isMobile ? "text-xs" : "text-sm")}>{t.message}</p>

            <div className={cn("mt-3 flex flex-wrap items-center gap-2", isMobile ? "mt-2" : "mt-3")}>
              <button
                onClick={handleAccept}
                className={cn(
                  "rounded-full border border-[#B9A06A] bg-[#B9A06A] font-semibold text-[#111111] shadow-sm transition-colors hover:border-white hover:bg-white",
                  isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                )}
                style={{ backgroundColor: "#B9A06A", borderColor: "#B9A06A", color: "#111111" }}
              >
                {t.accept}
              </button>
              <button
                onClick={handleReject}
                className={cn(
                  "rounded-full border border-white/20 font-medium text-white/75 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white",
                  isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                )}
              >
                {t.reject}
              </button>
              <a
                href={`/${locale}/privacy`}
                className={cn("text-white/60 underline-offset-4 hover:text-brand-gold hover:underline", isMobile ? "text-xs" : "text-sm")}
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
