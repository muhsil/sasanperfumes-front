<?php
/**
 * ShapeHive Services CPT
 *
 * Custom Post Type for services with REST API endpoints.
 * Admin: sasanperfumes → Services
 * REST: GET /sasanperfumes/v1/services, GET /sasanperfumes/v1/services/{slug}
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.7.0
 */

if (!defined('ABSPATH')) exit;

// ── Register CPT ───────────────────────────────────────────────────

add_action('init', function () {
    register_post_type('sasanperfumes_service', [
        'labels' => [
            'name'               => 'Services',
            'singular_name'      => 'Service',
            'add_new_item'       => 'Add New Service',
            'edit_item'          => 'Edit Service',
            'all_items'          => 'All Services',
            'search_items'       => 'Search Services',
            'not_found'          => 'No services found',
        ],
        'public'             => false,
        'show_ui'            => true,
        'show_in_menu'       => 'sasanperfumes-settings',
        'show_in_rest'       => true,
        'rest_base'          => 'sasanperfumes_service',
        'supports'           => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'has_archive'        => false,
        'rewrite'            => false,
        'capability_type'    => 'post',
    ]);
});

// ── Metaboxes ──────────────────────────────────────────────────────

add_action('add_meta_boxes', function () {
    add_meta_box('sasanperfumes_service_fields', 'Service Details', 'sasanperfumes_service_fields_render', 'sasanperfumes_service', 'normal', 'high');
});

function sasanperfumes_service_fields_render($post) {
    wp_nonce_field('sasanperfumes_service_fields_nonce', 'sasanperfumes_service_fields_nonce');
    $m = function ($k, $d = '') { return get_post_meta($post->ID, $k, true) ?: $d; };

    $fields = [
        ['title_ar',       'Title (AR)',               'text'],
        ['excerpt_ar',     'Short Description (AR)',   'textarea'],
        ['content_ar',     'Full Description (AR)',    'textarea'],
        ['banner_image',   'Banner Image',             'image'],
        ['icon',           'Icon (lucide icon name)',   'text'],
        ['seo_title',      'SEO Title (EN)',           'text'],
        ['seo_title_ar',   'SEO Title (AR)',           'text'],
        ['seo_desc',       'SEO Description (EN)',     'textarea'],
        ['seo_desc_ar',    'SEO Description (AR)',     'textarea'],
    ];

    echo '<table class="form-table">';
    foreach ($fields as [$key, $label, $type]) {
        $val = $m("_sasanperfumes_service_{$key}");
        echo "<tr><th>{$label}</th><td>";
        if ($type === 'image') {
            sasanperfumes_image_field("sasanperfumes_service_{$key}", $val);
        } elseif ($type === 'textarea') {
            echo "<textarea name='sasanperfumes_service_{$key}' rows='3' class='large-text'>" . esc_textarea($val) . "</textarea>";
        } else {
            echo "<input type='text' name='sasanperfumes_service_{$key}' value='" . esc_attr($val) . "' class='large-text'>";
        }
        echo "</td></tr>";
    }
    echo '</table>';

    // Features repeater
    $features = get_post_meta($post->ID, '_sasanperfumes_service_features', true);
    if (!is_array($features)) $features = [];
    echo '<h3>Features <button type="button" class="button" onclick="sasanperfumesAddServiceFeature()">+ Add Feature</button></h3>';
    echo '<div id="sasanperfumes-service-features">';
    foreach ($features as $i => $f) {
        echo '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:12px;margin:8px 0;border:1px solid #ddd;">';
        echo '<button type="button" class="button" style="float:right;color:red;" onclick="this.parentElement.remove()">Remove</button>';
        echo '<p><label>Image</label><br>';
        sasanperfumes_image_field("sasanperfumes_service_features[{$i}][image]", $f['image'] ?? '');
        echo '</p>';
        echo '<p><label>Title (EN)</label><br><input type="text" name="sasanperfumes_service_features[' . $i . '][title_en]" value="' . esc_attr($f['title_en'] ?? '') . '" class="regular-text"></p>';
        echo '<p><label>Title (AR)</label><br><input type="text" name="sasanperfumes_service_features[' . $i . '][title_ar]" value="' . esc_attr($f['title_ar'] ?? '') . '" class="regular-text" dir="rtl"></p>';
        echo '<p><label>Description (EN)</label><br><textarea name="sasanperfumes_service_features[' . $i . '][desc_en]" rows="2" class="large-text">' . esc_textarea($f['desc_en'] ?? '') . '</textarea></p>';
        echo '<p><label>Description (AR)</label><br><textarea name="sasanperfumes_service_features[' . $i . '][desc_ar]" rows="2" class="large-text" dir="rtl">' . esc_textarea($f['desc_ar'] ?? '') . '</textarea></p>';
        echo '</div>';
    }
    echo '</div>';
    echo '<script>
    var sasanperfumesSFI = ' . count($features) . ';
    function sasanperfumesAddServiceFeature() {
        var c = document.getElementById("sasanperfumes-service-features");
        var i = sasanperfumesSFI++;
        var html = \'<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:12px;margin:8px 0;border:1px solid #ddd;">\' +
            \'<button type="button" class="button" style="float:right;color:red;" onclick="this.parentElement.remove()">Remove</button>\' +
            \'<p><label>Image</label><br><div class="sasanperfumes-image-field"><input type="hidden" name="sasanperfumes_service_features[\' + i + \'][image]" id="sasanperfumes_service_features_\' + i + \'_image" value=""><button type="button" class="button sasanperfumes-upload-btn" data-target="#sasanperfumes_service_features_\' + i + \'_image" data-preview="#sasanperfumes_service_features_\' + i + \'_image_preview">Upload Image</button> <button type="button" class="button sasanperfumes-remove-btn" data-target="#sasanperfumes_service_features_\' + i + \'_image" data-preview="#sasanperfumes_service_features_\' + i + \'_image_preview" style="display:none;">Remove</button><div id="sasanperfumes_service_features_\' + i + \'_image_preview" class="sasanperfumes-preview"></div></div></p>\' +
            \'<p><label>Title (EN)</label><br><input type="text" name="sasanperfumes_service_features[\' + i + \'][title_en]" class="regular-text"></p>\' +
            \'<p><label>Title (AR)</label><br><input type="text" name="sasanperfumes_service_features[\' + i + \'][title_ar]" class="regular-text" dir="rtl"></p>\' +
            \'<p><label>Description (EN)</label><br><textarea name="sasanperfumes_service_features[\' + i + \'][desc_en]" rows="2" class="large-text"></textarea></p>\' +
            \'<p><label>Description (AR)</label><br><textarea name="sasanperfumes_service_features[\' + i + \'][desc_ar]" rows="2" class="large-text" dir="rtl"></textarea></p>\' +
            \'</div>\';
        c.insertAdjacentHTML("beforeend", html);
    }
    </script>';
}

