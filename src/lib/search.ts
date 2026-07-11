import { decodeHtmlEntities, stripHtml } from "@/lib/utils";
import type { WCProduct } from "@/types/woocommerce";
import {
  PRODUCT_SEARCH_ALIASES_EXTENSION_KEY,
  readProductSearchAliases,
} from "@/lib/productLocalization";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu;

const SEARCH_TOKEN_ALIASES: Record<string, string> = {
  aoud: "oud",
  oudh: "oud",
  dakhoon: "oud",
  dakhon: "oud",
  doakh: "oud",
  bakhor: "bakhoor",
  bakhour: "bakhoor",
  bukhoor: "bakhoor",
  fragrance: "perfume",
  cologne: "perfume",
  fragrence: "perfume",
  parfume: "perfume",
  parfum: "perfume",
  spray: "mist",
  mist: "spray",
  incense: "bakhoor",
};

export interface SearchFieldGroups {
  names: string[];
  slugs: string[];
  categories: string[];
  brands: string[];
  tags: string[];
  attributes: string[];
  descriptions: string[];
  identifiers: string[];
}

export interface SearchIndexEntry {
  product: WCProduct;
  normalizedName: string;
  normalizedSlug: string;
  searchableText: string;
  fields: SearchFieldGroups;
  tokens: string[];
}

export interface RankedSearchEntry {
  product: WCProduct;
  score: number;
}

