import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import NextTopLoader from "nextjs-toploader";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { FreeGiftProvider } from "@/contexts/FreeGiftContext";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { getDictionary } from "@/i18n";
import { siteConfig, localeConfig, type Locale } from "@/config/site";
import { INDEX_NOFOLLOW_ROBOTS, generateOrganizationJsonLd, generateWebSiteJsonLd, generateLocalBusinessJsonLd } from "@/lib/utils/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteSettings, getHeaderSettings, getPrimaryMenu, getMobileHeaderMenu, getMobileBottomBarMenu, getCategoriesDrawerMenu, getTopbarSettings, getSeoSettings, getFooterSettings, getWhatsAppSettings, getFeatureToggles, getStaticPageContent, mapRepeater, pickLocale } from "@/lib/api/wordpress";
import { TrackingScripts } from "@/components/tracking";
import { Suspense } from "react";

const CustomerTracker = dynamic(() => import("@/components/tracking/CustomerTracker").then(mod => mod.CustomerTracker));

// New feature components — loaded dynamically to keep initial JS bundle small
const PromotionalPopup     = dynamic(() => import("@/components/common/PromotionalPopup").then(m => m.PromotionalPopup));
const AbandonedCartPopup   = dynamic(() => import("@/components/common/AbandonedCartPopup").then(m => m.AbandonedCartPopup));
const LiveChatWidget       = dynamic(() => import("@/components/common/LiveChatWidget").then(m => m.LiveChatWidget));
const CompareDrawer        = dynamic(() => import("@/components/shop/CompareDrawer").then(m => m.CompareDrawer));

