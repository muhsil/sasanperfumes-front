<?php
/**
 * ShapeHive Customer Tracking - Order Tracking Data Display
 * 
 * Displays customer tracking data (landing page, referrer, UTM params,
 * device info, pages visited) on the WooCommerce order admin page.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.9.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize ShapeHive Customer Tracking
 */
function sasanperfumes_customer_tracking_init() {
    // Add meta box to WooCommerce order page
    add_action('add_meta_boxes', 'sasanperfumes_customer_tracking_add_meta_box');
    
    // Support for HPOS (High-Performance Order Storage)
    add_action('add_meta_boxes_woocommerce_page_wc-orders', 'sasanperfumes_customer_tracking_add_meta_box');
    
    // Enqueue admin styles for the tracking meta box
    add_action('admin_enqueue_scripts', 'sasanperfumes_customer_tracking_admin_styles');
}

/**
 * Add meta box to order edit page
 */
function sasanperfumes_customer_tracking_add_meta_box() {
    $screen = function_exists('wc_get_page_screen_id') 
        ? wc_get_page_screen_id('shop-order') 
        : 'shop_order';
    
    // Add for traditional order edit screen
    add_meta_box(
        'sasanperfumes-customer-tracking',
        '📊 Customer Tracking',
        'sasanperfumes_customer_tracking_render_meta_box',
        'shop_order',
        'side',
        'default'
    );
    
    // Add for HPOS order edit screen
    if ($screen && $screen !== 'shop_order') {
        add_meta_box(
            'sasanperfumes-customer-tracking',
            '📊 Customer Tracking',
            'sasanperfumes_customer_tracking_render_meta_box',
            $screen,
            'side',
            'default'
        );
    }
}

/**
 * Render the customer tracking meta box
 */
