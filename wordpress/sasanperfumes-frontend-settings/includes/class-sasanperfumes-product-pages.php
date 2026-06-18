<?php
/**
 * ShapeHive Product Pages - Product-Type Dynamic Page System
 * 
 * Registers a Custom Post Type "sasanperfumes_product_page" with structured meta fields
 * for creating dynamic, bilingual (EN/AR) product-oriented pages directly
 * from the WordPress admin. Includes REST API endpoints for headless frontend.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 6.0.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize ShapeHive Product Pages
 */
function sasanperfumes_product_pages_init() {
    add_action('init', 'sasanperfumes_register_product_page_cpt');
    add_action('add_meta_boxes', 'sasanperfumes_product_page_add_metaboxes');
    add_action('save_post_sasanperfumes_product_page', 'sasanperfumes_product_page_save_meta', 10, 2);
    add_action('rest_api_init', 'sasanperfumes_product_pages_register_rest_routes');
    add_action('admin_enqueue_scripts', 'sasanperfumes_product_pages_admin_scripts');
    add_filter('manage_sasanperfumes_product_page_posts_columns', 'sasanperfumes_product_page_columns');
    add_action('manage_sasanperfumes_product_page_posts_custom_column', 'sasanperfumes_product_page_column_content', 10, 2);
    add_filter('post_row_actions', 'sasanperfumes_product_page_row_actions', 10, 2);
}

/**
 * Register Custom Post Type
 */
function sasanperfumes_register_product_page_cpt() {
    $labels = array(
        'name'               => 'Product Pages',
        'singular_name'      => 'Product Page',
        'menu_name'          => 'Product Pages',
        'add_new'            => 'Add New',
        'add_new_item'       => 'Add New Product Page',
        'edit_item'          => 'Edit Product Page',
        'new_item'           => 'New Product Page',
        'view_item'          => 'View Product Page',
        'search_items'       => 'Search Product Pages',
        'not_found'          => 'No product pages found',
        'not_found_in_trash' => 'No product pages found in trash',
        'all_items'          => 'All Product Pages',
    );

    $args = array(
        'labels'              => $labels,
        'public'              => false,
        'publicly_queryable'  => false,
        'show_ui'             => true,
        'show_in_menu'        => 'sasanperfumes-settings',
        'show_in_rest'        => true,
        'rest_base'           => 'sasanperfumes-product-pages',
        'capability_type'     => 'page',
        'has_archive'         => false,
        'hierarchical'        => false,
        'supports'            => array('title', 'thumbnail', 'page-attributes'),
        'menu_icon'           => 'dashicons-store',
        'rewrite'             => false,
    );

    register_post_type('sasanperfumes_product_page', $args);
}

/**
 * Admin columns for product pages list
 */
function sasanperfumes_product_page_columns($columns) {
    $new_columns = array();
    $new_columns['cb'] = $columns['cb'];
    $new_columns['title'] = $columns['title'];
    $new_columns['sasanperfumes_slug'] = 'Slug';
    $new_columns['sasanperfumes_category'] = 'Category';
    $new_columns['sasanperfumes_status'] = 'Page Status';
    $new_columns['date'] = $columns['date'];
    return $new_columns;
}

function sasanperfumes_product_page_column_content($column, $post_id) {
    switch ($column) {
        case 'sasanperfumes_slug':
            $slug = get_post_field('post_name', $post_id);
            echo '<code>' . esc_html($slug) . '</code>';
            break;
        case 'sasanperfumes_category':
            $cat_slug = get_post_meta($post_id, '_sasanperfumes_pp_product_category', true);
            if ($cat_slug) {
                $term = get_term_by('slug', $cat_slug, 'product_cat');
                echo $term && !is_wp_error($term) ? esc_html($term->name) : esc_html($cat_slug);
            } else {
                echo '—';
            }
            break;
        case 'sasanperfumes_status':
            $enabled = get_post_meta($post_id, '_sasanperfumes_pp_hero_enabled', true);
            echo $enabled !== '0' ? '<span style="color:green;">Active</span>' : '<span style="color:gray;">Draft</span>';
            break;
    }
}

/**
 * Enqueue admin scripts for product pages
 */
function sasanperfumes_product_pages_admin_scripts($hook) {
    global $post_type;
    if ($post_type !== 'sasanperfumes_product_page') return;
    if (!in_array($hook, array('post.php', 'post-new.php'))) return;
    
    wp_enqueue_media();
    wp_enqueue_script('sasanperfumes-admin', plugins_url('../admin.js', __FILE__), array('jquery'), sasanperfumes_SETTINGS_VERSION, true);
}

// ──────────────────────────────────────────────
// META BOXES
// ──────────────────────────────────────────────

/**
 * Register meta boxes
 */
