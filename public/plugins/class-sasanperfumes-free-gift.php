<?php
/**
 * Sasan Perfumes Free Gift - Free Gift Rules Functionality
 * 
 * Handles admin page, REST API endpoints, and product hiding
 * for the Sasan Perfumes Free Gift feature.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.9.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize Sasan Perfumes Free Gift
 */
function sasanperfumes_free_gift_init() {
    add_action('admin_menu', 'sasanperfumes_free_gift_register_menu', 99);
    add_action('admin_enqueue_scripts', 'sasanperfumes_free_gift_enqueue_scripts');
    add_action('rest_api_init', 'sasanperfumes_free_gift_register_rest_routes');
    add_action('woocommerce_product_query', 'sasanperfumes_free_gift_hide_from_shop');
    add_filter('woocommerce_rest_product_object_query', 'sasanperfumes_free_gift_hide_from_rest_api', 10, 2);
    add_filter('woocommerce_product_search_results', 'sasanperfumes_free_gift_hide_from_search');
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
 * Get products list separated by language using WPML API
 */
function sasanperfumes_free_gifts_get_products_by_language() {
    $products_en = array();
    $products_ar = array();
    
    // Check if WPML is active
    $wpml_active = function_exists('icl_object_id') || defined('ICL_SITEPRESS_VERSION');
    
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'orderby' => 'title',
        'order' => 'ASC',
        'suppress_filters' => true, // Disable WPML filtering to get all products
    );
    
    if ($wpml_active) {
        // Store current language
        $current_lang = apply_filters('wpml_current_language', null);
        
        // Switch to English and get products
        do_action('wpml_switch_language', 'en');
        $query_en = new WP_Query($args);
        if ($query_en->have_posts()) {
            while ($query_en->have_posts()) {
                $query_en->the_post();
                $products_en[] = array(
                    'id' => get_the_ID(),
                    'name' => get_the_title(),
                );
            }
            wp_reset_postdata();
        }
        
        // Switch to Arabic and get products
        do_action('wpml_switch_language', 'ar');
        $query_ar = new WP_Query($args);
        if ($query_ar->have_posts()) {
            while ($query_ar->have_posts()) {
                $query_ar->the_post();
                $products_ar[] = array(
                    'id' => get_the_ID(),
                    'name' => get_the_title(),
                );
            }
            wp_reset_postdata();
        }
        
        // Restore original language
        do_action('wpml_switch_language', $current_lang);
    }
    
    // If WPML is not active or no products found, get all products for both dropdowns
    if (empty($products_en) && empty($products_ar)) {
        $query = new WP_Query($args);
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $product = array(
                    'id' => get_the_ID(),
                    'name' => get_the_title(),
                );
                $products_en[] = $product;
                $products_ar[] = $product;
            }
            wp_reset_postdata();
        }
    }
    
    return array(
        'en' => $products_en,
        'ar' => $products_ar,
    );
}

/**
 * Render Free Gifts admin page
 */
