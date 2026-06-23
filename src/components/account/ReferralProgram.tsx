"use client";

import { useState, useEffect } from "react";
import { Users, Copy, Check, Share2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Locale } from "@/config/site";

interface ReferralInfo { referral_code: string; referral_url: string; referral_count: number; }
interface ReferralSettings { enabled: boolean; referrer_discount: number; referee_discount: number; title_en: string; title_ar: string; desc_en: string; desc_ar: string; }

interface ReferralProgramProps { locale?: Locale; customerId?: number; }

export function ReferralProgram({ locale = "en", customerId }: ReferralProgramProps) {
  const { user: authUser } = useAuth();
  const token = authUser?.token;
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [copied, setCopied] = useState(false);
  const isAr = locale === "ar";

  useEffect(() => {
    fetch("/api/referral?action=settings").then((r) => r.json()).then(setSettings).catch(() => {});
    if (customerId && token) {
      fetch(`/api/referral?customer_id=${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()).then(setInfo).catch(() => {});
    }
  }, [customerId, token]);

  const copyLink = async () => {
    if (!info?.referral_url) return;
    await navigator.clipboard.writeText(info.referral_url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!info) return;
    const text = isAr
      ? `استخدم كودي ${info.referral_code} واحصل على خصم في عنبر!`
      : `Use my code ${info.referral_code} to get a discount at Sasan Perfumes!`;
    if (navigator.share) {
      await navigator.share({ title: "Sasan Perfumes Referral", text, url: info.referral_url });
    } else {
      copyLink();
    }
  };

  if (!settings?.enabled) return null;

  const title = isAr ? settings.title_ar : settings.title_en;
  const desc  = isAr ? settings.desc_ar  : settings.desc_en;

  return (
    <div className="rounded-lg border border-brand-border/70 bg-brand-ivory p-5 shadow-[0_18px_44px_rgba(20,15,10,0.08)] md:p-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-border/70 bg-white">
          <Users className="h-5 w-5 text-brand-primary" />
        </div>
        <div>
          <h3 className="font-bold text-brand-primary">{title}</h3>
          <p className="text-xs text-brand-muted">{desc}</p>
        </div>
      </div>

      {/* Rewards info */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-brand-border/70 bg-white p-3 text-center">
          <p className="text-lg font-bold text-brand-primary">AED {settings.referrer_discount}</p>
          <p className="text-xs text-gray-500">{isAr ? "مكافأتك" : "Your reward"}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-lg font-bold text-green-600">AED {settings.referee_discount}</p>
          <p className="text-xs text-gray-500">{isAr ? "مكافأة صديقك" : "Friend's discount"}</p>
        </div>
      </div>

      {!info ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-muted" />
        </div>
      ) : (
        <>
          {/* Referral count */}
          <p className="mb-3 text-sm text-brand-muted">
            {isAr
              ? `لقد أحلت ${info.referral_count} شخصاً حتى الآن`
              : `You've referred ${info.referral_count} ${info.referral_count === 1 ? "person" : "people"} so far`}
          </p>

          {/* Referral URL */}
          <div className="mb-3 rounded-lg border border-brand-border/70 bg-white px-3 py-2">
            <p className="mb-1 text-[10px] uppercase text-gray-400">{isAr ? "رابطك" : "Your Link"}</p>
            <p className="truncate text-xs font-medium text-gray-700">{info.referral_url}</p>
          </div>

          {/* Code */}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-brand-primary/35 bg-brand-beige/45 px-4 py-3">
            <div className="flex-1">
              <p className="text-[10px] uppercase text-gray-400">{isAr ? "كودك" : "Your Code"}</p>
              <p className="font-mono text-xl font-bold text-brand-primary">{info.referral_code}</p>
            </div>
            <button onClick={copyLink} className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-2 text-xs font-medium text-white hover:bg-brand-primary-dark">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? (isAr ? "تم" : "Copied!") : (isAr ? "نسخ" : "Copy")}
            </button>
          </div>

          {/* Share button */}
          <button
            onClick={share}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-brand-primary/45 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-beige"
          >
            <Share2 className="h-4 w-4" />
            {isAr ? "مشاركة الكود" : "Share Your Code"}
          </button>
        </>
      )}
    </div>
  );
}
