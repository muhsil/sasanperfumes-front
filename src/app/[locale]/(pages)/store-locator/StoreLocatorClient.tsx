"use client";

import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import type { Locale } from "@/config/site";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  Building2,
} from "lucide-react";

export interface Store {
  id: number;
  name: string;
  nameAr: string;
  floor: string;
  floorAr: string;
  city: string;
  cityAr: string;
  region: string;
  country: string;
  googleMapsUrl: string;
  image: string;
}

interface Region {
  id: string;
  name: string;
  nameAr: string;
  stores: Store[];
}

interface Country {
  id: string;
  name: string;
  nameAr: string;
  regions: Region[];
}

// Country name map for dynamic region grouping
const countryNames: Record<string, { en: string; ar: string }> = {
  uae: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
  oman: { en: "Oman", ar: "عمان" },
};

function buildCountries(storeList: Store[]): Country[] {
  const countryMap = new Map<string, Map<string, Store[]>>();
  for (const s of storeList) {
    if (!countryMap.has(s.country)) countryMap.set(s.country, new Map());
    const regionMap = countryMap.get(s.country)!;
    if (!regionMap.has(s.region)) regionMap.set(s.region, []);
    regionMap.get(s.region)!.push(s);
  }
  const result: Country[] = [];
  for (const [countryId, regionMap] of countryMap) {
    const names = countryNames[countryId] || { en: countryId, ar: countryId };
    const regions: Region[] = [];
    for (const [regionId, regionStores] of regionMap) {
      const cityName = regionStores[0]?.city || regionId;
      const cityAr = regionStores[0]?.cityAr || regionId;
      regions.push({ id: regionId, name: cityName, nameAr: cityAr, stores: regionStores });
    }
    result.push({ id: countryId, name: names.en, nameAr: names.ar, regions });
  }
  return result;
}

interface StoreLocatorDict {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  stores: string;
  countries: string;
  getDirections: string;
  openingHours: string;
  openingHoursValue: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
  contactUs: string;
  storesIn: string;
  region: string;
  regions: string;
  waitingTitle: string;
  waitingSubtitle: string;
}

interface CMSContent {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  openingHours: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
}

interface StoreLocatorClientProps {
  dict: StoreLocatorDict;
  locale: string;
  stores: Store[];
  content: CMSContent;
}

export default function StoreLocatorClient({ dict, locale, stores: storeList, content: cms }: StoreLocatorClientProps) {
  const marketPrefix = useMarketPrefix();
  const isRTL = locale === "ar";
  const countries = buildCountries(storeList);

  const breadcrumbItems = [
    { name: cms.heroSubtitle || dict.heroSubtitle, href: `${marketPrefix}/${locale}/store-listing` },
  ];

  const content = {
    heroTitle: cms.heroTitle || dict.heroTitle,
    heroSubtitle: cms.heroSubtitle || dict.heroSubtitle,
    heroDescription: cms.heroDescription || dict.heroDescription,
    storesCount: `${storeList.length} ${dict.stores}`,
    countriesCount: `${countries.length} ${dict.countries}`,
    getDirections: dict.getDirections,
    openingHours: dict.openingHours,
    openingHoursValue: cms.openingHours,
    ctaTitle: cms.ctaTitle,
    ctaSubtitle: cms.ctaSubtitle,
    ctaButton: cms.ctaButton,
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-[#f8f3ef] px-4 pb-6 pt-8 text-brand-primary md:pb-8 md:pt-10">
        <p className="mb-2 text-lg font-normal tracking-normal text-brand-primary/60">{content.heroSubtitle}</p>
        <h1 className="text-[36px] font-normal leading-none tracking-normal md:text-[48px]">{content.heroTitle}</h1>
        {content.heroDescription && (
          <p className="mt-4 max-w-[620px] text-[15px] leading-6 tracking-normal text-brand-primary md:text-base">{content.heroDescription}</p>
        )}
        <div className="mt-4 flex items-center gap-6 text-xs text-brand-primary/40">
          <span>{content.storesCount}</span>
          <span>{content.countriesCount}</span>
        </div>
      </section>

      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Opening Hours Banner */}
      <section className="border-b border-[#e7ded7] bg-white">
        <div className="px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:gap-8">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-brand-primary/40" />
              <div>
                <p className="text-xs font-normal text-brand-primary">{content.openingHours}</p>
                <p className="text-xs text-brand-primary/60">{content.openingHoursValue}</p>
              </div>
            </div>
            <div className="hidden h-8 w-px bg-[#e7ded7] md:block" />
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-brand-primary/40" />
              <p className="text-xs font-normal text-brand-primary">{dict.contactUs}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stores by Country */}
      <section className="bg-white py-8 md:py-10">
        <div className="px-4">
          {countries.map((country, countryIndex) => (
            <div key={country.id} className={countryIndex > 0 ? "mt-12" : ""}>
              {/* Country Header */}
              <div className="mb-6 border-b border-[#e7ded7] pb-4">
                <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">
                  {isRTL ? country.nameAr : country.name}
                </h2>
                <p className="mt-1 text-xs text-brand-primary/40">
                  {`${country.regions.reduce((acc, r) => acc + r.stores.length, 0)} ${dict.storesIn} ${country.regions.length} ${country.regions.length === 1 ? dict.region : dict.regions}`}
                </p>
              </div>

              {/* Store Cards Grid */}
              <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
                {country.regions.flatMap((region) =>
                  region.stores.map((store) => (
                    <div key={store.id} className="group border border-[#e7ded7] bg-white">
                      {/* Store Image */}
                      <div className="relative h-48 overflow-hidden bg-[#f8f3ef]">
                        {store.image ? (
                          <Image
                            src={store.image}
                            alt={isRTL ? store.nameAr : store.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-5xl font-light text-brand-primary/20">
                            {(isRTL ? store.nameAr : store.name).slice(0, 1)}
                          </div>
                        )}
                      </div>

                      {/* Store Details */}
                      <div className="p-5">
                        <h4 className="text-sm font-normal text-brand-primary">
                          {isRTL ? store.nameAr : store.name}
                        </h4>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-brand-primary/60">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">{isRTL ? store.floorAr : store.floor}</span>
                          </div>
                          <div className="flex items-center gap-2 text-brand-primary/60">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">{isRTL ? store.cityAr : store.city}</span>
                          </div>
                        </div>

                        <a
                          href={store.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
                        >
                          <Navigation className="h-3 w-3" />
                          {content.getDirections}
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Waiting / Quick Links Section */}
      <section className="bg-[#f8f3ef] py-8 md:py-10">
        <div className="px-4">
          <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">{dict.waitingTitle}</h2>
          <p className="mt-2 text-sm text-brand-primary/60">{dict.waitingSubtitle}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {countries.map((country) => (
              <a
                key={country.id}
                href={country.regions[0]?.stores[0]?.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-[#e7ded7] bg-white px-4 py-2 text-xs font-normal text-brand-primary"
              >
                <MapPin className="h-3.5 w-3.5" />
                {isRTL ? country.nameAr : country.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-8 md:py-10">
        <div className="px-4">
          <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">{content.ctaTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-brand-primary/60">{content.ctaSubtitle}</p>
          <Link
            href={`${marketPrefix}/${locale}/shop`}
            className="mt-4 inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
          >
            {content.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
