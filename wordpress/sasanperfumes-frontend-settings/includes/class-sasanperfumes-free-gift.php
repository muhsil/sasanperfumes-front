<?php
/**
 * ShapeHive Free Gift - Free Gift Rules Functionality
 * 
 * Handles admin page, REST API endpoints, and product hiding
 * for the ShapeHive Free Gift feature.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.9.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize ShapeHive Free Gift
 */
function sasanperfumes_free_gift_init() {
    // Admin menu
    add_action('admin_menu', 'sasanperfumes_free_gift_register_menu', 99);
    
    // Admin scripts
    add_action('admin_enqueue_scripts', 'sasanperfumes_free_gift_enqueue_scripts');
    
    // REST API endpoints
    add_action('rest_api_init', 'sasanperfumes_free_gift_register_rest_routes');
    
    // Hide free gift products from shop
    add_action('woocommerce_product_query', 'sasanperfumes_free_gift_hide_from_shop');
    add_filter('woocommerce_rest_product_object_query', 'sasanperfumes_free_gift_hide_from_rest_api', 10, 2);
    add_filter('woocommerce_product_search_results', 'sasanperfumes_free_gift_hide_from_search');
    
    // Ensure draft products are excluded from Store API and apply hidden product filters
    // The woocommerce_rest_product_object_query filter only covers WC REST API v3,
    // so we need pre_get_posts to also cover the Store API (/wc/store/v1/products)
    add_action('pre_get_posts', 'sasanperfumes_enforce_published_products_in_rest_api', 99);
}

/**
 * Register admin menu
 */
function sasanperfumes_free_gift_register_menu() {
    add_submenu_page(
        'woocommerce',
        'Free Gifts',
        'Free Gifts',
        'manage_woocommerce',
        'sasanperfumes-free-gifts',
        'sasanperfumes_free_gifts_render_admin_page'
    );
}

/**
 * Enqueue admin scripts
 */
function sasanperfumes_free_gift_enqueue_scripts($hook) {
    if ($hook !== 'woocommerce_page_sasanperfumes-free-gifts') return;
    wp_enqueue_script('jquery');
    wp_enqueue_style('woocommerce_admin_styles');
}

/**
 * Render Free Gifts admin page
 */
