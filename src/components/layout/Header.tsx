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
import { SearchDrawer } from "@/components/layout/SearchDrawer";
import { DesktopSearchDropdown } from "@/components/layout/DesktopSearchDropdown";
import { BrandsMegaMenu } from "@/components/layout/BrandsMegaMenu";
import { getHeaderCategoryLinks, getDynamicNavigationItems, type DynamicNavigationItem } from "@/config/menu";

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
  const [topbarDismissed, setTopbarDismissed] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const brandsMegaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRTL = locale === "ar";
  const pathname = usePathname();

  useEffect(() => {
    const id = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsBrandsMegaMenuOpen(false);
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

  const baseMobileNavigation = mobileMenuItems && mobileMenuItems.length > 0
    ? getDynamicNavigationItems(mobileMenuItems, locale)
    : navigation;
  const mobileBottomNavigation = mobileBottomBarMenuItems && mobileBottomBarMenuItems.length > 0
    ? getDynamicNavigationItems(mobileBottomBarMenuItems, locale)
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
      ? "top-[76px] h-[calc(100vh-76px)] md:top-[128px] md:h-[calc(100vh-128px)]"
      : "top-[108px] h-[calc(100vh-108px)] md:top-[128px] md:h-[calc(100vh-128px)]"
    : "top-[76px] h-[calc(100vh-76px)] md:top-[96px] md:h-[calc(100vh-96px)]";

  return (
    <>
      <header
        className={cn(
          headerSettings?.sticky !== false ? "sticky top-0 z-50" : "relative z-50",
          "w-full bg-transparent transition-all duration-300",
          isScrolled && "shadow-[0_18px_48px_rgba(20,15,10,0.18)]"
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
            <div className="flex h-8 w-full items-center justify-center gap-2 px-5 md:px-7 lg:px-12">
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

        {/* Row 1: Search/Currency/Language — Logo — Account/Cart */}
        <div className="relative w-full px-3 py-1.5 md:px-5 md:py-2 lg:px-8">
          <div
            className={cn(
              "relative flex h-[4rem] items-center justify-between rounded-full border border-brand-border/70 px-2.5 transition-all duration-300 md:h-[5rem] md:px-5 xl:grid xl:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)_minmax(230px,1fr)] xl:gap-5 xl:px-6",
              isScrolled
                ? "bg-brand-ivory shadow-[0_12px_30px_rgba(20,15,10,0.12)]"
                : "bg-brand-ivory/96 shadow-[0_16px_40px_rgba(20,15,10,0.12)] backdrop-blur-xl"
            )}
          >
            {/* Left: Search + Currency + Language (desktop) / Mobile menu button */}
            <div className="flex items-center gap-1.5 md:gap-3.5 xl:justify-self-start">
              {/* Mobile menu button */}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border/45 bg-brand-ivory/90 text-brand-primary transition-colors hover:border-brand-primary/40 hover:bg-brand-beige md:h-10 md:w-10 xl:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">{dictionary.navigation.menu}</span>
                {isMobileMenuOpen ? <X className="h-[18px] w-[18px] md:h-5 md:w-5" /> : <Menu className="h-[18px] w-[18px] md:h-5 md:w-5" />}
              </button>

              {/* Logo */}
              <Link href={`/${locale}`} className="absolute left-1/2 -translate-x-1/2 xl:static xl:left-auto xl:shrink-0 xl:translate-x-0">
              {siteSettings?.logo?.url && !logoError ? (
                <Image
                  src={siteSettings.logo.url}
                  alt={siteSettings.logo.alt || siteSettings.site_name || "Logo"}
                  width={220}
                  height={142}
                  className="h-12 w-auto md:h-16 xl:h-[70px]"
                  style={{ width: "auto" }}
                  priority
                  unoptimized={shouldUseUnoptimizedImage(siteSettings.logo.url)}
                  onError={() => setLogoError(true)}
                />
              ) : logoError ? (
                <Image
                  src="/images/logo-sasanperfumes.svg"
                  alt={siteSettings?.site_name || siteConfig.name}
                  width={220}
                  height={142}
                  className="h-12 w-auto md:h-16 xl:h-[70px]"
                  style={{ width: "auto" }}
                  priority
                  unoptimized
                />
              ) : (
                <span className="font-title text-3xl tracking-[0.12em] text-brand-primary md:text-4xl">
                  {siteSettings?.site_name || siteConfig.name}
                </span>
              )}
              </Link>
            </div>

            <nav className="hidden min-w-0 items-center justify-center gap-6 overflow-x-auto px-4 xl:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                          "group relative flex items-center gap-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:text-brand-primary",
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
                        <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
                      </Link>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group relative shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:text-brand-primary"
                  >
                    {item.name}
                    <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
                  </Link>
                );
              })}
            </nav>

            {/* Right: Search + Cart (mobile) / Account + Wishlist + Cart (desktop) */}
            <div className="flex items-center gap-1.5 md:gap-2.5 xl:justify-self-end">
              {/* Mobile search */}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border/45 bg-brand-ivory/90 text-brand-primary transition-colors hover:border-brand-primary/40 hover:bg-brand-beige md:h-10 md:w-10 xl:hidden"
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
                className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-brand-border/45 bg-brand-ivory/90 text-brand-primary transition-all hover:border-brand-primary/40 hover:bg-brand-beige md:flex"
                aria-label={dictionary.account.myAccount}
              >
                <User className="h-5 w-5" />
              </button>

              {/* Desktop wishlist */}
              <Link
                href={`/${locale}/wishlist`}
                className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-brand-border/45 bg-brand-ivory/90 text-brand-primary transition-all hover:border-brand-primary/40 hover:bg-brand-beige md:flex"
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
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-brand-border/45 bg-brand-ivory/90 text-brand-primary transition-all hover:border-brand-primary/40 hover:bg-brand-beige md:h-10 md:w-10"
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

        {/* Row 2: Desktop Navigation (centered) + MegaMenu */}
        <nav className="hidden">
          <div className="flex w-full items-center justify-center gap-9 rounded-full border border-brand-border/65 bg-brand-ivory/86 px-5 py-3 shadow-[0_10px_28px_rgba(20,15,10,0.08)] md:px-7 lg:px-12">
            {navigation.map((item) => {
              if (item.hasMegaMenu) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group relative text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary/70 transition-colors hover:text-brand-primary"
                  >
                    {item.name}
                    <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
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
                        "group relative flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary/70 transition-colors hover:text-brand-primary",
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
                      <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  </div>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary/70 transition-colors hover:text-brand-primary"
                >
                  {item.name}
                  <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100" />
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
              className={cn("fixed inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-[2px] xl:hidden", mobileDrawerOffsetClass)}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer sidebar */}
            <div className={cn("fixed left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-brand-border/55 bg-brand-ivory/97 px-5 py-6 text-center shadow-[0_28px_60px_rgba(20,15,10,0.28)] xl:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", mobileDrawerOffsetClass)}>
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
