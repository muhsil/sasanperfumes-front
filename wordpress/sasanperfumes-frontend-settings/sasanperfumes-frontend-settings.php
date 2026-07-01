<?php
/**
 * Plugin Name: sasanperfumes
 * Plugin URI: https://cms.sasanperfumes.com
 * Description: Admin dashboard and REST API endpoints for sasanperfumes with Media Library upload, dynamic slides, layout options, Bundles Creator, and Free Gift functionality.
 * Version: 6.6.10
 * Author: ShapeHive
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;

// Prevent duplicate loading
if (defined('sasanperfumes_FRONTEND_SETTINGS_LOADED')) {
    add_action('admin_notices', function() {
        echo '<div class="notice notice-error"><p><strong>sasanperfumes:</strong> Duplicate plugin detected!</p></div>';
    });
    return;
}
define('sasanperfumes_FRONTEND_SETTINGS_LOADED', true);
define('sasanperfumes_SETTINGS_VERSION', '6.6.10');
define('sasanperfumes_SETTINGS_PATH', plugin_dir_path(__FILE__));

define('SASANPERFUMES_REST_NAMESPACE', 'sasanperfumes/v1');
define('SASANPERFUMES_BUNDLES_REST_NAMESPACE', 'sasanperfumes-bundles/v1');
define('SASANPERFUMES_FREE_GIFTS_REST_NAMESPACE', 'sasanperfumes-free-gifts/v1');

function sasanperfumes_order_number_meta_value($order) {
    if (!$order || !is_a($order, 'WC_Order')) return '';

    foreach (array('legacy_order_number', 'legacy_order_id', '_sasan_order_number') as $key) {
        $value = trim((string) $order->get_meta($key, true));
        if ($value !== '') {
            return $value;
        }
    }

    return '';
}

function sasanperfumes_find_highest_order_number() {
    if (!function_exists('wc_get_orders')) return 0;

    $highest = 0;
    $page = 1;

    do {
        $order_ids = wc_get_orders(array(
            'limit' => 200,
            'paged' => $page,
            'return' => 'ids',
            'status' => array_keys(wc_get_order_statuses()),
            'orderby' => 'date',
            'order' => 'DESC',
        ));

        foreach ((array) $order_ids as $order_id) {
            $order = wc_get_order($order_id);
            if (!$order) continue;

            foreach (array('legacy_order_number', 'legacy_order_id', '_sasan_order_number') as $key) {
                $value = trim((string) $order->get_meta($key, true));
                if (preg_match('/^\d+$/', $value)) {
                    $highest = max($highest, (int) $value);
                }
            }
        }

        $page++;
    } while (is_array($order_ids) && count($order_ids) === 200);

    return $highest;
}

function sasanperfumes_next_order_number() {
    $next = absint(get_option('sasanperfumes_next_order_number', 0));

    if ($next < 1) {
        $next = sasanperfumes_find_highest_order_number() + 1;
    }

    update_option('sasanperfumes_next_order_number', $next + 1, false);

    return $next;
}

function sasanperfumes_assign_order_number($order) {
    if (!$order || !is_a($order, 'WC_Order')) {
        $order = wc_get_order(absint($order));
    }

    if (!$order || !is_a($order, 'WC_Order')) return;
    if (sasanperfumes_order_number_meta_value($order) !== '') return;

    $order->update_meta_data('_sasan_order_number', (string) sasanperfumes_next_order_number());
    $order->save();
}

add_action('woocommerce_checkout_order_created', 'sasanperfumes_assign_order_number', 20);
add_action('woocommerce_store_api_checkout_order_processed', 'sasanperfumes_assign_order_number', 20);
add_action('woocommerce_new_order', 'sasanperfumes_assign_order_number', 20, 2);

add_filter('woocommerce_order_number', function($order_number, $order) {
    $custom_order_number = sasanperfumes_order_number_meta_value($order);
    return $custom_order_number !== '' ? $custom_order_number : $order_number;
}, 20, 2);

function sasanperfumes_register_rest_route($route, $args = array(), $override = false) {
    register_rest_route(SASANPERFUMES_REST_NAMESPACE, $route, $args, $override);
}

function sasanperfumes_register_bundles_rest_route($route, $args = array(), $override = false) {
    register_rest_route(SASANPERFUMES_BUNDLES_REST_NAMESPACE, $route, $args, $override);
}

function sasanperfumes_register_free_gifts_rest_route($route, $args = array(), $override = false) {
    register_rest_route(SASANPERFUMES_FREE_GIFTS_REST_NAMESPACE, $route, $args, $override);
}

function sasanperfumes_add_customer_to_current_site(int $user_id): void {
    if ($user_id <= 0) {
        return;
    }

    $blog_id = get_current_blog_id();
    if (is_multisite() && $blog_id > 0 && function_exists('add_user_to_blog') && !is_user_member_of_blog($user_id, $blog_id)) {
        add_user_to_blog($blog_id, $user_id, 'customer');
        return;
    }

    $user = get_userdata($user_id);
    if ($user instanceof WP_User && !in_array('customer', (array) $user->roles, true)) {
        $user->add_role('customer');
    }
}

function sasanperfumes_apply_customer_request_fields(WC_Customer $customer, array $payload): void {
    $first_name = isset($payload['first_name']) ? wc_clean((string) $payload['first_name']) : '';
    $last_name  = isset($payload['last_name']) ? wc_clean((string) $payload['last_name']) : '';

    if ($first_name !== '') {
        $customer->set_first_name($first_name);
    }

    if ($last_name !== '') {
        $customer->set_last_name($last_name);
    }

    $billing = isset($payload['billing']) && is_array($payload['billing']) ? $payload['billing'] : array();
    foreach (array('first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'email', 'phone') as $field) {
        if (!array_key_exists($field, $billing)) {
            continue;
        }

        $setter = 'set_billing_' . $field;
        if (is_callable(array($customer, $setter))) {
            $customer->{$setter}(wc_clean((string) $billing[$field]));
        }
    }

    $shipping = isset($payload['shipping']) && is_array($payload['shipping']) ? $payload['shipping'] : array();
    foreach (array('first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'phone') as $field) {
        if (!array_key_exists($field, $shipping)) {
            continue;
        }

        $setter = 'set_shipping_' . $field;
        if (is_callable(array($customer, $setter))) {
            $customer->{$setter}(wc_clean((string) $shipping[$field]));
        }
    }

    $meta_data = isset($payload['meta_data']) && is_array($payload['meta_data']) ? $payload['meta_data'] : array();
    foreach ($meta_data as $meta) {
        if (!is_array($meta) || empty($meta['key'])) {
            continue;
        }

        $meta_key = sanitize_text_field((string) $meta['key']);
        if ($meta_key === '') {
            continue;
        }

        $customer->update_meta_data($meta_key, isset($meta['value']) ? wp_unslash($meta['value']) : '');
    }
}

function sasanperfumes_prepare_customer_response(int $user_id): array {
    $customer = new WC_Customer($user_id);

    return array(
        'id'         => $customer->get_id(),
        'email'      => $customer->get_email(),
        'first_name' => $customer->get_first_name(),
        'last_name'  => $customer->get_last_name(),
        'username'   => $customer->get_username(),
        'billing'    => array(
            'first_name' => $customer->get_billing_first_name(),
            'last_name'  => $customer->get_billing_last_name(),
            'company'    => $customer->get_billing_company(),
            'address_1'  => $customer->get_billing_address_1(),
            'address_2'  => $customer->get_billing_address_2(),
            'city'       => $customer->get_billing_city(),
            'state'      => $customer->get_billing_state(),
            'postcode'   => $customer->get_billing_postcode(),
            'country'    => $customer->get_billing_country(),
            'email'      => $customer->get_billing_email(),
            'phone'      => $customer->get_billing_phone(),
        ),
        'shipping'   => array(
            'first_name' => $customer->get_shipping_first_name(),
            'last_name'  => $customer->get_shipping_last_name(),
            'company'    => $customer->get_shipping_company(),
            'address_1'  => $customer->get_shipping_address_1(),
            'address_2'  => $customer->get_shipping_address_2(),
            'city'       => $customer->get_shipping_city(),
            'state'      => $customer->get_shipping_state(),
            'postcode'   => $customer->get_shipping_postcode(),
            'country'    => $customer->get_shipping_country(),
            'phone'      => $customer->get_shipping_phone(),
        ),
    );
}

function sasanperfumes_handle_site_customer_access(WP_REST_Request $request) {
    if (!class_exists('WC_Customer')) {
        return new WP_Error(
            'sasanperfumes_wc_unavailable',
            'WooCommerce customer support is not available.',
            array('status' => 503)
        );
    }

    $payload = $request->get_json_params();
    $payload = is_array($payload) ? $payload : array();

    $email       = sanitize_email((string) ($payload['email'] ?? ''));
    $password    = (string) ($payload['password'] ?? '');
    $username    = trim((string) ($payload['username'] ?? ''));
    $attach_only = !empty($payload['attach_only']);

    if (!is_email($email)) {
        return new WP_Error(
            'invalid_email',
            'Please provide a valid email address.',
            array('status' => 400)
        );
    }

    if ($password === '') {
        return new WP_Error(
            'missing_password',
            'Password is required.',
            array('status' => 400)
        );
    }

    try {
        $existing_user = get_user_by('email', $email);

        if ($existing_user instanceof WP_User) {
            if (!wp_check_password($password, $existing_user->user_pass, $existing_user->ID)) {
                return new WP_Error(
                    'sasanperfumes_existing_account_password_mismatch',
                    'This email already exists on another Sasan site. Use the same password to sign in here, or use a different email for a fully separate account.',
                    array('status' => 409)
                );
            }

            sasanperfumes_add_customer_to_current_site((int) $existing_user->ID);

            $customer = new WC_Customer((int) $existing_user->ID);
            sasanperfumes_apply_customer_request_fields($customer, $payload);
            $customer->save();

            return rest_ensure_response(sasanperfumes_prepare_customer_response((int) $existing_user->ID));
        }

        if ($attach_only) {
            return new WP_Error(
                'sasanperfumes_account_not_found',
                'No existing account was found for this email.',
                array('status' => 404)
            );
        }

        if (strlen($password) < 6) {
            return new WP_Error(
                'invalid_password',
                'Password must be at least 6 characters.',
                array('status' => 400)
            );
        }

        $customer = new WC_Customer();
        $customer->set_email($email);
        $customer->set_username($username !== '' ? $username : $email);
        $customer->set_password($password);
        sasanperfumes_apply_customer_request_fields($customer, $payload);
        $customer->save();

        $customer_id = (int) $customer->get_id();
        if ($customer_id <= 0) {
            return new WP_Error(
                'woocommerce_rest_cannot_create',
                'This customer could not be created.',
                array('status' => 400)
            );
        }

        sasanperfumes_add_customer_to_current_site($customer_id);

        return rest_ensure_response(sasanperfumes_prepare_customer_response($customer_id));
    } catch (Exception $exception) {
        return new WP_Error(
            method_exists($exception, 'getErrorCode') ? $exception->getErrorCode() : 'sasanperfumes_customer_access_error',
            $exception->getMessage(),
            array('status' => (int) $exception->getCode() ?: 500)
        );
    }
}

function sasanperfumes_handle_customer_email_check(WP_REST_Request $request) {
    $email = sanitize_email((string) $request->get_param('email'));

    if (!is_email($email)) {
        return new WP_Error(
            'invalid_email',
            'Please provide a valid email address.',
            array('status' => 400)
        );
    }

    $user_id = (int) email_exists($email);
    $is_current_site_customer = false;

    if ($user_id > 0) {
        $blog_id = get_current_blog_id();
        $is_current_site_customer = is_multisite()
            ? is_user_member_of_blog($user_id, $blog_id)
            : true;
    }

    return rest_ensure_response(array(
        'isRegistered'          => $user_id > 0,
        'is_registered'         => $user_id > 0,
        'isCurrentSiteCustomer' => $is_current_site_customer,
        'is_current_site_customer' => $is_current_site_customer,
    ));
}

function sasanperfumes_register_customer_access_routes() {
    sasanperfumes_register_rest_route('/customers/ensure', array(
        'methods'             => 'POST',
        'callback'            => 'sasanperfumes_handle_site_customer_access',
        'permission_callback' => '__return_true',
    ));

    sasanperfumes_register_rest_route('/customers/check-email', array(
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_handle_customer_email_check',
        'permission_callback' => '__return_true',
    ));
}

add_action('rest_api_init', 'sasanperfumes_register_customer_access_routes');

/**
 * Disable the block editor for plugin-owned CPTs that use metaboxes.
 * The block editor (Gutenberg) crashes on this WP install (moment.js not loading),
 * hiding all metaboxes including image upload buttons. The classic editor works fine.
 */