function sasanperfumes_product_page_add_metaboxes() {
    add_meta_box('sasanperfumes_pp_hero',     'Hero Section',     'sasanperfumes_pp_render_hero_metabox',     'sasanperfumes_product_page', 'normal', 'high');
    add_meta_box('sasanperfumes_pp_products', 'Products Section', 'sasanperfumes_pp_render_products_metabox', 'sasanperfumes_product_page', 'normal', 'high');
    add_meta_box('sasanperfumes_pp_banners',  'Banners Section',  'sasanperfumes_pp_render_banners_metabox',  'sasanperfumes_product_page', 'normal', 'default');
    add_meta_box('sasanperfumes_pp_features', 'Features Section', 'sasanperfumes_pp_render_features_metabox', 'sasanperfumes_product_page', 'normal', 'default');
    add_meta_box('sasanperfumes_pp_faq',      'FAQ Section',      'sasanperfumes_pp_render_faq_metabox',      'sasanperfumes_product_page', 'normal', 'default');
    add_meta_box('sasanperfumes_pp_seo',      'SEO Settings',     'sasanperfumes_pp_render_seo_metabox',      'sasanperfumes_product_page', 'normal', 'default');
    add_meta_box('sasanperfumes_pp_layout',   'Layout & Order',   'sasanperfumes_pp_render_layout_metabox',   'sasanperfumes_product_page', 'side',   'default');
}

/**
 * Helper: Image field for product pages (reuses sasanperfumes_image_field from parent)
 */
function sasanperfumes_pp_image_field($name, $value = '') {
    if (function_exists('sasanperfumes_image_field')) {
        sasanperfumes_image_field($name, $value);
    } else {
        $has = !empty($value);
        $safe_id = str_replace(array('[',']'), array('_',''), $name);
        echo '<div class="sasanperfumes-image-field">';
        echo '<input type="hidden" name="'.esc_attr($name).'" id="'.esc_attr($safe_id).'" value="'.esc_url($value).'">';
        echo '<button type="button" class="button sasanperfumes-upload-btn" data-target="#'.esc_attr($safe_id).'" data-preview="#'.esc_attr($safe_id).'_preview">Upload Image</button>';
        echo '<button type="button" class="button sasanperfumes-remove-btn" data-target="#'.esc_attr($safe_id).'" data-preview="#'.esc_attr($safe_id).'_preview" style="'.($has ? '' : 'display:none;').'">Remove</button>';
        echo '<div id="'.esc_attr($safe_id).'_preview" class="sasanperfumes-preview">';
        if ($has) echo '<img src="'.esc_url($value).'" style="max-width:300px;max-height:150px;display:block;margin-top:10px;">';
        echo '</div></div>';
    }
}

// ─── Hero Section ─────────────────────────────

