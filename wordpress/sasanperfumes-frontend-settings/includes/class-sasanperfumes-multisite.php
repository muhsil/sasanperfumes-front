<?php
/**
 * Multisite & per-site helpers for frontend URL resolution.
 *
 * The plugin is designed to run on WordPress multisite networks.
 * In that setup, each site can provide its own frontend URL value,
 * and the network can optionally provide overrides.
 */

if (!defined('ABSPATH')) exit;

function sasanperfumes_normalize_frontend_host_segment($segment): string {
    $normalized = strtolower(trim((string) $segment));
    if (!$normalized) return '';
    return trim($normalized, " \t\n\r\0\x0B");
}

function sasanperfumes_normalize_frontend_host(?string $host): string {
    $normalized = strtolower(trim((string) $host));
    if (!$normalized) return '';

    $normalized = preg_replace('/\s+/', '', $normalized);
    if (!$normalized) return '';
    $normalized = preg_replace('/[?#].*$/', '', $normalized);
    if (!$normalized) return '';

    return preg_replace('/:\d+$/', '', $normalized);
}

function sasanperfumes_normalize_frontend_host_with_market(?string $host): string {
    $normalized = strtolower(trim((string) $host));
    if (!$normalized) return '';

    $known_markets = array('qa', 'om', 'sa');

    $normalized = preg_replace('/\s+/', '', $normalized);
    if (!$normalized) return '';
    $normalized = preg_replace('/[?#].*$/', '', $normalized);
    if (!$normalized) return '';

    $path = '';
    $work = $normalized;
    if (strpos($work, '://') !== false) {
        $parsed = @parse_url($work);
        if (is_array($parsed)) {
            $host = (string) ($parsed['host'] ?? '');
            $path = (string) ($parsed['path'] ?? '');
            if (array_key_exists('query', $parsed) && $path !== '') {
                // Keep path for marker matching only, never for query strings.
            }
            $normalized = $host . ($path ? '/' . ltrim($path, '/') : '');
        }
    }

    $normalized = preg_replace('/^https?:\/\//', '', $normalized);
    if (!$normalized) return '';

    $parts = explode('/', $normalized, 2);
    if (count($parts) === 0) return '';

    $host_part = preg_replace('/:\d+$/', '', $parts[0]);
    $host_part = preg_replace('/^www\./', '', $host_part);

    $host_part = strtolower(trim($host_part));
    if (!$host_part) return '';

    $host_labels = explode('.', $host_part);
    $subdomain_market = (string) ($host_labels[0] ?? '');
    if (count($host_labels) > 2 && in_array($subdomain_market, $known_markets, true)) {
        $base_host = implode('.', array_slice($host_labels, 1));
        if ($base_host !== '') {
            $host_part = $base_host;
            if (empty($parts[1])) {
                return $host_part . '/' . $subdomain_market;
            }
        }
    }

    if (empty($parts[1])) {
        return $host_part;
    }

    $path_segments = array_values(array_filter(explode('/', $parts[1]), 'strlen'));
    if (empty($path_segments)) {
        return $host_part;
    }

    $market_prefix = sasanperfumes_normalize_frontend_host_segment($path_segments[0]);
    if (in_array($market_prefix, $known_markets, true)) {
        return $host_part . '/' . $market_prefix;
    }

    return $host_part;
}

function sasanperfumes_parse_frontend_host_parts(string $frontend_host): array {
    $normalized = sasanperfumes_normalize_frontend_host_with_market($frontend_host);
    if (!$normalized) return array('host' => '', 'market' => '');

    $parts = explode('/', $normalized, 2);
    return array(
        'host' => (string) ($parts[0] ?? ''),
        'market' => (string) ($parts[1] ?? ''),
    );
}

function sasanperfumes_get_frontend_host(): string {
    $home_url = home_url();
    if (!$home_url) return '';
    return sasanperfumes_normalize_frontend_host_with_market($home_url);
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
        $host_key = sasanperfumes_normalize_frontend_host_with_market($host);
        if (!$host_key) continue;
        $clean_url = trim($url);
        if (!$clean_url) continue;
        $map[$host_key] = untrailingslashit($clean_url);
    }

    return $map;
}

function sasanperfumes_format_frontend_url_map_text(array $map): string {
    if (empty($map)) return '';
    return wp_json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}

