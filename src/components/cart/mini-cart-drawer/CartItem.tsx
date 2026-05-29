"use client";

import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, Gift } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { BundleItemsList } from "@/components/cart/BundleItemsList";
import type { CartItemProps } from "./types";
import { decodeHtmlEntities } from "@/lib/utils";

export function CartItem({
  item,
  locale,
  dictionary,
  isLoading,
  isUpdating,
  isGiftItem,
  isNewlyAddedGift,
  divisor,
  categoryName,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  return (
    <li 
      className={`p-4 transition-all duration-500 ${isGiftItem ? "bg-brand-beige/70" : ""} ${isNewlyAddedGift ? "animate-pulse ring-2 ring-brand-primary ring-inset" : ""}`}
    >
      <div className="flex gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-brand-beige">
          {item.featured_image ? (
            <Image
              src={item.featured_image}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-brand-muted" />
            </div>
          )}
          {isGiftItem && (
            <div className="absolute left-0 top-0 flex items-center gap-0.5 rounded-br-lg bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
              <Gift className="h-3 w-3" />
              FREE
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-semibold text-brand-primary">
                {decodeHtmlEntities(item.name)}
              </h3>
              {categoryName && (
                <p className="mt-0.5 font-semibold uppercase text-brand-gold" style={{ fontSize: '9px' }}>
                  {categoryName}
                </p>
              )}
            </div>
            {!isGiftItem && (
              <button
                onClick={() => onRemove(item.item_key)}
                className="text-brand-muted transition-colors hover:text-red-500"
                aria-label={dictionary.remove}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {isGiftItem ? (
            <p className="mt-1 text-sm font-medium text-brand-gold inline-flex items-center gap-1">
              <Gift className="h-3 w-3" />
              {locale === "ar" ? "هدية مجانية" : "Free Gift"}
            </p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
              <FormattedPrice
                price={parseFloat(item.price) / divisor}
                iconSize="xs"
              /> x {item.quantity.value}
            </p>
          )}

          <BundleItemsList item={item} locale={locale} compact />

          {!isGiftItem && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() =>
                  onQuantityChange(
                    item.item_key,
                    item.quantity.value - 1
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory transition-colors hover:border-brand-primary hover:bg-brand-primary hover:text-white disabled:opacity-50"
                disabled={isLoading || isUpdating || item.quantity.value <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium relative">
                {isUpdating ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary"></span>
                ) : (
                  item.quantity.value
                )}
              </span>
              <button
                onClick={() =>
                  onQuantityChange(
                    item.item_key,
                    item.quantity.value + 1
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory transition-colors hover:border-brand-primary hover:bg-brand-primary hover:text-white disabled:opacity-50"
                disabled={isLoading || isUpdating}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