function sasanperfumes_free_gifts_render_admin_page() {
    if (!current_user_can('manage_woocommerce')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    // Handle form submission
    if (isset($_POST['sasanperfumes_free_gifts_save']) && check_admin_referer('sasanperfumes_free_gifts_nonce')) {
        sasanperfumes_free_gifts_save_rules();
        echo '<div class="notice notice-success is-dismissible"><p>Free gift rules saved successfully!</p></div>';
    }

    // Handle delete action
    if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['rule_id'])) {
        if (check_admin_referer('sasanperfumes_delete_free_gift_' . $_GET['rule_id'])) {
            sasanperfumes_free_gifts_delete_rule(sanitize_text_field($_GET['rule_id']));
            echo '<div class="notice notice-success is-dismissible"><p>Rule deleted successfully!</p></div>';
        }
    }

    $rules = get_option('sasanperfumes_free_gifts_rules', array());
    $products = sasanperfumes_free_gifts_get_products_list();
    $currencies = array('AED', 'SAR', 'KWD', 'BHD', 'OMR', 'QAR', 'USD');
    
    ?>
    <div class="wrap">
        <h1>Free Gift Rules</h1>
        <p>Configure automatic free gifts based on cart value thresholds. When a customer's cart reaches the minimum value, the free gift product will be automatically added to their cart.</p>
        
        <form method="post" id="sasanperfumes-free-gifts-form">
            <?php wp_nonce_field('sasanperfumes_free_gifts_nonce'); ?>
            
            <h2>Global Settings</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">Hide Free Gift Products from Shop</th>
                    <td>
                        <label>
                            <input type="checkbox" name="sasanperfumes_free_gifts_hide_from_shop" value="1" <?php checked(get_option('sasanperfumes_free_gifts_hide_from_shop', true)); ?>>
                            Hide products marked as free gifts from shop listing and search results
                        </label>
                    </td>
                </tr>
            </table>
            
            <h2>Free Gift Rules <button type="button" class="button" id="sasanperfumes-add-free-gift-rule">+ Add New Rule</button></h2>
            
            <div id="sasanperfumes-free-gifts-rules">
                <?php if (empty($rules)): ?>
                    <div class="notice notice-info inline sasanperfumes-free-gifts-empty" style="margin:0 0 20px;padding:12px 16px;">
                        <p><strong>No free gift rules are active.</strong> Click "Add New Rule" to create one. A rule only becomes active after a product is selected and the rules are saved.</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($rules as $index => $rule): ?>
                        <?php sasanperfumes_free_gifts_render_rule_row($index, $rule, $products, $currencies); ?>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <p class="submit">
                <input type="submit" name="sasanperfumes_free_gifts_save" class="button button-primary" value="Save All Rules">
            </p>
        </form>
        
        <script>
        jQuery(document).ready(function($) {
            var ruleIndex = <?php echo empty($rules) ? -1 : count($rules) - 1; ?>;

            function updateEmptyState() {
                $('.sasanperfumes-free-gifts-empty').toggle($('.sasanperfumes-free-gift-rule').length === 0);
            }
            
            $('#sasanperfumes-add-free-gift-rule').on('click', function() {
                ruleIndex++;
                var template = `
                <div class="sasanperfumes-free-gift-rule" style="background:#fff;border:1px solid #ccd0d4;padding:20px;margin-bottom:20px;">
                    <h3>Rule #${ruleIndex + 1} <button type="button" class="button sasanperfumes-remove-rule" style="float:right;color:#a00;">Remove Rule</button></h3>
                    <table class="form-table">
                        <tr>
                            <th>Enabled</th>
                            <td>
                                <label><input type="checkbox" class="sasanperfumes-rule-enabled" name="sasanperfumes_free_gifts_rules[${ruleIndex}][enabled]" value="1" checked> Active</label>
                                <button type="button" class="button sasanperfumes-toggle-rule-status" style="margin-left:10px;">Disable Rule</button>
                                <span class="sasanperfumes-rule-status" style="margin-left:8px;font-weight:600;">Enabled</span>
                                <p class="description">Disabled rules are saved, but they will not add gifts or hide products.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Rule Name</th>
                            <td><input type="text" name="sasanperfumes_free_gifts_rules[${ruleIndex}][name]" class="regular-text" placeholder="e.g., Free Gift for orders over 750 AED"></td>
                        </tr>
                        <tr>
                            <th>Minimum Cart Value</th>
                            <td><input type="number" name="sasanperfumes_free_gifts_rules[${ruleIndex}][min_cart_value]" class="small-text" min="0" step="0.01" value="0"></td>
                        </tr>
                        <tr>
                            <th>Currency</th>
                            <td>
                                <select name="sasanperfumes_free_gifts_rules[${ruleIndex}][currency]">
                                    <?php foreach ($currencies as $curr): ?>
                                    <option value="<?php echo esc_attr($curr); ?>"><?php echo esc_html($curr); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>Free Gift Product</th>
                            <td>
                                <select name="sasanperfumes_free_gifts_rules[${ruleIndex}][product_id]" class="regular-text">
                                    <option value="">-- Select Product --</option>
                                    <?php foreach ($products as $product): ?>
                                    <option value="<?php echo esc_attr($product['id']); ?>"><?php echo esc_html($product['name']); ?> (ID: <?php echo esc_html($product['id']); ?>)</option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>Priority</th>
                            <td>
                                <input type="number" name="sasanperfumes_free_gifts_rules[${ruleIndex}][priority]" class="small-text" min="1" value="10">
                                <p class="description">Lower number = higher priority. If multiple rules match, only the highest priority gift is added.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Message (EN)</th>
                            <td><input type="text" name="sasanperfumes_free_gifts_rules[${ruleIndex}][message_en]" class="large-text" placeholder="Congratulations! You've earned a free gift!"></td>
                        </tr>
                        <tr>
                            <th>Message (AR)</th>
                            <td><input type="text" name="sasanperfumes_free_gifts_rules[${ruleIndex}][message_ar]" class="large-text" dir="rtl" placeholder="تهانينا! لقد حصلت على هدية مجانية!"></td>
                        </tr>
                        <tr>
                            <th>Hide from Shop</th>
                            <td>
                                <label><input type="checkbox" name="sasanperfumes_free_gifts_rules[${ruleIndex}][hide_from_shop]" value="1"> Hide this gift product from shop listing and search results</label>
                                <p class="description">When enabled, this product will not appear in shop listings or search results (applies to both EN and AR).</p>
                            </td>
                        </tr>
                    </table>
                </div>`;
                $('#sasanperfumes-free-gifts-rules').append(template);
                updateRuleStatus($('.sasanperfumes-free-gift-rule').last());
                updateEmptyState();
            });
            
            $(document).on('click', '.sasanperfumes-remove-rule', function() {
                if (confirm('Are you sure you want to remove this rule?')) {
                    $(this).closest('.sasanperfumes-free-gift-rule').remove();
                    updateEmptyState();
                }
            });

            function updateRuleStatus($rule) {
                var $checkbox = $rule.find('.sasanperfumes-rule-enabled');
                var enabled = $checkbox.is(':checked');
                $rule.toggleClass('sasanperfumes-rule-disabled', !enabled);
                $rule.find('.sasanperfumes-rule-status').text(enabled ? 'Enabled' : 'Disabled');
                $rule.find('.sasanperfumes-toggle-rule-status').text(enabled ? 'Disable Rule' : 'Enable Rule');
            }

            $(document).on('change', '.sasanperfumes-rule-enabled', function() {
                updateRuleStatus($(this).closest('.sasanperfumes-free-gift-rule'));
            });

            $(document).on('click', '.sasanperfumes-toggle-rule-status', function() {
                var $rule = $(this).closest('.sasanperfumes-free-gift-rule');
                var $checkbox = $rule.find('.sasanperfumes-rule-enabled');
                $checkbox.prop('checked', !$checkbox.is(':checked')).trigger('change');
            });

            $('.sasanperfumes-free-gift-rule').each(function() {
                updateRuleStatus($(this));
            });

            updateEmptyState();
        });
        </script>
    </div>
    <?php
}

