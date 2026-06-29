"use client";

import { Tag } from "lucide-react";
import { useDiscountRules } from "@/contexts/DiscountRulesContext";

interface DiscountBannerProps {
  locale?: string;
  className?: string;
}

export function DiscountBanner({ className }: DiscountBannerProps) {
  const { rules, isLoading } = useDiscountRules();

  if (isLoading || rules.length === 0) return null;

  return (
    <div className={className}>
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-4 py-2.5"
        >
          <Tag className="h-4 w-4 shrink-0 text-green-600" />
          <p className="text-sm font-semibold text-green-800">
            {rule.badge_text || rule.name}
            {rule.description && (
              <span className="ml-2 font-normal text-green-700">
                — {rule.description}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
