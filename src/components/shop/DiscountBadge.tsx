"use client";

import { useDiscountRules } from "@/contexts/DiscountRulesContext";

interface DiscountBadgeProps {
  productId: number;
  categoryIds?: number[];
  className?: string;
}

export function DiscountBadge({ productId, categoryIds, className }: DiscountBadgeProps) {
  const { getRulesForProduct } = useDiscountRules();
  const applicable = getRulesForProduct(productId, categoryIds);

  if (applicable.length === 0) return null;

  const rule = applicable[0];
  const text = rule.badge_text || rule.name;
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
