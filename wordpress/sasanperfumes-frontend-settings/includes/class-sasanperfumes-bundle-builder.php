<?php
/**
 * ShapeHive Bundle Builder - Bundle Creator Functionality
 * 
 * Handles REST API endpoints, product metabox, and CoCart integration
 * for the ShapeHive Bundle Builder feature.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.9.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize ShapeHive Bundle Builder
 */
function sasanperfumes_bundle_builder_init() {
    // REST API endpoints
    add_action('rest_api_init', 'sasanperfumes_bundle_builder_register_rest_routes');
    
    // Product metabox
    add_action('add_meta_boxes', 'sasanperfumes_bundle_builder_add_metabox');
    add_action('save_post_product', 'sasanperfumes_bundle_builder_save_metabox');
    
    // CoCart integration
    add_filter('woocommerce_add_cart_item_data', 'sasanperfumes_bundle_items_save_to_cart', 10, 3);
    add_filter('woocommerce_get_cart_item_from_session', 'sasanperfumes_bundle_items_get_from_session', 10, 3);
    add_action('woocommerce_before_calculate_totals', 'sasanperfumes_bundle_set_cart_item_price', 20, 1);
    add_filter('cocart_cart_contents', 'sasanperfumes_bundle_items_add_to_cocart_response', 10, 4);
    add_filter('cocart_cart_item', 'sasanperfumes_bundle_items_add_to_cocart_item', 10, 3);
    add_filter('woocommerce_get_item_data', 'sasanperfumes_bundle_items_display_in_cart', 10, 2);
    add_action('woocommerce_checkout_create_order_line_item', 'sasanperfumes_bundle_items_save_to_order', 10, 4);
}

/**
 * Register REST API routes for bundles
 */
function sasanperfumes_bundle_builder_register_rest_routes() {
    // Get bundle config by product slug (for frontend detection)
    sasanperfumes_register_bundles_rest_route( '/config', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_bundles_get_config_by_slug',
        'permission_callback' => '__return_true',
    ));

    // Get all bundles or filter by product_id
    sasanperfumes_register_bundles_rest_route( '/bundles', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_bundles_get_all',
        'permission_callback' => '__return_true',
    ));

    // Get single bundle by ID
    sasanperfumes_register_bundles_rest_route( '/bundles/(?P<id>[a-zA-Z0-9-]+)', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_bundles_get_single',
        'permission_callback' => '__return_true',
    ));

    // Create new bundle
    sasanperfumes_register_bundles_rest_route( '/bundles', array(
        'methods' => 'POST',
        'callback' => 'sasanperfumes_bundles_create',
        'permission_callback' => 'sasanperfumes_bundles_check_permission',
    ));

    // Update bundle
    sasanperfumes_register_bundles_rest_route( '/bundles/(?P<id>[a-zA-Z0-9-]+)', array(
        'methods' => 'PUT',
        'callback' => 'sasanperfumes_bundles_update',
        'permission_callback' => 'sasanperfumes_bundles_check_permission',
    ));

    // Delete bundle
    sasanperfumes_register_bundles_rest_route( '/bundles/(?P<id>[a-zA-Z0-9-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'sasanperfumes_bundles_delete',
        'permission_callback' => 'sasanperfumes_bundles_check_permission',
    ));
    
    // Get all bundle-enabled product slugs (for frontend to identify bundle products)
    sasanperfumes_register_bundles_rest_route( '/enabled-products', array(
        'methods' => 'GET',
        'callback' => 'sasanperfumes_bundles_get_enabled_product_slugs',
        'permission_callback' => '__return_true',
    ));
}

/**
 * Get all bundle-enabled product slugs
 */
function sasanperfumes_bundles_get_enabled_product_slugs() {
    $slugs = array();
    
    // Get all products with bundle enabled
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => '_sasanperfumes_bundle_enabled',
                'value' => 'yes',
                'compare' => '=',
            ),
        ),
    );
    
    $products = get_posts($args);
    
    foreach ($products as $product) {
        $slugs[] = $product->post_name;
    }
    
    return array('slugs' => $slugs);
}

/**
 * Get bundle configuration by product slug
 */
