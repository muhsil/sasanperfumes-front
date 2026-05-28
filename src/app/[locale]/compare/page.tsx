import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { siteConfig, type Locale } from "@/config/site";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = { title: "Compare Products | ShapeHive", robots: { index: false } };

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
