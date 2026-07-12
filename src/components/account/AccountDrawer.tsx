"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Package, MapPin, Heart, Settings, LogOut, X, ChevronRight, Sparkles, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface AccountDrawerProps {
  locale: string;
  dictionary: {
    myAccount: string;
    orders: string;
    addresses: string;
    wishlist: string;
    settings: string;
    logout: string;
    welcome: string;
    login: string;
    register: string;
    notLoggedIn: string;
    profile?: string;
    more?: string;
  };
}

interface MenuItem {
  icon: typeof User;
  label: string;
  href: string;
}

function getUserInitial(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "S";
  return source.charAt(0).toUpperCase();
}

export function AccountDrawer({ locale, dictionary }: AccountDrawerProps) {
  const router = useRouter();
  const marketPrefix = useMarketPrefix();
  const { user, isAuthenticated, logout, googleLogin, isAccountDrawerOpen, setIsAccountDrawerOpen } = useAuth();
  const isRTL = locale === "ar";
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const onClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsAccountDrawerOpen(false);
  }, [setIsAccountDrawerOpen]);

  const handleGoogleSuccess = useCallback(async (credential: string) => {
    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      const response = await googleLogin(credential);
      if (response.success) {
        onClose();
        router.push(`${marketPrefix}/${locale}/account`);
        return;
      }

      setGoogleError(response.error?.message || (isRTL ? "فشل تسجيل الدخول بحساب جوجل" : "Google sign-in failed"));
    } catch {
      setGoogleError(isRTL ? "فشل تسجيل الدخول بحساب جوجل" : "Google sign-in failed");
    } finally {
      setIsGoogleLoading(false);
    }
  }, [googleLogin, isRTL, locale, marketPrefix, onClose, router]);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const menuItems: MenuItem[] = [
    {
      icon: User,
      label: dictionary.profile || "Profile",
      href: `${marketPrefix}/${locale}/account/profile`,
    },
    {
      icon: Package,
      label: dictionary.orders,
      href: `${marketPrefix}/${locale}/account/orders`,
    },
    {
      icon: MapPin,
      label: dictionary.addresses,
      href: `${marketPrefix}/${locale}/account/addresses`,
    },
    {
      icon: Heart,
      label: dictionary.wishlist,
      href: `${marketPrefix}/${locale}/account/wishlist`,
    },
    {
      icon: Settings,
      label: dictionary.settings,
      href: `${marketPrefix}/${locale}/account/settings`,
    },
  ];

  const renderAuthenticatedContent = () => {
    const displayName = user?.user_display_name || dictionary.myAccount;
    const initial = getUserInitial(user?.user_display_name, user?.user_email);

    return (
      <div className="flex min-h-full flex-col p-4">
        <section className="rounded-lg border border-brand-border/70 bg-gradient-to-br from-brand-primary to-brand-primary-dark p-4 text-white shadow-[0_18px_42px_rgba(20,15,10,0.18)]">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white text-xl font-bold text-brand-primary shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-white/65">{dictionary.welcome}</p>
              <p className="truncate text-lg font-bold leading-tight">{displayName}</p>
              <p className="truncate text-xs text-white/70">{user?.user_email}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/12 bg-white/10 px-3 py-2">
              <ShieldCheck className="mb-1 h-4 w-4 text-white" />
              <p className="text-[11px] font-semibold uppercase leading-tight text-white/75">Secure</p>
            </div>
            <div className="rounded-lg border border-white/12 bg-white/10 px-3 py-2">
              <Sparkles className="mb-1 h-4 w-4 text-white" />
              <p className="text-[11px] font-semibold uppercase leading-tight text-white/75">Member</p>
            </div>
          </div>
        </section>

        <nav className="mt-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="group flex items-center gap-3 rounded-lg border border-brand-border/70 bg-brand-ivory px-3.5 py-3 text-brand-primary shadow-[0_10px_24px_rgba(20,15,10,0.06)] transition-all hover:border-brand-primary/35 hover:bg-white active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-beige text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold">{item.label}</span>
              <ChevronRight className={`h-4 w-4 text-brand-muted ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.99]"
          >
            <LogOut className="h-4 w-4" />
            {dictionary.logout}
          </button>
        </div>
      </div>
    );
  };

  const renderGuestContent = () => (
    <div className="flex min-h-full flex-col p-4">
      <section className="rounded-2xl border border-brand-border/70 bg-brand-ivory p-5 shadow-[0_18px_44px_rgba(20,15,10,0.08)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary text-white shadow-[0_16px_36px_rgba(20,15,10,0.18)]">
            <User className="h-9 w-9" />
          </div>
          <h3 className="font-title text-2xl text-brand-primary">{dictionary.myAccount}</h3>
          <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-6 text-brand-muted">
            {isRTL
              ? "سجّل الدخول بسرعة عبر جوجل أو استخدم البريد الإلكتروني"
              : "Sign in quickly with Google or continue with email"}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-brand-border/70 bg-white p-3 shadow-[0_10px_24px_rgba(20,15,10,0.05)]">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={() => setGoogleError(isRTL ? "فشل تسجيل الدخول بحساب جوجل" : "Google sign-in failed")}
            text="signin_with"
            locale={locale}
          />
          {isGoogleLoading && (
            <p className="mt-3 text-center text-sm text-brand-muted">
              {isRTL ? "جاري تسجيل الدخول..." : "Signing you in..."}
            </p>
          )}
          {googleError && (
            <p className="mt-3 text-center text-sm font-medium text-red-600">
              {googleError}
            </p>
          )}
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-brand-border/70" />
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-brand-muted">
            {isRTL ? "أو" : "or"}
          </span>
          <div className="h-px flex-1 bg-brand-border/70" />
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href={`${marketPrefix}/${locale}/login`} onClick={onClose}>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {dictionary.login}
              </span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href={`${marketPrefix}/${locale}/register`} onClick={onClose}>
              {dictionary.register}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );

  return (
    <MuiDrawer
      anchor={isRTL ? "left" : "right"}
      open={isAccountDrawerOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "min(100vw, 390px)", sm: 380 },
          maxWidth: "100%",
          backgroundColor: "color-mix(in srgb, var(--color-ivory) 96%, white 4%)",
          color: "var(--color-primary)",
          borderLeft: isRTL ? "none" : "1px solid var(--color-border)",
          borderRight: isRTL ? "1px solid var(--color-border)" : "none",
          boxShadow: "0 24px 70px rgba(20,15,10,0.22)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-ivory)",
            px: 2,
            py: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: "999px",
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              <User className="h-4 w-4" />
            </Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: 17 }}>
              {dictionary.myAccount}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close drawer"
            sx={{ color: "var(--color-muted)" }}
          >
            <X className="h-5 w-5" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {isAuthenticated && user ? renderAuthenticatedContent() : renderGuestContent()}
        </Box>
      </Box>
    </MuiDrawer>
  );
}
