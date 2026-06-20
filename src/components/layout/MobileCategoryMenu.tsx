"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Grid3X3, ChevronDown } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { getMegaMenuCategories } from "@/config/menu";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface MobileCategoryMenuProps {
  locale: Locale;
  dictionary: Dictionary;
  onNavigate: () => void;
}

export function MobileCategoryMenu({
  locale,
  dictionary,
  onNavigate,
}: MobileCategoryMenuProps) {
  // Static categories from config
  const marketPrefix = useMarketPrefix();
  const staticCategories = getMegaMenuCategories(locale);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const isRTL = locale === "ar";

  const toggleCategory = (categoryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (staticCategories.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-2" dir={isRTL ? "rtl" : "ltr"}>
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {dictionary.common.categories || "Categories"}
      </div>
      <div className="space-y-1">
        {staticCategories.map((category) => (
          <div key={category.id}>
            <div className="flex items-center">
              <Link
                href={`${marketPrefix}/${locale}/shop?category=${category.slug}`}
                onClick={onNavigate}
                className={cn(
                  "flex-1 flex items-center gap-3 rounded-md px-3 py-2",
                  "text-base font-bold text-brand-primary",
                  "hover:bg-gray-100 hover:text-brand-primary-dark",
                  "transition-colors"
                )}
              >
                {category.image?.src ? (
                  <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={category.image.src}
                      alt={decodeHtmlEntities(category.name)}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-beige">
                    <Grid3X3 className="h-4 w-4 text-brand-gold" />
                  </div>
                )}
                <span className="flex-1">{decodeHtmlEntities(category.name)}</span>
                <span className="text-xs text-gray-400 font-normal">
                  {category.children.length}
                </span>
              </Link>
              {category.children.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => toggleCategory(category.id, e)}
                  className={cn(
                    "p-2 rounded-md hover:bg-gray-100 transition-colors",
                    "text-gray-500 hover:text-gray-700"
                  )}
                  aria-label={expandedCategories.has(category.id) ? "Collapse" : "Expand"}
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      expandedCategories.has(category.id) && "rotate-180"
                    )}
                  />
                </button>
              )}
            </div>

            {category.children.length > 0 && expandedCategories.has(category.id) && (
              <div className={cn(
                "mt-1 space-y-1",
                isRTL ? "mr-11" : "ml-11"
              )}>
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`${marketPrefix}/${locale}/shop?category=${child.slug}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2",
                      "text-sm text-gray-600",
                      "hover:bg-brand-beige hover:text-brand-primary",
                      "transition-colors"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span className="flex-1">{decodeHtmlEntities(child.name)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 px-3">
        <Link
          href={`${marketPrefix}/${locale}/shop`}
          onClick={onNavigate}
          className={cn(
            "flex items-center justify-center gap-2 w-full",
            "rounded-md bg-brand-primary px-4 py-2.5",
            "text-sm font-medium text-white",
            "hover:bg-brand-primary-dark transition-colors"
          )}
        >
          {dictionary.common.viewAll || "View All Products"}
        </Link>
      </div>
    </div>
  );
}
