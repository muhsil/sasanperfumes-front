import { siteConfig } from "@/config/site";

const API_BASE = siteConfig.apiUrl;
const BACKEND_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const LEGACY_MEDIA_HOSTS = [["cms", "fragrancenetwork", "ae"].join(".")];
const LEGACY_BRAND_NAMES = [
  ["Fragrance", "Network"].join(" "),
  ["Sasan", "Perfumes"].join(" "),
  "sasanperfumes",
];

export function backendHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Accept": "application/json",
    "User-Agent": BACKEND_USER_AGENT,
    ...extra,
  };
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
  const response = await fetch(url, init);

  if (response.status !== 404 && response.status !== 403) {
    return response;
  }
  return response;
}

function sanitizeBackendText(value: string): string {
  const withoutLegacyMedia = LEGACY_MEDIA_HOSTS.reduce(
    (text, host) => text
      .replaceAll(`https://${host}`, siteConfig.apiUrl)
      .replaceAll(`http://${host}`, siteConfig.apiUrl),
    value
  );

  return LEGACY_BRAND_NAMES.reduce(
    (text, legacyName) => text.replaceAll(legacyName, siteConfig.name),
    withoutLegacyMedia
  );
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
  try {
    return sanitizeBackendContent(JSON.parse(text) as Record<string, unknown>);
  } catch {
    const isHtml = text.trim().startsWith("<!") || text.trim().startsWith("<html");
    const snippet = text.slice(0, 200).replace(/[\r\n]+/g, " ").trim();
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
