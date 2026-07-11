import { decodeHtmlEntities } from "@/lib/utils";

export const legacyBrandCategorySlugs = new Set([
  "flower-scents",
  "rimal",
  "serenity",
  "liwan",
]);

const legacyBrandCategoryTitles = new Set([
  "flower scents",
  "rimal",
  "serenity",
  "liwan",
]);

const hiddenStorefrontCategorySlugs = new Set(["test"]);
const hiddenStorefrontCategoryTitles = new Set(["test"]);

function normalizeCategoryValue(value?: string | null): string {
  return decodeHtmlEntities(value || "")
    .trim()
    .toLowerCase();
}

export function isLegacyBrandCategory(category: { name?: string | null; slug?: string | null; title?: string | null }) {
  const slug = normalizeCategoryValue(category.slug);
  const name = normalizeCategoryValue(category.name || category.title);

  return legacyBrandCategorySlugs.has(slug) || legacyBrandCategoryTitles.has(name);
}

export function isHiddenStorefrontCategory(category: { name?: string | null; slug?: string | null; title?: string | null }) {
  const slug = normalizeCategoryValue(category.slug);
  const name = normalizeCategoryValue(category.name || category.title);

  return isLegacyBrandCategory(category)
    || hiddenStorefrontCategorySlugs.has(slug)
    || hiddenStorefrontCategoryTitles.has(name);
}
