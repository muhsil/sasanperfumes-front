import { NextRequest, NextResponse } from "next/server";
import { getWcCredentials } from "@/lib/utils/loadEnv";
import { backendMarketHeaders, wpJsonSubsiteBaseForMarket } from "@/lib/utils/backendFetch";

const MARKETS = ["", "qa", "om", "sa"] as const;
const KNOWN_IDS: Record<string, Set<number>> = {
  intl: new Set([15597, 15598, 15601, 15602, 15604, 15605, 15606, 15672, 15673]),
  qa: new Set([1554, 1555, 1557, 1558, 1559, 1560, 1561, 1564, 1565]),
  om: new Set([13102]),
  sa: new Set([1794, 1796, 1807, 1808]),
};

type Order = {
  id: number;
  status: string;
  billing?: { first_name?: string; last_name?: string; email?: string };
  meta_data?: Array<{ key?: string; value?: unknown }>;
};

function label(market: string): string {
  return market || "intl";
}

function authParams(market: string): string {
  const { consumerKey, consumerSecret } = getWcCredentials(market);
  return `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
}

function isTestOrder(order: Order, market: string): boolean {
  const marketLabel = label(market);
  if (KNOWN_IDS[marketLabel]?.has(order.id)) return true;
  if (order.meta_data?.some((meta) => meta.key === "_automated_customer_id_audit" && meta.value === "yes")) return true;

  const name = `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim();
  const email = (order.billing?.email || "").trim().toLowerCase();
  if (email.startsWith("codex.") && email.endsWith("@gmail.com")) return true;
  return email === "muhsilv@gmail.com" && /^(paymob|test|customer id audit|muhsil test)/i.test(name);
}

async function marketFetch(market: string, url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: backendMarketHeaders(market, init?.headers),
    cache: "no-store",
  });
}

export async function POST(request: NextRequest) {
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expectedSecret = getWcCredentials().consumerSecret;
  if (!suppliedSecret || suppliedSecret !== expectedSecret) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { dryRun = true } = await request.json().catch(() => ({ dryRun: true }));
  const results: Array<Record<string, unknown>> = [];

  for (const market of MARKETS) {
    const base = `${wpJsonSubsiteBaseForMarket(market)}/wc/v3/orders`;
    const listResponse = await marketFetch(market, `${base}?per_page=100&orderby=date&order=desc&${authParams(market)}`);
    if (!listResponse.ok) {
      results.push({ market: label(market), error: listResponse.status });
      continue;
    }

    const orders = (await listResponse.json()) as Order[];
    for (const order of orders.filter((candidate) => isTestOrder(candidate, market))) {
      let deleted = false;
      let error: number | undefined;
      if (!dryRun) {
        const deleteResponse = await marketFetch(
          market,
          `${base}/${order.id}?force=true&${authParams(market)}`,
          { method: "DELETE" }
        );
        deleted = deleteResponse.ok;
        if (!deleted) error = deleteResponse.status;
      }
      results.push({
        market: label(market),
        id: order.id,
        status: order.status,
        name: `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim(),
        email: order.billing?.email || "",
        deleted,
        ...(error ? { error } : {}),
      });
    }
  }

  return NextResponse.json({ success: true, dryRun, results });
}
