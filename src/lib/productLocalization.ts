import { decodeHtmlEntities } from "@/lib/utils";
import { translateToArabic } from "@/config/menu";
import type { Locale } from "@/config/site";
import type { WCProduct, WCProductAttribute } from "@/types/woocommerce";

const ARABIC_RE = /[\u0600-\u06ff]/;
const LATIN_RE = /[A-Za-z]/;
const WORD_RE = /([A-Za-z]+(?:['’\-][A-Za-z]+)*|\d+|[^A-Za-z\d]+)/g;

export const PRODUCT_SEARCH_ALIASES_EXTENSION_KEY = "sasanperfumes_search_aliases";

const PRODUCT_WORD_TRANSLATIONS: Record<string, string> = {
  amber: "\u0639\u0646\u0628\u0631",
  black: "\u0623\u0633\u0648\u062f",
  blue: "\u0623\u0632\u0631\u0642",
  bright: "\u0645\u0634\u0631\u0642",
  care: "\u0639\u0646\u0627\u064a\u0629",
  clear: "\u0646\u0642\u064a",
  dark: "\u062f\u0627\u0643\u0646",
  diffuser: "\u0645\u0628\u062e\u0631",
  diffusers: "\u0645\u0628\u0627\u062e\u0631",
  diva: "\u062f\u064a\u0641\u0627",
  elegant: "\u0623\u0646\u064a\u0642",
  elixir: "\u0625\u0643\u0633\u064a\u0631",
  exclusive: "\u062d\u0635\u0631\u064a",
  festive: "\u0627\u062d\u062a\u0641\u0627\u0644\u064a",
  floral: "\u0632\u0647\u0631\u064a",
  fresh: "\u0645\u0646\u0639\u0634",
  gift: "\u0647\u062f\u064a\u0629",
  gold: "\u0630\u0647\u0628\u064a",
  grande: "\u062c\u0631\u0627\u0646\u062f",
  gray: "\u0631\u0645\u0627\u062f\u064a",
  green: "\u0623\u062e\u0636\u0631",
  hair: "\u0634\u0639\u0631",
  intense: "\u0645\u0643\u062b\u0641",
  lavender: "\u0644\u0627\u0641\u0646\u062f\u0631",
  leather: "\u062c\u0644\u062f\u064a",
  limited: "\u0645\u062d\u062f\u0648\u062f",
  lotion: "\u0644\u0648\u0634\u0646",
  man: "\u0631\u062c\u0627\u0644\u064a",
  men: "\u0631\u062c\u0627\u0644\u064a",
  mist: "\u0645\u0639\u0637\u0631",
  musk: "\u0645\u0633\u0643",
  new: "\u062c\u062f\u064a\u062f",
  oil: "\u0632\u064a\u062a",
  oils: "\u0632\u064a\u0648\u062a",
  oud: "\u0639\u0648\u062f",
  perfume: "\u0639\u0637\u0631",
  perfumes: "\u0639\u0637\u0648\u0631",
  pink: "\u0648\u0631\u062f\u064a",
  powder: "\u0628\u0648\u062f\u0631\u0629",
  premium: "\u0641\u0627\u062e\u0631",
  product: "\u0645\u0646\u062a\u062c",
  products: "\u0645\u0646\u062a\u062c\u0627\u062a",
  powdery: "\u0628\u0648\u062f\u0631\u064a",
  red: "\u0623\u062d\u0645\u0631",
  rose: "\u0648\u0631\u062f",
  silver: "\u0641\u0636\u064a",
  set: "\u0637\u0642\u0645",
  sets: "\u0623\u0637\u0642\u0645",
  spray: "\u0628\u062e\u0627\u062e",
  sprays: "\u0628\u062e\u0627\u062e\u0627\u062a",
  summer: "\u0635\u064a\u0641\u064a",
  sweet: "\u062d\u0644\u0648",
  warm: "\u062f\u0627\u0641\u0626",
  white: "\u0623\u0628\u064a\u0636",
  winter: "\u0634\u062a\u0648\u064a",
  women: "\u0646\u0633\u0627\u0626\u064a",
  woody: "\u062e\u0634\u0628\u064a",
  yellow: "\u0623\u0635\u0641\u0631",
  extrait: "\u0625\u0643\u0633\u062a\u0631\u064a\u062a",
  parfum: "\u0628\u0627\u0631\u0641\u0648\u0645",
  luxury: "\u0641\u0627\u062e\u0631",
  classic: "\u0643\u0644\u0627\u0633\u064a\u0643\u064a",
  unisex: "\u0645\u0648\u062d\u062f",
};

export interface ProductSearchAliases {
  names: string[];
  categories: string[];
  brands: string[];
  tags: string[];
  attributes: string[];
  descriptions: string[];
  identifiers: string[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasLatinText(value: string): boolean {
  return LATIN_RE.test(value);
}

function hasArabicText(value: string): boolean {
  return ARABIC_RE.test(value);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeWhitespace(decodeHtmlEntities(String(value || ""))))
        .filter(Boolean)
    )
  );
}

function maybeTranslateWholePhrase(value: string): string | null {
  const normalized = normalizeWhitespace(decodeHtmlEntities(value));
  if (!normalized || !hasLatinText(normalized)) {
    return null;
  }

  const directTranslation = translateToArabic(normalized);
  if (directTranslation !== normalized && !hasLatinText(directTranslation)) {
    return normalizeWhitespace(directTranslation);
  }

  return null;
}

function transliterateLatinWord(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) return trimmed;

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  if (/^[ivxlcdm]+$/i.test(trimmed) && trimmed.length <= 6) {
    return trimmed.toUpperCase();
  }

  const lower = trimmed.toLowerCase();
  const digraphs: Array<[string, string]> = [
    ["sh", "\u0634"],
    ["ch", "\u062a\u0634"],
    ["gh", "\u063a"],
    ["kh", "\u062e"],
    ["th", "\u062b"],
    ["dh", "\u0630"],
    ["ph", "\u0641"],
    ["qu", "\u0643\u0648"],
    ["oo", "\u0648"],
    ["ee", "\u064a"],
    ["ai", "\u0627\u064a"],
    ["ay", "\u0627\u064a"],
    ["ei", "\u064a"],
    ["ou", "\u0648"],
    ["ow", "\u0627\u0648"],
    ["ck", "\u0643"],
    ["wh", "\u0648"],
  ];
  const letters: Record<string, string> = {
    a: "\u0627",
    b: "\u0628",
    c: "\u0643",
    d: "\u062f",
    e: "\u064a",
    f: "\u0641",
    g: "\u062c",
    h: "\u0647",
    i: "\u064a",
    j: "\u062c",
    k: "\u0643",
    l: "\u0644",
    m: "\u0645",
    n: "\u0646",
    o: "\u0648",
    p: "\u0628",
    q: "\u0642",
    r: "\u0631",
    s: "\u0633",
    t: "\u062a",
    u: "\u0648",
    v: "\u0641",
    w: "\u0648",
    x: "\u0643\u0633",
    y: "\u064a",
    z: "\u0632",
  };

  let output = "";
  for (let index = 0; index < lower.length;) {
    let matched = false;

    for (const [source, target] of digraphs) {
      if (lower.startsWith(source, index)) {
        output += target;
        index += source.length;
        matched = true;
        break;
      }
    }

    if (matched) {
      continue;
    }

    const char = lower[index];
    output += letters[char] || char;
    index += 1;
  }

  return output;
}

function localizeLatinTextSegment(value: string, locale?: Locale): string {
  const decoded = normalizeWhitespace(decodeHtmlEntities(value));
  if (locale !== "ar" || !decoded) {
    return decoded;
  }

  if (hasArabicText(decoded) && !hasLatinText(decoded)) {
    return decoded;
  }

  const fullPhrase = maybeTranslateWholePhrase(decoded);
  if (fullPhrase) {
    return fullPhrase;
  }

  return decoded.replace(WORD_RE, (token) => {
    if (!hasLatinText(token)) {
      return token;
    }

    const normalizedToken = token.toLowerCase().replace(/[’']/g, "");
    const directWordTranslation = PRODUCT_WORD_TRANSLATIONS[normalizedToken];
    if (directWordTranslation) {
      return directWordTranslation;
    }

    const translatedToken = translateToArabic(token);
    if (translatedToken !== token) {
      return translatedToken;
    }

    return transliterateLatinWord(token);
  });
}

function localizeHtmlTextSegment(value: string, locale?: Locale): string {
  const decoded = decodeHtmlEntities(value);
  if (locale !== "ar" || !decoded) {
    return decoded;
  }

  return decoded
    .split(/(<[^>]+>)/g)
    .map((segment) => (segment.startsWith("<") ? segment : localizeLatinTextSegment(segment, locale)))
    .join("");
}

export function localizeProductText(value: string, locale?: Locale): string {
  return localizeLatinTextSegment(value, locale);
}

export function localizeProductHtml(value: string, locale?: Locale): string {
  return localizeHtmlTextSegment(value, locale);
}

export function localizeProductTaxonomyItems<T extends { name: string }>(
  items: T[] | undefined,
  locale?: Locale
): T[] {
  const source = items || [];
  if (locale !== "ar") {
    return source;
  }

  return source.map((item) => ({
    ...item,
    name: localizeProductText(item.name || "", locale),
  }));
}

export function localizeProductAttributes(
  attributes: WCProductAttribute[] | undefined,
  locale?: Locale
): WCProductAttribute[] {
  const source = attributes || [];
  if (locale !== "ar") {
    return source;
  }

  return source.map((attribute) => ({
    ...attribute,
    name: localizeProductText(attribute.name || "", locale),
    terms: (attribute.terms || []).map((term) => ({
      ...term,
      name: localizeProductText(term.name || "", locale),
    })),
  }));
}

export function buildProductSearchAliases(product: WCProduct): ProductSearchAliases {
  const attributeNames = (product.attributes || []).flatMap((attribute) => [
    attribute.name,
    ...(attribute.terms || []).map((term) => term.name),
  ]);

  return {
    names: uniqueStrings([product.name]),
    categories: uniqueStrings((product.categories || []).map((category) => category.name)),
    brands: uniqueStrings((product.brands || []).map((brand) => brand.name)),
    tags: uniqueStrings((product.tags || []).map((tag) => tag.name)),
    attributes: uniqueStrings(attributeNames),
    descriptions: uniqueStrings([product.short_description, product.description]),
    identifiers: uniqueStrings([product.sku]),
  };
}

export function readProductSearchAliases(value: unknown): ProductSearchAliases | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ProductSearchAliases>;

  const toStringArray = (input: unknown): string[] => (
    Array.isArray(input)
      ? input.map((item) => (typeof item === "string" ? normalizeWhitespace(item) : "")).filter(Boolean)
      : []
  );

  const aliases: ProductSearchAliases = {
    names: toStringArray(candidate.names),
    categories: toStringArray(candidate.categories),
    brands: toStringArray(candidate.brands),
    tags: toStringArray(candidate.tags),
    attributes: toStringArray(candidate.attributes),
    descriptions: toStringArray(candidate.descriptions),
    identifiers: toStringArray(candidate.identifiers),
  };

  const hasValues = Object.values(aliases).some((items) => items.length > 0);
  return hasValues ? aliases : null;
}
