<?php
/**
 * Seed or update path-based ShapeHive market sites from the main CMS site.
 *
 * Usage:
 *   wp eval-file scripts/sync-market-content.php -- --dry-run
 *   wp eval-file scripts/sync-market-content.php -- --markets=qa,om,sa
 *   wp eval-file scripts/sync-market-content.php -- --markets=qa --overwrite
 *
 * Default behavior creates missing records only. Use --overwrite to refresh
 * existing market records from the source site. Market records remain separate
 * WordPress rows after syncing, so each site can be managed independently.
 */

if (!defined('ABSPATH')) {
    echo "This script must run inside WordPress via wp eval-file.\n";
    exit(1);
}

if (!is_multisite()) {
    echo "This script requires WordPress multisite.\n";
    exit(1);
}

set_time_limit(0);

$argv = isset($argv) ? (array) $argv : array();

function shapehive_market_arg_has(array $args, string $flag): bool {
    foreach ($args as $arg) {
        if ($arg === $flag || strpos($arg, $flag . '=') === 0) {
            return true;
        }
    }
    return false;
}

function shapehive_market_arg_get(array $args, string $flag, string $default = ''): string {
    $prefix = $flag . '=';
    foreach ($args as $arg) {
        if (strpos($arg, $prefix) === 0) {
            return trim(substr($arg, strlen($prefix)));
        }
    }
    return $default;
}

function shapehive_market_get_site_id(string $domain, string $path): int {
    $ids = get_sites(array(
        'number' => 1,
        'fields' => 'ids',
        'domain' => $domain,
        'path' => $path,
    ));
    return !empty($ids) ? (int) $ids[0] : 0;
}

function shapehive_market_ensure_site(array $market, bool $dryRun): int {
    $siteId = shapehive_market_get_site_id($market['domain'], $market['path']);
    if ($siteId > 0 || $dryRun) {
        return $siteId;
    }

    if (!function_exists('wpmu_create_blog')) {
        echo "Cannot create {$market['domain']}{$market['path']}: wpmu_create_blog unavailable.\n";
        return 0;
    }

    $userId = get_current_user_id() ?: 1;
    $networkId = function_exists('get_current_network_id') ? get_current_network_id() : 1;
    $created = wpmu_create_blog(
        $market['domain'],
        $market['path'],
        $market['title'],
        $userId,
        array('public' => 1),
        $networkId
    );

    if (is_wp_error($created)) {
        echo "Failed to create {$market['domain']}{$market['path']}: " . $created->get_error_message() . "\n";
        return 0;
    }

    return (int) $created;
}

function shapehive_market_ensure_plugin_active(int $siteId): bool {
    if ($siteId <= 0) {
        return false;
    }

    if (!function_exists('is_plugin_active')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }

    $plugins = array(
        'sasanperfumes-frontend-settings/sasanperfumes-frontend-settings.php',
        'anbar-frontend-settings/anbar-frontend-settings.php',
    );

    foreach ($plugins as $plugin) {
        if (function_exists('is_plugin_active_for_network') && is_plugin_active_for_network($plugin)) {
            return true;
        }
    }

    switch_to_blog($siteId);
    $active = false;
    foreach ($plugins as $plugin) {
        if (is_plugin_active($plugin)) {
            $active = true;
            break;
        }
    }

    if (!$active) {
        foreach ($plugins as $plugin) {
            if (!file_exists(WP_PLUGIN_DIR . '/' . $plugin)) {
                continue;
            }
            $result = activate_plugin($plugin, '', false, true);
            $active = !is_wp_error($result);
            if ($active) {
                break;
            }
            echo "  WARN: could not activate {$plugin} on site_id={$siteId}: " . $result->get_error_message() . "\n";
        }
    }
    restore_current_blog();

    return $active;
}

function shapehive_market_serialized_meta(array $metaRows): array {
    $meta = array();
    foreach ($metaRows as $row) {
        $key = (string) ($row->meta_key ?? '');
        if ($key === '' || in_array($key, array('_edit_lock', '_edit_last'), true)) {
            continue;
        }
        $meta[$key][] = maybe_unserialize($row->meta_value);
    }
    return $meta;
}

function shapehive_market_transform_meta_value($value, array $postMap) {
    if (is_array($value)) {
        foreach ($value as $key => $item) {
            $value[$key] = shapehive_market_transform_meta_value($item, $postMap);
        }
        return $value;
    }

    return $value;
}

