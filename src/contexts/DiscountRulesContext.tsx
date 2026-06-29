"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getActiveDiscountRules, isDiscountRuleEnabled } from "@/lib/discountRules";
import type { DiscountRule } from "@/types/discount";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface DiscountRulesContextValue {
  rules: DiscountRule[];
  isLoading: boolean;
  getRulesForProduct: (productId: number, categoryIds?: number[]) => DiscountRule[];
  getBadgeText: (productId: number, categoryIds?: number[]) => string | null;
}

const DiscountRulesContext = createContext<DiscountRulesContextValue>({
  rules: [],
  isLoading: true,
  getRulesForProduct: () => [],
  getBadgeText: () => null,
});

export function DiscountRulesProvider({
  children,
  initialRules,
}: {
  children: ReactNode;
  initialRules?: DiscountRule[];
}) {
  const [rules, setRules] = useState<DiscountRule[]>(() => getActiveDiscountRules(initialRules ?? []));
  const [isLoading, setIsLoading] = useState(!initialRules);
  const marketPrefix = useMarketPrefix();

  useEffect(() => {
    if (initialRules) return;

    const market = marketPrefix.replace(/^\//, "");
    const params = new URLSearchParams();
    if (market) params.set("market", market);

    fetch(`/api/discount-rules?${params.toString()}`)
      .then((res) => res.json())
      .then((data: DiscountRule[]) => {
        if (Array.isArray(data)) setRules(getActiveDiscountRules(data));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [initialRules, marketPrefix]);

  const getRulesForProduct = useCallback(
    (productId: number, categoryIds?: number[]): DiscountRule[] => {
      return rules.filter((rule) => {
        if (!isDiscountRuleEnabled(rule)) return false;
        if (rule.applies_to === "all") return true;
        if (rule.applies_to === "product" && (rule.product_ids || []).includes(productId)) return true;
        if (rule.applies_to === "category" && categoryIds?.some((id) => (rule.category_ids || []).includes(id))) return true;
        return false;
      });
    },
    [rules]
  );

  const getBadgeText = useCallback(
    (productId: number, categoryIds?: number[]): string | null => {
      const applicable = getRulesForProduct(productId, categoryIds);
      if (applicable.length === 0) return null;
      return applicable[0].badge_text || applicable[0].name;
    },
    [getRulesForProduct]
  );

  return (
    <DiscountRulesContext.Provider value={{ rules, isLoading, getRulesForProduct, getBadgeText }}>
      {children}
    </DiscountRulesContext.Provider>
  );
}

export function useDiscountRules() {
  return useContext(DiscountRulesContext);
}
