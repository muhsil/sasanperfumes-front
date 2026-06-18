<?php
/**
 * ShapeHive Brand Pages
 *
 * Extended brand metadata for product brands.
 * Stores banner images, descriptions, perfume notes, and SEO fields
 * as term meta on product_brand taxonomy.
 *
 * REST: GET /sasanperfumes/v1/brands, GET /sasanperfumes/v1/brands/{slug}
 * Admin: adds fields to product brand edit screen
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.7.0
 */

if (!defined('ABSPATH')) exit;

// ── REST API ───────────────────────────────────────────────────────

add_action('rest_api_init', function () {
    sasanperfumes_register_rest_route( '/brands', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_brands_list',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/brands/(?P<slug>[a-zA-Z0-9_-]+)', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_brands_single',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/brands-page', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_brands_page_settings',
        'permission_callback' => '__return_true',
    ]);
});

function sasanperfumes_format_brand_term($term) {
    $id = $term->term_id;
    $m = function ($k, $d = '') use ($id) { return get_term_meta($id, $k, true) ?: $d; };
    $notes = get_term_meta($id, '_sasanperfumes_brand_notes', true);
    if (!is_array($notes)) $notes = [];
    $thumb_id = get_term_meta($id, 'thumbnail_id', true);
    $thumb_url = $thumb_id ? wp_get_attachment_url($thumb_id) : '';

    return [
        'id'          => $id,
        'slug'        => $term->slug,
        'name'        => $term->name,
        'description' => $term->description,
        'count'       => $term->count,
        'image'       => $thumb_url,
        'logo'        => $m('_sasanperfumes_brand_logo'),
        'banner'      => $m('_sasanperfumes_brand_banner'),
        'aboutTitle'  => ['en' => $m('_sasanperfumes_brand_about_title_en', 'About ' . $term->name), 'ar' => $m('_sasanperfumes_brand_about_title_ar')],
        'aboutContent'=> ['en' => $m('_sasanperfumes_brand_about_en'), 'ar' => $m('_sasanperfumes_brand_about_ar')],
        'shortDesc'   => ['en' => $m('_sasanperfumes_brand_short_desc_en', $term->description), 'ar' => $m('_sasanperfumes_brand_short_desc_ar')],
        'notes'       => array_map(function ($n) {
            return [
                'image'       => $n['image'] ?? '',
                'title'       => ['en' => $n['title_en'] ?? '', 'ar' => $n['title_ar'] ?? ''],
                'description' => ['en' => $n['desc_en'] ?? '', 'ar' => $n['desc_ar'] ?? ''],
            ];
        }, $notes),
        'seo' => [
            'title'       => ['en' => $m('_sasanperfumes_brand_seo_title_en'), 'ar' => $m('_sasanperfumes_brand_seo_title_ar')],
            'description' => ['en' => $m('_sasanperfumes_brand_seo_desc_en'), 'ar' => $m('_sasanperfumes_brand_seo_desc_ar')],
        ],
    ];
}

function sasanperfumes_brands_list() {
    $terms = get_terms([
        'taxonomy'   => 'product_brand',
        'hide_empty' => false,
    ]);
    if (is_wp_error($terms)) return [];
    return array_values(array_map('sasanperfumes_format_brand_term', $terms));
}

function sasanperfumes_brands_single($request) {
    $slug = sanitize_text_field($request['slug']);
    $term = get_term_by('slug', $slug, 'product_brand');
    if (!$term) return new WP_Error('not_found', 'Brand not found', ['status' => 404]);
    return sasanperfumes_format_brand_term($term);
}

function sasanperfumes_brands_page_settings() {
    $opt = function ($k, $d = '') { return get_option("sasanperfumes_brands_page_{$k}", $d); };
    return [
        'title'       => ['en' => $opt('title_en', 'Our Brands'), 'ar' => $opt('title_ar')],
        'subtitle'    => ['en' => $opt('subtitle_en'), 'ar' => $opt('subtitle_ar')],
        'description' => ['en' => $opt('description_en'), 'ar' => $opt('description_ar')],
        'bannerImage' => $opt('banner_image'),
        'seo' => [
            'title'       => ['en' => $opt('seo_title_en'), 'ar' => $opt('seo_title_ar')],
            'description' => ['en' => $opt('seo_desc_en'), 'ar' => $opt('seo_desc_ar')],
        ],
    ];
}