/**
 * Render a single rule row
 */
function sasanperfumes_free_gifts_render_rule_row($index, $rule, $products, $currencies) {
    $enabled = isset($rule['enabled']) ? $rule['enabled'] : true;
    $id = isset($rule['id']) ? $rule['id'] : '';
    $name = isset($rule['name']) ? $rule['name'] : '';
    $min_cart_value = isset($rule['min_cart_value']) ? $rule['min_cart_value'] : 0;
    $currency = isset($rule['currency']) ? $rule['currency'] : 'AED';
    $product_id = isset($rule['product_id']) ? $rule['product_id'] : '';
    $priority = isset($rule['priority']) ? $rule['priority'] : 10;
    $message_en = isset($rule['message_en']) ? $rule['message_en'] : '';
    $message_ar = isset($rule['message_ar']) ? $rule['message_ar'] : '';
    $hide_from_shop = isset($rule['hide_from_shop']) ? $rule['hide_from_shop'] : false;
    ?>
    <div class="sasanperfumes-free-gift-rule" style="background:#fff;border:1px solid #ccd0d4;padding:20px;margin-bottom:20px;">
        <h3>Rule #<?php echo $index + 1; ?> <button type="button" class="button sasanperfumes-remove-rule" style="float:right;color:#a00;">Remove Rule</button></h3>
        <table class="form-table">
            <tr>
                <th>Enabled</th>
                <td>
                    <input type="hidden" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][id]" value="<?php echo esc_attr($id); ?>">
                    <label>
                        <input type="checkbox" class="sasanperfumes-rule-enabled" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][enabled]" value="1" <?php checked($enabled); ?>>
                        Active
                    </label>
                    <button type="button" class="button sasanperfumes-toggle-rule-status" style="margin-left:10px;">Disable Rule</button>
                    <span class="sasanperfumes-rule-status" style="margin-left:8px;font-weight:600;"></span>
                    <p class="description">Disabled rules are saved, but they will not add gifts or hide products.</p>
                </td>
            </tr>
            <tr>
                <th>Rule Name</th>
                <td><input type="text" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][name]" value="<?php echo esc_attr($name); ?>" class="regular-text" placeholder="e.g., Free Gift for orders over 750 AED"></td>
            </tr>
            <tr>
                <th>Minimum Cart Value</th>
                <td><input type="number" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][min_cart_value]" value="<?php echo esc_attr($min_cart_value); ?>" class="small-text" min="0" step="0.01"></td>
            </tr>
            <tr>
                <th>Currency</th>
                <td>
                    <select name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][currency]">
                        <?php foreach ($currencies as $curr): ?>
                        <option value="<?php echo esc_attr($curr); ?>" <?php selected($currency, $curr); ?>><?php echo esc_html($curr); ?></option>
                        <?php endforeach; ?>
                    </select>
                </td>
            </tr>
            <tr>
                <th>Free Gift Product</th>
                <td>
                    <select name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][product_id]" class="regular-text">
                        <option value="">-- Select Product --</option>
                        <?php foreach ($products as $product): ?>
                        <option value="<?php echo esc_attr($product['id']); ?>" <?php selected($product_id, $product['id']); ?>><?php echo esc_html($product['name']); ?> (ID: <?php echo esc_html($product['id']); ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </td>
            </tr>
            <tr>
                <th>Priority</th>
                <td>
                    <input type="number" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][priority]" value="<?php echo esc_attr($priority); ?>" class="small-text" min="1">
                    <p class="description">Lower number = higher priority. If multiple rules match, only the highest priority gift is added.</p>
                </td>
            </tr>
            <tr>
                <th>Message (EN)</th>
                <td><input type="text" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][message_en]" value="<?php echo esc_attr($message_en); ?>" class="large-text" placeholder="Congratulations! You've earned a free gift!"></td>
            </tr>
            <tr>
                <th>Message (AR)</th>
                <td><input type="text" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][message_ar]" value="<?php echo esc_attr($message_ar); ?>" class="large-text" dir="rtl" placeholder="تهانينا! لقد حصلت على هدية مجانية!"></td>
            </tr>
            <tr>
                <th>Hide from Shop</th>
                <td>
                    <label><input type="checkbox" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][hide_from_shop]" value="1" <?php checked($hide_from_shop); ?>> Hide this gift product from shop listing and search results</label>
                    <p class="description">When enabled, this product will not appear in shop listings or search results (applies to both EN and AR).</p>
                </td>
            </tr>
        </table>
    </div>
    <?php
}

