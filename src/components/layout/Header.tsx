"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { Menu, X, ShoppingBag, User, Heart, Search } from "lucide-react";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/common/CurrencySwitcher";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Dictionary } from "@/i18n";
import { siteConfig, type Locale } from "@/config/site";
import type { SiteSettings, WPMenuItem } from "@/types/wordpress";
import type { HeaderSettings, TopbarSettings } from "@/lib/api/wordpress";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CategoriesDrawer } from "@/components/layout/CategoriesDrawer";
import { DesktopSearchDropdown } from "@/components/layout/DesktopSearchDropdown";
import { BrandsMegaMenu } from "@/components/layout/BrandsMegaMenu";
import { getHeaderCategoryLinks, getDynamicNavigationItems } from "@/config/menu";

interface HeaderProps {
  locale: Locale;
  dictionary: Dictionary;
  siteSettings?: SiteSettings | null;
  headerSettings?: HeaderSettings | null;
  menuItems?: WPMenuItem[] | null;
  mobileMenuItems?: WPMenuItem[] | null;
  categoriesDrawerMenuItems?: WPMenuItem[] | null;
  topbarSettings?: TopbarSettings | null;
}

export function Header({ locale, dictionary, siteSettings, headerSettings, menuItems, mobileMenuItems, categoriesDrawerMenuItems, topbarSettings }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isBrandsMegaMenuOpen, setIsBrandsMegaMenuOpen] = useState(false);
  const [topbarDismissed, setTopbarDismissed] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const brandsMegaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRTL = locale === "ar";
  const pathname = usePathname();

  useEffect(() => {
    const id = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsBrandsMegaMenuOpen(false);
    }, 0);
    return () => clearTimeout(id);
  }, [pathname]);

  // Track scroll for sticky header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const { cartItemsCount, setIsCartOpen } = useCart();
  const { setIsAccountDrawerOpen } = useAuth();
  const { wishlistItemsCount } = useWishlist();

  const handleBrandsMouseEnter = useCallback(() => {
    if (brandsMegaMenuTimeoutRef.current) clearTimeout(brandsMegaMenuTimeoutRef.current);
    setIsBrandsMegaMenuOpen(true);
  }, []);

  const handleBrandsMouseLeave = useCallback(() => {
    brandsMegaMenuTimeoutRef.current = setTimeout(() => setIsBrandsMegaMenuOpen(false), 150);
  }, []);

  const handleBrandsMegaMenuMouseEnter = useCallback(() => {
    if (brandsMegaMenuTimeoutRef.current) clearTimeout(brandsMegaMenuTimeoutRef.current);
  }, []);

  const handleBrandsMegaMenuClose = useCallback(() => {
    setIsBrandsMegaMenuOpen(false);
  }, []);

  const navigation = menuItems && menuItems.length > 0
    ? getDynamicNavigationItems(menuItems, locale)
    : getHeaderCategoryLinks(locale);

  const mobileNavigation = mobileMenuItems && mobileMenuItems.length > 0
    ? getDynamicNavigationItems(mobileMenuItems, locale)
    : navigation;

  const { currency } = useCurrency();

  const rawTopbarText = topbarSettings?.enabled !== false
    ? (isRTL && topbarSettings?.textAr ? topbarSettings.textAr : topbarSettings?.text) || ""
    : "";

  const topbarText = rawTopbarText
    .replace(/\{\{amount\}\}/g, String(topbarSettings?.freeShippingThreshold ?? 500))
    .replace(/\{\{currency\}\}/g, currency);

  return (
    <>
      <header className={cn(headerSettings?.sticky !== false ? "sticky top-0 z-50" : "relative z-50", "w-full border-b border-gray-100 bg-white transition-shadow duration-300", isScrolled && "shadow-lg")}>
        {/* Top promotional bar */}
        {topbarText && !topbarDismissed && (
          <div
            className="border-b border-gray-100"
            style={{
              backgroundColor: topbarSettings?.bgColor || "#f3f4f6",
              color: topbarSettings?.textColor || "#4b5563",
            }}
          >
            <div className="flex h-8 w-full items-center justify-center gap-2 px-5 md:px-7 lg:px-12">
              {topbarSettings?.link ? (
                <a
                  href={topbarSettings.link}
                  className="text-xs font-medium tracking-wide hover:underline"
                  style={{ color: "inherit" }}
                >
                  {topbarText}
                </a>
              ) : (
                <span className="text-xs font-medium tracking-wide">{topbarText}</span>
              )}
              {topbarSettings?.dismissible && (
                <button
                  type="button"
                  onClick={() => setTopbarDismissed(true)}
                  aria-label="Dismiss"
                  className="opacity-60 transition-opacity hover:opacity-100"
                  style={{ color: "inherit" }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 1: Search/Currency/Language — Logo — Account/Cart */}
        <div className="w-full px-5 md:px-7 lg:px-12">
          <div className="relative flex h-16 items-center justify-between md:h-18">
            {/* Left: Search + Currency + Language (desktop) / Mobile menu button */}
            <div className="flex items-center gap-1 md:gap-3">
              {/* Mobile menu button */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-brand-primary hover:bg-gray-50 xl:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">{dictionary.navigation.menu}</span>
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Desktop search icon */}
              <div className="hidden xl:block">
                <DesktopSearchDropdown locale={locale} dictionary={dictionary} />
              </div>

              {/* Desktop language */}
              <div className="hidden xl:block">
                <LanguageSwitcher locale={locale} />
              </div>

              {/* Desktop currency */}
              <div className="hidden xl:block">
                <CurrencySwitcher locale={locale} />
              </div>
            </div>

            {/* Center: Logo */}
            <Link href={`/${locale}`} className="absolute left-1/2 -translate-x-1/2">
              {siteSettings?.logo?.url && !logoError ? (
                <Image
                  src={siteSettings.logo.url}
                  alt={siteSettings.logo.alt || siteSettings.site_name || "Logo"}
                  width={140}
                  height={90}
                  className="h-11 w-auto md:h-[52px]"
                  style={{ width: "auto" }}
                  priority
                  unoptimized={shouldUseUnoptimizedImage(siteSettings.logo.url)}
                  onError={() => setLogoError(true)}
                />
              ) : logoError ? (
                <Image
                  src="/images/logo-shapehive.svg"
                  alt={siteSettings?.site_name || siteConfig.name}
                  width={140}
                  height={90}
                  className="h-11 w-auto md:h-[52px]"
                  style={{ width: "auto" }}
                  priority
                  unoptimized
                />
              ) : (
                <span className="text-xl font-bold tracking-tight text-brand-primary md:text-2xl">
                  {siteSettings?.site_name || siteConfig.name}
                </span>
              )}
            </Link>

            {/* Right: Search + Cart (mobile) / Account + Wishlist + Cart (desktop) */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Mobile search */}
              <div className="xl:hidden">
                <DesktopSearchDropdown locale={locale} dictionary={dictionary} />
              </div>

              {/* Desktop account button */}
              <button
                type="button"
                onClick={() => setIsAccountDrawerOpen(true)}
                className="relative hidden p-2 text-brand-primary transition-colors hover:text-brand-primary-dark md:block"
                aria-label={dictionary.account.myAccount}
              >
                <User className="h-5 w-5" />
              </button>

              {/* Desktop wishlist */}
              <Link
                href={`/${locale}/wishlist`}
                className="relative hidden p-2 text-brand-primary transition-colors hover:text-brand-primary-dark md:block"
                aria-label={dictionary.account.wishlist}
              >
                <Heart className="h-5 w-5" />
                {wishlistItemsCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                    {wishlistItemsCount}
                  </span>
                )}
              </Link>

              {/* Cart (all screens) */}
              <button
                type="button"
                className="relative p-2 text-brand-primary transition-colors hover:text-brand-primary-dark"
                onClick={() => setIsCartOpen(true)}
                aria-label={dictionary.common.cart}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Desktop Navigation (centered) + MegaMenu */}
        <nav className="relative hidden border-t border-gray-50 xl:block">
          <div className="flex w-full items-center justify-center gap-8 px-5 md:px-7 lg:px-12 py-3">
            {navigation.map((item) => {
              if (item.hasMegaMenu) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-xs font-bold uppercase tracking-[0.12em] text-brand-primary/80 transition-colors hover:text-brand-primary"
                  >
                    {item.name}
                  </Link>
                );
              }
              if (item.hasBrandsMegaMenu) {
                return (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={handleBrandsMouseEnter}
                    onMouseLeave={handleBrandsMouseLeave}
                  >
                    <Link
                      href={item.href}
                      onClick={handleBrandsMegaMenuClose}
                      className={cn(
                        "flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-primary/80 transition-colors hover:text-brand-primary",
                        isBrandsMegaMenuOpen && "text-brand-primary"
                      )}
                    >
                      {item.name}
                      <svg
                        className={cn("h-3 w-3 transition-transform duration-200", isBrandsMegaMenuOpen && "rotate-180")}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                  </div>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-xs font-bold uppercase tracking-[0.12em] text-brand-primary/80 transition-colors hover:text-brand-primary"
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Brands Mega Menu — brand logos on hover */}
          <div onMouseEnter={handleBrandsMegaMenuMouseEnter} onMouseLeave={handleBrandsMouseLeave}>
            <BrandsMegaMenu isOpen={isBrandsMegaMenuOpen} onClose={handleBrandsMegaMenuClose} locale={locale} />
          </div>
        </nav>

        {/* Mobile menu drawer overlay and sidebar */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 top-16 z-40 bg-black/30 xl:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer sidebar */}
            <div className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 z-40 overflow-y-auto bg-white xl:hidden">
              <div className="px-4 py-4">
                {/* Mobile nav links */}
                <div className="space-y-1">
                  {mobileNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block rounded-md px-3 py-2.5 text-sm font-bold text-brand-primary hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                {/* Mobile utilities */}
                <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-4">
                  <LanguageSwitcher locale={locale} />
                  <CurrencySwitcher locale={locale} />
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Drawers */}
      <CategoriesDrawer
        isOpen={isCategoriesDrawerOpen}
        onClose={() => setIsCategoriesDrawerOpen(false)}
        locale={locale}
        dictionary={dictionary}
        menuItems={categoriesDrawerMenuItems}
      />
    </>
  );
}
