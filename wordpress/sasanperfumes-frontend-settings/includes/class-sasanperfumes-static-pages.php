<?php
/**
 * ShapeHive Static Pages — Dynamic content for About, Contact, FAQ, Privacy, Terms, Shipping, Returns
 * Admin: sasanperfumes → Pages (submenu)
 * REST API: GET /sasanperfumes/v1/pages/{slug}
 * @since 6.2.0
 */
if (!defined('ABSPATH')) exit;

// --- Helpers (reuse home-sections pattern) ---
function sasanperfumes_sp_opt($key, $def = '') { return get_option("sasanperfumes_page_{$key}", $def); }

function sasanperfumes_sp_field($name, $val, $type = 'text', $args = []) {
    if ($type === 'image' && function_exists('sasanperfumes_image_field')) {
        sasanperfumes_image_field($name, $val);
        return;
    }
    $dir = !empty($args['rtl']) ? ' dir="rtl"' : '';
    $cls = $args['class'] ?? 'large-text';
    $rows = $args['rows'] ?? 4;
    if ($type === 'textarea') {
        echo "<textarea name=\"{$name}\" rows=\"{$rows}\" class=\"{$cls}\"{$dir}>" . esc_textarea($val) . "</textarea>";
    } else {
        echo "<input type=\"text\" name=\"{$name}\" value=\"" . esc_attr($val) . "\" class=\"{$cls}\"{$dir}>";
    }
}

function sasanperfumes_sp_bilingual($prefix, $fields) {
    foreach ($fields as $key => $cfg) {
        $type = $cfg['type'] ?? 'text';
        $label = $cfg['label'] ?? ucfirst(str_replace('_', ' ', $key));
        $en = sasanperfumes_sp_opt("{$prefix}_{$key}_en", $cfg['default_en'] ?? '');
        $ar = sasanperfumes_sp_opt("{$prefix}_{$key}_ar", $cfg['default_ar'] ?? '');
        echo "<tr><th>{$label} (EN)</th><td>"; sasanperfumes_sp_field("sasanperfumes_page_{$prefix}_{$key}_en", $en, $type, $cfg); echo "</td></tr>";
        echo "<tr><th>{$label} (AR)</th><td>"; sasanperfumes_sp_field("sasanperfumes_page_{$prefix}_{$key}_ar", $ar, $type, array_merge($cfg, ['rtl'=>true])); echo "</td></tr>";
    }
}

function sasanperfumes_sp_repeater($id, $label, $items, $field_defs) {
    echo "<h3>{$label} <button type=\"button\" class=\"button sasanperfumes-sp-add\" data-target=\"{$id}\">+ Add</button></h3>";
    echo "<div id=\"{$id}\">";
    foreach ($items as $i => $item) {
        echo '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">';
        echo '<h4>' . $label . ' ' . ($i+1) . ' <button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red;">Remove</button></h4>';
        echo '<table class="form-table">';
        foreach ($field_defs as $fk => $fc) {
            $type = $fc['type'] ?? 'text';
            $fl = $fc['label'] ?? ucfirst(str_replace('_', ' ', $fk));
            $val = $item[$fk] ?? '';
            echo "<tr><th>{$fl}</th><td>";
            sasanperfumes_sp_field("{$id}[{$i}][{$fk}]", $val, $type, $fc);
            echo "</td></tr>";
        }
        echo '</table></div>';
    }
    echo '</div>';
}