function sasanperfumes_bundles_get_config_by_slug($request) {
    $slug = $request->get_param('slug');
    
    if (empty($slug)) {
        return new WP_Error('missing_slug', 'Product slug is required', array('status' => 400));
    }
    
    // Find product by slug
    $args = array(
        'post_type' => 'product',
        'name' => $slug,
        'posts_per_page' => 1,
    );
    $products = get_posts($args);
    
    if (empty($products)) {
        return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
    }
    
    $product_id = $products[0]->ID;
    
    // Check if bundle is enabled for this product via post meta
    $bundle_enabled = get_post_meta($product_id, '_sasanperfumes_bundle_enabled', true);
    
    if ($bundle_enabled !== 'yes') {
        return null;
    }
    
    // Get bundle configuration from bundles data
    $bundles = get_option('sasanperfumes_bundles_data', array());
    $product_bundle = null;
    
    foreach ($bundles as $bundle) {
        if (isset($bundle['product_id']) && intval($bundle['product_id']) === $product_id && !empty($bundle['is_enabled'])) {
            $product_bundle = $bundle;
            break;
        }
    }
    
    if (!$product_bundle) {
        // Return basic config if bundle is enabled but no detailed config exists
        return array(
            'product_id' => $product_id,
            'enabled' => true,
            'eligible_products' => array(),
            'unique_products' => array(),
            'total_slots' => 5,
            'required_slots' => 3,
        );
    }
    
    // Transform bundle data to config format expected by frontend
    $eligible_products = array();
    $eligible_categories = array();
    
    if (!empty($product_bundle['items'])) {
        foreach ($product_bundle['items'] as $item) {
            if (!empty($item['rule']['products'])) {
                $eligible_products = array_merge($eligible_products, $item['rule']['products']);
            }
            if (!empty($item['rule']['categories'])) {
                $eligible_categories = array_merge($eligible_categories, $item['rule']['categories']);
            }
        }
    }
    
    // Also check for directly stored eligible_products and eligible_categories
    if (!empty($product_bundle['eligible_products'])) {
        $eligible_products = array_merge($eligible_products, $product_bundle['eligible_products']);
    }
    if (!empty($product_bundle['eligible_categories'])) {
        $eligible_categories = array_merge($eligible_categories, $product_bundle['eligible_categories']);
    }
    
    // Get exclude lists
    $exclude_products = isset($product_bundle['exclude_products']) ? $product_bundle['exclude_products'] : array();
    $exclude_categories = isset($product_bundle['exclude_categories']) ? $product_bundle['exclude_categories'] : array();
    
    // Build slots array from items data for per-slot configuration
    $slots = array();
    if (!empty($product_bundle['items'])) {
        foreach ($product_bundle['items'] as $index => $item) {
            $slot = array(
                'id' => isset($item['id']) ? $item['id'] : $index,
                'title' => isset($item['title']) ? $item['title'] : '',
                'is_optional' => !empty($item['display']['is_optional']),
                'is_free' => !empty($item['display']['is_free']),
            );
            
            // Per-slot eligible categories from item rules
            if (!empty($item['rule']['categories'])) {
                $slot['eligible_categories'] = array_values($item['rule']['categories']);
            }
            // Per-slot eligible products from item rules
            if (!empty($item['rule']['products'])) {
                $slot['eligible_products'] = array_values($item['rule']['products']);
            }
            
            // Also check slot_configs for per-slot overrides
            if (!empty($product_bundle['slot_configs'][$index])) {
                $slot_config = $product_bundle['slot_configs'][$index];
                if (!empty($slot_config['label'])) {
                    $slot['title'] = $slot_config['label'];
                }
                if (!empty($slot_config['eligible_categories'])) {
                    $slot['eligible_categories'] = array_values($slot_config['eligible_categories']);
                }
                if (!empty($slot_config['eligible_products'])) {
                    $slot['eligible_products'] = array_values($slot_config['eligible_products']);
                }
            }
            
            $slots[] = $slot;
        }
    }
    
    return array(
        'product_id' => $product_id,
        'bundle_id' => $product_bundle['id'] ?? null,
        'bundle_type' => $product_bundle['bundle_type'] ?? 'custom',
        'eligible_categories' => array_unique($eligible_categories),
        'eligible_products' => array_unique($eligible_products),
        'exclude_categories' => array_values(array_unique($exclude_categories)),
        'exclude_products' => array_values(array_unique($exclude_products)),
        'unique_products' => array(),
        'total_slots' => isset($product_bundle['total_slots']) ? intval($product_bundle['total_slots']) : 5,
        'required_slots' => isset($product_bundle['required_slots']) ? intval($product_bundle['required_slots']) : 3,
        'optional_slots' => isset($product_bundle['optional_slots']) ? intval($product_bundle['optional_slots']) : 2,
        'with_box_price' => isset($product_bundle['with_box_price']) ? floatval($product_bundle['with_box_price']) : 0,
        'pricing_mode' => isset($product_bundle['pricing_mode']) ? $product_bundle['pricing_mode'] : 'sum',
        'fixed_price' => isset($product_bundle['fixed_price']) ? floatval($product_bundle['fixed_price']) : 0,
        'discount_type' => isset($product_bundle['discount_type']) ? $product_bundle['discount_type'] : 'none',
        'discount_value' => isset($product_bundle['discount_value']) ? floatval($product_bundle['discount_value']) : 0,
        'show_individual_prices' => isset($product_bundle['show_individual_prices']) ? $product_bundle['show_individual_prices'] : true,
        'shipping_fee' => $product_bundle['shipping_fee'] ?? 'apply_to_each_bundled_product',
        'enabled' => true,
        'title' => $product_bundle['title'] ?? '',
        'pricing' => $product_bundle['pricing'] ?? null,
        'slots' => $slots,
    );
}

/**
 * Check permission for bundle management
 */
function sasanperfumes_bundles_check_permission() {
    return current_user_can('manage_options') || current_user_can('manage_woocommerce');
}

/**
 * Get all bundles
 */
function sasanperfumes_bundles_get_all($request) {
    $bundles = get_option('sasanperfumes_bundles_data', array());
    $product_id = $request->get_param('product_id');
    
    if ($product_id) {
        $product_id = intval($product_id);
        $filtered = array_filter($bundles, function($bundle) use ($product_id) {
            return isset($bundle['product_id']) && intval($bundle['product_id']) === $product_id;
        });
        return array_values($filtered);
    }
    
    return array_values($bundles);
}

/**
 * Get single bundle by ID
 */
function sasanperfumes_bundles_get_single($request) {
    $id = $request->get_param('id');
    $bundles = get_option('sasanperfumes_bundles_data', array());
    
    if (isset($bundles[$id])) {
        return $bundles[$id];
    }
    
    return new WP_Error('not_found', 'Bundle not found', array('status' => 404));
}

/**
 * Create new bundle
 */
function sasanperfumes_bundles_create($request) {
    $data = $request->get_json_params();
    
    if (empty($data['id'])) {
        $data['id'] = wp_generate_uuid4();
    }
    
    $bundle = sasanperfumes_bundles_sanitize_bundle($data);
    $bundle['created_at'] = $data['created_at'] ?? current_time('c');
    $bundle['updated_at'] = current_time('c');
    
    $bundles = get_option('sasanperfumes_bundles_data', array());
    $bundles[$bundle['id']] = $bundle;
    update_option('sasanperfumes_bundles_data', $bundles);
    
    return $bundle;
}

/**
 * Update bundle
 */
function sasanperfumes_bundles_update($request) {
    $id = $request->get_param('id');
    $data = $request->get_json_params();
    
    $bundles = get_option('sasanperfumes_bundles_data', array());
    
    if (!isset($bundles[$id])) {
        return new WP_Error('not_found', 'Bundle not found', array('status' => 404));
    }
    
    $bundle = sasanperfumes_bundles_sanitize_bundle($data);
    $bundle['id'] = $id;
    $bundle['created_at'] = $bundles[$id]['created_at'] ?? current_time('c');
    $bundle['updated_at'] = current_time('c');
    
    $bundles[$id] = $bundle;
    update_option('sasanperfumes_bundles_data', $bundles);
    
    return $bundle;
}

