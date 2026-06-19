"use client";

import Image from "next/image";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { useComparison } from "@/contexts/ComparisonContext";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import type { Locale } from "@/config/site";

export function CompareDrawer({ locale }: { locale: Locale }) {
  const { items, remove, clear } = useComparison();
  const isAr = locale === "ar";

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white shadow-2xl"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <div className="flex flex-1 items-center gap-3 overflow-x-auto">
          {items.map((p) => (
            <div key={p.id} className="relative flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
              {p.images[0]?.src && (
                <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                  <Image src={p.images[0].src} alt={p.name} fill className="object-cover" sizes="48px" />
                </div>
              )}
              <div className="min-w-0">
                <p className="max-w-[120px] truncate text-xs font-medium text-gray-900">{p.name}</p>
                <FormattedPrice
                  price={parseInt(p.prices.price, 10)}
                  className="text-xs text-brand-primary"
                />
              </div>
              <button
                onClick={() => remove(p.id)}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}

          {/* Placeholder slots */}
          {Array.from({ length: 3 - items.length }).map((_, i) => (
            <div
              key={i}
              className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400"
            >
              {isAr ? "أضف منتجاً" : "Add product"}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={clear}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
          >
            {isAr ? "مسح الكل" : "Clear all"}
          </button>
          {items.length >= 2 && (
            <Link
              href={`/${locale}/compare?ids=${items.map((p) => p.id).join(",")}`}
              className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-dark transition-colors"
            >
              {isAr ? "مقارنة" : "Compare"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
