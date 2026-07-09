import type { Metadata } from "next";
import { siteConfig, type Locale } from "@/config/site";
import { getMarketPathPrefix, type MarketCode } from "@/config/market";

interface AlternateUrls {
  en?: string;
  ar?: string;
}

interface GenerateMetadataParams {
  title?: string;
  description?: string;
  image?: string;
  locale: Locale;
  pathname: string;
  noIndex?: boolean;
  alternatePathnames?: AlternateUrls;
  keywords?: string[];
  marketCode?: MarketCode;
}

export const INDEX_FOLLOW_ROBOTS = {
  index: true,
  follow: true,
} satisfies Metadata["robots"];

export const INDEX_NOFOLLOW_ROBOTS = INDEX_FOLLOW_ROBOTS;

export const NOINDEX_NOFOLLOW_ROBOTS = {
  index: false,
  follow: false,
} satisfies Metadata["robots"];

export function generateMetadata({
  title,
  description,
  image,
  locale,
  pathname,
  noIndex,
  alternatePathnames,
  keywords,
  marketCode,
}: GenerateMetadataParams): Metadata {
  const marketTitleSuffix = marketCode ? getMarketSeoTitleSuffix(marketCode, locale) : "";
  const rawTitle = title || siteConfig.name;
  const fullTitle =
    marketTitleSuffix && !rawTitle.toLowerCase().includes(marketTitleSuffix.toLowerCase())
      ? `${rawTitle} | ${marketTitleSuffix}`
      : rawTitle;
  const fullDescription =
    description || (marketCode ? getMarketSeoDescription(marketCode, locale) : siteConfig.description);
  const ogImage = image || siteConfig.ogImage;
  const marketPrefix = marketCode ? getMarketPathPrefix(marketCode) : "";
  const canonicalUrl = `${siteConfig.url}${marketPrefix}/${locale}${pathname}`;
  const ogRegion = marketCode === "qa" ? "QA" : marketCode === "om" ? "OM" : marketCode === "sa" ? "SA" : "AE";
  const ogLocale = `${locale === "ar" ? "ar" : "en"}_${ogRegion}`;
  const ogAlternateLocale = `${locale === "ar" ? "en" : "ar"}_${ogRegion}`;

  const altEn = alternatePathnames?.en || `${siteConfig.url}${marketPrefix}/en${pathname}`;
  const altAr = alternatePathnames?.ar || `${siteConfig.url}${marketPrefix}/ar${pathname}`;

  return {
    title: fullTitle,
    description: fullDescription,
    metadataBase: new URL(siteConfig.url),
    robots: noIndex ? NOINDEX_NOFOLLOW_ROBOTS : INDEX_NOFOLLOW_ROBOTS,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: altEn,
        ar: altAr,
        "x-default": altEn,
      },
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: canonicalUrl,
      siteName: siteConfig.name,
      locale: ogLocale,
      alternateLocale: ogAlternateLocale,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function generateProductJsonLd(product: {
  name: string;
  description: string;
  image: string;
  images?: string[];
  price: string;
  salePrice?: string;
  currency: string;
  sku?: string;
  gtin?: string;
  availability: "InStock" | "OutOfStock";
  url: string;
  brandName?: string;
  category?: string;
  ratingValue?: string;
  reviewCount?: number;
  sellerName?: string;
  sellerUrl?: string;
  returnPolicyUrl?: string;
  shippingCountry?: string;
  shippingCurrency?: string;
}) {
  // Use all images if available, otherwise fall back to single image
  const imageList = product.images && product.images.length > 0
    ? product.images
    : [product.image || siteConfig.ogImage];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: imageList,
    sku: product.sku,
    ...(product.category ? { category: product.category } : {}),
    itemCondition: "https://schema.org/NewCondition",
    ...(product.brandName
      ? {
          brand: {
            "@type": "Brand",
            name: product.brandName,
          },
        }
      : {}),
    ...(product.ratingValue && product.reviewCount && product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.ratingValue,
            reviewCount: product.reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    ...(product.gtin ? { gtin: product.gtin } : {}),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      priceValidUntil: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split("T")[0],
      availability: `https://schema.org/${product.availability}`,
      url: product.url,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: product.sellerName || siteConfig.name,
        url: product.sellerUrl || siteConfig.url,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: product.shippingCountry || "AE",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: product.shippingCurrency || product.currency,
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 5,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "AE",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
        url: product.returnPolicyUrl || `${siteConfig.url}/en/returns`,
      },
    },
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateOrganizationJsonLd() {
  const socialLinks = Object.values(siteConfig.links).filter(Boolean);
  const logo = siteConfig.logoUrl || siteConfig.faviconUrl;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    ...(logo ? { logo } : {}),
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      contactType: "customer service",
      availableLanguage: ["English", "Arabic"],
      areaServed: ["AE", "SA", "KW", "BH", "QA", "OM"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressLocality: "Dubai",
      addressRegion: "Dubai",
    },
    sameAs: socialLinks,
  };
}