function sasanperfumes_customer_tracking_render_meta_box($post_or_order) {
    // Support both traditional post and HPOS order objects
    if ($post_or_order instanceof WP_Post) {
        $order = wc_get_order($post_or_order->ID);
    } elseif (is_a($post_or_order, 'WC_Order')) {
        $order = $post_or_order;
    } else {
        echo '<p style="color:#999;">Unable to load order data.</p>';
        return;
    }
    
    if (!$order) {
        echo '<p style="color:#999;">Order not found.</p>';
        return;
    }

    // Tracking meta keys and their display labels
    $tracking_fields = array(
        '_tracking_landing_page'     => array('label' => 'Landing Page', 'icon' => '🔗'),
        '_tracking_referrer'         => array('label' => 'Referrer', 'icon' => '↩️'),
        '_tracking_first_visit'      => array('label' => 'First Visit', 'icon' => '🕐'),
        '_tracking_utm_source'       => array('label' => 'UTM Source', 'icon' => '📢'),
        '_tracking_utm_medium'       => array('label' => 'UTM Medium', 'icon' => '📡'),
        '_tracking_utm_campaign'     => array('label' => 'UTM Campaign', 'icon' => '🎯'),
        '_tracking_utm_term'         => array('label' => 'UTM Term', 'icon' => '🔍'),
        '_tracking_utm_content'      => array('label' => 'UTM Content', 'icon' => '📝'),
        '_tracking_device_type'      => array('label' => 'Device', 'icon' => '📱'),
        '_tracking_browser'          => array('label' => 'Browser', 'icon' => '🌐'),
        '_tracking_screen_resolution'=> array('label' => 'Screen', 'icon' => '🖥️'),
        '_tracking_pages_viewed'     => array('label' => 'Pages Viewed', 'icon' => '📄'),
        '_tracking_locale'           => array('label' => 'Locale', 'icon' => '🌍'),
    );

    $has_tracking_data = false;

    // Check if any tracking data exists
    foreach ($tracking_fields as $key => $field) {
        $value = $order->get_meta($key);
        if (!empty($value)) {
            $has_tracking_data = true;
            break;
        }
    }

    if (!$has_tracking_data) {
        echo '<p style="color:#999;font-style:italic;">No tracking data available for this order.</p>';
        echo '<p style="color:#999;font-size:11px;">Tracking data is captured for orders placed after the tracking feature was enabled.</p>';
        return;
    }

    echo '<div class="sasanperfumes-tracking-data">';

    // Entry/Landing Section
    $landing_page = $order->get_meta('_tracking_landing_page');
    $referrer = $order->get_meta('_tracking_referrer');
    $first_visit = $order->get_meta('_tracking_first_visit');

    if ($landing_page || $referrer || $first_visit) {
        echo '<div class="sasanperfumes-tracking-section">';
        echo '<h4 style="margin:0 0 8px;padding:0 0 4px;border-bottom:1px solid #eee;font-size:12px;text-transform:uppercase;color:#666;">Visit Info</h4>';
        
        if ($landing_page) {
            $short_url = sasanperfumes_tracking_shorten_url($landing_page);
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">🔗 Landing Page</span>';
            echo '<span class="sasanperfumes-tracking-value"><a href="' . esc_url($landing_page) . '" target="_blank" title="' . esc_attr($landing_page) . '">' . esc_html($short_url) . '</a></span>';
            echo '</div>';
        }

        if ($referrer) {
            $display_referrer = $referrer === '(direct)' ? '(direct)' : sasanperfumes_tracking_shorten_url($referrer);
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">↩️ Referrer</span>';
            if ($referrer !== '(direct)') {
                echo '<span class="sasanperfumes-tracking-value"><a href="' . esc_url($referrer) . '" target="_blank" title="' . esc_attr($referrer) . '">' . esc_html($display_referrer) . '</a></span>';
            } else {
                echo '<span class="sasanperfumes-tracking-value">' . esc_html($display_referrer) . '</span>';
            }
            echo '</div>';
        }

        if ($first_visit) {
            $formatted_date = date('M j, Y g:i A', strtotime($first_visit));
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">🕐 First Visit</span>';
            echo '<span class="sasanperfumes-tracking-value">' . esc_html($formatted_date) . '</span>';
            echo '</div>';
        }

        echo '</div>';
    }

    // UTM Parameters Section
    $utm_source = $order->get_meta('_tracking_utm_source');
    $utm_medium = $order->get_meta('_tracking_utm_medium');
    $utm_campaign = $order->get_meta('_tracking_utm_campaign');
    $utm_term = $order->get_meta('_tracking_utm_term');
    $utm_content = $order->get_meta('_tracking_utm_content');

    if ($utm_source || $utm_medium || $utm_campaign || $utm_term || $utm_content) {
        echo '<div class="sasanperfumes-tracking-section" style="margin-top:12px;">';
        echo '<h4 style="margin:0 0 8px;padding:0 0 4px;border-bottom:1px solid #eee;font-size:12px;text-transform:uppercase;color:#666;">UTM Parameters</h4>';

        $utm_fields = array(
            array('label' => '📢 Source', 'value' => $utm_source),
            array('label' => '📡 Medium', 'value' => $utm_medium),
            array('label' => '🎯 Campaign', 'value' => $utm_campaign),
            array('label' => '🔍 Term', 'value' => $utm_term),
            array('label' => '📝 Content', 'value' => $utm_content),
        );

        foreach ($utm_fields as $utm) {
            if (!empty($utm['value'])) {
                echo '<div class="sasanperfumes-tracking-row">';
                echo '<span class="sasanperfumes-tracking-label">' . $utm['label'] . '</span>';
                echo '<span class="sasanperfumes-tracking-value">' . esc_html($utm['value']) . '</span>';
                echo '</div>';
            }
        }

        echo '</div>';
    }

    // Device & Browser Section
    $device_type = $order->get_meta('_tracking_device_type');
    $browser = $order->get_meta('_tracking_browser');
    $screen_resolution = $order->get_meta('_tracking_screen_resolution');
    $locale = $order->get_meta('_tracking_locale');

    if ($device_type || $browser || $screen_resolution || $locale) {
        echo '<div class="sasanperfumes-tracking-section" style="margin-top:12px;">';
        echo '<h4 style="margin:0 0 8px;padding:0 0 4px;border-bottom:1px solid #eee;font-size:12px;text-transform:uppercase;color:#666;">Device & Browser</h4>';

        if ($device_type) {
            $device_icon = $device_type === 'mobile' ? '📱' : ($device_type === 'tablet' ? '📲' : '🖥️');
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">' . $device_icon . ' Device</span>';
            echo '<span class="sasanperfumes-tracking-value">' . esc_html(ucfirst($device_type)) . '</span>';
            echo '</div>';
        }

        if ($browser) {
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">🌐 Browser</span>';
            echo '<span class="sasanperfumes-tracking-value">' . esc_html($browser) . '</span>';
            echo '</div>';
        }

        if ($screen_resolution) {
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">🖥️ Screen</span>';
            echo '<span class="sasanperfumes-tracking-value">' . esc_html($screen_resolution) . '</span>';
            echo '</div>';
        }

        if ($locale) {
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">🌍 Locale</span>';
            echo '<span class="sasanperfumes-tracking-value">' . esc_html(strtoupper($locale)) . '</span>';
            echo '</div>';
        }

        echo '</div>';
    }

    // Pages Visited Section
    $pages_viewed = $order->get_meta('_tracking_pages_viewed');
    $pages_list = $order->get_meta('_tracking_pages_list');

    if ($pages_viewed || $pages_list) {
        echo '<div class="sasanperfumes-tracking-section" style="margin-top:12px;">';
        echo '<h4 style="margin:0 0 8px;padding:0 0 4px;border-bottom:1px solid #eee;font-size:12px;text-transform:uppercase;color:#666;">Browsing Session</h4>';

        if ($pages_viewed) {
            echo '<div class="sasanperfumes-tracking-row">';
            echo '<span class="sasanperfumes-tracking-label">📄 Pages Viewed</span>';
            echo '<span class="sasanperfumes-tracking-value"><strong>' . esc_html($pages_viewed) . '</strong></span>';
            echo '</div>';
        }

        if ($pages_list) {
            $pages = json_decode($pages_list, true);
            if (is_array($pages) && !empty($pages)) {
                echo '<div class="sasanperfumes-tracking-pages">';
                echo '<span class="sasanperfumes-tracking-label" style="display:block;margin-bottom:4px;">📋 Pages List</span>';
                echo '<ol style="margin:4px 0 0 16px;padding:0;font-size:11px;line-height:1.6;color:#555;">';
                foreach ($pages as $page) {
                    echo '<li>' . esc_html($page) . '</li>';
                }
                echo '</ol>';
                echo '</div>';
            }
        }

        echo '</div>';
    }

    echo '</div>';
}

