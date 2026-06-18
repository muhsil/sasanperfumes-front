<?php
/**
 * Sync Arabic Products and CMS content in-place.
 *
 * This script copies bilingual EN -> AR fields that are already prepared in the
 * database so missing Arabic fields can be filled immediately.
 *
 * Usage:
 *   wp eval-file scripts/sync-arabic-content.php
 *
 * Optional flags:
 *   --skip-create-posts           Keep current Arabic post/CPT translations only.
 *   --create-missing-products     Create Arabic translation products when missing (default: on)
 *   --skip-create-products       Keep current Arabic products only.
 *   --skip-products              Skip product translation sync.
 *   --skip-post-meta             Skip post meta sync.
 *   --skip-term-meta             Skip term meta sync.
 *   --skip-options               Skip option/theme-mod sync.
 *   --post-types=page,product,... Control post types to sync post meta.
 *   --taxonomies=product_cat,product_brand,... Control term taxonomies to sync.
 *   --dry-run                    Show actions without saving.
 */

if (!function_exists('get_option')) {
    echo "This script must be run inside WordPress (for example: wp eval-file scripts/sync-arabic-content.php).\n";
    exit(1);
}

set_time_limit(0);

global $wpdb;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function sasanperfumes_arg_has(array $args, string $flag): bool {
    foreach ($args as $arg) {
        if ($arg === $flag) return true;
        if (strpos($arg, $flag . '=') === 0) return true;
    }
    return false;
}

function sasanperfumes_arg_get(array $args, string $flag, string $default = ''): string {
    $needle = $flag . '=';
    foreach ($args as $arg) {
        if (strpos($arg, $needle) === 0) {
            return trim(substr($arg, strlen($needle)));
        }
    }
    return $default;
}

function sasanperfumes_has_translation_value($value): bool {
    if (is_array($value)) {
        return count($value) > 0;
    }
    if (is_object($value)) {
        return !empty((array) $value);
    }
    if (is_int($value) || is_float($value)) {
        return true;
    }
    if (is_string($value)) {
        return trim($value) !== '';
    }
    if (is_bool($value)) {
        return true;
    }
    return $value !== null && $value !== '';
}

function sasanperfumes_copy_allowed_meta_key(string $key, array $prefixes): bool {
    foreach ($prefixes as $prefix) {
        if (str_starts_with($key, $prefix)) return true;
    }
    return false;
}

function sasanperfumes_has_wpml_table(): bool {
    global $wpdb;
    return $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}icl_translations'") !== null;
}

function sasanperfumes_next_trid_for_element(string $elementType): int {
    global $wpdb;

    if (!sasanperfumes_has_wpml_table()) {
        return 0;
    }

    $table = $wpdb->prefix . 'icl_translations';
    $max = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT MAX(trid) FROM {$table} WHERE element_type = %s",
        $elementType
    ));
    return $max > 0 ? $max + 1 : 1;
}

function sasanperfumes_register_translation_row(string $elementType, int $translationId, int $trid, string $languageCode, bool $dryRun): bool {
    if (!sasanperfumes_has_wpml_table()) {
        return false;
    }
    if ($dryRun) return true;

    global $wpdb;
    return (bool) $wpdb->replace(
        $wpdb->prefix . 'icl_translations',
        [
            'element_type' => $elementType,
            'element_id' => $translationId,
            'trid' => $trid,
            'language_code' => $languageCode,
            'source_language_code' => 'en',
        ]
    );
}

function sasanperfumes_get_translation_for_trid(string $elementType, int $trid, string $lang): int {
    if (!sasanperfumes_has_wpml_table() || $trid <= 0) {
        return 0;
    }

    global $wpdb;
    $id = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT element_id FROM {$wpdb->prefix}icl_translations WHERE trid = %d AND element_type = %s AND language_code = %s LIMIT 1",
        $trid,
        $elementType,
        $lang
    ));
    return $id > 0 ? $id : 0;
}