function sasanperfumes_pp_render_hero_metabox($post) {
    wp_nonce_field('sasanperfumes_pp_save_meta', 'sasanperfumes_pp_nonce');
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };
    ?>
    <table class="form-table">
        <tr><th>Enable Hero</th><td><label><input type="checkbox" name="sasanperfumes_pp_hero_enabled" value="1" <?php checked($m('hero_enabled', '1'), '1'); ?>> Show hero section</label></td></tr>
        <tr><th>Hero Image (Desktop)</th><td><?php sasanperfumes_pp_image_field('sasanperfumes_pp_hero_image', $m('hero_image')); ?></td></tr>
        <tr><th>Hero Image (Mobile)</th><td><?php sasanperfumes_pp_image_field('sasanperfumes_pp_hero_mobile_image', $m('hero_mobile_image')); ?></td></tr>
        <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_pp_hero_title" value="<?php echo esc_attr($m('hero_title')); ?>" class="large-text"></td></tr>
        <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_pp_hero_title_ar" value="<?php echo esc_attr($m('hero_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>Subtitle (EN)</th><td><input type="text" name="sasanperfumes_pp_hero_subtitle" value="<?php echo esc_attr($m('hero_subtitle')); ?>" class="large-text"></td></tr>
        <tr><th>Subtitle (AR)</th><td><input type="text" name="sasanperfumes_pp_hero_subtitle_ar" value="<?php echo esc_attr($m('hero_subtitle_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_pp_hero_description" class="large-text" rows="3"><?php echo esc_textarea($m('hero_description')); ?></textarea></td></tr>
        <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_pp_hero_description_ar" class="large-text" rows="3" dir="rtl"><?php echo esc_textarea($m('hero_description_ar')); ?></textarea></td></tr>
        <tr><th>CTA Text (EN)</th><td><input type="text" name="sasanperfumes_pp_hero_cta_text" value="<?php echo esc_attr($m('hero_cta_text')); ?>" class="regular-text" placeholder="Shop Now"></td></tr>
        <tr><th>CTA Text (AR)</th><td><input type="text" name="sasanperfumes_pp_hero_cta_text_ar" value="<?php echo esc_attr($m('hero_cta_text_ar')); ?>" class="regular-text" dir="rtl" placeholder="تسوق الآن"></td></tr>
        <tr><th>CTA Link</th><td><input type="text" name="sasanperfumes_pp_hero_cta_link" value="<?php echo esc_attr($m('hero_cta_link')); ?>" class="large-text" placeholder="/shop or https://..."></td></tr>
    </table>
    <?php
}

// ─── Products Section ─────────────────────────

function sasanperfumes_pp_render_products_metabox($post) {
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };

    // Get WooCommerce categories for dropdown
    $categories = array();
    if (taxonomy_exists('product_cat')) {
        $terms = get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => false, 'orderby' => 'name'));
        if (!is_wp_error($terms)) {
            $categories = $terms;
        }
    }

    ?>
    <table class="form-table">
        <tr><th>Enable Products</th><td><label><input type="checkbox" name="sasanperfumes_pp_products_enabled" value="1" <?php checked($m('products_enabled', '1'), '1'); ?>> Show products section</label></td></tr>
        <tr><th>Section Title (EN)</th><td><input type="text" name="sasanperfumes_pp_products_title" value="<?php echo esc_attr($m('products_title')); ?>" class="large-text"></td></tr>
        <tr><th>Section Title (AR)</th><td><input type="text" name="sasanperfumes_pp_products_title_ar" value="<?php echo esc_attr($m('products_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>Section Subtitle (EN)</th><td><input type="text" name="sasanperfumes_pp_products_subtitle" value="<?php echo esc_attr($m('products_subtitle')); ?>" class="large-text"></td></tr>
        <tr><th>Section Subtitle (AR)</th><td><input type="text" name="sasanperfumes_pp_products_subtitle_ar" value="<?php echo esc_attr($m('products_subtitle_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr>
            <th>Product Source</th>
            <td>
                <select name="sasanperfumes_pp_product_source" id="sasanperfumes_pp_product_source">
                    <option value="category" <?php selected($m('product_source', 'category'), 'category'); ?>>By Category</option>
                    <option value="featured" <?php selected($m('product_source', 'category'), 'featured'); ?>>Featured Products</option>
                    <option value="latest" <?php selected($m('product_source', 'category'), 'latest'); ?>>Latest Products</option>
                    <option value="bestseller" <?php selected($m('product_source', 'category'), 'bestseller'); ?>>Bestsellers</option>
                </select>
            </td>
        </tr>
        <tr>
            <th>Category</th>
            <td>
                <select name="sasanperfumes_pp_product_category">
                    <option value="">— Select Category —</option>
                    <?php foreach ($categories as $cat): ?>
                        <option value="<?php echo esc_attr($cat->slug); ?>" <?php selected($m('product_category'), $cat->slug); ?>><?php echo esc_html($cat->name); ?> (<?php echo $cat->count; ?>)</option>
                    <?php endforeach; ?>
                </select>
                <p class="description">Used when "Product Source" is set to "By Category".</p>
            </td>
        </tr>
        <tr><th>Product Count</th><td><input type="number" name="sasanperfumes_pp_product_count" value="<?php echo esc_attr($m('product_count', '12')); ?>" min="1" max="48" class="small-text"></td></tr>
        <tr>
            <th>Display Mode</th>
            <td>
                <select name="sasanperfumes_pp_product_display">
                    <option value="grid" <?php selected($m('product_display', 'grid'), 'grid'); ?>>Grid</option>
                    <option value="slider" <?php selected($m('product_display', 'grid'), 'slider'); ?>>Slider</option>
                </select>
            </td>
        </tr>
        <tr><th>Show View All</th><td><label><input type="checkbox" name="sasanperfumes_pp_products_show_view_all" value="1" <?php checked($m('products_show_view_all', '1'), '1'); ?>> Show "View All" link</label></td></tr>
        <tr><th>View All Link</th><td><input type="text" name="sasanperfumes_pp_products_view_all_link" value="<?php echo esc_attr($m('products_view_all_link', '/shop')); ?>" class="regular-text" placeholder="/shop"></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_pp_products_hide_mobile" value="1" <?php checked($m('products_hide_mobile', '0'), '1'); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_pp_products_hide_desktop" value="1" <?php checked($m('products_hide_desktop', '0'), '1'); ?>> Hide on desktop</label></td></tr>
    </table>
    <?php
}

// ─── Banners Section ──────────────────────────

