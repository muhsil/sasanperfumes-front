<?php
/**
 * Sasan Perfumes Field Helpers â€” Small reusable field components
 * Used by page-fields, notes-cpt, and other modules.
 * @since 6.3.0
 */
if (!defined('ABSPATH')) exit;

/* â”€â”€ Render helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Text input */
function sasanperfumes_f_text($name, $val, $a = []) {
    $c = $a['class'] ?? 'large-text';
    $d = !empty($a['rtl']) ? ' dir="rtl"' : '';
    $p = isset($a['placeholder']) ? ' placeholder="'.esc_attr($a['placeholder']).'"' : '';
    echo '<input type="text" name="'.esc_attr($name).'" value="'.esc_attr($val).'" class="'.$c.'"'.$d.$p.'>';
}

/** Textarea */
function sasanperfumes_f_textarea($name, $val, $a = []) {
    $c = $a['class'] ?? 'large-text';
    $r = $a['rows'] ?? 4;
    $d = !empty($a['rtl']) ? ' dir="rtl"' : '';
    echo '<textarea name="'.esc_attr($name).'" rows="'.$r.'" class="'.$c.'"'.$d.'>'.esc_textarea($val).'</textarea>';
}

/** Checkbox */
function sasanperfumes_f_check($name, $checked, $label = 'Enable') {
    echo '<label><input type="checkbox" name="'.esc_attr($name).'" value="1" '.checked($checked, true, false).'> '.$label.'</label>';
}

/** Render field by type */
function sasanperfumes_f_render($name, $val, $type = 'text', $a = []) {
    if ($type === 'image') { sasanperfumes_image_field($name, $val); }
    elseif ($type === 'textarea') { sasanperfumes_f_textarea($name, $val, $a); }
    else { sasanperfumes_f_text($name, $val, $a); }
}

/* â”€â”€ Post-meta bilingual helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Render bilingual field pair from post_meta */
function sasanperfumes_f_bi($post_id, $prefix, $key, $label, $type = 'text', $a = []) {
    $en = get_post_meta($post_id, "{$prefix}_{$key}_en", true);
    $ar = get_post_meta($post_id, "{$prefix}_{$key}_ar", true);
    echo '<tr><th>'.$label.' (EN)</th><td>';
    sasanperfumes_f_render("{$prefix}_{$key}_en", $en, $type, $a);
    echo '</td></tr>';
    echo '<tr><th>'.$label.' (AR)</th><td>';
    sasanperfumes_f_render("{$prefix}_{$key}_ar", $ar, $type, array_merge($a, ['rtl' => true]));
    echo '</td></tr>';
}

/** Render enable checkbox from post_meta */
function sasanperfumes_f_enable($post_id, $prefix) {
    $v = get_post_meta($post_id, "{$prefix}_enabled", true);
    echo '<tr><th>Enable</th><td>';
    sasanperfumes_f_check("{$prefix}_enabled", $v === '' ? true : (bool)$v, 'Show');
    echo '</td></tr>';
}

/* â”€â”€ Repeater helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Render repeater from post_meta */
function sasanperfumes_f_repeater($post_id, $meta_key, $label, $fields, $defaults = []) {
    $items = get_post_meta($post_id, $meta_key, true);
    if (!is_array($items) || empty($items)) {
        $items = [!empty($defaults) ? $defaults : array_fill_keys(array_keys($fields), '')];
    }
    echo '<h3>'.$label.' <button type="button" class="button sasanperfumes-sp-add" data-target="'.esc_attr($meta_key).'">+ Add</button></h3>';
    echo '<div id="'.esc_attr($meta_key).'">';
    foreach ($items as $i => $item) {
        echo '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">';
        echo '<h4>'.$label.' '.($i+1).' <button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red;">Remove</button></h4>';
        echo '<table class="form-table">';
        foreach ($fields as $fk => $fc) {
            $t = $fc['type'] ?? 'text';
            $fl = $fc['label'] ?? ucfirst(str_replace('_', ' ', $fk));
            echo '<tr><th>'.$fl.'</th><td>';
            sasanperfumes_f_render("{$meta_key}[{$i}][{$fk}]", $item[$fk] ?? '', $t, $fc);
            echo '</td></tr>';
        }
        echo '</table></div>';
    }
    echo '</div>';
}

