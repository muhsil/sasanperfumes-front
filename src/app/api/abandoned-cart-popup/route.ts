import { NextResponse } from "next/server";
import { disableRuntimeCache } from "@/config/site";
import { cmsUrl } from "@/config/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WP = cmsUrl;
let cache: { data: unknown; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (!disableRuntimeCache && cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }
  try {
    const res = await fetch(
      `${WP}/wp-json/sasanperfumes/v1/abandoned-cart-popup`,
      disableRuntimeCache ? { cache: "no-store" } : { next: { revalidate: 300 } }
    );
    const data = await res.json();
    if (!disableRuntimeCache) cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
}