function sasanperfumes_is_skippable_meta_key(string $key): bool {
    if (in_array($key, ['_edit_lock', '_edit_last', '_wp_old_slug'], true)) {
        return true;
    }

    return str_starts_with($key, '_icl_') || str_starts_with($key, '_wpml_') || str_starts_with($key, '_edit_');
}

function sasanperfumes_get_en_posts_for_type(string $postType): array {
    global $wpdb;

    $elementType = 'post_' . $postType;
    $hasWpml = sasanperfumes_has_wpml_table();

    if ($hasWpml) {
        return $wpdb->get_results($wpdb->prepare(
            "SELECT p.ID, p.post_title, p.post_content, p.post_excerpt, p.post_name, p.post_status,
                    p.post_author, p.post_parent, p.menu_order, t.trid
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->prefix}icl_translations t
                ON p.ID = t.element_id AND t.element_type = %s
             WHERE p.post_type = %s
               AND t.language_code = 'en'
               AND p.post_status != 'trash'
             ORDER BY p.ID ASC",
            $elementType,
            $postType
        ), ARRAY_A);
    }

    $postIds = get_posts([
        'post_type' => $postType,
        'post_status' => ['publish', 'private', 'draft'],
        'fields' => 'ids',
        'numberposts' => -1,
        'orderby' => 'ID',
        'order' => 'ASC',
        'suppress_filters' => true,
    ]);

    $posts = [];
    foreach ((array) $postIds as $postId) {
        $post = get_post((int) $postId);
        if (!$post) {
            continue;
        }

        $posts[] = [
            'ID' => $post->ID,
            'post_title' => (string) $post->post_title,
            'post_content' => (string) $post->post_content,
            'post_excerpt' => (string) $post->post_excerpt,
            'post_name' => (string) $post->post_name,
            'post_status' => (string) $post->post_status,
            'post_author' => (int) $post->post_author,
            'post_parent' => (int) $post->post_parent,
            'menu_order' => (int) $post->menu_order,
            'trid' => 0,
        ];
    }

    return $posts;
}

function sasanperfumes_copy_terms_for_translation(int $sourceId, int $targetId, string $postType, bool $dryRun): int {
    global $wpdb;

    if ($dryRun) {
        return 0;
    }

    $copied = 0;
    $taxonomies = (array) get_object_taxonomies($postType, 'names');
    foreach ($taxonomies as $tax) {
        $terms = wp_get_object_terms((int) $sourceId, $tax, ['fields' => 'ids']);
        if (is_wp_error($terms) || empty($terms)) {
            continue;
        }

        wp_set_object_terms((int) $targetId, (array) $terms, $tax);
        $copied++;
    }

    return $copied;
}

function sasanperfumes_sync_post_translation(
    array $enPost,
    string $postType,
    bool $createMissing,
    bool $dryRun,
    array &$stats,
    array $metaPrefixes
): int {
    global $wpdb;

    if (($enPost['ID'] ?? 0) <= 0) {
        return 0;
    }

    $hasWpml = sasanperfumes_has_wpml_table();
    $elementType = 'post_' . $postType;
    $trid = (int) ($enPost['trid'] ?? 0);
    if ($trid <= 0) {
        if (!$hasWpml) {
            $stats['posts_missing_translation'] = ($stats['posts_missing_translation'] ?? 0) + 1;
            return 0;
        }
        $trid = sasanperfumes_next_trid_for_element($elementType);
    }

    $arId = $hasWpml ? sasanperfumes_get_translation_for_trid($elementType, $trid, 'ar') : 0;

    if (!$arId && (!$createMissing || !$hasWpml)) {
        $stats['posts_missing_translation'] = ($stats['posts_missing_translation'] ?? 0) + 1;
        return 0;
    }

    $created = false;
    if (!$arId) {
        if (!$dryRun) {
            $inserted = wp_insert_post([
                'post_type' => $postType,
                'post_status' => (string) $enPost['post_status'],
                'post_author' => (int) $enPost['post_author'],
                'post_parent' => (int) $enPost['post_parent'],
                'menu_order' => (int) $enPost['menu_order'],
                'post_title' => (string) $enPost['post_title'],
                'post_content' => (string) $enPost['post_content'],
                'post_excerpt' => (string) $enPost['post_excerpt'],
                'post_name' => (string) $enPost['post_name'],
            ], true);

            if (is_wp_error($inserted)) {
                echo "  WARN: could not create Arabic {$postType} for #{$enPost['ID']} ({$enPost['post_title']}): {$inserted->get_error_message()}\n";
                return 0;
            }

            $arId = (int) $inserted;
            $stats['posts_translations_created'] = ($stats['posts_translations_created'] ?? 0) + 1;
        } else {
            $stats['posts_translations_created'] = ($stats['posts_translations_created'] ?? 0) + 1;
            $created = true;
        }
    } else {
        $stats['posts_translations_created'] = $stats['posts_translations_created'] ?? 0;
    }

    if (!$dryRun && $arId) {
        sasanperfumes_register_translation_row($elementType, (int) $arId, $trid, 'ar', $dryRun);
        sasanperfumes_copy_missing_post_content((int) $enPost['ID'], (int) $arId, $dryRun);
        sasanperfumes_copy_terms_for_translation((int) $enPost['ID'], (int) $arId, $postType, $dryRun);
        sasanperfumes_post_meta_pairs((string) $enPost['ID'], $metaPrefixes, $stats, $dryRun);
    }

    $stats['post_pairs_scanned'] = ($stats['post_pairs_scanned'] ?? 0) + 1;

    return $created ? 1 : 0;
}