function sasanperfumes_free_gifts_render_admin_page() {
    if (!current_user_can('manage_woocommerce')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    if (isset($_POST['sasanperfumes_free_gifts_save']) && check_admin_referer('sasanperfumes_free_gifts_nonce')) {
        sasanperfumes_free_gifts_save_rules();
        echo '<div class="notice notice-success is-dismissible"><p>Free gift rules saved successfully!</p></div>';
    }

    if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['rule_id'])) {
        if (check_admin_referer('sasanperfumes_delete_free_gift_' . $_GET['rule_id'])) {
            sasanperfumes_free_gifts_delete_rule(sanitize_text_field($_GET['rule_id']));
            echo '<div class="notice notice-success is-dismissible"><p>Rule deleted successfully!</p></div>';
        }
    }

    $rules = get_option('sasanperfumes_free_gifts_rules', array());
    $products_by_lang = sasanperfumes_free_gifts_get_products_by_language();
    $products_en = $products_by_lang['en'];
    $products_ar = $products_by_lang['ar'];
    $currencies = array('ALL' => 'All Currencies', 'AED' => 'AED', 'SAR' => 'SAR', 'KWD' => 'KWD', 'BHD' => 'BHD', 'OMR' => 'OMR', 'QAR' => 'QAR', 'USD' => 'USD');
    
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
                            <input type="checkbox" name="sasanperfumes_free_gifts_hide_from_shop" value="1" <?php checked(get_option('sasanperfumes_free_gifts_hide_from_shop', false)); ?>>
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
                        <?php sasanperfumes_free_gifts_render_rule_row($index, $rule, $products_en, $products_ar, $currencies); ?>
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
                            <td><label><input type="checkbox" name="sasanperfumes_free_gifts_rules[${ruleIndex}][enabled]" value="1" checked> Active</label></td>
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
                                    <?php foreach ($currencies as $value => $label): ?>
                                    <option value="<?php echo esc_attr($value); ?>"><?php echo esc_html($label); ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">Select "All Currencies" to apply this rule regardless of the customer's selected currency.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Free Gift Products</th>
                            <td>
                                <div style="display:flex;gap:20px;flex-wrap:wrap;">
                                    <div style="flex:1;min-width:300px;">
                                        <label style="display:block;margin-bottom:5px;font-weight:600;">English Product (EN)</label>
                                        <select name="sasanperfumes_free_gifts_rules[${ruleIndex}][product_id]" class="regular-text" style="width:100%;">
                                            <option value="">-- Select EN Product --</option>
                                            <?php foreach ($products_en as $product): ?>
                                            <option value="<?php echo esc_attr($product['id']); ?>"><?php echo esc_html($product['name']); ?> (ID: <?php echo esc_html($product['id']); ?>)</option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                    <div style="flex:1;min-width:300px;">
                                        <label style="display:block;margin-bottom:5px;font-weight:600;">Arabic Product (AR)</label>
                                        <select name="sasanperfumes_free_gifts_rules[${ruleIndex}][product_id_ar]" class="regular-text" style="width:100%;">
                                            <option value="">-- Select AR Product --</option>
                                            <?php foreach ($products_ar as $product): ?>
                                            <option value="<?php echo esc_attr($product['id']); ?>"><?php echo esc_html($product['name']); ?> (ID: <?php echo esc_html($product['id']); ?>)</option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <p class="description" style="margin-top:10px;">Select the English product on the left and its matching Arabic translation on the right.</p>
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
                            <td><input type="text" name="sasanperfumes_free_gifts_rules[${ruleIndex}][message_en]" class="large-text" placeholder="Congratulations! You've unlocked a free gift with your order"></td>
                        </tr>
                        <tr>
                            <th>Message (AR)</th>
                            <td><input type="text" name="sasanperfumes_free_gifts_rules[${ruleIndex}][message_ar]" class="large-text" dir="rtl" placeholder="مبروك! لقد حصلت على هدية مجانية مع طلبك"></td>
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
                updateEmptyState();
            });
            
            $(document).on('click', '.sasanperfumes-remove-rule', function() {
                if (confirm('Are you sure you want to remove this rule?')) {
                    $(this).closest('.sasanperfumes-free-gift-rule').remove();
                    updateEmptyState();
                }
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
function sasanperfumes_free_gifts_render_rule_row($index, $rule, $products_en, $products_ar, $currencies) {
    $enabled = isset($rule['enabled']) ? $rule['enabled'] : true;
    $name = isset($rule['name']) ? $rule['name'] : '';
    $min_cart_value = isset($rule['min_cart_value']) ? $rule['min_cart_value'] : 0;
    $currency = isset($rule['currency']) ? $rule['currency'] : 'AED';
    $product_id = isset($rule['product_id']) ? $rule['product_id'] : '';
    $product_id_ar = isset($rule['product_id_ar']) ? $rule['product_id_ar'] : '';
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
                <td><label><input type="checkbox" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][enabled]" value="1" <?php checked($enabled); ?>> Active</label></td>
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
                        <?php foreach ($currencies as $value => $label): ?>
                        <option value="<?php echo esc_attr($value); ?>" <?php selected($currency, $value); ?>><?php echo esc_html($label); ?></option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description">Select "All Currencies" to apply this rule regardless of the customer's selected currency.</p>
                </td>
            </tr>
            <tr>
                <th>Free Gift Products</th>
                <td>
                    <div style="display:flex;gap:20px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:300px;">
                            <label style="display:block;margin-bottom:5px;font-weight:600;">English Product (EN)</label>
                            <select name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][product_id]" class="regular-text" style="width:100%;">
                                <option value="">-- Select EN Product --</option>
                                <?php foreach ($products_en as $product): ?>
                                <option value="<?php echo esc_attr($product['id']); ?>" <?php selected($product_id, $product['id']); ?>><?php echo esc_html($product['name']); ?> (ID: <?php echo esc_html($product['id']); ?>)</option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div style="flex:1;min-width:300px;">
                            <label style="display:block;margin-bottom:5px;font-weight:600;">Arabic Product (AR)</label>
                            <select name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][product_id_ar]" class="regular-text" style="width:100%;">
                                <option value="">-- Select AR Product --</option>
                                <?php foreach ($products_ar as $product): ?>
                                <option value="<?php echo esc_attr($product['id']); ?>" <?php selected($product_id_ar, $product['id']); ?>><?php echo esc_html($product['name']); ?> (ID: <?php echo esc_html($product['id']); ?>)</option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <p class="description" style="margin-top:10px;">Select the English product on the left and its matching Arabic translation on the right.</p>
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
                <td><input type="text" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][message_en]" value="<?php echo esc_attr($message_en); ?>" class="large-text" placeholder="Congratulations! You've unlocked a free gift with your order"></td>
            </tr>
            <tr>
                <th>Message (AR)</th>
                <td><input type="text" name="sasanperfumes_free_gifts_rules[<?php echo $index; ?>][message_ar]" value="<?php echo esc_attr($message_ar); ?>" class="large-text" dir="rtl" placeholder="مبروك! لقد حصلت على هدية مجانية مع طلبك"></td>
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
            // Skip rules without at least one product selected
            if (empty($rule['product_id']) && empty($rule['product_id_ar'])) continue;
            
            $rules[] = array(
                'id' => isset($rule['id']) ? sanitize_text_field($rule['id']) : wp_generate_uuid4(),
                'enabled' => isset($rule['enabled']) ? true : false,
                'name' => sanitize_text_field($rule['name'] ?? ''),
                'min_cart_value' => floatval($rule['min_cart_value'] ?? 0),
                'currency' => sanitize_text_field($rule['currency'] ?? 'AED'),
                'product_id' => intval($rule['product_id'] ?? 0),
                'product_id_ar' => intval($rule['product_id_ar'] ?? 0),
                'priority' => intval($rule['priority'] ?? 10),
                'message_en' => sanitize_text_field($rule['message_en'] ?? ''),
                'message_ar' => sanitize_text_field($rule['message_ar'] ?? ''),
                'hide_from_shop' => isset($rule['hide_from_shop']) ? true : false,
            );
        }
    }
    
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
 * Register REST API routes
 */
