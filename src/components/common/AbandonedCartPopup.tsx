"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { X, Copy, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { Locale } from "@/config/site";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface AbandonedSettings {
  enabled: boolean; idle_minutes: number;
  title_en: string; title_ar: string; body_en: string; body_ar: string;
  coupon_code: string; btn_text_en: string; btn_text_ar: string;
}

const SESSION_KEY = "sasanperfumes_ab_popup_shown";

export function AbandonedCartPopup({ locale }: { locale: Locale }) {
  const marketPrefix = useMarketPrefix();
  const { cart } = useCart();
  const [settings, setSettings] = useState<AbandonedSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAr = locale === "ar";

  useEffect(() => {
    fetch("/api/abandoned-cart-popup")
      .then((r) => r.json())
      .then((d: AbandonedSettings) => { if (d?.enabled) setSettings(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings || !cart || cart.item_count === 0) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!sessionStorage.getItem(SESSION_KEY)) {
          setOpen(true);
          sessionStorage.setItem(SESSION_KEY, "1");
        }
      }, (settings.idle_minutes || 5) * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [settings, cart]);

  const copyCoupon = async () => {
    if (!settings?.coupon_code) return;
    await navigator.clipboard.writeText(settings.coupon_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open || !settings) return null;

  const title = isAr ? settings.title_ar : settings.title_en;
  const body  = isAr ? settings.body_ar  : settings.body_en;
  const btn   = isAr ? settings.btn_text_ar : settings.btn_text_en;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" dir={isAr ? "rtl" : "ltr"}>
        <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10">
            <ShoppingBag className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">
              {cart?.item_count} {isAr ? "منتج في سلتك" : "items in your cart"}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600">{body}</p>

        {settings.coupon_code && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 px-3 py-2">
            <span className="flex-1 font-mono font-bold tracking-wider text-brand-primary">{settings.coupon_code}</span>
            <button onClick={copyCoupon} className="flex items-center gap-1 rounded bg-brand-primary px-2 py-1 text-xs text-white hover:bg-brand-primary-dark">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        )}

        <Link
          href={`${marketPrefix}/${locale}/checkout`}
          onClick={() => setOpen(false)}
          className="block w-full rounded-xl bg-brand-primary py-3 text-center text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors"
        >
          {btn}
        </Link>
      </div>
    </div>
  );
}
