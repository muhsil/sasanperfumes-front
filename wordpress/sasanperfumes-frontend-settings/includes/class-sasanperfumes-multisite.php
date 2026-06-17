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

function sasanperfumes_format_frontend_url_map_text(array $map): string {
    if (empty($map)) return '';
    return wp_json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}

function sasanperfumes_get_frontend_url_map(): array {
    if (!is_multisite()) return [];

    $from_site = get_site_option('sasanperfumes_frontend_url_map', []);
    if (!$from_site) return [];

    return sasanperfumes_parse_frontend_url_map($from_site);
}

function sasanperfumes_get_frontend_url_map_example(): array {
    return array(
        'cms.shapehive.com' => 'https://shapehive.com',
        'qa.cms.shapehive.com' => 'https://qa.shapehive.com',
        'cms.om.shapehive.com' => 'https://om.shapehive.com',
        'om.cms.shapehive.com' => 'https://om.shapehive.com',
        'cms.sa.shapehive.com' => 'https://sa.shapehive.com',
        'sa.cms.shapehive.com' => 'https://sa.shapehive.com',
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
        <p>Set one frontend URL for all network sites and optional host overrides for QA.</p>
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
  "qa.cms.shapehive.com": "https://qa.shapehive.com",
  "cms.om.shapehive.com": "https://om.shapehive.com",
  "om.cms.shapehive.com": "https://om.shapehive.com",
  "cms.sa.shapehive.com": "https://sa.shapehive.com",
  "sa.cms.shapehive.com": "https://sa.shapehive.com"
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