function sasanperfumes_pp_render_banners_metabox($post) {
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };
    $banners = get_post_meta($post->ID, '_sasanperfumes_pp_banners', true);
    if (!is_array($banners) || empty($banners)) {
        $banners = array(array('image' => '', 'mobile' => '', 'title' => '', 'title_ar' => '', 'subtitle' => '', 'subtitle_ar' => '', 'link' => ''));
    }
    ?>
    <table class="form-table">
        <tr><th>Enable Banners</th><td><label><input type="checkbox" name="sasanperfumes_pp_banners_enabled" value="1" <?php checked($m('banners_enabled', '1'), '1'); ?>> Show banners section</label></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_pp_banners_hide_mobile" value="1" <?php checked($m('banners_hide_mobile', '0'), '1'); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_pp_banners_hide_desktop" value="1" <?php checked($m('banners_hide_desktop', '0'), '1'); ?>> Hide on desktop</label></td></tr>
    </table>
    <h4>Banner Items <button type="button" class="button" id="sasanperfumes-pp-add-banner">+ Add Banner</button></h4>
    <div id="sasanperfumes-pp-banners">
        <?php foreach ($banners as $i => $item): ?>
        <div class="sasanperfumes-banner-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
            <h4>Banner <?php echo $i + 1; ?> <button type="button" class="button sasanperfumes-pp-remove-banner" style="float:right;color:red;">Remove</button></h4>
            <table class="form-table">
                <tr><th>Desktop Image</th><td><?php sasanperfumes_pp_image_field("sasanperfumes_pp_banners[{$i}][image]", $item['image'] ?? ''); ?></td></tr>
                <tr><th>Mobile Image</th><td><?php sasanperfumes_pp_image_field("sasanperfumes_pp_banners[{$i}][mobile]", $item['mobile'] ?? ''); ?></td></tr>
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_pp_banners[<?php echo $i; ?>][title]" value="<?php echo esc_attr($item['title'] ?? ''); ?>" class="regular-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_pp_banners[<?php echo $i; ?>][title_ar]" value="<?php echo esc_attr($item['title_ar'] ?? ''); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>Subtitle (EN)</th><td><input type="text" name="sasanperfumes_pp_banners[<?php echo $i; ?>][subtitle]" value="<?php echo esc_attr($item['subtitle'] ?? ''); ?>" class="regular-text"></td></tr>
                <tr><th>Subtitle (AR)</th><td><input type="text" name="sasanperfumes_pp_banners[<?php echo $i; ?>][subtitle_ar]" value="<?php echo esc_attr($item['subtitle_ar'] ?? ''); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>Link</th><td><input type="text" name="sasanperfumes_pp_banners[<?php echo $i; ?>][link]" value="<?php echo esc_attr($item['link'] ?? ''); ?>" class="large-text" placeholder="/shop or https://..."></td></tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
}

// ─── Features Section ─────────────────────────

function sasanperfumes_pp_render_features_metabox($post) {
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };
    $features = get_post_meta($post->ID, '_sasanperfumes_pp_features', true);
    if (!is_array($features) || empty($features)) {
        $features = array(array('icon' => 'sparkles', 'image' => '', 'title' => '', 'title_ar' => '', 'description' => '', 'description_ar' => ''));
    }
    $icon_options = array('sparkles', 'leaf', 'shield', 'star', 'heart', 'gift', 'truck', 'clock', 'check', 'award', 'droplet', 'sun', 'moon', 'flame', 'gem');
    ?>
    <table class="form-table">
        <tr><th>Enable Features</th><td><label><input type="checkbox" name="sasanperfumes_pp_features_enabled" value="1" <?php checked($m('features_enabled', '1'), '1'); ?>> Show features section</label></td></tr>
        <tr><th>Section Title (EN)</th><td><input type="text" name="sasanperfumes_pp_features_title" value="<?php echo esc_attr($m('features_title')); ?>" class="large-text"></td></tr>
        <tr><th>Section Title (AR)</th><td><input type="text" name="sasanperfumes_pp_features_title_ar" value="<?php echo esc_attr($m('features_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_pp_features_hide_mobile" value="1" <?php checked($m('features_hide_mobile', '0'), '1'); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_pp_features_hide_desktop" value="1" <?php checked($m('features_hide_desktop', '0'), '1'); ?>> Hide on desktop</label></td></tr>
    </table>
    <h4>Feature Items <button type="button" class="button" id="sasanperfumes-pp-add-feature">+ Add Feature</button></h4>
    <div id="sasanperfumes-pp-features">
        <?php foreach ($features as $i => $item): ?>
        <div class="sasanperfumes-feature-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
            <h4>Feature <?php echo $i + 1; ?> <button type="button" class="button sasanperfumes-pp-remove-feature" style="float:right;color:red;">Remove</button></h4>
            <table class="form-table">
                <tr>
                    <th>Icon</th>
                    <td>
                        <select name="sasanperfumes_pp_features[<?php echo $i; ?>][icon]">
                            <?php foreach ($icon_options as $icon): ?>
                                <option value="<?php echo esc_attr($icon); ?>" <?php selected($item['icon'] ?? 'sparkles', $icon); ?>><?php echo esc_html(ucfirst($icon)); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Image</th>
                    <td>
                        <?php sasanperfumes_pp_image_field("sasanperfumes_pp_features[{$i}][image]", $item['image'] ?? ''); ?>
                        <p class="description">Optional image. If set, overrides icon on frontend.</p>
                    </td>
                </tr>
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_pp_features[<?php echo $i; ?>][title]" value="<?php echo esc_attr($item['title'] ?? ''); ?>" class="regular-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_pp_features[<?php echo $i; ?>][title_ar]" value="<?php echo esc_attr($item['title_ar'] ?? ''); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_pp_features[<?php echo $i; ?>][description]" class="large-text" rows="2"><?php echo esc_textarea($item['description'] ?? ''); ?></textarea></td></tr>
                <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_pp_features[<?php echo $i; ?>][description_ar]" class="large-text" rows="2" dir="rtl"><?php echo esc_textarea($item['description_ar'] ?? ''); ?></textarea></td></tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
}

