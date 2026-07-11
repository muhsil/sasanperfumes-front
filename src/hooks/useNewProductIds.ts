"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { Locale } from "@/config/site";

interface NewProductIdsResponse {
  ids: number[];
}

async function fetchNewProductIds(url: string): Promise<NewProductIdsResponse> {
  const response = await fetch(url);
  if (!response.ok) return { ids: [] };
  return response.json() as Promise<NewProductIdsResponse>;
}

export function useNewProductIds(locale: Locale): Set<number> {
  const { data } = useSWR<NewProductIdsResponse>(
    `/api/new-product-ids?locale=${locale}`,
    fetchNewProductIds,
    {
      fallbackData: { ids: [] },
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  );

  return useMemo(() => new Set(data?.ids || []), [data?.ids]);
}
