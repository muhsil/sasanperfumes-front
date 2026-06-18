import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";

const locales = siteConfig.locales;
const defaultLocale = siteConfig.defaultLocale;

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBlockedRequest(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Fix duplicated locale prefix: /en/en/... → /en/... or /ar/ar/... → /ar/...
    const dupMatch = pathname.match(/^\/(en|ar)\/(en|ar)\//);
    if (dupMatch) {
      const correctLocale = dupMatch[1];
      const rest = pathname.slice(`/${correctLocale}/${dupMatch[2]}`.length);
      request.nextUrl.pathname = `/${correctLocale}${rest}`;
      return NextResponse.redirect(request.nextUrl, { status: 301 });
    }

    // Set x-locale on request headers so the root layout can read the locale
    // and set the correct HTML lang attribute (fixes Arabic pages having lang="en")
    const detectedLocale = pathname.startsWith("/ar") ? "ar" : "en";
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", detectedLocale);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  }

  // Skip locale redirect for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // files with extensions
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Redirect to locale-prefixed path
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|plugins).*)",
  ],
};
