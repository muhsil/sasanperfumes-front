import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/config/site";
import { getStaticPageContent, pickLocale, mapRepeater, getFeatureToggles } from "@/lib/api/wordpress";
import StoreLocatorClient from "./StoreLocatorClient";

export { generateMetadata } from "./layout";

interface StoreLocatorPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StoreLocatorPage({ params }: StoreLocatorPageProps) {
  const { locale } = await params;
  const validLocale = (locale === "ar" ? "ar" : "en") as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_store_locator_enabled) notFound();
  const dictionary = await getDictionary(validLocale);
  const dict = dictionary.pages.storeLocator;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wp = await getStaticPageContent("store-locator") as Record<string, any> | null;

  const heroTitle = pickLocale(wp?.hero_title, validLocale, dict.heroTitle);
  const heroSubtitle = pickLocale(wp?.hero_subtitle, validLocale, dict.heroSubtitle);
  const heroDescription = pickLocale(wp?.hero_description, validLocale, dict.heroDescription);
  const openingHours = pickLocale(wp?.opening_hours, validLocale, "");
  const ctaTitle = pickLocale(wp?.cta_title, validLocale, "");
  const ctaSubtitle = pickLocale(wp?.cta_subtitle, validLocale, "");
  const ctaButton = pickLocale(wp?.cta_button, validLocale, "");

  // Map store data from CMS repeater
  const cmsStores = mapRepeater(wp?.stores, validLocale, (item, loc) => ({
    id: 0,
    name: loc === "ar" ? (item.name?.ar || item.name_ar || "") : (item.name?.en || item.name_en || ""),
    nameAr: item.name?.ar || item.name_ar || "",
    floor: loc === "ar" ? (item.floor?.ar || item.floor_ar || "") : (item.floor?.en || item.floor_en || ""),
    floorAr: item.floor?.ar || item.floor_ar || "",
    city: loc === "ar" ? (item.city?.ar || item.city_ar || "") : (item.city?.en || item.city_en || ""),
    cityAr: item.city?.ar || item.city_ar || "",
    region: item.region || "",
    country: item.country || "",
    googleMapsUrl: item.google_maps_url || "",
    image: item.image || "/images/placeholder-hero.svg",
  })).map((s, i) => ({ ...s, id: i + 1 }));

  const content = {
    heroTitle,
    heroSubtitle,
    heroDescription,
    openingHours,
    ctaTitle,
    ctaSubtitle,
    ctaButton,
  };

  return (
    <StoreLocatorClient
      dict={dict}
      locale={validLocale}
      stores={cmsStores}
      content={content}
    />
  );
}
