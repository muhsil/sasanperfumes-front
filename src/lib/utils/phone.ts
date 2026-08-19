export interface CountryPhoneConfig {
  code: string;
  dialCode: string;
  minLength: number;
  maxLength: number;
}

export const countryPhoneConfigs: CountryPhoneConfig[] = [
  { code: "AE", dialCode: "+971", minLength: 9, maxLength: 9 },
  { code: "SA", dialCode: "+966", minLength: 9, maxLength: 9 },
  { code: "KW", dialCode: "+965", minLength: 8, maxLength: 8 },
  { code: "BH", dialCode: "+973", minLength: 8, maxLength: 8 },
  { code: "OM", dialCode: "+968", minLength: 8, maxLength: 8 },
  { code: "QA", dialCode: "+974", minLength: 8, maxLength: 8 },
  { code: "EG", dialCode: "+20", minLength: 10, maxLength: 10 },
  { code: "JO", dialCode: "+962", minLength: 9, maxLength: 9 },
  { code: "LB", dialCode: "+961", minLength: 7, maxLength: 8 },
  { code: "IQ", dialCode: "+964", minLength: 10, maxLength: 10 },
  { code: "SY", dialCode: "+963", minLength: 9, maxLength: 9 },
  { code: "PS", dialCode: "+970", minLength: 9, maxLength: 9 },
  { code: "YE", dialCode: "+967", minLength: 9, maxLength: 9 },
  { code: "LY", dialCode: "+218", minLength: 9, maxLength: 9 },
  { code: "TN", dialCode: "+216", minLength: 8, maxLength: 8 },
  { code: "DZ", dialCode: "+213", minLength: 9, maxLength: 9 },
  { code: "MA", dialCode: "+212", minLength: 9, maxLength: 9 },
  { code: "SD", dialCode: "+249", minLength: 9, maxLength: 9 },
  { code: "US", dialCode: "+1", minLength: 10, maxLength: 10 },
  { code: "GB", dialCode: "+44", minLength: 10, maxLength: 10 },
  { code: "CA", dialCode: "+1", minLength: 10, maxLength: 10 },
  { code: "AU", dialCode: "+61", minLength: 9, maxLength: 9 },
  { code: "DE", dialCode: "+49", minLength: 10, maxLength: 11 },
  { code: "FR", dialCode: "+33", minLength: 9, maxLength: 9 },
  { code: "IT", dialCode: "+39", minLength: 9, maxLength: 10 },
  { code: "ES", dialCode: "+34", minLength: 9, maxLength: 9 },
  { code: "NL", dialCode: "+31", minLength: 9, maxLength: 9 },
  { code: "BE", dialCode: "+32", minLength: 8, maxLength: 9 },
  { code: "CH", dialCode: "+41", minLength: 9, maxLength: 9 },
  { code: "AT", dialCode: "+43", minLength: 10, maxLength: 11 },
  { code: "SE", dialCode: "+46", minLength: 9, maxLength: 9 },
  { code: "NO", dialCode: "+47", minLength: 8, maxLength: 8 },
  { code: "DK", dialCode: "+45", minLength: 8, maxLength: 8 },
  { code: "FI", dialCode: "+358", minLength: 9, maxLength: 10 },
  { code: "PL", dialCode: "+48", minLength: 9, maxLength: 9 },
  { code: "PT", dialCode: "+351", minLength: 9, maxLength: 9 },
  { code: "GR", dialCode: "+30", minLength: 10, maxLength: 10 },
  { code: "TR", dialCode: "+90", minLength: 10, maxLength: 10 },
  { code: "IN", dialCode: "+91", minLength: 10, maxLength: 10 },
  { code: "PK", dialCode: "+92", minLength: 10, maxLength: 10 },
  { code: "BD", dialCode: "+880", minLength: 10, maxLength: 10 },
  { code: "PH", dialCode: "+63", minLength: 10, maxLength: 10 },
  { code: "ID", dialCode: "+62", minLength: 9, maxLength: 12 },
  { code: "MY", dialCode: "+60", minLength: 9, maxLength: 10 },
  { code: "SG", dialCode: "+65", minLength: 8, maxLength: 8 },
  { code: "TH", dialCode: "+66", minLength: 9, maxLength: 9 },
  { code: "VN", dialCode: "+84", minLength: 9, maxLength: 10 },
  { code: "JP", dialCode: "+81", minLength: 10, maxLength: 10 },
  { code: "KR", dialCode: "+82", minLength: 9, maxLength: 10 },
  { code: "CN", dialCode: "+86", minLength: 11, maxLength: 11 },
  { code: "HK", dialCode: "+852", minLength: 8, maxLength: 8 },
  { code: "TW", dialCode: "+886", minLength: 9, maxLength: 9 },
  { code: "NZ", dialCode: "+64", minLength: 8, maxLength: 9 },
  { code: "ZA", dialCode: "+27", minLength: 9, maxLength: 9 },
  { code: "NG", dialCode: "+234", minLength: 10, maxLength: 10 },
  { code: "KE", dialCode: "+254", minLength: 9, maxLength: 9 },
  { code: "BR", dialCode: "+55", minLength: 10, maxLength: 11 },
  { code: "MX", dialCode: "+52", minLength: 10, maxLength: 10 },
  { code: "AR", dialCode: "+54", minLength: 10, maxLength: 10 },
  { code: "CL", dialCode: "+56", minLength: 9, maxLength: 9 },
  { code: "CO", dialCode: "+57", minLength: 10, maxLength: 10 },
  { code: "RU", dialCode: "+7", minLength: 10, maxLength: 10 },
  { code: "UA", dialCode: "+380", minLength: 9, maxLength: 9 },
  { code: "AF", dialCode: "+93", minLength: 9, maxLength: 9 },
  { code: "AL", dialCode: "+355", minLength: 9, maxLength: 9 },
  { code: "AD", dialCode: "+376", minLength: 6, maxLength: 9 },
  { code: "AO", dialCode: "+244", minLength: 9, maxLength: 9 },
  { code: "AG", dialCode: "+1268", minLength: 7, maxLength: 7 },
  { code: "AM", dialCode: "+374", minLength: 8, maxLength: 8 },
  { code: "AZ", dialCode: "+994", minLength: 9, maxLength: 9 },
  { code: "BS", dialCode: "+1242", minLength: 7, maxLength: 7 },
  { code: "BB", dialCode: "+1246", minLength: 7, maxLength: 7 },
  { code: "BY", dialCode: "+375", minLength: 9, maxLength: 10 },
  { code: "BZ", dialCode: "+501", minLength: 7, maxLength: 7 },
  { code: "BJ", dialCode: "+229", minLength: 8, maxLength: 8 },
  { code: "BT", dialCode: "+975", minLength: 8, maxLength: 8 },
  { code: "BO", dialCode: "+591", minLength: 8, maxLength: 8 },
  { code: "BA", dialCode: "+387", minLength: 8, maxLength: 9 },
  { code: "BW", dialCode: "+267", minLength: 7, maxLength: 8 },
  { code: "BN", dialCode: "+673", minLength: 7, maxLength: 7 },
  { code: "BG", dialCode: "+359", minLength: 8, maxLength: 9 },
  { code: "BF", dialCode: "+226", minLength: 8, maxLength: 8 },
  { code: "BI", dialCode: "+257", minLength: 8, maxLength: 8 },
  { code: "KH", dialCode: "+855", minLength: 8, maxLength: 9 },
  { code: "CM", dialCode: "+237", minLength: 9, maxLength: 9 },
  { code: "CV", dialCode: "+238", minLength: 7, maxLength: 7 },
  { code: "CF", dialCode: "+236", minLength: 8, maxLength: 8 },
  { code: "TD", dialCode: "+235", minLength: 8, maxLength: 8 },
  { code: "KM", dialCode: "+269", minLength: 7, maxLength: 7 },
  { code: "CG", dialCode: "+242", minLength: 9, maxLength: 9 },
  { code: "CD", dialCode: "+243", minLength: 9, maxLength: 9 },
  { code: "CR", dialCode: "+506", minLength: 8, maxLength: 8 },
  { code: "CI", dialCode: "+225", minLength: 10, maxLength: 10 },
  { code: "HR", dialCode: "+385", minLength: 8, maxLength: 9 },
  { code: "CU", dialCode: "+53", minLength: 8, maxLength: 8 },
  { code: "CY", dialCode: "+357", minLength: 8, maxLength: 8 },
  { code: "CZ", dialCode: "+420", minLength: 9, maxLength: 9 },
  { code: "DJ", dialCode: "+253", minLength: 8, maxLength: 8 },
  { code: "DM", dialCode: "+1767", minLength: 7, maxLength: 7 },
  { code: "DO", dialCode: "+1809", minLength: 7, maxLength: 7 },
  { code: "EC", dialCode: "+593", minLength: 9, maxLength: 9 },
  { code: "SV", dialCode: "+503", minLength: 8, maxLength: 8 },
  { code: "GQ", dialCode: "+240", minLength: 9, maxLength: 9 },
  { code: "ER", dialCode: "+291", minLength: 7, maxLength: 7 },
  { code: "EE", dialCode: "+372", minLength: 7, maxLength: 8 },
  { code: "SZ", dialCode: "+268", minLength: 8, maxLength: 8 },
  { code: "ET", dialCode: "+251", minLength: 9, maxLength: 9 },
  { code: "FJ", dialCode: "+679", minLength: 7, maxLength: 7 },
  { code: "GA", dialCode: "+241", minLength: 7, maxLength: 8 },
  { code: "GM", dialCode: "+220", minLength: 7, maxLength: 7 },
  { code: "GE", dialCode: "+995", minLength: 9, maxLength: 9 },
  { code: "GH", dialCode: "+233", minLength: 9, maxLength: 9 },
  { code: "GD", dialCode: "+1473", minLength: 7, maxLength: 7 },
  { code: "GT", dialCode: "+502", minLength: 8, maxLength: 8 },
  { code: "GN", dialCode: "+224", minLength: 9, maxLength: 9 },
  { code: "GW", dialCode: "+245", minLength: 9, maxLength: 9 },
  { code: "GY", dialCode: "+592", minLength: 7, maxLength: 7 },
  { code: "HT", dialCode: "+509", minLength: 8, maxLength: 8 },
  { code: "HN", dialCode: "+504", minLength: 8, maxLength: 8 },
  { code: "HU", dialCode: "+36", minLength: 9, maxLength: 9 },
  { code: "IS", dialCode: "+354", minLength: 7, maxLength: 7 },
  { code: "IR", dialCode: "+98", minLength: 10, maxLength: 10 },
  { code: "IE", dialCode: "+353", minLength: 9, maxLength: 9 },
  { code: "IL", dialCode: "+972", minLength: 9, maxLength: 9 },
  { code: "JM", dialCode: "+1876", minLength: 7, maxLength: 7 },
  { code: "KZ", dialCode: "+7", minLength: 10, maxLength: 10 },
  { code: "KG", dialCode: "+996", minLength: 9, maxLength: 9 },
  { code: "LA", dialCode: "+856", minLength: 8, maxLength: 10 },
  { code: "LV", dialCode: "+371", minLength: 8, maxLength: 8 },
  { code: "LR", dialCode: "+231", minLength: 7, maxLength: 9 },
  { code: "LI", dialCode: "+423", minLength: 7, maxLength: 9 },
  { code: "LT", dialCode: "+370", minLength: 8, maxLength: 8 },
  { code: "LU", dialCode: "+352", minLength: 8, maxLength: 9 },
  { code: "MO", dialCode: "+853", minLength: 8, maxLength: 8 },
  { code: "MK", dialCode: "+389", minLength: 8, maxLength: 8 },
  { code: "MG", dialCode: "+261", minLength: 9, maxLength: 9 },
  { code: "MW", dialCode: "+265", minLength: 7, maxLength: 9 },
  { code: "MV", dialCode: "+960", minLength: 7, maxLength: 7 },
  { code: "ML", dialCode: "+223", minLength: 8, maxLength: 8 },
  { code: "MT", dialCode: "+356", minLength: 8, maxLength: 8 },
  { code: "MR", dialCode: "+222", minLength: 8, maxLength: 8 },
  { code: "MU", dialCode: "+230", minLength: 8, maxLength: 8 },
  { code: "MD", dialCode: "+373", minLength: 8, maxLength: 8 },
  { code: "MC", dialCode: "+377", minLength: 8, maxLength: 9 },
  { code: "MN", dialCode: "+976", minLength: 8, maxLength: 8 },
  { code: "ME", dialCode: "+382", minLength: 8, maxLength: 8 },
  { code: "MZ", dialCode: "+258", minLength: 9, maxLength: 9 },
  { code: "MM", dialCode: "+95", minLength: 8, maxLength: 10 },
  { code: "NA", dialCode: "+264", minLength: 9, maxLength: 9 },
  { code: "NP", dialCode: "+977", minLength: 10, maxLength: 10 },
  { code: "NI", dialCode: "+505", minLength: 8, maxLength: 8 },
  { code: "NE", dialCode: "+227", minLength: 8, maxLength: 8 },
  { code: "KP", dialCode: "+850", minLength: 8, maxLength: 10 },
  { code: "PA", dialCode: "+507", minLength: 7, maxLength: 8 },
  { code: "PG", dialCode: "+675", minLength: 7, maxLength: 8 },
  { code: "PY", dialCode: "+595", minLength: 9, maxLength: 9 },
  { code: "PE", dialCode: "+51", minLength: 9, maxLength: 9 },
  { code: "PR", dialCode: "+1787", minLength: 7, maxLength: 7 },
  { code: "RO", dialCode: "+40", minLength: 9, maxLength: 9 },
  { code: "RW", dialCode: "+250", minLength: 9, maxLength: 9 },
  { code: "KN", dialCode: "+1869", minLength: 7, maxLength: 7 },
  { code: "LC", dialCode: "+1758", minLength: 7, maxLength: 7 },
  { code: "VC", dialCode: "+1784", minLength: 7, maxLength: 7 },
  { code: "WS", dialCode: "+685", minLength: 5, maxLength: 7 },
  { code: "SM", dialCode: "+378", minLength: 8, maxLength: 10 },
  { code: "ST", dialCode: "+239", minLength: 7, maxLength: 7 },
  { code: "SN", dialCode: "+221", minLength: 9, maxLength: 9 },
  { code: "RS", dialCode: "+381", minLength: 8, maxLength: 9 },
  { code: "SC", dialCode: "+248", minLength: 7, maxLength: 7 },
  { code: "SL", dialCode: "+232", minLength: 8, maxLength: 8 },
  { code: "SK", dialCode: "+421", minLength: 9, maxLength: 9 },
  { code: "SI", dialCode: "+386", minLength: 8, maxLength: 8 },
  { code: "SB", dialCode: "+677", minLength: 7, maxLength: 7 },
  { code: "SO", dialCode: "+252", minLength: 7, maxLength: 9 },
  { code: "LK", dialCode: "+94", minLength: 9, maxLength: 9 },
  { code: "SR", dialCode: "+597", minLength: 7, maxLength: 7 },
  { code: "TJ", dialCode: "+992", minLength: 9, maxLength: 9 },
  { code: "TZ", dialCode: "+255", minLength: 9, maxLength: 9 },
  { code: "TL", dialCode: "+670", minLength: 7, maxLength: 8 },
  { code: "TG", dialCode: "+228", minLength: 8, maxLength: 8 },
  { code: "TO", dialCode: "+676", minLength: 5, maxLength: 7 },
  { code: "TT", dialCode: "+1868", minLength: 7, maxLength: 7 },
  { code: "TM", dialCode: "+993", minLength: 8, maxLength: 8 },
  { code: "UG", dialCode: "+256", minLength: 9, maxLength: 9 },
  { code: "UY", dialCode: "+598", minLength: 8, maxLength: 8 },
  { code: "UZ", dialCode: "+998", minLength: 9, maxLength: 9 },
  { code: "VU", dialCode: "+678", minLength: 5, maxLength: 7 },
  { code: "VE", dialCode: "+58", minLength: 10, maxLength: 10 },
  { code: "ZM", dialCode: "+260", minLength: 9, maxLength: 9 },
  { code: "ZW", dialCode: "+263", minLength: 9, maxLength: 9 },
];