function shapehive_market_transform_meta(string $key, array $values, array $postMap): array {
    $transformed = array();
    foreach ($values as $value) {
        if ($key === '_thumbnail_id') {
            $sourceId = absint($value);
            $transformed[] = $postMap[$sourceId] ?? $sourceId;
            continue;
        }

        if ($key === '_product_image_gallery') {
            $ids = array_filter(array_map('absint', explode(',', (string) $value)));
            $mapped = array_map(fn($id) => $postMap[$id] ?? $id, $ids);
            $transformed[] = implode(',', $mapped);
            continue;
        }

        $transformed[] = shapehive_market_transform_meta_value($value, $postMap);
    }
    return $transformed;
}

function shapehive_market_collect_source(int $sourceSiteId, array $postTypes, array $taxonomies, array $optionPrefixes): array {
    global $wpdb;

    switch_to_blog($sourceSiteId);

    $data = array(
        'options' => array(),
        'terms' => array(),
        'posts' => array(),
    );

    foreach ($optionPrefixes as $prefix) {
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
                $prefix . '%'
            )
        );
        foreach ($rows as $row) {
            $data['options'][(string) $row->option_name] = maybe_unserialize($row->option_value);
        }
    }

    foreach (array('woocommerce_currency', 'woocommerce_default_country') as $optionName) {
        $data['options'][$optionName] = get_option($optionName);
    }

    foreach ($taxonomies as $taxonomy) {
        if (!taxonomy_exists($taxonomy)) {
            continue;
        }
        $terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => false,
        ));
        if (is_wp_error($terms)) {
            continue;
        }
        foreach ($terms as $term) {
            $data['terms'][] = array(
                'term_id' => (int) $term->term_id,
                'taxonomy' => $taxonomy,
                'name' => (string) $term->name,
                'slug' => (string) $term->slug,
                'description' => (string) $term->description,
                'parent' => (int) $term->parent,
                'meta' => get_term_meta((int) $term->term_id),
            );
        }
    }

    foreach ($postTypes as $postType) {
        $posts = get_posts(array(
            'post_type' => $postType,
            'post_status' => 'any',
            'numberposts' => -1,
            'orderby' => 'ID',
            'order' => 'ASC',
            'suppress_filters' => true,
        ));

        foreach ($posts as $post) {
            $metaRows = $wpdb->get_results(
                $wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d", (int) $post->ID)
            );
            $postTaxonomies = array();
            foreach ((array) get_object_taxonomies($postType, 'names') as $taxonomy) {
                $terms = wp_get_object_terms((int) $post->ID, $taxonomy, array('fields' => 'slugs'));
                if (!is_wp_error($terms) && !empty($terms)) {
                    $postTaxonomies[$taxonomy] = array_values((array) $terms);
                }
            }

            $data['posts'][] = array(
                'ID' => (int) $post->ID,
                'post_author' => (int) $post->post_author,
                'post_date' => (string) $post->post_date,
                'post_date_gmt' => (string) $post->post_date_gmt,
                'post_content' => (string) $post->post_content,
                'post_title' => (string) $post->post_title,
                'post_excerpt' => (string) $post->post_excerpt,
                'post_status' => (string) $post->post_status,
                'post_name' => (string) $post->post_name,
                'post_type' => (string) $post->post_type,
                'post_parent' => (int) $post->post_parent,
                'menu_order' => (int) $post->menu_order,
                'post_mime_type' => (string) $post->post_mime_type,
                'guid' => (string) $post->guid,
                'meta' => shapehive_market_serialized_meta($metaRows),
                'terms' => $postTaxonomies,
            );
        }
    }

    restore_current_blog();
    return $data;
}

function shapehive_market_find_post(array $post): int {
    global $wpdb;
    $type = (string) $post['post_type'];
    $slug = (string) $post['post_name'];

    if ($slug !== '') {
        $found = get_posts(array(
            'post_type' => $type,
            'post_status' => 'any',
            'name' => $slug,
            'numberposts' => 1,
            'fields' => 'ids',
            'suppress_filters' => true,
        ));
        if (!empty($found)) {
            return (int) $found[0];
        }
    }

    if ($type === 'attachment' && !empty($post['guid'])) {
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND guid = %s LIMIT 1",
            (string) $post['guid']
        ));
    }

    return 0;
}

