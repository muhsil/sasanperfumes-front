import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalHost, cmsHostname, mediaHostNames } from "./src/config/site";
import { proxy } from "./src/proxy";

const DEV_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "::1", "localhost:3000"];
const CANONICAL_HOSTS_ENV = process.env.NEXT_PUBLIC_CANONICAL_HOSTS || process.env.CANONICAL_HOSTS || "";

function parseHost(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname;
    } catch {
      return "";
    }
  }
  return trimmed.replace(/^www\./, "");
}

function getAllowedHosts(): string[] {
  const canonicalHosts = getCanonicalHosts();
  const allowed = new Set<string>([
    ...DEV_ALLOWED_HOSTS,
    ...canonicalHosts,
    "cms.shapehive.com",
    "qa.cms.shapehive.com",
    cmsHostname,
    ...mediaHostNames,
  ]);

  const envHosts = (process.env.NEXT_PUBLIC_ALLOWED_HOSTS || process.env.ALLOWED_HOSTS || "")
    .split(",")
    .map(parseHost)
    .filter(Boolean);

  envHosts.forEach((host) => allowed.add(host));

  return Array.from(allowed);
}

function getCanonicalHosts(): string[] {
  const envCanonicalHosts = CANONICAL_HOSTS_ENV.split(",")
    .map(parseHost)
    .filter(Boolean);
  const hosts = new Set<string>([canonicalHost, ...envCanonicalHosts]);
  return Array.from(hosts);
}

function isCanonicalHost(request: NextRequest) {
  const hostHeader = request.headers.get("host")?.toLowerCase() || "";
  const host = hostHeader.split(":")[0];
  const allowedHosts = getAllowedHosts();
  const devLikeHost = allowedHosts.some((allowed) => host === allowed || host.startsWith(`${allowed}:`));

  if (devLikeHost) {
    return true;
  }

  return getCanonicalHosts().some((hostName) => host === hostName);
}

function enforceCanonicalHost(request: NextRequest) {
  if (isCanonicalHost(request)) return;

  const redirectUrl = request.nextUrl.clone();
  const canonicalHosts = getCanonicalHosts();
  const targetHost = canonicalHosts[0];
  if (!targetHost) return;
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = targetHost;
  return NextResponse.redirect(redirectUrl, 308);
}

export function middleware(request: NextRequest) {
  const canonicalRedirect = enforceCanonicalHost(request);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  return proxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|plugins).*)",
  ],
};