/**
 * Save free gift rules
 */
function sasanperfumes_free_gifts_save_rules() {
    $hide_from_shop = isset($_POST['sasanperfumes_free_gifts_hide_from_shop']) ? true : false;
    update_option('sasanperfumes_free_gifts_hide_from_shop', $hide_from_shop);
    
    $rules = array();
    if (isset($_POST['sasanperfumes_free_gifts_rules']) && is_array($_POST['sasanperfumes_free_gifts_rules'])) {
        foreach ($_POST['sasanperfumes_free_gifts_rules'] as $rule) {
            if (empty($rule['product_id'])) continue; // Skip rules without a product
            
            $rules[] = array(
                'id' => isset($rule['id']) ? sanitize_text_field($rule['id']) : wp_generate_uuid4(),
                'enabled' => isset($rule['enabled']) ? true : false,
                'name' => sanitize_text_field($rule['name'] ?? ''),
                'min_cart_value' => floatval($rule['min_cart_value'] ?? 0),
                'currency' => sanitize_text_field($rule['currency'] ?? 'AED'),
                'product_id' => intval($rule['product_id']),
                'priority' => intval($rule['priority'] ?? 10),
                'message_en' => sanitize_text_field($rule['message_en'] ?? ''),
                'message_ar' => sanitize_text_field($rule['message_ar'] ?? ''),
                'hide_from_shop' => isset($rule['hide_from_shop']) ? true : false,
            );
        }
    }
    
    // Sort by priority
    usort($rules, function($a, $b) {
        return $a['priority'] - $b['priority'];
    });
    
    update_option('sasanperfumes_free_gifts_rules', $rules);
}

