import { siteConfig } from "@/config/site";

const API_BASE = siteConfig.apiUrl;
const MARKET_CODES = new Set(["qa", "om", "sa"]);
const BACKEND_FETCH_TIMEOUT_MS = 6000;
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

  try {
    const parsed = new URL(base);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] !== cleanMarket) {
      parsed.pathname = `/${[cleanMarket, ...segments].join("/")}`;
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return `${base}/${cleanMarket}`;
  }
}

export function wpJsonBaseForMarket(market?: string | null): string {
  return `${backendBaseForMarket(market)}/wp-json`;
}

export function rewriteBackendUrlForMarket(url: string, market?: string | null): string {
  const cleanMarket = extractMarketCode(market);
  if (!cleanMarket) return url;

  try {
    const parsed = new URL(url);
    const apiHost = new URL(API_BASE).hostname.toLowerCase();
    if (parsed.hostname.toLowerCase() !== apiHost) {
      return url;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === cleanMarket) {
      return parsed.toString();
    }

    parsed.pathname = `/${[cleanMarket, ...segments].join("/")}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function backendPostHeaders(extra?: HeadersInit): HeadersInit {
  return backendHeaders({
    "Content-Type": "application/json",
    ...extra,
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