function shapehive_market_upsert_post(array $post, array $postMap, bool $overwrite, bool $dryRun): int {
    $existingId = shapehive_market_find_post($post);
    $parent = (int) $post['post_parent'];
    $targetParent = $parent > 0 ? ($postMap[$parent] ?? 0) : 0;

    $payload = array(
        'post_type' => $post['post_type'],
        'post_status' => $post['post_status'],
        'post_author' => get_current_user_id() ?: 1,
        'post_content' => $post['post_content'],
        'post_title' => $post['post_title'],
        'post_excerpt' => $post['post_excerpt'],
        'post_name' => $post['post_name'],
        'post_parent' => $targetParent,
        'menu_order' => $post['menu_order'],
        'post_mime_type' => $post['post_mime_type'],
        'guid' => $post['guid'],
    );

    if ($existingId > 0) {
        if ($overwrite && !$dryRun) {
            $payload['ID'] = $existingId;
            wp_update_post($payload);
        }
        return $existingId;
    }

    if ($dryRun) {
        return 0;
    }

    $inserted = wp_insert_post($payload, true);
    if (is_wp_error($inserted)) {
        echo "  WARN: failed {$post['post_type']} {$post['post_name']}: " . $inserted->get_error_message() . "\n";
        return 0;
    }

    return (int) $inserted;
}

function shapehive_market_sync_target(array $source, array $market, int $targetSiteId, bool $overwrite, bool $dryRun): array {
    $stats = array(
        'options' => 0,
        'terms' => 0,
        'posts' => 0,
        'meta' => 0,
    );

    switch_to_blog($targetSiteId);

    foreach ($source['options'] as $name => $value) {
        if (in_array($name, array('siteurl', 'home'), true)) {
            continue;
        }
        if (!$overwrite && get_option($name, null) !== null) {
            continue;
        }
        if (!$dryRun) {
            update_option($name, $value);
        }
        $stats['options']++;
    }

    if (!$dryRun) {
        update_option('sasanperfumes_frontend_url', untrailingslashit($market['frontend_url']));
        update_option('woocommerce_currency', $market['currency']);
        update_option('woocommerce_default_country', $market['country']);
    }

    $termMap = array();
    foreach ($source['terms'] as $term) {
        if (!taxonomy_exists($term['taxonomy'])) {
            continue;
        }

        $targetTerm = get_term_by('slug', $term['slug'], $term['taxonomy']);
        if (!$targetTerm && !$dryRun) {
            $inserted = wp_insert_term($term['name'], $term['taxonomy'], array(
                'slug' => $term['slug'],
                'description' => $term['description'],
            ));
            if (!is_wp_error($inserted)) {
                $targetTerm = get_term((int) $inserted['term_id'], $term['taxonomy']);
            }
        }

        if ($targetTerm && !is_wp_error($targetTerm)) {
            $targetId = (int) $targetTerm->term_id;
            $termMap[$term['taxonomy'] . ':' . $term['slug']] = $targetId;
            if ($overwrite && !$dryRun) {
                wp_update_term($targetId, $term['taxonomy'], array(
                    'name' => $term['name'],
                    'description' => $term['description'],
                ));
            }
            foreach ($term['meta'] as $metaKey => $values) {
                if (!$overwrite && metadata_exists('term', $targetId, $metaKey)) {
                    continue;
                }
                if (!$dryRun) {
                    delete_term_meta($targetId, $metaKey);
                    foreach ((array) $values as $value) {
                        add_term_meta($targetId, $metaKey, maybe_unserialize($value));
                    }
                }
            }
            $stats['terms']++;
        }
    }

    $postMap = array();
    $orderedPosts = array_merge(
        array_filter($source['posts'], fn($post) => $post['post_type'] === 'attachment'),
        array_filter($source['posts'], fn($post) => $post['post_type'] !== 'attachment' && $post['post_type'] !== 'product_variation'),
        array_filter($source['posts'], fn($post) => $post['post_type'] === 'product_variation')
    );

    foreach ($orderedPosts as $post) {
        $targetId = shapehive_market_upsert_post($post, $postMap, $overwrite, $dryRun);
        if ($targetId <= 0 && $dryRun) {
            $stats['posts']++;
            continue;
        }
        if ($targetId <= 0) {
            continue;
        }

        $postMap[(int) $post['ID']] = $targetId;

        foreach ($post['meta'] as $metaKey => $values) {
            if (!$overwrite && metadata_exists('post', $targetId, $metaKey)) {
                continue;
            }
            $values = shapehive_market_transform_meta($metaKey, (array) $values, $postMap);
            if (!$dryRun) {
                delete_post_meta($targetId, $metaKey);
                foreach ($values as $value) {
                    add_post_meta($targetId, $metaKey, $value);
                }
            }
            $stats['meta']++;
        }

        foreach ($post['terms'] as $taxonomy => $slugs) {
            $targetTerms = array();
            foreach ((array) $slugs as $slug) {
                $targetTermId = $termMap[$taxonomy . ':' . $slug] ?? 0;
                if ($targetTermId > 0) {
                    $targetTerms[] = $targetTermId;
                }
            }
            if (!empty($targetTerms) && !$dryRun) {
                wp_set_object_terms($targetId, $targetTerms, $taxonomy);
            }
        }

        $stats['posts']++;
    }

    if (!$dryRun) {
        if (function_exists('wc_delete_product_transients')) {
            wc_delete_product_transients();
        }
        clean_blog_cache($targetSiteId);
    }

    restore_current_blog();
    return $stats;
}