function sasanperfumes_copy_missing_post_content(int $sourceId, int $targetId, bool $dryRun): void {
    if ($dryRun) {
        return;
    }

    $source = get_post($sourceId);
    $target = get_post($targetId);
    if (!$source || !$target) {
        return;
    }

    $postUpdate = [];
    if ((string) $target->post_title === '') {
        $postUpdate['post_title'] = (string) $source->post_title;
    }
    if ((string) $target->post_content === '') {
        $postUpdate['post_content'] = (string) $source->post_content;
    }
    if ((string) $target->post_excerpt === '') {
        $postUpdate['post_excerpt'] = (string) $source->post_excerpt;
    }
    if ((string) $target->post_name === '') {
        $postUpdate['post_name'] = (string) $source->post_name;
    }

    if ($postUpdate) {
        $postUpdate['ID'] = $targetId;
        wp_update_post($postUpdate);
    }
}

function sasanperfumes_sync_en_to_ar_nested(array &$value, array &$stats, string $counterKey, bool $dryRun): bool {
    if (!is_array($value)) {
        return false;
    }

    $changed = false;

    foreach ($value as $k => &$v) {
        if (is_array($v)) {
            if (sasanperfumes_sync_en_to_ar_nested($v, $stats, $counterKey, $dryRun)) {
                $changed = true;
            }
        }

        if (!is_string($k) || !preg_match('/^(.*)_en$/', $k, $m)) {
            continue;
        }

        $arKey = $m[1] . '_ar';
        if (array_key_exists($arKey, $value) && sasanperfumes_has_translation_value($value[$arKey])) {
            continue;
        }

        if (!$dryRun) {
            $value[$arKey] = $v;
        }

        $stats[$counterKey] = ($stats[$counterKey] ?? 0) + 1;
        $changed = true;
    }

    return $changed;
}

function sasanperfumes_post_meta_pairs(string $postId, array $prefixes, array &$stats, bool $dryRun): int {
    global $wpdb;

    $updated = 0;
    $rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d",
            absint($postId)
        ),
        ARRAY_A
    );

    foreach ($rows as $row) {
        $key = (string) ($row['meta_key'] ?? '');
        if (!preg_match('/^(.*)_en$/', $key, $m)) continue;
        if (!sasanperfumes_copy_allowed_meta_key($key, $prefixes)) continue;

        $arKey = $m[1] . '_ar';
        $enValue = maybe_unserialize($row['meta_value']);
        if (!sasanperfumes_has_translation_value($enValue)) continue;

        $arValue = maybe_unserialize(get_post_meta($postId, $arKey, true));
        if (sasanperfumes_has_translation_value($arValue)) continue;

        if (is_array($enValue)) {
            $synced = $enValue;
            sasanperfumes_sync_en_to_ar_nested($synced, $stats, 'post_meta_pairs', $dryRun);
            if (!$dryRun) {
                update_post_meta($postId, $arKey, $synced);
            }
            $updated++;
            continue;
        }

        if (!$dryRun) {
            update_post_meta($postId, $arKey, $enValue);
        }
        $updated++;
        $stats['post_meta_pairs'] = ($stats['post_meta_pairs'] ?? 0) + 1;
    }

    return $updated;
}

