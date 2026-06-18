<?php
/**
 * Sasan Perfumes Category SEO Content
 * 
 * Adds custom SEO content fields (title + description, EN/AR) to WooCommerce
 * product category terms, replacing the hardcoded category-seo-content.ts file.
 * 
 * Admin: Products â†’ Categories â†’ Edit â†’ "Category SEO Content" fields
 * REST API: GET /sasanperfumes/v1/category-seo/{slug}
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 6.1.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize Category SEO module
 */
function sasanperfumes_category_seo_init() {
    // Add fields to product category edit form
    add_action('product_cat_edit_form_fields', 'sasanperfumes_category_seo_edit_fields', 20);
    add_action('product_cat_add_form_fields', 'sasanperfumes_category_seo_add_fields', 20);

    // Save fields
    add_action('edited_product_cat', 'sasanperfumes_category_seo_save_fields');
    add_action('created_product_cat', 'sasanperfumes_category_seo_save_fields');

    // REST API endpoint
    add_action('rest_api_init', 'sasanperfumes_category_seo_register_routes');
}

/**
 * Render SEO fields on the "Add New Category" screen
 */
function sasanperfumes_category_seo_add_fields() {
    ?>
    <div class="form-field">
        <h3 style="margin-top:20px;padding-top:20px;border-top:1px solid #ddd;">Category Display Settings</h3>
    </div>
    <div class="form-field">
        <label>Subtitle (EN)</label>
        <input type="text" name="sasanperfumes_cat_subtitle_en" value="" class="large-text">
        <p class="description">Displayed below the category name on the frontend.</p>
    </div>
    <div class="form-field">
        <label>Subtitle (AR)</label>
        <input type="text" name="sasanperfumes_cat_subtitle_ar" value="" dir="rtl">
    </div>
    <div class="form-field">
        <h3 style="margin-top:20px;padding-top:20px;border-top:1px solid #ddd;">Category SEO Content</h3>
        <p class="description">SEO-optimized content displayed below the product grid on this category page. Supports EN/AR.</p>
    </div>
    <div class="form-field">
        <label>SEO Title (EN)</label>
        <input type="text" name="sasanperfumes_cat_seo_title_en" value="" class="large-text">
    </div>
    <div class="form-field">
        <label>SEO Title (AR)</label>
        <input type="text" name="sasanperfumes_cat_seo_title_ar" value="" dir="rtl">
    </div>
    <div class="form-field">
        <label>SEO Description (EN)</label>
        <textarea name="sasanperfumes_cat_seo_desc_en" rows="4" class="large-text"></textarea>
    </div>
    <div class="form-field">
        <label>SEO Description (AR)</label>
        <textarea name="sasanperfumes_cat_seo_desc_ar" rows="4" dir="rtl"></textarea>
    </div>
    <?php
}

/**
 * Render SEO fields on the "Edit Category" screen
 */
function sasanperfumes_category_seo_edit_fields($term) {
    $subtitle_en = get_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_en', true);
    $subtitle_ar = get_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_ar', true);
    $title_en = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_en', true);
    $title_ar = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_ar', true);
    $desc_en  = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_en', true);
    $desc_ar  = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_ar', true);
    ?>
    <tr class="form-field">
        <td colspan="2"><h3 style="padding-top:15px;border-top:1px solid #ddd;">Category Display Settings</h3></td>
    </tr>
    <tr class="form-field">
        <th><label for="sasanperfumes_cat_subtitle_en">Subtitle (EN)</label></th>
        <td><input type="text" name="sasanperfumes_cat_subtitle_en" id="sasanperfumes_cat_subtitle_en" value="<?php echo esc_attr($subtitle_en); ?>" class="large-text">
        <p class="description">Displayed below the category name on the frontend.</p></td>
    </tr>
    <tr class="form-field">
        <th><label for="sasanperfumes_cat_subtitle_ar">Subtitle (AR)</label></th>
        <td><input type="text" name="sasanperfumes_cat_subtitle_ar" id="sasanperfumes_cat_subtitle_ar" value="<?php echo esc_attr($subtitle_ar); ?>" class="large-text" dir="rtl"></td>
    </tr>
    <tr class="form-field">
        <td colspan="2"><h3 style="padding-top:15px;border-top:1px solid #ddd;">Category SEO Content</h3>
        <p class="description">SEO-optimized content displayed below the product grid on this category page. Supports EN/AR.</p></td>
    </tr>
    <tr class="form-field">
        <th><label for="sasanperfumes_cat_seo_title_en">SEO Title (EN)</label></th>
        <td><input type="text" name="sasanperfumes_cat_seo_title_en" id="sasanperfumes_cat_seo_title_en" value="<?php echo esc_attr($title_en); ?>" class="large-text"></td>
    </tr>
    <tr class="form-field">
        <th><label for="sasanperfumes_cat_seo_title_ar">SEO Title (AR)</label></th>
        <td><input type="text" name="sasanperfumes_cat_seo_title_ar" id="sasanperfumes_cat_seo_title_ar" value="<?php echo esc_attr($title_ar); ?>" class="large-text" dir="rtl"></td>
    </tr>
    <tr class="form-field">
        <th><label for="sasanperfumes_cat_seo_desc_en">SEO Description (EN)</label></th>
        <td><textarea name="sasanperfumes_cat_seo_desc_en" id="sasanperfumes_cat_seo_desc_en" rows="5" class="large-text"><?php echo esc_textarea($desc_en); ?></textarea></td>
    </tr>
    <tr class="form-field">
        <th><label for="sasanperfumes_cat_seo_desc_ar">SEO Description (AR)</label></th>
        <td><textarea name="sasanperfumes_cat_seo_desc_ar" id="sasanperfumes_cat_seo_desc_ar" rows="5" class="large-text" dir="rtl"><?php echo esc_textarea($desc_ar); ?></textarea></td>
    </tr>
    <?php
}

