import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { sanitizeBackendContent } from "@/lib/utils/backendFetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const CURL_BIN = process.platform === "win32" ? "curl.exe" : "curl";
const MAX_RESPONSE_BYTES = 1024 * 1024;

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchJsonWithCurl(url: string): Promise<unknown | null> {
  try {
    const { stdout } = await execFileAsync(
      CURL_BIN,
      [
        "-fsSL",
        "--max-time",
        "20",
        "-H",
        "Accept: application/json",
        url,
      ],
      { maxBuffer: MAX_RESPONSE_BYTES }
    );

    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  const endpoints = [
    `${siteConfig.apiUrl}/wp-json/sasanperfumes/v1/pages/${encodeURIComponent(slug)}`,
    `${siteConfig.apiUrl}/wp-json/fnf/v1/pages/${encodeURIComponent(slug)}`,
    `${siteConfig.apiUrl}/wp-json/Anbar/v1/pages/${encodeURIComponent(slug)}`,
  ];

  for (const endpoint of endpoints) {
    const data = await fetchJson(endpoint) || await fetchJsonWithCurl(endpoint);
    if (data) {
      return NextResponse.json(sanitizeBackendContent(data));
    }
  }

  return NextResponse.json({ error: "Page not found" }, { status: 404 });
}
