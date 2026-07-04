"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/utils/analytics";

const STORAGE_KEY = "sasanperfumes_customer_tracking";
const SESSION_KEY = "sasanperfumes_tracking_session";

export interface CustomerTrackingData {
  // First visit info
  landing_page: string;
  referrer: string;
  first_visit: string;
  // UTM parameters
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  // Device & browser info
  device_type: string;
  browser: string;
  screen_resolution: string;
  user_agent: string;
  // Session info
  pages_viewed: number;
  pages_list: string[];
  locale: string;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera/")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("MSIE") || ua.includes("Trident/")) return "IE";
  return "Other";
}

function getStoredTracking(): CustomerTrackingData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveTracking(data: CustomerTrackingData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

function isNewSession(): boolean {
  if (typeof window === "undefined") return true;
  return !sessionStorage.getItem(SESSION_KEY);
}

function markSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, "1");
}

/**
 * Hook that tracks customer visit data for order attribution.
 * Captures landing page, referrer, UTM params, device info, and pages visited.
 * Data persists in localStorage and is sent with order creation.
 */
export function useCustomerTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const pageViewInitializedRef = useRef(false);
  const previousUrlRef = useRef("");
  const exitTrackedRef = useRef(false);

  // Initialize tracking on first page load or new session
  useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return;
    initializedRef.current = true;

    const existing = getStoredTracking();
    const newSession = isNewSession();

    if (!existing || newSession) {
      // New visitor or new session - capture initial data
      const utmSource = searchParams.get("utm_source") || "";
      const utmMedium = searchParams.get("utm_medium") || "";
      const utmCampaign = searchParams.get("utm_campaign") || "";
      const utmTerm = searchParams.get("utm_term") || "";
      const utmContent = searchParams.get("utm_content") || "";

      // Extract locale from pathname (e.g., /en/... or /ar/...)
      const localeMatch = pathname.match(/^\/(en|ar)\b/);
      const locale = localeMatch ? localeMatch[1] : "en";

      const trackingData: CustomerTrackingData = {
        landing_page: window.location.href,
        referrer: document.referrer || "(direct)",
        first_visit: new Date().toISOString(),
        utm_source: utmSource || existing?.utm_source || "",
        utm_medium: utmMedium || existing?.utm_medium || "",
        utm_campaign: utmCampaign || existing?.utm_campaign || "",
        utm_term: utmTerm || existing?.utm_term || "",
        utm_content: utmContent || existing?.utm_content || "",
        device_type: getDeviceType(),
        browser: getBrowser(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        user_agent: navigator.userAgent,
        pages_viewed: 1,
        pages_list: [pathname],
        locale,
      };

      saveTracking(trackingData);
      markSession();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track SPA page views for GA4 / GTM on client-side route changes.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentUrl = window.location.href;
    const currentSearch = searchParams.toString();
    const pagePath = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    const localeMatch = pathname.match(/^\/(en|ar)\b/);
    const locale = localeMatch ? localeMatch[1] : "en";

    if (!pageViewInitializedRef.current) {
      pageViewInitializedRef.current = true;
      previousUrlRef.current = currentUrl;
      return;
    }

    if (previousUrlRef.current === currentUrl) return;

    trackAnalyticsEvent("page_view", {
      page_title: document.title,
      page_location: currentUrl,
      page_path: pagePath,
      page_referrer: previousUrlRef.current || document.referrer || "",
      locale,
    });

    previousUrlRef.current = currentUrl;
  }, [pathname, searchParams]);

  // Track page navigations
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = getStoredTracking();
    if (!existing) return;

    // Update UTM params if present on current page (e.g., user clicked a campaign link)
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmTerm = searchParams.get("utm_term");
    const utmContent = searchParams.get("utm_content");

    const updatedPages = existing.pages_list.includes(pathname)
      ? existing.pages_list
      : [...existing.pages_list, pathname].slice(-50); // Keep last 50 pages

    const updated: CustomerTrackingData = {
      ...existing,
      pages_viewed: updatedPages.length,
      pages_list: updatedPages,
      ...(utmSource ? { utm_source: utmSource } : {}),
      ...(utmMedium ? { utm_medium: utmMedium } : {}),
      ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
      ...(utmTerm ? { utm_term: utmTerm } : {}),
      ...(utmContent ? { utm_content: utmContent } : {}),
    };

    saveTracking(updated);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePageExit = () => {
      if (exitTrackedRef.current) return;
      exitTrackedRef.current = true;

      const data = getStoredTracking();
      trackAnalyticsEvent("site_exit", {
        page_path: pathname,
        locale: data?.locale || "",
        pages_viewed: data?.pages_viewed || 0,
        landing_page: data?.landing_page || "",
      });
    };

    window.addEventListener("pagehide", handlePageExit);
    return () => window.removeEventListener("pagehide", handlePageExit);
  }, [pathname]);

  // Get tracking data for order submission
  const getTrackingData = useCallback((): CustomerTrackingData | null => {
    return getStoredTracking();
  }, []);

  // Convert tracking data to order meta_data format
  const getOrderMetaData = useCallback((): Array<{ key: string; value: string }> => {
    const data = getStoredTracking();
    if (!data) return [];

    const meta: Array<{ key: string; value: string }> = [];

    // Entry/landing page
    if (data.landing_page) {
      meta.push({ key: "_tracking_landing_page", value: data.landing_page });
    }

    // Referrer
    if (data.referrer) {
      meta.push({ key: "_tracking_referrer", value: data.referrer });
    }

    // First visit timestamp
    if (data.first_visit) {
      meta.push({ key: "_tracking_first_visit", value: data.first_visit });
    }

    // UTM parameters
    if (data.utm_source) {
      meta.push({ key: "_tracking_utm_source", value: data.utm_source });
    }
    if (data.utm_medium) {
      meta.push({ key: "_tracking_utm_medium", value: data.utm_medium });
    }
    if (data.utm_campaign) {
      meta.push({ key: "_tracking_utm_campaign", value: data.utm_campaign });
    }
    if (data.utm_term) {
      meta.push({ key: "_tracking_utm_term", value: data.utm_term });
    }
    if (data.utm_content) {
      meta.push({ key: "_tracking_utm_content", value: data.utm_content });
    }

    // Device & browser
    if (data.device_type) {
      meta.push({ key: "_tracking_device_type", value: data.device_type });
    }
    if (data.browser) {
      meta.push({ key: "_tracking_browser", value: data.browser });
    }
    if (data.screen_resolution) {
      meta.push({ key: "_tracking_screen_resolution", value: data.screen_resolution });
    }

    // Session info
    meta.push({ key: "_tracking_pages_viewed", value: String(data.pages_viewed) });
    if (data.pages_list.length > 0) {
      meta.push({ key: "_tracking_pages_list", value: JSON.stringify(data.pages_list) });
    }

    // Locale
    if (data.locale) {
      meta.push({ key: "_tracking_locale", value: data.locale });
    }

    return meta;
  }, []);

  // Clear tracking data (e.g., after successful order)
  const clearTracking = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    getTrackingData,
    getOrderMetaData,
    clearTracking,
  };
}
