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