/**
 * Shorten a URL for display (remove protocol and truncate)
 */
function sasanperfumes_tracking_shorten_url($url) {
    $short = preg_replace('#^https?://#', '', $url);
    if (strlen($short) > 50) {
        $short = substr($short, 0, 47) . '...';
    }
    return $short;
}

/**
 * Enqueue admin styles for tracking meta box
 */
function sasanperfumes_customer_tracking_admin_styles($hook) {
    // Only load on order edit pages
    if (!in_array($hook, array('post.php', 'post-new.php')) && strpos($hook, 'wc-orders') === false) {
        return;
    }

    $screen = get_current_screen();
    if (!$screen) return;
    
    $valid_screens = array('shop_order', 'woocommerce_page_wc-orders');
    $is_order_screen = false;
    
    foreach ($valid_screens as $valid) {
        if ($screen->id === $valid || strpos($screen->id, $valid) !== false) {
            $is_order_screen = true;
            break;
        }
    }
    
    if (!$is_order_screen) return;

    wp_add_inline_style('woocommerce_admin_styles', '
        .sasanperfumes-tracking-data {
            font-size: 12px;
            line-height: 1.5;
        }
        .sasanperfumes-tracking-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 4px 0;
            gap: 8px;
        }
        .sasanperfumes-tracking-label {
            color: #666;
            font-size: 11px;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .sasanperfumes-tracking-value {
            color: #333;
            font-size: 12px;
            text-align: right;
            word-break: break-all;
        }
        .sasanperfumes-tracking-value a {
            color: #2271b1;
            text-decoration: none;
        }
        .sasanperfumes-tracking-value a:hover {
            text-decoration: underline;
        }
        .sasanperfumes-tracking-pages ol li {
            color: #555;
        }
    ');
}

// Initialize
sasanperfumes_customer_tracking_init();