// ─── FAQ Section ──────────────────────────────

function sasanperfumes_pp_render_faq_metabox($post) {
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };
    $faqs = get_post_meta($post->ID, '_sasanperfumes_pp_faqs', true);
    if (!is_array($faqs) || empty($faqs)) {
        $faqs = array(array('question' => '', 'question_ar' => '', 'answer' => '', 'answer_ar' => ''));
    }
    ?>
    <table class="form-table">
        <tr><th>Enable FAQ</th><td><label><input type="checkbox" name="sasanperfumes_pp_faq_enabled" value="1" <?php checked($m('faq_enabled', '1'), '1'); ?>> Show FAQ section</label></td></tr>
        <tr><th>Section Title (EN)</th><td><input type="text" name="sasanperfumes_pp_faq_title" value="<?php echo esc_attr($m('faq_title', 'Frequently Asked Questions')); ?>" class="large-text"></td></tr>
        <tr><th>Section Title (AR)</th><td><input type="text" name="sasanperfumes_pp_faq_title_ar" value="<?php echo esc_attr($m('faq_title_ar', 'الأسئلة الشائعة')); ?>" class="large-text" dir="rtl"></td></tr>
    </table>
    <h4>FAQ Items <button type="button" class="button" id="sasanperfumes-pp-add-faq">+ Add FAQ</button></h4>
    <div id="sasanperfumes-pp-faqs">
        <?php foreach ($faqs as $i => $item): ?>
        <div class="sasanperfumes-faq-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
            <h4>FAQ <?php echo $i + 1; ?> <button type="button" class="button sasanperfumes-pp-remove-faq" style="float:right;color:red;">Remove</button></h4>
            <table class="form-table">
                <tr><th>Question (EN)</th><td><input type="text" name="sasanperfumes_pp_faqs[<?php echo $i; ?>][question]" value="<?php echo esc_attr($item['question'] ?? ''); ?>" class="large-text"></td></tr>
                <tr><th>Question (AR)</th><td><input type="text" name="sasanperfumes_pp_faqs[<?php echo $i; ?>][question_ar]" value="<?php echo esc_attr($item['question_ar'] ?? ''); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>Answer (EN)</th><td><textarea name="sasanperfumes_pp_faqs[<?php echo $i; ?>][answer]" class="large-text" rows="3"><?php echo esc_textarea($item['answer'] ?? ''); ?></textarea></td></tr>
                <tr><th>Answer (AR)</th><td><textarea name="sasanperfumes_pp_faqs[<?php echo $i; ?>][answer_ar]" class="large-text" rows="3" dir="rtl"><?php echo esc_textarea($item['answer_ar'] ?? ''); ?></textarea></td></tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
}

// ─── SEO Section ──────────────────────────────

function sasanperfumes_pp_render_seo_metabox($post) {
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };
    ?>
    <table class="form-table">
        <tr><th>SEO Title (EN)</th><td><input type="text" name="sasanperfumes_pp_seo_title" value="<?php echo esc_attr($m('seo_title')); ?>" class="large-text"><p class="description">Leave empty to use the post title.</p></td></tr>
        <tr><th>SEO Title (AR)</th><td><input type="text" name="sasanperfumes_pp_seo_title_ar" value="<?php echo esc_attr($m('seo_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>SEO Description (EN)</th><td><textarea name="sasanperfumes_pp_seo_description" class="large-text" rows="3"><?php echo esc_textarea($m('seo_description')); ?></textarea></td></tr>
        <tr><th>SEO Description (AR)</th><td><textarea name="sasanperfumes_pp_seo_description_ar" class="large-text" rows="3" dir="rtl"><?php echo esc_textarea($m('seo_description_ar')); ?></textarea></td></tr>
        <tr><th>Keywords (EN)</th><td><input type="text" name="sasanperfumes_pp_seo_keywords" value="<?php echo esc_attr($m('seo_keywords')); ?>" class="large-text"><p class="description">Comma-separated keywords.</p></td></tr>
        <tr><th>Keywords (AR)</th><td><input type="text" name="sasanperfumes_pp_seo_keywords_ar" value="<?php echo esc_attr($m('seo_keywords_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>OG Image</th><td><?php sasanperfumes_pp_image_field('sasanperfumes_pp_seo_og_image', $m('seo_og_image')); ?><p class="description">Recommended: 1200x630 pixels.</p></td></tr>
    </table>
    <?php
}

// ─── Layout Section ───────────────────────────

