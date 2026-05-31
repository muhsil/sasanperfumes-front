"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, Search, Heart, User } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import type { Locale } from "@/config/site";
import type { MobileBarSettings } from "@/lib/api/wordpress";
import type { WPMenuItem } from "@/types/wordpress";
import type { Dictionary } from "@/i18n";
import { CategoriesDrawer } from "@/components/layout/CategoriesDrawer";
import { SearchDrawer } from "@/components/layout/SearchDrawer";
import { triggerHaptic } from "@/lib/utils/haptics";

interface MobileBottomBarProps {
  locale: Locale;
  settings: MobileBarSettings;
  dictionary: Dictionary;
  menuItems?: WPMenuItem[] | null;
  mobileMenuItems?: WPMenuItem[] | null;
  mobileBottomBarMenuItems?: WPMenuItem[] | null;
  categoriesDrawerMenuItems?: WPMenuItem[] | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  grid: Grid3X3,
  search: Search,
  heart: Heart,
  user: User,
};

// Infer icon from WordPress menu item CSS classes or title
function inferIconFromMenuItem(item: WPMenuItem): string {
  const title = item.title.toLowerCase().trim();
  const url = item.url.toLowerCase();

  // Map common titles/URLs to icons
  if (title === "home" || url === "/" || url === "") return "home";
  if (title === "menu" || title === "categories" || url.includes("categories")) return "grid";
  if (title === "search" || url.includes("search")) return "search";
  if (title === "account" || url.includes("account")) return "user";
  if (title === "wishlist" || url.includes("wishlist")) return "heart";

  // Default to home icon for unrecognized items
  return "home";
}

// Convert WordPress menu items to MobileBarSettings items
function wpMenuToBarItems(wpItems: WPMenuItem[], locale: Locale): MobileBarSettings["items"] {
  return wpItems
    .filter(item => item.parent === 0) // Only top-level items
    .map(item => {
      const icon = inferIconFromMenuItem(item);
      const isCategoriesItem = icon === "grid";
      return {
        icon,
        label: isCategoriesItem ? "Menu" : item.title,
        labelAr: isCategoriesItem ? "القائمة" : (locale === "ar" ? item.title : ""),
        url: item.url || "/",
      };
    });
}

