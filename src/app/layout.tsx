import type { Metadata } from "next";
import { Noto_Sans_Arabic, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { themeConfig } from "@/config/theme";
import { INDEX_FOLLOW_ROBOTS } from "@/lib/utils/seo";
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
  robots: INDEX_FOLLOW_ROBOTS,
  icons: {
    icon: "/sasan-fav.png",
    shortcut: "/sasan-fav.png",
    apple: "/sasan-fav.png",
  },
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
        <link rel="dns-prefetch" href="https://cms.sasanperfumes.com" />
        <link rel="preconnect" href="https://cms.sasanperfumes.com" crossOrigin="anonymous" />
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