function sasanperfumes_pp_render_layout_metabox($post) {
    $m = function($key, $default = '') use ($post) {
        $val = get_post_meta($post->ID, '_sasanperfumes_pp_' . $key, true);
        return $val !== '' ? $val : $default;
    };
    $section_order = $m('section_order', 'hero,products,banners,features,faq');
    ?>
    <p><strong>Section Order</strong></p>
    <p class="description">Comma-separated list of sections in display order. Available: hero, products, banners, features, faq</p>
    <input type="text" name="sasanperfumes_pp_section_order" value="<?php echo esc_attr($section_order); ?>" class="widefat" style="margin-bottom:10px;">
    
    <p><strong>Page Template</strong></p>
    <select name="sasanperfumes_pp_template" class="widefat" style="margin-bottom:10px;">
        <option value="default" <?php selected($m('template', 'default'), 'default'); ?>>Default (All Sections)</option>
        <option value="product-showcase" <?php selected($m('template', 'default'), 'product-showcase'); ?>>Product Showcase (Hero + Products)</option>
        <option value="landing" <?php selected($m('template', 'default'), 'landing'); ?>>Landing Page (Hero + Features + CTA)</option>
        <option value="minimal" <?php selected($m('template', 'default'), 'minimal'); ?>>Minimal (Products Only)</option>
    </select>

    <p><strong>Background Style</strong></p>
    <select name="sasanperfumes_pp_bg_style" class="widefat">
        <option value="default" <?php selected($m('bg_style', 'default'), 'default'); ?>>Default (Light)</option>
        <option value="warm" <?php selected($m('bg_style', 'default'), 'warm'); ?>>Warm (Amber Tones)</option>
        <option value="dark" <?php selected($m('bg_style', 'default'), 'dark'); ?>>Dark (For Luxury Feel)</option>
    </select>
    <?php
}

// ──────────────────────────────────────────────
// SAVE META
// ──────────────────────────────────────────────