/**
 * Delete a single rule
 */
function sasanperfumes_free_gifts_delete_rule($rule_id) {
    $rules = get_option('sasanperfumes_free_gifts_rules', array());
    $rules = array_filter($rules, function($rule) use ($rule_id) {
        return $rule['id'] !== $rule_id;
    });
    update_option('sasanperfumes_free_gifts_rules', array_values($rules));
}

/**
 * Get list of products for dropdown
 */
function sasanperfumes_free_gifts_get_products_list() {
    $products = array();
    
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'orderby' => 'title',
        'order' => 'ASC',
    );
    
    $query = new WP_Query($args);
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $products[] = array(
                'id' => get_the_ID(),
                'name' => get_the_title(),
            );
        }
        wp_reset_postdata();
    }
    
    return $products;
}

/**
 * Register REST API routes
 */
function sasanperfumes_free_gift_register_rest_routes() {
    sasanperfumes_register_free_gifts_rest_route( '/rules', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_free_gifts_api_get_rules',
        'permission_callback' => '__return_true',
    ));
    
    sasanperfumes_register_free_gifts_rest_route( '/settings', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_free_gifts_api_get_settings',
        'permission_callback' => '__return_true',
    ));
}

/**
 * API: Get free gift rules
 */
function sasanperfumes_free_gifts_api_get_rules($request) {
    $rules = get_option('sasanperfumes_free_gifts_rules', array());
    $currency = $request->get_param('currency');
    
    // Filter only enabled rules
    $active_rules = array_filter($rules, function($rule) {
        return !empty($rule['enabled']);
    });
    
    // Filter by currency if specified
    if ($currency) {
        $active_rules = array_filter($active_rules, function($rule) use ($currency) {
            return $rule['currency'] === $currency;
        });
    }
    
    // Enrich with product data
    $enriched_rules = array();
    foreach ($active_rules as $rule) {
        $product = wc_get_product($rule['product_id']);
        if ($product) {
            $rule['product'] = array(
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'slug' => $product->get_slug(),
                'price' => $product->get_price(),
                'image' => wp_get_attachment_url($product->get_image_id()),
            );
        }
        $enriched_rules[] = $rule;
    }
    
    return array(
        'success' => true,
        'rules' => array_values($enriched_rules),
    );
}

/**
 * API: Get free gift settings
 */
function sasanperfumes_free_gifts_api_get_settings() {
    return array(
        'success' => true,
        'hide_from_shop' => get_option('sasanperfumes_free_gifts_hide_from_shop', true),
    );
}

/**
 * Get array of free gift product IDs (for hiding from shop)
 * Only returns products where hide_from_shop is enabled for that rule
 */
