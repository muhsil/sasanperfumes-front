<?php
/**
 * Seed multisite frontend mapping for ShapeHive domains.
 *
 * Usage (WP-CLI):
 *   wp eval-file scripts/setup-multisite-network.php
 *
 * This script updates:
 * 1) Network default frontend URL.
 * 2) Network host => frontend map.
 * 3) Backend-only market sites for separate content management.
 * 4) Per-site frontend URL option for known sites.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!is_multisite()) {
    echo "This site is not configured as WordPress multisite.\n";
    exit(1);
}

$network_default = 'https://shapehive.com';
$host_map = [
    'cms.shapehive.com' => 'https://shapehive.com',
    'qa.cms.shapehive.com' => 'https://shapehive.com/qa',
    'om.cms.shapehive.com' => 'https://shapehive.com/om',
    'sa.cms.shapehive.com' => 'https://shapehive.com/sa',
    'shapehive.com/qa' => 'https://shapehive.com/qa',
    'shapehive.com/om' => 'https://shapehive.com/om',
    'shapehive.com/sa' => 'https://shapehive.com/sa',
    'cms.shapehive.com/qa' => 'https://shapehive.com/qa',
    'cms.shapehive.com/om' => 'https://shapehive.com/om',
    'cms.shapehive.com/sa' => 'https://shapehive.com/sa',
];

update_site_option('sasanperfumes_frontend_url', untrailingslashit($network_default));
update_site_option('sasanperfumes_frontend_url_map', $host_map);

$market_sites = [
    'qa' => [
        'domain' => 'qa.cms.shapehive.com',
        'path' => '/',
        'title' => 'ShapeHive Qatar',
        'frontend_url' => 'https://shapehive.com/qa',
    ],
    'om' => [
        'domain' => 'om.cms.shapehive.com',
        'path' => '/',
        'title' => 'ShapeHive Oman',
        'frontend_url' => 'https://shapehive.com/om',
    ],
    'sa' => [
        'domain' => 'sa.cms.shapehive.com',
        'path' => '/',
        'title' => 'ShapeHive Saudi Arabia',
        'frontend_url' => 'https://shapehive.com/sa',
    ],
];

function shapehive_find_site_id(string $domain, string $path = '/'): int {
    $ids = get_sites([
        'number' => 1,
        'fields' => 'ids',
        'domain' => $domain,
        'path' => $path,
    ]);

    return !empty($ids) ? (int) $ids[0] : 0;
}

function shapehive_ensure_market_site(array $site): int {
    $domain = strtolower(trim((string) ($site['domain'] ?? '')));
    $path = (string) ($site['path'] ?? '/');
    $title = (string) ($site['title'] ?? $domain);

    if ($domain === '') {
        return 0;
    }

    $site_id = shapehive_find_site_id($domain, $path);
    if ($site_id > 0) {
        return $site_id;
    }

    if (!function_exists('wpmu_create_blog')) {
        echo "Cannot create {$domain}: wpmu_create_blog is unavailable.\n";
        return 0;
    }

    $user_id = get_current_user_id();
    if (!$user_id) {
        $user_id = 1;
    }

    $network_id = function_exists('get_current_network_id') ? get_current_network_id() : 1;
    $created = wpmu_create_blog($domain, $path, $title, $user_id, ['public' => 1], $network_id);
    if (is_wp_error($created)) {
        echo "Failed to create {$domain}: " . $created->get_error_message() . "\n";
        return 0;
    }

    echo "Created backend market site_id={$created} domain={$domain} path={$path}\n";
    return (int) $created;
}

$updated = [
    'sites' => 0,
    'matched' => 0,
    'ensured_markets' => 0,
];

foreach ($market_sites as $market => $site) {
    $site_id = shapehive_ensure_market_site($site);
    if ($site_id <= 0) {
        continue;
    }

    update_blog_option($site_id, 'sasanperfumes_frontend_url', untrailingslashit($site['frontend_url']));
    update_blog_status($site_id, 'public', '1');
    update_blog_status($site_id, 'archived', '0');
    update_blog_status($site_id, 'spam', '0');
    update_blog_status($site_id, 'deleted', '0');
    $updated['ensured_markets']++;
}

$sites = get_sites([
    'number' => 0,
    'fields' => 'ids',
]);

foreach ((array) $sites as $site_id) {
    $site_id = (int) $site_id;
    $site = get_blog_details($site_id);
    if (!$site) {
        continue;
    }

    $updated['sites']++;

    $host = strtolower(trim((string) $site->domain));
    $path = strtolower(trim((string) $site->path, '/'));
    $frontend_url = '';

    if ($host && isset($host_map[$host])) {
        $frontend_url = $host_map[$host];
    } elseif ($path && isset($host_map[$host . '/' . $path])) {
        $frontend_url = $host_map[$host . '/' . $path];
    }

    if ($frontend_url) {
        update_blog_option($site_id, 'sasanperfumes_frontend_url', untrailingslashit($frontend_url));
        $updated['matched']++;
        echo "site_id={$site_id} domain={$host} path={$path} => frontend={$frontend_url}\n";
        continue;
    }

    $legacy_fallback = isset($host_map['cms.shapehive.com']) ? $host_map['cms.shapehive.com'] : $network_default;
    update_blog_option($site_id, 'sasanperfumes_frontend_url', untrailingslashit($legacy_fallback));
}

echo "Updated network default frontend URL: {$network_default}\n";
echo "Updated network frontend host map with " . count($host_map) . " entries\n";
echo "Ensured {$updated['ensured_markets']} backend market content sites.\n";
echo "Checked {$updated['sites']} sites; mapped {$updated['matched']} with host/path conventions.\n";
echo "Done.\n";