add_filter('use_block_editor_for_post_type', function ($use_block, $post_type) {
    $classic_only = ['sasanperfumes_service', 'sasanperfumes_product_page', 'sasanperfumes_guide', 'sasanperfumes_size_guide', 'sasanperfumes_note'];
    return in_array($post_type, $classic_only, true) ? false : $use_block;
}, 10, 2);

/**
 * Hide legacy ASL/Aromatic settings menus when the old plugin is still active.
 * The old plugin can remain installed for data compatibility, but its duplicate
 * admin pages should not compete with sasanperfumes.
 */
function sasanperfumes_hide_legacy_asl_admin_menus() {
    global $menu, $submenu;

    $legacy_needles = array(
        'asl settings',
        'asl-settings',
        'asl_settings',
        implode(' ', array('aromatic', 'scents', 'lab')),
        implode(' ', array('aromatics', 'scents', 'lab')),
        'aromatic-settings',
        'aromatics-settings',
        implode(' ', array('emirates', 'pride', 'settings')),
    );

    foreach ((array) $menu as $item) {
        $title = isset($item[0]) ? strtolower(wp_strip_all_tags((string) $item[0])) : '';
        $slug  = isset($item[2]) ? (string) $item[2] : '';

        foreach ($legacy_needles as $needle) {
            if (($title && strpos($title, $needle) !== false) || ($slug && strpos(strtolower($slug), $needle) !== false)) {
                remove_menu_page($slug);
                break;
            }
        }
    }

    foreach ((array) $submenu as $parent_slug => $items) {
        foreach ((array) $items as $item) {
            $title = isset($item[0]) ? strtolower(wp_strip_all_tags((string) $item[0])) : '';
            $slug  = isset($item[2]) ? (string) $item[2] : '';

            foreach ($legacy_needles as $needle) {
                if (($title && strpos($title, $needle) !== false) || ($slug && strpos(strtolower($slug), $needle) !== false)) {
                    remove_submenu_page($parent_slug, $slug);
                    break;
                }
            }
        }
    }
}
add_action('admin_menu', 'sasanperfumes_hide_legacy_asl_admin_menus', 999);

