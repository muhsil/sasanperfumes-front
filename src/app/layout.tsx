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

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const localeHeader = headersList.get("x-locale") || "en";
  const locale = localeHeader === "ar" ? "ar" : "en";
  const marketCodeHeader = headersList.get("x-market") || "intl";
  const marketCode = marketCodeHeader === "qa" || marketCodeHeader === "om" || marketCodeHeader === "sa"
    ? marketCodeHeader
    : "intl";
  const titleSuffix = marketCode === "intl"
    ? locale === "ar"
      ? "عطور دبي الفاخرة"
      : "Premium Dubai Fragrances"
    : marketCode === "qa"
      ? locale === "ar"
        ? "عطور قطر الفاخرة"
        : "Premium Qatar Fragrances"
      : marketCode === "om"
        ? locale === "ar"
          ? "عطور عمان الفاخرة"
          : "Premium Oman Fragrances"
        : locale === "ar"
          ? "عطور السعودية الفاخرة"
          : "Premium Saudi Arabia Fragrances";
  const description =
    locale === "ar"
      ? marketCode === "qa"
        ? "عطور فاخرة، عود، معطر شعر، ومجموعات هدايا من Sasan Perfumes Qatar. تسوق بالريال القطري مع توصيل سريع داخل قطر. بخبرة عطرية تتجاوز 60 عاماً، نمزج التراث بالأناقة العصرية."
        : marketCode === "om"
          ? "عطور فاخرة، عود، معطر شعر، ومجموعات هدايا من Sasan Perfumes Oman. تسوق بالريال العُماني مع توصيل سريع داخل عمان. بخبرة عطرية تتجاوز 60 عاماً، نمزج التراث بالأناقة العصرية."
          : marketCode === "sa"
            ? "عطور فاخرة، عود، معطر شعر، ومجموعات هدايا من Sasan Perfumes Saudi Arabia. تسوق بالريال السعودي مع توصيل سريع داخل السعودية. بخبرة عطرية تتجاوز 60 عاماً، نمزج التراث بالأناقة العصرية."
            : "عطور فاخرة، عود، معطر شعر، ومجموعات هدايا من Sasan Perfumes. تسوق بالدرهم الإماراتي مع توصيل سريع داخل الإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عاماً، نمزج التراث بالأناقة العصرية."
      : marketCode === "qa"
        ? "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Qatar. Shop in QAR with fast delivery across Qatar. With over 60 years of fragrance heritage, we blend tradition with modern elegance."
        : marketCode === "om"
          ? "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Oman. Shop in OMR with fast delivery across Oman. With over 60 years of fragrance heritage, we blend tradition with modern elegance."
          : marketCode === "sa"
            ? "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Saudi Arabia. Shop in SAR with fast delivery across Saudi Arabia. With over 60 years of fragrance heritage, we blend tradition with modern elegance."
            : siteConfig.description;

  return {
    title: `${siteConfig.name} | ${titleSuffix}`,
    description,
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
}

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
