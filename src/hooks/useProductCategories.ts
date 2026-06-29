"use client";

import { useState, useEffect, useMemo, useRef } from "react";

const categoryCache = new Map<number, string>();
const categoryIdsCache = new Map<number, number[]>();
const brandCache = new Map<number, string>();

interface ProductMeta {
  categories: Record<number, string>;
  categoryIds: Record<number, number[]>;
  brands: Record<number, string>;
}

export function useProductCategories(productIds: number[], locale?: string): Record<number, string> {
  const meta = useProductMeta(productIds, locale);
  return meta.categories;
}

export function useProductBrands(productIds: number[], locale?: string): Record<number, string> {
  const meta = useProductMeta(productIds, locale);
  return meta.brands;
}

export function useProductMeta(productIds: number[], locale?: string): ProductMeta {
  const [fetchedData, setFetchedData] = useState<ProductMeta>({ categories: {}, categoryIds: {}, brands: {} });
  const prevIdsRef = useRef<string>("");
  const prevLocaleRef = useRef<string | undefined>(undefined);
  const uniqueProductIds = useMemo(
    () => Array.from(new Set(productIds.filter((id) => Number.isFinite(id) && id > 0))),
    [productIds]
  );

  const cachedCategories = useMemo(() => {
    const result: Record<number, string> = {};
    for (const id of uniqueProductIds) {
      const name = categoryCache.get(id);
      if (name) result[id] = name;
    }
    return result;
  }, [uniqueProductIds]);

  const cachedBrands = useMemo(() => {
    const result: Record<number, string> = {};
    for (const id of uniqueProductIds) {
      const name = brandCache.get(id);
      if (name) result[id] = name;
    }
    return result;
  }, [uniqueProductIds]);

  const cachedCategoryIds = useMemo(() => {
    const result: Record<number, number[]> = {};
    for (const id of uniqueProductIds) {
      const ids = categoryIdsCache.get(id);
      if (ids) result[id] = ids;
    }
    return result;
  }, [uniqueProductIds]);

  const uncachedIds = useMemo(() => {
    return uniqueProductIds.filter((id) => !categoryCache.has(id) || !categoryIdsCache.has(id));
  }, [uniqueProductIds]);

  useEffect(() => {
    if (uncachedIds.length === 0) return;

    const idsKey = [...uncachedIds].sort((a, b) => a - b).join(",");
    if (idsKey === prevIdsRef.current && prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    prevIdsRef.current = idsKey;

    let cancelled = false;

    (async () => {
      try {
        const localeParam = locale ? `&locale=${locale}` : "";
        const response = await fetch(`/api/product-categories?ids=${uncachedIds.join(",")}${localeParam}`);
        const data = await response.json();
        if (cancelled) return;

        const fetchedCategories: Record<number, string> = data.categories || {};
        const fetchedCategoryIds: Record<number, number[]> = data.categoryIds || {};
        const fetchedBrands: Record<number, string> = data.brands || {};
        const normalizedCategoryIds: Record<number, number[]> = {};

        for (const id of uncachedIds) {
          const categoryName = fetchedCategories[id] || "";
          const brandName = fetchedBrands[id] || "";
          const ids = fetchedCategoryIds[id];
          const normalizedIds = Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [];
          categoryCache.set(id, categoryName);
          categoryIdsCache.set(id, normalizedIds);
          brandCache.set(id, brandName);
          normalizedCategoryIds[id] = normalizedIds;
        }

        setFetchedData({ categories: fetchedCategories, categoryIds: normalizedCategoryIds, brands: fetchedBrands });
      } catch {
        // silently fail
      }
    })();

    return () => { cancelled = true; };
  }, [uncachedIds, locale]);

  return useMemo(() => ({
    categories: { ...cachedCategories, ...fetchedData.categories },
    categoryIds: { ...cachedCategoryIds, ...fetchedData.categoryIds },
    brands: { ...cachedBrands, ...fetchedData.brands },
  }), [cachedCategories, cachedCategoryIds, cachedBrands, fetchedData]);
}
