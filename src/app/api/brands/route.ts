import { NextResponse } from "next/server";
import { getBrands } from "@/lib/api/wordpress";

export async function GET() {
  const brands = await getBrands();
  const data = brands.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    image: b.image || "",
    logo: b.logo || "",
  }));
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
