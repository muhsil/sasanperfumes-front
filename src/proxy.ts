import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";

const locales = siteConfig.locales;
const defaultLocale = siteConfig.defaultLocale;
const MARKET_PREFIX_SEGMENTS = new Set<string>(["qa", "om", "sa"]);
const LOCALE_SEGMENTS = new Set<string>(["en", "ar"]);
const LEGACY_BRAND_CATEGORY_SLUGS = new Set<string>(["flower-scents", "rimal", "serenity", "liwan"]);
const CMS_BACKEND_ORIGIN = "https://cms.sasanperfumes.com";

const COUNTRY_TO_MARKET: Record<string, string> = {
  OM: "om",
  SA: "sa",
  QA: "qa",
};
const GEO_REDIRECT_COOKIE = "sp_geo_redirected";

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

  const lowerPath = stripReservedRequestPrefixes(pathname.toLowerCase());

  for (const blocked of BLOCKED_PATHS) {
    if (lowerPath === blocked || lowerPath.startsWith(blocked + "/")) return true;
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lowerPath)) return true;
  }

  return false;
}

function stripReservedRequestPrefixes(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  while (segments.length > 0) {
    const first = segments[0]?.toLowerCase();
    if (!MARKET_PREFIX_SEGMENTS.has(first || "") && !LOCALE_SEGMENTS.has(first || "")) {
      break;
    }
    segments.shift();
  }

  return `/${segments.join("/")}` || "/";
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

function addNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function isBackendLoginOrAdminPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  const working = [...segments];
  while (working.length > 0 && LOCALE_SEGMENTS.has((working[0] || "").toLowerCase())) {
    working.shift();
  }

  if (working.length > 0 && MARKET_PREFIX_SEGMENTS.has((working[0] || "").toLowerCase())) {
    working.shift();
    while (working.length > 0 && LOCALE_SEGMENTS.has((working[0] || "").toLowerCase())) {
      working.shift();
    }
  }

  const candidate = `/${working.join("/")}`.replace(/\/+/g, "/");
  return (
    candidate === "/wp-admin" ||
    candidate.startsWith("/wp-admin/") ||
    candidate === "/wp-login.php" ||
    candidate.startsWith("/wp-login.php/") ||
    candidate === "/wp-login" ||
    candidate.startsWith("/wp-login/")
  );
}

function redirectBackendRequestToCms(request: NextRequest): NextResponse | undefined {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return;

  const working = [...segments];
  while (working.length > 0 && LOCALE_SEGMENTS.has((working[0] || "").toLowerCase())) {
    working.shift();
  }

  let market = "";
  if (working.length > 0 && MARKET_PREFIX_SEGMENTS.has((working[0] || "").toLowerCase())) {
    market = (working.shift() || "").toLowerCase();
    while (working.length > 0 && LOCALE_SEGMENTS.has((working[0] || "").toLowerCase())) {
      working.shift();
    }
  }

  const candidate = `/${working.join("/")}`.replace(/\/+/g, "/");
  if (!isBackendLoginOrAdminPath(candidate)) {
    return;
  }

  const redirectUrl = new URL(CMS_BACKEND_ORIGIN);
  redirectUrl.pathname = `${market ? `/${market}` : ""}${candidate}`;
  redirectUrl.search = request.nextUrl.search;
  return addSecurityHeaders(NextResponse.redirect(redirectUrl, 302));
}

function redirectToPath(request: NextRequest, pathname: string, status = 301): NextResponse {
  const redirectUrl = new URL(request.url);
  redirectUrl.pathname = pathname;
  return addSecurityHeaders(NextResponse.redirect(redirectUrl, { status }));
}

function redirectWpmlDuplicateProduct(
  request: NextRequest,
  segments: string[],
  market?: string,
  locale?: string
): NextResponse | undefined {
  if (!locale) return;

  const productIndex = market ? 2 : 1;
  if (segments[productIndex]?.toLowerCase() !== "product") return;

  const slug = segments[productIndex + 1];
  if (!slug || segments.length !== productIndex + 2 || !/-ar(?:-\d+)?$/i.test(slug)) return;

  const canonicalSlug = slug.replace(/-ar(?:-\d+)?$/i, "");
  if (!canonicalSlug) return;

  const prefix = market ? `/${market}/${locale}` : `/${locale}`;
  return redirectToPath(request, `${prefix}/product/${canonicalSlug}`, 308);
}