/**
 * Save SEO fields when a category is created or updated
 */
function sasanperfumes_category_seo_save_fields($term_id) {
    if (isset($_POST['sasanperfumes_cat_subtitle_en'])) {
        update_term_meta($term_id, 'sasanperfumes_cat_subtitle_en', sanitize_text_field($_POST['sasanperfumes_cat_subtitle_en']));
    }
    if (isset($_POST['sasanperfumes_cat_subtitle_ar'])) {
        update_term_meta($term_id, 'sasanperfumes_cat_subtitle_ar', sanitize_text_field($_POST['sasanperfumes_cat_subtitle_ar']));
    }
    if (isset($_POST['sasanperfumes_cat_seo_title_en'])) {
        update_term_meta($term_id, 'sasanperfumes_cat_seo_title_en', sanitize_text_field($_POST['sasanperfumes_cat_seo_title_en']));
    }
    if (isset($_POST['sasanperfumes_cat_seo_title_ar'])) {
        update_term_meta($term_id, 'sasanperfumes_cat_seo_title_ar', sanitize_text_field($_POST['sasanperfumes_cat_seo_title_ar']));
    }
    if (isset($_POST['sasanperfumes_cat_seo_desc_en'])) {
        update_term_meta($term_id, 'sasanperfumes_cat_seo_desc_en', sanitize_textarea_field($_POST['sasanperfumes_cat_seo_desc_en']));
    }
    if (isset($_POST['sasanperfumes_cat_seo_desc_ar'])) {
        update_term_meta($term_id, 'sasanperfumes_cat_seo_desc_ar', sanitize_textarea_field($_POST['sasanperfumes_cat_seo_desc_ar']));
    }
}

/**
 * Register REST API routes
 */
function sasanperfumes_category_seo_register_routes() {
    // Get SEO content for a single category by slug
    sasanperfumes_register_rest_route( '/category-seo/(?P<slug>[a-zA-Z0-9_-]+)', array(
        'methods'  => 'GET',
        'callback' => 'sasanperfumes_get_category_seo',
        'permission_callback' => '__return_true',
        'args' => array(
            'slug' => array(
                'required' => true,
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ));

    // Get category subtitle
    sasanperfumes_register_rest_route( '/category-subtitle/(?P<slug>[a-zA-Z0-9_-]+)', array(
        'methods'  => 'GET',
        'callback' => 'sasanperfumes_get_category_subtitle',
        'permission_callback' => '__return_true',
        'args' => array(
            'slug' => array(
                'required' => true,
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ));

    // Get SEO content for all categories
    sasanperfumes_register_rest_route( '/category-seo', array(
        'methods'  => 'GET',
        'callback' => 'sasanperfumes_get_all_category_seo',
        'permission_callback' => '__return_true',
    ));
}

/**
 * REST callback: Get subtitle for a single category
 */
function sasanperfumes_get_category_subtitle($request) {
    $slug = $request['slug'];
    $term = get_term_by('slug', $slug, 'product_cat');

    if (!$term) {
        return new WP_REST_Response(array(
            'subtitle' => array('en' => '', 'ar' => ''),
        ), 200);
    }

    return new WP_REST_Response(array(
        'slug' => $slug,
        'subtitle' => array(
            'en' => get_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_en', true) ?: '',
            'ar' => get_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_ar', true) ?: '',
        ),
    ), 200);
}

/**
 * REST callback: Get SEO content for a single category
 */
function sasanperfumes_get_category_seo($request) {
    $slug = $request['slug'];
    $term = get_term_by('slug', $slug, 'product_cat');

    if (!$term) {
        return new WP_REST_Response(array(
            'title' => array('en' => '', 'ar' => ''),
            'description' => array('en' => '', 'ar' => ''),
        ), 200);
    }

    return new WP_REST_Response(array(
        'slug' => $slug,
        'subtitle' => array(
            'en' => get_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_en', true) ?: '',
            'ar' => get_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_ar', true) ?: '',
        ),
        'title' => array(
            'en' => get_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_en', true) ?: '',
            'ar' => get_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_ar', true) ?: '',
        ),
        'description' => array(
            'en' => get_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_en', true) ?: '',
            'ar' => get_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_ar', true) ?: '',
        ),
    ), 200);
}

/**
 * REST callback: Get SEO content for all categories
 */
function sasanperfumes_get_all_category_seo() {
    $terms = get_terms(array(
        'taxonomy'   => 'product_cat',
        'hide_empty' => false,
    ));

    if (is_wp_error($terms)) {
        return new WP_REST_Response(array(), 200);
    }

    $result = array();
    foreach ($terms as $term) {
        $title_en = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_en', true);
        $title_ar = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_ar', true);
        $desc_en  = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_en', true);
        $desc_ar  = get_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_ar', true);

        // Only include categories that have at least some SEO content set
        if (!empty($title_en) || !empty($title_ar) || !empty($desc_en) || !empty($desc_ar)) {
            $result[$term->slug] = array(
                'title' => array(
                    'en' => $title_en ?: '',
                    'ar' => $title_ar ?: '',
                ),
                'description' => array(
                    'en' => $desc_en ?: '',
                    'ar' => $desc_ar ?: '',
                ),
            );
        }
    }

    return new WP_REST_Response($result, 200);
}

// Initialize
sasanperfumes_category_seo_init();