/**
 * Delete bundle
 */
function sasanperfumes_bundles_delete($request) {
    $id = $request->get_param('id');
    $bundles = get_option('sasanperfumes_bundles_data', array());
    
    if (!isset($bundles[$id])) {
        return new WP_Error('not_found', 'Bundle not found', array('status' => 404));
    }
    
    unset($bundles[$id]);
    update_option('sasanperfumes_bundles_data', $bundles);
    
    return array('success' => true, 'message' => 'Bundle deleted successfully');
}

/**
 * Sanitize bundle data
 */
function sasanperfumes_bundles_sanitize_bundle($data) {
    $bundle = array(
        'id' => sanitize_text_field($data['id'] ?? ''),
        'product_id' => isset($data['product_id']) ? intval($data['product_id']) : null,
        'title' => sanitize_text_field($data['title'] ?? ''),
        'bundle_type' => sanitize_text_field($data['bundle_type'] ?? 'custom'),
        'shipping_fee' => sanitize_text_field($data['shipping_fee'] ?? 'apply_to_each_bundled_product'),
        'is_enabled' => !empty($data['is_enabled']),
        'pricing' => array(
            'mode' => sanitize_text_field($data['pricing']['mode'] ?? 'box_fixed_price'),
            'box_price' => floatval($data['pricing']['box_price'] ?? 0),
            'included_items_count' => intval($data['pricing']['included_items_count'] ?? 3),
            'extra_item_charging_method' => sanitize_text_field($data['pricing']['extra_item_charging_method'] ?? 'cheapest_first'),
            'show_product_prices' => !empty($data['pricing']['show_product_prices']),
        ),
        'items' => array(),
    );
    
    if (!empty($data['items']) && is_array($data['items'])) {
        foreach ($data['items'] as $item) {
            $bundle['items'][] = array(
                'id' => sanitize_text_field($item['id'] ?? ''),
                'title' => sanitize_text_field($item['title'] ?? ''),
                'is_expanded' => !empty($item['is_expanded']),
                'rule' => array(
                    'categories' => array_map('intval', $item['rule']['categories'] ?? array()),
                    'exclude_categories' => array_map('intval', $item['rule']['exclude_categories'] ?? array()),
                    'tags' => array_map('intval', $item['rule']['tags'] ?? array()),
                    'exclude_tags' => array_map('intval', $item['rule']['exclude_tags'] ?? array()),
                    'products' => array_map('intval', $item['rule']['products'] ?? array()),
                    'product_variations' => array_map('intval', $item['rule']['product_variations'] ?? array()),
                    'exclude_products' => array_map('intval', $item['rule']['exclude_products'] ?? array()),
                    'exclude_product_variations' => array_map('intval', $item['rule']['exclude_product_variations'] ?? array()),
                ),
                'display' => array(
                    'custom_title' => sanitize_text_field($item['display']['custom_title'] ?? ''),
                    'sort_by' => sanitize_text_field($item['display']['sort_by'] ?? 'price'),
                    'sort_order' => sanitize_text_field($item['display']['sort_order'] ?? 'asc'),
                    'is_default' => !empty($item['display']['is_default']),
                    'default_product_id' => isset($item['display']['default_product_id']) ? intval($item['display']['default_product_id']) : null,
                    'quantity' => intval($item['display']['quantity'] ?? 1),
                    'quantity_min' => intval($item['display']['quantity_min'] ?? 1),
                    'quantity_max' => intval($item['display']['quantity_max'] ?? 10),
                    'discount_type' => sanitize_text_field($item['display']['discount_type'] ?? 'percent'),
                    'discount_value' => floatval($item['display']['discount_value'] ?? 0),
                    'is_optional' => !empty($item['display']['is_optional']),
                    'show_price' => isset($item['display']['show_price']) ? !empty($item['display']['show_price']) : true,
                ),
            );
        }
    }
    
    return $bundle;
}

/**
 * Add metabox to product edit page
 */
function sasanperfumes_bundle_builder_add_metabox() {
    add_meta_box(
        'sasanperfumes_bundle_settings',
        'ShapeHive Bundle Settings',
        'sasanperfumes_bundle_metabox_render',
        'product',
        'side',
        'high'
    );
}

/**
 * Render the bundle metabox
 */
