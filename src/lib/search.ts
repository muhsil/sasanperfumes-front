import { decodeHtmlEntities, stripHtml } from "@/lib/utils";
import type { WCProduct } from "@/types/woocommerce";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu;

export interface SearchIndexEntry {
  product: WCProduct;
  normalizedName: string;
  normalizedSlug: string;
  searchableText: string;
  fields: string[];
  tokens: string[];
}

export interface RankedSearchEntry {
  product: WCProduct;
  score: number;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeSearchText(value: string): string {
  return decodeHtmlEntities(stripHtml(value || ""))
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/['’`´]/g, "")
    .replace(/&/g, " ")
    .replace(NON_ALPHANUMERIC, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= b.length; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
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

function collectProductSearchFields(product: WCProduct): string[] {
  const attributeFields = (product.attributes || []).flatMap((attribute) => [
    attribute.name,
    ...(attribute.terms || []).map((term) => term.name),
  ]);

  return uniqueValues([
    product.name,
    product.slug,
    product.short_description,
    ...product.categories.map((category) => category.name),
    ...(product.tags || []).map((tag) => tag.name),
    ...(product.brands || []).map((brand) => brand.name),
    ...attributeFields,
  ].map((field) => normalizeSearchText(field)));
}

export function createSearchIndexEntry(product: WCProduct): SearchIndexEntry {
  const fields = collectProductSearchFields(product);
  const normalizedName = normalizeSearchText(product.name);
  const normalizedSlug = normalizeSearchText(product.slug);
  const searchableText = fields.join(" ");
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

  if (entry.normalizedName === normalizedQuery) score += 220;
  if (entry.normalizedSlug === normalizedQuery) score += 200;
  if (entry.normalizedName.startsWith(normalizedQuery)) score += 120;
  if (entry.normalizedSlug.startsWith(normalizedQuery)) score += 110;

  if (entry.searchableText.includes(normalizedQuery)) {
    score += 70 + Math.min(20, normalizedQuery.length);
  }

  const bestFieldSimilarity = Math.max(
    ...entry.fields.map((field) => similarityScore(normalizedQuery, field)),
    0
  );
  score += bestFieldSimilarity * 60;

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

  score += exactMatches * 35;
  score += fuzzyMatches * 16;
  score += tokenSimilaritySum * 18;

  if (queryTokens.length > 1 && exactMatches === queryTokens.length) {
    score += 25;
  }

  if (queryTokens.length === 1 && entry.tokens.includes(queryTokens[0])) {
    score += 15;
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