function sasanperfumes_term_meta_pairs(int $termId, array $prefixes, array &$stats, bool $dryRun): int {
    global $wpdb;

    $updated = 0;
    $rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT meta_key, meta_value FROM {$wpdb->termmeta} WHERE term_id = %d",
            absint($termId)
        ),
        ARRAY_A
    );

    foreach ($rows as $row) {
        $key = (string) ($row['meta_key'] ?? '');
        if (!preg_match('/^(.*)_en$/', $key, $m)) continue;
        if (!sasanperfumes_copy_allowed_meta_key($key, $prefixes)) continue;

        $arKey = $m[1] . '_ar';
        $enValue = maybe_unserialize($row['meta_value']);
        if (!sasanperfumes_has_translation_value($enValue)) continue;

        $arValue = get_term_meta($termId, $arKey, true);
        if (sasanperfumes_has_translation_value($arValue)) continue;

        if (is_array($enValue)) {
            $synced = $enValue;
            sasanperfumes_sync_en_to_ar_nested($synced, $stats, 'term_meta_pairs', $dryRun);
            if (!$dryRun) {
                update_term_meta($termId, $arKey, $synced);
            }
            $updated++;
            continue;
        }

        if (!$dryRun) {
            update_term_meta($termId, $arKey, $enValue);
        }

        $updated++;
        $stats['term_meta_pairs'] = ($stats['term_meta_pairs'] ?? 0) + 1;
    }

    return $updated;
}

function sasanperfumes_sync_options_and_theme_mods(array $optionPrefix, array &$stats, bool $dryRun): array {
    global $wpdb;

    $optionLike = implode(' OR ', array_fill(0, count($optionPrefix), 'option_name LIKE %s'));
    $params = [];
    foreach ($optionPrefix as $prefix) {
        $params[] = $prefix . '%';
    }

    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT option_name, option_value FROM {$wpdb->options} WHERE {$optionLike}",
        $params
    ), ARRAY_A);

    $updatedOptions = 0;

    $existingOptions = [];
    foreach ($rows as $row) {
        $existingOptions[$row['option_name']] = true;
    }

    foreach ($rows as $row) {
        $name = (string) $row['option_name'];
        $value = maybe_unserialize($row['option_value']);

        $updated = false;

        if (is_array($value)) {
            if (sasanperfumes_sync_en_to_ar_nested($value, $stats, 'option_nested_pairs', $dryRun)) {
                $updated = true;
                if (!$dryRun) {
                    update_option($name, $value);
                }
            }
        }

        if (preg_match('/^(.*)_en$/', $name, $m) && sasanperfumes_has_translation_value($value)) {
            $arName = $m[1] . '_ar';
            $arOptionExists = array_key_exists($arName, $existingOptions);
            $arCurrent = get_option($arName, null);

            if (!$arOptionExists || !sasanperfumes_has_translation_value($arCurrent)) {
                if (!$dryRun) {
                    update_option($arName, $value);
                    $existingOptions[$arName] = true;
                }
                $updated = true;
                $stats['option_pairs'] = ($stats['option_pairs'] ?? 0) + 1;
            }
        }

        if ($updated) {
            $updatedOptions++;
        }
    }

    return [
        'updated_options' => $updatedOptions,
        'scanned' => count($rows),
    ];
}

function sasanperfumes_product_arabic_fallback_title(string $enTitle): string {
    $key = strtoupper(trim($enTitle));
    return $key === '' ? $enTitle : (string) $enTitle;
}

