"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User, Package, MapPin, Heart, Settings, LogOut, X, ChevronRight, Globe, ChevronDown, Check, Coins } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Button } from "@/components/common/Button";
import { localeConfig, type Locale, type Currency } from "@/config/site";
import { getPathWithoutLocale, cn } from "@/lib/utils";

const currencyCountryCodes: Record<string, string> = {
  AED: "ae",
  SAR: "sa",
  QAR: "qa",
  KWD: "kw",
  BHD: "bh",
  OMR: "om",
  USD: "us",
  EUR: "eu",
  GBP: "gb",
  INR: "in",
  PKR: "pk",
  EGP: "eg",
  JOD: "jo",
  LBP: "lb",
  IQD: "iq",
  YER: "ye",
  SYP: "sy",
  TRY: "tr",
  MAD: "ma",
  TND: "tn",
  DZD: "dz",
  LYD: "ly",
  SDG: "sd",
};

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

export function AccountDrawer({
  locale,
  dictionary,
}: AccountDrawerProps) {
  const { user, isAuthenticated, logout, isAccountDrawerOpen, setIsAccountDrawerOpen } = useAuth();
  const { currency, setCurrency, currencies } = useCurrency();
  const pathname = usePathname();
  const isRTL = locale === "ar";
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  const currentCurrency = currencies.find((c) => c.code === currency);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsAccountDrawerOpen(false);
  }, [setIsAccountDrawerOpen]);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleCurrencyChange = (code: Currency) => {
    setCurrency(code);
    setIsCurrencyDropdownOpen(false);
  };

  const alternateLocale: Locale = locale === "en" ? "ar" : "en";
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const alternateHref = `/${alternateLocale}${pathWithoutLocale}`;
  
  // Hide settings section (language/currency switchers) on cart and checkout pages
  const hideSettingsSection = pathname?.includes("/cart") || pathname?.includes("/checkout");

  const menuItems: MenuItem[] = [
    {
      icon: User,
      label: dictionary.profile || "Profile",
      href: `/${locale}/account/profile`,
    },
    {
      icon: Package,
      label: dictionary.orders,
      href: `/${locale}/account/orders`,
    },
    {
      icon: MapPin,
      label: dictionary.addresses,
      href: `/${locale}/account/addresses`,
    },
    {
      icon: Heart,
      label: dictionary.wishlist,
      href: `/${locale}/account/wishlist`,
    },
    {
      icon: Settings,
      label: dictionary.settings,
      href: `/${locale}/account`,
    },
  ];

  const renderAuthenticatedContent = () => (
    <>
      <div className="border-b border-brand-border/70 bg-brand-beige/45 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory shadow-[0_12px_28px_rgba(20,15,10,0.08)]">
            <User className="h-8 w-8 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-brand-muted">{dictionary.welcome}</p>
            <p className="truncate font-title text-xl text-brand-primary">
              {user?.user_display_name}
            </p>
            <p className="truncate text-sm text-brand-muted">{user?.user_email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.slice(0, 3).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-full px-4 py-3 text-brand-primary transition-all hover:bg-brand-beige active:scale-[0.98]"
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-brand-border/70 p-4">
        <Link
          href={`/${locale}/account`}
          onClick={onClose}
          className="flex w-full items-center justify-between rounded-full px-4 py-3 text-brand-primary transition-all hover:bg-brand-beige active:scale-[0.98]"
        >
          <span className="font-medium">{dictionary.more || "More"}</span>
          <ChevronRight className={`h-5 w-5 flex-shrink-0 ${isRTL ? "rotate-180" : ""}`} />
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-red-600 transition-all hover:bg-red-50 active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{dictionary.logout}</span>
        </button>
      </div>
    </>
  );

  const renderGuestContent = () => (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-brand-border/70 bg-brand-beige shadow-[0_12px_28px_rgba(20,15,10,0.08)]">
        <User className="h-12 w-12 text-brand-primary" />
      </div>
      <h3 className="mb-2 font-title text-2xl text-brand-primary">
        {dictionary.myAccount}
      </h3>
      <p className="mb-8 text-brand-muted">{dictionary.notLoggedIn}</p>
      <div className="flex w-full flex-col gap-3">
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href={`/${locale}/login`} onClick={onClose}>
            {dictionary.login}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={`/${locale}/register`} onClick={onClose}>
            {dictionary.register}
          </Link>
        </Button>
      </div>
    </div>
  );


  const renderSettingsSection = () => (
    <div className="border-t border-brand-border/70 bg-brand-beige/30">
      {/* Language Switcher Row */}
      <Link
        href={alternateHref}
        onClick={onClose}
        className="flex items-center justify-between border-b border-brand-border/60 px-5 py-4 transition-colors hover:bg-brand-beige"
        hrefLang={localeConfig[alternateLocale].hrefLang}
      >
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-brand-muted" />
          <span className="text-sm font-semibold text-brand-primary">
            {locale === "en" ? "Language" : "اللغة"}
          </span>
        </div>
        <span className="rounded-full border border-brand-border/70 bg-brand-ivory px-3 py-1.5 text-sm font-semibold text-brand-primary">
          {localeConfig[alternateLocale].name}
        </span>
      </Link>

      {/* Currency Switcher Row */}
      <div ref={currencyDropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
          className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-brand-beige"
        >
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-brand-muted" />
            <span className="text-sm font-semibold text-brand-primary">
              {locale === "en" ? "Currency" : "العملة"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-brand-border/70 bg-brand-ivory px-3 py-1.5 text-sm font-semibold text-brand-primary">
              {currentCurrency?.symbol} {currentCurrency?.code}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-brand-muted transition-transform", isCurrencyDropdownOpen && "rotate-180")} />
          </div>
        </button>

        {isCurrencyDropdownOpen && (
          <div className="border-t border-brand-border/60 bg-brand-ivory">
            <div className="border-b border-brand-border/60 px-5 py-3">
              <p className="text-xs font-semibold uppercase text-brand-muted">
                {locale === "en" ? "Select Currency" : "اختر العملة"}
              </p>
            </div>
            <ul role="listbox" className="max-h-[240px] overflow-y-auto">
              {currencies.map((curr) => (
                <li key={curr.code}>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange(curr.code as Currency)}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-brand-beige",
                      currency === curr.code && "bg-brand-beige"
                    )}
                    role="option"
                    aria-selected={currency === curr.code}
                  >
                    <span className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border",
                      currency === curr.code 
                        ? "border-brand-primary ring-2 ring-brand-primary" 
                        : "border-brand-border/70"
                    )}>
                      <Image
                        src={`https://flagcdn.com/w40/${currencyCountryCodes[curr.code] || "un"}.png`}
                        alt={curr.code}
                        width={32}
                        height={24}
                        className="object-cover"
                        unoptimized
                      />
                    </span>
                    <div className="flex flex-1 flex-col items-start">
                      <span className={cn(
                        "font-medium",
                        currency === curr.code ? "text-brand-primary" : "text-brand-primary"
                      )}>
                        {curr.code}
                      </span>
                      <span className="text-xs text-brand-muted">{curr.label.replace(` (${curr.code})`, "")}</span>
                    </div>
                    {currency === curr.code && (
                      <Check className="h-4 w-4 text-brand-primary" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

    return (
      <MuiDrawer
        anchor={isRTL ? "left" : "right"}
        open={isAccountDrawerOpen}
        onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 320 },
          maxWidth: "100%",
          backgroundColor: "var(--color-ivory)",
          color: "var(--color-primary)",
          borderLeft: isRTL ? "none" : "1px solid var(--color-border)",
          borderRight: isRTL ? "1px solid var(--color-border)" : "none",
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
            backgroundColor: "color-mix(in srgb, var(--color-beige) 55%, white 45%)",
            px: 2,
            py: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <User className="h-5 w-5" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {dictionary.myAccount}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close drawer"
            sx={{ color: "text.secondary" }}
          >
            <X className="h-5 w-5" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div className="flex flex-1 flex-col">
            {isAuthenticated && user
              ? renderAuthenticatedContent()
              : renderGuestContent()}
          </div>
          {!hideSettingsSection && renderSettingsSection()}
        </Box>
      </Box>
    </MuiDrawer>
  );
}