export function MobileBottomBar({ locale, settings, dictionary, menuItems, mobileMenuItems, mobileBottomBarMenuItems, categoriesDrawerMenuItems }: MobileBottomBarProps) {
  const { wishlistItemsCount } = useWishlist();
  const { setIsAccountDrawerOpen } = useAuth();
  const isKeyboardVisible = useKeyboardVisible();
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [isGalleryFullscreenOpen, setIsGalleryFullscreenOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const syncGalleryState = (event?: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }> | undefined;
      const nextOpen = customEvent?.detail?.open;
      if (typeof nextOpen === "boolean") {
        setIsGalleryFullscreenOpen(nextOpen);
        return;
      }

      if (typeof document !== "undefined") {
        setIsGalleryFullscreenOpen(document.body.classList.contains("gallery-fullscreen-open"));
      }
    };

    syncGalleryState();
    window.addEventListener("gallery-fullscreen-change", syncGalleryState as EventListener);
    return () => window.removeEventListener("gallery-fullscreen-change", syncGalleryState as EventListener);
  }, []);

  // Use WordPress Mobile Bottom Bar menu if available, otherwise fall back to plugin API settings
  const effectiveSettings: MobileBarSettings = mobileBottomBarMenuItems && mobileBottomBarMenuItems.length > 0
    ? { enabled: true, items: wpMenuToBarItems(mobileBottomBarMenuItems, locale) }
    : settings;

  if (!effectiveSettings.enabled || effectiveSettings.items.length === 0) {
    return null;
  }

  const isRTL = locale === "ar";

  const isItemActive = (item: MobileBarSettings["items"][0]) => {
    const itemPath = item.url.startsWith("/") ? `/${locale}${item.url}` : item.url;
    
    if (item.icon === "home" || item.url === "/" || item.url === "") {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    if (item.icon === "grid" || item.url.includes("categories")) {
      return activeDrawer === "categories";
    }
    if (item.icon === "search") {
      return activeDrawer === "search";
    }
    if (item.icon === "user" || item.url.includes("account")) {
      return activeDrawer === "account" || pathname.includes("/account");
    }
    if (item.icon === "heart" || item.url.includes("wishlist")) {
      return pathname.includes("/wishlist");
    }
    return pathname.startsWith(itemPath);
  };

  const handleItemClick = (item: MobileBarSettings["items"][0], e: React.MouseEvent) => {
    triggerHaptic();
    if (item.icon === "grid" || item.url.includes("categories")) {
      e.preventDefault();
      setActiveDrawer("categories");
      setIsCategoriesDrawerOpen(true);
    } else if (item.icon === "search") {
      e.preventDefault();
      setActiveDrawer("search");
      setIsSearchDrawerOpen(true);
    } else if (item.icon === "user" || item.url.includes("account")) {
      e.preventDefault();
      setActiveDrawer("account");
      setIsAccountDrawerOpen(true);
    }
  };

  return (
    <>
      <nav
        className={`mobile-bottom-bar fixed left-3 right-3 z-50 rounded-full border border-brand-border/70 bg-brand-ivory/96 shadow-[0_16px_40px_rgba(20,15,10,0.16)] backdrop-blur-xl transition-all duration-200 xl:hidden ${isKeyboardVisible || isGalleryFullscreenOpen ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around px-1.5 py-1.5">
          {effectiveSettings.items.map((item, index) => {
            const IconComponent = iconMap[item.icon] || Home;
            // Override "Categories" label with "Menu" / "القائمة"
            // Also handled server-side in getMobileBarSettings for SSR consistency
            const rawLabel = isRTL && item.labelAr ? item.labelAr : item.label;
            const isCategoriesItem = item.icon === "grid" || item.url.includes("categories") || 
              item.label?.toLowerCase() === "categories" || item.labelAr === "الفئات";
            const label = isCategoriesItem
              ? (isRTL ? "القائمة" : "Menu")
              : rawLabel;
            const href = item.url.startsWith("/") ? `/${locale}${item.url}` : item.url || `/${locale}`;

            const isWishlist = item.icon === "heart" || item.url.includes("wishlist");
            const showBadge = isWishlist && wishlistItemsCount > 0;
            const isActive = isItemActive(item);

            const isDrawerItem = item.icon === "grid" || item.icon === "search" || item.icon === "user" || 
                                 item.url.includes("categories") || item.url.includes("account");

            const activeClasses = isActive
              ? "bg-brand-primary text-white shadow-[0_8px_18px_rgba(20,15,10,0.18)]"
              : "text-brand-primary/62 hover:bg-brand-beige hover:text-brand-primary";

            if (isDrawerItem) {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => handleItemClick(item, e)}
                  className={`relative mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all active:scale-95 ${activeClasses}`}
                >
                  <div className="relative">
                    <IconComponent className="h-[18px] w-[18px]" />
                  </div>
                  {label && (
                    <span className="max-w-full truncate text-[7.5px] font-semibold uppercase leading-tight">{label}</span>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={index}
                href={href}
                className={`relative mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all active:scale-95 ${activeClasses}`}
              >
                <div className="relative">
                  <IconComponent className="h-[18px] w-[18px]" />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[10px] font-semibold text-brand-primary">
                      {wishlistItemsCount > 9 ? "9+" : wishlistItemsCount}
                    </span>
                  )}
                </div>
                {label && (
                  <span className="max-w-full truncate text-[7.5px] font-semibold uppercase leading-tight">{label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <CategoriesDrawer
        isOpen={isCategoriesDrawerOpen}
        onClose={() => {
          setIsCategoriesDrawerOpen(false);
          setActiveDrawer(null);
        }}
        locale={locale}
        dictionary={dictionary}
        menuItems={categoriesDrawerMenuItems || mobileMenuItems || menuItems}
      />
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => {
          setIsSearchDrawerOpen(false);
          setActiveDrawer(null);
        }}
        locale={locale}
        dictionary={dictionary}
      />
    </>
  );
}