// ── Term meta fields on product_brand edit screen ───────────────────

add_action('product_brand_edit_form_fields', function ($term) {
    $id = $term->term_id;
    $m = function ($k, $d = '') use ($id) { return get_term_meta($id, $k, true) ?: $d; };
    $notes = get_term_meta($id, '_sasanperfumes_brand_notes', true);
    if (!is_array($notes)) $notes = [];

    $fields = [
        ['_sasanperfumes_brand_logo',           'Brand Logo',             'image'],
        ['_sasanperfumes_brand_banner',         'Brand Banner',           'image'],
        ['_sasanperfumes_brand_short_desc_en',  'Short Description (EN)', 'textarea'],
        ['_sasanperfumes_brand_short_desc_ar',  'Short Description (AR)', 'textarea'],
        ['_sasanperfumes_brand_about_title_en', 'About Title (EN)',       'text'],
        ['_sasanperfumes_brand_about_title_ar', 'About Title (AR)',       'text'],
        ['_sasanperfumes_brand_about_en',       'About Content (EN)',     'textarea'],
        ['_sasanperfumes_brand_about_ar',       'About Content (AR)',     'textarea'],
        ['_sasanperfumes_brand_seo_title_en',   'SEO Title (EN)',         'text'],
        ['_sasanperfumes_brand_seo_title_ar',   'SEO Title (AR)',         'text'],
        ['_sasanperfumes_brand_seo_desc_en',    'SEO Description (EN)',   'textarea'],
        ['_sasanperfumes_brand_seo_desc_ar',    'SEO Description (AR)',   'textarea'],
    ];

    echo '<tr class="form-field"><th colspan="2"><h3 style="margin:0;">Brand Page Settings</h3></th></tr>';
    foreach ($fields as [$key, $label, $type]) {
        $val = $m($key);
        $dir = strpos($key, '_ar') !== false ? ' dir="rtl"' : '';
        echo "<tr class='form-field'><th><label>{$label}</label></th><td>";
        if ($type === 'image') {
            sasanperfumes_image_field($key, $val);
        } elseif ($type === 'textarea') {
            echo "<textarea name='{$key}' rows='3' class='large-text'{$dir}>" . esc_textarea($val) . "</textarea>";
        } else {
            echo "<input type='text' name='{$key}' value='" . esc_attr($val) . "' class='large-text'{$dir}>";
        }
        echo "</td></tr>";
    }

    // Perfume Notes repeater
    echo '<tr class="form-field"><th colspan="2"><h3 style="margin:0;">Perfume Notes <button type="button" class="button" onclick="sasanperfumesAddBrandNote()">+ Add Note</button></h3></th></tr>';
    echo '<tr class="form-field"><td colspan="2"><div id="sasanperfumes-brand-notes">';
    foreach ($notes as $i => $n) {
        echo '<div style="background:#f9f9f9;padding:12px;margin:8px 0;border:1px solid #ddd;">';
        echo '<button type="button" class="button" style="float:right;color:red;" onclick="this.parentElement.remove()">Remove</button>';
        echo '<p><label>Image</label><br>';
        sasanperfumes_image_field("_sasanperfumes_brand_notes[{$i}][image]", $n['image'] ?? '');
        echo '</p>';
        echo '<p><label>Title (EN)</label><br><input type="text" name="_sasanperfumes_brand_notes[' . $i . '][title_en]" value="' . esc_attr($n['title_en'] ?? '') . '" class="regular-text"></p>';
        echo '<p><label>Title (AR)</label><br><input type="text" name="_sasanperfumes_brand_notes[' . $i . '][title_ar]" value="' . esc_attr($n['title_ar'] ?? '') . '" class="regular-text" dir="rtl"></p>';
        echo '<p><label>Description (EN)</label><br><textarea name="_sasanperfumes_brand_notes[' . $i . '][desc_en]" rows="2" class="large-text">' . esc_textarea($n['desc_en'] ?? '') . '</textarea></p>';
        echo '<p><label>Description (AR)</label><br><textarea name="_sasanperfumes_brand_notes[' . $i . '][desc_ar]" rows="2" class="large-text" dir="rtl">' . esc_textarea($n['desc_ar'] ?? '') . '</textarea></p>';
        echo '</div>';
    }
    echo '</div>';
    echo '<script>
    var sasanperfumesBNI = ' . count($notes) . ';
    function sasanperfumesAddBrandNote() {
        var c = document.getElementById("sasanperfumes-brand-notes");
        var i = sasanperfumesBNI++;
        var h = \'<div style="background:#f9f9f9;padding:12px;margin:8px 0;border:1px solid #ddd;">\' +
            \'<button type="button" class="button" style="float:right;color:red;" onclick="this.parentElement.remove()">Remove</button>\' +
            \'<p><label>Image</label><br><div class="sasanperfumes-image-field"><input type="hidden" name="_sasanperfumes_brand_notes[\' + i + \'][image]" id="_sasanperfumes_brand_notes_\' + i + \'_image" value=""><button type="button" class="button sasanperfumes-upload-btn" data-target="#_sasanperfumes_brand_notes_\' + i + \'_image" data-preview="#_sasanperfumes_brand_notes_\' + i + \'_image_preview">Upload Image</button> <button type="button" class="button sasanperfumes-remove-btn" data-target="#_sasanperfumes_brand_notes_\' + i + \'_image" data-preview="#_sasanperfumes_brand_notes_\' + i + \'_image_preview" style="display:none;">Remove</button><div id="_sasanperfumes_brand_notes_\' + i + \'_image_preview" class="sasanperfumes-preview"></div></div></p>\' +
            \'<p><label>Title (EN)</label><br><input type="text" name="_sasanperfumes_brand_notes[\' + i + \'][title_en]" class="regular-text"></p>\' +
            \'<p><label>Title (AR)</label><br><input type="text" name="_sasanperfumes_brand_notes[\' + i + \'][title_ar]" class="regular-text" dir="rtl"></p>\' +
            \'<p><label>Description (EN)</label><br><textarea name="_sasanperfumes_brand_notes[\' + i + \'][desc_en]" rows="2" class="large-text"></textarea></p>\' +
            \'<p><label>Description (AR)</label><br><textarea name="_sasanperfumes_brand_notes[\' + i + \'][desc_ar]" rows="2" class="large-text" dir="rtl"></textarea></p>\' +
            \'</div>\';
        c.insertAdjacentHTML("beforeend", h);
    }
    </script>';
    echo '</td></tr>';
}, 10, 1);

