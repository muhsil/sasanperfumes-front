import { NextRequest, NextResponse } from "next/server";
import { cmsUrl } from "@/config/site";

const WP = cmsUrl;
const WP_USER = process.env.WP_ADMIN_USER || "admin";
const WP_PASS = process.env.WP_ADMIN_PASSWORD;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader && !WP_PASS) {
      return NextResponse.json({ error: "WordPress admin password is not configured" }, { status: 500 });
    }

    const headers: Record<string, string> = {
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Content-Type": file.type,
      Authorization: authHeader || `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")}`,
    };

    const buf = Buffer.from(await file.arrayBuffer());
    const wpRes = await fetch(`${WP}/wp-json/wp/v2/media`, {
      method: "POST",
      headers,
      body: buf,
    });

    if (!wpRes.ok) {
      const err = await wpRes.text();
      return NextResponse.json({ error: err }, { status: wpRes.status });
    }

    const media = await wpRes.json();
    return NextResponse.json({ id: media.id, url: media.source_url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
