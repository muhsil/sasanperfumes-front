export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const marketCodes = new Set(["qa", "om", "sa"]);

  const normalizeFrontendHost = (value: string): string => {
    const raw = value.trim().toLowerCase();
    if (!raw) return "";

    try {
      const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
      const host = parsed.hostname.replace(/^www\./, "");
      const firstPath = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return marketCodes.has(firstPath) ? `${host}/${firstPath}` : host;
    } catch {
      const withoutProtocol = raw.replace(/^https?:\/\//, "");
      const segments = withoutProtocol.split("/").filter(Boolean);
      if (segments.length === 0) return "";
      const host = segments[0].split(":")[0].replace(/^www\./, "");
      const firstPath = segments[1] || "";
      return marketCodes.has(firstPath) ? `${host}/${firstPath}` : host;
    }
  };

  const extractMarket = (value: string): string => {
    const normalized = normalizeFrontendHost(value);
    const market = normalized.split("/")[1] || "";
    return marketCodes.has(market) ? market : "";
  };

  const rewriteCmsUrlForMarket = (urlText: string, cmsHost: string, market: string): string => {
    if (!marketCodes.has(market)) return urlText;

    try {
      const parsed = new URL(urlText);
      if (parsed.hostname.toLowerCase() !== cmsHost) {
        return urlText;
      }

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === market) {
        return parsed.toString();
      }

      // Do not rewrite CoCart requests to a market-prefixed path; this returns `rest_no_route`.
      if (segments[0] === "wp-json" && segments[1] === "cocart" && segments[2] === "v2") {
        return urlText;
      }

      if (segments[0] === "wp-json" || segments[0] === "graphql") {
        parsed.pathname = `/${[market, ...segments].join("/")}`;
        return parsed.toString();
      }
    } catch {
      return urlText;
    }

    return urlText;
  };

  const headersToRecord = (headers?: HeadersInit): Record<string, string> => {
    if (!headers) return {};
    if (typeof Headers !== "undefined" && headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }
    return { ...(headers as Record<string, string>) };
  };

  const getIncomingFrontendHost = async (): Promise<string> => {
    try {
      const { headers: getRequestHeaders } = await import("next/headers");
      const requestHeaders = await getRequestHeaders();
      const explicitHost = requestHeaders.get("x-frontend-host");
      const forwardedHost = requestHeaders.get("x-forwarded-host");
      const host = requestHeaders.get("host");
      const origin = requestHeaders.get("origin");
      const referer = requestHeaders.get("referer");
      const candidates = [explicitHost, forwardedHost, host, origin, referer];
      const selected = candidates.find((item) => Boolean(item)) ?? "";
      return normalizeFrontendHost(selected);
    } catch {
      return "";
    }
  };

  const [{ readFileSync }, { join }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);
  const { backendHeaders } = await import("@/lib/utils/backendFetch");

  try {
    const envPath = join(process.cwd(), ".env");
    const envFile = readFileSync(envPath, "utf8");
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found, continue with process env values
  }

  const cmsUrl = (process.env.NEXT_PUBLIC_WC_API_URL || "https://cms.sasanperfumes.com").replace(/\/+$/, "");
  const cmsHost = (() => {
    try {
      return new URL(cmsUrl).hostname.toLowerCase();
    } catch {
      return "cms.sasanperfumes.com";
    }
  })();

  const g = globalThis as Record<string, unknown> & {
    fetch: typeof fetch;
    __sasanperfumesFetchPatched?: boolean;
  };

  if (!g.__sasanperfumesFetchPatched && typeof g.fetch === "function") {
    const originalFetch = g.fetch;
    g.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      try {
        const urlText = typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
        const parsed = new URL(urlText);
        if (parsed.hostname.toLowerCase() === cmsHost) {
          const frontendHost = await getIncomingFrontendHost();
          const market = extractMarket(frontendHost);
          const outputHeaders = headersToRecord(init?.headers);
          const hasFrontendHost = Object.keys(outputHeaders).some(
            (key) => key.toLowerCase() === "x-frontend-host"
          );
          if (frontendHost && !hasFrontendHost) {
            outputHeaders["X-Frontend-Host"] = frontendHost;
          }
          if (market && !Object.keys(outputHeaders).some((key) => key.toLowerCase() === "x-market")) {
            outputHeaders["X-Market"] = market;
          }
          const rewrittenUrl = market ? rewriteCmsUrlForMarket(urlText, cmsHost, market) : urlText;
          const rewrittenInput = typeof input === "string" || input instanceof URL ? rewrittenUrl : input;
          return originalFetch(rewrittenInput, { ...init, headers: backendHeaders(outputHeaders) });
        }
      } catch {
        // keep existing fetch behavior if URL parsing fails
      }

      return originalFetch(input, init);
    };
    g.__sasanperfumesFetchPatched = true;
  }
}
