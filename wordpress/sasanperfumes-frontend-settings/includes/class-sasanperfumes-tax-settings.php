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
