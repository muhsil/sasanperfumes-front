<?php
/**
 * Multisite & per-site helpers for frontend URL resolution.
 *
 * The plugin is designed to run on WordPress multisite networks.
 * In that setup, each site can provide its own frontend URL value,
 * and the network can optionally provide overrides.
 */

if (!defined('ABSPATH')) exit;

function sasanperfumes_normalize_frontend_host(?string $host): string {
    $normalized = strtolower(trim((string) $host));
    if (!$normalized) return '';

    return preg_replace('/:\d+$/', '', $normalized);
}

function sasanperfumes_get_frontend_host(): string {
    $home_url = home_url();
    if (!$home_url) return '';
    return sasanperfumes_normalize_frontend_host(parse_url($home_url, PHP_URL_HOST));
}

function sasanperfumes_parse_frontend_url_map($raw_map): array {
    if (!is_array($raw_map)) {
        if (!is_string($raw_map)) return [];
        $decoded = json_decode($raw_map, true);
        if (!is_array($decoded)) return [];
        $raw_map = $decoded;
    }

    $map = [];
    foreach ($raw_map as $host => $url) {
        if (!is_string($host) || !is_string($url)) continue;
        $host_key = sasanperfumes_normalize_frontend_host($host);
        if (!$host_key) continue;
        $clean_url = trim($url);
        if (!$clean_url) continue;
        $map[$host_key] = untrailingslashit($clean_url);
    }

    return $map;
}

function sasanperfumes_get_frontend_url_map(): array {
    if (!is_multisite()) return [];

    $from_site = get_site_option('sasanperfumes_frontend_url_map', []);
    if (!$from_site) return [];

    return sasanperfumes_parse_frontend_url_map($from_site);
}

/**
 * Resolve frontend URL for the active site with network + per-site fallback.
 *
 * Priority:
 * 1) current site option `sasanperfumes_frontend_url` (existing field)
 * 2) multisite host mapping map (network option `sasanperfumes_frontend_url_map`)
 * 3) multisite network default option `sasanperfumes_frontend_url`
 * 4) supplied fallback
 */
function sasanperfumes_get_frontend_url($fallback = 'https://shapehive.com'): string {
    $fallback_url = untrailingslashit((string) $fallback ?: 'https://shapehive.com');

    $site_url = trim((string) get_option('sasanperfumes_frontend_url', ''));
    if ($site_url !== '') {
        return untrailingslashit($site_url);
    }

    if (is_multisite()) {
        $host = sasanperfumes_get_frontend_host();
        $map = sasanperfumes_get_frontend_url_map();
        if ($host && !empty($map[$host])) {
            return untrailingslashit($map[$host]);
        }

        $network_url = trim((string) get_site_option('sasanperfumes_frontend_url', ''));
        if ($network_url !== '') {
            return untrailingslashit($network_url);
        }
    }

    return $fallback_url;
}

