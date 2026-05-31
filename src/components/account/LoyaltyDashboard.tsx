"use client";

import { useState, useEffect } from "react";
import { Star, Gift, Loader2, Check, Copy, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Locale } from "@/config/site";

interface LoyaltyBalance { points: number; value_aed: number; can_redeem: boolean; min_to_redeem: number; }
interface LoyaltySettings { enabled: boolean; points_per_aed: number; aed_per_point: number; min_redeem_points: number; label_en: string; label_ar: string; }
interface LoyaltyHistoryEntry { type: "earn" | "redeem"; points: number; note: string; date: string; }

interface LoyaltyDashboardProps { locale?: Locale; customerId?: number; }

export function LoyaltyDashboard({ locale = "en", customerId }: LoyaltyDashboardProps) {
  const { user: authUser } = useAuth();
  const token = authUser?.token;
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [history, setHistory] = useState<LoyaltyHistoryEntry[]>([]);
  const [redeeming, setRedeeming] = useState(false);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const isAr = locale === "ar";

  useEffect(() => {
    fetch("/api/loyalty?action=settings").then((r) => r.json()).then(setSettings).catch(() => {});
    if (customerId && token) {
      const authHeaders = { Authorization: `Bearer ${token}` };
      fetch(`/api/loyalty?customer_id=${customerId}`, { headers: authHeaders })
        .then((r) => r.json()).then(setBalance).catch(() => {});
      fetch(`/api/loyalty?action=history&customer_id=${customerId}`, { headers: authHeaders })
        .then((r) => r.json()).then((d) => { if (Array.isArray(d)) setHistory(d); }).catch(() => {});
    }
  }, [customerId, token]);

  const redeem = async () => {
    if (!balance || !token) return;
    setRedeeming(true); setError("");
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId, points: balance.points }),
      });
      const data = await res.json();
      if (data.success) {
        setCoupon(data.coupon_code);
        setBalance((prev) => prev ? { ...prev, points: data.points_left, value_aed: data.points_left * (settings?.aed_per_point || 0.05), can_redeem: false } : null);
      } else {
        setError(data.message || (isAr ? "حدث خطأ" : "Something went wrong"));
      }
    } catch { setError(isAr ? "خطأ في الشبكة" : "Network error"); }
    setRedeeming(false);
  };

  const copyCoupon = async () => {
    if (!coupon) return;
    await navigator.clipboard.writeText(coupon);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!settings?.enabled) return null;

  const programName = isAr ? settings.label_ar : settings.label_en;

  return (
    <div className="rounded-lg border border-brand-border/70 bg-brand-ivory p-5 shadow-[0_18px_44px_rgba(20,15,10,0.08)] md:p-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-border/70 bg-white">
          <Star className="h-5 w-5 text-brand-primary" />
        </div>
        <div>
          <h3 className="font-bold text-brand-primary">{programName}</h3>
          <p className="text-xs text-brand-muted">
            {isAr
              ? `اكسب ${settings.points_per_aed} نقطة لكل درهم`
              : `Earn ${settings.points_per_aed} point per AED spent`}
          </p>
        </div>
      </div>

      {!balance ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-muted" />
        </div>
      ) : (
        <>
          {/* Points display */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-brand-border/70 bg-white p-3 text-center md:p-4">
              <p className="text-2xl font-bold text-brand-primary">{balance.points.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{isAr ? "نقاطك" : "Your Points"}</p>
            </div>
            <div className="rounded-lg border border-brand-border/70 bg-white p-3 text-center md:p-4">
              <p className="text-2xl font-bold text-green-600">AED {balance.value_aed.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{isAr ? "القيمة" : "Value"}</p>
            </div>
          </div>

          {/* Progress to min redemption */}
          {!balance.can_redeem && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-brand-muted">
                <span>{isAr ? "التقدم نحو الاسترداد" : "Progress to redemption"}</span>
                <span>{balance.points}/{balance.min_to_redeem}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-brand-beige">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${Math.min(100, (balance.points / balance.min_to_redeem) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {isAr
                  ? `تحتاج ${balance.min_to_redeem - balance.points} نقطة إضافية للاسترداد`
                  : `${balance.min_to_redeem - balance.points} more points needed to redeem`}
              </p>
            </div>
          )}

          {/* Coupon reveal */}
          {coupon ? (
            <div className="rounded-lg border border-dashed border-brand-primary/35 bg-brand-beige/45 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                {isAr ? "كود الخصم الخاص بك:" : "Your discount coupon:"}
              </p>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-lg font-bold text-brand-primary">{coupon}</span>
                <button onClick={copyCoupon} className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? (isAr ? "تم" : "Copied!") : (isAr ? "نسخ" : "Copy")}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">{isAr ? "صالح لمدة 30 يوماً" : "Valid for 30 days"}</p>
            </div>
          ) : balance.can_redeem ? (
            <button
              onClick={redeem} disabled={redeeming}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-60"
            >
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              {isAr ? `استرد ${balance.points} نقطة (AED ${balance.value_aed.toFixed(2)})` : `Redeem ${balance.points} points (AED ${balance.value_aed.toFixed(2)})`}
            </button>
          ) : null}

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          {/* Transaction history */}
          {history.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-xs font-semibold uppercase text-gray-400">
                {isAr ? "سجل المعاملات" : "Transaction History"}
              </h4>
              <div className="space-y-2">
                {history.slice(0, 10).map((entry, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-white p-2.5 text-xs shadow-sm">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${entry.points >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {entry.points >= 0
                        ? <TrendingUp className="h-3.5 w-3.5" />
                        : <TrendingDown className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 truncate">{entry.note}</p>
                      <p className="text-gray-400">{entry.date?.slice(0, 10)}</p>
                    </div>
                    <span className={`shrink-0 font-semibold ${entry.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {entry.points >= 0 ? "+" : ""}{entry.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
