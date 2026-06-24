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
import { type Locale } from "@/config/site";
import type { SiteSettings, WPMenuItem } from "@/types/wordpress";
import type { HeaderSettings, TopbarSettings } from "@/lib/api/wordpress";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CategoriesDrawer } from "@/components/layout/CategoriesDrawer";
import { SearchDrawer } from "@/components/layout/SearchDrawer";
import { DesktopSearchDropdown } from "@/components/layout/DesktopSearchDropdown";
import { BrandsMegaMenu } from "@/components/layout/BrandsMegaMenu";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { getHeaderCategoryLinks, getDynamicNavigationItems, type DynamicNavigationItem } from "@/config/menu";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface HeaderProps {
  locale: Locale;
  dictionary: Dictionary;
  siteSettings?: SiteSettings | null;
  headerSettings?: HeaderSettings | null;
  menuItems?: WPMenuItem[] | null;
  mobileMenuItems?: WPMenuItem[] | null;
  mobileBottomBarMenuItems?: WPMenuItem[] | null;
  categoriesDrawerMenuItems?: WPMenuItem[] | null;
  topbarSettings?: TopbarSettings | null;
}

function mergeMobileNavigation(
  primaryItems: DynamicNavigationItem[],
  secondaryItems: DynamicNavigationItem[]
) {
  const merged: DynamicNavigationItem[] = [];
  const seenHrefs = new Set<string>();

  for (const item of [...primaryItems, ...secondaryItems]) {
    if (seenHrefs.has(item.href)) continue;
    seenHrefs.add(item.href);
    merged.push(item);
  }

  return merged;
}

