<?php
/**
 * Retire deprecated public ShapeHive market storefront subdomains from the multisite network.
 *
 * Backend-only CMS market sites such as qa.cms.shapehive.com, om.cms.shapehive.com,
 * and sa.cms.shapehive.com are still required for separate content management.
 *
 * Usage examples (WP-CLI):
 *   wp eval-file scripts/retire-legacy-shapehive-sites.php -- --archive
 *   wp eval-file scripts/retire-legacy-shapehive-sites.php -- --archive --dry-run
 *   wp eval-file scripts/retire-legacy-shapehive-sites.php -- --delete --dry-run
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!is_multisite()) {
    echo "This site is not configured as WordPress multisite.\n";
    exit(1);
}

$legacy_hosts = array(
    'qa.shapehive.com',
    'om.shapehive.com',
    'sa.shapehive.com',
);

$argv = isset($argv) ? array_slice((array) $argv, 1) : array();
$archive = in_array('--archive', $argv, true);
$delete = in_array('--delete', $argv, true);
$dry_run = in_array('--dry-run', $argv, true) || in_array('--dry', $argv, true);

if (!$archive && !$delete) {
    $archive = true;
}

if ($delete) {
    $archive = false;
}

$action = $delete ? 'delete' : 'archive';
echo "Action: {$action} legacy hosts: " . implode(', ', $legacy_hosts) . "\n";
if ($dry_run) {
    echo "Mode: dry-run (no changes will be written)\n";
}

$sites = get_sites(array(
    'number' => 0,
    'fields' => 'ids',
));

$processed = 0;
$matched = 0;
$updated = 0;

foreach ((array) $sites as $site_id) {
    $site_id = (int) $site_id;
    $details = get_blog_details($site_id);
    if (!$details) {
        continue;
    }

    $processed++;
    $domain = strtolower(trim((string) ($details->domain ?? '')));
    if (!in_array($domain, $legacy_hosts, true)) {
        continue;
    }

    $matched++;
    $site_name = (string) ($details->blogname ?? '');
    echo "Match: site_id={$site_id} domain={$domain} name={$site_name}\n";

    if ($dry_run) {
        continue;
    }

    if ($delete) {
        wp_delete_site($site_id);
    } else {
        update_blog_status((int) $site_id, 'archived', '1');
    }
    $updated++;
}

echo "Scanned {$processed} sites. Matched {$matched} legacy host sites.\n";
if (!$dry_run) {
    echo "{$action} completed for {$updated} site(s).\n";
} else {
    echo "Dry-run completed. No changes were written.\n";
}