function sasanperfumes_free_gifts_get_product_ids() {
    $rules = get_option('sasanperfumes_free_gifts_rules', array());
    $product_ids = array();
    
    foreach ($rules as $rule) {
        // Only include products where hide_from_shop is enabled for this rule
        if (!empty($rule['enabled']) && !empty($rule['product_id']) && !empty($rule['hide_from_shop'])) {
            $product_ids[] = intval($rule['product_id']);
        }
    }
    
    return array_unique($product_ids);
}

/**
 * Get array of password-protected product IDs
 * These products should be hidden from shop listings and search results
 */
function sasanperfumes_get_password_protected_product_ids() {
    global $wpdb;
    
    // Query for all products with a non-empty post_password
    $results = $wpdb->get_col(
        $wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} 
             WHERE post_type = %s 
             AND post_status = 'publish' 
             AND post_password != ''",
            'product'
        )
    );
    
    return array_map('intval', $results);
}

/**
 * Get all product IDs that should be hidden from shop
 * Includes both free gift products (with hide_from_shop) and password-protected products
 */
function sasanperfumes_get_hidden_product_ids() {
    $free_gift_ids = sasanperfumes_free_gifts_get_product_ids();
    $password_protected_ids = sasanperfumes_get_password_protected_product_ids();
    
    return array_unique(array_merge($free_gift_ids, $password_protected_ids));
}

/**
 * Hide products from shop (free gifts with hide_from_shop AND password-protected products)
 */
function sasanperfumes_free_gift_hide_from_shop($query) {
    if (is_admin()) return;
    
    $hidden_ids = sasanperfumes_get_hidden_product_ids();
    if (empty($hidden_ids)) return;
    
    $query->set('post__not_in', array_merge(
        $query->get('post__not_in') ?: array(),
        $hidden_ids
    ));
}

/**
 * Hide from WooCommerce Store API (for headless/Next.js frontend)
 * Hides both free gift products (with hide_from_shop) and password-protected products
 */
function sasanperfumes_free_gift_hide_from_rest_api($args, $request) {
    $hidden_ids = sasanperfumes_get_hidden_product_ids();
    if (empty($hidden_ids)) return $args;
    
    $existing_exclude = isset($args['post__not_in']) ? $args['post__not_in'] : array();
    $args['post__not_in'] = array_merge($existing_exclude, $hidden_ids);
    
    return $args;
}

/**
 * Hide from search results
 * Hides both free gift products (with hide_from_shop) and password-protected products
 */
function sasanperfumes_free_gift_hide_from_search($product_ids) {
    $hidden_ids = sasanperfumes_get_hidden_product_ids();
    if (empty($hidden_ids)) return $product_ids;
    
    return array_diff($product_ids, $hidden_ids);
}

/**
 * Ensure only published products are returned in public REST API product queries.
 * 
 * The WooCommerce Store API (/wc/store/v1/products) should only return published
 * products, but WPML or other plugins can inadvertently modify the WP_Query to
 * include draft products. This filter acts as a defensive layer:
 * 
 * 1. Forces post_status='publish' for non-admin REST API product queries
 * 2. Applies hidden product exclusions (free gifts + password-protected) to
 *    Store API queries (the existing woocommerce_rest_product_object_query
 *    filter only covers WC REST API v3)
 */
function sasanperfumes_enforce_published_products_in_rest_api($query) {
    if (is_admin()) return;
    if (!defined('REST_REQUEST') || !REST_REQUEST) return;
    
    $post_type = $query->get('post_type');
    if ($post_type !== 'product' && (!is_array($post_type) || !in_array('product', $post_type))) return;
    
    if (!current_user_can('edit_products')) {
        $query->set('post_status', 'publish');
    }
    
    $hidden_ids = sasanperfumes_get_hidden_product_ids();
    if (!empty($hidden_ids)) {
        $existing_exclude = $query->get('post__not_in') ?: array();
        $query->set('post__not_in', array_merge($existing_exclude, $hidden_ids));
    }
}

// Initialize ShapeHive Free Gift
sasanperfumes_free_gift_init();
