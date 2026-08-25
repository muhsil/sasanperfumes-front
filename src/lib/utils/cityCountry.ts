/**
 * Customs is charged on the selected country alone — 20% for every destination
 * except AE. Nothing validates that the city is plausible for that country, so
 * one wrong dropdown selection silently skips the fee (order #15338 shipped to
 * "jeddah" with the country left as United Arab Emirates).
 *
 * This is a warning aid, not validation: it only recognises well-known cities,
 * and it never blocks checkout. A shopper who really does live in a UAE district
 * with a similar name must still be able to order.
 */

/** Well-known cities outside the UAE, matched case-insensitively. */
const FOREIGN_CITIES: Record<string, string> = {
  // Saudi Arabia
  jeddah: "SA", jedda: "SA", "جدة": "SA",
  riyadh: "SA", "الرياض": "SA",
  dammam: "SA", "الدمام": "SA",
  makkah: "SA", mecca: "SA", "مكة": "SA",
  madinah: "SA", medina: "SA", "المدينة": "SA",
  khobar: "SA", jubail: "SA", tabuk: "SA", abha: "SA", taif: "SA", buraidah: "SA",
  // Qatar
  doha: "QA", "الدوحة": "QA", wakrah: "QA", wakra: "QA", rayyan: "QA",
  // Oman
  muscat: "OM", "مسقط": "OM", salalah: "OM", sohar: "OM", nizwa: "OM", seeb: "OM",
  // Kuwait / Bahrain
  kuwait: "KW", "الكويت": "KW", hawally: "KW", salmiya: "KW",
  manama: "BH", "المنامة": "BH", riffa: "BH", muharraq: "BH",
  // Wider region
  cairo: "EG", alexandria: "EG", amman: "JO", beirut: "LB",
  baghdad: "IQ", basra: "IQ", doha_qa: "QA",
};

/**
 * UAE places that would otherwise trip the matcher — "Madinat Al Riyadh" is a
 * district of Abu Dhabi, not Riyadh.
 */
const UAE_EXCEPTIONS = [
  "madinat al riyadh",
  "madinat zayed",
  "madinat khalifa",
];

const COUNTRY_NAMES: Record<string, string> = {
  SA: "Saudi Arabia",
  QA: "Qatar",
  OM: "Oman",
  KW: "Kuwait",
  BH: "Bahrain",
  EG: "Egypt",
  JO: "Jordan",
  LB: "Lebanon",
  IQ: "Iraq",
};

const COUNTRY_NAMES_AR: Record<string, string> = {
  SA: "السعودية",
  QA: "قطر",
  OM: "عُمان",
  KW: "الكويت",
  BH: "البحرين",
  EG: "مصر",
  JO: "الأردن",
  LB: "لبنان",
  IQ: "العراق",
};

/**
 * Destinations inside the GCC customs union, where the fee charged at checkout
 * is the only import charge the customer meets.
 *
 * Everywhere else the destination country levies its own duty and VAT, collected
 * by the courier on delivery — so calling our fee "Customs fees" told the
 * customer customs was settled when it was not. An order to Italy paid AED 15.00
 * as "Customs fees" and was then billed EUR 31.18 on arrival.
 */
const GCC_DESTINATIONS = new Set(["AE", "SA", "QA", "OM", "BH", "KW"]);

export function isGccDestination(country: string): boolean {
  return GCC_DESTINATIONS.has(String(country || "").trim().toUpperCase());
}

/** The fee label that is truthful for this destination. */
export function getImportFeeLabel(country: string): string {
  return isGccDestination(country) ? "Customs fees" : "Handling & export fee";
}

/** Returns the country a city clearly belongs to, or "" when unrecognised. */
export function detectCountryFromCity(city: string): string {
  const value = String(city || "").trim().toLowerCase();
  if (value === "") return "";

  if (UAE_EXCEPTIONS.some((exception) => value.includes(exception))) {
    return "AE";
  }

  for (const [needle, code] of Object.entries(FOREIGN_CITIES)) {
    if (value.includes(needle)) return code;
  }

  return "";
}

export interface CityCountryMismatch {
  detectedCountry: string;
  message: string;
  messageAr: string;
}

/**
 * The UAE does not use postal codes, so a postcode filled in against an AE
 * address is strong evidence the parcel is actually leaving the country —
 * independent of how the city happens to be spelled. Order #15338 carried the
 * Saudi postcode 23544 with the country left as AE.
 */
export function getPostcodeCountryWarning(
  postcode: string,
  selectedCountry: string
): { message: string; messageAr: string } | null {
  if (String(selectedCountry || "").toUpperCase() !== "AE") return null;

  const digits = String(postcode || "").replace(/\D/g, "");
  if (digits.length < 4) return null;

  return {
    message:
      "The UAE does not use postal codes. If this address is outside the UAE, please change the country — it affects delivery and customs charges.",
    messageAr:
      "الإمارات لا تستخدم الرموز البريدية. إذا كان هذا العنوان خارج الإمارات، يرجى تغيير الدولة، فهي تؤثر على التوصيل ورسوم الجمارك.",
  };
}

/**
 * Flags a city that clearly belongs to a different country than the one chosen.
 * Returns null whenever the city is unrecognised, so unknown places never warn.
 */
export function getCityCountryMismatch(
  city: string,
  selectedCountry: string
): CityCountryMismatch | null {
  const detected = detectCountryFromCity(city);
  if (detected === "" || detected === String(selectedCountry || "").toUpperCase()) {
    return null;
  }

  const name = COUNTRY_NAMES[detected] || detected;
  const nameAr = COUNTRY_NAMES_AR[detected] || detected;
  const trimmedCity = String(city || "").trim();

  return {
    detectedCountry: detected,
    message: `"${trimmedCity}" looks like it is in ${name}. Please check the country you selected — it affects delivery and customs charges.`,
    messageAr: `يبدو أن "${trimmedCity}" تقع في ${nameAr}. يرجى التحقق من الدولة المختارة، فهي تؤثر على التوصيل ورسوم الجمارك.`,
  };
}