function sasanperfumes_sync_product_translation(array $enPost, bool $createMissing, bool $dryRun, array &$stats, array $metaPrefixes) {
    global $wpdb;

    $hasWpml = sasanperfumes_has_wpml_table();
    if (($enPost['ID'] ?? 0) <= 0) {
        return 0;
    }

    if ((int) ($enPost['trid'] ?? 0) <= 0) {
        if (!$hasWpml) {
            $stats['product_missing_translation'] = ($stats['product_missing_translation'] ?? 0) + 1;
            return 0;
        }
        $enPost['trid'] = sasanperfumes_next_trid_for_element('post_product');
    }

    $enId = (int) $enPost['ID'];
    $arId = $hasWpml ? sasanperfumes_get_translation_for_trid('post_product', (int) $enPost['trid'], 'ar') : 0;

    if (!$arId) {
        if (!$createMissing || !$hasWpml) {
            $stats['product_missing_translation'] = ($stats['product_missing_translation'] ?? 0) + 1;
            return 0;
        }

        $title = sasanperfumes_product_arabic_fallback_title((string) $enPost['post_title']);

        $insertedId = 0;
        if (!$dryRun) {
            $insertedId = (int) wp_insert_post([
                'post_type' => 'product',
                'post_status' => (string) $enPost['post_status'],
                'post_author' => (int) $enPost['post_author'],
                'post_parent' => (int) $enPost['post_parent'],
                'menu_order' => (int) $enPost['menu_order'],
                'post_title' => $title,
                'post_content' => (string) $enPost['post_content'],
                'post_excerpt' => (string) $enPost['post_excerpt'],
                'post_name' => (string) $enPost['post_name'],
            ], true);

            if (is_wp_error($insertedId)) {
                echo "  WARN: could not create Arabic product for #{$enPost['ID']} ({$enPost['post_title']}): {$insertedId->get_error_message()}\n";
                $insertedId = 0;
            }
        }

        if (!$insertedId) {
            return 0;
        }

        $arId = (int) $insertedId;
        $stats['product_translations_created'] = ($stats['product_translations_created'] ?? 0) + 1;

        if (!$dryRun) {
            $meta = $wpdb->get_results($wpdb->prepare(
                "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d",
                $enId
            ), ARRAY_A);
            foreach ($meta as $m) {
                $metaKey = (string) ($m['meta_key'] ?? '');
                if (sasanperfumes_is_skippable_meta_key($metaKey) || !sasanperfumes_copy_allowed_meta_key($metaKey, $metaPrefixes)) {
                    continue;
                }
                update_post_meta($arId, $metaKey, maybe_unserialize($m['meta_value']));
                $stats['product_meta_pairs'] = ($stats['product_meta_pairs'] ?? 0) + 1;
            }
        }

        if (!$dryRun) {
            $stats['product_terms_copied'] = ($stats['product_terms_copied'] ?? 0) + sasanperfumes_copy_terms_for_translation(
                $enId,
                $arId,
                'product',
                $dryRun
            );
        }
    }

    if (!$dryRun && $arId) {
        sasanperfumes_copy_missing_post_content($enId, $arId, $dryRun);
        sasanperfumes_post_meta_pairs((string) $enId, $metaPrefixes, $stats, $dryRun);
        $stats['product_terms_copied'] = ($stats['product_terms_copied'] ?? 0) + sasanperfumes_copy_terms_for_translation(
            $enId,
            $arId,
            'product',
            $dryRun
        );
        sasanperfumes_register_translation_row('post_product', $arId, (int) $enPost['trid'], 'ar', $dryRun);
    }

    $stats['product_pairs_scanned'] = ($stats['product_pairs_scanned'] ?? 0) + 1;

    return 1;
}

// ---------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------

$argv = $argv ?? [];

$dryRun = sasanperfumes_arg_has($argv, '--dry-run');
$syncProducts = !sasanperfumes_arg_has($argv, '--skip-products');
$skipCreatePosts = sasanperfumes_arg_has($argv, '--skip-create-posts');
$createPosts = !$skipCreatePosts;
$createProducts = $syncProducts && $createPosts && !sasanperfumes_arg_has($argv, '--skip-create-products');
$syncPostMeta = !sasanperfumes_arg_has($argv, '--skip-post-meta');
$syncTermMeta = !sasanperfumes_arg_has($argv, '--skip-term-meta');
$syncOptions = !sasanperfumes_arg_has($argv, '--skip-options');

