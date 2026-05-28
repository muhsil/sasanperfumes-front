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

export function generateMetadata({
  title,
  description,
}: GenerateMetadataParams): Metadata {
  // Don't append site name here - the layout template already does this
  // Layout uses: template: `%s | ${siteConfig.name}`
  const fullTitle = title || siteConfig.name;
  const fullDescription = description || siteConfig.description;

  return {
    title: fullTitle,
    description: fullDescription,
    metadataBase: new URL(siteConfig.url),
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
    description: "ShapeHive is a UAE-based luxury perfume house offering handcrafted premium fragrances, Arabian oud, body care products, home fragrances, and aromatic oils. Free delivery across the UAE.",
    foundingDate: "2014",
    foundingLocation: "Dubai, UAE",
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

/**
 * Store location data for LocalBusiness schema.
 * Each entry represents a physical retail location.
 */
const STORE_LOCATIONS = [
  {
    name: "ShapeHive - Yas Mall",
    streetAddress: "Yas Mall, Ground Floor",
    city: "Abu Dhabi",
    region: "Abu Dhabi",
    country: "AE",
    lat: 24.4886,
    lng: 54.6073,
    mapsUrl: "https://maps.google.com/?q=Yas+Mall+Abu+Dhabi",
  },
  {
    name: "ShapeHive - Bawabat Al Sharq Mall",
    streetAddress: "Bawabat Al Sharq Mall, First Floor",
    city: "Abu Dhabi",
    region: "Abu Dhabi",
    country: "AE",
    lat: 24.4284,
    lng: 54.4700,
    mapsUrl: "https://maps.google.com/?q=Bawabat+Al+Sharq+Mall+Abu+Dhabi",
  },
  {
    name: "ShapeHive - Bawadi Mall",
    streetAddress: "Bawadi Mall, Ground Floor",
    city: "Al Ain",
    region: "Abu Dhabi",
    country: "AE",
    lat: 24.2075,
    lng: 55.7447,
    mapsUrl: "https://maps.google.com/?q=Bawadi+Mall+Al+Ain",
  },
  {
    name: "ShapeHive - Makani Zakher Mall",
    streetAddress: "Makani Zakher Mall, Ground Floor",
    city: "Al Ain",
    region: "Abu Dhabi",
    country: "AE",
    lat: 24.1776,
    lng: 55.6950,
    mapsUrl: "https://maps.google.com/?q=Makani+Zakher+Mall+Al+Ain",
  },
  {
    name: "ShapeHive - Fujairah City Centre",
    streetAddress: "Fujairah City Centre, Ground Floor",
    city: "Fujairah",
    region: "Fujairah",
    country: "AE",
    lat: 25.1288,
    lng: 56.3264,
    mapsUrl: "https://maps.google.com/?q=Fujairah+City+Centre",
  },
  {
    name: "ShapeHive - Oman Mall",
    streetAddress: "Oman Mall, Ground Floor",
    city: "Muscat",
    region: "Muscat",
    country: "OM",
    lat: 23.5880,
    lng: 58.1711,
    mapsUrl: "https://maps.google.com/?q=Oman+Mall+Muscat",
  },
];

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
      description: "Luxury perfume house in the UAE offering premium handcrafted fragrances, Arabian oud, body care, and home scents.",
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
          { "@type": "OfferCatalog", name: "Arabian Oud" },
          { "@type": "OfferCatalog", name: "Body Care" },
          { "@type": "OfferCatalog", name: "Home Fragrances" },
          { "@type": "OfferCatalog", name: "Aromatic Oils" },
          { "@type": "OfferCatalog", name: "Gift Sets" },
        ],
      },
      sameAs: socialLinks,
    },
    // Individual store locations
    ...STORE_LOCATIONS.map((store) => ({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: store.name,
      image: `${siteConfig.url}/logo.png`,
      url: `${siteConfig.url}/en/store-locator`,
      telephone: "+971-50-607-1405",
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        streetAddress: store.streetAddress,
        addressLocality: store.city,
        addressRegion: store.region,
        addressCountry: store.country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: store.lat,
        longitude: store.lng,
      },
      hasMap: store.mapsUrl,
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "10:00",
        closes: "22:00",
      },
      parentOrganization: {
        "@type": "Organization",
        name: siteConfig.name,
        "@id": `${siteConfig.url}/#organization`,
      },
    })),
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
    name: `ShapeHive - ${store.name}`,
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
    name: "Contact ShapeHive",
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