export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: ["en", "ar"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/en/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

const marketLocationData: Record<MarketCode, { country: string; currency: string; addressCountry: string }> = {
  intl: { country: "United Arab Emirates", currency: siteConfig.defaultCurrency, addressCountry: "AE" },
  qa: { country: "Qatar", currency: "QAR", addressCountry: "QA" },
  om: { country: "Oman", currency: "OMR", addressCountry: "OM" },
  sa: { country: "Saudi Arabia", currency: "SAR", addressCountry: "SA" },
};

export function generateLocalBusinessJsonLd(marketCode: MarketCode = "intl") {
  const socialLinks = Object.values(siteConfig.links).filter(Boolean);
  const logo = siteConfig.logoUrl || siteConfig.faviconUrl;
  const location = marketLocationData[marketCode];
  const prefix = getMarketPathPrefix(marketCode);
  const storeUrl = `${siteConfig.url}${prefix}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Store",
      "@id": `${storeUrl}/#organization`,
      name: siteConfig.name,
      url: storeUrl,
      ...(logo ? { image: logo } : {}),
      description: siteConfig.description,
      priceRange: "$$",
      telephone: siteConfig.contact.phone,
      address: {
        "@type": "PostalAddress",
        addressCountry: location.addressCountry,
      },
      areaServed: { "@type": "Country", name: location.country },
      currenciesAccepted: location.currency,
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Premium Fragrances",
        itemListElement: [
          { "@type": "OfferCatalog", name: "Perfumes" },
          { "@type": "OfferCatalog", name: "All Over Spray" },
          { "@type": "OfferCatalog", name: "Hair Mist" },
          { "@type": "OfferCatalog", name: "Gift Sets" },
        ],
      },
      sameAs: socialLinks,
    },
  ];
}