/**
 * Return only the base frontend origin/path used for building links.
 * Removes known market path segments so route builders can add them explicitly.
 */
function sasanperfumes_get_frontend_url_root(?string $frontend_url = ''): string {
    $raw = trim((string) ($frontend_url ?: sasanperfumes_get_frontend_url()));
    if ($raw === '') return '';

    $parts = @parse_url($raw);
    if (!is_array($parts) || empty($parts['host'])) {
        return untrailingslashit($raw);
    }

    $scheme = isset($parts['scheme']) ? (string) $parts['scheme'] : 'https';
    $host = (string) $parts['host'];
    $path = trim((string) ($parts['path'] ?? ''), '/');
    $normalized_host = sasanperfumes_normalize_frontend_host_with_market(
        $host . ($path !== '' ? '/' . $path : '')
    );
    if (!$normalized_host) return untrailingslashit($raw);

    $host_parts = explode('/', $normalized_host, 2);
    $base_host = trim((string) ($host_parts[0] ?? ''));
    if ($base_host === '') {
        return untrailingslashit($raw);
    }

    $base = $scheme . '://' . $base_host;

    if (!empty($parts['port'])) {
        $base .= ':' . $parts['port'];
    }

    $base_path = $path;
    $market = sasanperfumes_frontend_market_for_url($raw);
    if ($base_path === '') {
        if (!$market) {
            $base_path = trim((string) ($host_parts[1] ?? ''), '/');
        }
    } elseif ($market !== '' && $base_path === $market) {
        $base_path = '';
    }

    if ($base_path !== '') {
        $base .= '/' . $base_path;
    }

    return untrailingslashit($base);
}

/**
 * Resolve market prefix from a frontend URL for route building.
 */
function sasanperfumes_frontend_market_for_url(string $frontend_url = ''): string {
    $normalized = sasanperfumes_normalize_frontend_host_with_market(
        $frontend_url !== '' ? $frontend_url : sasanperfumes_get_frontend_url()
    );
    if (!$normalized) return '';

    $parts = sasanperfumes_parse_frontend_host_parts($normalized);
    return (string) ($parts['market'] ?? '');
}

/**
 * Build a locale-aware frontend URL with optional market context.
 */
function sasanperfumes_build_frontend_localized_url(string $locale, string $path = '', string $frontend_url = ''): string {
    $frontend_url = trim($frontend_url ?: sasanperfumes_get_frontend_url());
    if ($frontend_url === '') return '';

    $base_url = sasanperfumes_get_frontend_url_root($frontend_url);
    if ($base_url === '') return '';

    $market = sasanperfumes_frontend_market_for_url($frontend_url);
    $segments = [];

    if ($market !== '') {
        $segments[] = $market;
    }

    $segments[] = in_array($locale, ['en', 'ar'], true) ? $locale : 'en';

    $clean_path = trim((string) $path);
    if ($clean_path !== '') {
        $segments[] = ltrim($clean_path, '/');
    }

    return untrailingslashit($base_url) . '/' . implode('/', array_filter($segments, 'strlen'));
}

function sasanperfumes_get_frontend_url_map(): array {
    if (!is_multisite()) return [];

    $from_site = get_site_option('sasanperfumes_frontend_url_map', null);
    if ($from_site === null) {
        return sasanperfumes_get_frontend_url_map_example();
    }
    if (!$from_site) return [];

    return sasanperfumes_parse_frontend_url_map($from_site);
}

function sasanperfumes_get_frontend_url_map_example(): array {
    return array(
        'cms.shapehive.com' => 'https://shapehive.com',
        'cms.shapehive.com/qa' => 'https://shapehive.com/qa',
        'cms.shapehive.com/om' => 'https://shapehive.com/om',
        'cms.shapehive.com/sa' => 'https://shapehive.com/sa',
        'shapehive.com/qa' => 'https://shapehive.com/qa',
        'shapehive.com/om' => 'https://shapehive.com/om',
        'shapehive.com/sa' => 'https://shapehive.com/sa',
    );
}