export function getPhoneConfigByCountry(countryCode: string): CountryPhoneConfig {
  return (
    countryPhoneConfigs.find((c) => c.code === countryCode) || {
      code: countryCode,
      dialCode: "+971",
      minLength: 7,
      maxLength: 15,
    }
  );
}

export function getDialCodeByCountry(countryCode: string): string {
  return getPhoneConfigByCountry(countryCode).dialCode;
}

export function parsePhoneNumber(phone: string): { dialCode: string; localNumber: string } {
  if (!phone) return { dialCode: "", localNumber: "" };

  const cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+")) {
    const sortedConfigs = [...countryPhoneConfigs].sort(
      (a, b) => b.dialCode.length - a.dialCode.length
    );
    for (const config of sortedConfigs) {
      if (cleaned.startsWith(config.dialCode)) {
        return {
          dialCode: config.dialCode,
          localNumber: cleaned.slice(config.dialCode.length),
        };
      }
    }
    const dialMatch = cleaned.match(/^(\+\d{1,4})/);
    if (dialMatch) {
      return {
        dialCode: dialMatch[1],
        localNumber: cleaned.slice(dialMatch[1].length),
      };
    }
  }

  if (cleaned.startsWith("00")) {
    const withPlus = "+" + cleaned.slice(2);
    return parsePhoneNumber(withPlus);
  }

  return { dialCode: "", localNumber: cleaned };
}

