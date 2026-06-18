import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { MARKET_PREFIX_SEGMENTS, normalizeMarketHost } from "@/config/market";

const locales = siteConfig.locales;
const defaultLocale = siteConfig.defaultLocale;
const marketPrefixes = new Set<string>(MARKET_PREFIX_SEGMENTS);
const localeSet = new Set<string>(locales as readonly string[]);
const MARKET_COOKIE_NAME = "sasan-market";
const MARKET_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const BLOCKED_PATHS = [
  "/wp-admin",
  "/wp-login.php",
  "/wp-login",
  "/xmlrpc.php",
  "/wp-cron.php",
  "/wp-trackback.php",
  "/wp-config.php",
  "/.env",
  "/.git",
  "/wp-includes/wlwmanifest.xml",
  "/wp-content/debug.log",
];

const BLOCKED_PATTERNS = [
  /\/wp-content\/plugins\/.*/, 
  /\/wp-content\/themes\/.*/, 
  /\/wp-includes\/.*/, 
  /\.sql$/,
  /\.bak$/,
  /\.old$/,
  /\.orig$/,
  /\.save$/,
];

const BOT_USER_AGENTS = [
  "nikto",
  "sqlmap",
  "nmap",
  "masscan",
  "zgrab",
  "gobuster",
  "dirbuster",
];

function isBlockedRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  for (const bot of BOT_USER_AGENTS) {
    if (userAgent.includes(bot)) return true;
  }

  const lowerPath = pathname.toLowerCase();

  for (const blocked of BLOCKED_PATHS) {
    if (lowerPath === blocked || lowerPath.startsWith(blocked + "/")) return true;
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lowerPath)) return true;
  }

  return false;
}

function getPathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function extractMarketFromPath(pathname: string): string | null {
  const segments = getPathSegments(pathname);
  if (!segments.length) return null;

  const candidate = segments[0].toLowerCase();
  return marketPrefixes.has(candidate) ? candidate : null;
}

function parseMarketFromReferer(rawReferer: string | null): string | null {
  if (!rawReferer) return null;

  try {
    const refererUrl = new URL(rawReferer);
    return extractMarketFromPath(refererUrl.pathname);
  } catch {
    return extractMarketFromPath(rawReferer);
  }
}

function resolveMarketFromRequest(
  request: NextRequest,
  pathnameMarket: string | null
): string | null {
  if (pathnameMarket && marketPrefixes.has(pathnameMarket)) {
    return pathnameMarket;
  }

  const marketHeader = request.headers.get("x-market");
  if (marketHeader && marketPrefixes.has(marketHeader.toLowerCase())) {
    return marketHeader.toLowerCase();
  }

  const marketFromReferer = parseMarketFromReferer(request.headers.get("referer"));
  if (marketFromReferer && marketPrefixes.has(marketFromReferer)) {
    return marketFromReferer;
  }

  const marketFromCookie = request.cookies.get(MARKET_COOKIE_NAME)?.value;
  if (marketFromCookie && marketPrefixes.has(marketFromCookie)) {
    return marketFromCookie;
  }

  return null;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return response;
}

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().substring(0, 2))
      .find((lang) => localeSet.has(lang));
    if (preferredLocale) return preferredLocale;
  }
  return defaultLocale;
}

function sanitizeHostHeader(value?: string | null): string {
  if (!value) return "";
  const first = value.split(",")[0]?.trim() || "";
  if (!first) return "";
  const normalized = normalizeMarketHost(first);
  const host = normalized.split("/")[0];
  return host || "";
}

function parseSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  const second = segments[1];
  const third = segments[2];

  if (first && localeSet.has(first) && second && marketPrefixes.has(second)) {
    const localeDuplicate = third && third === first;
    return {
      market: second,
      locale: first,
      hasMarketPrefix: true,
      hasLocalePrefix: true,
      duplicateLocale: !!localeDuplicate,
      cleanedPath: localeDuplicate
        ? `/${second}/${first}`
        : `/${second}/${first}${third ? `/${segments.slice(2).join("/")}` : ""}`,
    };
  }

  if (
    first &&
    second &&
    third &&
    marketPrefixes.has(first) &&
    localeSet.has(second) &&
    localeSet.has(third)
  ) {
    if (second === third) {
      const localeTail = segments.slice(3).join("/");
      return {
        market: first,
        locale: second,
        hasMarketPrefix: true,
        hasLocalePrefix: true,
        duplicateLocale: true,
        cleanedPath: `/${first}/${second}${localeTail ? `/${localeTail}` : ""}`,
      };
    }
  }

  if (first && second && localeSet.has(first) && localeSet.has(second)) {
    if (first === second) {
      const localeTail = segments.slice(2).join("/");
      return {
        market: null,
        locale: first,
        hasMarketPrefix: false,
        hasLocalePrefix: true,
        duplicateLocale: true,
        cleanedPath: `/${first}${localeTail ? `/${localeTail}` : ""}`,
      };
    }
  }

  if (first && second && marketPrefixes.has(first) && localeSet.has(second)) {
    return {
      market: first,
      locale: second,
      hasMarketPrefix: true,
      hasLocalePrefix: true,
      duplicateLocale: false,
      cleanedPath: pathname,
    };
  }

  if (first && localeSet.has(first)) {
    return {
      market: null,
      locale: first,
      hasMarketPrefix: false,
      hasLocalePrefix: true,
      duplicateLocale: false,
      cleanedPath: pathname,
    };
  }

  if (first && marketPrefixes.has(first)) {
    return {
      market: first,
      locale: null,
      hasMarketPrefix: true,
      hasLocalePrefix: false,
      duplicateLocale: false,
      cleanedPath: pathname,
    };
  }

  return {
    market: null,
    locale: null,
    hasMarketPrefix: false,
    hasLocalePrefix: false,
    duplicateLocale: false,
    cleanedPath: pathname,
  };
}