function sasanperfumes_product_page_save_meta($post_id, $post) {
    if (!isset($_POST['sasanperfumes_pp_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_pp_nonce'], 'sasanperfumes_pp_save_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    // Hero fields
    $text_fields = array(
        'hero_enabled', 'hero_image', 'hero_mobile_image',
        'hero_title', 'hero_title_ar', 'hero_subtitle', 'hero_subtitle_ar',
        'hero_description', 'hero_description_ar',
        'hero_cta_text', 'hero_cta_text_ar', 'hero_cta_link',
        // Products fields
        'products_enabled', 'products_title', 'products_title_ar',
        'products_subtitle', 'products_subtitle_ar',
        'product_source', 'product_category',
        'product_count', 'product_display',
        'products_show_view_all', 'products_view_all_link',
        'products_hide_mobile', 'products_hide_desktop',
        // Banners fields
        'banners_enabled', 'banners_hide_mobile', 'banners_hide_desktop',
        // Features fields
        'features_enabled', 'features_title', 'features_title_ar',
        'features_hide_mobile', 'features_hide_desktop',
        // FAQ fields
        'faq_enabled', 'faq_title', 'faq_title_ar',
        // SEO fields
        'seo_title', 'seo_title_ar', 'seo_description', 'seo_description_ar',
        'seo_keywords', 'seo_keywords_ar', 'seo_og_image',
        // Layout fields
        'section_order', 'template', 'bg_style',
    );

    // Checkbox fields default to '0' when unchecked
    $checkbox_fields = array(
        'hero_enabled', 'products_enabled', 'products_show_view_all',
        'products_hide_mobile', 'products_hide_desktop',
        'banners_enabled', 'banners_hide_mobile', 'banners_hide_desktop',
        'features_enabled', 'features_hide_mobile', 'features_hide_desktop',
        'faq_enabled',
    );

    foreach ($text_fields as $field) {
        $post_key = 'sasanperfumes_pp_' . $field;
        if (in_array($field, $checkbox_fields)) {
            $value = isset($_POST[$post_key]) ? '1' : '0';
        } else {
            $value = isset($_POST[$post_key]) ? sanitize_text_field($_POST[$post_key]) : '';
        }
        // Special handling for URL fields
        if (strpos($field, 'image') !== false || $field === 'seo_og_image') {
            $value = isset($_POST[$post_key]) ? esc_url_raw($_POST[$post_key]) : '';
        }
        // Special handling for link fields
        if (strpos($field, '_link') !== false || strpos($field, '_cta_link') !== false) {
            $value = isset($_POST[$post_key]) ? sasanperfumes_sanitize_link($_POST[$post_key]) : '';
        }
        // Special handling for textarea fields (description, answer)
        if (strpos($field, 'description') !== false) {
            $value = isset($_POST[$post_key]) ? sanitize_textarea_field($_POST[$post_key]) : '';
        }
        update_post_meta($post_id, '_sasanperfumes_pp_' . $field, $value);
    }

    // Banners (repeater)
    $banners = array();
    if (isset($_POST['sasanperfumes_pp_banners']) && is_array($_POST['sasanperfumes_pp_banners'])) {
        foreach ($_POST['sasanperfumes_pp_banners'] as $banner) {
            $banners[] = array(
                'image'       => esc_url_raw($banner['image'] ?? ''),
                'mobile'      => esc_url_raw($banner['mobile'] ?? ''),
                'title'       => sanitize_text_field($banner['title'] ?? ''),
                'title_ar'    => sanitize_text_field($banner['title_ar'] ?? ''),
                'subtitle'    => sanitize_text_field($banner['subtitle'] ?? ''),
                'subtitle_ar' => sanitize_text_field($banner['subtitle_ar'] ?? ''),
                'link'        => sasanperfumes_sanitize_link($banner['link'] ?? ''),
            );
        }
    }
    update_post_meta($post_id, '_sasanperfumes_pp_banners', $banners);

    // Features (repeater)
    $features = array();
    if (isset($_POST['sasanperfumes_pp_features']) && is_array($_POST['sasanperfumes_pp_features'])) {
        foreach ($_POST['sasanperfumes_pp_features'] as $feature) {
            $features[] = array(
                'icon'           => sanitize_text_field($feature['icon'] ?? 'sparkles'),
                'image'          => esc_url_raw($feature['image'] ?? ''),
                'title'          => sanitize_text_field($feature['title'] ?? ''),
                'title_ar'       => sanitize_text_field($feature['title_ar'] ?? ''),
                'description'    => sanitize_textarea_field($feature['description'] ?? ''),
                'description_ar' => sanitize_textarea_field($feature['description_ar'] ?? ''),
            );
        }
    }
    update_post_meta($post_id, '_sasanperfumes_pp_features', $features);

    // FAQs (repeater)
    $faqs = array();
    if (isset($_POST['sasanperfumes_pp_faqs']) && is_array($_POST['sasanperfumes_pp_faqs'])) {
        foreach ($_POST['sasanperfumes_pp_faqs'] as $faq) {
            $faqs[] = array(
                'question'    => sanitize_text_field($faq['question'] ?? ''),
                'question_ar' => sanitize_text_field($faq['question_ar'] ?? ''),
                'answer'      => sanitize_textarea_field($faq['answer'] ?? ''),
                'answer_ar'   => sanitize_textarea_field($faq['answer_ar'] ?? ''),
            );
        }
    }
    update_post_meta($post_id, '_sasanperfumes_pp_faqs', $faqs);
}

// ──────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────

function sasanperfumes_product_pages_register_rest_routes() {
    sasanperfumes_register_rest_route( '/product-pages', array(
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_rest_get_product_pages',
        'permission_callback' => '__return_true',
    ));
    sasanperfumes_register_rest_route( '/product-pages/(?P<slug>[a-zA-Z0-9_-]+)', array(
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_rest_get_product_page',
        'permission_callback' => '__return_true',
    ));
}

/**
 * Build structured response for a product page
 */
function sasanperfumes_build_product_page_response($post) {
    $id = $post->ID;
    $m = function($key, $default = '') use ($id) {
        $val = get_post_meta($id, '_sasanperfumes_pp_' . $key, true);
        return ($val !== '' && $val !== false) ? $val : $default;
    };

    $banners_raw = get_post_meta($id, '_sasanperfumes_pp_banners', true);
    $banners = is_array($banners_raw) ? array_map(function($b) {
        return array(
            'image'      => $b['image'] ?? '',
            'mobileImage'=> $b['mobile'] ?? '',
            'title'      => $b['title'] ?? '',
            'titleAr'    => $b['title_ar'] ?? '',
            'subtitle'   => $b['subtitle'] ?? '',
            'subtitleAr' => $b['subtitle_ar'] ?? '',
            'link'       => $b['link'] ?? '',
        );
    }, $banners_raw) : array();

    $features_raw = get_post_meta($id, '_sasanperfumes_pp_features', true);
    $features = is_array($features_raw) ? array_map(function($f) {
        return array(
            'icon'          => $f['icon'] ?? 'sparkles',
            'image'         => $f['image'] ?? '',
            'title'         => $f['title'] ?? '',
            'titleAr'       => $f['title_ar'] ?? '',
            'description'   => $f['description'] ?? '',
            'descriptionAr' => $f['description_ar'] ?? '',
        );
    }, $features_raw) : array();

    $faqs_raw = get_post_meta($id, '_sasanperfumes_pp_faqs', true);
    $faqs = is_array($faqs_raw) ? array_map(function($f) {
        return array(
            'question'   => $f['question'] ?? '',
            'questionAr' => $f['question_ar'] ?? '',
            'answer'     => $f['answer'] ?? '',
            'answerAr'   => $f['answer_ar'] ?? '',
        );
    }, $faqs_raw) : array();

    $thumbnail_id = get_post_thumbnail_id($id);
    $thumbnail_url = $thumbnail_id ? wp_get_attachment_image_url($thumbnail_id, 'full') : '';

    return array(
        'id'    => $id,
        'slug'  => $post->post_name,
        'title' => $post->post_title,
        'date'  => $post->post_date,
        'modified' => $post->post_modified,
        'thumbnail' => $thumbnail_url,
        'hero' => array(
            'enabled'      => $m('hero_enabled', '1') === '1',
            'image'        => $m('hero_image'),
            'mobileImage'  => $m('hero_mobile_image'),
            'title'        => $m('hero_title'),
            'titleAr'      => $m('hero_title_ar'),
            'subtitle'     => $m('hero_subtitle'),
            'subtitleAr'   => $m('hero_subtitle_ar'),
            'description'  => $m('hero_description'),
            'descriptionAr'=> $m('hero_description_ar'),
            'ctaText'      => $m('hero_cta_text'),
            'ctaTextAr'    => $m('hero_cta_text_ar'),
            'ctaLink'      => $m('hero_cta_link'),
        ),
        'products' => array(
            'enabled'      => $m('products_enabled', '1') === '1',
            'title'        => $m('products_title'),
            'titleAr'      => $m('products_title_ar'),
            'subtitle'     => $m('products_subtitle'),
            'subtitleAr'   => $m('products_subtitle_ar'),
            'source'       => $m('product_source', 'category'),
            'categorySlug' => $m('product_category', ''),
            'count'        => intval($m('product_count', 12)),
            'display'      => $m('product_display', 'grid'),
            'showViewAll'  => $m('products_show_view_all', '1') === '1',
            'viewAllLink'  => $m('products_view_all_link', '/shop'),
            'hideOnMobile' => $m('products_hide_mobile', '0') === '1',
            'hideOnDesktop'=> $m('products_hide_desktop', '0') === '1',
        ),
        'banners' => array(
            'enabled'      => $m('banners_enabled', '1') === '1',
            'hideOnMobile' => $m('banners_hide_mobile', '0') === '1',
            'hideOnDesktop'=> $m('banners_hide_desktop', '0') === '1',
            'items'        => $banners,
        ),
        'features' => array(
            'enabled'      => $m('features_enabled', '1') === '1',
            'title'        => $m('features_title'),
            'titleAr'      => $m('features_title_ar'),
            'hideOnMobile' => $m('features_hide_mobile', '0') === '1',
            'hideOnDesktop'=> $m('features_hide_desktop', '0') === '1',
            'items'        => $features,
        ),
        'faq' => array(
            'enabled'      => $m('faq_enabled', '1') === '1',
            'title'        => $m('faq_title', 'Frequently Asked Questions'),
            'titleAr'      => $m('faq_title_ar', 'الأسئلة الشائعة'),
            'items'        => $faqs,
        ),
        'seo' => array(
            'title'        => $m('seo_title'),
            'titleAr'      => $m('seo_title_ar'),
            'description'  => $m('seo_description'),
            'descriptionAr'=> $m('seo_description_ar'),
            'keywords'     => $m('seo_keywords'),
            'keywordsAr'   => $m('seo_keywords_ar'),
            'ogImage'      => $m('seo_og_image'),
        ),
        'layout' => array(
            'sectionOrder' => $m('section_order', 'hero,products,banners,features,faq'),
            'template'     => $m('template', 'default'),
            'bgStyle'      => $m('bg_style', 'default'),
        ),
    );
}

/**
 * REST: Get all product pages
 */
function sasanperfumes_rest_get_product_pages($request) {
    $args = array(
        'post_type'      => 'sasanperfumes_product_page',
        'post_status'    => 'publish',
        'posts_per_page' => 100,
        'orderby'        => 'menu_order',
        'order'          => 'ASC',
    );
    $posts = get_posts($args);
    $pages = array();
    foreach ($posts as $post) {
        $pages[] = sasanperfumes_build_product_page_response($post);
    }
    return $pages;
}

/**
 * REST: Get single product page by slug
 */
function sasanperfumes_rest_get_product_page($request) {
    $slug = $request->get_param('slug');
    $args = array(
        'post_type'      => 'sasanperfumes_product_page',
        'post_status'    => 'publish',
        'name'           => $slug,
        'posts_per_page' => 1,
    );
    $posts = get_posts($args);
    if (empty($posts)) {
        return new WP_Error('not_found', 'Product page not found', array('status' => 404));
    }
    return sasanperfumes_build_product_page_response($posts[0]);
}

/**
 * Add View EN/AR links to Product Pages list row actions
 */
function sasanperfumes_product_page_row_actions($actions, $post) {
    if ($post->post_type !== 'sasanperfumes_product_page') return $actions;
    $slug = $post->post_name;
    $base = untrailingslashit(sasanperfumes_get_frontend_url());
    $actions['view_en'] = '<a href="' . esc_url($base . '/en/products/' . $slug) . '" target="_blank">View EN</a>';
    $actions['view_ar'] = '<a href="' . esc_url($base . '/ar/products/' . $slug) . '" target="_blank">View AR</a>';
    return $actions;
}

// Initialize
sasanperfumes_product_pages_init();
