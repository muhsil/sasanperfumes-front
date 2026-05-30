import type { Metadata } from "next";
import { siteConfig, type Locale } from "@/config/site";

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
}

export const INDEX_NOFOLLOW_ROBOTS = {
  index: true,
  follow: false,
} satisfies Metadata["robots"];

export const NOINDEX_NOFOLLOW_ROBOTS = {
  index: false,
  follow: false,
} satisfies Metadata["robots"];

export function generateMetadata({
  title,
  description,
  noIndex,
}: GenerateMetadataParams): Metadata {
  // Don't append site name here - the layout template already does this
  // Layout uses: template: `%s | ${siteConfig.name}`
  const fullTitle = title || siteConfig.name;
  const fullDescription = description || siteConfig.description;

  return {
    title: fullTitle,
    description: fullDescription,
    metadataBase: new URL(siteConfig.url),
    robots: noIndex ? NOINDEX_NOFOLLOW_ROBOTS : INDEX_NOFOLLOW_ROBOTS,
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
}) {
  // Use all images if available, otherwise fall back to single image
  const imageList = product.images && product.images.length > 0
    ? product.images
    : [product.image];

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
        name: siteConfig.name,
        url: siteConfig.url,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "AE",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "AED",
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
        url: `${siteConfig.url}/en/returns`,
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

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: "Sasan Perfumes is a UAE fragrance store offering perfumes, hair mist, all over sprays, gift sets, and private-label perfume support.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+971-50-607-1405",
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

export function generateLocalBusinessJsonLd() {
  const socialLinks = Object.values(siteConfig.links).filter(Boolean);

  return [
    // Parent organization / online store
    {
      "@context": "https://schema.org",
      "@type": "Store",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      image: `${siteConfig.url}/logo.png`,
      description: "UAE fragrance store offering perfumes, hair mist, all over sprays, gift sets, and private-label perfume support.",
      priceRange: "$$",
      telephone: "+971-50-607-1405",
      areaServed: [
        { "@type": "Country", name: "United Arab Emirates" },
        { "@type": "Country", name: "Saudi Arabia" },
        { "@type": "Country", name: "Kuwait" },
        { "@type": "Country", name: "Bahrain" },
        { "@type": "Country", name: "Qatar" },
        { "@type": "Country", name: "Oman" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Premium Fragrances",
        itemListElement: [
          { "@type": "OfferCatalog", name: "Perfumes" },
          { "@type": "OfferCatalog", name: "All Over Spray" },
          { "@type": "OfferCatalog", name: "Hair Mist" },
          { "@type": "OfferCatalog", name: "Gift Sets" },
          { "@type": "OfferCatalog", name: "Private Labeling" },
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
    name: `Sasan Perfumes - ${store.name}`,
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

export function generateContactPageJsonLd(params: {
  url: string;
  telephone: string;
  email: string;
  address: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Sasan Perfumes",
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