function sasanperfumes_render_multisite_frontend_settings_page() {
    if (!current_user_can('manage_network_options')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    if (isset($_GET['updated'])) {
        echo '<div class="notice notice-success is-dismissible"><p>Frontend network mapping saved.</p></div>';
    }

    $network_default = untrailingslashit(trim((string) get_site_option('sasanperfumes_frontend_url', 'https://shapehive.com')));
    $network_map     = sasanperfumes_get_frontend_url_map();
    $map_text        = sasanperfumes_format_frontend_url_map_text(
        !empty($network_map) ? $network_map : sasanperfumes_get_frontend_url_map_example()
    );
    ?>
    <div class="wrap">
        <h1>Frontend URL Mapping (Network)</h1>
        <p>Map each backend CMS content site to its public frontend path. Keep market CMS sites for separate content, products, pages, and SEO; all market routing uses path URLs.</p>
        <p><strong>Backend content sites:</strong> <code>cms.shapehive.com/qa</code>, <code>cms.shapehive.com/om</code>, <code>cms.shapehive.com/sa</code>. <strong>Public frontend paths:</strong> <code>/qa</code>, <code>/om</code>, <code>/sa</code>.</p>
        <form method="post" action="<?php echo esc_url(network_admin_url('admin-post.php')); ?>">
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="sasanperfumes_frontend_url">Default frontend URL</label></th>
                    <td>
                        <input
                            type="url"
                            id="sasanperfumes_frontend_url"
                            name="sasanperfumes_frontend_url"
                            value="<?php echo esc_attr($network_default); ?>"
                            class="regular-text"
                            placeholder="https://shapehive.com"
                        >
                        <p class="description">Used if a site does not define its own Frontend URL.</p>
                    </td>
                </tr>
                <tr>
                  <th scope="row"><label for="sasanperfumes_frontend_url_map">Host mapping (JSON)</label></th>
                    <td>
                        <textarea
                            id="sasanperfumes_frontend_url_map"
                            name="sasanperfumes_frontend_url_map"
                            rows="8"
                            cols="80"
                            class="large-text"
                        ><?php echo esc_textarea($map_text); ?></textarea>
                        <p class="description">
                            Map incoming WP host to frontend URL, for example:
                        </p>
                        <pre><code>{
  "cms.shapehive.com": "https://shapehive.com",
  "cms.shapehive.com/qa": "https://shapehive.com/qa",
  "cms.shapehive.com/om": "https://shapehive.com/om",
  "cms.shapehive.com/sa": "https://shapehive.com/sa",
  "shapehive.com/qa": "https://shapehive.com/qa",
  "shapehive.com/om": "https://shapehive.com/om",
  "shapehive.com/sa": "https://shapehive.com/sa"
}</code></pre>
                        <p class="description">
                            Enter host names exactly as used by each site (without ports).
                            You can keep either an explicit domain or keep this section blank and update it later.
                        </p>
                    </td>
                </tr>
            </table>
            <?php wp_nonce_field('sasanperfumes_network_frontend_settings', 'sasanperfumes_network_frontend_settings_nonce'); ?>
            <input type="hidden" name="action" value="sasanperfumes_save_frontend_network_settings">
            <?php submit_button('Save Network Frontend Settings'); ?>
        </form>
    </div>
    <?php
}

function sasanperfumes_register_multisite_frontend_settings_page() {
    if (!is_multisite()) return;

    add_submenu_page(
        'settings.php',
        'Frontend Network Settings',
        'Frontend Network Settings',
        'manage_network_options',
        'sasanperfumes-frontend-network',
        'sasanperfumes_render_multisite_frontend_settings_page'
    );
}

function sasanperfumes_save_multisite_frontend_settings() {
    if (!is_multisite()) return;
    if (!current_user_can('manage_network_options')) {
        wp_die('You do not have sufficient permissions to save these settings.');
    }
    if (!isset($_POST['sasanperfumes_network_frontend_settings_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_network_frontend_settings_nonce'], 'sasanperfumes_network_frontend_settings')) {
        wp_die('Invalid security token.');
    }

    $site_url = isset($_POST['sasanperfumes_frontend_url']) ? esc_url_raw(trim(sanitize_text_field(wp_unslash($_POST['sasanperfumes_frontend_url'])))) : '';
    if ($site_url === '') {
        $site_url = 'https://shapehive.com';
    }
    update_site_option('sasanperfumes_frontend_url', untrailingslashit($site_url));

    $raw_map   = isset($_POST['sasanperfumes_frontend_url_map']) ? wp_unslash($_POST['sasanperfumes_frontend_url_map']) : '';
    $parsed_map = sasanperfumes_parse_frontend_url_map($raw_map);
    update_site_option('sasanperfumes_frontend_url_map', $parsed_map);

    wp_safe_redirect(add_query_arg(
        array('page' => 'sasanperfumes-frontend-network', 'updated' => '1'),
        network_admin_url('settings.php')
    ));
    exit;
}

if (is_multisite()) {
    add_action('network_admin_menu', 'sasanperfumes_register_multisite_frontend_settings_page');
    add_action('admin_post_sasanperfumes_save_frontend_network_settings', 'sasanperfumes_save_multisite_frontend_settings');
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
        $normalized = sasanperfumes_normalize_frontend_host_with_market($site_url);
        if ($normalized !== '') {
            $parts = parse_url($site_url);
            $scheme = isset($parts['scheme']) ? (string) $parts['scheme'] : 'https';
            if (strpos($normalized, '/') === false) {
                return untrailingslashit($scheme . '://' . $normalized);
            }
            return untrailingslashit($scheme . '://' . $normalized);
        }

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

function sasanperfumes_normalize_rest_frontend_host(?string $host): string {
    if (!is_string($host)) return "";

    $selected = strtolower(trim($host));
    if (!$selected) return "";
    $selected = preg_replace('/\s+/', '', $selected);
    if (!$selected) return "";

    if (strpos($selected, ",") !== false) {
        $parts = explode(",", $selected);
        $selected = trim($parts[0]);
    }

    return sasanperfumes_normalize_frontend_host_with_market($selected);
}

function sasanperfumes_build_frontend_host_from_market(string $market, string $referenceHost = ""): string {
    $normalized_market = sasanperfumes_normalize_frontend_host_segment($market);
    if (!$normalized_market || !in_array($normalized_market, array("qa", "om", "sa"), true)) {
        return "";
    }

    $normalized_host = sasanperfumes_normalize_frontend_host($referenceHost);
    if (!$normalized_host) {
        return "";
    }

    return $normalized_host . "/" . $normalized_market;
}

function sasanperfumes_get_incoming_frontend_host(): string {
    if (!is_multisite()) return '';

    $candidates = [];
    $referer_host = $_SERVER['HTTP_REFERER'] ?? '';
    $origin_host = $_SERVER['HTTP_ORIGIN'] ?? '';
    $forwarded_host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? '';
    $host_header = $_SERVER['HTTP_HOST'] ?? '';
    $market_candidate = $_SERVER['HTTP_X_MARKET'] ?? ($_GET['market'] ?? '');
    $request_uri = $_SERVER['REQUEST_URI'] ?? '';
    $request_path = is_string($request_uri) ? (string) parse_url($request_uri, PHP_URL_PATH) : '';
    $request_segments = array_values(array_filter(explode('/', trim($request_path, '/')), 'strlen'));
    $path_market_candidate = (string) ($request_segments[0] ?? '');

    $candidates[] = $_SERVER['HTTP_X_FRONTEND_HOST'] ?? '';
    $candidates[] = $_GET['frontend_host'] ?? '';
    $candidates[] = sasanperfumes_build_frontend_host_from_market((string) $market_candidate, (string) $forwarded_host);
    $candidates[] = sasanperfumes_build_frontend_host_from_market((string) $market_candidate, (string) $host_header);
    $candidates[] = sasanperfumes_build_frontend_host_from_market($path_market_candidate, (string) $host_header);
    $candidates[] = $market_candidate;
    $candidates[] = $forwarded_host;
    $candidates[] = $origin_host;
    $candidates[] = $referer_host;
    $candidates[] = $host_header;

    foreach ($candidates as $candidate) {
        $normalized = sasanperfumes_normalize_rest_frontend_host(is_string($candidate) ? $candidate : '');
        if ($normalized !== "") {
            return $normalized;
        }
    }

    return "";
}

function sasanperfumes_find_blog_id_for_frontend_host(string $frontend_host): int {
    if (!is_multisite() || $frontend_host === "") {
        return 0;
    }

    static $cache = [];
    if (isset($cache[$frontend_host])) {
        return $cache[$frontend_host];
    }

    $target = 0;
    $frontend_host = sasanperfumes_normalize_frontend_host_with_market($frontend_host);
    if ($frontend_host === "") {
        $cache[$frontend_host] = 0;
        return 0;
    }
    $frontend_host_parts = sasanperfumes_parse_frontend_host_parts($frontend_host);
    $frontend_host_base = $frontend_host_parts['host'];
    $frontend_market = $frontend_host_parts['market'];

    $sites = get_sites([
        'number' => 0,
        'fields' => 'ids',
    ]);

    $default_site_slugs = array(
        'shapehive.com/qa' => 'qa',
        'shapehive.com/om' => 'om',
        'shapehive.com/sa' => 'sa',
        'localhost/qa' => 'qa',
        'localhost/om' => 'om',
        'localhost/sa' => 'sa',
        '127.0.0.1/qa' => 'qa',
        '127.0.0.1/om' => 'om',
        '127.0.0.1/sa' => 'sa',
    );
    $expected_slug = $frontend_market !== ''
        ? $frontend_market
        : ($default_site_slugs[$frontend_host] ?? ($default_site_slugs[$frontend_host_base] ?? ''));
    $network_map = sasanperfumes_get_frontend_url_map();

    foreach ((array) $sites as $site_id) {
        $site_frontend_url = trim((string) get_blog_option((int) $site_id, 'sasanperfumes_frontend_url', ''));
        if (!$site_frontend_url) {
            $site_frontend_url = get_home_url((int) $site_id);
        }

        $site_frontend_url_with_market = sasanperfumes_normalize_frontend_host_with_market($site_frontend_url);
        $site_host = sasanperfumes_normalize_frontend_host($site_frontend_url);
        if ($site_host !== "" && $site_host === $frontend_host) {
            $target = (int) $site_id;
            break;
        }

        if (
            $site_frontend_url_with_market !== "" &&
            $site_frontend_url_with_market === $frontend_host
        ) {
            $target = (int) $site_id;
            break;
        }

        $details = get_blog_details((int) $site_id);
        $site_domain = '';
        $site_path = '';
        if ($details) {
            $site_domain = strtolower(trim((string) ($details->domain ?? '')));
            $site_path = strtolower(trim((string) ($details->path ?? ''), '/'));
        }

        $mapped_frontend_url = '';
        $site_domain_path = $site_path !== '' ? $site_domain . '/' . $site_path : $site_domain;
        if ($site_domain !== '' && $site_path !== '' && isset($network_map[$site_domain_path])) {
            $mapped_frontend_url = (string) $network_map[$site_domain_path];
        } elseif ($site_domain !== '' && isset($network_map[$site_domain])) {
            $mapped_frontend_url = (string) $network_map[$site_domain];
        }

        if (
            $mapped_frontend_url !== '' &&
            sasanperfumes_normalize_frontend_host_with_market($mapped_frontend_url) === $frontend_host
        ) {
            $target = (int) $site_id;
            break;
        }

        if ($expected_slug !== '') {
            if ($details) {
                if ($site_path === $expected_slug) {
                    $target = (int) $site_id;
                    break;
                }
            }
        }
    }

    $cache[$frontend_host] = $target;
    return $target;
}

function sasanperfumes_apply_rest_blog_switch(): int {
    if (!is_multisite()) {
        return 0;
    }

    $frontend_host = sasanperfumes_get_incoming_frontend_host();
    if ($frontend_host === "") {
        return 0;
    }

    $target = sasanperfumes_find_blog_id_for_frontend_host($frontend_host);
    if (!$target || $target === get_current_blog_id()) {
        return 0;
    }

    switch_to_blog($target);
    return $target;
}

function sasanperfumes_restore_rest_blog_switch(int $switched_blog_id): void {
    if ($switched_blog_id > 0 && function_exists('is_switched') && function_exists('restore_current_blog') && is_switched()) {
        restore_current_blog();
    }
}

if (is_multisite()) {
    add_filter('rest_pre_dispatch', function($result, $server, $request) {
        $switched = sasanperfumes_apply_rest_blog_switch();
        if ($switched > 0) {
            $GLOBALS['sasanperfumes_rest_blog_switched_id'] = $switched;
        }
        return $result;
    }, 0, 3);

    add_filter('rest_post_dispatch', function($result, $server, $request, $response) {
        if (!empty($GLOBALS['sasanperfumes_rest_blog_switched_id'])) {
            sasanperfumes_restore_rest_blog_switch((int) $GLOBALS['sasanperfumes_rest_blog_switched_id']);
            $GLOBALS['sasanperfumes_rest_blog_switched_id'] = 0;
        }
        return $result;
    }, 0, 4);
}
