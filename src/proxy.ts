import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";

const locales = siteConfig.locales;
const defaultLocale = siteConfig.defaultLocale;
const MARKET_PREFIX_SEGMENTS = new Set<string>(["qa", "om", "sa"]);
const LOCALE_SEGMENTS = new Set<string>(["en", "ar"]);

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

function normalizeHostHeader(value: string | null): string {
  if (!value) return "";
  const host = value.split(",")[0].trim();
  return host.replace(/:\d+$/, "").trim();
}

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().substring(0, 2))
      .find((lang) => locales.includes(lang as typeof locales[number]));
    if (preferredLocale) return preferredLocale;
  }
  return defaultLocale;
}

function getMarketAndLocale(pathname: string): { market?: string; locale?: string } {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();

  if (MARKET_PREFIX_SEGMENTS.has(first || "")) {
    const locale = LOCALE_SEGMENTS.has(second || "") ? second : undefined;
    return { market: first, locale };
  }

  if (LOCALE_SEGMENTS.has(first || "")) {
    return { locale: first };
  }

  return {};
}

function getPathFromHeader(request: NextRequest): string {
  const referer = request.headers.get("referer") || request.headers.get("referrer");
  if (!referer) return "";

  try {
    return new URL(referer).pathname || "";
  } catch {
    return "";
  }
}

function applyRequestRoutingHeaders(
  request: NextRequest,
  locale: string,
  market?: string
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);
  if (market) {
    requestHeaders.set("x-market", market);
  }

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const normalizedHost = normalizeHostHeader(rawHost);
  requestHeaders.set("x-frontend-host", market ? `${normalizedHost}/${market}` : normalizedHost);

  return requestHeaders;
}

function rewriteMarketPathToLocaleRoute(
  request: NextRequest,
  locale: string,
  market: string,
  segments: string[]
) {
  const rest = segments.slice(2);
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
  const requestHeaders = applyRequestRoutingHeaders(request, locale, market);
  const response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  return addSecurityHeaders(response);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { market: routeMarket, locale: routeLocale } = getMarketAndLocale(pathname);
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();
  const refererPath = getPathFromHeader(request);
  const { market: refererMarket, locale: refererLocale } = getMarketAndLocale(refererPath);
  const market = routeMarket || refererMarket;

  if (isBlockedRequest(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Skip locale redirect for static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // files with extensions
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api")) {
    const requestHeaders = applyRequestRoutingHeaders(
      request,
      routeLocale || refererLocale || getLocale(request),
      market
    );
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  }

  // Fix duplicated locale prefix: /en/en/... -> /en/... or /ar/ar/... -> /ar/...
  if (LOCALE_SEGMENTS.has(first || "") && LOCALE_SEGMENTS.has(second || "") && first === second) {
    const correctLocale = first || defaultLocale;
    const rest = segments.length > 2 ? `/${segments.slice(2).join("/")}` : "";
    request.nextUrl.pathname = `/${correctLocale}${rest}`;
    return NextResponse.redirect(request.nextUrl, { status: 301 });
  }

  // Fix repeated locale after market prefix: /qa/en/en/... -> /qa/en/...
  if (routeLocale && segments[2] === routeLocale && segments.length > 2) {
    const rest = segments.slice(3);
    const corrected = `/${market}/${routeLocale}${rest.length ? `/${rest.join("/")}` : ""}`;
    request.nextUrl.pathname = corrected;
    return NextResponse.redirect(request.nextUrl, { status: 301 });
  }

  // Keep public market URLs (/qa/en/...) while rendering the existing locale route (/en/...).
  if (market && routeLocale) {
    return rewriteMarketPathToLocaleRoute(request, routeLocale, market, segments);
  }

  // Check if pathname already has a locale (intl).
  if (LOCALE_SEGMENTS.has(first || "")) {
    const detectedLocale = routeLocale || (first || "en");
    const requestHeaders = applyRequestRoutingHeaders(request, detectedLocale, market);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  }

  // Redirect to market-first locale path when market exists without locale
  if (market && !routeLocale) {
    const locale = getLocale(request);
    const redirectPath = `/${market}/${locale}${segments.length > 1 ? `/${segments.slice(1).join("/")}` : ""}`;
    const requestHeaders = applyRequestRoutingHeaders(request, locale, market);
    request.nextUrl.pathname = redirectPath;
    const response = NextResponse.redirect(request.nextUrl, 308);
    Object.entries(Object.fromEntries(requestHeaders.entries())).forEach(([name, value]) => {
      response.headers.set(name, value);
    });
    return addSecurityHeaders(response);
  }

  // Redirect to locale-prefixed path for intl routes.
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  const requestHeaders = applyRequestRoutingHeaders(request, locale);
  const response = NextResponse.redirect(request.nextUrl, 308);
  Object.entries(Object.fromEntries(requestHeaders.entries())).forEach(([name, value]) => {
    response.headers.set(name, value);
  });
  return addSecurityHeaders(response);
}