add_action('save_post_sasanperfumes_service', function ($post_id) {
    if (!isset($_POST['sasanperfumes_service_fields_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_service_fields_nonce'], 'sasanperfumes_service_fields_nonce')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;

    $text_fields = ['title_ar', 'banner_image', 'icon', 'seo_title', 'seo_title_ar'];
    $textarea_fields = ['excerpt_ar', 'content_ar', 'seo_desc', 'seo_desc_ar'];

    foreach ($text_fields as $k) {
        if (isset($_POST["sasanperfumes_service_{$k}"])) {
            update_post_meta($post_id, "_sasanperfumes_service_{$k}", sanitize_text_field($_POST["sasanperfumes_service_{$k}"]));
        }
    }
    foreach ($textarea_fields as $k) {
        if (isset($_POST["sasanperfumes_service_{$k}"])) {
            update_post_meta($post_id, "_sasanperfumes_service_{$k}", sanitize_textarea_field($_POST["sasanperfumes_service_{$k}"]));
        }
    }

    // Features repeater
    $features = [];
    if (!empty($_POST['sasanperfumes_service_features']) && is_array($_POST['sasanperfumes_service_features'])) {
        foreach ($_POST['sasanperfumes_service_features'] as $f) {
            $features[] = [
                'image'    => esc_url_raw($f['image'] ?? ''),
                'title_en' => sanitize_text_field($f['title_en'] ?? ''),
                'title_ar' => sanitize_text_field($f['title_ar'] ?? ''),
                'desc_en'  => sanitize_textarea_field($f['desc_en'] ?? ''),
                'desc_ar'  => sanitize_textarea_field($f['desc_ar'] ?? ''),
            ];
        }
    }
    update_post_meta($post_id, '_sasanperfumes_service_features', $features);
});

// ── REST API ───────────────────────────────────────────────────────

add_action('rest_api_init', function () {
    sasanperfumes_register_rest_route( '/services', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_services_list',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/services/(?P<slug>[a-zA-Z0-9_-]+)', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_services_single',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/services-page', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_services_page_settings',
        'permission_callback' => '__return_true',
    ]);
});