/**
 * Sanitize link URL (allows relative paths starting with /)
 * Wrapped in function_exists check since class-sasanperfumes-settings.php may define it too
 */
if (!function_exists('sasanperfumes_sanitize_link')) {
    function sasanperfumes_sanitize_link($url) {
        if (empty($url)) return '';
        if (strpos($url, '/') === 0) return sanitize_text_field($url);
        return esc_url_raw($url);
    }
}

/**
 * Enqueue admin scripts and media library.
 *
 * The hosting server rate-limits JS file requests (HTTP 429), which can cause
 * admin.js to return an empty body. To guarantee the script loads, we:
 * 1. Register admin.js normally (works when the server isn't rate-limiting).
 * 2. Read admin.js from disk and inject it as an inline script fallback
 *    that only runs when the external file failed to execute.
 */
add_action('admin_enqueue_scripts', function($hook) {
    $is_sasanperfumes = strpos($hook, 'sasanperfumes-settings') !== false || strpos($hook, 'sasanperfumes-') !== false;
    $is_cpt = in_array(get_post_type(), ['sasanperfumes_service','sasanperfumes_guide','sasanperfumes_product_page','sasanperfumes_note','sasanperfumes_size_guide','page']);
    $is_media_tax = in_array($hook, ['term.php', 'edit-tags.php'], true)
        && isset($_GET['taxonomy'])
        && in_array($_GET['taxonomy'], ['product_brand', 'product_cat'], true);
    if (!$is_sasanperfumes && !$is_cpt && !$is_media_tax) return;
    wp_enqueue_media();
    wp_enqueue_script('jquery-ui-sortable');
    wp_enqueue_script('sasanperfumes-admin', plugins_url('admin.js', __FILE__), array('jquery', 'jquery-ui-sortable'), sasanperfumes_SETTINGS_VERSION, true);
    wp_localize_script('sasanperfumes-admin', 'sasanperfumesAdmin', [
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('sasanperfumes_product_search'),
    ]);

    // Inline fallback: inject admin.js source directly so it still works
    // when the external file gets HTTP 429'd by the hosting server.
    $admin_js_path = sasanperfumes_SETTINGS_PATH . 'admin.js';
    if (file_exists($admin_js_path)) {
        $src = file_get_contents($admin_js_path);
        if ($src) {
            // Guard: only run if the external script didn't execute
            // (the external admin.js sets window.__sasanperfumesAdminLoaded = true at the end).
            wp_add_inline_script('sasanperfumes-admin',
                'if(!window.__sasanperfumesAdminLoaded){' . "\n" . $src . "\n" . 'window.__sasanperfumesAdminLoaded=true;}',
                'after'
            );
        }
    }
});

