import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getWcCredentials } from "@/lib/utils/loadEnv";
import { getRequestMarket } from "@/lib/market/server";
import { getShippingFreightCountries } from "@/config/shipping";
import { backendMarketHeaders, wpJsonBaseForMarket } from "@/lib/utils/backendFetch";

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

interface ShippingZone {
  id: number;
  name: string;
  order: number;
}

interface ShippingZoneLocation {
  code: string;
  type: "country" | "state" | "postcode" | "continent";
}

interface WCCountry {
  code: string;
  name: string;
}

const MARKET_SHIPPING_COUNTRIES = {
  qa: "QA",
  om: "OM",
  sa: "SA",
} as const;

const MARKET_SHIPPING_COUNTRY_NAMES = {
  QA: "Qatar",
  OM: "Oman",
  SA: "Saudi Arabia",
} as const;

const CONTINENT_COUNTRIES: Record<string, string[]> = {
  AF: ["DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ", "NA", "NE", "NG", "RE", "RW", "SH", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH", "ZM", "ZW"],
  AN: ["AQ", "BV", "TF", "HM", "GS"],
  AS: ["AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CX", "CC", "GE", "HK", "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MO", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE"],
  EU: ["AX", "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FO", "FI", "FR", "DE", "GI", "GR", "GG", "VA", "HU", "IS", "IE", "IM", "IT", "JE", "LV", "LI", "LT", "LU", "MK", "MT", "MD", "MC", "ME", "NL", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SJ", "SE", "CH", "UA", "GB"],
  NA: ["AI", "AG", "AW", "BS", "BB", "BZ", "BM", "BQ", "VG", "CA", "KY", "CR", "CU", "CW", "DM", "DO", "SV", "GL", "GD", "GP", "GT", "HT", "HN", "JM", "MQ", "MX", "MS", "NI", "PA", "PR", "BL", "KN", "LC", "MF", "PM", "VC", "SX", "TT", "TC", "US", "VI"],
  OC: ["AS", "AU", "CK", "FJ", "PF", "GU", "KI", "MH", "FM", "NR", "NC", "NZ", "NU", "NF", "MP", "PW", "PG", "PN", "WS", "SB", "TK", "TO", "TV", "UM", "VU", "WF"],
  SA: ["AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF", "GY", "PY", "PE", "SR", "UY", "VE"],
};

export async function GET(request: NextRequest) {
  try {
    const marketHint = request.nextUrl.searchParams.get("market");
    const market = await getRequestMarket(marketHint);
    const authParams = getBasicAuthParams(market.code);
    const apiBase = `${wpJsonBaseForMarket(market.code)}/wc/v3`;

    const marketCountryCode = MARKET_SHIPPING_COUNTRIES[market.code as keyof typeof MARKET_SHIPPING_COUNTRIES];
    if (marketCountryCode) {
      let countryName: string = MARKET_SHIPPING_COUNTRY_NAMES[marketCountryCode as keyof typeof MARKET_SHIPPING_COUNTRY_NAMES] || marketCountryCode;
      const countriesUrl = `${apiBase}/data/countries?${authParams}`;
      const countriesResponse = await fetch(countriesUrl, {
        method: "GET",
        headers: backendMarketHeaders(market.code, { "Content-Type": "application/json" }),
      });

      if (countriesResponse.ok) {
        const wcCountries = (await countriesResponse.json()) as WCCountry[];
        countryName = wcCountries.find((c) => c.code === marketCountryCode)?.name || countryName;
      }

      return NextResponse.json({
        success: true,
        countries: [{ code: marketCountryCode, name: countryName }],
        has_rest_of_world: false,
        zone_count: 0,
      });
    }

    const zonesUrl = `${apiBase}/shipping/zones?${authParams}`;
    const zonesResponse = await fetch(zonesUrl, {
      method: "GET",
      headers: backendMarketHeaders(market.code, { "Content-Type": "application/json" }),
    });

    if (!zonesResponse.ok) {
      return NextResponse.json(
        { success: false, error: { code: "zones_fetch_error", message: "Failed to fetch shipping zones" } },
        { status: zonesResponse.status }
      );
    }

    const zones: ShippingZone[] = await zonesResponse.json();

    const countryCodes = new Set<string>();
    let hasRestOfWorld = false;

    const locationPromises = zones.map(async (zone) => {
      const locationsUrl = `${apiBase}/shipping/zones/${zone.id}/locations?${authParams}`;
      const locationsResponse = await fetch(locationsUrl, {
        method: "GET",
        headers: backendMarketHeaders(market.code, { "Content-Type": "application/json" }),
      });

      if (!locationsResponse.ok) return [];
      return locationsResponse.json() as Promise<ShippingZoneLocation[]>;
    });

    const allLocations = await Promise.all(locationPromises);

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const locations = allLocations[i];

      if (zone.id === 0 || zone.name === "Locations not covered by your other zones") {
        const methodsUrl = `${apiBase}/shipping/zones/${zone.id}/methods?${authParams}`;
        const methodsResponse = await fetch(methodsUrl, {
          method: "GET",
          headers: backendMarketHeaders(market.code, { "Content-Type": "application/json" }),
        });
        if (methodsResponse.ok) {
          const methods = await methodsResponse.json();
          if (Array.isArray(methods) && methods.some((m: { enabled: boolean }) => m.enabled)) {
            hasRestOfWorld = true;
          }
        }
        continue;
      }

      if (!locations || locations.length === 0) continue;

      for (const location of locations) {
        if (location.type === "country") {
          countryCodes.add(location.code);
        } else if (location.type === "state") {
          const countryCode = location.code.split(":")[0];
          if (countryCode) countryCodes.add(countryCode);
        } else if (location.type === "continent") {
          const continentCountries = CONTINENT_COUNTRIES[location.code];
          if (continentCountries) {
            continentCountries.forEach((code) => countryCodes.add(code));
          }
        }
      }
    }

    for (const freightCountry of getShippingFreightCountries()) {
      countryCodes.add(freightCountry);
    }

    let wcCountries: WCCountry[] = [];
    const countriesUrl = `${apiBase}/data/countries?${authParams}`;
    const countriesResponse = await fetch(countriesUrl, {
      method: "GET",
      headers: backendMarketHeaders(market.code, { "Content-Type": "application/json" }),
    });

    if (countriesResponse.ok) {
      wcCountries = await countriesResponse.json();
    }

    const countryMap = new Map<string, string>();
    for (const c of wcCountries) {
      countryMap.set(c.code, c.name);
    }

    let shippingCountries: { code: string; name: string }[];

    if (countryCodes.size > 0) {
      shippingCountries = Array.from(countryCodes)
        .map((code) => ({
          code,
          name: countryMap.get(code) || code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else if (hasRestOfWorld) {
      shippingCountries = wcCountries
        .map((c) => ({ code: c.code, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      shippingCountries = [];
    }

    return NextResponse.json({
      success: true,
      countries: shippingCountries,
      has_rest_of_world: hasRestOfWorld,
      zone_count: zones.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      },
      { status: 500 }
    );
  }
}
