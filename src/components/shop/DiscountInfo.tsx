"use client";

import { Tag } from "lucide-react";
import { useDiscountRules } from "@/contexts/DiscountRulesContext";
import type { DiscountRule } from "@/types/discount";

interface DiscountInfoProps {
  productId: number;
  categoryIds?: number[];
  locale?: string;
}

function formatRuleDescription(rule: DiscountRule, isAr: boolean): string {
  if (rule.description) return rule.description;

  switch (rule.type) {
    case "bogo":
      return isAr
        ? `اشترِ ${rule.buy_quantity} واحصل على ${rule.get_quantity} مجاناً!`
        : `Buy ${rule.buy_quantity} and get ${rule.get_quantity} FREE!`;
    case "percentage":
      return isAr
        ? `خصم ${rule.discount_value}% على هذا المنتج`
        : `${rule.discount_value}% off this product`;
    case "fixed":
      return isAr
        ? `خصم ${rule.discount_value} على هذا المنتج`
        : `${rule.discount_value} off this product`;
    case "bulk":
      return isAr ? "خصومات الكمية متوفرة" : "Bulk discounts available";
    default:
      return rule.name;
  }
}

export function DiscountInfo({ productId, categoryIds, locale }: DiscountInfoProps) {
  const { getRulesForProduct } = useDiscountRules();
  const applicable = getRulesForProduct(productId, categoryIds);
  const isAr = locale === "ar";

  if (applicable.length === 0) return null;

  return (
    <div className="space-y-2">
      {applicable.map((rule) => (
        <div
          key={rule.id}
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3"
        >
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              {rule.badge_text || rule.name}
            </p>
            <p className="text-xs text-green-700">
              {formatRuleDescription(rule, isAr)}
            </p>
            {rule.type === "bulk" && rule.bulk_tiers.length > 0 && (
              <div className="mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="py-1 text-left font-medium text-green-700">
                        {isAr ? "الكمية" : "Quantity"}
                      </th>
                      <th className="py-1 text-right font-medium text-green-700">
                        {isAr ? "الخصم" : "Discount"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rule.bulk_tiers.map((tier, i) => (
                      <tr key={i} className="border-b border-green-100 last:border-0">
                        <td className="py-1 text-green-800">
                          {tier.max_qty
                            ? `${tier.min_qty} - ${tier.max_qty}`
                            : `${tier.min_qty}+`}
                        </td>
                        <td className="py-1 text-right text-green-800">
                          {tier.discount_unit === "percentage"
                            ? `${tier.discount_value}%`
                            : tier.discount_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
