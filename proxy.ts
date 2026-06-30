import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalHost, cmsHostname, mediaHostNames } from "./src/config/site";
import { proxy as appProxy } from "./src/proxy";

const DEV_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "::1", "localhost:3000"];
const CANONICAL_HOSTS_ENV = process.env.NEXT_PUBLIC_CANONICAL_HOSTS || process.env.CANONICAL_HOSTS || "";
const DEFAULT_CANONICAL_HOST = "sasanperfumes.com";
const REDIRECTABLE_HOST_SUFFIXES = [".sasanperfumes.com"];
const MARKET_PREFIX_SEGMENTS = new Set<string>(["qa", "om", "sa"]);
const LOCALE_SEGMENTS = new Set<string>(["en", "ar"]);
const LEGACY_BRAND_CATEGORY_SLUGS = new Set<string>(["flower-scents", "rimal", "serenity", "liwan"]);
const MARKET_DOMAIN_HOSTS = [
  "qa.sasanperfumes.com",
  "om.sasanperfumes.com",
  "sa.sasanperfumes.com",
];
const KNOWN_CANONICAL_HOSTS = [
  "sasanperfumes.com",
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

function getAllowedHosts(): string[] {
  const canonicalHosts = getCanonicalHosts();
  const allowed = new Set<string>([
    ...DEV_ALLOWED_HOSTS,
    ...canonicalHosts,
    "cms.sasanperfumes.com",
    "sasanperfumes.com",
    cmsHostname,
    ...MARKET_DOMAIN_HOSTS,
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
  const isRedirectableKnownDomain = REDIRECTABLE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));

  // Let unknown owned hostnames pass through middleware checks and be redirected
  // to the configured canonical host to avoid production-level 503 behavior.
  if (!isKnownCanonical && isRedirectableKnownDomain) {
    return false;
  }

  return isKnownCanonical;
}

function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return "en";
  const preferredLocale = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().substring(0, 2))
    .find((lang) => LOCALE_SEGMENTS.has(lang));
  return preferredLocale || "en";
}

function enforceMarketLocalePathOrder(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "/";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    if (segments.length === 1 && MARKET_PREFIX_SEGMENTS.has(segments[0].toLowerCase())) {
      const locale = getLocaleFromHeaders(request);
      if (locale) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = `/${segments[0].toLowerCase()}/${locale}`;
        return NextResponse.redirect(redirectUrl, 308);
      }
    }
    return;
  }

  const firstSegment = segments[0]?.toLowerCase();
  const secondSegment = segments[1]?.toLowerCase();
  if (!firstSegment) return;

  // Redirect old market-last URLs to market-first. Example: /en/qa -> /qa/en.
  if (LOCALE_SEGMENTS.has(firstSegment) && MARKET_PREFIX_SEGMENTS.has(secondSegment || "")) {
    const redirectPath =
      `/${secondSegment}/${firstSegment}` + (segments.length > 2 ? `/${segments.slice(2).join("/")}` : "");

    if (redirectPath === pathname) return;

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Force market-first for paths like /qa/product and /qa (if no locale provided).
  if (MARKET_PREFIX_SEGMENTS.has(firstSegment)) {
    const locale = LOCALE_SEGMENTS.has(secondSegment || "") ? secondSegment : getLocaleFromHeaders(request);
    if (!locale) return;

    const hasLocale = LOCALE_SEGMENTS.has(secondSegment || "");
    if (hasLocale && secondSegment === locale) {
      return;
    }

    const rest = segments.slice(hasLocale ? 2 : 1);
    const redirectPath = `/${firstSegment}/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return;
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

function redirectLegacyBrandCategoryPaths(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "/";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3) return;

  const firstSegment = segments[0]?.toLowerCase();
  const secondSegment = segments[1]?.toLowerCase();
  const hasMarket = MARKET_PREFIX_SEGMENTS.has(firstSegment || "");
  const localeIndex = hasMarket ? 1 : 0;
  const locale = segments[localeIndex]?.toLowerCase();
  const categorySegment = segments[localeIndex + 1]?.toLowerCase();
  const slug = segments[localeIndex + 2]?.toLowerCase();

  if (!LOCALE_SEGMENTS.has(locale || "")) return;
  if (categorySegment !== "category" || !slug || !LEGACY_BRAND_CATEGORY_SLUGS.has(slug)) return;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `${hasMarket ? `/${firstSegment}` : ""}/${locale}/brands/${slug}`;
  return NextResponse.redirect(redirectUrl, 308);
}

export function proxy(request: NextRequest) {
  const marketLocaleOrderRedirect = enforceMarketLocalePathOrder(request);
  if (marketLocaleOrderRedirect) {
    return marketLocaleOrderRedirect;
  }

  const legacyBrandCategoryRedirect = redirectLegacyBrandCategoryPaths(request);
  if (legacyBrandCategoryRedirect) {
    return legacyBrandCategoryRedirect;
  }

  const canonicalRedirect = enforceCanonicalHost(request);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  return appProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|plugins).*)",
  ],
};
