import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { getRequestMarket } from "@/lib/market/server";
import { resolveFreightPrice } from "@/config/shipping";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WC_API_BASE = `${siteConfig.apiUrl}/wp-json/wc/v3`;

function getBasicAuthParams(marketCode?: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(marketCode);
  return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
}

export interface ShippingRate {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  taxes: string;
  instance_id: number;
  method_id: string;
  meta_data: Array<{ key: string; value: string }>;
  selected: boolean;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
  free_shipping_min_amount?: number;
  free_shipping_eligible?: boolean;
}

export interface ShippingPackage {
  package_id: number;
  name: string;
  destination: {
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  items: Array<{
    key: string;
    name: string;
    quantity: number;
  }>;
  shipping_rates: ShippingRate[];
}

interface WeightRule {
  minWeight: number;
  maxWeight: number;
  cost: number;
}

interface ZoneMethod {
  id: number;
  instance_id: number;
  title: string;
  order: number;
  enabled: boolean;
  method_id: string;
  method_title: string;
  method_description: string;
  settings: Record<string, { value: string }>;
}

interface ZoneLocation {
  code: string;
  type: "country" | "state" | "postcode" | "continent";
}

const FREIGHT_COUNTRY_LABELS: Record<string, string> = {
  SA: "Saudi Arabia",
  BH: "Bahrain",
  KW: "Kuwait",
  QA: "Qatar",
};

const CONTINENT_COUNTRIES: Record<string, string[]> = {
  AF: ["DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ", "NA", "NE", "NG", "RE", "RW", "SH", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH", "ZM", "ZW"],
  AN: ["AQ", "BV", "TF", "HM", "GS"],
  AS: ["AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CX", "CC", "GE", "HK", "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MO", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE"],
  EU: ["AX", "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FO", "FI", "FR", "DE", "GI", "GR", "GG", "VA", "HU", "IS", "IE", "IM", "IT", "JE", "LV", "LI", "LT", "LU", "MK", "MT", "MD", "MC", "ME", "NL", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SJ", "SE", "CH", "UA", "GB"],
  NA: ["AI", "AG", "AW", "BS", "BB", "BZ", "BM", "BQ", "VG", "CA", "KY", "CR", "CU", "CW", "DM", "DO", "SV", "GL", "GD", "GP", "GT", "HT", "HN", "JM", "MQ", "MX", "MS", "NI", "PA", "PR", "BL", "KN", "LC", "MF", "PM", "VC", "SX", "TT", "TC", "US", "VI"],
  OC: ["AS", "AU", "CK", "FJ", "PF", "GU", "KI", "MH", "FM", "NR", "NC", "NZ", "NU", "NF", "MP", "PW", "PG", "PN", "WS", "SB", "TK", "TO", "TV", "UM", "VU", "WF"],
  SA: ["AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF", "GY", "PY", "PE", "SR", "UY", "VE"],
};

async function findZoneForCountry(country: string, marketCode?: string): Promise<number | null> {
  const authParams = getBasicAuthParams(marketCode);
  const zonesUrl = `${WC_API_BASE}/shipping/zones?${authParams}`;
  const zonesResponse = await fetch(zonesUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!zonesResponse.ok) return null;

  const zones: Array<{ id: number; name: string }> = await zonesResponse.json();

  for (const zone of zones) {
    if (zone.id === 0) continue;

    const locationsUrl = `${WC_API_BASE}/shipping/zones/${zone.id}/locations?${authParams}`;
    const locationsResponse = await fetch(locationsUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!locationsResponse.ok) continue;

    const locations: ZoneLocation[] = await locationsResponse.json();

    for (const location of locations) {
      if (location.type === "country" && location.code === country) {
        return zone.id;
      }
      if (location.type === "state" && location.code.startsWith(`${country}:`)) {
        return zone.id;
      }
      if (location.type === "continent") {
        const countries = CONTINENT_COUNTRIES[location.code];
        if (countries && countries.includes(country)) {
          return zone.id;
        }
      }
    }
  }

  return 0;
}

async function getZoneMethods(zoneId: number, marketCode?: string): Promise<ZoneMethod[]> {
  const authParams = getBasicAuthParams(marketCode);
  const methodsUrl = `${WC_API_BASE}/shipping/zones/${zoneId}/methods?${authParams}`;
  const response = await fetch(methodsUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) return [];
  return response.json();
}

function buildFreightRate(
  country: string,
  cartWeight: number,
  currencyCode: string,
  currencySymbol: string
): ShippingRate | null {
  const freightMatch = resolveFreightPrice(country, cartWeight);
  if (!freightMatch) {
    return null;
  }

  const countryLabel = FREIGHT_COUNTRY_LABELS[country.toUpperCase()] || country.toUpperCase();
  const ratePrice = String(Math.round(freightMatch.price * 100));
  const weightLabel = freightMatch.row.weightLabel;

  return {
    rate_id: `aramex_freight:${country.toUpperCase()}:${weightLabel}`,
    name: `Aramex Freight ${countryLabel} ${weightLabel}`,
    description: `${countryLabel} freight charge`,
    delivery_time: "",
    price: ratePrice,
    taxes: "0",
    instance_id: 0,
    method_id: "aramex_freight",
    meta_data: [
      { key: "country", value: country.toUpperCase() },
      { key: "weight", value: weightLabel },
      { key: "pcs", value: String(freightMatch.row.pcs) },
    ],
    selected: true,
    currency_code: currencyCode,
    currency_symbol: currencySymbol,
    currency_minor_unit: 2,
    currency_decimal_separator: ".",
    currency_thousand_separator: ",",
    currency_prefix: currencySymbol,
    currency_suffix: "",
  };
}

function parseFlexibleShippingRules(settings: Record<string, { value: string }>): WeightRule[] {
  const rulesKeys = ["method_rules", "rules", "shipping_rules"];
  for (const key of rulesKeys) {
    if (settings[key]?.value) {
      try {
        const parsed = JSON.parse(settings[key].value);
        if (Array.isArray(parsed)) {
          const rules: WeightRule[] = [];
          for (const rule of parsed) {
            const conditions = rule.conditions || [];
            const weightCondition = conditions.find(
              (c: { condition_id?: string }) => c.condition_id === "weight"
            );
            if (weightCondition) {
              const cost = parseFloat(rule.cost_per_order?.value || rule.cost || "0");
              rules.push({
                minWeight: parseFloat(weightCondition.min || "0"),
                maxWeight: parseFloat(weightCondition.max || "999999"),
                cost,
              });
            }
          }
          if (rules.length > 0) return rules;
        }
      } catch {
        continue;
      }
    }
  }
  return [];
}

function calculateWeightBasedCost(rules: WeightRule[], weight: number): number | null {
  const sorted = [...rules].sort((a, b) => a.minWeight - b.minWeight);
  for (const rule of sorted) {
    if (weight >= rule.minWeight && weight <= rule.maxWeight) {
      return rule.cost;
    }
  }
  if (sorted.length > 0 && weight > sorted[sorted.length - 1].maxWeight) {
    return sorted[sorted.length - 1].cost;
  }
  return null;
}

function buildShippingRates(
  methods: ZoneMethod[],
  cartSubtotal: number,
  currencyCode: string,
  currencySymbol: string,
  cartWeight: number
): ShippingRate[] {
  const rates: ShippingRate[] = [];

  for (const method of methods) {
    if (!method.enabled) continue;

    let price = "0";
    const name = method.title || method.method_title;

    if (method.method_id === "flat_rate") {
      const rules = parseFlexibleShippingRules(method.settings);
      if (rules.length > 0 && cartWeight > 0) {
        const weightCost = calculateWeightBasedCost(rules, cartWeight);
        if (weightCost !== null) {
          price = String(Math.round(weightCost * 100));
        } else {
          const cost = method.settings?.cost?.value || "0";
          price = String(Math.round(parseFloat(cost) * 100));
        }
      } else {
        const cost = method.settings?.cost?.value || "0";
        price = String(Math.round(parseFloat(cost) * 100));
      }
    } else if (method.method_id === "flexible_shipping_single" || method.method_id === "flexible_shipping") {
      const rules = parseFlexibleShippingRules(method.settings);
      if (rules.length > 0 && cartWeight > 0) {
        const weightCost = calculateWeightBasedCost(rules, cartWeight);
        if (weightCost !== null) {
          price = String(Math.round(weightCost * 100));
        }
      } else {
        const cost = method.settings?.cost?.value || "0";
        price = String(Math.round(parseFloat(cost) * 100));
      }
    } else if (method.method_id === "free_shipping") {
      price = "0";
      const requires = method.settings?.requires?.value || "";
      const minAmount = parseFloat(method.settings?.min_amount?.value || "0");
      let eligible = true;

      if (requires === "min_amount" || requires === "both" || requires === "either") {
        if (minAmount > 0 && cartSubtotal < minAmount) {
          eligible = false;
        }
      }

      rates.push({
        rate_id: `${method.method_id}:${method.instance_id}`,
        name,
        description: "",
        delivery_time: "",
        price,
        taxes: "0",
        instance_id: method.instance_id,
        method_id: method.method_id,
        meta_data: [],
        selected: false,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        currency_minor_unit: 2,
        currency_decimal_separator: ".",
        currency_thousand_separator: ",",
        currency_prefix: currencySymbol,
        currency_suffix: "",
        free_shipping_min_amount: minAmount > 0 ? minAmount : undefined,
        free_shipping_eligible: eligible,
      });
      continue;
    } else if (method.method_id === "local_pickup") {
      const cost = method.settings?.cost?.value || "0";
      price = String(Math.round(parseFloat(cost) * 100));
    } else {
      const cost = method.settings?.cost?.value || "0";
      price = String(Math.round(parseFloat(cost) * 100));
    }

    rates.push({
      rate_id: `${method.method_id}:${method.instance_id}`,
      name,
      description: "",
      delivery_time: "",
      price,
      taxes: "0",
      instance_id: method.instance_id,
      method_id: method.method_id,
      meta_data: [],
      selected: false,
      currency_code: currencyCode,
      currency_symbol: currencySymbol,
      currency_minor_unit: 2,
      currency_decimal_separator: ".",
      currency_thousand_separator: ",",
      currency_prefix: currencySymbol,
      currency_suffix: "",
    });
  }

  if (rates.length > 0) {
    const eligibleFreeShipping = rates.find(
      r => r.method_id === "free_shipping" && r.free_shipping_eligible !== false
    );
    if (eligibleFreeShipping) {
      eligibleFreeShipping.selected = true;
    } else {
      const firstSelectable = rates.find(
        r => !(r.method_id === "free_shipping" && r.free_shipping_eligible === false)
      );
      if (firstSelectable) {
        firstSelectable.selected = true;
      } else {
        rates[0].selected = true;
      }
    }
  }

  return rates;
}

export async function GET(request: NextRequest) {
  try {
    const market = await getRequestMarket();
    const country = request.nextUrl.searchParams.get("country") || "AE";
    const city = request.nextUrl.searchParams.get("city") || "";
    const postcode = request.nextUrl.searchParams.get("postcode") || "";
    const cartSubtotal = parseFloat(request.nextUrl.searchParams.get("cart_subtotal") || "0");
    const cartWeight = parseFloat(request.nextUrl.searchParams.get("cart_weight") || "0");
    const currencyCode = request.nextUrl.searchParams.get("currency_code") || "AED";
    const currencySymbol = request.nextUrl.searchParams.get("currency_symbol") || "د.إ";

    const freightRate = buildFreightRate(country, cartWeight, currencyCode, currencySymbol);
    if (freightRate) {
      const pkg: ShippingPackage = {
        package_id: 0,
        name: "Shipping",
        destination: {
          address_1: "",
          address_2: "",
          city,
          state: "",
          postcode,
          country,
        },
        items: [],
        shipping_rates: [freightRate],
      };

      return NextResponse.json({
        success: true,
        needs_shipping: true,
        shipping_rates: [pkg],
        totals: {
          shipping_total: freightRate.price,
          shipping_tax: "0",
        },
      });
    }

    const zoneId = await findZoneForCountry(country, market.code);

    if (zoneId === null) {
      return NextResponse.json(
        { success: false, error: { code: "no_credentials", message: "WooCommerce API credentials not configured" } },
        { status: 500 }
      );
    }

    const methods = await getZoneMethods(zoneId, market.code);
    const shippingRates = buildShippingRates(methods, cartSubtotal, currencyCode, currencySymbol, cartWeight);

    const selectedRate = shippingRates.find(r => r.selected);
    const shippingTotal = selectedRate ? selectedRate.price : "0";

    const pkg: ShippingPackage = {
      package_id: 0,
      name: "Shipping",
      destination: {
        address_1: "",
        address_2: "",
        city,
        state: "",
        postcode,
        country,
      },
      items: [],
      shipping_rates: shippingRates,
    };

    return NextResponse.json({
      success: true,
      needs_shipping: true,
      shipping_rates: shippingRates.length > 0 ? [pkg] : [],
      totals: {
        shipping_total: shippingTotal,
        shipping_tax: "0",
      },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rate_id, shipping_rates } = body;

    if (!rate_id) {
      return NextResponse.json(
        { success: false, error: { code: "missing_rate_id", message: "Rate ID is required" } },
        { status: 400 }
      );
    }

    const packages: ShippingPackage[] = shipping_rates || [];
    const updatedPackages = packages.map((pkg: ShippingPackage) => ({
      ...pkg,
      shipping_rates: pkg.shipping_rates.map((rate: ShippingRate) => ({
        ...rate,
        selected: rate.rate_id === rate_id,
      })),
    }));

    const selectedRate = updatedPackages
      .flatMap((pkg: ShippingPackage) => pkg.shipping_rates)
      .find((rate: ShippingRate) => rate.rate_id === rate_id);

    return NextResponse.json({
      success: true,
      shipping_rates: updatedPackages,
      totals: {
        shipping_total: selectedRate?.price || "0",
        shipping_tax: "0",
      },
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
