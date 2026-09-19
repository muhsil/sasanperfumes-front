"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  getActiveDiscountRules,
  includesNumericId,
  isDiscountRuleEnabled,
  isPromotionEligibleMarket,
} from "@/lib/discountRules";
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

  /**
   * Promotions run in the UAE only, so the Qatar, Oman and Saudi storefronts
   * earn none. They were still advertising them: the badge promised "Buy 6 Get
   * 1 Free" on every product page while the cart applied nothing, which read as
   * the offer being broken. Withholding the rules here keeps the badge and the
   * basket telling the customer the same thing.
   */
  const marketRuns = isPromotionEligibleMarket(marketPrefix);

  const getRulesForProduct = useCallback(
    (productId: number, categoryIds?: number[]): DiscountRule[] => {
      if (!marketRuns) return [];

      return rules.filter((rule) => {
        if (!isDiscountRuleEnabled(rule)) return false;
        if (rule.applies_to === "all") return true;
        if (rule.applies_to === "product" && includesNumericId(rule.product_ids, productId)) return true;
        if (rule.applies_to === "category" && categoryIds?.some((id) => includesNumericId(rule.category_ids, id))) return true;
        return false;
      });
    },
    [rules, marketRuns]
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
    <DiscountRulesContext.Provider
      value={{ rules: marketRuns ? rules : [], isLoading, getRulesForProduct, getBadgeText }}
    >
      {children}
    </DiscountRulesContext.Provider>
  );
}

export function useDiscountRules() {
  return useContext(DiscountRulesContext);
}
