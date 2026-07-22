import type { Metadata } from "next";
import { siteConfig, type Locale } from "@/config/site";
import { getMarketCommerceSeoConfig, getMarketPathPrefix, type MarketCode } from "@/config/market";

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

const SEO_TITLE_MAX_LENGTH = 65;
const SEO_DESCRIPTION_MAX_LENGTH = 160;

function truncateAtWord(value: string, maxLength: number): string {
  const normalized = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const contentLength = Math.max(1, maxLength - 3);
  const shortened = normalized.slice(0, contentLength + 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || normalized.slice(0, contentLength).trim()}...`;
}

function getConciseMarketTitleSuffix(marketCode: MarketCode, locale: Locale): string {
  const suffixes: Record<MarketCode, Record<Locale, string>> = {
    intl: { en: "Sasan Perfumes UAE", ar: "Sasan Perfumes UAE" },
    qa: { en: "Sasan Perfumes Qatar", ar: "Sasan Perfumes Qatar" },
    om: { en: "Sasan Perfumes Oman", ar: "Sasan Perfumes Oman" },
    sa: { en: "Sasan Perfumes Saudi", ar: "Sasan Perfumes Saudi" },
  };
  return suffixes[marketCode][locale];
}

function buildSeoTitle(rawTitle: string, marketCode: MarketCode | undefined, locale: Locale): string {
  if (!marketCode) return truncateAtWord(rawTitle, SEO_TITLE_MAX_LENGTH);

  const suffix = getConciseMarketTitleSuffix(marketCode, locale);
  if (rawTitle.toLowerCase().includes(suffix.toLowerCase())) {
    return truncateAtWord(rawTitle, SEO_TITLE_MAX_LENGTH);
  }

  const availableTitleLength = Math.max(24, SEO_TITLE_MAX_LENGTH - suffix.length - 3);
  return `${truncateAtWord(rawTitle, availableTitleLength).replace(/\.\.\.$/, "")} | ${suffix}`;
}

function isWrongMarketDescription(value: string, marketCode: MarketCode): boolean {
  if (marketCode === "intl") return false;
  const normalized = value.toLowerCase();
  const marketName = getMarketCommerceSeoConfig(marketCode).countryName.toLowerCase();
  const mentionsTargetMarket = normalized.includes(marketName) ||
    (marketCode === "qa" && /qatar|قطر/.test(normalized)) ||
    (marketCode === "om" && /oman|عمان|عُمان/.test(normalized)) ||
    (marketCode === "sa" && /saudi|السعودية/.test(normalized));
  const mentionsUaeOnly = /\baed\b|\bdubai\b|\buae\b|دبي|الإمارات/.test(normalized);
  return mentionsUaeOnly && !mentionsTargetMarket;
}

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
  const rawTitle = title || siteConfig.name;
  const fullTitle = buildSeoTitle(rawTitle, marketCode, locale);
  const requestedDescription = description || (marketCode ? getMarketSeoDescription(marketCode, locale) : siteConfig.description);
  const localizedDescription = marketCode && isWrongMarketDescription(requestedDescription, marketCode)
    ? getMarketSeoDescription(marketCode, locale)
    : requestedDescription;
  const fullDescription = truncateAtWord(
    localizedDescription,
    SEO_DESCRIPTION_MAX_LENGTH
  );
  const ogImage = image || siteConfig.ogImage;
  const marketPrefix = marketCode ? getMarketPathPrefix(marketCode) : "";
  const canonicalUrl = `${siteConfig.url}${marketPrefix}/${locale}${pathname}`;
  const ogRegion = marketCode === "qa" ? "QA" : marketCode === "om" ? "OM" : marketCode === "sa" ? "SA" : "AE";
  const ogLocale = `${locale === "ar" ? "ar" : "en"}_${ogRegion}`;
  const ogAlternateLocale = `${locale === "ar" ? "en" : "ar"}_${ogRegion}`;

  const altEn = alternatePathnames?.en || `${siteConfig.url}${marketPrefix}/en${pathname}`;
  const altAr = alternatePathnames?.ar || `${siteConfig.url}${marketPrefix}/ar${pathname}`;

  return {
    title: { absolute: fullTitle },
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
  shippingRate?: number;
  returnPolicyDays?: number;
  returnFees?: "FreeReturn" | "ReturnShippingFees";
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
          value: String(product.shippingRate ?? 0),
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
      ...(product.returnPolicyDays && product.returnPolicyDays > 0
        ? {
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: product.shippingCountry || "AE",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: product.returnPolicyDays,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: `https://schema.org/${product.returnFees || "ReturnShippingFees"}`,
              url: product.returnPolicyUrl || `${siteConfig.url}/en/returns`,
            },
          }
        : {}),
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