/**
 * Ensure Backbone.js is available for wp.media on plugin CPT/taxonomy pages.
 * The hosting server sometimes rate-limits individual JS requests (HTTP 429),
 * causing backbone.min.js to fail to load and breaking the media library.
 * This inlines the Backbone source directly after underscore.js so it
 * loads synchronously without a separate HTTP request.
 */
add_action('admin_enqueue_scripts', function() {
    $screen = get_current_screen();
    if (!$screen) return;
    $needs_media = in_array($screen->post_type, ['sasanperfumes_service','sasanperfumes_guide','sasanperfumes_product_page','sasanperfumes_note','sasanperfumes_size_guide','page'], true)
        || (isset($screen->id) && strpos($screen->id, 'sasanperfumes-') !== false)
        || in_array($screen->taxonomy, ['product_brand', 'product_cat'], true);
    if (!$needs_media) return;

    $backbone_path = ABSPATH . WPINC . '/js/backbone.min.js';
    if (file_exists($backbone_path)) {
        $src = file_get_contents($backbone_path);
        if ($src) {
            wp_add_inline_script('underscore', 'if(typeof Backbone==="undefined"){' . "\n" . $src . "\n" . '}', 'after');
        }
    }
}, 5);

/**
 * WooCommerce only saves product category thumbnails after WordPress successfully
 * updates the term. Some imported/WPML terms can fail the core term update while
 * still having valid image form data, so persist the thumbnail before core handles
 * the category update.
 */