$postTypesArg = sasanperfumes_arg_get(
    $argv,
    '--post-types',
    'product,page,sasanperfumes_product_page,sasanperfumes_service,sasanperfumes_guide,sasanperfumes_note,sasanperfumes_size_guide'
);
$taxArg = sasanperfumes_arg_get(
    $argv,
    '--taxonomies',
    'product_cat,product_brand,product_tag'
);

$postTypes = array_filter(array_map('trim', explode(',', strtolower($postTypesArg))));
$taxonomies = array_filter(array_map('trim', explode(',', strtolower($taxArg))));

$metaPrefixes = ['_sasanperfumes_', '_asl_', '_yoast_wpseo_'];

$stats = [
    'product_pairs_scanned' => 0,
    'product_translations_created' => 0,
    'product_missing_translation' => 0,
    'posts_translations_created' => 0,
    'posts_missing_translation' => 0,
    'post_pairs_scanned' => 0,
    'product_meta_pairs' => 0,
    'product_terms_copied' => 0,
    'post_meta_pairs' => 0,
    'term_meta_pairs' => 0,
    'option_pairs' => 0,
    'option_nested_pairs' => 0,
    'posts_scanned' => 0,
    'terms_scanned' => 0,
    'options_scanned' => 0,
];

echo "\n=== sasanperfumes Arabic sync starting ===\n";
echo "Mode: " . ($dryRun ? 'dry-run' : 'live') . "\n";
echo "Flags: " . implode(', ', array_filter([
    $syncProducts ? 'products' : 'products skipped',
    $createProducts ? 'create missing products' : 'no product create',
    $createPosts ? 'create missing post/cpt translations' : 'no post/cpt translation create',
    $syncPostMeta ? 'post meta' : 'post meta skipped',
    $syncTermMeta ? 'term meta' : 'term meta skipped',
    $syncOptions ? 'options' : 'options skipped',
])) . "\n\n";

// ---------------------------------------------------------------------
// 1) Product WPML translations + product postmeta
// ---------------------------------------------------------------------

if ($syncProducts) {
    echo "[1/5] Product workflow\n";

    $hasWpml = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}icl_translations'") !== null;
    if (!$hasWpml) {
        echo "  WPML translation table not found. Product workflow limited to existing posts only.\n";
    }

    if (!$hasWpml || empty($createProducts)) {
        echo "  Skipped Arabic product creation because WPML table is missing or creation disabled.\n";
    }

    if ($hasWpml) {
        $enProducts = $wpdb->get_results(
            "SELECT p.ID, p.post_title, p.post_content, p.post_excerpt, p.post_name, p.post_status, p.post_author, p.post_parent, p.menu_order, t.trid
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->prefix}icl_translations t ON p.ID = t.element_id
                AND t.element_type = 'post_product'
             WHERE p.post_type = 'product'
               AND t.language_code = 'en'
               AND p.post_status != 'trash'
             ORDER BY p.ID ASC",
            ARRAY_A
        );

        echo "  Found " . count($enProducts) . " English products.\n";

        foreach ($enProducts as $enProduct) {
            sasanperfumes_sync_product_translation($enProduct, $createProducts, $dryRun, $stats, $metaPrefixes);
        }
    }
}

// ---------------------------------------------------------------------
// 2) Post translations for non-product post types
// ---------------------------------------------------------------------

if ($syncPostMeta || $createPosts) {
    echo "\n[2/5] Post translation workflow\n";
    foreach ($postTypes as $postType) {
        if ($postType === 'product') {
            continue;
        }

        $posts = sasanperfumes_get_en_posts_for_type($postType);
        if (empty($posts)) {
            echo "  {$postType}: 0 items\n";
            continue;
        }

        $count = count($posts);
        $stats['posts_scanned'] += $count;
        echo "  {$postType}: {$count} translation sources\n";

        foreach ($posts as $post) {
            sasanperfumes_sync_post_translation((array) $post, (string) $postType, $createPosts, $dryRun, $stats, $metaPrefixes);
        }
    }
}