function sasanperfumes_free_gift_register_rest_routes() {
    register_rest_route('sasanperfumes-free-gifts/v1', '/rules', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_free_gifts_api_get_rules',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('sasanperfumes-free-gifts/v1', '/settings', array(
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
    
    $active_rules = array_filter($rules, function($rule) {
        return !empty($rule['enabled']);
    });
    
    if ($currency) {
        $active_rules = array_filter($active_rules, function($rule) use ($currency) {
            // Include rules that match the specific currency OR rules set to "ALL" currencies
            return $rule['currency'] === $currency || $rule['currency'] === 'ALL';
        });
    }
    
    $enriched_rules = array();
    foreach ($active_rules as $rule) {
        // Get EN product data
        if (!empty($rule['product_id'])) {
            $product_en = wc_get_product($rule['product_id']);
            if ($product_en) {
                $rule['product'] = array(
                    'id' => $product_en->get_id(),
                    'name' => $product_en->get_name(),
                    'slug' => $product_en->get_slug(),
                    'price' => $product_en->get_price(),
                    'image' => wp_get_attachment_url($product_en->get_image_id()),
                );
            }
        }
        
        // Get AR product data
        if (!empty($rule['product_id_ar'])) {
            $product_ar = wc_get_product($rule['product_id_ar']);
            if ($product_ar) {
                $rule['product_ar'] = array(
                    'id' => $product_ar->get_id(),
                    'name' => $product_ar->get_name(),
                    'slug' => $product_ar->get_slug(),
                    'price' => $product_ar->get_price(),
                    'image' => wp_get_attachment_url($product_ar->get_image_id()),
                );
            }
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
        'hide_from_shop' => get_option('sasanperfumes_free_gifts_hide_from_shop', false),
    );
}

/**
 * Get array of free gift product IDs (for hiding from shop)
 * Returns both EN and AR product IDs where hide_from_shop is enabled
 */
function sasanperfumes_free_gifts_get_product_ids() {
    $rules = get_option('sasanperfumes_free_gifts_rules', array());
    $product_ids = array();
    
    foreach ($rules as $rule) {
        if (!empty($rule['hide_from_shop'])) {
            if (!empty($rule['product_id'])) {
                $product_ids[] = intval($rule['product_id']);
            }
            if (!empty($rule['product_id_ar'])) {
                $product_ids[] = intval($rule['product_id_ar']);
            }
        }
    }
    
    return array_unique($product_ids);
}

/**
 * Hide free gift products from shop
 */
function sasanperfumes_free_gift_hide_from_shop($query) {
    if (is_admin()) return;
    
    $free_gift_ids = sasanperfumes_free_gifts_get_product_ids();
    if (empty($free_gift_ids)) return;
    
    $query->set('post__not_in', array_merge(
        $query->get('post__not_in') ?: array(),
        $free_gift_ids
    ));
}

/**
 * Hide from WooCommerce Store API (for headless/Next.js frontend)
 */
function sasanperfumes_free_gift_hide_from_rest_api($args, $request) {
    $free_gift_ids = sasanperfumes_free_gifts_get_product_ids();
    if (empty($free_gift_ids)) return $args;
    
    $existing_exclude = isset($args['post__not_in']) ? $args['post__not_in'] : array();
    $args['post__not_in'] = array_merge($existing_exclude, $free_gift_ids);
    
    return $args;
}

/**
 * Hide from search results
 */
function sasanperfumes_free_gift_hide_from_search($product_ids) {
    $free_gift_ids = sasanperfumes_free_gifts_get_product_ids();
    if (empty($free_gift_ids)) return $product_ids;
    
    return array_diff($product_ids, $free_gift_ids);
}

sasanperfumes_free_gift_init();
