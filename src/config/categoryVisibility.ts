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