/* â”€â”€ Save helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Save bilingual field pair from POST to post_meta */
function sasanperfumes_f_save_bi($post_id, $prefix, $key, $type = 'text') {
    $fn = $type === 'textarea' ? 'sanitize_textarea_field' : 'sanitize_text_field';
    update_post_meta($post_id, "{$prefix}_{$key}_en", $fn($_POST["{$prefix}_{$key}_en"] ?? ''));
    update_post_meta($post_id, "{$prefix}_{$key}_ar", $fn($_POST["{$prefix}_{$key}_ar"] ?? ''));
}

/** Save repeater from POST to post_meta */
function sasanperfumes_f_save_repeater($post_id, $meta_key, $fields) {
    $items = [];
    foreach ((array)($_POST[$meta_key] ?? []) as $item) {
        $row = [];
        foreach ($fields as $fk => $fc) {
            $type = $fc['type'] ?? 'text';
            if ($type === 'image') {
                $row[$fk] = esc_url_raw($item[$fk] ?? '');
            } elseif ($type === 'textarea') {
                $row[$fk] = sanitize_textarea_field($item[$fk] ?? '');
            } else {
                $row[$fk] = sanitize_text_field($item[$fk] ?? '');
            }
        }
        if (array_filter($row)) $items[] = $row;
    }
    update_post_meta($post_id, $meta_key, $items);
}

/** Save checkbox from POST to post_meta */
function sasanperfumes_f_save_check($post_id, $meta_key) {
    update_post_meta($post_id, $meta_key, isset($_POST[$meta_key]) ? '1' : '0');
}

/* â”€â”€ Product selector helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Render a product selector with AJAX search + preview */
function sasanperfumes_f_product($name, $slug = '') {
    echo '<div class="sasanperfumes-product-selector" style="position:relative;">';
    echo '<input type="hidden" name="'.esc_attr($name).'" value="'.esc_attr($slug).'" class="sasanperfumes-product-slug-input">';
    echo '<input type="text" class="sasanperfumes-product-search regular-text" placeholder="Search products..." autocomplete="off">';
    echo '<div class="sasanperfumes-product-results" style="display:none;position:absolute;z-index:999;background:#fff;border:1px solid #ddd;max-height:250px;overflow-y:auto;width:100%;box-shadow:0 2px 8px rgba(0,0,0,0.1);"></div>';
    echo '<div class="sasanperfumes-product-preview"></div>';
    echo '</div>';
}

/* â”€â”€ API helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Get bilingual value from post_meta for API response */
function sasanperfumes_f_api_bi($post_id, $prefix, $key, $def_en = '', $def_ar = '') {
    return [
        'en' => get_post_meta($post_id, "{$prefix}_{$key}_en", true) ?: $def_en,
        'ar' => get_post_meta($post_id, "{$prefix}_{$key}_ar", true) ?: $def_ar,
    ];
}

/** Map repeater post_meta to API format */
function sasanperfumes_f_api_rep($post_id, $meta_key, $mapping) {
    $raw = get_post_meta($post_id, $meta_key, true);
    if (!is_array($raw)) return [];
    $out = [];
    foreach ($raw as $item) {
        $row = [];
        foreach ($mapping as $api_key => $src) {
            if (is_array($src)) {
                $row[$api_key] = ['en' => $item[$src[0]] ?? '', 'ar' => $item[$src[1]] ?? ''];
            } else {
                $row[$api_key] = $item[$src] ?? '';
            }
        }
        // Only include non-empty rows
        $has_content = false;
        foreach ($row as $v) {
            if (is_string($v) && $v !== '') { $has_content = true; break; }
            if (is_array($v) && array_filter($v)) { $has_content = true; break; }
        }
        if ($has_content) $out[] = $row;
    }
    return $out;
}
