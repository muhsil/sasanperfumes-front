"use client";

import { useMemo, type CSSProperties } from "react";
import { Badge } from "@/components/common/Badge";
import { cn } from "@/lib/utils";
import { getProductBadgeItems, type ProductTagLike } from "@/lib/productBadges";
import { useProductBadgeSettings } from "@/hooks/useProductBadgeSettings";
import { useNewProductIds } from "@/hooks/useNewProductIds";
import type { Locale } from "@/config/site";

interface ProductBadgesProps {
  tags?: ProductTagLike[];
  productId?: number;
  locale: Locale;
  onSale?: boolean;
  outOfStock?: boolean;
  extraTagSlugs?: string[];
  variant?: "card" | "detail";
  className?: string;
}

export function ProductBadges({
  tags,
  productId,
  locale,
  onSale = false,
  outOfStock = false,
  extraTagSlugs = [],
  variant = "card",
  className,
}: ProductBadgesProps) {
  const badgeSettings = useProductBadgeSettings();
  const newProductIds = useNewProductIds(locale);
  const isAr = locale === "ar";
  const mappedBadges = useMemo(
    () => getProductBadgeItems(
      tags,
      badgeSettings,
      locale,
      productId && newProductIds.has(productId) ? [...extraTagSlugs, "new"] : extraTagSlugs
    ),
    [badgeSettings, extraTagSlugs, locale, newProductIds, productId, tags]
  );

  if (mappedBadges.length === 0 && !onSale && !outOfStock) return null;

  const badgeClassName = cn(
    "inline-flex items-center rounded-sm border px-2 font-bold uppercase leading-tight tracking-[0.12em] shadow-sm",
    variant === "detail" ? "py-1 !text-[10px]" : "py-0.5 !text-[9px]",
  );

  const systemBadgeClassName = cn(
    badgeClassName,
    variant === "detail" && "!border-0 !tracking-normal",
  );

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {mappedBadges.map((badge) => {
        const style = {
          backgroundColor: badge.color,
          borderColor: badge.color,
          color: badge.textColor,
        } satisfies CSSProperties;

        return (
          <span key={badge.slug} className={badgeClassName} style={style}>
            {badge.label}
          </span>
        );
      })}

      {onSale && (
        <Badge variant="error" className={systemBadgeClassName}>
          {isAr ? "\u062a\u062e\u0641\u064a\u0636" : "Sale"}
        </Badge>
      )}

      {outOfStock && (
        <Badge
          variant="default"
          className={cn(
            systemBadgeClassName,
            "bg-white/95 text-brand-primary",
            variant === "detail" && "!bg-white"
          )}
        >
          {isAr ? "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631" : "Out of Stock"}
        </Badge>
      )}
    </div>
  );
}
