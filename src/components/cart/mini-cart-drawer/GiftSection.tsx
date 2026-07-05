"use client";

import { Gift } from "lucide-react";
import { getLocalizedProduct } from "@/contexts/FreeGiftContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { GiftSectionProps } from "./types";

export function GiftSection({ locale, currency, giftProgress, activeGifts }: GiftSectionProps) {
  const isRTL = locale === "ar";
  const { convertPrice } = useCurrency();
  const convertedAmountNeeded = Math.ceil(
    convertPrice(giftProgress.amountNeeded, giftProgress.amountNeededCurrency || currency)
  );

  return (
    <div className="bg-gradient-to-r from-brand-beige to-orange-50 border-b border-brand-primary">
      {giftProgress.hasNextGift && (
        <div className="p-3 border-b border-brand-primary bg-white/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-orange-400 flex-shrink-0">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-brand-primary">
                {isRTL 
                  ? `أضف ${convertedAmountNeeded} ${currency} للحصول على هدية مجانية!`
                  : `Add ${convertedAmountNeeded} ${currency} more to get a free gift!`
                }
              </p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-brand-beige rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-primary to-orange-500 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, (giftProgress.currentSubtotal / (giftProgress.nextGiftRule?.min_cart_value || 1)) * 100)}%` 
              }}
            />
          </div>
        </div>
      )}

      {activeGifts.length > 0 && (
        <div className="p-3">
          <p className="text-xs font-semibold text-brand-primary mb-2">
            {isRTL ? "هداياك المجانية:" : "Your free gifts:"}
          </p>
          <div className="space-y-1">
            {activeGifts.map((gift, index) => (
              <div key={index} className="flex items-center gap-2 bg-white/60 rounded px-2 py-1">
                <Gift className="h-3 w-3 text-brand-gold" />
                <span className="text-xs text-brand-primary flex-1">
                  {getLocalizedProduct(gift, locale)?.name || (isRTL ? "هدية مجانية" : "Free Gift")}
                </span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  {isRTL ? "مجاني" : "FREE"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
