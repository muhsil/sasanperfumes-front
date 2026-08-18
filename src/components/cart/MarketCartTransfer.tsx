"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getMarketDefaultCurrency } from "@/config/market";
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
  const { setCurrency } = useCurrency();

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

      // Read the market straight off the path rather than from the hook or from
      // addToCart's own pathname sniffing: this runs immediately after a client
      // side navigation, and resolving against the wrong market hands back the
      // origin store's product IDs, which the destination cart then rejects.
      const market = (window.location.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
      const marketCode = ["qa", "om", "sa"].includes(market) ? market : "";
      const marketHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (marketCode) {
        marketHeaders["X-Market"] = marketCode;
        marketHeaders["X-Frontend-Host"] = `${window.location.hostname.replace(/^www\./, "")}/${marketCode}`;
      }

      // Move the display currency with the basket. The destination cart holds
      // that market's own prices, but the cart still reported the origin
      // currency, so the storefront converted an already-correct SAR price a
      // second time and showed 78.03 where the store charges 76.50.
      setCurrency(getMarketDefaultCurrency(marketCode || "intl"));

      let resolved: ResolvedItem[] = [];
      try {
        const res = await fetch("/api/cart/transfer-resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ market: marketCode, locale, items }),
        });
        const data = await res.json();
        resolved = Array.isArray(data?.resolved) ? data.resolved : [];
      } catch {
        resolved = [];
      }

      const attempted: ResolvedItem[] = [];
      for (const item of resolved) {
        if (!item.productId) continue;
        try {
          await fetch("/api/cart?action=add", {
            method: "POST",
            headers: marketHeaders,
            body: JSON.stringify({ id: String(item.productId), quantity: String(item.qty) }),
          });
          attempted.push(item);
        } catch {
          // Fall through: the verification pass below decides what actually landed.
        }
      }

      // Count what the destination cart really holds rather than trusting the
      // add responses, so the customer is never told an item moved when it did not.
      let landed = new Set<number>();
      try {
        const cartRes = await fetch("/api/cart", { headers: marketHeaders });
        const cartData = await cartRes.json();
        const cartItems = (cartData?.cart?.items || cartData?.items || []) as Array<Record<string, unknown>>;
        landed = new Set(cartItems.map((entry) => Number(entry.id)).filter((id) => Number.isFinite(id)));
      } catch {
        landed = new Set(attempted.map((entry) => entry.productId as number));
      }

      const carried = attempted.filter((entry) => landed.has(entry.productId as number));
      const missed = resolved.filter(
        (entry) => !entry.productId || !landed.has(entry.productId as number)
      );

      setAddedCount(carried.length);
      setUnavailable(missed);
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
