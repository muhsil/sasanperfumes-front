"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Star, ArrowLeft, Gift, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/Button";

interface LoyaltySettings {
  enabled: boolean;
  points_per_aed: number;
  aed_per_point?: number;
  min_redeem_points?: number;
  label_en: string;
  label_ar: string;
}

interface LoyaltyBalance {
  points: number;
  value_aed: number;
  can_redeem: boolean;
}

interface LoyaltyHistoryItem {
  date: string;
  description: string;
  points: number;
  type: string;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [history, setHistory] = useState<LoyaltyHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isRTL = locale === "ar";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/login`);
    }
  }, [isLoading, isAuthenticated, locale, router]);

  useEffect(() => {
    fetch("/api/loyalty?action=settings")
      .then((r) => r.json())
      .then((d: LoyaltySettings) => setSettings(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (settings && !settings.enabled) {
      router.replace(`/${locale}/account`);
    }
  }, [settings, locale, router]);

  useEffect(() => {
    if (!isAuthenticated || !user?.token || !user?.user_id) return;

    const fetchData = async () => {
      try {
        const [balRes, histRes] = await Promise.all([
          fetch(`/api/loyalty?customer_id=${user.user_id}`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`/api/loyalty?action=history&customer_id=${user.user_id}`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);
        if (balRes.ok) {
          const d = await balRes.json();
          setBalance(d);
        }
        if (histRes.ok) {
          const h = await histRes.json();
          if (Array.isArray(h)) setHistory(h);
        }
      } catch {
        // non-fatal
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user]);

  const t = {
    title: isRTL ? "نقاط الولاء" : "Loyalty Points",
    back: isRTL ? "حسابي" : "My Account",
    balance: isRTL ? "رصيدك" : "Your Balance",
    points: isRTL ? "نقطة" : "points",
    earnRate: isRTL ? "معدل الكسب" : "Earn Rate",
    perAed: isRTL ? "نقطة لكل درهم" : "point(s) per AED spent",
    redeemValue: isRTL ? "قيمة الاسترداد" : "Redemption Value",
    perPoint: isRTL ? "درهم لكل نقطة" : "AED per point",
    minRedeem: isRTL ? "الحد الأدنى للاسترداد" : "Minimum to Redeem",
    history: isRTL ? "سجل النقاط" : "Points History",
    noHistory: isRTL ? "لا يوجد سجل بعد" : "No history yet",
    signIn: isRTL ? "سجل دخولك لعرض نقاط الولاء" : "Sign in to view your loyalty points",
    notEnabled: isRTL ? "برنامج الولاء غير مفعل حالياً" : "Loyalty program is not currently active",
    loading: isRTL ? "جارٍ التحميل..." : "Loading...",
    shopNow: isRTL ? "تسوق الآن لكسب النقاط" : "Shop now to start earning points",
  };

  if (isLoading || loadingData) {
    return (
      <div className="container mx-auto max-w-3xl px-5 md:px-7 lg:px-12 py-12 text-center">
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-3xl px-5 md:px-7 lg:px-12 py-16 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mb-6 text-gray-500">{t.signIn}</p>
        <Button asChild>
          <Link href={`/${locale}/login`}>
            {isRTL ? "تسجيل الدخول" : "Sign In"}
          </Link>
        </Button>
      </div>
    );
  }

  if (settings && !settings.enabled) {
    return null;
  }

  const label = isRTL ? (settings?.label_ar || t.title) : (settings?.label_en || t.title);

  return (
    <div className="container mx-auto max-w-3xl px-5 md:px-7 lg:px-12 py-6" dir={isRTL ? "rtl" : "ltr"}>
      <Link
        href={`/${locale}/account`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
        {t.back}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">{label}</h1>

      {/* Balance Card */}
      <div className="mb-6 rounded-lg border border-brand-primary/20 bg-gradient-to-r from-brand-primary/5 to-brand-primary/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Star className="h-8 w-8 text-brand-primary" fill="currentColor" />
          <div>
            <p className="text-sm text-gray-600">{t.balance}</p>
            <p className="text-3xl font-bold text-brand-primary">
              {balance?.points?.toLocaleString() ?? 0}
              <span className="ml-1 text-sm font-normal text-gray-500">{t.points}</span>
            </p>
          </div>
        </div>

        {balance && balance.value_aed > 0 && (
          <p className="text-sm text-gray-600">
            ≈ {balance.value_aed.toFixed(2)} AED
          </p>
        )}
      </div>

      {/* How It Works */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <TrendingUp className="mb-2 h-5 w-5 text-brand-primary" />
          <p className="text-sm font-medium text-gray-900">{t.earnRate}</p>
          <p className="text-xs text-gray-500">{settings?.points_per_aed ?? 1} {t.perAed}</p>
        </div>
        {settings?.aed_per_point && (
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <Gift className="mb-2 h-5 w-5 text-brand-primary" />
            <p className="text-sm font-medium text-gray-900">{t.redeemValue}</p>
            <p className="text-xs text-gray-500">{settings.aed_per_point} {t.perPoint}</p>
          </div>
        )}
        {settings?.min_redeem_points && (
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <Clock className="mb-2 h-5 w-5 text-brand-primary" />
            <p className="text-sm font-medium text-gray-900">{t.minRedeem}</p>
            <p className="text-xs text-gray-500">{settings.min_redeem_points} {t.points}</p>
          </div>
        )}
      </div>

      {/* History */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{t.history}</h2>
      {history.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">{t.noHistory}</p>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link href={`/${locale}/shop`}>{t.shopNow}</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
          {history.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                <p className="text-xs text-gray-500">{item.date}</p>
              </div>
              <span className={`text-sm font-semibold ${item.points > 0 ? "text-green-600" : "text-red-600"}`}>
                {item.points > 0 ? "+" : ""}{item.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