export function generateCollectionPageJsonLd(params: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: params.name,
    description: params.description,
    url: params.url,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

export function generateStoreJsonLd(stores: {
  name: string;
  address: string;
  city: string;
  country: string;
  url: string;
}[]) {
  return stores.map((store) => ({
    "@context": "https://schema.org",
    "@type": "Store",
    name: `${siteConfig.name} - ${store.name}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressLocality: store.city,
      addressCountry: store.country,
    },
    url: store.url,
    parentOrganization: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "10:00",
      closes: "22:00",
    },
    }));
}

interface MarketSeoCopy {
  titleSuffix: string;
  audience: string;
  description: string;
  descriptionAr: string;
  keywords: string[];
}

const MARKET_SEO_COPY: Record<MarketCode, { en: MarketSeoCopy; ar: MarketSeoCopy }> = {
  intl: {
    en: {
      titleSuffix: "Premium UAE Fragrances",
      audience: "UAE, GCC, and international shoppers",
      description:
        "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes. Shop in AED with fast delivery across the UAE and international markets. With over 60 years of fragrance heritage, we blend tradition with modern elegance.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes. تسوق بالدرهم الإماراتي مع توصيل سريع داخل الإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "UAE perfume",
        "Dubai perfume",
        "UAE fragrance store",
        "GCC perfume",
        "international perfume",
        "luxury perfume UAE",
      ],
    },
    ar: {
      titleSuffix: "عطور الإمارات الفاخرة",
      audience: "المتسوقون في الإمارات ودول الخليج والأسواق الدولية",
      description:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes. تسوق بالدرهم الإماراتي مع توصيل سريع داخل الإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes. تسوق بالدرهم الإماراتي مع توصيل سريع داخل الإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "عطور الإمارات",
        "عطور دبي",
        "متجر عطور إماراتي",
        "عطور الخليج",
        "عطور دولية",
        "عطور فاخرة الإمارات",
      ],
    },
  },
  qa: {
    en: {
      titleSuffix: "Premium Qatar Fragrances",
      audience: "Qatar shoppers",
      description:
        "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Qatar. Shop in QAR with fast delivery across Qatar. With over 60 years of fragrance heritage, we blend tradition with modern elegance.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Qatar. تسوق بالريال القطري مع توصيل سريع داخل قطر. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "Qatar perfume",
        "Doha perfume",
        "QAR perfume",
        "luxury perfume Qatar",
        "fragrance store Qatar",
      ],
    },
    ar: {
      titleSuffix: "عطور قطر الفاخرة",
      audience: "المتسوقون في قطر",
      description:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Qatar. تسوق بالريال القطري مع توصيل سريع داخل قطر. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Qatar. تسوق بالريال القطري مع توصيل سريع داخل قطر. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "عطور قطر",
        "عطور الدوحة",
        "عطور قطرية",
        "عطور فاخرة قطر",
        "متجر عطور قطر",
      ],
    },
  },
  om: {
    en: {
      titleSuffix: "Premium Oman Fragrances",
      audience: "Oman shoppers",
      description:
        "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Oman. Shop in OMR with fast delivery across Oman. With over 60 years of fragrance heritage, we blend tradition with modern elegance.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Oman. تسوق بالريال العُماني مع توصيل سريع داخل عمان. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "Oman perfume",
        "Muscat perfume",
        "OMR perfume",
        "luxury perfume Oman",
        "fragrance store Oman",
      ],
    },
    ar: {
      titleSuffix: "عطور عمان الفاخرة",
      audience: "المتسوقون في عمان",
      description:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Oman. تسوق بالريال العُماني مع توصيل سريع داخل عمان. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Oman. تسوق بالريال العُماني مع توصيل سريع داخل عمان. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "عطور عمان",
        "عطور مسقط",
        "عطور عمانية",
        "عطور فاخرة عمان",
        "متجر عطور عمان",
      ],
    },
  },
  sa: {
    en: {
      titleSuffix: "Premium Saudi Arabia Fragrances",
      audience: "Saudi Arabia shoppers",
      description:
        "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Saudi Arabia. Shop in SAR with fast delivery across Saudi Arabia. With over 60 years of fragrance heritage, we blend tradition with modern elegance.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Saudi Arabia. تسوق بالريال السعودي مع توصيل سريع داخل السعودية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "Saudi Arabia perfume",
        "Riyadh perfume",
        "SAR perfume",
        "luxury perfume Saudi Arabia",
        "fragrance store Saudi Arabia",
      ],
    },
    ar: {
      titleSuffix: "عطور السعودية الفاخرة",
      audience: "المتسوقون في السعودية",
      description:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Saudi Arabia. تسوق بالريال السعودي مع توصيل سريع داخل السعودية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes Saudi Arabia. تسوق بالريال السعودي مع توصيل سريع داخل السعودية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "عطور السعودية",
        "عطور الرياض",
        "عطور سعودية",
        "عطور فاخرة السعودية",
        "متجر عطور السعودية",
      ],
    },
  },
};

function dedupeKeywords(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export function getMarketSeoCopy(marketCode: MarketCode, locale: Locale): MarketSeoCopy {
  return MARKET_SEO_COPY[marketCode]?.[locale] || MARKET_SEO_COPY.intl[locale];
}

export function buildMarketSeoKeywords(
  baseKeywords: string[],
  marketCode: MarketCode,
  locale: Locale,
  extraKeywords: string[] = []
): string[] {
  const marketSeo = getMarketSeoCopy(marketCode, locale);
  return dedupeKeywords([
    ...baseKeywords,
    ...marketSeo.keywords,
    ...extraKeywords,
  ]);
}

export function getMarketSeoTitleSuffix(marketCode: MarketCode, locale: Locale): string {
  return getMarketSeoCopy(marketCode, locale).titleSuffix;
}

export function getMarketSeoAudience(marketCode: MarketCode, locale: Locale): string {
  return getMarketSeoCopy(marketCode, locale).audience;
}

export function getMarketSeoDescription(marketCode: MarketCode, locale: Locale): string {
  return locale === "ar"
    ? getMarketSeoCopy(marketCode, locale).descriptionAr
    : getMarketSeoCopy(marketCode, locale).description;
}

export function getMarketSeoImageFallback(): string {
  return "/opengraph-image";
}

export function generateContactPageJsonLd(params: {
  url: string;
  telephone: string;
  email: string;
  address: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${siteConfig.name}`,
    url: params.url,
    mainEntity: {
      "@type": "Organization",
      name: siteConfig.name,
      telephone: params.telephone,
      email: params.email,
      address: {
        "@type": "PostalAddress",
        addressCountry: "AE",
        addressLocality: params.address,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: params.telephone,
        contactType: "customer service",
        availableLanguage: ["English", "Arabic"],
      },
    },
  };
}

export function generateItemListJsonLd(params: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string; image: string; position: number }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: params.name,
    description: params.description,
    url: params.url,
    numberOfItems: params.items.length,
    itemListElement: params.items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: item.url,
      image: item.image,
    })),
  };
}

export function generateFAQJsonLd(
  items: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
