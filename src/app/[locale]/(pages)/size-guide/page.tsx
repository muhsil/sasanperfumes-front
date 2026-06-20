import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { disableRuntimeCache, siteConfig } from "@/config/site";
import { backendHeaders } from "@/lib/utils/backendFetch";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

interface SizeGuidePageProps {
  params: Promise<{ locale: string }>;
}

async function isSizeGuideEnabled(): Promise<boolean> {
  try {
    const res = await fetch(
      `${siteConfig.apiUrl}/wp-json/sasanperfumes/v1/advanced/scent-size-guide`,
      disableRuntimeCache
        ? { cache: "no-store", headers: backendHeaders() }
        : { next: { revalidate: 300 }, headers: backendHeaders() }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data?.sizeGuide?.enabled === true;
  } catch {
    return false;
  }
}

export default async function SizeGuidePage({ params }: SizeGuidePageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const enabled = await isSizeGuideEnabled();
  if (!enabled) notFound();

  // When re-enabled in the future, CMS content will render here.
  // For now redirect to shop since no CMS content template exists yet.
  redirect(`${pathPrefix}/${locale}/shop`);
}