export function generateOrganizationJsonLd(marketCode: MarketCode = "intl") {
  const socialLinks = Object.values(siteConfig.links).filter(Boolean);
  const logo = siteConfig.logoUrl || siteConfig.faviconUrl;
  const market = getMarketCommerceSeoConfig(marketCode);
  const prefix = getMarketPathPrefix(marketCode);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: `${siteConfig.url}${prefix}`,
    ...(logo ? { logo } : {}),
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      contactType: "customer service",
      availableLanguage: ["English", "Arabic"],
      areaServed: market.countryCode,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: market.countryCode,
    },
    sameAs: socialLinks,
  };
}

export function generateWebSiteJsonLd(marketCode: MarketCode = "intl", locale: Locale = "en") {
  const prefix = getMarketPathPrefix(marketCode);
  const marketUrl = `${siteConfig.url}${prefix}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: marketUrl,
    description: siteConfig.description,
    inLanguage: ["en", "ar"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${marketUrl}/${locale}/search?q={search_term_string}`,
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

interface MarketHomeSeoContent {
  heading: string;
  paragraphs: string[];
}

const MARKET_HOME_SEO_CONTENT: Record<MarketCode, { en: MarketHomeSeoContent; ar: MarketHomeSeoContent }> = {
  intl: {
    en: {
      heading: "Shop premium perfumes online in Dubai",
      paragraphs: [
        "Discover Sasan Perfumes' collection of long-lasting perfumes, Arabian oud, musk, amber, hair mists, body fragrances, and perfume gift sets for women and men. Shop online in AED for fragrance delivery across Dubai and the UAE.",
        "From everyday signature scents to elegant gifts, our fragrance house brings more than 60 years of perfume heritage to customers in Dubai, Abu Dhabi, Sharjah, and across the Emirates.",
      ],
    },
    ar: {
      heading: "تسوق العطور الفاخرة أونلاين في دبي",
      paragraphs: [
        "اكتشف مجموعة ساسان للعطور التي تضم عطورًا ثابتة، والعود العربي، والمسك، والعنبر، ومعطرات الشعر والجسم، وأطقم هدايا العطور للنساء والرجال. تسوق أونلاين بالدرهم الإماراتي مع التوصيل داخل دبي والإمارات.",
        "من العطور اليومية المميزة إلى الهدايا الأنيقة، نقدم خبرة تتجاوز 60 عامًا لعشاق العطور في دبي وأبوظبي والشارقة وجميع أنحاء الإمارات.",
      ],
    },
  },
  qa: {
    en: {
      heading: "Shop premium perfumes online in Qatar",
      paragraphs: [
        "Explore long-lasting perfumes, Arabian oud, musk, amber, hair mists, body fragrances, and perfume gift sets for women and men from Sasan Perfumes Qatar. Shop online in QAR with delivery across Qatar.",
        "Find an everyday signature scent or a memorable fragrance gift backed by more than 60 years of perfume heritage, available to shoppers in Doha and throughout Qatar.",
      ],
    },
    ar: {
      heading: "تسوق العطور الفاخرة أونلاين في قطر",
      paragraphs: [
        "اكتشف العطور الثابتة والعود العربي والمسك والعنبر ومعطرات الشعر والجسم وأطقم هدايا العطور للنساء والرجال من ساسان للعطور قطر. تسوق أونلاين بالريال القطري مع التوصيل داخل قطر.",
        "اختر عطرك اليومي المميز أو هدية عطرية لا تُنسى من دار عطور بخبرة تتجاوز 60 عامًا، متاحة للمتسوقين في الدوحة وجميع أنحاء قطر.",
      ],
    },
  },
  om: {
    en: {
      heading: "Shop premium perfumes online in Oman",
      paragraphs: [
        "Explore long-lasting perfumes, Arabian oud, musk, amber, hair mists, body fragrances, and perfume gift sets for women and men from Sasan Perfumes Oman. Shop online in OMR with delivery across Oman.",
        "Choose an everyday signature scent or an elegant perfume gift from a fragrance house with more than 60 years of heritage, available to shoppers in Muscat and throughout Oman.",
      ],
    },
    ar: {
      heading: "تسوق العطور الفاخرة أونلاين في عُمان",
      paragraphs: [
        "اكتشف العطور الثابتة والعود العربي والمسك والعنبر ومعطرات الشعر والجسم وأطقم هدايا العطور للنساء والرجال من ساسان للعطور عُمان. تسوق أونلاين بالريال العُماني مع التوصيل داخل عُمان.",
        "اختر عطرك اليومي المميز أو هدية عطرية أنيقة من دار عطور بخبرة تتجاوز 60 عامًا، متاحة للمتسوقين في مسقط وجميع أنحاء عُمان.",
      ],
    },
  },
  sa: {
    en: {
      heading: "Shop premium perfumes online in Saudi Arabia",
      paragraphs: [
        "Explore long-lasting perfumes, Arabian oud, musk, amber, hair mists, body fragrances, and perfume gift sets for women and men from Sasan Perfumes Saudi Arabia. Shop online in SAR with delivery across the Kingdom.",
        "Find an everyday signature scent or a memorable fragrance gift backed by more than 60 years of perfume heritage, available to shoppers in Riyadh, Jeddah, and across Saudi Arabia.",
      ],
    },
    ar: {
      heading: "تسوق العطور الفاخرة أونلاين في السعودية",
      paragraphs: [
        "اكتشف العطور الثابتة والعود العربي والمسك والعنبر ومعطرات الشعر والجسم وأطقم هدايا العطور للنساء والرجال من ساسان للعطور السعودية. تسوق أونلاين بالريال السعودي مع التوصيل داخل المملكة.",
        "اختر عطرك اليومي المميز أو هدية عطرية لا تُنسى من دار عطور بخبرة تتجاوز 60 عامًا، متاحة للمتسوقين في الرياض وجدة وجميع أنحاء السعودية.",
      ],
    },
  },
};

const MARKET_SEO_COPY: Record<MarketCode, { en: MarketSeoCopy; ar: MarketSeoCopy }> = {
  intl: {
    en: {
      titleSuffix: "Premium Dubai Fragrances",
      audience: "UAE, GCC, and international shoppers",
      description:
        "Premium perfumes, oud, hair mist, and gift sets from Sasan Perfumes Dubai. Shop in AED with fast delivery across Dubai, the UAE, and international markets. With over 60 years of fragrance heritage, we blend tradition with modern elegance.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes دبي. تسوق بالدرهم الإماراتي مع توصيل سريع داخل دبي والإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      keywords: [
        "Dubai perfume",
        "Dubai fragrance store",
        "Dubai luxury perfume",
        "UAE perfume",
        "GCC perfume",
        "international perfume",
        "luxury perfume Dubai",
      ],
    },
    ar: {
      titleSuffix: "عطور دبي الفاخرة",
      audience: "المتسوقون في دبي والإمارات ودول الخليج والأسواق الدولية",
      description:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes دبي. تسوق بالدرهم الإماراتي مع توصيل سريع داخل دبي والإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
      descriptionAr:
        "عطور فاخرة، عود، معطر شعر، وطقم هدايا من Sasan Perfumes دبي. تسوق بالدرهم الإماراتي مع توصيل سريع داخل دبي والإمارات والأسواق الدولية. بخبرة عطرية تتجاوز 60 عامًا، نمزج التراث بالأناقة العصرية.",
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

const MARKET_SEO_LOCATION_COPY: Record<MarketCode, { en: string; ar: string }> = {
  intl: { en: "Dubai", ar: "دبي" },
  qa: { en: "Qatar", ar: "قطر" },
  om: { en: "Oman", ar: "عُمان" },
  sa: { en: "Saudi Arabia", ar: "السعودية" },
};

export function getMarketSeoLocation(marketCode: MarketCode, locale: Locale): string {
  return MARKET_SEO_LOCATION_COPY[marketCode]?.[locale] || MARKET_SEO_LOCATION_COPY.intl[locale];
}

export function getMarketSeoDescription(marketCode: MarketCode, locale: Locale): string {
  return locale === "ar"
    ? getMarketSeoCopy(marketCode, locale).descriptionAr
    : getMarketSeoCopy(marketCode, locale).description;
}

export function getMarketHomeSeoContent(marketCode: MarketCode, locale: Locale): MarketHomeSeoContent {
  return MARKET_HOME_SEO_CONTENT[marketCode]?.[locale] || MARKET_HOME_SEO_CONTENT.intl[locale];
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