// --- Page definitions (config-driven) ---
function sasanperfumes_sp_page_configs() {
    return [
        'about' => [
            'label' => 'About',
            'fields' => [
                'title' => ['label'=>'Title'],
                'hero_subtitle' => ['label'=>'Hero Subtitle'],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
            ],
            'extra_fields' => [
                'stats_since' => ['label'=>'Stats: Since'],
                'stats_location' => ['label'=>'Stats: Location'],
                'stats_handcrafted' => ['label'=>'Stats: Handcrafted'],
                'stats_sustainable' => ['label'=>'Stats: Sustainable'],
            ],
            'section_fields' => [
                'main_title' => ['label'=>'Main Content Title'],
                'main_p1' => ['label'=>'Main Content Paragraph 1','type'=>'textarea','rows'=>4],
                'main_p2' => ['label'=>'Main Content Paragraph 2','type'=>'textarea','rows'=>4],
                'main_p3' => ['label'=>'Main Content Paragraph 3','type'=>'textarea','rows'=>4],
                'uniqueness_title' => ['label'=>'Uniqueness Title'],
                'uniqueness_subtitle' => ['label'=>'Uniqueness Subtitle'],
                'uniqueness_content' => ['label'=>'Uniqueness Content','type'=>'textarea','rows'=>4],
                'journey_title' => ['label'=>'Journey Title'],
                'journey_content' => ['label'=>'Journey Content','type'=>'textarea','rows'=>4],
                'ingredients_title' => ['label'=>'Ingredients Title'],
                'ingredients_subtitle' => ['label'=>'Ingredients Subtitle'],
                'ingredients_desc' => ['label'=>'Ingredients Description','type'=>'textarea','rows'=>3],
                'mission_title' => ['label'=>'Mission Title'],
                'mission_content' => ['label'=>'Mission Content','type'=>'textarea','rows'=>4],
                'vision_title' => ['label'=>'Vision Title'],
                'vision_content' => ['label'=>'Vision Content','type'=>'textarea','rows'=>4],
                'core_values_title' => ['label'=>'Core Values Title'],
                'core_values_subtitle' => ['label'=>'Core Values Subtitle'],
                'cta_title' => ['label'=>'CTA Title'],
                'cta_subtitle' => ['label'=>'CTA Subtitle'],
                'cta_button' => ['label'=>'CTA Button Text'],
                'cta_link' => ['label'=>'CTA Button Link','class'=>'large-text'],
            ],
            'repeaters' => [
                'about_sections' => ['label'=>'Bottom Sections','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>3],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                'about_ingredients' => ['label'=>'Ingredient Items','fields'=>[
                    'name_en'=>['label'=>'Name (EN)','class'=>'regular-text'],
                    'name_ar'=>['label'=>'Name (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Desc (EN)','type'=>'textarea','rows'=>2],
                    'desc_ar'=>['label'=>'Desc (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                    'image'=>['label'=>'Image','type'=>'image'],
                ]],
                'about_faq' => ['label'=>'About FAQ','fields'=>[
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                'about_core_values' => ['label'=>'Core Values Items','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'description_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>2],
                    'description_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                ]],
            ],
            'has_image' => 'about_hero_image',
        ],
        'contact' => [
            'label' => 'Contact',
            'fields' => [
                'hero_title' => ['label'=>'Hero Title'],
                'hero_subtitle' => ['label'=>'Hero Subtitle'],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'quick_contact' => ['label'=>'Quick Contact Label','class'=>'regular-text'],
                'whatsapp' => ['label'=>'WhatsApp Label','class'=>'regular-text'],
                'call_us' => ['label'=>'Call Us Label','class'=>'regular-text'],
                'email_us' => ['label'=>'Email Us Label','class'=>'regular-text'],
                'send_message' => ['label'=>'Send Message Label','class'=>'regular-text'],
                'contact_info_label' => ['label'=>'Contact Info Label','class'=>'regular-text'],
                'cta_title' => ['label'=>'CTA Title'],
                'cta_subtitle' => ['label'=>'CTA Subtitle'],
                'cta_button' => ['label'=>'CTA Button','class'=>'regular-text'],
            ],
            'repeaters' => [
                'contact_info' => ['label'=>'Contact Info Items','fields'=>[
                    'key'=>['label'=>'Key (address/phone/email/hours)','class'=>'regular-text'],
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)'],
                    'content_ar'=>['label'=>'Content (AR)','rtl'=>true],
                ]],
                'contact_social' => ['label'=>'Social Links','fields'=>[
                    'platform'=>['label'=>'Platform','class'=>'regular-text'],
                    'url'=>['label'=>'URL'],
                ]],
            ],
        ],
        'faq' => [
            'label' => 'FAQ',
            'fields' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'not_found' => ['label'=>'Not Found Title'],
                'not_found_text' => ['label'=>'Not Found Text','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                'faq_items' => ['label'=>'FAQ Items','fields'=>[
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
            ],
        ],
        'privacy' => [
            'label' => 'Privacy Policy',
            'fields' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'last_updated' => ['label'=>'Last Updated','class'=>'regular-text'],
                'contact_cta' => ['label'=>'Contact CTA','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                'privacy_sections' => ['label'=>'Sections','fields'=>[
                    'title_en'=>['label'=>'Title (EN)'],
                    'title_ar'=>['label'=>'Title (AR)','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>4],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>4,'rtl'=>true],
                ]],
            ],
        ],
        'terms' => [
            'label' => 'Terms & Conditions',
            'fields' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'last_updated' => ['label'=>'Last Updated','class'=>'regular-text'],
                'agreement' => ['label'=>'Agreement Text','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                'terms_sections' => ['label'=>'Sections','fields'=>[
                    'title_en'=>['label'=>'Title (EN)'],
                    'title_ar'=>['label'=>'Title (AR)','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>4],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>4,'rtl'=>true],
                ]],
            ],
        ],
        'shipping' => [
            'label' => 'Shipping',
            'fields' => [
                'title' => ['label'=>'Title'],
                'have_questions' => ['label'=>'Have Questions Title'],
                'have_questions_text' => ['label'=>'Have Questions Text','type'=>'textarea','rows'=>2],
            ],
            'extra_fields' => [
                'rates_title' => ['label'=>'Rates Table Title'],
                'rates_destination' => ['label'=>'Column: Destination','class'=>'regular-text'],
                'rates_cost_label' => ['label'=>'Column: Cost','class'=>'regular-text'],
                'rates_delivery_label' => ['label'=>'Column: Est. Delivery','class'=>'regular-text'],
                'rates_currency' => ['label'=>'Currency','class'=>'regular-text'],
                'rates_note' => ['label'=>'Rates Note','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                'shipping_sections' => ['label'=>'Sections','fields'=>[
                    'key'=>['label'=>'Key','class'=>'regular-text'],
                    'title_en'=>['label'=>'Title (EN)'],
                    'title_ar'=>['label'=>'Title (AR)','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>3],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                'shipping_rates' => ['label'=>'Shipping Rates','fields'=>[
                    'location_en'=>['label'=>'Location (EN)','class'=>'regular-text'],
                    'location_ar'=>['label'=>'Location (AR)','class'=>'regular-text','rtl'=>true],
                    'cost_en'=>['label'=>'Cost (EN)','class'=>'regular-text'],
                    'cost_ar'=>['label'=>'Cost (AR)','class'=>'regular-text','rtl'=>true],
                    'delivery_en'=>['label'=>'Delivery (EN)','class'=>'regular-text'],
                    'delivery_ar'=>['label'=>'Delivery (AR)','class'=>'regular-text','rtl'=>true],
                ]],
            ],
        ],
        'returns' => [
            'label' => 'Returns',
            'fields' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'process_title' => ['label'=>'Process Title'],
                'eligible_title' => ['label'=>'Eligible Title'],
                'not_eligible_title' => ['label'=>'Not Eligible Title'],
                'need_help' => ['label'=>'Need Help Title'],
                'need_help_text' => ['label'=>'Need Help Text','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                'returns_features' => ['label'=>'Features','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>3],
                    'desc_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                'returns_steps' => ['label'=>'Return Steps','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>3],
                    'desc_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                'returns_eligible' => ['label'=>'Eligible Items','fields'=>[
                    'text_en'=>['label'=>'Text (EN)'],
                    'text_ar'=>['label'=>'Text (AR)','rtl'=>true],
                ]],
                'returns_not_eligible' => ['label'=>'Not Eligible Items','fields'=>[
                    'text_en'=>['label'=>'Text (EN)'],
                    'text_ar'=>['label'=>'Text (AR)','rtl'=>true],
                ]],
            ],
        ],
        'what-we-do' => [
            'label' => 'What We Do',
            'fields' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'content' => ['label'=>'Main Content','type'=>'textarea','rows'=>6],
            ],
            'has_image' => 'what-we-do_hero_image',
            'repeaters' => [
                'whatwedo_features' => ['label'=>'Features','fields'=>[
                    'image'=>['label'=>'Image','type'=>'image'],
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>2],
                    'desc_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                ]],
            ],
        ],
        'store-locator' => [
            'label' => 'Store Locator',
            'fields' => [
                'hero_title' => ['label'=>'Hero Title'],
                'hero_subtitle' => ['label'=>'Hero Subtitle'],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'opening_hours' => ['label'=>'Opening Hours','class'=>'regular-text'],
                'cta_title' => ['label'=>'CTA Title'],
                'cta_subtitle' => ['label'=>'CTA Subtitle','type'=>'textarea','rows'=>2],
                'cta_button' => ['label'=>'CTA Button Text','class'=>'regular-text'],
            ],
            'repeaters' => [
                'stores' => ['label'=>'Store Locations','fields'=>[
                    'name_en'=>['label'=>'Store Name (EN)','class'=>'regular-text'],
                    'name_ar'=>['label'=>'Store Name (AR)','class'=>'regular-text','rtl'=>true],
                    'floor_en'=>['label'=>'Floor (EN)','class'=>'regular-text'],
                    'floor_ar'=>['label'=>'Floor (AR)','class'=>'regular-text','rtl'=>true],
                    'city_en'=>['label'=>'City (EN)','class'=>'regular-text'],
                    'city_ar'=>['label'=>'City (AR)','class'=>'regular-text','rtl'=>true],
                    'region'=>['label'=>'Region slug','class'=>'regular-text'],
                    'country'=>['label'=>'Country slug (uae/oman)','class'=>'regular-text'],
                    'google_maps_url'=>['label'=>'Google Maps URL'],
                    'image'=>['label'=>'Store Image','type'=>'image'],
                ]],
            ],
        ],
    ];
}