function sasanperfumes_bundle_metabox_render($post) {
    wp_nonce_field('sasanperfumes_bundle_metabox', 'sasanperfumes_bundle_metabox_nonce');
    
    $bundle_enabled = get_post_meta($post->ID, '_sasanperfumes_bundle_enabled', true);
    $bundles = get_option('sasanperfumes_bundles_data', array());
    
    // Find existing bundle config for this product
    $product_bundle = null;
    $bundle_index = -1;
    foreach ($bundles as $index => $bundle) {
        if (isset($bundle['product_id']) && intval($bundle['product_id']) === $post->ID) {
            $product_bundle = $bundle;
            $bundle_index = $index;
            break;
        }
    }
    
    // Get all products for selection (exclude current product)
    $all_products = wc_get_products(array(
        'limit' => -1,
        'status' => 'publish',
        'exclude' => array($post->ID),
    ));
    
    // Get all categories
    $all_categories = get_terms(array(
        'taxonomy' => 'product_cat',
        'hide_empty' => false,
    ));
    
    // Get current bundle settings
    $total_slots = isset($product_bundle['total_slots']) ? intval($product_bundle['total_slots']) : 5;
    $required_slots = isset($product_bundle['required_slots']) ? intval($product_bundle['required_slots']) : 3;
    $eligible_products = isset($product_bundle['eligible_products']) ? $product_bundle['eligible_products'] : array();
    $eligible_categories = isset($product_bundle['eligible_categories']) ? $product_bundle['eligible_categories'] : array();
    $exclude_products = isset($product_bundle['exclude_products']) ? $product_bundle['exclude_products'] : array();
    $exclude_categories = isset($product_bundle['exclude_categories']) ? $product_bundle['exclude_categories'] : array();
    $with_box_price = isset($product_bundle['with_box_price']) ? floatval($product_bundle['with_box_price']) : 0;
    $pricing_mode = isset($product_bundle['pricing_mode']) ? $product_bundle['pricing_mode'] : 'sum';
    $fixed_price = isset($product_bundle['fixed_price']) ? floatval($product_bundle['fixed_price']) : 0;
    $discount_type = isset($product_bundle['discount_type']) ? $product_bundle['discount_type'] : 'none';
    $discount_value = isset($product_bundle['discount_value']) ? floatval($product_bundle['discount_value']) : 0;
    $show_individual_prices = isset($product_bundle['show_individual_prices']) ? $product_bundle['show_individual_prices'] : true;
    $optional_slots = isset($product_bundle['optional_slots']) ? intval($product_bundle['optional_slots']) : 2;
    ?>
    <div class="sasanperfumes-bundle-metabox">
        <p>
            <label>
                <input type="checkbox" name="sasanperfumes_bundle_enabled" value="yes" <?php checked($bundle_enabled, 'yes'); ?> id="sasanperfumes_bundle_enabled_checkbox">
                <strong>Enable Bundle Builder</strong>
            </label>
        </p>
        <p class="description">
            When enabled, customers visiting this product will be redirected to the bundle builder page where they can select products to include in their bundle.
        </p>
        
        <div id="sasanperfumes-bundle-config" style="<?php echo $bundle_enabled === 'yes' ? '' : 'display:none;'; ?>">
            <hr style="margin: 15px 0;">
            <h4>Bundle Configuration</h4>
            
            <table class="form-table">
                <tr>
                    <th><label for="sasanperfumes_bundle_total_slots">Total Slots</label></th>
                    <td>
                        <input type="number" name="sasanperfumes_bundle_total_slots" id="sasanperfumes_bundle_total_slots" value="<?php echo esc_attr($total_slots); ?>" min="1" max="20" class="small-text">
                        <p class="description">Maximum number of products customer can add to the bundle.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_required_slots">Required Slots</label></th>
                    <td>
                        <input type="number" name="sasanperfumes_bundle_required_slots" id="sasanperfumes_bundle_required_slots" value="<?php echo esc_attr($required_slots); ?>" min="1" max="20" class="small-text">
                        <p class="description">Minimum number of products required to complete the bundle.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_optional_slots">Optional Slots (Extra Add-ons)</label></th>
                    <td>
                        <input type="number" name="sasanperfumes_bundle_optional_slots" id="sasanperfumes_bundle_optional_slots" value="<?php echo esc_attr($optional_slots); ?>" min="0" max="20" class="small-text">
                        <p class="description">Number of optional extra products customer can add. Set to 0 to disable optional add-ons.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_eligible_categories">Eligible Categories</label></th>
                    <td>
                        <select name="sasanperfumes_bundle_eligible_categories[]" id="sasanperfumes_bundle_eligible_categories" multiple style="width:100%;min-height:150px;">
                            <?php foreach ($all_categories as $category): ?>
                                <option value="<?php echo esc_attr($category->term_id); ?>" <?php echo in_array($category->term_id, $eligible_categories) ? 'selected' : ''; ?>>
                                    <?php echo esc_html($category->name); ?> (<?php echo $category->count; ?> products)
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Select categories whose products can be added to this bundle. Hold Ctrl/Cmd to select multiple.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_eligible_products">Eligible Products</label></th>
                    <td>
                        <select name="sasanperfumes_bundle_eligible_products[]" id="sasanperfumes_bundle_eligible_products" multiple style="width:100%;min-height:200px;">
                            <?php foreach ($all_products as $product): ?>
                                <option value="<?php echo esc_attr($product->get_id()); ?>" <?php echo in_array($product->get_id(), $eligible_products) ? 'selected' : ''; ?>>
                                    <?php echo esc_html($product->get_name()); ?> (ID: <?php echo $product->get_id(); ?>) - <?php echo wc_price($product->get_price()); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Select specific products that can be added to this bundle. Hold Ctrl/Cmd to select multiple. Leave empty to use categories only.</p>
                    </td>
                </tr>
            </table>
            
            <hr style="margin: 15px 0;">
            <h4>Exclude from Bundle</h4>
            
            <table class="form-table">
                <tr>
                    <th><label for="sasanperfumes_bundle_exclude_categories">Exclude Categories</label></th>
                    <td>
                        <select name="sasanperfumes_bundle_exclude_categories[]" id="sasanperfumes_bundle_exclude_categories" multiple style="width:100%;min-height:150px;">
                            <?php foreach ($all_categories as $category): ?>
                                <option value="<?php echo esc_attr($category->term_id); ?>" <?php echo in_array($category->term_id, $exclude_categories) ? 'selected' : ''; ?>>
                                    <?php echo esc_html($category->name); ?> (<?php echo $category->count; ?> products)
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Select categories to exclude from bundle selection (e.g., Gift Sets category).</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_exclude_products">Exclude Products</label></th>
                    <td>
                        <select name="sasanperfumes_bundle_exclude_products[]" id="sasanperfumes_bundle_exclude_products" multiple style="width:100%;min-height:150px;">
                            <?php foreach ($all_products as $product): ?>
                                <option value="<?php echo esc_attr($product->get_id()); ?>" <?php echo in_array($product->get_id(), $exclude_products) ? 'selected' : ''; ?>>
                                    <?php echo esc_html($product->get_name()); ?> (ID: <?php echo $product->get_id(); ?>) - <?php echo wc_price($product->get_price()); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Select specific products to exclude from bundle selection.</p>
                    </td>
                </tr>
            </table>
            
            <hr style="margin: 15px 0;">
            <h4>Pricing Options</h4>
            
            <table class="form-table">
                <tr>
                    <th><label for="sasanperfumes_bundle_pricing_mode">Pricing Mode</label></th>
                    <td>
                        <select name="sasanperfumes_bundle_pricing_mode" id="sasanperfumes_bundle_pricing_mode">
                            <option value="sum" <?php selected($pricing_mode, 'sum'); ?>>Sum of Products + Box Price</option>
                            <option value="fixed" <?php selected($pricing_mode, 'fixed'); ?>>Fixed Bundle Price</option>
                        </select>
                        <p class="description">Choose how the bundle price is calculated.</p>
                    </td>
                </tr>
                <tr id="sasanperfumes_bundle_fixed_price_row" style="<?php echo $pricing_mode === 'fixed' ? '' : 'display:none;'; ?>">
                    <th><label for="sasanperfumes_bundle_fixed_price">Fixed Bundle Price</label></th>
                    <td>
                        <input type="number" name="sasanperfumes_bundle_fixed_price" id="sasanperfumes_bundle_fixed_price" value="<?php echo esc_attr($fixed_price); ?>" min="0" step="0.01" class="small-text">
                        <p class="description">Fixed price for the entire bundle (ignores individual product prices).</p>
                    </td>
                </tr>
                <tr id="sasanperfumes_bundle_box_price_row" style="<?php echo $pricing_mode === 'sum' ? '' : 'display:none;'; ?>">
                    <th><label for="sasanperfumes_bundle_with_box_price">Box Price</label></th>
                    <td>
                        <input type="number" name="sasanperfumes_bundle_with_box_price" id="sasanperfumes_bundle_with_box_price" value="<?php echo esc_attr($with_box_price); ?>" min="0" step="0.01" class="small-text">
                        <p class="description">Additional price for the bundle box. Set to 0 if box is included in product prices.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_discount_type">Discount</label></th>
                    <td>
                        <select name="sasanperfumes_bundle_discount_type" id="sasanperfumes_bundle_discount_type">
                            <option value="none" <?php selected($discount_type, 'none'); ?>>No Discount</option>
                            <option value="percentage" <?php selected($discount_type, 'percentage'); ?>>Percentage Discount</option>
                            <option value="fixed" <?php selected($discount_type, 'fixed'); ?>>Fixed Amount Discount</option>
                        </select>
                        <p class="description">Apply a discount to the bundle total.</p>
                    </td>
                </tr>
                <tr id="sasanperfumes_bundle_discount_value_row" style="<?php echo $discount_type !== 'none' ? '' : 'display:none;'; ?>">
                    <th><label for="sasanperfumes_bundle_discount_value">Discount Value</label></th>
                    <td>
                        <input type="number" name="sasanperfumes_bundle_discount_value" id="sasanperfumes_bundle_discount_value" value="<?php echo esc_attr($discount_value); ?>" min="0" step="0.01" class="small-text">
                        <span id="sasanperfumes_bundle_discount_suffix"><?php echo $discount_type === 'percentage' ? '%' : 'AED'; ?></span>
                        <p class="description">Enter the discount amount (percentage or fixed value).</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sasanperfumes_bundle_show_individual_prices">Display Options</label></th>
                    <td>
                        <label>
                            <input type="checkbox" name="sasanperfumes_bundle_show_individual_prices" value="1" <?php checked($show_individual_prices, true); ?>>
                            Show individual product prices in cart
                        </label>
                        <p class="description">When enabled, shows each product's price in the cart alongside the bundle.</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <style>
        .sasanperfumes-bundle-metabox .description {
            color: #666;
            font-style: italic;
            margin-top: 5px;
        }
        .sasanperfumes-bundle-metabox h4 {
            margin: 0 0 15px 0;
            padding: 0;
            font-size: 14px;
        }
        .sasanperfumes-bundle-metabox .form-table th {
            width: 150px;
            padding: 10px 10px 10px 0;
        }
        .sasanperfumes-bundle-metabox .form-table td {
            padding: 10px 0;
        }
    </style>
    <script>
    jQuery(document).ready(function($) {
        $('#sasanperfumes_bundle_enabled_checkbox').on('change', function() {
            if ($(this).is(':checked')) {
                $('#sasanperfumes-bundle-config').slideDown();
            } else {
                $('#sasanperfumes-bundle-config').slideUp();
            }
        });
        
        // Pricing mode toggle
        $('#sasanperfumes_bundle_pricing_mode').on('change', function() {
            var mode = $(this).val();
            if (mode === 'fixed') {
                $('#sasanperfumes_bundle_fixed_price_row').show();
                $('#sasanperfumes_bundle_box_price_row').hide();
            } else {
                $('#sasanperfumes_bundle_fixed_price_row').hide();
                $('#sasanperfumes_bundle_box_price_row').show();
            }
        });
        
        // Discount type toggle
        $('#sasanperfumes_bundle_discount_type').on('change', function() {
            var type = $(this).val();
            if (type === 'none') {
                $('#sasanperfumes_bundle_discount_value_row').hide();
            } else {
                $('#sasanperfumes_bundle_discount_value_row').show();
                $('#sasanperfumes_bundle_discount_suffix').text(type === 'percentage' ? '%' : 'AED');
            }
        });
    });
    </script>
    <?php
}

