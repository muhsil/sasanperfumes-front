import { NextResponse } from "next/server";
import { getStaticPageContent } from "@/lib/api/wordpress";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  const content = await getStaticPageContent(slug);
  if (content) {
    return NextResponse.json(content);
  }

  return NextResponse.json({ error: "Page not found" }, { status: 404 });
}
