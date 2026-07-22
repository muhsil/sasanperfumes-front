<?php
/**
 * Sasan Perfumes WooCommerce tax settings enforcement.
 *
 * Ensures WooCommerce is configured for tax-inclusive pricing so that
 * product prices, cart totals, and admin order displays all treat
 * prices as VAT-inclusive.
 */

if (!defined('ABSPATH')) exit;

function sasanperfumes_enforce_inclusive_tax_settings() {
    if (!class_exists('WooCommerce')) return;

    $settings = array(
        'woocommerce_prices_include_tax' => 'yes',
        'woocommerce_tax_display_shop'   => 'incl',
        'woocommerce_tax_display_cart'   => 'incl',
    );

    foreach ($settings as $key => $value) {
        if (get_option($key) !== $value) {
            update_option($key, $value);
        }
    }
}
add_action('admin_init', 'sasanperfumes_enforce_inclusive_tax_settings');
add_action('init', 'sasanperfumes_enforce_inclusive_tax_settings', 20);

/**
 * Suffix shown after prices in the shop and cart (e.g. "incl. VAT").
 * Keep blank since all prices are already inclusive.
 */
function sasanperfumes_tax_price_suffix($suffix) {
    return '';
}
add_filter('woocommerce_get_price_suffix', 'sasanperfumes_tax_price_suffix', 999);

/**
 * Disable VAT on shipping.
 *
 * Shipping rates (e.g. "Flat rate 30 AED") should be shown as-is
 * without additional tax.  WooCommerce normally adds tax on top of
 * shipping rates, which inflates them (30 → 31.50 at 5%).  Returning
 * an empty array from this filter tells WC to apply zero tax to
 * every shipping line.
 */
function sasanperfumes_zero_shipping_tax($taxes, $price, $rates) {
    return array();
}
add_filter('woocommerce_calc_shipping_tax', 'sasanperfumes_zero_shipping_tax', 10, 3);

/**
 * Prevent shipping taxes from being attached to calculated shipping rates.
 *
 * The tax calculation filter above covers WooCommerce's standard calculator,
 * while these filters also cover rates supplied by Store API and extensions.
 */
function sasanperfumes_force_shipping_rate_no_tax($args) {
    if (is_array($args)) {
        $args['taxes'] = array();
    }

    return $args;
}
add_filter('woocommerce_shipping_method_add_rate_args', 'sasanperfumes_force_shipping_rate_no_tax', 999, 1);

function sasanperfumes_zero_shipping_rate_taxes($taxes) {
    return array();
}
add_filter('woocommerce_shipping_rate_taxes', 'sasanperfumes_zero_shipping_rate_taxes', 999, 1);

/**
 * Disable the "Shipping" flag on every tax rate once per site/version.
 *
 * REST-created orders can recalculate shipping tax directly from this database
 * flag without consulting the shipping method's own tax status.
 */
function sasanperfumes_disable_shipping_tax_rates() {
    global $wpdb;

    $migration_version = '2026-07-22-v1';
    if (get_option('sasanperfumes_shipping_tax_migration') === $migration_version) {
        return;
    }

    $table = $wpdb->prefix . 'woocommerce_tax_rates';
    $wpdb->query("UPDATE {$table} SET tax_rate_shipping = 0 WHERE tax_rate_shipping <> 0");

    if (class_exists('WC_Cache_Helper')) {
        WC_Cache_Helper::invalidate_cache_group('taxes');
    }

    update_option('sasanperfumes_shipping_tax_migration', $migration_version, false);
}
add_action('init', 'sasanperfumes_disable_shipping_tax_rates', 30);

/**
 * Remove shipping tax from newly-created orders as a final persistence guard.
 */
function sasanperfumes_normalize_order_shipping_tax($order) {
    static $normalizing = false;

    if ($normalizing || !($order instanceof WC_Order)) {
        return;
    }

    $shipping_items = $order->get_items('shipping');
    $has_shipping_tax = (float) $order->get_shipping_tax() > 0;

    foreach ($shipping_items as $shipping_item) {
        if ((float) $shipping_item->get_total_tax() > 0) {
            $has_shipping_tax = true;
            break;
        }
    }

    if (!$has_shipping_tax) {
        return;
    }

    $normalizing = true;

    foreach ($shipping_items as $shipping_item) {
        $shipping_item->set_taxes(array('total' => array()));
        $shipping_item->save();
    }

    $order->set_shipping_tax(0);
    $order->calculate_totals(false);
    $order->update_meta_data('_sasan_shipping_tax_corrected', gmdate('c'));
    $order->save();

    $normalizing = false;
}

