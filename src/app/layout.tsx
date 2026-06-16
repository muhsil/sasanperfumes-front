import type { Metadata } from "next";
import { Noto_Sans_Arabic, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { themeConfig } from "@/config/theme";
import { INDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-sans-arabic",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${siteConfig.name} | Premium Perfumes & Fragrances in UAE`,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  robots: INDEX_NOFOLLOW_ROBOTS,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale from middleware header to set correct HTML lang attribute
  // This fixes Arabic pages having lang="en" instead of lang="ar"
  const headersList = await headers();
  const locale = headersList.get("x-locale") || "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
      <html
        lang={locale}
        dir={dir}
        suppressHydrationWarning
        className={`overflow-x-clip ${poppins.variable} ${notoSansArabic.variable}`}
      >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --font-jost: var(--font-poppins);
            --font-display: var(--font-poppins);
            --background: ${themeConfig.colors.background};
            --foreground: ${themeConfig.colors.foreground};
            --color-primary: ${themeConfig.colors.primary};
            --color-primary-dark: ${themeConfig.colors.primaryDark};
            --color-primary-light: ${themeConfig.colors.primaryLight};
            --color-beige: ${themeConfig.colors.beige};
            --color-beige-dark: ${themeConfig.colors.beigeDark};
            --color-brown: ${themeConfig.colors.brown};
            --color-brown-light: ${themeConfig.colors.brownLight};
            --color-ivory: ${themeConfig.colors.ivory};
            --color-grey-beige: ${themeConfig.colors.greyBeige};
            --color-dark-brown: ${themeConfig.colors.darkBrown};
            --color-gold: ${themeConfig.colors.gold};
            --color-border: ${themeConfig.colors.border};
            --color-muted: ${themeConfig.colors.muted};
            --color-sale: ${themeConfig.colors.sale};
            --color-success: ${themeConfig.colors.success};
            --color-warning: ${themeConfig.colors.warning};
          }
        `}} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var KEY = '__chunk_reload';
  var MAX_RELOADS = 2;
  var reloadCount = 0;
  try { reloadCount = parseInt(sessionStorage.getItem(KEY) || '0', 10) || 0; } catch(e) {}

  // Cache-busting reload: navigate to same URL with a timestamp param
  // to bypass Cloudflare/CDN cached HTML that references old chunks
  function cacheBustReload() {
    if (reloadCount >= MAX_RELOADS) return;
    try { sessionStorage.setItem(KEY, String(reloadCount + 1)); } catch(ex) {}
    var url = window.location.href.replace(/[?&]_cr=\\d+/, '');
    var sep = url.indexOf('?') !== -1 ? '&' : '?';
    window.location.replace(url + sep + '_cr=' + Date.now());
  }

  // Listen for script/link load errors (fires before React mounts)
  window.addEventListener('error', function(e) {
    var target = e.target || e.srcElement;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      var src = target.src || target.href || '';
      if (src.indexOf('/_next/static/') !== -1) {
        cacheBustReload();
      }
    }
  }, true);

  // Clear the reload counter on successful page load
  window.addEventListener('load', function() {
    try { sessionStorage.removeItem(KEY); } catch(e) {}
    // Clean up the _cr query param from URL without reload
    if (window.history && window.history.replaceState && window.location.search.indexOf('_cr=') !== -1) {
      var clean = window.location.href.replace(/[?&]_cr=\\d+/, '').replace(/\\?$/, '');
      window.history.replaceState(null, '', clean);
    }
  });

  // Handle dynamic import / chunk load failures after React mounts
  var origError = window.onerror;
  window.onerror = function(msg) {
    if (typeof msg === 'string' &&
        (msg.indexOf('ChunkLoadError') !== -1 ||
         msg.indexOf('Loading chunk') !== -1 ||
         msg.indexOf('Failed to fetch dynamically imported module') !== -1)) {
      cacheBustReload();
      return true;
    }
    if (origError) return origError.apply(this, arguments);
  };

  // Handle unhandled promise rejections (dynamic imports throw these)
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    if (reason && (reason.name === 'ChunkLoadError' ||
        (reason.message && (
          reason.message.indexOf('Failed to fetch dynamically imported module') !== -1 ||
          reason.message.indexOf('Loading chunk') !== -1 ||
          reason.message.indexOf('Failed to load chunk') !== -1
        )))) {
      cacheBustReload();
    }
  });
})();
`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased overflow-x-clip"
      >
        {children}
      </body>
    </html>
  );
}