function redirectLegacyBrandCategoryPaths(request: NextRequest, segments: string[]): NextResponse | undefined {
  if (segments.length < 3) return;

  const firstSegment = segments[0]?.toLowerCase();
  const hasMarket = MARKET_PREFIX_SEGMENTS.has(firstSegment || "");
  const localeIndex = hasMarket ? 1 : 0;
  const locale = segments[localeIndex]?.toLowerCase();
  const categorySegment = segments[localeIndex + 1]?.toLowerCase();
  const slug = segments[localeIndex + 2]?.toLowerCase();

  if (!LOCALE_SEGMENTS.has(locale || "")) return;
  if (categorySegment !== "category" || !slug || !LEGACY_BRAND_CATEGORY_SLUGS.has(slug)) return;

  return redirectToPath(
    request,
    `${hasMarket ? `/${firstSegment}` : ""}/${locale}/brands/${slug}`,
    308
  );
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

function normalizeHostForMarket(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.split(",")[0]?.trim();
  if (!raw) return "";
  return normalizeHostHeader(raw).replace(/^www\./, "");
}

function getMarketFromHost(value: string | null | undefined): string | undefined {
  const normalized = normalizeHostForMarket(value);
  if (!normalized) return undefined;

  const hostPart = normalized.split("/")[0];
  if (!hostPart) return undefined;

  const segments = hostPart.split(".").filter(Boolean);
  if (segments.length > 2 && MARKET_PREFIX_SEGMENTS.has(segments[0])) {
    return segments[0];
  }

  return undefined;
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
  const isApiRoute = rest[0] === "api";
  const rewriteUrl = request.nextUrl.clone();
  const requestHeaders = applyRequestRoutingHeaders(request, locale, market);
  rewriteUrl.pathname = isApiRoute ? `/${rest.join("/")}` : `/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
  rewriteUrl.searchParams.set("__market", market);
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
  const explicitMarket = request.headers.get("x-market")?.toLowerCase();
  const hostMarket =
    getMarketFromHost(request.headers.get("x-forwarded-host")) ||
    getMarketFromHost(request.headers.get("host")) ||
    getMarketFromHost(request.nextUrl.host);
  const market = routeMarket || refererMarket || (MARKET_PREFIX_SEGMENTS.has(explicitMarket || "") ? explicitMarket : undefined) || hostMarket;
  const marketIsFromPath = Boolean(routeMarket);

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

  // Geo-redirect: visitors from OM/SA/QA on the intl site → their market URL
  if (!routeMarket && !pathname.startsWith("/api")) {
    const country = (
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      ""
    ).toUpperCase();
    const targetMarket = COUNTRY_TO_MARKET[country];
    if (targetMarket && !request.cookies.get(GEO_REDIRECT_COOKIE)) {
      const locale = routeLocale || getLocale(request);
      const rest = routeLocale ? segments.slice(1) : segments;
      const redirectPath = `/${targetMarket}/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
      const response = addSecurityHeaders(redirectToPath(request, redirectPath, 302));
      response.cookies.set(GEO_REDIRECT_COOKIE, "1", {
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
        sameSite: "lax",
      });
      return response;
    }
  }

  if (pathname.startsWith("/api")) {
    const requestHeaders = applyRequestRoutingHeaders(
      request,
      routeLocale || refererLocale || getLocale(request),
      market
    );
    if (market) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.searchParams.set("__market", market);
      const response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
      return addNoStoreHeaders(addSecurityHeaders(response));
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addNoStoreHeaders(addSecurityHeaders(response));
  }

  const legacyBrandCategoryRedirect = redirectLegacyBrandCategoryPaths(request, segments);
  if (legacyBrandCategoryRedirect) {
    return legacyBrandCategoryRedirect;
  }

  const duplicateProductRedirect = redirectWpmlDuplicateProduct(
    request,
    segments,
    routeMarket,
    routeLocale
  );
  if (duplicateProductRedirect) {
    return duplicateProductRedirect;
  }

  // Fix malformed locale-first market URLs: /ar/qa/en/... -> /qa/ar/...
  if (LOCALE_SEGMENTS.has(first || "") && MARKET_PREFIX_SEGMENTS.has(second || "")) {
    const correctedLocale = first || defaultLocale;
    const correctedMarket = second || "";
    const restStart = LOCALE_SEGMENTS.has(segments[2]?.toLowerCase() || "") ? 3 : 2;
    const rest = segments.slice(restStart);
    return redirectToPath(
      request,
      `/${correctedMarket}/${correctedLocale}${rest.length ? `/${rest.join("/")}` : ""}`
    );
  }

  // Fix links generated with a missing market value: /undefined/en/... -> /en/...
  if (first === "undefined") {
    if (MARKET_PREFIX_SEGMENTS.has(second || "") && LOCALE_SEGMENTS.has(segments[2]?.toLowerCase() || "")) {
      const rest = segments.slice(3);
      return redirectToPath(
        request,
        `/${second}/${segments[2].toLowerCase()}${rest.length ? `/${rest.join("/")}` : ""}`
      );
    }
    if (LOCALE_SEGMENTS.has(second || "")) {
      const rest = segments.slice(2);
      return redirectToPath(request, `/${second}${rest.length ? `/${rest.join("/")}` : ""}`);
    }
  }

  // Fix market URLs with a missing locale slot: /qa/undefined/en/... -> /qa/en/...
  if (MARKET_PREFIX_SEGMENTS.has(first || "") && second === "undefined") {
    const correctedLocale = LOCALE_SEGMENTS.has(segments[2]?.toLowerCase() || "")
      ? segments[2].toLowerCase()
      : getLocale(request);
    const rest = LOCALE_SEGMENTS.has(segments[2]?.toLowerCase() || "") ? segments.slice(3) : segments.slice(2);
    return redirectToPath(
      request,
      `/${first}/${correctedLocale}${rest.length ? `/${rest.join("/")}` : ""}`
    );
  }

  // Fix duplicated locale prefix: /en/en/... -> /en/... or /ar/ar/... -> /ar/...
  if (LOCALE_SEGMENTS.has(first || "") && LOCALE_SEGMENTS.has(second || "") && first === second) {
    const correctLocale = first || defaultLocale;
    const rest = segments.length > 2 ? `/${segments.slice(2).join("/")}` : "";
    return redirectToPath(request, `/${correctLocale}${rest}`);
  }

  // Fix repeated locale after market prefix: /qa/en/en/... or /qa/en/ar/... -> /qa/en/...
  if (routeLocale && LOCALE_SEGMENTS.has(segments[2]?.toLowerCase() || "") && segments.length > 2) {
    const rest = segments.slice(3);
    const corrected = `/${market}/${routeLocale}${rest.length ? `/${rest.join("/")}` : ""}`;
    return redirectToPath(request, corrected);
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
    const redirectPath = `${marketIsFromPath ? `/${market}` : ""}/${locale}${segments.length > 1 ? `/${segments.slice(1).join("/")}` : ""}`.replace(/^\/+/, "/");
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
