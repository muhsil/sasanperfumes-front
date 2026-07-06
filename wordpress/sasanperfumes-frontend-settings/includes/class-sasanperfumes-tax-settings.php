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