export interface SearchSuggestion {
  label: string;
  slug: string;
  productId: number;
  href?: string;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function canonicalizeToken(token: string): string {
  return SEARCH_TOKEN_ALIASES[token] || token;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= b.length; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function similarityScore(left: string, right: string): number {
  const a = normalizeSearchText(left);
  const b = normalizeSearchText(right);

  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const baseScore = Math.max(0, 1 - distance / maxLength);
  const prefixBonus = a.startsWith(b) || b.startsWith(a) ? 0.1 : 0;

  return Math.min(1, baseScore + prefixBonus);
}

function scoreFieldGroup(
  query: string,
  values: string[],
  weights: { exact: number; prefix: number; includes: number; fuzzy: number }
): number {
  let best = 0;

  for (const value of values) {
    if (!value) continue;

    if (value === query) {
      best = Math.max(best, weights.exact);
      continue;
    }

    if (value.startsWith(query)) {
      best = Math.max(best, weights.prefix);
    }

    if (value.includes(query)) {
      best = Math.max(best, weights.includes);
    }

    best = Math.max(best, similarityScore(query, value) * weights.fuzzy);
  }

  return best;
}

function normalizeCategoryMatchText(value: string): string {
  return normalizeSearchText(value)
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function scoreCategoryBoost(query: string, entry: SearchIndexEntry): number {
  if (!query.trim() || !entry.fields.categories.length) return 0;

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  let categoryScore = 0;

  for (const category of entry.fields.categories) {
    if (!category) continue;
    const normalizedCategory = normalizeCategoryMatchText(category);
    if (!normalizedCategory) continue;

    if (normalizedCategory === normalizedQuery) {
      categoryScore = Math.max(categoryScore, 170);
      continue;
    }

    if (normalizedCategory.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedCategory)) {
      categoryScore = Math.max(categoryScore, 120);
      continue;
    }

    if (normalizedCategory.includes(normalizedQuery) || similarityScore(normalizedQuery, normalizedCategory) >= 0.84) {
      categoryScore = Math.max(categoryScore, 70);
    }
  }

  return categoryScore;
}

export function normalizeSearchText(value: string): string {
  const normalizedTokens = decodeHtmlEntities(stripHtml(value || ""))
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/['’`´]/g, "")
    .replace(/&/g, " ")
    .replace(NON_ALPHANUMERIC, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(canonicalizeToken);

  return uniqueValues(normalizedTokens).join(" ");
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function collectProductSearchFields(product: WCProduct): SearchFieldGroups {
  const aliases = readProductSearchAliases(product.extensions?.[PRODUCT_SEARCH_ALIASES_EXTENSION_KEY]);
  const attributeFields = (product.attributes || []).flatMap((attribute) => [
    attribute.name,
    ...(attribute.terms || []).map((term) => term.name),
  ]);
  const aliasAttributeFields = aliases?.attributes || [];

  return {
    names: uniqueValues([
      normalizeSearchText(product.name || ""),
      ...(aliases?.names || []).map((value) => normalizeSearchText(value)),
    ]),
    slugs: uniqueValues([normalizeSearchText(product.slug || "")]),
    categories: uniqueValues([
      ...(product.categories || []).map((category) => normalizeSearchText(category.name)),
      ...(aliases?.categories || []).map((value) => normalizeSearchText(value)),
    ]),
    brands: uniqueValues([
      ...(product.brands || []).map((brand) => normalizeSearchText(brand.name)),
      ...(aliases?.brands || []).map((value) => normalizeSearchText(value)),
    ]),
    tags: uniqueValues([
      ...(product.tags || []).map((tag) => normalizeSearchText(tag.name)),
      ...(aliases?.tags || []).map((value) => normalizeSearchText(value)),
    ]),
    attributes: uniqueValues([
      ...attributeFields.map((field) => normalizeSearchText(field)),
      ...aliasAttributeFields.map((field) => normalizeSearchText(field)),
    ]),
    descriptions: uniqueValues([
      normalizeSearchText(product.short_description || ""),
      normalizeSearchText(product.description || ""),
      ...(aliases?.descriptions || []).map((value) => normalizeSearchText(value)),
    ]),
    identifiers: uniqueValues([
      normalizeSearchText(product.sku || ""),
      ...(aliases?.identifiers || []).map((value) => normalizeSearchText(value)),
    ]),
  };
}

export function createSearchIndexEntry(product: WCProduct): SearchIndexEntry {
  const fields = collectProductSearchFields(product);
  const normalizedName = normalizeSearchText(product.name);
  const normalizedSlug = normalizeSearchText(product.slug);
  const searchableText = [
    ...fields.names,
    ...fields.slugs,
    ...fields.categories,
    ...fields.brands,
    ...fields.tags,
    ...fields.attributes,
    ...fields.descriptions,
    ...fields.identifiers,
  ].join(" ");
  const tokens = uniqueValues(tokenizeSearchText(searchableText));

  return {
    product,
    normalizedName,
    normalizedSlug,
    searchableText,
    fields,
    tokens,
  };
}

export function scoreSearchEntry(query: string, entry: SearchIndexEntry): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const queryTokens = tokenizeSearchText(normalizedQuery);
  let score = 0;

  score += scoreFieldGroup(normalizedQuery, entry.fields.names, { exact: 220, prefix: 140, includes: 90, fuzzy: 70 });
  score += scoreFieldGroup(normalizedQuery, entry.fields.slugs, { exact: 200, prefix: 120, includes: 85, fuzzy: 60 });
  score += scoreFieldGroup(normalizedQuery, entry.fields.categories, { exact: 130, prefix: 94, includes: 70, fuzzy: 52 });
  score += scoreCategoryBoost(query, entry);
  score += scoreFieldGroup(normalizedQuery, entry.fields.brands, { exact: 78, prefix: 54, includes: 40, fuzzy: 34 });
  score += scoreFieldGroup(normalizedQuery, entry.fields.tags, { exact: 50, prefix: 34, includes: 26, fuzzy: 20 });
  score += scoreFieldGroup(normalizedQuery, entry.fields.attributes, { exact: 36, prefix: 26, includes: 20, fuzzy: 16 });
  score += scoreFieldGroup(normalizedQuery, entry.fields.descriptions, { exact: 18, prefix: 12, includes: 10, fuzzy: 8 });
  score += scoreFieldGroup(normalizedQuery, entry.fields.identifiers, { exact: 240, prefix: 140, includes: 100, fuzzy: 80 });

  if (entry.searchableText.includes(normalizedQuery)) {
    score += 60 + Math.min(20, normalizedQuery.length);
  }

  let exactMatches = 0;
  let fuzzyMatches = 0;
  let tokenSimilaritySum = 0;

  for (const token of queryTokens) {
    if (!token) continue;

    if (entry.tokens.includes(token)) {
      exactMatches += 1;
      tokenSimilaritySum += 1;
      continue;
    }

    let bestTokenSimilarity = 0;
    for (const candidateToken of entry.tokens) {
      if (candidateToken === token) {
        bestTokenSimilarity = 1;
        break;
      }

      const currentSimilarity = similarityScore(token, candidateToken);
      if (currentSimilarity > bestTokenSimilarity) {
        bestTokenSimilarity = currentSimilarity;
      }

      if (bestTokenSimilarity === 1) break;
    }

    tokenSimilaritySum += bestTokenSimilarity;

    if (bestTokenSimilarity >= 0.92) {
      exactMatches += 1;
    } else if (bestTokenSimilarity >= 0.8) {
      fuzzyMatches += 1;
    } else if (bestTokenSimilarity >= 0.72) {
      fuzzyMatches += 0.5;
    }
  }

  score += exactMatches * 36;
  score += fuzzyMatches * 16;
  score += tokenSimilaritySum * 18;

  if (queryTokens.length > 1 && exactMatches === queryTokens.length) {
    score += 30;
  }

  if (queryTokens.length === 1 && entry.tokens.includes(queryTokens[0])) {
    score += 18;
  }

  return score;
}

export function rankSearchEntries(query: string, entries: SearchIndexEntry[]): RankedSearchEntry[] {
  return entries
    .map((entry) => ({
      product: entry.product,
      score: scoreSearchEntry(query, entry),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.id - b.product.id);
}

export function mergeRankedSearchEntries(
  primary: RankedSearchEntry[],
  secondary: RankedSearchEntry[]
): RankedSearchEntry[] {
  const merged = new Map<number, RankedSearchEntry>();

  for (const item of [...primary, ...secondary]) {
    const existing = merged.get(item.product.id);
    if (!existing || item.score > existing.score) {
      merged.set(item.product.id, item);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.score - a.score || a.product.id - b.product.id);
}

export function buildSearchSuggestion(
  query: string,
  rankedEntries: RankedSearchEntry[],
  minScore = 90
): SearchSuggestion | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || rankedEntries.length === 0) {
    return null;
  }

  const topMatch = rankedEntries[0];
  if (!topMatch || topMatch.score < minScore) {
    return null;
  }

  const normalizedTopName = normalizeSearchText(topMatch.product.name);
  if (normalizedTopName === normalizedQuery || normalizedTopName.includes(normalizedQuery)) {
    return null;
  }

  return {
    label: decodeHtmlEntities(topMatch.product.name),
    slug: topMatch.product.slug,
    productId: topMatch.product.id,
  };
}
