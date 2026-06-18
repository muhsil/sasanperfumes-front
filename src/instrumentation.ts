import { normalizeMarketHost } from "@/config/market";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

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
      const market = requestHeaders.get("x-market");
      const host = requestHeaders.get("host");
      const origin = requestHeaders.get("origin");
      const referer = requestHeaders.get("referer");
      const candidates = [explicitHost, forwardedHost, host, origin, referer];
      const selected = candidates.find((item) => Boolean(item)) ?? "";
      const normalized = normalizeMarketHost(selected);
      if (market) {
        const normalizedBaseHost = normalizeMarketHost(requestHeaders.get("host") || requestHeaders.get("x-forwarded-host") || "");
        const baseHost = normalizedBaseHost.split("/")[0];
        if (baseHost && normalized !== `${baseHost}/${market}`) {
          return `${baseHost}/${market}`;
        }
      }
      return normalized;
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

  const cmsUrl = (process.env.NEXT_PUBLIC_WC_API_URL || "https://cms.shapehive.com").replace(/\/+$/, "");
  const cmsHost = (() => {
    try {
      return new URL(cmsUrl).hostname.toLowerCase();
    } catch {
      return "cms.shapehive.com";
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
          const outputHeaders = headersToRecord(init?.headers);
          const hasFrontendHost = Object.keys(outputHeaders).some(
            (key) => key.toLowerCase() === "x-frontend-host"
          );
          if (frontendHost && !hasFrontendHost) {
            outputHeaders["X-Frontend-Host"] = frontendHost;
          }
          return originalFetch(input, { ...init, headers: backendHeaders(outputHeaders) });
        }
      } catch {
        // keep existing fetch behavior if URL parsing fails
      }

      return originalFetch(input, init);
    };
    g.__sasanperfumesFetchPatched = true;
  }
}
