"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getMarketPrefixFromPath } from "@/lib/utils";

function subscribeToPathname(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getBrowserPathname(): string {
  return window.location.pathname;
}

function getServerPathname(): string {
  return "";
}

function getMarketPrefixFromSearch(): string {
  if (typeof window === "undefined") return "";
  const market = new URLSearchParams(window.location.search).get("__market")?.toLowerCase() || "";
  return /^(qa|om|sa)$/.test(market) ? `/${market}` : "";
}

/**
 * Returns the market path prefix based on the current URL.
 * E.g. "/qa" when on /qa/en/shop, "" when on /en/shop (international).
 */
export function useMarketPrefix(): string {
  const pathname = usePathname();
  const browserPathname = useSyncExternalStore(subscribeToPathname, getBrowserPathname, getServerPathname);

  return getMarketPrefixFromPath(browserPathname) || getMarketPrefixFromPath(pathname) || getMarketPrefixFromSearch();
}
