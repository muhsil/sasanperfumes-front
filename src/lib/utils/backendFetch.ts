import dns from "dns";
import https from "https";
import { siteConfig } from "@/config/site";

const API_BASE = siteConfig.apiUrl;
const MARKET_CODES = new Set(["qa", "om", "sa"]);
const BACKEND_FETCH_TIMEOUT_MS = 6000;
const BACKEND_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "https://cms.sasanperfumes.com";
  }
})();
const BACKEND_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const LEGACY_MEDIA_HOSTS = [["cms", ["fragrance", "network"].join(""), "ae"].join(".")];

function headersToRecord(headers?: HeadersInit): Record<string, string> {
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
}

export function backendHeaders(extra?: HeadersInit): HeadersInit {
  const isBrowser = typeof window !== "undefined";
  return headersToRecord({
    "Accept": "application/json",
    ...(isBrowser ? {} : { "User-Agent": BACKEND_USER_AGENT }),
    ...extra,
  });
}

export function backendMarketHeaders(market?: string | null, extra?: HeadersInit): HeadersInit {
  const cleanMarket = extractMarketCode(market);
  return backendHeaders({
    ...(cleanMarket
      ? {
          "X-Market": cleanMarket,
          "X-Frontend-Host": `sasanperfumes.com/${cleanMarket}`,
        }
      : {}),
    ...headersToRecord(extra),
  });
}

export function extractMarketCode(value?: string | null): string {
  if (!value) return "";

  const raw = value.trim().toLowerCase();
  if (!raw) return "";

  if (MARKET_CODES.has(raw)) {
    return raw;
  }

  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const firstPath = parsed.pathname.split("/").filter(Boolean)[0] || "";
    return MARKET_CODES.has(firstPath) ? firstPath : "";
  } catch {
    const withoutProtocol = raw.replace(/^https?:\/\//, "");
    const firstPath = withoutProtocol.split("/").filter(Boolean)[1] || "";
    return MARKET_CODES.has(firstPath) ? firstPath : "";
  }
}

export function backendBaseForMarket(market?: string | null): string {
  const cleanMarket = extractMarketCode(market);
  const base = API_BASE.replace(/\/+$/, "");

  if (!cleanMarket) {
    return base;
  }

  return base;
}

export function wpJsonBaseForMarket(market?: string | null): string {
  return `${backendBaseForMarket(market)}/wp-json`;
}

export function rewriteBackendUrlForMarket(url: string, market?: string | null): string {
  const cleanMarket = extractMarketCode(market);
  if (!cleanMarket) return url;
  return url;
}

export function backendPostHeaders(extra?: HeadersInit): HeadersInit {
  return backendHeaders({
    "Content-Type": "application/json",
    ...extra,
  });
}

export function backendMarketPostHeaders(market?: string | null, extra?: HeadersInit): HeadersInit {
  return backendMarketHeaders(market, {
    "Content-Type": "application/json",
    ...headersToRecord(extra),
  });
}

function responseHeadersFromNode(headers: Record<string, string | string[] | undefined>): Headers {
  const responseHeaders = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => responseHeaders.append(key, entry));
    } else if (value !== undefined) {
      responseHeaders.set(key, value);
    }
  });
  return responseHeaders;
}

function fetchWithPublicDns(url: string, init: RequestInit = {}): Promise<Response> {
  const parsed = new URL(url);
  const body = typeof init.body === "string" || Buffer.isBuffer(init.body) ? init.body : undefined;
  const headers = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : Array.isArray(init.headers)
      ? Object.fromEntries(init.headers.map(([key, value]) => [key, String(value)]))
      : Object.fromEntries(Object.entries(init.headers || {}).map(([key, value]) => [key, String(value)]));

  return new Promise<Response>((resolve, reject) => {
    const request = https.request(
      parsed,
      {
        method: init.method || "GET",
        headers,
        lookup: (hostname, options, callback) => {
          dns.resolve4(hostname, (error, addresses) => {
            if (error || addresses.length === 0) {
              callback(error || new Error(`No public DNS A record for ${hostname}`), undefined as never, undefined as never);
              return;
            }
            if (typeof options === "object" && options.all) {
              (callback as (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void)(
                null,
                addresses.map((address) => ({ address, family: 4 }))
              );
              return;
            }
            callback(null, addresses[0], 4);
          });
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("end", () => {
          resolve(new Response(Buffer.concat(chunks), {
            status: incoming.statusCode || 200,
            statusText: incoming.statusMessage || "",
            headers: responseHeadersFromNode(incoming.headers),
          }));
        });
      }
    );

    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

export function fetchBackendForMarket(url: string, init: RequestInit = {}, market?: string | null): Promise<Response> {
  const cleanMarket = extractMarketCode(market);
  if (!MARKET_CODES.has(cleanMarket)) {
    return fetch(noCacheUrl(url), init);
  }

  const headers = {
    ...(backendMarketHeaders(cleanMarket, init.headers) as Record<string, string>),
    Origin: BACKEND_ORIGIN,
  };

  return fetchWithPublicDns(noCacheUrl(url), {
    ...init,
    headers,
  });
}

export function backendAuthHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return backendHeaders({
    "Authorization": `Bearer ${token}`,
    ...extra,
  });
}

export function noCacheUrl(url: string): string {
  return url;
}

export async function fetchBackend(url: string, init?: RequestInit): Promise<Response> {
  const requestHeaders = init?.headers ? headersToRecord(init.headers) : undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: requestHeaders || init?.headers,
      signal: controller.signal,
    });

    if (response.status !== 404 && response.status !== 403) {
      return response;
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeBackendText(value: string): string {
  return LEGACY_MEDIA_HOSTS.reduce(
    (text, host) => text
      .replaceAll(`https://${host}`, siteConfig.apiUrl)
      .replaceAll(`http://${host}`, siteConfig.apiUrl),
    value
  );
}

export function stripBackendJsonPrefix(value: string): string {
  return value.replace(/^[\uFEFF\u200B\u200C\u200D\s]+/, "");
}

export function parseBackendJson<T>(text: string): T {
  return JSON.parse(stripBackendJsonPrefix(text)) as T;
}

export function sanitizeBackendContent<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeBackendText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeBackendContent(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeBackendContent(item)])
    ) as T;
  }

  return value;
}

export async function safeJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const jsonText = stripBackendJsonPrefix(text);
  try {
    return sanitizeBackendContent(parseBackendJson<Record<string, unknown>>(jsonText));
  } catch {
    const isHtml = jsonText.trim().startsWith("<!") || jsonText.trim().startsWith("<html");
    const snippet = jsonText.slice(0, 200).replace(/[\r\n]+/g, " ").trim();
    console.warn(
      `[backendFetch] Non-JSON response (${response.status}): ${snippet}`
    );
    return {
      code: "invalid_response",
      message: isHtml
        ? "Backend returned an HTML page instead of JSON. The server may be blocking API requests. Please check server firewall/WAF settings and ensure /wp-json/* paths are not blocked or cached."
        : "Backend returned non-JSON response",
      _raw_length: text.length,
      _raw_snippet: snippet,
    };
  }
}

export { API_BASE };