function addFrontendRequestHeaders(
  request: NextRequest,
  market: string | null,
  locale: string,
  hostHeader: string
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);
  requestHeaders.set("x-frontend-host", market ? `${hostHeader}/${market}` : hostHeader);

  if (market) {
    requestHeaders.set("x-market", market);
    requestHeaders.set("x-market-prefix", market);
  } else {
    requestHeaders.delete("x-market");
    requestHeaders.delete("x-market-prefix");
  }

  return requestHeaders;
}

function attachMarketCookie(response: NextResponse, market: string | null, request: NextRequest) {
  if (!market) {
    response.cookies.set({
      name: MARKET_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return;
  }

  const isSecure =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  response.cookies.set({
    name: MARKET_COOKIE_NAME,
    value: market,
    path: "/",
    maxAge: MARKET_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: isSecure,
    httpOnly: false,
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathMarket = extractMarketFromPath(pathname);
  const resolvedMarket = resolveMarketFromRequest(request, pathMarket);

  if (isBlockedRequest(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { market, locale, hasMarketPrefix, hasLocalePrefix, duplicateLocale, cleanedPath } = parseSegments(pathname);
  const requestHost = sanitizeHostHeader(
    request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host
  );

  if (duplicateLocale) {
    const redirectMarket = market ?? resolvedMarket;
    const redirectPath = cleanedPath || `/${locale}`;
    request.nextUrl.pathname = redirectPath;
    const response = NextResponse.redirect(request.nextUrl, { status: 301 });
    const redirectHeaders = addFrontendRequestHeaders(request, redirectMarket, locale || getLocale(request), requestHost);
    redirectHeaders.forEach((value, headerKey) => {
      response.headers.set(headerKey, value);
    });
    attachMarketCookie(response, redirectMarket, request);
    return response;
  }

  // Skip locale redirect for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // files with extensions
  ) {
    const requestHeaders = addFrontendRequestHeaders(
      request,
      resolvedMarket,
      locale || getLocale(request),
      requestHost
    );
    const response = addSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } })
    );
    attachMarketCookie(response, resolvedMarket, request);
    return response;
  }

  // Locale and market are already present, only inject request headers
  if (hasLocalePrefix) {
    const requestHeaders = addFrontendRequestHeaders(
      request,
      resolvedMarket,
      locale || getLocale(request),
      requestHost
    );
    if (market && cleanedPath && cleanedPath !== pathname) {
      request.nextUrl.pathname = cleanedPath;
      const response = NextResponse.rewrite(request.nextUrl, {
        request: { headers: requestHeaders },
      });
      attachMarketCookie(response, resolvedMarket, request);
      return addSecurityHeaders(response);
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    attachMarketCookie(response, resolvedMarket, request);
    return addSecurityHeaders(response);
  }

  // Market-only route (eg. /qa, /om) -> add locale and keep market prefix
  if (hasMarketPrefix) {
    const nextLocale = getLocale(request);
    const remainder = pathname.substring((market?.length || 0) + 1);
    const normalizedRemainder = remainder
      ? (remainder.startsWith("/") ? remainder : `/${remainder}`)
      : "";
    const marketPath = `/${market}/${nextLocale}${normalizedRemainder}`;
    request.nextUrl.pathname = marketPath;

    const response = NextResponse.redirect(request.nextUrl, { status: 301 });
    const redirectHeaders = addFrontendRequestHeaders(request, market, nextLocale, requestHost);
    redirectHeaders.forEach((value, headerKey) => {
      response.headers.set(headerKey, value);
    });
    attachMarketCookie(response, market, request);
    return response;
  }

  // Redirect to locale-prefixed path
  const nextLocale = getLocale(request);
  request.nextUrl.pathname = `/${nextLocale}${pathname}`;
  const response = NextResponse.redirect(request.nextUrl);
  const fallbackHeaders = addFrontendRequestHeaders(
    request,
    resolvedMarket,
    nextLocale,
    requestHost
  );
  fallbackHeaders.forEach((value, headerKey) => {
    response.headers.set(headerKey, value);
  });
  attachMarketCookie(response, null, request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|plugins).*)",
  ],
};