/**
 * Save the bundle metabox data
 */
function sasanperfumes_bundle_builder_save_metabox($post_id) {
    // Check nonce
    if (!isset($_POST['sasanperfumes_bundle_metabox_nonce']) || 
        !wp_verify_nonce($_POST['sasanperfumes_bundle_metabox_nonce'], 'sasanperfumes_bundle_metabox')) {
        return;
    }
    
    // Check autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Check permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Save bundle enabled status
    $bundle_enabled = isset($_POST['sasanperfumes_bundle_enabled']) ? 'yes' : 'no';
    update_post_meta($post_id, '_sasanperfumes_bundle_enabled', $bundle_enabled);
    
    // Save bundle configuration
    if ($bundle_enabled === 'yes') {
        $bundles = get_option('sasanperfumes_bundles_data', array());
        
        // Find existing bundle config for this product
        $bundle_index = -1;
        foreach ($bundles as $index => $bundle) {
            if (isset($bundle['product_id']) && intval($bundle['product_id']) === $post_id) {
                $bundle_index = $index;
                break;
            }
        }
        
        // Get form data
        $total_slots = isset($_POST['sasanperfumes_bundle_total_slots']) ? intval($_POST['sasanperfumes_bundle_total_slots']) : 5;
        $required_slots = isset($_POST['sasanperfumes_bundle_required_slots']) ? intval($_POST['sasanperfumes_bundle_required_slots']) : 3;
        $eligible_products = isset($_POST['sasanperfumes_bundle_eligible_products']) ? array_map('intval', $_POST['sasanperfumes_bundle_eligible_products']) : array();
        $eligible_categories = isset($_POST['sasanperfumes_bundle_eligible_categories']) ? array_map('intval', $_POST['sasanperfumes_bundle_eligible_categories']) : array();
        $exclude_products = isset($_POST['sasanperfumes_bundle_exclude_products']) ? array_map('intval', $_POST['sasanperfumes_bundle_exclude_products']) : array();
        $exclude_categories = isset($_POST['sasanperfumes_bundle_exclude_categories']) ? array_map('intval', $_POST['sasanperfumes_bundle_exclude_categories']) : array();
        $with_box_price = isset($_POST['sasanperfumes_bundle_with_box_price']) ? floatval($_POST['sasanperfumes_bundle_with_box_price']) : 0;
        $pricing_mode = isset($_POST['sasanperfumes_bundle_pricing_mode']) ? sanitize_text_field($_POST['sasanperfumes_bundle_pricing_mode']) : 'sum';
        $fixed_price = isset($_POST['sasanperfumes_bundle_fixed_price']) ? floatval($_POST['sasanperfumes_bundle_fixed_price']) : 0;
        $discount_type = isset($_POST['sasanperfumes_bundle_discount_type']) ? sanitize_text_field($_POST['sasanperfumes_bundle_discount_type']) : 'none';
        $discount_value = isset($_POST['sasanperfumes_bundle_discount_value']) ? floatval($_POST['sasanperfumes_bundle_discount_value']) : 0;
        $show_individual_prices = isset($_POST['sasanperfumes_bundle_show_individual_prices']) ? true : false;
        $optional_slots = isset($_POST['sasanperfumes_bundle_optional_slots']) ? intval($_POST['sasanperfumes_bundle_optional_slots']) : 2;
        
        // Build bundle config
        $bundle_config = array(
            'id' => $bundle_index >= 0 && isset($bundles[$bundle_index]['id']) ? $bundles[$bundle_index]['id'] : wp_generate_uuid4(),
            'product_id' => $post_id,
            'is_enabled' => true,
            'total_slots' => $total_slots,
            'required_slots' => $required_slots,
            'optional_slots' => $optional_slots,
            'eligible_products' => $eligible_products,
            'eligible_categories' => $eligible_categories,
            'exclude_products' => $exclude_products,
            'exclude_categories' => $exclude_categories,
            'with_box_price' => $with_box_price,
            'pricing_mode' => $pricing_mode,
            'fixed_price' => $fixed_price,
            'discount_type' => $discount_type,
            'discount_value' => $discount_value,
            'show_individual_prices' => $show_individual_prices,
            'items' => array(),
        );
        
        // Build items array for API compatibility
        if (!empty($eligible_categories)) {
            $bundle_config['items'][] = array(
                'id' => wp_generate_uuid4(),
                'rule' => array(
                    'type' => 'category',
                    'categories' => $eligible_categories,
                    'products' => array(),
                ),
            );
        }
        if (!empty($eligible_products)) {
            $bundle_config['items'][] = array(
                'id' => wp_generate_uuid4(),
                'rule' => array(
                    'type' => 'product',
                    'categories' => array(),
                    'products' => $eligible_products,
                ),
            );
        }
        
        // Update or add bundle config
        if ($bundle_index >= 0) {
            $bundles[$bundle_index] = $bundle_config;
        } else {
            $bundles[] = $bundle_config;
        }
        
        update_option('sasanperfumes_bundles_data', $bundles);
    }
}

