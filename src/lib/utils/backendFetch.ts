import { siteConfig } from "@/config/site";

const API_BASE = siteConfig.apiUrl;
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
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders || init?.headers,
  });

  if (response.status !== 404 && response.status !== 403) {
    return response;
  }
  return response;
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