add_action('admin_init', function() {
    if (!is_admin()) return;
    if (($_POST['action'] ?? '') !== 'editedtag') return;
    if (($_POST['taxonomy'] ?? '') !== 'product_cat') return;
    if (!current_user_can('manage_product_terms')) return;
    if (!isset($_POST['_wpnonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['_wpnonce'])), 'update-tag_' . absint($_POST['tag_ID'] ?? 0))) return;
    if (!isset($_POST['tag_ID'], $_POST['product_cat_thumbnail_id'])) return;

    update_term_meta(
        absint($_POST['tag_ID']),
        'thumbnail_id',
        absint($_POST['product_cat_thumbnail_id'])
    );
}, 1);

/**
 * Give a better hint when WordPress falls back to the generic
 * "Category not updated" notice for imported product categories.
 */
add_action('admin_notices', function() {
    if (!is_admin()) return;
    if (($_GET['taxonomy'] ?? '') !== 'product_cat') return;
    if (($_GET['message'] ?? '') !== '5') return;

    $term_id = absint($_GET['tag_ID'] ?? 0);
    if (!$term_id) return;

    $term = get_term($term_id, 'product_cat');
    if (!$term || is_wp_error($term)) return;

    $same_slug = get_terms(array(
        'taxonomy'   => 'product_cat',
        'hide_empty' => false,
        'slug'       => $term->slug,
        'exclude'    => array($term_id),
        'fields'     => 'ids',
    ));

    if (is_wp_error($same_slug) || empty($same_slug)) return;

    echo '<div class="notice notice-warning"><p><strong>Product category update conflict:</strong> another product category is using the slug <code>' . esc_html($term->slug) . '</code>. Change one slug, or update this category from the WPML category translation table.</p></div>';
});

/**
 * AJAX: Search WooCommerce products (for product selector)
 */
/** Format a WC product for JSON response */
function sasanperfumes_format_wc_product($product) {
    $id  = $product->get_id();
    $img = wp_get_attachment_image_url($product->get_image_id(), 'thumbnail') ?: '';
    $cats = wp_get_post_terms($id, 'product_cat', ['fields' => 'names']);
    return [
        'id'       => $id,
        'slug'     => $product->get_slug(),
        'name'     => $product->get_name(),
        'price'    => strip_tags(wc_price($product->get_price())),
        'sku'      => $product->get_sku(),
        'image'    => $img,
        'stock'    => $product->get_stock_status(),
        'category' => is_array($cats) && !is_wp_error($cats) ? implode(', ', $cats) : '',
    ];
}

add_action('wp_ajax_sasanperfumes_search_products', function() {
    check_ajax_referer('sasanperfumes_product_search', 'nonce');
    $q = sanitize_text_field($_GET['q'] ?? '');
    if (strlen($q) < 2) { wp_send_json_success([]); }

    // Search by title
    $posts = get_posts(['post_type'=>'product','post_status'=>'publish','posts_per_page'=>20,'s'=>$q]);

    // Also search by slug (for page-load preview)
    $slug_posts = get_posts(['post_type'=>'product','post_status'=>'publish','posts_per_page'=>5,'name'=>$q]);
    $seen = array_map(function($p){ return $p->ID; }, $posts);
    foreach ($slug_posts as $sp) {
        if (!in_array($sp->ID, $seen)) { $posts[] = $sp; }
    }

    $results = [];
    foreach ($posts as $p) {
        $product = wc_get_product($p->ID);
        if ($product) { $results[] = sasanperfumes_format_wc_product($product); }
    }
    wp_send_json_success($results);
});

/**
 * Include separate module files
 * 
 * The plugin is organized into modules:
 * 1. Settings - Core settings for homepage hero/products, header, SEO, mobile
 * 2. Bundle Builder - Product bundle creation and management
 * 3. Free Gift - Automatic free gift rules based on cart value
 * 4. Forms - Contact form and newsletter REST API endpoints
 * 5. Product Pages - Dynamic product-type page creation with bilingual support
 * 6. Category SEO - Per-category SEO content fields (EN/AR)
 * 7. Guide Pages - Dynamic guide/article CPT with bilingual support
 * 8. Field Helpers - Shared reusable field components
 * 9. Page Fields - Metaboxes on native WP Pages (replaces static-pages + home-sections)
 * 10. Notes CPT - Fragrance notes as CPT (replaces notes-seo submenu)
 */

// Include Settings module (homepage, header, SEO, mobile settings)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-settings.php';

// Multisite helpers used across classes for backend/frontend URL resolution.
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-multisite.php';

// Include Home Sections module (Our Story, Why Choose Us, FAQ, SEO Content)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-home-sections.php';

// Include Bundle Builder module (REST API, metabox, CoCart integration)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-bundle-builder.php';

// Include Free Gift module (admin page, REST API, product hiding)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-free-gift.php';

// Include Forms module (contact form and newsletter REST API)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-forms.php';

// Include Frontend URLs module (rewrite admin URLs to headless frontend)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-frontend-urls.php';

// Include Email Templates module (custom WooCommerce email templates)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-email-templates.php';

// Security module skipped - standalone sasanperfumes-security plugin provides same functionality

// Include Customer Tracking module (order tracking data display in admin)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-customer-tracking.php';

// Include Product Pages module (dynamic product-type pages with EN/AR support)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-product-pages.php';

// Include Category SEO module (per-category SEO content fields EN/AR)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-category-seo.php';

// Include Guide Pages module (dynamic guide/article CPT with bilingual support)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-guide-pages.php';

// Include Field Helpers (shared reusable field components)
require_once sasanperfumes_SETTINGS_PATH . 'includes/sasanperfumes-field-helpers.php';

// Include Page Fields module (metaboxes on native WP Pages: About, Contact, FAQ, etc. + Home sections)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-page-fields.php';

// Include Notes CPT module (fragrance notes as individual posts, like Guides)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-notes-cpt.php';

// Include Product Meta module (dynamic SEO meta descriptions for products)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-product-meta.php';

// Include Footer Settings module (dynamic footer content with EN/AR support)
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-footer-settings.php';

// ── NEW FEATURE MODULES (v6.6.0) ─────────────────────────────────────────
// Promotions: popup settings, badge tag config, sale date injection
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-promotions.php';

// Stock Alerts: back-in-stock email subscriptions
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-stock-alerts.php';

// Loyalty Points: earn/redeem points, coupon generation
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-loyalty.php';

// Referral Program: customer referral settings, coupons, and REST API
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-referral.php';

// Advanced Settings: live chat, scent guide, gift wrap, video hero, abandoned cart popup
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-advanced-settings.php';

// Size Guide Manager: clothing size guide templates, chart builder, category/product assignment
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-size-guide.php';

// Brands Slider: homepage brand/partner logo carousel
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-brands-slider.php';

// Static Pages: CMS-editable content for About, Contact, FAQ, Shipping, Returns, Privacy, Terms, Store Locator, What We Do
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-static-pages.php';

// Feature Toggles: centralized enable/disable for pages & homepage sections
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-feature-toggles.php';

// Brand Pages: extended brand metadata, perfume notes, brand detail page REST API
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-brand-pages.php';

// Services CPT: service items with features, admin, REST API
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-services.php';

// Private Labeling: landing page settings, enquiry form submissions
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-private-labeling.php';

// WhatsApp Floating Button: CMS-managed number, message, toggles
require_once sasanperfumes_SETTINGS_PATH . 'includes/class-sasanperfumes-whatsapp.php';