/**
 * wa.me only accepts a full international number in digits — no `+`, no leading
 * zero. Support numbers are stored locally (`0567394314`), which produces a link
 * WhatsApp rejects, so normalise before building the URL.
 */
export function toWhatsAppNumber(value: string, defaultDialCode = "971"): string {
  if (!value) return "";

  const raw = String(value).trim();
  const parsed = parsePhoneNumber(raw);
  if (parsed.dialCode) {
    return `${parsed.dialCode}${parsed.localNumber}`.replace(/\D/g, "");
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  const fallback = defaultDialCode.replace(/\D/g, "");
  if (digits.startsWith("0")) return `${fallback}${digits.replace(/^0+/, "")}`;
  if (digits.startsWith(fallback)) return digits;

  // A bare subscriber number still needs its country code.
  return digits.length <= 9 ? `${fallback}${digits}` : digits;
}

export function formatPhoneWithCountryCode(dialCode: string, localNumber: string): string {
  const digitsOnly = localNumber.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return `${dialCode}${digitsOnly}`;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  errorAr?: string;
}

/**
 * Customers order from outside the listed countries and carry numbers that do
 * not match the local digit count, so phone entry is not restricted to a
 * specific country's format. Only loose sanity bounds are applied — the upper
 * bound is the E.164 maximum.
 */
export const MIN_PHONE_DIGITS = 4;
export const MAX_PHONE_DIGITS = 15;

export function validatePhoneNumber(
  localNumber: string,
  // Retained so callers keep their existing signature; length is no longer
  // enforced per country.
  countryCode?: string
): PhoneValidationResult {
  void countryCode;
  const digitsOnly = localNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return { isValid: false, error: "Phone number is required", errorAr: "رقم الهاتف مطلوب" };
  }

  if (digitsOnly.length < MIN_PHONE_DIGITS) {
    return {
      isValid: false,
      error: `Phone number must be at least ${MIN_PHONE_DIGITS} digits`,
      errorAr: `يجب أن يكون رقم الهاتف ${MIN_PHONE_DIGITS} أرقام على الأقل`,
    };
  }

  if (digitsOnly.length > MAX_PHONE_DIGITS) {
    return {
      isValid: false,
      error: `Phone number must not exceed ${MAX_PHONE_DIGITS} digits`,
      errorAr: `يجب ألا يتجاوز رقم الهاتف ${MAX_PHONE_DIGITS} أرقام`,
    };
  }

  return { isValid: true };
}

export function detectCountryFromPhone(phone: string): string | null {
  const { dialCode } = parsePhoneNumber(phone);
  if (!dialCode) return null;
  const config = countryPhoneConfigs.find((c) => c.dialCode === dialCode);
  return config?.code || null;
}
