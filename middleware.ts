import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalHost, cmsHostname, mediaHostNames } from "./src/config/site";
import { proxy } from "./src/proxy";

const DEV_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "::1", "localhost:3000"];
const CANONICAL_HOSTS_ENV = process.env.NEXT_PUBLIC_CANONICAL_HOSTS || process.env.CANONICAL_HOSTS || "";
const DEFAULT_CANONICAL_HOST = "shapehive.com";
const SHAPEHIVE_HOST_SUFFIX = ".shapehive.com";
const LEGACY_MARKET_SUBDOMAINS = new Set<string>(["qa", "om", "sa"]);
const KNOWN_CANONICAL_HOSTS = [
  "shapehive.com",
];

function parseHost(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  const firstValue = trimmed.split(",")[0].trim();
  if (!firstValue) return "";
  if (trimmed.includes("://")) {
    try {
      return new URL(firstValue).hostname;
    } catch {
      return "";
    }
  }
  return firstValue.replace(/^www\./, "").replace(/\.+$/, "");
}

function normalizeHost(value: string | undefined): string {
  const parsed = parseHost(value);
  if (!parsed) return "";
  return parsed.replace(/:\d+$/, "").trim();
}

function getLegacyMarketFromHost(host: string): string {
  const normalized = normalizeHost(host).toLowerCase();
  if (!normalized) return "";
  const legacyMatch = normalized.match(/^([a-z0-9-]+)\.shapehive\.com$/);
  if (!legacyMatch || !legacyMatch[1]) return "";
  const candidate = legacyMatch[1];
  return LEGACY_MARKET_SUBDOMAINS.has(candidate) ? candidate : "";
}

function getAllowedHosts(): string[] {
  const canonicalHosts = getCanonicalHosts();
  const allowed = new Set<string>([
    ...DEV_ALLOWED_HOSTS,
    ...canonicalHosts,
    "cms.shapehive.com",
    "shapehive.com",
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
  const hosts = new Set<string>([
    canonicalHost,
    ...envCanonicalHosts,
    ...KNOWN_CANONICAL_HOSTS,
    DEFAULT_CANONICAL_HOST,
  ]);
  return Array.from(hosts);
}

function isCanonicalHost(request: NextRequest) {
  const rawHost = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  const host = normalizeHost(rawHost);
  const allowedHosts = getAllowedHosts();
  const devLikeHost = allowedHosts.some((allowed) => host === allowed || host.startsWith(`${allowed}:`));

  if (devLikeHost) {
    return true;
  }

  const canonicalHosts = getCanonicalHosts();
  const isKnownCanonical = canonicalHosts.some((hostName) => host === hostName);
  const isShapeHiveRelated = host.endsWith(SHAPEHIVE_HOST_SUFFIX);

  // Let unknown shapehive hostnames pass through middleware checks and be redirected
  // to the configured canonical host to avoid production-level 503 behavior.
  if (!isKnownCanonical && isShapeHiveRelated) {
    return false;
  }

  return isKnownCanonical;
}

function enforceLegacyMarketHostRedirect(request: NextRequest) {
  const rawHost =
    request.headers.get("host") ||
    request.headers.get("x-forwarded-host") ||
    request.nextUrl.host ||
    "";
  const host = normalizeHost(rawHost);
  const market = getLegacyMarketFromHost(host);
  if (!market) return;

  const pathname = request.nextUrl.pathname || "/";
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
  const targetPath =
    firstSegment === market ? pathname : `/${market}${pathname === "/" ? "" : pathname}`;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = DEFAULT_CANONICAL_HOST;
  redirectUrl.pathname = targetPath;

  return NextResponse.redirect(redirectUrl, 308);
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
  const legacyHostRedirect = enforceLegacyMarketHostRedirect(request);
  if (legacyHostRedirect) {
    return legacyHostRedirect;
  }

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
