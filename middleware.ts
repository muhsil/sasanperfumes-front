import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "./src/config/site";
import { proxy } from "./src/proxy";

function isCanonicalHost(request: NextRequest) {
  const hostHeader = request.headers.get("host")?.toLowerCase() || "";
  const host = hostHeader.split(":")[0];
  const canonicalHost = (
    process.env.NEXT_PUBLIC_CANONICAL_HOST ||
    process.env.CANONICAL_HOST ||
    new URL(siteConfig.url).hostname
  ).replace(/^www\./, "").toLowerCase();

  const allowedHosts = ["localhost", "127.0.0.1", "::1", "cms.shapehive.com", "localhost:3000"];
  const devLikeHost = allowedHosts.some((allowed) => host === allowed || host.startsWith(`${allowed}:`));

  if (devLikeHost) {
    return true;
  }

  return host === canonicalHost;
}

function enforceCanonicalHost(request: NextRequest) {
  if (isCanonicalHost(request)) return;

  const canonicalHost =
    process.env.NEXT_PUBLIC_CANONICAL_HOST ||
    process.env.CANONICAL_HOST ||
    new URL(siteConfig.url).hostname.replace(/^www\./, "");

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = canonicalHost;
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