// --- Admin Menu ---
function sasanperfumes_sp_admin_menu() {
    add_submenu_page('sasanperfumes-settings', 'Pages', 'Pages', 'manage_options', 'sasanperfumes-pages', 'sasanperfumes_sp_render_admin');
}

function sasanperfumes_sp_render_admin() {
    if (!current_user_can('manage_options')) return;

    $configs = sasanperfumes_sp_page_configs();
    $current_tab = sanitize_text_field($_GET['sp_tab'] ?? 'about');
    if (!isset($configs[$current_tab])) $current_tab = 'about';

    // Save
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('sasanperfumes_sp_save')) {
        sasanperfumes_sp_save($current_tab, $configs[$current_tab]);
        echo '<div class="notice notice-success"><p>Saved!</p></div>';
    }

    // Tabs
    echo '<div class="wrap"><h1>Page Content</h1><h2 class="nav-tab-wrapper">';
    foreach ($configs as $slug => $cfg) {
        $active = $slug === $current_tab ? ' nav-tab-active' : '';
        $url = admin_url("admin.php?page=sasanperfumes-pages&sp_tab={$slug}");
        echo "<a href=\"{$url}\" class=\"nav-tab{$active}\">{$cfg['label']}</a>";
    }
    echo '</h2>';

    // Form
    $cfg = $configs[$current_tab];
    echo '<form method="post">';
    wp_nonce_field('sasanperfumes_sp_save');

    // Bilingual fields
    if (!empty($cfg['fields'])) {
        echo '<table class="form-table">';
        sasanperfumes_sp_bilingual($current_tab, $cfg['fields']);
        echo '</table>';
    }

    // Extra fields (bilingual)
    if (!empty($cfg['extra_fields'])) {
        echo '<table class="form-table">';
        sasanperfumes_sp_bilingual($current_tab, $cfg['extra_fields']);
        echo '</table>';
    }

    // Section fields (bilingual) — about page specific
    if (!empty($cfg['section_fields'])) {
        echo '<hr><h2>Page Sections</h2><table class="form-table">';
        sasanperfumes_sp_bilingual($current_tab, $cfg['section_fields']);
        echo '</table>';
    }

    // Image field
    if (!empty($cfg['has_image'])) {
        $img = sasanperfumes_sp_opt($cfg['has_image'], '');
        echo '<table class="form-table"><tr><th>Hero Image</th><td>';
        if (function_exists('sasanperfumes_image_field')) {
            sasanperfumes_image_field("sasanperfumes_page_{$cfg['has_image']}", $img);
        } else {
            sasanperfumes_sp_field("sasanperfumes_page_{$cfg['has_image']}", $img);
        }
        echo '</td></tr></table>';
    }

    // Repeaters
    if (!empty($cfg['repeaters'])) {
        foreach ($cfg['repeaters'] as $rep_id => $rep_cfg) {
            $items = sasanperfumes_sp_opt($rep_id, []) ?: [[]];
            sasanperfumes_sp_repeater("sasanperfumes_page_{$rep_id}", $rep_cfg['label'], $items, $rep_cfg['fields']);
        }
    }

    echo '<p class="submit"><input type="submit" class="button-primary" value="Save Changes"></p>';
    echo '</form></div>';
}

