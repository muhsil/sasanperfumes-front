"use client";

import { usePathname } from "next/navigation";

const MARKET_CODES = new Set(["qa", "om", "sa"]);

/**
 * Returns the market path prefix based on the current URL.
 * E.g. "/qa" when on /qa/en/shop, "" when on /en/shop (international).
 */
export function useMarketPrefix(): string {
  const pathname = usePathname();
  const firstSegment = pathname.split("/")[1];
  if (MARKET_CODES.has(firstSegment)) {
    return `/${firstSegment}`;
  }
  return "";
}