$dryRun = shapehive_market_arg_has($argv, '--dry-run');
$overwrite = shapehive_market_arg_has($argv, '--overwrite');
$marketsArg = shapehive_market_arg_get($argv, '--markets', 'qa,om,sa');
$requestedMarkets = array_filter(array_map('trim', explode(',', strtolower($marketsArg))));

$markets = array(
    'qa' => array(
        'domain' => 'cms.shapehive.com',
        'path' => '/qa/',
        'title' => 'ShapeHive Qatar',
        'frontend_url' => 'https://shapehive.com/qa',
        'currency' => 'QAR',
        'country' => 'QA',
    ),
    'om' => array(
        'domain' => 'cms.shapehive.com',
        'path' => '/om/',
        'title' => 'ShapeHive Oman',
        'frontend_url' => 'https://shapehive.com/om',
        'currency' => 'OMR',
        'country' => 'OM',
    ),
    'sa' => array(
        'domain' => 'cms.shapehive.com',
        'path' => '/sa/',
        'title' => 'ShapeHive Saudi Arabia',
        'frontend_url' => 'https://shapehive.com/sa',
        'currency' => 'SAR',
        'country' => 'SA',
    ),
);

$sourceSiteId = (int) shapehive_market_arg_get($argv, '--source-site', '0');
if ($sourceSiteId <= 0) {
    $sourceSiteId = shapehive_market_get_site_id('cms.shapehive.com', '/');
}
if ($sourceSiteId <= 0) {
    $sourceSiteId = get_main_site_id();
}

$postTypes = array(
    'attachment',
    'post',
    'page',
    'product',
    'product_variation',
    'sasanperfumes_service',
    'sasanperfumes_product_page',
    'sasanperfumes_guide',
    'sasanperfumes_note',
    'sasanperfumes_size_guide',
);

$taxonomies = array(
    'category',
    'post_tag',
    'product_cat',
    'product_tag',
    'product_brand',
);

switch_to_blog($sourceSiteId);
foreach (get_taxonomies(array(), 'names') as $taxonomy) {
    if (strpos($taxonomy, 'pa_') === 0 && !in_array($taxonomy, $taxonomies, true)) {
        $taxonomies[] = $taxonomy;
    }
}
restore_current_blog();

$source = shapehive_market_collect_source(
    $sourceSiteId,
    $postTypes,
    $taxonomies,
    array('sasanperfumes_', 'theme_mods_')
);

echo "\n=== ShapeHive market content sync ===\n";
echo "Mode: " . ($dryRun ? 'dry-run' : 'live') . ($overwrite ? ' with overwrite' : ' missing-only') . "\n";
echo "Source site ID: {$sourceSiteId}\n";
echo "Source records: " . count($source['posts']) . " posts, " . count($source['terms']) . " terms, " . count($source['options']) . " options\n\n";

foreach ($requestedMarkets as $marketCode) {
    if (empty($markets[$marketCode])) {
        echo "Skipping unknown market: {$marketCode}\n";
        continue;
    }

    $market = $markets[$marketCode];
    $targetSiteId = shapehive_market_ensure_site($market, $dryRun);
    if ($targetSiteId <= 0) {
        echo "{$marketCode}: target site missing ({$market['domain']}{$market['path']}). Run setup-multisite-network.php first or rerun without --dry-run to create it.\n";
        continue;
    }

    if (!$dryRun) {
        shapehive_market_ensure_plugin_active($targetSiteId);
    }

    $stats = shapehive_market_sync_target($source, $market, $targetSiteId, $overwrite, $dryRun);
    echo "{$marketCode}: site_id={$targetSiteId}, options={$stats['options']}, terms={$stats['terms']}, posts={$stats['posts']}, meta={$stats['meta']}\n";
}

if (!$dryRun) {
    wp_cache_flush();
}

echo "\nDone.\n";
