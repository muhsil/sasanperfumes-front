<?php
/**
 * Sasan Perfumes Product Meta - Dynamic Product Meta Description Generation
 *
 * Provides REST API endpoint for auto-generating SEO meta descriptions
 * for WooCommerce products based on product data (name, description,
 * category, attributes, price).
 *
 * Endpoint: GET /sasanperfumes/v1/product-meta/<slug>?lang=en|ar
 *
 * Priority order:
 * 1. Yoast SEO meta description (if content team has manually set one)
 * 2. Auto-generated from product data (name, short_description, category, attributes, price)
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.4.0
 */

if (!defined('ABSPATH')) exit;

// ---------------------------------------------------------------------------
// Inject product_brand terms into WC REST API v3 product responses
// ---------------------------------------------------------------------------
add_filter('woocommerce_rest_prepare_product_object', 'sasanperfumes_inject_brands_into_product_api', 10, 2);

function sasanperfumes_inject_brands_into_product_api($response, $product) {
    $terms = wp_get_post_terms($product->get_id(), 'product_brand');
    $brands = [];
    if (!is_wp_error($terms) && is_array($terms)) {
        foreach ($terms as $term) {
            $brands[] = [
                'id'   => (int) $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
            ];
        }
    }
    $data = $response->get_data();
    $data['brands'] = $brands;
    $response->set_data($data);
    return $response;
}

add_action('rest_api_init', 'sasanperfumes_product_meta_register_routes');

/**
 * Register REST API routes for product meta descriptions
 */
function sasanperfumes_product_meta_register_routes() {
    sasanperfumes_register_rest_route( '/product-meta/(?P<slug>[a-zA-Z0-9_-]+)', array(
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_get_product_meta_description',
        'permission_callback' => '__return_true',
        'args'                => array(
            'slug' => array(
                'required'          => true,
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_title',
            ),
            'lang' => array(
                'required' => false,
                'type'     => 'string',
                'default'  => 'en',
            ),
        ),
    ));
}

/**
 * REST callback: Get product meta description by slug
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function sasanperfumes_get_product_meta_description($request) {
    $slug = sanitize_title($request['slug']);
    $lang = sanitize_text_field($request->get_param('lang') ?: 'en');

    // Switch WPML language if available
    do_action('wpml_switch_language', $lang);

    // Find product by slug
    $posts = get_posts(array(
        'post_type'        => 'product',
        'name'             => $slug,
        'post_status'      => 'publish',
        'posts_per_page'   => 1,
        'suppress_filters' => false,
    ));

    if (empty($posts)) {
        return new WP_REST_Response(array(
            'meta_description' => '',
            'source'           => 'none',
        ), 200);
    }

    $product_id = $posts[0]->ID;
    $product    = wc_get_product($product_id);

    if (!$product) {
        return new WP_REST_Response(array(
            'meta_description' => '',
            'source'           => 'none',
        ), 200);
    }

    // Priority 1: Yoast SEO meta description (manually set by content team)
    $yoast_desc = get_post_meta($product_id, '_yoast_wpseo_metadesc', true);
    if (!empty(trim($yoast_desc))) {
        return new WP_REST_Response(array(
            'meta_description' => $yoast_desc,
            'source'           => 'yoast',
        ), 200);
    }

    // Priority 2: Auto-generate from product data
    $meta_desc = sasanperfumes_auto_generate_product_meta_desc($product, $lang);

    return new WP_REST_Response(array(
        'meta_description' => $meta_desc,
        'source'           => 'auto',
    ), 200);
}

/**
 * Auto-generate a 150-160 character meta description from product data.
 *
 * @param WC_Product $product
 * @param string     $lang  Language code ('en' or 'ar')
 * @return string
 */
function sasanperfumes_auto_generate_product_meta_desc($product, $lang = 'en') {
    $name       = html_entity_decode($product->get_name(), ENT_QUOTES, 'UTF-8');
    $short_desc = wp_strip_all_tags($product->get_short_description());
    $short_desc = html_entity_decode($short_desc, ENT_QUOTES, 'UTF-8');
    $price      = $product->get_price();

    // Get primary category
    $categories       = wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'names'));
    $primary_category = (!empty($categories) && !is_wp_error($categories))
        ? html_entity_decode($categories[0], ENT_QUOTES, 'UTF-8')
        : '';

    // Extract olfactory family and fragrance notes from product attributes
    $olfactory_family = '';
    $fragrance_notes  = array();

    $attributes = $product->get_attributes();
    foreach ($attributes as $attr) {
        if (!$attr->is_taxonomy()) continue;

        $attr_label       = wc_attribute_label($attr->get_name());
        $attr_label_lower = mb_strtolower(html_entity_decode($attr_label, ENT_QUOTES, 'UTF-8'));

        if ($attr_label_lower === 'olfactory family') {
            $terms = wc_get_product_terms($product->get_id(), $attr->get_name(), array('fields' => 'names'));
            if (!empty($terms)) {
                $olfactory_family = html_entity_decode($terms[0], ENT_QUOTES, 'UTF-8');
            }
        }

        if ($attr_label_lower === 'notes') {
            $terms           = wc_get_product_terms($product->get_id(), $attr->get_name(), array('fields' => 'names'));
            $fragrance_notes = array_map(function ($t) {
                return html_entity_decode($t, ENT_QUOTES, 'UTF-8');
            }, array_slice($terms, 0, 3));
        }
    }

    if ($lang === 'ar') {
        return sasanperfumes_build_arabic_product_meta_desc($name, $short_desc, $primary_category, $olfactory_family, $fragrance_notes, $price);
    }

    return sasanperfumes_build_english_product_meta_desc($name, $short_desc, $primary_category, $olfactory_family, $fragrance_notes, $price);
}