// ---------------------------------------------------------------------
// 3) Post meta EN -> AR for supported post types
// ---------------------------------------------------------------------

if ($syncPostMeta) {
    echo "\n[3/5] Post meta workflow\n";
    foreach ($postTypes as $postType) {
        $posts = sasanperfumes_get_en_posts_for_type($postType);

        if (empty($posts)) {
            echo "  {$postType}: 0 items\n";
            continue;
        }

        $count = count($posts);
        echo "  {$postType}: {$count} posts\n";

        foreach ($posts as $post) {
            $stats['post_meta_pairs'] += sasanperfumes_post_meta_pairs((string) $post['ID'], $metaPrefixes, $stats, $dryRun);
            $arId = sasanperfumes_get_translation_for_trid('post_' . $postType, (int) ($post['trid'] ?? 0), 'ar');
            if ($arId) {
                $stats['post_meta_pairs'] += sasanperfumes_post_meta_pairs((string) $arId, $metaPrefixes, $stats, $dryRun);
            }
        }
    }
}

// ---------------------------------------------------------------------
// 4) Term meta EN -> AR for supported taxonomies
// ---------------------------------------------------------------------

if ($syncTermMeta) {
    echo "\n[4/5] Term meta workflow\n";
    foreach ($taxonomies as $tax) {
        $terms = get_terms([
            'taxonomy' => $tax,
            'hide_empty' => false,
            'fields' => 'ids',
        ]);

        if (is_wp_error($terms) || empty($terms)) {
            echo "  {$tax}: 0 terms\n";
            continue;
        }

        $stats['terms_scanned'] += count($terms);
        echo "  {$tax}: " . count($terms) . " terms\n";

        foreach ($terms as $termId) {
            sasanperfumes_term_meta_pairs((int) $termId, $metaPrefixes, $stats, $dryRun);
        }
    }
}

// ---------------------------------------------------------------------
// 5) Options + theme mods (site settings stored as options)
// ---------------------------------------------------------------------

if ($syncOptions) {
    echo "\n[5/5] Options + theme mods workflow\n";
    $optionResult = sasanperfumes_sync_options_and_theme_mods(['sasanperfumes_%', 'theme_mods_%'], $stats, $dryRun);
    $stats['options_scanned'] = $optionResult['scanned'];
    echo "  options scanned: " . $optionResult['scanned'] . ", changed: " . $optionResult['updated_options'] . "\n";
}

if (!$dryRun) {
    if (function_exists('wc_delete_product_transients')) {
        wc_delete_product_transients();
    }
    wp_cache_flush();
}

echo "\n=== DONE ===\n";
echo "Products scanned: " . $stats['product_pairs_scanned'] . "\n";
echo "Arabic products created: " . $stats['product_translations_created'] . "\n";
echo "Products missing Arabic translation: " . $stats['product_missing_translation'] . "\n";
echo "Posts scanned (translation workflow): " . $stats['post_pairs_scanned'] . "\n";
echo "Posts translated: " . $stats['posts_translations_created'] . "\n";
echo "Posts missing Arabic translation: " . $stats['posts_missing_translation'] . "\n";
echo "Translation sources scanned (post types): " . $stats['posts_scanned'] . "\n";
echo "Terms scanned: " . $stats['terms_scanned'] . "\n";
echo "Options scanned: " . $stats['options_scanned'] . "\n";
echo "Updated post meta pairs: " . $stats['post_meta_pairs'] . "\n";
echo "Updated term meta pairs: " . $stats['term_meta_pairs'] . "\n";
echo "Updated option pairs: " . $stats['option_pairs'] . ", nested option pairs: " . $stats['option_nested_pairs'] . "\n";
echo "Total product-side meta syncs: " . $stats['product_meta_pairs'] . ", taxonomies synced: " . $stats['product_terms_copied'] . "\n";

