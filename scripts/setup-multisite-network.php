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
 * 3) Per-site frontend URL option for known sites.
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
    'qa.shapehive.com' => 'https://qa.shapehive.com',
    'om.shapehive.com' => 'https://om.shapehive.com',
    'sa.shapehive.com' => 'https://sa.shapehive.com',
];

update_site_option('sasanperfumes_frontend_url', untrailingslashit($network_default));
update_site_option('sasanperfumes_frontend_url_map', $host_map);

$updated = [
    'sites' => 0,
    'matched' => 0,
];

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
    } elseif ($path && isset($host_map[$path . '.shapehive.com'])) {
        $frontend_url = $host_map[$path . '.shapehive.com'];
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
echo "Checked {$updated['sites']} sites; mapped {$updated['matched']} with host/path conventions.\n";
echo "Done.\n";
?> 
