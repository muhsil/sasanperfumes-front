"use client";

import { useDiscountRules } from "@/contexts/DiscountRulesContext";
import { useParams } from "next/navigation";
import { getLocalizedDiscountRuleLabel } from "@/lib/discountRules";

interface DiscountBadgeProps {
  productId: number;
  categoryIds?: number[];
  className?: string;
}

export function DiscountBadge({ productId, categoryIds, className }: DiscountBadgeProps) {
  const { locale } = useParams<{ locale: string }>();
  const { getRulesForProduct } = useDiscountRules();
  const applicable = getRulesForProduct(productId, categoryIds);

  if (applicable.length === 0) return null;

  const rule = applicable[0];
  const text = getLocalizedDiscountRuleLabel(rule, locale);
  const bgColor = rule.badge_color || "#e53e3e";

  return (
    <span
      className={className}
      style={{
        backgroundColor: bgColor,
        color: "#fff",
        borderColor: bgColor,
      }}
    >
      {text}
    </span>
  );
}