// ============================================================================
// COCART INTEGRATION FOR BUNDLE CONTENTS IN CART
// ============================================================================

/**
 * Save bundle items to cart item data when adding a bundle to cart
 * This hook captures the bundle_items from the request and stores them in cart_item_data
 */
function sasanperfumes_bundle_items_save_to_cart($cart_item_data, $product_id, $variation_id) {
    // Check for bundle_items in POST data (from frontend bundle builder)
    $bundle_items = null;
    
    // Try to get from POST data
    if (isset($_POST['bundle_items']) && is_array($_POST['bundle_items'])) {
        $bundle_items = $_POST['bundle_items'];
    }
    
    // Try to get from cart_item_data in POST (CoCart sends it this way)
    if (!$bundle_items && isset($_POST['cart_item_data']['bundle_items'])) {
        $bundle_items = $_POST['cart_item_data']['bundle_items'];
    }
    
    // Try to get from JSON body (for REST API requests)
    if (!$bundle_items) {
        $json_body = file_get_contents('php://input');
        if ($json_body) {
            $body_data = json_decode($json_body, true);
            if (isset($body_data['cart_item_data']['bundle_items'])) {
                $bundle_items = $body_data['cart_item_data']['bundle_items'];
            } elseif (isset($body_data['bundle_items'])) {
                $bundle_items = $body_data['bundle_items'];
            }
        }
    }
    
    if ($bundle_items && is_array($bundle_items)) {
        $processed_items = array();
        
        foreach ($bundle_items as $item) {
            $item_product_id = isset($item['product_id']) ? intval($item['product_id']) : 0;
            
            if ($item_product_id > 0) {
                $product = wc_get_product($item_product_id);
                $is_free = !empty($item['is_free']);
                $is_addon = !empty($item['is_addon']);
                
                $processed_item = array(
                    'product_id' => $item_product_id,
                    'name' => $product ? $product->get_name() : (isset($item['name']) ? sanitize_text_field($item['name']) : 'Product #' . $item_product_id),
                    'price' => $is_free ? 0 : ($product ? floatval($product->get_price()) : (isset($item['price']) ? floatval($item['price']) : 0)),
                    'quantity' => isset($item['quantity']) ? intval($item['quantity']) : 1,
                );
                
                if ($is_free) {
                    $processed_item['is_free'] = true;
                }
                if ($is_addon) {
                    $processed_item['is_addon'] = true;
                }
                
                $processed_items[] = $processed_item;
            }
        }
        
        if (!empty($processed_items)) {
            $cart_item_data['bundle_items'] = $processed_items;
        }
    }
    
    // Get bundle_total from request (calculated total from frontend including add-ons)
    $bundle_total = null;
    
    // Try to get from POST data
    if (isset($_POST['bundle_total'])) {
        $bundle_total = floatval($_POST['bundle_total']);
    }
    
    // Try to get from cart_item_data in POST
    if (!$bundle_total && isset($_POST['cart_item_data']['bundle_total'])) {
        $bundle_total = floatval($_POST['cart_item_data']['bundle_total']);
    }
    
    // Try to get from JSON body
    if (!$bundle_total) {
        $json_body = file_get_contents('php://input');
        if ($json_body) {
            $body_data = json_decode($json_body, true);
            if (isset($body_data['cart_item_data']['bundle_total'])) {
                $bundle_total = floatval($body_data['cart_item_data']['bundle_total']);
            } elseif (isset($body_data['bundle_total'])) {
                $bundle_total = floatval($body_data['bundle_total']);
            }
        }
    }
    
    if ($bundle_total && $bundle_total > 0) {
        $cart_item_data['bundle_total'] = $bundle_total;
    }
    
    // Get pricing_mode from request
    $pricing_mode = null;
    
    // Try to get from POST data
    if (isset($_POST['pricing_mode'])) {
        $pricing_mode = sanitize_text_field($_POST['pricing_mode']);
    }
    
    // Try to get from cart_item_data in POST
    if (!$pricing_mode && isset($_POST['cart_item_data']['pricing_mode'])) {
        $pricing_mode = sanitize_text_field($_POST['cart_item_data']['pricing_mode']);
    }
    
    // Try to get from JSON body
    if (!$pricing_mode) {
        $json_body = file_get_contents('php://input');
        if ($json_body) {
            $body_data = json_decode($json_body, true);
            if (isset($body_data['cart_item_data']['pricing_mode'])) {
                $pricing_mode = sanitize_text_field($body_data['cart_item_data']['pricing_mode']);
            } elseif (isset($body_data['pricing_mode'])) {
                $pricing_mode = sanitize_text_field($body_data['pricing_mode']);
            }
        }
    }
    
    if ($pricing_mode && in_array($pricing_mode, array('sum', 'fixed'))) {
        $cart_item_data['pricing_mode'] = $pricing_mode;
    }
    
    // Get fixed_price from request
    $fixed_price = null;
    
    // Try to get from POST data
    if (isset($_POST['fixed_price'])) {
        $fixed_price = floatval($_POST['fixed_price']);
    }
    
    // Try to get from cart_item_data in POST
    if (!$fixed_price && isset($_POST['cart_item_data']['fixed_price'])) {
        $fixed_price = floatval($_POST['cart_item_data']['fixed_price']);
    }
    
    // Try to get from JSON body
    if (!$fixed_price) {
        $json_body = file_get_contents('php://input');
        if ($json_body) {
            $body_data = json_decode($json_body, true);
            if (isset($body_data['cart_item_data']['fixed_price'])) {
                $fixed_price = floatval($body_data['cart_item_data']['fixed_price']);
            } elseif (isset($body_data['fixed_price'])) {
                $fixed_price = floatval($body_data['fixed_price']);
            }
        }
    }
    
    if ($fixed_price && $fixed_price > 0) {
        $cart_item_data['fixed_price'] = $fixed_price;
    }
    
    // Get box_price from request
    $box_price = null;
    
    // Try to get from POST data
    if (isset($_POST['box_price'])) {
        $box_price = floatval($_POST['box_price']);
    }
    
    // Try to get from cart_item_data in POST
    if (!$box_price && isset($_POST['cart_item_data']['box_price'])) {
        $box_price = floatval($_POST['cart_item_data']['box_price']);
    }
    
    // Try to get from JSON body
    if (!$box_price) {
        $json_body = file_get_contents('php://input');
        if ($json_body) {
            $body_data = json_decode($json_body, true);
            if (isset($body_data['cart_item_data']['box_price'])) {
                $box_price = floatval($body_data['cart_item_data']['box_price']);
            } elseif (isset($body_data['box_price'])) {
                $box_price = floatval($body_data['box_price']);
            }
        }
    }
    
    if ($box_price !== null && $box_price >= 0) {
        $cart_item_data['box_price'] = $box_price;
    }
    
    return $cart_item_data;
}

