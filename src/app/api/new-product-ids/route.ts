import { NextRequest, NextResponse } from "next/server";
import { getMarketByHost, normalizeMarketHost } from "@/config/market";
import { getNewProducts } from "@/lib/api/woocommerce";
import type { Locale } from "@/config/site";

export const dynamic = "force-dynamic";

const MARKET_CODES = new Set(["qa", "om", "sa"]);

function getFrontendHost(request: NextRequest): string {
  const queryMarket = request.nextUrl.searchParams.get("__market")?.toLowerCase();
  const explicitMarket = queryMarket || request.headers.get("x-market")?.toLowerCase();
  const rawHost = normalizeMarketHost(
    request.headers.get("x-frontend-host")
      || request.headers.get("x-forwarded-host")
      || request.headers.get("host")
      || ""
  );

  if (explicitMarket && MARKET_CODES.has(explicitMarket)) {
    return `${rawHost.replace(/\/(qa|om|sa)$/, "")}/${explicitMarket}`;
  }

  return rawHost;
}

export async function GET(request: NextRequest) {
  const locale = (request.nextUrl.searchParams.get("locale") || "en") as Locale;
  const frontendHost = getFrontendHost(request);
  const market = getMarketByHost(frontendHost);
  const { products } = await getNewProducts({
    per_page: 5,
    locale,
    currency: market.defaultCurrency,
    frontendHost,
  });

  return NextResponse.json(
    { ids: products.map((product) => product.id) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Vary": "Host, X-Frontend-Host, X-Market",
      },
    }
  );
}