function sasanperfumes_format_service($post) {
    $id = $post->ID;
    $m = function ($k, $d = '') use ($id) { return get_post_meta($id, $k, true) ?: $d; };
    $thumb = get_the_post_thumbnail_url($id, 'large') ?: '';
    $features = get_post_meta($id, '_sasanperfumes_service_features', true);
    if (!is_array($features)) $features = [];

    return [
        'id'          => $id,
        'slug'        => $post->post_name,
        'title'       => ['en' => $post->post_title, 'ar' => $m('_sasanperfumes_service_title_ar')],
        'excerpt'     => ['en' => $post->post_excerpt, 'ar' => $m('_sasanperfumes_service_excerpt_ar')],
        'content'     => ['en' => apply_filters('the_content', $post->post_content), 'ar' => $m('_sasanperfumes_service_content_ar')],
        'image'       => $thumb,
        'bannerImage' => $m('_sasanperfumes_service_banner_image'),
        'icon'        => $m('_sasanperfumes_service_icon'),
        'features'    => array_map(function ($f) {
            return [
                'image'       => $f['image'] ?? '',
                'title'       => ['en' => $f['title_en'] ?? '', 'ar' => $f['title_ar'] ?? ''],
                'description' => ['en' => $f['desc_en'] ?? '', 'ar' => $f['desc_ar'] ?? ''],
            ];
        }, $features),
        'seo' => [
            'title'       => ['en' => $m('_sasanperfumes_service_seo_title'), 'ar' => $m('_sasanperfumes_service_seo_title_ar')],
            'description' => ['en' => $m('_sasanperfumes_service_seo_desc'), 'ar' => $m('_sasanperfumes_service_seo_desc_ar')],
        ],
    ];
}

function sasanperfumes_services_list() {
    $posts = get_posts([
        'post_type'      => 'sasanperfumes_service',
        'post_status'    => 'publish',
        'posts_per_page' => 50,
        'orderby'        => 'menu_order',
        'order'          => 'ASC',
    ]);
    return array_map('sasanperfumes_format_service', $posts);
}

function sasanperfumes_services_single($request) {
    $slug = sanitize_text_field($request['slug']);
    $posts = get_posts([
        'post_type'      => 'sasanperfumes_service',
        'post_status'    => 'publish',
        'name'           => $slug,
        'posts_per_page' => 1,
    ]);
    if (empty($posts)) return new WP_Error('not_found', 'Service not found', ['status' => 404]);
    return sasanperfumes_format_service($posts[0]);
}

function sasanperfumes_services_page_settings() {
    $opt = function ($k, $d = '') { return get_option("sasanperfumes_services_page_{$k}", $d); };
    return [
        'title'       => ['en' => $opt('title_en', 'Our Services'), 'ar' => $opt('title_ar')],
        'subtitle'    => ['en' => $opt('subtitle_en'), 'ar' => $opt('subtitle_ar')],
        'description' => ['en' => $opt('description_en'), 'ar' => $opt('description_ar')],
        'bannerImage' => $opt('banner_image'),
        'ctaTitle'    => ['en' => $opt('cta_title_en'), 'ar' => $opt('cta_title_ar')],
        'ctaButton'   => ['en' => $opt('cta_button_en', 'Contact Us'), 'ar' => $opt('cta_button_ar')],
        'ctaLink'     => $opt('cta_link', '/contact'),
        'seo'         => [
            'title'       => ['en' => $opt('seo_title_en'), 'ar' => $opt('seo_title_ar')],
            'description' => ['en' => $opt('seo_desc_en'), 'ar' => $opt('seo_desc_ar')],
        ],
    ];
}

// ── Admin: Services Page Settings ──────────────────────────────────