add_action('edited_product_brand', function ($term_id) {
    $text_fields = [
        '_sasanperfumes_brand_logo', '_sasanperfumes_brand_banner',
        '_sasanperfumes_brand_short_desc_en', '_sasanperfumes_brand_short_desc_ar',
        '_sasanperfumes_brand_about_title_en', '_sasanperfumes_brand_about_title_ar',
        '_sasanperfumes_brand_about_en', '_sasanperfumes_brand_about_ar',
        '_sasanperfumes_brand_seo_title_en', '_sasanperfumes_brand_seo_title_ar',
        '_sasanperfumes_brand_seo_desc_en', '_sasanperfumes_brand_seo_desc_ar',
    ];
    foreach ($text_fields as $k) {
        if (isset($_POST[$k])) {
            update_term_meta($term_id, $k, sanitize_text_field($_POST[$k]));
        }
    }
    // Perfume Notes repeater
    $notes = [];
    if (!empty($_POST['_sasanperfumes_brand_notes']) && is_array($_POST['_sasanperfumes_brand_notes'])) {
        foreach ($_POST['_sasanperfumes_brand_notes'] as $n) {
            $notes[] = [
                'image'    => esc_url_raw($n['image'] ?? ''),
                'title_en' => sanitize_text_field($n['title_en'] ?? ''),
                'title_ar' => sanitize_text_field($n['title_ar'] ?? ''),
                'desc_en'  => sanitize_textarea_field($n['desc_en'] ?? ''),
                'desc_ar'  => sanitize_textarea_field($n['desc_ar'] ?? ''),
            ];
        }
    }
    update_term_meta($term_id, '_sasanperfumes_brand_notes', $notes);
}, 10, 1);