const MiniCartDrawer = dynamic(() => import("@/components/cart/MiniCartDrawer").then(mod => mod.MiniCartDrawer));
const AccountDrawer = dynamic(() => import("@/components/account/AccountDrawer").then(mod => mod.AccountDrawer));
const WhatsAppFloatingButton = dynamic(() => import("@/components/common/WhatsAppFloatingButton").then(mod => mod.WhatsAppFloatingButton));
const LocationCurrencyBanner = dynamic(() => import("@/components/common/LocationCurrencyBanner").then(mod => mod.LocationCurrencyBanner));
const CookieConsentBanner = dynamic(() => import("@/components/common/CookieConsentBanner").then(mod => mod.CookieConsentBanner));
const NetworkStatusBanner = dynamic(() => import("@/components/common/NetworkStatusBanner").then(mod => mod.NetworkStatusBanner));
const MobileEnhancements = dynamic(() => import("@/components/common/MobileEnhancements").then(mod => mod.MobileEnhancements));

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return siteConfig.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = locale as Locale;
  
  const siteSettings = await getSiteSettings(validLocale);
  
  const faviconUrl = siteSettings.favicon?.url;
  const proxiedFaviconUrl = faviconUrl
    ? faviconUrl.replace(/^https?:\/\/[^/]+\/wp-content\/uploads\//, '/cms-media/')
    : undefined;
  const faviconWithCacheBust = proxiedFaviconUrl 
    ? `${proxiedFaviconUrl}${proxiedFaviconUrl.includes('?') ? '&' : '?'}v=${siteSettings.favicon?.id || Date.now()}`
    : undefined;

  return {
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    metadataBase: new URL(siteConfig.url),
    robots: INDEX_NOFOLLOW_ROBOTS,
    icons: faviconWithCacheBust ? {
      icon: faviconWithCacheBust,
      shortcut: faviconWithCacheBust,
      apple: faviconWithCacheBust,
    } : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!siteConfig.locales.includes(locale as Locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const dictionary = await getDictionary(validLocale);
  const { dir } = localeConfig[validLocale];

  // Fetch site settings, header settings, topbar settings, menu, and SEO settings in parallel
  const [siteSettings, headerSettings, topbarSettings, menuItems, mobileMenuItems, mobileBottomBarMenu, categoriesDrawerMenu, seoSettings, footerSettings, whatsAppSettings, featureToggles, contactPageContent] = await Promise.all([
    getSiteSettings(validLocale),
    getHeaderSettings(),
    getTopbarSettings(validLocale),
    getPrimaryMenu(validLocale),
    getMobileHeaderMenu(validLocale),
    getMobileBottomBarMenu(validLocale),
    getCategoriesDrawerMenu(validLocale),
    getSeoSettings(validLocale),
    getFooterSettings(),
    getWhatsAppSettings(),
    getFeatureToggles(),
    getStaticPageContent("contact"),
  ]);
  const footerTopSocialLinks = mapRepeater(contactPageContent?.contact_social, validLocale, (item) => ({
    platform: item.platform || "",
    url: item.url || "",
  }));
  const showWhatsApp = featureToggles.sasanperfumes_whatsapp_enabled !== false && (whatsAppSettings?.enabled ?? true);
  const showPromotionalPopup = featureToggles.sasanperfumes_popup_enabled === true;
  const showAbandonedCartPopup = featureToggles.sasanperfumes_ab_popup_enabled === true;
  const showLiveChat = featureToggles.sasanperfumes_chat_enabled === true;

  return (
    <AuthProvider>
      <CurrencyProvider>
        <NotificationProvider>
          <ComparisonProvider>
                                        <CartProvider locale={validLocale}>
                                          <FreeGiftProvider locale={validLocale}>
                      <WishlistProvider>
              <JsonLd data={generateOrganizationJsonLd()} />
              <JsonLd data={generateWebSiteJsonLd()} />
              {generateLocalBusinessJsonLd().map((schema, i) => (
                <JsonLd key={`local-business-${i}`} data={schema} />
              ))}
              <TrackingScripts
                gaId={seoSettings.analytics.gaId}
                googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}
                fbPixelId={seoSettings.analytics.fbPixelId}
                tiktokPixelId={seoSettings.analytics.tiktokPixelId}
                snapPixelId={seoSettings.analytics.snapPixelId}
                omnisendBrandId={process.env.NEXT_PUBLIC_OMNISEND_BRAND_ID}
                gtmId={seoSettings.analytics.gtmId}
              />
              <Suspense fallback={null}>
                <CustomerTracker />
              </Suspense>
              <NextTopLoader
                color="var(--color-primary)"
                initialPosition={0.08}
                crawlSpeed={200}
                height={3}
                crawl={true}
                showSpinner={false}
                easing="ease"
                speed={200}
                shadow="0 0 10px var(--color-primary),0 0 5px var(--color-primary)"
              />
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-brand-primary focus:px-6 focus:py-3 focus:text-white focus:shadow-lg focus:outline-none">
                {validLocale === "ar" ? "انتقل إلى المحتوى الرئيسي" : "Skip to main content"}
              </a>
              <div dir={dir} lang={validLocale} className="site-shell flex min-h-screen max-w-full flex-col overflow-x-clip text-brand-primary">
                <nav className="print:hidden" aria-label={validLocale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
                  <Header
                    locale={validLocale}
                    dictionary={dictionary}
                    siteSettings={siteSettings}
                    headerSettings={headerSettings}
                    menuItems={menuItems?.items}
                    mobileMenuItems={mobileMenuItems?.items}
                    mobileBottomBarMenuItems={mobileBottomBarMenu?.items}
                    categoriesDrawerMenuItems={categoriesDrawerMenu?.items}
                    topbarSettings={topbarSettings}
                  />
                </nav>
                <main id="main-content" className="section-reveal flex-1" role="main">
                  <MobileEnhancements>{children}</MobileEnhancements>
                </main>
                <Footer locale={validLocale} dictionary={dictionary} siteSettings={siteSettings} footerSettings={footerSettings} featureToggles={featureToggles} footerTopSocialLinks={footerTopSocialLinks} />
              </div>
              <MiniCartDrawer
                locale={validLocale}
                dictionary={{
                  cart: dictionary.common.cart,
                  emptyCart: dictionary.cart.emptyCart,
                  continueShopping: dictionary.cart.continueShopping,
                  subtotal: dictionary.cart.subtotal,
                  viewCart: dictionary.miniCart.viewCart,
                  checkout: dictionary.miniCart.checkout,
                  remove: dictionary.common.remove,
                }}
              />
                          <AccountDrawer
                            locale={validLocale}
                            dictionary={{
                              myAccount: dictionary.account.myAccount,
                              orders: dictionary.account.orders,
                              addresses: dictionary.account.addresses,
                              wishlist: dictionary.account.wishlist,
                              settings: dictionary.account.settings,
                              logout: dictionary.account.logout,
                              welcome: dictionary.account.welcome,
                              login: dictionary.account.login,
                              register: dictionary.account.register,
                              notLoggedIn: dictionary.account.notLoggedIn,
                              profile: dictionary.account.profile,
                              more: dictionary.common.more,
                            }}
                          />
                                                                                                                                                                                                <NetworkStatusBanner locale={validLocale} />
                                                                                                                                                                                                <LocationCurrencyBanner locale={validLocale} />
                                                                                                                                                                                                <CookieConsentBanner locale={validLocale} />
                                                                                                {showWhatsApp && (
                                                                                                  <div className="print:hidden">
                                                                                                    <WhatsAppFloatingButton
                                                                                                      phoneNumber={whatsAppSettings?.number || siteConfig.contact.whatsapp}
                                                                                                      message={pickLocale(whatsAppSettings?.message, validLocale, "")}
                                                                                                      locale={validLocale}
                                                                                                      enabled
                                                                                                      showDesktop={whatsAppSettings?.showDesktop ?? true}
                                                                                                      showMobile={whatsAppSettings?.showMobile ?? true}
                                                                                                      position={whatsAppSettings?.position || "bottom-left"}
                                                                                                    />
                                                                                                  </div>
                                                                                                )}
              {/* New global feature components */}
              {showPromotionalPopup && <PromotionalPopup locale={validLocale} />}
              {showAbandonedCartPopup && <AbandonedCartPopup locale={validLocale} />}
              {showLiveChat && <LiveChatWidget />}
              <CompareDrawer locale={validLocale} />
                                                        </WishlistProvider>
                                            </FreeGiftProvider>
                    </CartProvider>
          </ComparisonProvider>
        </NotificationProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
