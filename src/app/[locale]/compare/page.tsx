import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { siteConfig, type Locale } from "@/config/site";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";
import { CompareClient } from "./CompareClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? "مقارنة المنتجات" : "Compare Products",
    description: isAr
      ? "مقارنة المنتجات جنبًا إلى جنب لاختيار العطر الأنسب."
      : "Compare products side by side to choose the right fragrance.",
    robots: NOINDEX_NOFOLLOW_ROBOTS,
  };
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  const { ids } = await searchParams;

  if (!siteConfig.locales.includes(locale as Locale)) notFound();
  const productIds = (ids || "").split(",").map(Number).filter(Boolean).slice(0, 3);
  if (productIds.length < 2) notFound();

  return <CompareClient locale={locale as Locale} productIds={productIds} />;
}