// --- Save ---
function sasanperfumes_sp_save($page_slug, $cfg) {
    // Save bilingual fields
    $all_fields = array_merge($cfg['fields'] ?? [], $cfg['extra_fields'] ?? [], $cfg['section_fields'] ?? []);
    foreach ($all_fields as $key => $fc) {
        $type = $fc['type'] ?? 'text';
        $fn = $type === 'textarea' ? 'sanitize_textarea_field' : 'sanitize_text_field';
        update_option("sasanperfumes_page_{$page_slug}_{$key}_en", $fn($_POST["sasanperfumes_page_{$page_slug}_{$key}_en"] ?? ''));
        update_option("sasanperfumes_page_{$page_slug}_{$key}_ar", $fn($_POST["sasanperfumes_page_{$page_slug}_{$key}_ar"] ?? ''));
    }

    // Save image
    if (!empty($cfg['has_image'])) {
        update_option("sasanperfumes_page_{$cfg['has_image']}", esc_url_raw($_POST["sasanperfumes_page_{$cfg['has_image']}"] ?? ''));
    }

    // Save repeaters
    if (!empty($cfg['repeaters'])) {
        foreach ($cfg['repeaters'] as $rep_id => $rep_cfg) {
            $items = [];
            foreach ((array)($_POST["sasanperfumes_page_{$rep_id}"] ?? []) as $item) {
                $row = [];
                foreach ($rep_cfg['fields'] as $fk => $fc) {
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
            update_option("sasanperfumes_page_{$rep_id}", $items);
        }
    }
}

// --- REST API ---
function sasanperfumes_sp_rest_init() {
    sasanperfumes_register_rest_route( '/pages/(?P<slug>[a-zA-Z0-9_-]+)', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_sp_get_page', 'permission_callback' => '__return_true',
        'args' => ['slug' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    sasanperfumes_register_rest_route( '/notes-seo/(?P<slug>[a-zA-Z0-9_-]+)', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_sp_get_note_seo', 'permission_callback' => '__return_true',
        'args' => ['slug' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    sasanperfumes_register_rest_route( '/notes-seo', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_sp_get_all_notes_seo', 'permission_callback' => '__return_true',
    ]);
}

function sasanperfumes_sp_get_page($request) {
    $slug = $request['slug'];
    $bi = function($key) use ($slug) {
        return ['en' => sasanperfumes_sp_opt("{$slug}_{$key}_en", ''), 'ar' => sasanperfumes_sp_opt("{$slug}_{$key}_ar", '')];
    };
    $map_rep = function($rep_id, $mapping) {
        $out = [];
        foreach ((array) sasanperfumes_sp_opt($rep_id, []) as $item) {
            $row = [];
            foreach ($mapping as $api_key => $src) {
                if (is_array($src)) {
                    $row[$api_key] = ['en' => $item[$src[0]] ?? '', 'ar' => $item[$src[1]] ?? ''];
                } else {
                    $row[$api_key] = $item[$src] ?? '';
                }
            }
            if (array_filter($row, function($v) { return is_string($v) ? $v !== '' : !empty(array_filter($v)); })) {
                $out[] = $row;
            }
        }
        return $out;
    };

    $configs = sasanperfumes_sp_page_configs();
    if (!isset($configs[$slug])) {
        return new WP_REST_Response(['error' => 'Page not found'], 404);
    }

    $data = [];

    // Bilingual fields
    $all_fields = array_merge(
        $configs[$slug]['fields'] ?? [],
        $configs[$slug]['extra_fields'] ?? [],
        $configs[$slug]['section_fields'] ?? []
    );
    foreach ($all_fields as $key => $fc) {
        $data[$key] = $bi($key);
    }

    // Image
    if (!empty($configs[$slug]['has_image'])) {
        $data['heroImage'] = sasanperfumes_sp_opt($configs[$slug]['has_image'], '');
    }

    // Repeaters
    if (!empty($configs[$slug]['repeaters'])) {
        foreach ($configs[$slug]['repeaters'] as $rep_id => $rep_cfg) {
            $mapping = [];
            $fields = $rep_cfg['fields'];
            // Auto-detect bilingual pairs (ending in _en/_ar)
            $processed = [];
            foreach ($fields as $fk => $fc) {
                if (in_array($fk, $processed)) continue;
                $base = preg_replace('/_en$/', '', $fk);
                if (isset($fields[$base . '_en']) && isset($fields[$base . '_ar'])) {
                    $mapping[$base] = [$base . '_en', $base . '_ar'];
                    $processed[] = $base . '_en';
                    $processed[] = $base . '_ar';
                } else {
                    $mapping[$fk] = $fk;
                    $processed[] = $fk;
                }
            }
            $data[$rep_id] = $map_rep($rep_id, $mapping);
        }
    }

    // Add field name aliases for frontend compatibility (keep old names too)
    if ($slug === 'about') {
        if (isset($data['main_p1'])) $data['main_paragraph1'] = $data['main_p1'];
        if (isset($data['main_p2'])) $data['main_paragraph2'] = $data['main_p2'];
        if (isset($data['main_p3'])) $data['main_paragraph3'] = $data['main_p3'];
        if (isset($data['ingredients_desc'])) $data['ingredients_description'] = $data['ingredients_desc'];
        if (isset($data['about_faq'])) $data['faq_items'] = $data['about_faq'];
    }

    return new WP_REST_Response($data, 200);
}

// --- Notes SEO ---
function sasanperfumes_sp_get_note_seo($request) {
    $slug = $request['slug'];
    return new WP_REST_Response([
        'name' => ['en' => get_option("sasanperfumes_note_{$slug}_name_en", ''), 'ar' => get_option("sasanperfumes_note_{$slug}_name_ar", '')],
        'title' => ['en' => get_option("sasanperfumes_note_{$slug}_title_en", ''), 'ar' => get_option("sasanperfumes_note_{$slug}_title_ar", '')],
        'description' => ['en' => get_option("sasanperfumes_note_{$slug}_desc_en", ''), 'ar' => get_option("sasanperfumes_note_{$slug}_desc_ar", '')],
    ], 200);
}

function sasanperfumes_sp_get_all_notes_seo() {
    global $wpdb;
    $rows = $wpdb->get_results(
        "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'sasanperfumes_note_%'"
    );
    $notes = [];
    foreach ($rows as $row) {
        if (preg_match('/^sasanperfumes_note_(.+)_(name|title|desc)_(en|ar)$/', $row->option_name, $m)) {
            $slug = $m[1]; $field = $m[2]; $lang = $m[3];
            if (!isset($notes[$slug])) $notes[$slug] = ['name'=>['en'=>'','ar'=>''],'title'=>['en'=>'','ar'=>''],'description'=>['en'=>'','ar'=>'']];
            $api_field = $field === 'desc' ? 'description' : $field;
            $notes[$slug][$api_field][$lang] = $row->option_value;
        }
    }
    // Only return notes with content
    return new WP_REST_Response(array_filter($notes, function($n) {
        return !empty($n['name']['en']) || !empty($n['title']['en']);
    }), 200);
}

// --- Notes SEO Admin ---
function sasanperfumes_sp_notes_admin_menu() {
    add_submenu_page('sasanperfumes-settings', 'Notes SEO', 'Notes SEO', 'manage_options', 'sasanperfumes-notes-seo', 'sasanperfumes_sp_notes_render');
}

function sasanperfumes_sp_notes_render() {
    if (!current_user_can('manage_options')) return;

    // Save
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('sasanperfumes_notes_seo_save')) {
        $notes = (array)($_POST['sasanperfumes_notes'] ?? []);
        foreach ($notes as $slug => $data) {
            $slug = sanitize_key($slug);
            foreach (['name_en','name_ar','title_en','title_ar','desc_en','desc_ar'] as $f) {
                $fn = strpos($f, 'desc') !== false ? 'sanitize_textarea_field' : 'sanitize_text_field';
                update_option("sasanperfumes_note_{$slug}_{$f}", $fn($data[$f] ?? ''));
            }
        }
        // Handle new notes
        $new = (array)($_POST['sasanperfumes_new_notes'] ?? []);
        foreach ($new as $entry) {
            $slug = sanitize_key($entry['slug'] ?? '');
            if (empty($slug)) continue;
            foreach (['name_en','name_ar','title_en','title_ar','desc_en','desc_ar'] as $f) {
                $fn = strpos($f, 'desc') !== false ? 'sanitize_textarea_field' : 'sanitize_text_field';
                update_option("sasanperfumes_note_{$slug}_{$f}", $fn($entry[$f] ?? ''));
            }
        }
        echo '<div class="notice notice-success"><p>Notes SEO saved!</p></div>';
    }

    // Load all notes
    global $wpdb;
    $rows = $wpdb->get_results(
        "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'sasanperfumes_note_%'"
    );
    $notes = [];
    foreach ($rows as $row) {
        if (preg_match('/^sasanperfumes_note_(.+)_(name|title|desc)_(en|ar)$/', $row->option_name, $m)) {
            $slug = $m[1]; $field = $m[2] . '_' . $m[3];
            if (!isset($notes[$slug])) $notes[$slug] = [];
            $notes[$slug][$field] = $row->option_value;
        }
    }
    ksort($notes);

    echo '<div class="wrap"><h1>Notes SEO Content</h1>';
    echo '<p class="description">SEO content for fragrance note pages (/notes/slug). Each note has name, title, and description in EN/AR.</p>';
    echo '<form method="post">';
    wp_nonce_field('sasanperfumes_notes_seo_save');

    if (!empty($notes)) {
        foreach ($notes as $slug => $data) {
            echo '<div style="background:#f9f9f9;padding:15px;margin:15px 0;border:1px solid #ddd;border-radius:4px;">';
            echo '<h3 style="margin-top:0;">' . esc_html($slug) . '</h3>';
            echo '<table class="form-table" style="margin:0;">';
            echo '<tr><th>Name (EN)</th><td><input type="text" name="sasanperfumes_notes[' . esc_attr($slug) . '][name_en]" value="' . esc_attr($data['name_en'] ?? '') . '" class="regular-text"></td>';
            echo '<th>Name (AR)</th><td><input type="text" name="sasanperfumes_notes[' . esc_attr($slug) . '][name_ar]" value="' . esc_attr($data['name_ar'] ?? '') . '" class="regular-text" dir="rtl"></td></tr>';
            echo '<tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_notes[' . esc_attr($slug) . '][title_en]" value="' . esc_attr($data['title_en'] ?? '') . '" class="large-text"></td>';
            echo '<th>Title (AR)</th><td><input type="text" name="sasanperfumes_notes[' . esc_attr($slug) . '][title_ar]" value="' . esc_attr($data['title_ar'] ?? '') . '" class="large-text" dir="rtl"></td></tr>';
            echo '<tr><th>Desc (EN)</th><td><textarea name="sasanperfumes_notes[' . esc_attr($slug) . '][desc_en]" rows="2" class="large-text">' . esc_textarea($data['desc_en'] ?? '') . '</textarea></td>';
            echo '<th>Desc (AR)</th><td><textarea name="sasanperfumes_notes[' . esc_attr($slug) . '][desc_ar]" rows="2" class="large-text" dir="rtl">' . esc_textarea($data['desc_ar'] ?? '') . '</textarea></td></tr>';
            echo '</table></div>';
        }
    } else {
        echo '<p>No notes yet. Use the "Add New Note" section below or run the populate script.</p>';
    }

    // Add new note form
    echo '<hr><h2>Add New Note</h2>';
    echo '<div style="background:#fff3cd;padding:15px;margin:15px 0;border:1px solid #ffc107;border-radius:4px;">';
    echo '<table class="form-table" style="margin:0;">';
    echo '<tr><th>Slug</th><td><input type="text" name="sasanperfumes_new_notes[0][slug]" class="regular-text" placeholder="e.g. amber, rose, oud"></td></tr>';
    echo '<tr><th>Name (EN)</th><td><input type="text" name="sasanperfumes_new_notes[0][name_en]" class="regular-text"></td>';
    echo '<th>Name (AR)</th><td><input type="text" name="sasanperfumes_new_notes[0][name_ar]" class="regular-text" dir="rtl"></td></tr>';
    echo '<tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_new_notes[0][title_en]" class="large-text"></td>';
    echo '<th>Title (AR)</th><td><input type="text" name="sasanperfumes_new_notes[0][title_ar]" class="large-text" dir="rtl"></td></tr>';
    echo '<tr><th>Desc (EN)</th><td><textarea name="sasanperfumes_new_notes[0][desc_en]" rows="2" class="large-text"></textarea></td>';
    echo '<th>Desc (AR)</th><td><textarea name="sasanperfumes_new_notes[0][desc_ar]" rows="2" class="large-text" dir="rtl"></textarea></td></tr>';
    echo '</table></div>';

    echo '<p class="submit"><input type="submit" class="button-primary" value="Save All Notes"></p>';
    echo '</form></div>';
}

// --- Sample Content Initialization ---
function sasanperfumes_sp_populate_about_sample_content() {
    // Only populate if fields are empty
    if (get_option('sasanperfumes_page_about_title_en', '') !== '') return;

    // Hero
    update_option('sasanperfumes_page_about_hero_subtitle_en', 'Discover the art behind our luxury fragrances');
    update_option('sasanperfumes_page_about_hero_subtitle_ar', 'اكتشف فن صناعة عطورنا الفاخرة');
    update_option('sasanperfumes_page_about_hero_description_en', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Crafted with passion, every fragrance tells a story of elegance and identity.');
    update_option('sasanperfumes_page_about_hero_description_ar', 'هذا نص تجريبي يستخدم للتحقق من عرض محتوى صفحة من نحن بشكل صحيح باللغة العربية.');

    // Stats
    update_option('sasanperfumes_page_about_stats_since_en', 'Since 2020');
    update_option('sasanperfumes_page_about_stats_since_ar', 'منذ 2020');
    update_option('sasanperfumes_page_about_stats_location_en', 'UAE');
    update_option('sasanperfumes_page_about_stats_location_ar', 'الإمارات');
    update_option('sasanperfumes_page_about_stats_handcrafted_en', 'Handcrafted');
    update_option('sasanperfumes_page_about_stats_handcrafted_ar', 'صناعة يدوية');
    update_option('sasanperfumes_page_about_stats_sustainable_en', 'Sustainable');
    update_option('sasanperfumes_page_about_stats_sustainable_ar', 'مستدام');

    // Main Content
    update_option('sasanperfumes_page_about_main_title_en', 'Our Story');
    update_option('sasanperfumes_page_about_main_title_ar', 'قصتنا');
    update_option('sasanperfumes_page_about_main_p1_en', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean nec dignissim urna, at fringilla elit.');
    update_option('sasanperfumes_page_about_main_p1_ar', 'هذا نص تجريبي يستخدم للتحقق من عرض محتوى صفحة من نحن بشكل صحيح باللغة العربية.');
    update_option('sasanperfumes_page_about_main_p2_en', 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.');
    update_option('sasanperfumes_page_about_main_p2_ar', 'نص تجريبي آخر لتوضيح محتوى القصة الرئيسية للعلامة التجارية بشكل مناسب.');
    update_option('sasanperfumes_page_about_main_p3_en', 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.');
    update_option('sasanperfumes_page_about_main_p3_ar', 'نص تجريبي ثالث لإكمال قسم القصة الرئيسية بمعلومات إضافية عن العلامة.');

    // Mission
    update_option('sasanperfumes_page_about_mission_title_en', 'Our Mission');
    update_option('sasanperfumes_page_about_mission_title_ar', 'رسالتنا');
    update_option('sasanperfumes_page_about_mission_content_en', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Our mission is to create memorable fragrances that connect emotions, culture, and craftsmanship.');
    update_option('sasanperfumes_page_about_mission_content_ar', 'هذا نص تجريبي يوضح رسالة العلامة التجارية وطريقة عرض المحتوى العربي بشكل صحيح.');

    // Vision
    update_option('sasanperfumes_page_about_vision_title_en', 'Our Vision');
    update_option('sasanperfumes_page_about_vision_title_ar', 'رؤيتنا');
    update_option('sasanperfumes_page_about_vision_content_en', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Our vision is to become a trusted luxury fragrance house known for quality, creativity, and timeless scent experiences.');
    update_option('sasanperfumes_page_about_vision_content_ar', 'هذا نص تجريبي يوضح رؤية العلامة التجارية وطريقة عرض المحتوى العربي بشكل صحيح.');

    // Core Values
    update_option('sasanperfumes_page_about_core_values_title_en', 'Core Values');
    update_option('sasanperfumes_page_about_core_values_title_ar', 'قيمنا الأساسية');
    update_option('sasanperfumes_page_about_core_values_subtitle_en', 'The principles that guide every fragrance we create.');
    update_option('sasanperfumes_page_about_core_values_subtitle_ar', 'المبادئ التي توجه كل عطر نصنعه.');

    // Core Values Items
    $core_values = [
        [
            'title_en' => 'Craftsmanship',
            'title_ar' => 'الحرفية',
            'description_en' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'description_ar' => 'نص تجريبي للتحقق من عرض القيم الأساسية.',
        ],
        [
            'title_en' => 'Quality',
            'title_ar' => 'الجودة',
            'description_en' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'description_ar' => 'نص تجريبي للتحقق من عرض القيم الأساسية.',
        ],
        [
            'title_en' => 'Sustainability',
            'title_ar' => 'الاستدامة',
            'description_en' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'description_ar' => 'نص تجريبي للتحقق من عرض القيم الأساسية.',
        ],
    ];
    update_option('sasanperfumes_page_about_core_values', $core_values);

    // CTA
    update_option('sasanperfumes_page_about_cta_title_en', 'Ready to Experience Excellence?');
    update_option('sasanperfumes_page_about_cta_title_ar', 'هل أنت مستعد لتجربة التميز؟');
    update_option('sasanperfumes_page_about_cta_subtitle_en', 'Discover our collection of premium fragrances crafted with passion and excellence.');
    update_option('sasanperfumes_page_about_cta_subtitle_ar', 'اكتشف مجموعتنا من العطور الفاخرة المصنوعة بشغف وتميز.');
    update_option('sasanperfumes_page_about_cta_button_en', 'Shop Now');
    update_option('sasanperfumes_page_about_cta_button_ar', 'تسوق الآن');
    update_option('sasanperfumes_page_about_cta_link_en', '/shop');
    update_option('sasanperfumes_page_about_cta_link_ar', '/ar/shop');
}

// --- Init ---
add_action('admin_menu', 'sasanperfumes_sp_notes_admin_menu', 26);
add_action('rest_api_init', 'sasanperfumes_sp_rest_init');