/**
 * Ensure bundle items are included in cart item data for session
 */
function sasanperfumes_bundle_items_get_from_session($cart_item, $values, $key) {
    if (isset($values['bundle_items'])) {
        $cart_item['bundle_items'] = $values['bundle_items'];
    }
    if (isset($values['bundle_total'])) {
        $cart_item['bundle_total'] = $values['bundle_total'];
    }
    if (isset($values['pricing_mode'])) {
        $cart_item['pricing_mode'] = $values['pricing_mode'];
    }
    if (isset($values['fixed_price'])) {
        $cart_item['fixed_price'] = $values['fixed_price'];
    }
    if (isset($values['box_price'])) {
        $cart_item['box_price'] = $values['box_price'];
    }
    return $cart_item;
}

/**
 * Modify cart item price to use bundle_total if available
 * This ensures the cart uses the calculated bundle total (including add-ons) instead of the base product price
 */
function sasanperfumes_bundle_set_cart_item_price($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
        // Check if this cart item has a bundle_total
        if (isset($cart_item['bundle_total']) && $cart_item['bundle_total'] > 0) {
            $cart_item['data']->set_price($cart_item['bundle_total']);
        }
    }
}

/**
 * Add bundle items to CoCart cart item response
 * This ensures the bundle_items data is included in the CoCart API response
 */
