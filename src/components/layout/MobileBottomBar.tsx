"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, Heart, User } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import type { Locale } from "@/config/site";
import type { MobileBarSettings } from "@/lib/api/wordpress";
import type { WPMenuItem } from "@/types/wordpress";
import type { Dictionary } from "@/i18n";
import { CategoriesDrawer } from "@/components/layout/CategoriesDrawer";
import { triggerHaptic } from "@/lib/utils/haptics";
import { normalizeMenuUrl } from "@/config/menu";

interface MobileBottomBarProps {
  locale: Locale;
  settings: MobileBarSettings;
  dictionary: Dictionary;
  menuItems?: WPMenuItem[] | null;
  mobileMenuItems?: WPMenuItem[] | null;
  mobileBottomBarMenuItems?: WPMenuItem[] | null;
  categoriesDrawerMenuItems?: WPMenuItem[] | null;
  whatsAppPhoneNumber?: string;
  whatsAppMessage?: string;
  whatsAppEnabled?: boolean;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M20.52 3.48A11.78 11.78 0 0 0 12.13 0C5.59 0 .26 5.32.26 11.86c0 2.08.54 4.12 1.58 5.91L.16 23.9l6.28-1.65a11.84 11.84 0 0 0 5.68 1.45h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.47-8.38ZM12.13 21.7h-.01a9.82 9.82 0 0 1-5.01-1.37l-.36-.21-3.73.98 1-3.63-.24-.37a9.78 9.78 0 0 1-1.5-5.23c0-5.43 4.42-9.84 9.86-9.84 2.63 0 5.1 1.03 6.96 2.89a9.78 9.78 0 0 1 2.88 6.96c0 5.43-4.42 9.84-9.85 9.84Zm5.4-7.36c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.76.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.18-1.41-.08-.12-.28-.2-.58-.35Z"
      />
    </svg>
  );
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  grid: Grid3X3,
  heart: Heart,
  user: User,
  whatsapp: WhatsAppIcon,
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
        url: normalizeMenuUrl(item.url || "/", locale),
      };
    });
}

export function MobileBottomBar({
  locale,
  settings,
  dictionary,
  menuItems,
  mobileMenuItems,
  mobileBottomBarMenuItems,
  categoriesDrawerMenuItems,
  whatsAppPhoneNumber,
  whatsAppMessage,
  whatsAppEnabled = true,
}: MobileBottomBarProps) {
  const { wishlistItemsCount } = useWishlist();
  const { setIsAccountDrawerOpen } = useAuth();
  const isKeyboardVisible = useKeyboardVisible();
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);
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

  const isRTL = locale === "ar";
  const defaultWhatsAppMessage = isRTL
    ? "مرحبا، أود معرفة المزيد عن منتجاتكم وخدماتكم."
    : "Hello Sasan Perfumes, I would like to know more about your products and services.";
  const whatsAppUrl =
    whatsAppEnabled && whatsAppPhoneNumber
      ? `https://wa.me/${whatsAppPhoneNumber}?text=${encodeURIComponent(whatsAppMessage || defaultWhatsAppMessage)}`
      : "";
  const isSearchItem = (item: MobileBarSettings["items"][0]) =>
    item.icon === "search" || item.url.includes("search") || item.label?.toLowerCase() === "search";
  const searchIndex = effectiveSettings.items.findIndex(isSearchItem);
  const replaceIndex = searchIndex >= 0 ? searchIndex : Math.floor(effectiveSettings.items.length / 2);
  const bottomBarItems = effectiveSettings.items
    .map((item, index) => {
      if (whatsAppUrl && index === replaceIndex) {
        return {
          ...item,
          icon: "whatsapp",
          label: "WhatsApp",
          labelAr: "واتساب",
          url: whatsAppUrl,
        };
      }
      return item;
    })
    .filter((item) => item.icon !== "search" && !item.url.includes("search"));

  if (!effectiveSettings.enabled || bottomBarItems.length === 0) {
    return null;
  }

  const isItemActive = (item: MobileBarSettings["items"][0]) => {
    const itemPath = item.url;
    
    if (item.icon === "home" || item.url === "/" || item.url === "" || item.url === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    if (item.icon === "grid" || item.url.includes("categories")) {
      return activeDrawer === "categories";
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
          {bottomBarItems.map((item, index) => {
            const IconComponent = iconMap[item.icon] || Home;
            // Override "Categories" label with "Menu" / "القائمة"
            // Also handled server-side in getMobileBarSettings for SSR consistency
            const rawLabel = isRTL && item.labelAr ? item.labelAr : item.label;
            const isCategoriesItem = item.icon === "grid" || item.url.includes("categories") || 
              item.label?.toLowerCase() === "categories" || item.labelAr === "الفئات";
            const label = isCategoriesItem
              ? (isRTL ? "القائمة" : "Menu")
              : rawLabel;
            const href = item.url || `/${locale}`;

            const isWishlist = item.icon === "heart" || item.url.includes("wishlist");
            const isWhatsApp = item.icon === "whatsapp";
            const showBadge = isWishlist && wishlistItemsCount > 0;
            const isActive = isItemActive(item);

            const isDrawerItem = item.icon === "grid" || item.icon === "user" ||
                                 item.url.includes("categories") || item.url.includes("account");

            const activeClasses = isActive
              ? "bg-brand-primary text-white shadow-[0_8px_18px_rgba(20,15,10,0.18)]"
              : "text-brand-primary/62 hover:bg-brand-beige hover:text-brand-primary";
            const itemClasses = isWhatsApp
              ? "bg-brand-primary text-white shadow-[0_8px_18px_rgba(20,15,10,0.18)] hover:bg-brand-primary/90"
              : activeClasses;

            if (isDrawerItem) {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => handleItemClick(item, e)}
                  className={`relative mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all active:scale-95 ${itemClasses}`}
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
                target={isWhatsApp ? "_blank" : undefined}
                rel={isWhatsApp ? "noopener noreferrer" : undefined}
                className={`relative mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all active:scale-95 ${itemClasses}`}
                aria-label={isWhatsApp ? "Chat on WhatsApp" : undefined}
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
    </>
  );
}
