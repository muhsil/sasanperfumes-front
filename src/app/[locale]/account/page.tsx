"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Package, MapPin, Heart, Settings, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/Button";
import { LoyaltyDashboard } from "@/components/account/LoyaltyDashboard";
import { ReferralProgram } from "@/components/account/ReferralProgram";

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

export default function AccountPage({ params }: AccountPageProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [locale, setLocale] = useState<string>("en");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/login`);
    }
  }, [isLoading, isAuthenticated, locale, router]);

  const isRTL = locale === "ar";

  const t = {
    en: {
      myAccount: "My Account",
      welcome: "Welcome back",
      orders: "My Orders",
      ordersDesc: "View and track your orders",
      addresses: "Addresses",
      addressesDesc: "Manage your delivery addresses",
      wishlist: "Wishlist",
      wishlistDesc: "View your saved items",
      settings: "Account Settings",
      settingsDesc: "Update your profile and preferences",
      logout: "Logout",
      logoutDesc: "Sign out of your account",
      memberSince: "Member since",
      loading: "Loading...",
    },
    ar: {
      myAccount: "حسابي",
      welcome: "مرحباً بعودتك",
      orders: "طلباتي",
      ordersDesc: "عرض وتتبع طلباتك",
      addresses: "العناوين",
      addressesDesc: "إدارة عناوين التوصيل",
      wishlist: "قائمة الرغبات",
      wishlistDesc: "عرض المنتجات المحفوظة",
      settings: "إعدادات الحساب",
      settingsDesc: "تحديث ملفك الشخصي والتفضيلات",
      logout: "تسجيل الخروج",
      logoutDesc: "الخروج من حسابك",
      memberSince: "عضو منذ",
      loading: "جاري التحميل...",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

  const menuItems = [
    {
      icon: Package,
      label: texts.orders,
      description: texts.ordersDesc,
      href: `/${locale}/account/orders`,
    },
    {
      icon: MapPin,
      label: texts.addresses,
      description: texts.addressesDesc,
      href: `/${locale}/account/addresses`,
    },
    {
      icon: Heart,
      label: texts.wishlist,
      description: texts.wishlistDesc,
      href: `/${locale}/account/wishlist`,
    },
    {
      icon: Settings,
      label: texts.settings,
      description: texts.settingsDesc,
      href: `/${locale}/account/settings`,
    },
  ];

  const handleLogout = () => {
    logout();
    router.push(`/${locale}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary"></div>
          <p className="text-brand-muted">{texts.loading}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="account-shell min-h-screen bg-transparent py-5 md:py-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4">
        <h1 className="mb-5 border-b border-brand-border/70 pb-4 text-2xl font-semibold leading-tight text-brand-primary md:mb-7 md:text-3xl">
          {texts.myAccount}
        </h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-brand-border/70 bg-brand-ivory p-5 shadow-[0_18px_44px_rgba(20,15,10,0.08)] md:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-brand-border/70 bg-white">
                  <User className="h-7 w-7 text-brand-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-muted">{texts.welcome}</p>
                  <h2 className="truncate text-lg font-semibold text-brand-primary">
                    {user.user_display_name}
                  </h2>
                  <p className="truncate text-sm text-brand-muted">{user.user_email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <LoyaltyDashboard locale={locale as "en" | "ar"} customerId={user?.user_id ? parseInt(String(user.user_id)) : undefined} />

            <ReferralProgram locale={locale as "en" | "ar"} customerId={user?.user_id ? parseInt(String(user.user_id)) : undefined} />

            <div className="overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-[0_18px_44px_rgba(20,15,10,0.08)]">
              <nav>
                <ul className="divide-y divide-brand-border/70">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between p-4 transition-colors hover:bg-brand-beige/55"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-border/70 bg-white text-brand-primary">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-brand-primary">
                              {item.label}
                            </h3>
                            <p className="text-sm text-brand-muted">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 text-brand-muted ${
                            isRTL ? "rotate-180" : ""
                          }`}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-brand-border/70 p-4">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full justify-center gap-2 rounded-md text-red-600 hover:translate-y-0 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-5 w-5" />
                  {texts.logout}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