function sasanperfumes_bundle_items_add_to_cocart_response($cart_contents, $cart_item_key, $cart_item, $cart) {
    foreach ($cart_contents as $key => $item) {
        // Ensure cart_item_data exists
        if (!isset($cart_contents[$key]['cart_item_data'])) {
            $cart_contents[$key]['cart_item_data'] = array();
        }
        
        // Check if bundle_items exists in the cart item (from session)
        if (isset($item['bundle_items'])) {
            $cart_contents[$key]['cart_item_data']['bundle_items'] = $item['bundle_items'];
        }
        
        // Pass pricing_mode to frontend
        if (isset($item['pricing_mode'])) {
            $cart_contents[$key]['cart_item_data']['pricing_mode'] = $item['pricing_mode'];
        }
        
        // Pass fixed_price to frontend
        if (isset($item['fixed_price'])) {
            $cart_contents[$key]['cart_item_data']['fixed_price'] = $item['fixed_price'];
        }
        
        // Pass box_price to frontend
        if (isset($item['box_price'])) {
            $cart_contents[$key]['cart_item_data']['box_price'] = $item['box_price'];
        }
        
        // Pass bundle_total to frontend
        if (isset($item['bundle_total'])) {
            $cart_contents[$key]['cart_item_data']['bundle_total'] = $item['bundle_total'];
        }
        
        // Also check if it's already in cart_item_data and enrich with product data
        if (isset($item['cart_item_data']['bundle_items'])) {
            $bundle_items = $item['cart_item_data']['bundle_items'];
            $enriched_items = array();
            
            foreach ($bundle_items as $bundle_item) {
                $product_id = isset($bundle_item['product_id']) ? intval($bundle_item['product_id']) : 0;
                
                if ($product_id > 0) {
                    $product = wc_get_product($product_id);
                    $is_free = !empty($bundle_item['is_free']);
                    $is_addon = !empty($bundle_item['is_addon']);
                    
                    $enriched_item = array(
                        'product_id' => $product_id,
                        'name' => $product ? $product->get_name() : (isset($bundle_item['name']) ? $bundle_item['name'] : 'Product #' . $product_id),
                        'price' => $is_free ? 0 : ($product ? floatval($product->get_price()) : (isset($bundle_item['price']) ? floatval($bundle_item['price']) : 0)),
                        'quantity' => isset($bundle_item['quantity']) ? intval($bundle_item['quantity']) : 1,
                    );
                    
                    if ($is_free) {
                        $enriched_item['is_free'] = true;
                    }
                    if ($is_addon) {
                        $enriched_item['is_addon'] = true;
                    }
                    
                    $enriched_items[] = $enriched_item;
                }
            }
            
            $cart_contents[$key]['cart_item_data']['bundle_items'] = $enriched_items;
        }
    }
    
    return $cart_contents;
}

/**
 * Alternative hook for CoCart v2 - add bundle items to individual cart item
 */
function sasanperfumes_bundle_items_add_to_cocart_item($item, $item_key, $cart_item) {
    // Ensure cart_item_data exists
    if (!isset($item['cart_item_data'])) {
        $item['cart_item_data'] = array();
    }
    
    // Check if bundle_items exists in the original cart item
    if (isset($cart_item['bundle_items'])) {
        $bundle_items = $cart_item['bundle_items'];
        $enriched_items = array();
        
        foreach ($bundle_items as $bundle_item) {
            $product_id = isset($bundle_item['product_id']) ? intval($bundle_item['product_id']) : 0;
            
            if ($product_id > 0) {
                $product = wc_get_product($product_id);
                $is_free = !empty($bundle_item['is_free']);
                $is_addon = !empty($bundle_item['is_addon']);
                
                $enriched_item = array(
                    'product_id' => $product_id,
                    'name' => $product ? $product->get_name() : (isset($bundle_item['name']) ? $bundle_item['name'] : 'Product #' . $product_id),
                    'price' => $is_free ? 0 : ($product ? floatval($product->get_price()) : (isset($bundle_item['price']) ? floatval($bundle_item['price']) : 0)),
                    'quantity' => isset($bundle_item['quantity']) ? intval($bundle_item['quantity']) : 1,
                );
                
                if ($is_free) {
                    $enriched_item['is_free'] = true;
                }
                if ($is_addon) {
                    $enriched_item['is_addon'] = true;
                }
                
                $enriched_items[] = $enriched_item;
            }
        }
        
        $item['cart_item_data']['bundle_items'] = $enriched_items;
    }
    
    // Pass pricing_mode to frontend
    if (isset($cart_item['pricing_mode'])) {
        $item['cart_item_data']['pricing_mode'] = $cart_item['pricing_mode'];
    }
    
    // Pass fixed_price to frontend
    if (isset($cart_item['fixed_price'])) {
        $item['cart_item_data']['fixed_price'] = $cart_item['fixed_price'];
    }
    
    // Pass box_price to frontend
    if (isset($cart_item['box_price'])) {
        $item['cart_item_data']['box_price'] = $cart_item['box_price'];
    }
    
    // Pass bundle_total to frontend
    if (isset($cart_item['bundle_total'])) {
        $item['cart_item_data']['bundle_total'] = $cart_item['bundle_total'];
    }
    
    return $item;
}

/**
 * Display bundle items in WooCommerce cart (for admin/backend cart view)
 */
function sasanperfumes_bundle_items_display_in_cart($item_data, $cart_item) {
    if (isset($cart_item['bundle_items']) && is_array($cart_item['bundle_items'])) {
        $bundle_names = array();
        foreach ($cart_item['bundle_items'] as $bundle_item) {
            $name = isset($bundle_item['name']) ? $bundle_item['name'] : 'Product #' . $bundle_item['product_id'];
            $bundle_names[] = esc_html($name);
        }
        
        if (!empty($bundle_names)) {
            $item_data[] = array(
                'key' => __('Includes', 'sasanperfumes-frontend-settings'),
                'value' => implode(', ', $bundle_names),
            );
        }
    }
    
    return $item_data;
}

/**
 * Save bundle items to order item meta when order is placed
 */
function sasanperfumes_bundle_items_save_to_order($item, $cart_item_key, $values, $order) {
    if (isset($values['bundle_items']) && is_array($values['bundle_items'])) {
        $item->add_meta_data('_bundle_items', $values['bundle_items'], true);
        
        // Also save a readable version
        $bundle_names = array();
        foreach ($values['bundle_items'] as $bundle_item) {
            $name = isset($bundle_item['name']) ? $bundle_item['name'] : 'Product #' . $bundle_item['product_id'];
            $bundle_names[] = $name;
        }
        
        if (!empty($bundle_names)) {
            $item->add_meta_data(__('Bundle Contents', 'sasanperfumes-frontend-settings'), implode(', ', $bundle_names), true);
        }
    }
}

// Initialize ShapeHive Bundle Builder
sasanperfumes_bundle_builder_init();