function sasanperfumes_normalize_rest_order_shipping_tax($order, $request = null, $creating = false) {
    if ($creating) {
        sasanperfumes_normalize_order_shipping_tax($order);
    }
}
add_action('woocommerce_rest_insert_shop_order_object', 'sasanperfumes_normalize_rest_order_shipping_tax', 999, 3);
add_action('woocommerce_store_api_checkout_order_processed', 'sasanperfumes_normalize_order_shipping_tax', 999, 1);
add_action('woocommerce_checkout_order_created', 'sasanperfumes_normalize_order_shipping_tax', 5, 1);

/**
 * Repair historical orders in small batches so large stores are never locked by
 * a single request. Each multisite store keeps its own cursor and completion flag.
 */
function sasanperfumes_repair_historical_shipping_tax_batch() {
    if (!function_exists('wc_get_orders')) {
        return;
    }

    $migration_version = '2026-07-22-v1';
    if (get_option('sasanperfumes_historical_shipping_tax_repair') === $migration_version) {
        return;
    }

    $page = max(1, absint(get_option('sasanperfumes_historical_shipping_tax_page', 1)));
    $orders = wc_get_orders(array(
        'limit'   => 50,
        'page'    => $page,
        'orderby' => 'ID',
        'order'   => 'ASC',
        'status'  => array_keys(wc_get_order_statuses()),
    ));

    foreach ((array) $orders as $order) {
        sasanperfumes_normalize_order_shipping_tax($order);
    }

    if (count((array) $orders) < 50) {
        update_option('sasanperfumes_historical_shipping_tax_repair', $migration_version, false);
        delete_option('sasanperfumes_historical_shipping_tax_page');
        return;
    }

    update_option('sasanperfumes_historical_shipping_tax_page', $page + 1, false);
}
add_action('wp_loaded', 'sasanperfumes_repair_historical_shipping_tax_batch', 99);

/**
 * Ensure admin new-order emails are sent to sasanperfumesuae@gmail.com.
 *
 * WooCommerce stores the recipient list in the woocommerce_new_order_settings
 * option, but the email sender also reads the runtime recipient filter. Keep
 * both paths in sync so frontend order creation cannot bypass the added mailbox.
 */
function sasanperfumes_normalize_order_email_recipients($recipients, $target = 'sasanperfumesuae@gmail.com') {
    $recipients = is_string($recipients) ? $recipients : '';
    $emails = array_filter(array_map('trim', explode(',', $recipients)), 'strlen');
    $emails[] = $target;
    $emails = array_values(array_unique(array_filter($emails, 'is_email')));

    return implode(',', $emails);
}

function sasanperfumes_enforce_admin_order_email() {
    if (!class_exists('WooCommerce')) return;

    $target = 'sasanperfumesuae@gmail.com';
    $settings = get_option('woocommerce_new_order_settings', array());
    $legacy_recipient = (string) get_option('woocommerce_new_order_recipient', '');

    if (!is_array($settings)) {
        $settings = array();
    }

    $current = isset($settings['recipient']) ? (string) $settings['recipient'] : '';
    $normalized = sasanperfumes_normalize_order_email_recipients($current !== '' ? $current : $legacy_recipient, $target);

    if ($normalized === '') {
        $normalized = $target;
    }

    if ($current !== $normalized) {
        $settings['recipient'] = $normalized;
        update_option('woocommerce_new_order_settings', $settings);
    }

    if (trim($legacy_recipient) !== $normalized) {
        update_option('woocommerce_new_order_recipient', $normalized);
    }
}
add_action('admin_init', 'sasanperfumes_enforce_admin_order_email');

/**
 * Guarantee the recipient at send time, even if the admin settings page has
 * not been loaded in the current request.
 */
function sasanperfumes_force_new_order_recipient($recipient) {
    return sasanperfumes_normalize_order_email_recipients((string) $recipient, 'sasanperfumesuae@gmail.com');
}
add_filter('woocommerce_email_recipient_new_order', 'sasanperfumes_force_new_order_recipient', 9999, 1);