export function Header({ locale, dictionary, siteSettings, headerSettings, menuItems, mobileMenuItems, mobileBottomBarMenuItems, categoriesDrawerMenuItems, topbarSettings }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isBrandsMegaMenuOpen, setIsBrandsMegaMenuOpen] = useState(false);
  const [isPerfumesMegaMenuOpen, setIsPerfumesMegaMenuOpen] = useState(false);
  const [topbarDismissed, setTopbarDismissed] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const brandsMegaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const perfumesMegaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRTL = locale === "ar";
  const pathname = usePathname();

  useEffect(() => {
    const id = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsBrandsMegaMenuOpen(false);
      setIsPerfumesMegaMenuOpen(false);
      setIsSearchDrawerOpen(false);
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
  const marketPrefix = useMarketPrefix();
  const isHomePage = pathname === `${marketPrefix}/${locale}` || pathname === `${marketPrefix}/${locale}/` || pathname === "/";
  void isHomePage;

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

  const handlePerfumesMouseEnter = useCallback(() => {
    if (perfumesMegaMenuTimeoutRef.current) clearTimeout(perfumesMegaMenuTimeoutRef.current);
    setIsPerfumesMegaMenuOpen(true);
  }, []);

  const handlePerfumesMouseLeave = useCallback(() => {
    perfumesMegaMenuTimeoutRef.current = setTimeout(() => setIsPerfumesMegaMenuOpen(false), 150);
  }, []);

  const handlePerfumesMegaMenuMouseEnter = useCallback(() => {
    if (perfumesMegaMenuTimeoutRef.current) clearTimeout(perfumesMegaMenuTimeoutRef.current);
  }, []);

  const handlePerfumesMegaMenuClose = useCallback(() => {
    setIsPerfumesMegaMenuOpen(false);
  }, []);

  const navigation = menuItems && menuItems.length > 0
    ? getDynamicNavigationItems(menuItems, locale, marketPrefix)
    : getHeaderCategoryLinks(locale, marketPrefix);

  const baseMobileNavigation = mobileMenuItems && mobileMenuItems.length > 0
    ? getDynamicNavigationItems(mobileMenuItems, locale, marketPrefix)
    : navigation;
  const mobileBottomNavigation = mobileBottomBarMenuItems && mobileBottomBarMenuItems.length > 0
    ? getDynamicNavigationItems(mobileBottomBarMenuItems, locale, marketPrefix)
    : [];
  const mobileNavigation = mergeMobileNavigation(baseMobileNavigation, mobileBottomNavigation);

  const { currency } = useCurrency();

  const rawTopbarText = topbarSettings?.enabled !== false
    ? (isRTL && topbarSettings?.textAr ? topbarSettings.textAr : topbarSettings?.text) || ""
    : "";

  const topbarText = rawTopbarText
    .replace(/\{\{amount\}\}/g, String(topbarSettings?.freeShippingThreshold ?? 500))
    .replace(/\{\{currency\}\}/g, currency);
  const hideTopbarOnMobile = topbarSettings?.hideOnMobile !== false;
  const topbarVisible = Boolean(topbarText && !topbarDismissed && !isScrolled);
  const mobileDrawerOffsetClass = topbarVisible
    ? hideTopbarOnMobile
      ? "top-16 h-[calc(100vh-4rem)] md:top-[6.5rem] md:h-[calc(100vh-6.5rem)]"
      : "top-24 h-[calc(100vh-6rem)] md:top-[6.5rem] md:h-[calc(100vh-6.5rem)]"
    : "top-16 h-[calc(100vh-4rem)] md:top-20 md:h-[calc(100vh-5rem)]";

  return (
    <>
      <header
        className={cn(
          headerSettings?.sticky !== false
            ? "sticky top-0 z-50"
            : "relative z-50",
          "w-full bg-white transition-all duration-300",
          isScrolled && "shadow-[0_2px_16px_rgba(0,0,0,0.08)]"
        )}
      >
        {/* Top promotional bar */}
        {topbarVisible && (
          <div
            className={cn("bg-brand-primary text-brand-ivory", hideTopbarOnMobile && "hidden md:block")}
            style={{
              backgroundColor: topbarSettings?.bgColor || "#1b1814",
              color: topbarSettings?.textColor || "#f8f4ec",
            }}
          >
            <div className="mx-auto flex h-8 max-w-[80rem] items-center justify-center gap-2 px-4">
              {topbarSettings?.link ? (
                <a
                  href={topbarSettings.link}
                  className="text-[11px] font-semibold uppercase hover:underline"
                  style={{ color: "inherit" }}
                >
                  {topbarText}
                </a>
              ) : (
                <span className="text-[11px] font-semibold uppercase">{topbarText}</span>
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

        {/* Main header bar: Logo + Nav (left) — Icons (right) */}
        <div className="container mx-auto px-4">
          <div className="relative flex h-16 items-center justify-between xl:h-20">
            {/* Left: Hamburger (mobile) + Logo + Nav (desktop) */}
            <div className="flex items-center gap-4 xl:gap-6">
              {/* Mobile menu button */}
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors xl:hidden",
                  "text-brand-primary hover:bg-gray-100"
                )}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">{dictionary.navigation.menu}</span>
                {isMobileMenuOpen ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Menu className="h-5 w-5 md:h-6 md:w-6" />}
              </button>

              {/* Logo */}
              <Link href={`${marketPrefix}/${locale}`} className="absolute left-1/2 -translate-x-1/2 xl:static xl:left-auto xl:translate-x-0">
              {siteSettings?.logo?.url && !logoError ? (
                <Image
                  src={siteSettings.logo.url}
                  alt={siteSettings.logo.alt || siteSettings.site_name || "Logo"}
                  width={260}
                  height={168}
                  className="h-14 w-auto md:h-[72px] xl:h-[80px]"
                  style={{ width: "auto" }}
                  priority
                  unoptimized={shouldUseUnoptimizedImage(siteSettings.logo.url)}
                  onError={() => setLogoError(true)}
                />
              ) : siteSettings?.site_name ? (
                <span className="font-title text-3xl tracking-[0.12em] text-brand-primary md:text-4xl">
                  {siteSettings.site_name}
                </span>
              ) : (
                <span className="sr-only">Home</span>
              )}
              </Link>

              {/* Desktop navigation — left-aligned after logo */}
              <nav className="hidden items-center gap-4 xl:flex">
                {navigation.map((item) => {
                  if (item.hasBrandsMegaMenu) {
                    return (
                      <div
                        key={item.name}
                        className="relative shrink-0"
                        onMouseEnter={handleBrandsMouseEnter}
                        onMouseLeave={handleBrandsMouseLeave}
                      >
                        <Link
                          href={item.href}
                          onClick={handleBrandsMegaMenuClose}
                          className={cn(
                            "group relative flex items-center gap-1 whitespace-nowrap text-sm font-bold transition-colors",
                            "text-brand-primary hover:text-brand-primary/70",
                            isBrandsMegaMenuOpen && "text-brand-primary/70"
                          )}
                        >
                          {item.name}
                          <svg
                            className={cn("h-3 w-3 transition-transform duration-200", isBrandsMegaMenuOpen && "rotate-180")}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
                        </Link>
                      </div>
                    );
                  }

                  if (item.hasMegaMenu) {
                    return (
                      <div
                        key={item.name}
                        className="relative shrink-0"
                        onMouseEnter={handlePerfumesMouseEnter}
                        onMouseLeave={handlePerfumesMouseLeave}
                      >
                        <Link
                          href={item.href}
                          onClick={handlePerfumesMegaMenuClose}
                          className={cn(
                            "group relative flex items-center gap-1 whitespace-nowrap text-sm font-bold transition-colors",
                            "text-brand-primary hover:text-brand-primary/70",
                            isPerfumesMegaMenuOpen && "text-brand-primary/70"
                          )}
                        >
                          {item.name}
                          <svg
                            className={cn("h-3 w-3 transition-transform duration-200", isPerfumesMegaMenuOpen && "rotate-180")}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
                        </Link>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group relative shrink-0 whitespace-nowrap text-sm font-bold transition-colors",
                        "text-brand-primary hover:text-brand-primary/70"
                      )}
                    >
                      {item.name}
                      <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-1.5 md:gap-2.5">
              {/* Mobile search */}
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors md:h-10 md:w-10 xl:hidden",
                  "text-brand-primary hover:bg-gray-100"
                )}
                onClick={() => setIsSearchDrawerOpen(true)}
                aria-label={dictionary.common.searchPlaceholder || "Search"}
              >
                <Search className="h-[18px] w-[18px] md:h-5 md:w-5" />
              </button>

              <div className="hidden xl:block">
                <DesktopSearchDropdown locale={locale} dictionary={dictionary} />
              </div>

              <div className="hidden xl:block">
                <LanguageSwitcher locale={locale} />
              </div>

              <div className="hidden xl:block">
                <CurrencySwitcher locale={locale} />
              </div>

              {/* Desktop account button */}
              <button
                type="button"
                onClick={() => setIsAccountDrawerOpen(true)}
                className={cn(
                  "relative hidden h-10 w-10 items-center justify-center rounded-full transition-all md:flex",
                  "text-brand-primary hover:bg-gray-100"
                )}
                aria-label={dictionary.account.myAccount}
              >
                <User className="h-5 w-5" />
              </button>

              {/* Desktop wishlist */}
              <Link
                href={`${marketPrefix}/${locale}/wishlist`}
                className={cn(
                  "relative hidden h-10 w-10 items-center justify-center rounded-full transition-all md:flex",
                  "text-brand-primary hover:bg-gray-100"
                )}
                aria-label={dictionary.account.wishlist}
              >
                <Heart className="h-5 w-5" />
                {wishlistItemsCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white shadow">
                    {wishlistItemsCount}
                  </span>
                )}
              </Link>

              {/* Cart (all screens) */}
              <button
                type="button"
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full transition-all md:h-10 md:w-10",
                  "text-brand-primary hover:bg-gray-100"
                )}
                onClick={() => setIsCartOpen(true)}
                aria-label={dictionary.common.cart}
              >
                <ShoppingBag className="h-[18px] w-[18px] md:h-5 md:w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div onMouseEnter={handleBrandsMegaMenuMouseEnter} onMouseLeave={handleBrandsMouseLeave}>
          <BrandsMegaMenu isOpen={isBrandsMegaMenuOpen} onClose={handleBrandsMegaMenuClose} locale={locale} />
        </div>

        <div onMouseEnter={handlePerfumesMegaMenuMouseEnter} onMouseLeave={handlePerfumesMouseLeave}>
          <MegaMenu
            isOpen={isPerfumesMegaMenuOpen}
            onClose={handlePerfumesMegaMenuClose}
            locale={locale}
            dictionary={dictionary}
            menuItems={categoriesDrawerMenuItems}
          />
        </div>

        {/* Mobile menu drawer overlay and sidebar */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className={cn("fixed inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-[2px] xl:hidden", mobileDrawerOffsetClass)}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer sidebar */}
            <div className={cn("fixed left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-brand-border/55 bg-brand-ivory/97 px-4 py-6 text-center shadow-[0_28px_60px_rgba(20,15,10,0.28)] xl:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", mobileDrawerOffsetClass)}>
              <div>
                {/* Mobile nav links */}
                <div className="space-y-1.5">
                  {mobileNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block rounded-full border border-transparent px-4 py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-primary/80 transition-colors hover:border-brand-border/55 hover:bg-brand-beige hover:text-brand-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                {/* Mobile utilities */}
                <div className="mt-7 flex items-center justify-center gap-4 border-t border-brand-border/45 pt-5">
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
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        locale={locale}
        dictionary={dictionary}
      />
    </>
  );
}