add_action('admin_menu', function () {
    add_submenu_page(
        'sasanperfumes-settings',
        'Services Page',
        'Services Page',
        'manage_options',
        'sasanperfumes-settings-services-page',
        'sasanperfumes_services_page_render'
    );
});

function sasanperfumes_services_page_render() {
    if (!current_user_can('manage_options')) return;

    if (isset($_POST['sasanperfumes_save_services_page']) && check_admin_referer('sasanperfumes_services_page_nonce')) {
        $fields = ['title_en','title_ar','subtitle_en','subtitle_ar','description_en','description_ar',
                    'banner_image','cta_title_en','cta_title_ar','cta_button_en','cta_button_ar','cta_link',
                    'seo_title_en','seo_title_ar','seo_desc_en','seo_desc_ar'];
        foreach ($fields as $f) {
            update_option("sasanperfumes_services_page_{$f}", sanitize_text_field($_POST["sasanperfumes_services_page_{$f}"] ?? ''));
        }
        echo '<div class="notice notice-success is-dismissible"><p>Services Page settings saved!</p></div>';
    }

    $opt = function ($k, $d = '') { return get_option("sasanperfumes_services_page_{$k}", $d); };
    ?>
    <div class="wrap">
        <h1>Services Page Settings</h1>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_services_page_nonce'); ?>
            <table class="form-table">
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_services_page_title_en" value="<?php echo esc_attr($opt('title_en', 'Our Services')); ?>" class="large-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_services_page_title_ar" value="<?php echo esc_attr($opt('title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>Subtitle (EN)</th><td><textarea name="sasanperfumes_services_page_subtitle_en" rows="2" class="large-text"><?php echo esc_textarea($opt('subtitle_en')); ?></textarea></td></tr>
                <tr><th>Subtitle (AR)</th><td><textarea name="sasanperfumes_services_page_subtitle_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea($opt('subtitle_ar')); ?></textarea></td></tr>
                <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_services_page_description_en" rows="3" class="large-text"><?php echo esc_textarea($opt('description_en')); ?></textarea></td></tr>
                <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_services_page_description_ar" rows="3" class="large-text" dir="rtl"><?php echo esc_textarea($opt('description_ar')); ?></textarea></td></tr>
                <tr><th>Banner Image</th><td><?php sasanperfumes_image_field('sasanperfumes_services_page_banner_image', $opt('banner_image')); ?></td></tr>
                <tr><th>CTA Title (EN)</th><td><input type="text" name="sasanperfumes_services_page_cta_title_en" value="<?php echo esc_attr($opt('cta_title_en')); ?>" class="large-text"></td></tr>
                <tr><th>CTA Title (AR)</th><td><input type="text" name="sasanperfumes_services_page_cta_title_ar" value="<?php echo esc_attr($opt('cta_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>CTA Button (EN)</th><td><input type="text" name="sasanperfumes_services_page_cta_button_en" value="<?php echo esc_attr($opt('cta_button_en', 'Contact Us')); ?>" class="regular-text"></td></tr>
                <tr><th>CTA Button (AR)</th><td><input type="text" name="sasanperfumes_services_page_cta_button_ar" value="<?php echo esc_attr($opt('cta_button_ar')); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>CTA Link</th><td><input type="text" name="sasanperfumes_services_page_cta_link" value="<?php echo esc_attr($opt('cta_link', '/contact')); ?>" class="regular-text"></td></tr>
                <tr><th>SEO Title (EN)</th><td><input type="text" name="sasanperfumes_services_page_seo_title_en" value="<?php echo esc_attr($opt('seo_title_en')); ?>" class="large-text"></td></tr>
                <tr><th>SEO Title (AR)</th><td><input type="text" name="sasanperfumes_services_page_seo_title_ar" value="<?php echo esc_attr($opt('seo_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>SEO Description (EN)</th><td><textarea name="sasanperfumes_services_page_seo_desc_en" rows="2" class="large-text"><?php echo esc_textarea($opt('seo_desc_en')); ?></textarea></td></tr>
                <tr><th>SEO Description (AR)</th><td><textarea name="sasanperfumes_services_page_seo_desc_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea($opt('seo_desc_ar')); ?></textarea></td></tr>
            </table>
            <p class="submit"><input type="submit" name="sasanperfumes_save_services_page" class="button-primary" value="Save Services Page"></p>
        </form>
    </div>
    <?php
}