// ── Admin: Brands Page Settings ────────────────────────────────────

add_action('admin_menu', function () {
    add_submenu_page(
        'sasanperfumes-settings',
        'Brands Page',
        'Brands Page',
        'manage_options',
        'sasanperfumes-settings-brands-page',
        'sasanperfumes_brands_page_render'
    );
});

function sasanperfumes_brands_page_render() {
    if (!current_user_can('manage_options')) return;

    if (isset($_POST['sasanperfumes_save_brands_page']) && check_admin_referer('sasanperfumes_brands_page_nonce')) {
        $fields = ['title_en','title_ar','subtitle_en','subtitle_ar','description_en','description_ar',
                    'banner_image','seo_title_en','seo_title_ar','seo_desc_en','seo_desc_ar'];
        foreach ($fields as $f) {
            update_option("sasanperfumes_brands_page_{$f}", sanitize_text_field($_POST["sasanperfumes_brands_page_{$f}"] ?? ''));
        }
        echo '<div class="notice notice-success is-dismissible"><p>Brands Page settings saved!</p></div>';
    }

    $opt = function ($k, $d = '') { return get_option("sasanperfumes_brands_page_{$k}", $d); };
    ?>
    <div class="wrap">
        <h1>Brands Page Settings</h1>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_brands_page_nonce'); ?>
            <table class="form-table">
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_brands_page_title_en" value="<?php echo esc_attr($opt('title_en', 'Our Brands')); ?>" class="large-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_brands_page_title_ar" value="<?php echo esc_attr($opt('title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>Subtitle (EN)</th><td><textarea name="sasanperfumes_brands_page_subtitle_en" rows="2" class="large-text"><?php echo esc_textarea($opt('subtitle_en')); ?></textarea></td></tr>
                <tr><th>Subtitle (AR)</th><td><textarea name="sasanperfumes_brands_page_subtitle_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea($opt('subtitle_ar')); ?></textarea></td></tr>
                <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_brands_page_description_en" rows="3" class="large-text"><?php echo esc_textarea($opt('description_en')); ?></textarea></td></tr>
                <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_brands_page_description_ar" rows="3" class="large-text" dir="rtl"><?php echo esc_textarea($opt('description_ar')); ?></textarea></td></tr>
                <tr><th>Banner Image</th><td><?php sasanperfumes_image_field('sasanperfumes_brands_page_banner_image', $opt('banner_image')); ?></td></tr>
                <tr><th>SEO Title (EN)</th><td><input type="text" name="sasanperfumes_brands_page_seo_title_en" value="<?php echo esc_attr($opt('seo_title_en')); ?>" class="large-text"></td></tr>
                <tr><th>SEO Title (AR)</th><td><input type="text" name="sasanperfumes_brands_page_seo_title_ar" value="<?php echo esc_attr($opt('seo_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>SEO Description (EN)</th><td><textarea name="sasanperfumes_brands_page_seo_desc_en" rows="2" class="large-text"><?php echo esc_textarea($opt('seo_desc_en')); ?></textarea></td></tr>
                <tr><th>SEO Description (AR)</th><td><textarea name="sasanperfumes_brands_page_seo_desc_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea($opt('seo_desc_ar')); ?></textarea></td></tr>
            </table>
            <p class="submit"><input type="submit" name="sasanperfumes_save_brands_page" class="button-primary" value="Save Brands Page"></p>
        </form>
    </div>
    <?php
}