/**
 * Build English meta description (150-160 chars target).
 *
 * Format: "{short_desc}. {name} by Sasan Perfumes. Fragrance family: {olfactory}. Notes: {notes}. Price: {price} AED. Free delivery on orders over 500 AED."
 * Truncated at word boundary to max 160 characters.
 */
function sasanperfumes_build_english_product_meta_desc($name, $short_desc, $category, $olfactory, $notes, $price) {
    $brand = 'Sasan Perfumes';

    // Start with short description snippet if available (truncate at ~80 chars)
    $desc_snippet = '';
    if (!empty($short_desc)) {
        if (mb_strlen($short_desc) > 80) {
            $desc_snippet = preg_replace('/\s+\S*$/', '', mb_substr($short_desc, 0, 80));
        } else {
            $desc_snippet = $short_desc;
        }
        $desc_snippet = rtrim($desc_snippet, '.,;:!? ');
    }

    $parts = array();

    if (!empty($desc_snippet)) {
        $parts[] = $desc_snippet . '.';
    }

    $parts[] = "{$name} by {$brand}.";

    if (!empty($olfactory)) {
        $parts[] = "Fragrance family: {$olfactory}.";
    }

    if (!empty($notes)) {
        $parts[] = 'Notes: ' . implode(', ', $notes) . '.';
    }

    if (!empty($price)) {
        $formatted_price = intval($price);
        $parts[] = "Price: {$formatted_price} AED.";
    }

    $parts[] = 'Free delivery on orders over 500 AED.';

    // Combine and truncate to 160 chars at word boundary
    $description = implode(' ', $parts);

    return sasanperfumes_truncate_meta_desc($description, 160);
}

/**
 * Build Arabic meta description (150-160 chars target).
 *
 * Format: "{short_desc}. {name} Ù…Ù† Sasan Perfumes. Ø¹Ø§Ø¦Ù„Ø© Ø§Ù„Ø¹Ø·Ø±: {olfactory}. Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª: {notes}. Ø§Ù„Ø³Ø¹Ø±: {price} Ø¯Ø±Ù‡Ù…. ØªÙˆØµÙŠÙ„ Ù…Ø¬Ø§Ù†ÙŠ Ù„Ù„Ø·Ù„Ø¨Ø§Øª ÙÙˆÙ‚ 500 Ø¯Ø±Ù‡Ù…."
 * Truncated at word boundary to max 160 characters.
 */
function sasanperfumes_build_arabic_product_meta_desc($name, $short_desc, $category, $olfactory, $notes, $price) {
    $brand = 'Sasan Perfumes';

    $desc_snippet = '';
    if (!empty($short_desc)) {
        if (mb_strlen($short_desc) > 80) {
            $desc_snippet = preg_replace('/\s+\S*$/u', '', mb_substr($short_desc, 0, 80));
        } else {
            $desc_snippet = $short_desc;
        }
        $desc_snippet = rtrim($desc_snippet, '.,;:!? ');
    }

    $parts = array();

    if (!empty($desc_snippet)) {
        $parts[] = $desc_snippet . '.';
    }

    $parts[] = "{$name} Ù…Ù† {$brand}.";

    if (!empty($olfactory)) {
        $parts[] = "Ø¹Ø§Ø¦Ù„Ø© Ø§Ù„Ø¹Ø·Ø±: {$olfactory}.";
    }

    if (!empty($notes)) {
        $parts[] = 'Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª: ' . implode('ØŒ ', $notes) . '.';
    }

    if (!empty($price)) {
        $formatted_price = intval($price);
        $parts[] = "Ø§Ù„Ø³Ø¹Ø±: {$formatted_price} Ø¯Ø±Ù‡Ù….";
    }

    $parts[] = 'ØªÙˆØµÙŠÙ„ Ù…Ø¬Ø§Ù†ÙŠ Ù„Ù„Ø·Ù„Ø¨Ø§Øª ÙÙˆÙ‚ 500 Ø¯Ø±Ù‡Ù….';

    $description = implode(' ', $parts);

    return sasanperfumes_truncate_meta_desc($description, 160);
}

/**
 * Truncate a string to max length at a word boundary, appending "..." if truncated.
 *
 * @param string $text
 * @param int    $max_length
 * @return string
 */
function sasanperfumes_truncate_meta_desc($text, $max_length = 160) {
    if (mb_strlen($text) <= $max_length) {
        return $text;
    }

    $truncated = mb_substr($text, 0, $max_length);
    $truncated = preg_replace('/\s+\S*$/u', '', $truncated);

    return $truncated . '...';
}
