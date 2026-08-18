"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { addToCart } from "@/lib/api/cocart";
import { useCart } from "@/contexts/CartContext";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import type { Locale } from "@/config/site";

interface TransferItem {
  slug: string;
  sku?: string;
  qty: number;
}

interface ResolvedItem {
  slug: string;
  sku: string | null;
  qty: number;
  productId: number | null;
  name: string | null;
}

function decodeTransfer(value: string): TransferItem[] {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const COPY = {
  en: {
    moving: "Rebuilding your basket for this store...",
    movedTitle: "Your basket has moved",
    movedBody: (count: number) =>
      `${count} ${count === 1 ? "item" : "items"} moved to this store, priced for your country.`,
    missingTitle: "Not available in your country",
    missingBody: "These items are not stocked in this store, so they were not carried over:",
    dismiss: "Got it",
  },
  ar: {
    moving: "جارٍ إعادة تجهيز سلتك لهذا المتجر...",
    movedTitle: "تم نقل سلتك",
    movedBody: (count: number) => `تم نقل ${count} من المنتجات إلى هذا المتجر بأسعار بلدك.`,
    missingTitle: "غير متوفر في بلدك",
    missingBody: "هذه المنتجات غير متوفرة في هذا المتجر، لذلك لم يتم نقلها:",
    dismiss: "حسناً",
  },
} as const;

// Receives a basket handed over from another market's store. A cart belongs to
// the blog it was created on, so the items arrive as slugs and are re-resolved
// against this market's catalogue before being added.
export function MarketCartTransfer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const marketPrefix = useMarketPrefix();
  const { refreshCart } = useCart();

  const locale: Locale = (params?.locale as string) === "ar" ? "ar" : "en";
  const copy = COPY[locale];

  const startedRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [addedCount, setAddedCount] = useState(0);
  const [unavailable, setUnavailable] = useState<ResolvedItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const transfer = searchParams.get("transfer");
    if (!transfer || startedRef.current) return;
    startedRef.current = true;

    const items = decodeTransfer(transfer);
    if (items.length === 0) return;

    const run = async () => {
      setStatus("working");
      const market = marketPrefix.replace(/^\//, "").toLowerCase();

      let resolved: ResolvedItem[] = [];
      try {
        const res = await fetch("/api/cart/transfer-resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ market, locale, items }),
        });
        const data = await res.json();
        resolved = Array.isArray(data?.resolved) ? data.resolved : [];
      } catch {
        resolved = [];
      }

      let added = 0;
      for (const item of resolved) {
        if (!item.productId) continue;
        try {
          const result = await addToCart(item.productId, item.qty);
          if (result?.success !== false) added += 1;
        } catch {
          // Report it as unavailable rather than failing the whole handover.
        }
      }

      setAddedCount(added);
      setUnavailable(resolved.filter((entry) => !entry.productId));
      await refreshCart();
      setStatus("done");

      // Drop the payload so a refresh cannot add the same basket twice.
      const next = new URLSearchParams(searchParams.toString());
      next.delete("transfer");
      const query = next.toString();
      router.replace(`${marketPrefix}/${locale}/cart${query ? `?${query}` : ""}`);
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (status === "idle" || dismissed) return null;

  if (status === "working") {
    return (
      <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        {copy.moving}
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {addedCount > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">{copy.movedTitle}</p>
          <p>{copy.movedBody(addedCount)}</p>
        </div>
      )}
      {unavailable.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{copy.missingTitle}</p>
          <p>{copy.missingBody}</p>
          <ul className="mt-1 list-inside list-disc">
            {unavailable.map((item) => (
              <li key={item.slug}>{item.name || item.slug}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-xs text-neutral-500 underline"
      >
        {copy.dismiss}
      </button>
    </div>
  );
}
