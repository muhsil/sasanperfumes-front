<?php
/**
 * Sasan Perfumes WooCommerce order admin helpers.
 *
 * Keeps the admin order number aligned with the real WooCommerce order ID and
 * adds a safe payment gateway details panel to the order edit screen.
 */

if (!defined('ABSPATH')) exit;

function sasanperfumes_order_admin_init() {
    add_action('add_meta_boxes', 'sasanperfumes_order_admin_add_meta_box');
    add_action('add_meta_boxes_woocommerce_page_wc-orders', 'sasanperfumes_order_admin_add_meta_box');
    add_action('admin_enqueue_scripts', 'sasanperfumes_order_admin_styles');
}

function sasanperfumes_order_admin_add_meta_box() {
    $screen = function_exists('wc_get_page_screen_id')
        ? wc_get_page_screen_id('shop-order')
        : 'shop_order';

    add_meta_box(
        'sasanperfumes-payment-gateway-details',
        'Payment Gateway Details',
        'sasanperfumes_order_admin_render_payment_box',
        'shop_order',
        'normal',
        'high'
    );

    if ($screen && $screen !== 'shop_order') {
        add_meta_box(
            'sasanperfumes-payment-gateway-details',
            'Payment Gateway Details',
            'sasanperfumes_order_admin_render_payment_box',
            $screen,
            'normal',
            'high'
        );
    }
}

function sasanperfumes_order_admin_get_order($post_or_order) {
    if ($post_or_order instanceof WP_Post) {
        return wc_get_order($post_or_order->ID);
    }

    if (is_a($post_or_order, 'WC_Order')) {
        return $post_or_order;
    }

    return null;
}

function sasanperfumes_order_admin_format_date($date) {
    if (!$date || !is_a($date, 'WC_DateTime')) {
        return '';
    }

    return $date->date_i18n('Y-m-d H:i:s');
}

function sasanperfumes_order_admin_row($label, $value) {
    if ($value === null || $value === '') {
        return;
    }

    echo '<tr>';
    echo '<th>' . esc_html($label) . '</th>';
    echo '<td>' . wp_kses_post($value) . '</td>';
    echo '</tr>';
}

function sasanperfumes_order_admin_money($amount, $currency) {
    if ($amount === null || $amount === '') {
        return '';
    }

    return wc_price((float) $amount, array('currency' => $currency));
}

function sasanperfumes_order_admin_amount_value($value) {
    if ($value === null || $value === '') {
        return 0.0;
    }

    return (float) preg_replace('/[^0-9.-]+/', '', (string) $value);
}

function sasanperfumes_order_admin_inclusive_amount($amount, $tax = 0) {
    return round(sasanperfumes_order_admin_amount_value($amount) + sasanperfumes_order_admin_amount_value($tax), 2);
}

function sasanperfumes_order_admin_line_gross_total($item) {
    if (!$item || !is_object($item) || !method_exists($item, 'get_total')) {
        return 0.0;
    }

    return sasanperfumes_order_admin_inclusive_amount($item->get_total(), method_exists($item, 'get_total_tax') ? $item->get_total_tax() : 0);
}

function sasanperfumes_order_admin_line_gross_unit($item) {
    $quantity = $item && is_object($item) && method_exists($item, 'get_quantity')
        ? max(1, (int) $item->get_quantity())
        : 1;

    return round(sasanperfumes_order_admin_line_gross_total($item) / $quantity, 2);
}

function sasanperfumes_order_admin_shipping_gross_total($order) {
    return sasanperfumes_order_admin_inclusive_amount($order->get_shipping_total(), $order->get_shipping_tax());
}

function sasanperfumes_order_admin_discount_gross_total($order) {
    return sasanperfumes_order_admin_inclusive_amount($order->get_discount_total(), method_exists($order, 'get_discount_tax') ? $order->get_discount_tax() : 0);
}

function sasanperfumes_order_admin_fee_gross_total($order) {
    $fees = method_exists($order, 'get_fees') ? $order->get_fees() : array();
    $total = 0.0;

    foreach ($fees as $fee) {
        $fee_total = method_exists($fee, 'get_total') ? $fee->get_total() : 0;
        $fee_tax = method_exists($fee, 'get_total_tax') ? $fee->get_total_tax() : 0;
        $total += sasanperfumes_order_admin_inclusive_amount($fee_total, $fee_tax);
    }

    return round($total, 2);
}

function sasanperfumes_order_admin_products_gross_subtotal($order) {
    $order_total = sasanperfumes_order_admin_amount_value($order->get_total());
    $shipping_total = sasanperfumes_order_admin_shipping_gross_total($order);
    $fee_total = sasanperfumes_order_admin_fee_gross_total($order);
    $discount_total = sasanperfumes_order_admin_discount_gross_total($order);

    return round(max(0, $order_total - $shipping_total - $fee_total + $discount_total), 2);
}

function sasanperfumes_order_admin_display_order_number($order) {
    return $order ? (string) $order->get_id() : '';
}

function sasanperfumes_order_admin_mask_value($key, $value) {
    $key = strtolower((string) $key);

    if (is_array($value)) {
        $safe = array();
        foreach ($value as $child_key => $child_value) {
            $safe[$child_key] = sasanperfumes_order_admin_mask_value($child_key, $child_value);
        }
        return $safe;
    }

    if (is_object($value)) {
        return sasanperfumes_order_admin_mask_value($key, (array) $value);
    }

    if ($value === null || $value === '') {
        return $value;
    }

    $string = (string) $value;

    if (preg_match('/(secret|client_secret|password|token|api_key|private|cvc|cvv|pin)/i', $key)) {
        return '[hidden]';
    }

    if (preg_match('/^\d{12,19}$/', $string)) {
        return str_repeat('*', max(0, strlen($string) - 4)) . substr($string, -4);
    }

    return $string;
}

function sasanperfumes_order_admin_safe_json($value) {
    $safe = sasanperfumes_order_admin_mask_value('', $value);
    return wp_json_encode($safe, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}

function sasanperfumes_order_admin_gateway_meta($order) {
    $matches = array();
    $pattern = '/(stripe|payment|transaction|gateway|charge|capture|authori[sz]ation|checkout|session|intent|card|refund|source|receipt)/i';

    foreach ($order->get_meta_data() as $meta) {
        $data = $meta->get_data();
        $key = isset($data['key']) ? (string) $data['key'] : '';

        if (!preg_match($pattern, $key)) {
            continue;
        }

        $matches[$key] = sasanperfumes_order_admin_mask_value($key, isset($data['value']) ? $data['value'] : '');
    }

    ksort($matches);

    return $matches;
}

function sasanperfumes_order_admin_stripe_secret_key() {
    $settings = get_option('woocommerce_stripe_settings', array());
    if (!is_array($settings)) {
        return '';
    }

    $testmode = isset($settings['testmode']) && $settings['testmode'] === 'yes';
    $keys = $testmode
        ? array('test_secret_key', 'secret_key')
        : array('secret_key', 'test_secret_key');

    foreach ($keys as $key) {
        if (!empty($settings[$key]) && is_string($settings[$key])) {
            return trim($settings[$key]);
        }
    }

    return '';
}

function sasanperfumes_order_admin_stripe_request($path) {
    $secret_key = sasanperfumes_order_admin_stripe_secret_key();
    if ($secret_key === '') {
        return new WP_Error('sasanperfumes_stripe_missing_key', 'Stripe secret key is not available in WooCommerce settings.');
    }

    $response = wp_remote_get(
        'https://api.stripe.com/v1/' . ltrim($path, '/'),
        array(
            'timeout' => 20,
            'headers' => array(
                'Authorization' => 'Bearer ' . $secret_key,
            ),
        )
    );

    if (is_wp_error($response)) {
        return $response;
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($code < 200 || $code >= 300) {
        $message = isset($body['error']['message']) ? $body['error']['message'] : 'Stripe request failed.';
        return new WP_Error('sasanperfumes_stripe_error', $message);
    }

    return is_array($body) ? $body : array();
}

function sasanperfumes_order_admin_stripe_details($order) {
    $payment_intent_id = $order->get_meta('_stripe_payment_intent_id', true);
    if (!$payment_intent_id) {
        $transaction_id = $order->get_transaction_id();
        if (is_string($transaction_id) && strpos($transaction_id, 'pi_') === 0) {
            $payment_intent_id = $transaction_id;
        }
    }

    if (!$payment_intent_id || strpos($payment_intent_id, 'pi_') !== 0) {
        return array();
    }

    $path = 'payment_intents/' . rawurlencode($payment_intent_id)
        . '?expand[]=latest_charge.payment_method_details'
        . '&expand[]=latest_charge.balance_transaction'
        . '&expand[]=payment_method';

    $intent = sasanperfumes_order_admin_stripe_request($path);
    if (is_wp_error($intent)) {
        return array('error' => $intent->get_error_message());
    }

    return $intent;
}

function sasanperfumes_order_admin_amount_from_gateway($amount, $currency) {
    if ($amount === null || $amount === '') {
        return '';
    }

    $zero_decimal = array('bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf');
    $currency = strtolower((string) $currency);
    $value = in_array($currency, $zero_decimal, true) ? (float) $amount : ((float) $amount / 100);

    return number_format_i18n($value, 2) . ' ' . strtoupper($currency);
}

function sasanperfumes_order_admin_render_stripe_section($stripe) {
    if (!$stripe) {
        echo '<p class="sasanperfumes-payment-muted">No live Stripe response available for this order.</p>';
        return;
    }

    if (!empty($stripe['error'])) {
        echo '<p class="sasanperfumes-payment-muted">Live Stripe card details are not available inside WordPress for this order. Stored Stripe payment IDs and status are shown below.</p>';
        return;
    }

    $charge = array();
    if (!empty($stripe['latest_charge']) && is_array($stripe['latest_charge'])) {
        $charge = $stripe['latest_charge'];
    }

    $payment_method = array();
    if (!empty($stripe['payment_method']) && is_array($stripe['payment_method'])) {
        $payment_method = $stripe['payment_method'];
    }

    $card = array();
    if (!empty($charge['payment_method_details']['card'])) {
        $card = $charge['payment_method_details']['card'];
    } elseif (!empty($payment_method['card'])) {
        $card = $payment_method['card'];
    }

    echo '<h4>Live Stripe Data</h4>';
    echo '<table class="widefat striped sasanperfumes-payment-table"><tbody>';
    sasanperfumes_order_admin_row('Payment Intent', isset($stripe['id']) ? $stripe['id'] : '');
    sasanperfumes_order_admin_row('Stripe Status', isset($stripe['status']) ? ucfirst(str_replace('_', ' ', $stripe['status'])) : '');
    sasanperfumes_order_admin_row('Amount', isset($stripe['amount']) ? sasanperfumes_order_admin_amount_from_gateway($stripe['amount'], isset($stripe['currency']) ? $stripe['currency'] : '') : '');
    sasanperfumes_order_admin_row('Amount Received', isset($stripe['amount_received']) ? sasanperfumes_order_admin_amount_from_gateway($stripe['amount_received'], isset($stripe['currency']) ? $stripe['currency'] : '') : '');
    sasanperfumes_order_admin_row('Created', !empty($stripe['created']) ? date_i18n('Y-m-d H:i:s', (int) $stripe['created']) : '');
    sasanperfumes_order_admin_row('Latest Charge', isset($charge['id']) ? $charge['id'] : '');
    sasanperfumes_order_admin_row('Charge Status', isset($charge['status']) ? ucfirst((string) $charge['status']) : '');
    sasanperfumes_order_admin_row('Receipt URL', !empty($charge['receipt_url']) ? '<a href="' . esc_url($charge['receipt_url']) . '" target="_blank" rel="noopener">Open receipt</a>' : '');
    echo '</tbody></table>';

    echo '<h4>Card Details</h4>';
    echo '<table class="widefat striped sasanperfumes-payment-table"><tbody>';
    if ($card) {
        sasanperfumes_order_admin_row('Brand', isset($card['brand']) ? strtoupper($card['brand']) : '');
        sasanperfumes_order_admin_row('Last 4', isset($card['last4']) ? '**** ' . $card['last4'] : '');
        sasanperfumes_order_admin_row('Expiry', (isset($card['exp_month'], $card['exp_year']) ? sprintf('%02d/%d', (int) $card['exp_month'], (int) $card['exp_year']) : ''));
        sasanperfumes_order_admin_row('Funding', isset($card['funding']) ? ucfirst($card['funding']) : '');
        sasanperfumes_order_admin_row('Country', isset($card['country']) ? $card['country'] : '');
        sasanperfumes_order_admin_row('Network', isset($card['network']) ? strtoupper($card['network']) : '');
        sasanperfumes_order_admin_row('Wallet', isset($card['wallet']['type']) ? ucfirst($card['wallet']['type']) : '');
        sasanperfumes_order_admin_row('3D Secure', isset($card['three_d_secure']['result']) ? ucfirst(str_replace('_', ' ', $card['three_d_secure']['result'])) : '');
    } else {
        sasanperfumes_order_admin_row('Card', 'No card brand/last4 stored by the gateway for this payment.');
    }
    echo '</tbody></table>';

    echo '<details class="sasanperfumes-payment-json">';
    echo '<summary>Full safe Stripe response</summary>';
    echo '<pre>' . esc_html(sasanperfumes_order_admin_safe_json($stripe)) . '</pre>';
    echo '</details>';
}

function sasanperfumes_order_admin_render_payment_box($post_or_order) {
    $order = sasanperfumes_order_admin_get_order($post_or_order);
    if (!$order) {
        echo '<p>Unable to load order.</p>';
        return;
    }

    $currency = $order->get_currency();
    $gateway_meta = sasanperfumes_order_admin_gateway_meta($order);
    $stripe = $order->get_payment_method() === 'stripe' ? sasanperfumes_order_admin_stripe_details($order) : array();
    $order_item_display_map = array();

    foreach ($order->get_items() as $item_id => $item) {
        $gross_total = sasanperfumes_order_admin_line_gross_total($item);
        $order_item_display_map[(string) $item_id] = array(
            'unit_html' => sasanperfumes_order_admin_money(sasanperfumes_order_admin_line_gross_unit($item), $currency),
            'total_html' => sasanperfumes_order_admin_money($gross_total, $currency),
            'tax_text' => 'Included',
            'sort_unit' => sasanperfumes_order_admin_line_gross_unit($item),
            'sort_total' => $gross_total,
        );
    }

    foreach ($order->get_fees() as $item_id => $item) {
        $gross_total = sasanperfumes_order_admin_inclusive_amount(
            method_exists($item, 'get_total') ? $item->get_total() : 0,
            method_exists($item, 'get_total_tax') ? $item->get_total_tax() : 0
        );
        $order_item_display_map[(string) $item_id] = array(
            'unit_html' => '',
            'total_html' => sasanperfumes_order_admin_money($gross_total, $currency),
            'tax_text' => 'Included',
            'sort_unit' => '',
            'sort_total' => $gross_total,
        );
    }

    foreach ($order->get_shipping_methods() as $item_id => $item) {
        $gross_total = sasanperfumes_order_admin_inclusive_amount(
            method_exists($item, 'get_total') ? $item->get_total() : 0,
            method_exists($item, 'get_total_tax') ? $item->get_total_tax() : 0
        );
        $order_item_display_map[(string) $item_id] = array(
            'unit_html' => '',
            'total_html' => sasanperfumes_order_admin_money($gross_total, $currency),
            'tax_text' => 'Included',
            'sort_unit' => '',
            'sort_total' => $gross_total,
        );
    }

    echo '<div class="sasanperfumes-payment-details">';

    echo '<h4>Order & Payment</h4>';
    echo '<table class="widefat striped sasanperfumes-payment-table"><tbody>';
    sasanperfumes_order_admin_row('Order Number', '#' . sasanperfumes_order_admin_display_order_number($order));
    sasanperfumes_order_admin_row('WooCommerce Order ID', '#' . $order->get_id());
    sasanperfumes_order_admin_row('Status', wc_get_order_status_name($order->get_status()));
    sasanperfumes_order_admin_row('Payment Method', $order->get_payment_method_title() . ' (' . $order->get_payment_method() . ')');
    sasanperfumes_order_admin_row('Transaction / Payment ID', $order->get_transaction_id());
    sasanperfumes_order_admin_row('Order Key', $order->get_order_key());
    sasanperfumes_order_admin_row('Total Paid', sasanperfumes_order_admin_money($order->get_total(), $currency));
    sasanperfumes_order_admin_row('Currency', $currency);
    sasanperfumes_order_admin_row('Created Time', sasanperfumes_order_admin_format_date($order->get_date_created()));
    sasanperfumes_order_admin_row('Paid Time', sasanperfumes_order_admin_format_date($order->get_date_paid()));
    sasanperfumes_order_admin_row('Completed Time', sasanperfumes_order_admin_format_date($order->get_date_completed()));
    echo '</tbody></table>';

    echo '<h4>VAT-Inclusive Summary</h4>';
    echo '<table class="widefat striped sasanperfumes-payment-table"><tbody>';
    sasanperfumes_order_admin_row('Products subtotal', sasanperfumes_order_admin_money(sasanperfumes_order_admin_products_gross_subtotal($order), $currency));
    sasanperfumes_order_admin_row('Shipping', sasanperfumes_order_admin_money(sasanperfumes_order_admin_shipping_gross_total($order), $currency));
    if ($order->get_discount_total() !== '0' && sasanperfumes_order_admin_discount_gross_total($order) > 0) {
        sasanperfumes_order_admin_row('Discount', '- ' . sasanperfumes_order_admin_money(sasanperfumes_order_admin_discount_gross_total($order), $currency));
    }
    if (sasanperfumes_order_admin_fee_gross_total($order) > 0) {
        sasanperfumes_order_admin_row('Fees', sasanperfumes_order_admin_money(sasanperfumes_order_admin_fee_gross_total($order), $currency));
    }
    sasanperfumes_order_admin_row('VAT included in total', sasanperfumes_order_admin_money($order->get_total_tax(), $currency));
    echo '</tbody></table>';

    echo '<h4>Customer Details</h4>';
    echo '<table class="widefat striped sasanperfumes-payment-table"><tbody>';
    sasanperfumes_order_admin_row('Customer User ID', $order->get_customer_id() ? '#' . $order->get_customer_id() : 'Guest');
    sasanperfumes_order_admin_row('Billing Name', $order->get_formatted_billing_full_name());
    sasanperfumes_order_admin_row('Billing Email', $order->get_billing_email() ? '<a href="mailto:' . esc_attr($order->get_billing_email()) . '">' . esc_html($order->get_billing_email()) . '</a>' : '');
    sasanperfumes_order_admin_row('Billing Phone', $order->get_billing_phone());
    sasanperfumes_order_admin_row('Billing Address', $order->get_formatted_billing_address());
    sasanperfumes_order_admin_row('Shipping Name', $order->get_formatted_shipping_full_name());
    sasanperfumes_order_admin_row('Shipping Address', $order->get_formatted_shipping_address());
    sasanperfumes_order_admin_row('Customer IP', $order->get_customer_ip_address());
    sasanperfumes_order_admin_row('Customer User Agent', $order->get_customer_user_agent());
    sasanperfumes_order_admin_row('Customer Note', $order->get_customer_note());
    echo '</tbody></table>';

    if ($order->get_payment_method() === 'stripe') {
        sasanperfumes_order_admin_render_stripe_section($stripe);
    }

    echo '<h4>Stored Gateway Metadata</h4>';
    if ($gateway_meta) {
        echo '<table class="widefat striped sasanperfumes-payment-table"><tbody>';
        foreach ($gateway_meta as $key => $value) {
            $display = is_array($value)
                ? '<pre class="sasanperfumes-payment-inline-json">' . esc_html(sasanperfumes_order_admin_safe_json($value)) . '</pre>'
                : esc_html((string) $value);
            sasanperfumes_order_admin_row($key, $display);
        }
        echo '</tbody></table>';
    } else {
        echo '<p class="sasanperfumes-payment-muted">No stored gateway metadata found.</p>';
    }

    if ($order_item_display_map) {
        echo '<script>';
        echo '(function(){';
        echo 'const orderItemMap = ' . wp_json_encode($order_item_display_map) . ';';
        echo 'function applyOrderGrossDisplay(){';
        echo 'const rows = document.querySelectorAll("#order_line_items tr[data-order_item_id], #order_fee_line_items tr[data-order_item_id], #order_shipping_line_items tr[data-order_item_id]");';
        echo 'rows.forEach(function(row){';
        echo 'const itemId = row.getAttribute("data-order_item_id");';
        echo 'const data = orderItemMap[itemId];';
        echo 'if (!data) { return; }';
        echo 'const unitCell = row.querySelector("td.item_cost .view");';
        echo 'if (unitCell && data.unit_html !== undefined) { unitCell.innerHTML = data.unit_html || ""; if (data.sort_unit !== "") { const unitParent = row.querySelector("td.item_cost"); if (unitParent) { unitParent.setAttribute("data-sort-value", String(data.sort_unit)); } } }';
        echo 'const totalCell = row.querySelector("td.line_cost .view");';
        echo 'if (totalCell && data.total_html !== undefined) { totalCell.innerHTML = data.total_html || ""; const totalParent = row.querySelector("td.line_cost"); if (totalParent && data.sort_total !== "") { totalParent.setAttribute("data-sort-value", String(data.sort_total)); } }';
        echo 'row.querySelectorAll("td.line_tax .view").forEach(function(cell){ cell.textContent = data.tax_text || ""; });';
        echo '});';
        echo '}';
        echo 'if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", applyOrderGrossDisplay); } else { applyOrderGrossDisplay(); }';
        echo '})();';
        echo '</script>';
    }

    echo '</div>';
}

function sasanperfumes_order_admin_styles($hook) {
    if (!in_array($hook, array('post.php', 'post-new.php'), true) && strpos($hook, 'wc-orders') === false) {
        return;
    }

    $screen = get_current_screen();
    if (!$screen) {
        return;
    }

    if (strpos($screen->id, 'shop_order') === false && strpos($screen->id, 'wc-orders') === false) {
        return;
    }

    wp_add_inline_style('woocommerce_admin_styles', '
        .sasanperfumes-payment-details h4 {
            margin: 18px 0 8px;
            font-size: 13px;
            text-transform: uppercase;
            color: #1d2327;
        }
        .sasanperfumes-payment-details h4:first-child {
            margin-top: 0;
        }
        .sasanperfumes-payment-table th {
            width: 220px;
            font-weight: 600;
            color: #50575e;
            vertical-align: top;
        }
        .sasanperfumes-payment-table td {
            word-break: break-word;
        }
        .sasanperfumes-payment-json {
            margin-top: 12px;
        }
        .sasanperfumes-payment-json summary {
            cursor: pointer;
            font-weight: 600;
        }
        .sasanperfumes-payment-json pre,
        .sasanperfumes-payment-inline-json {
            margin: 8px 0 0;
            max-height: 420px;
            overflow: auto;
            padding: 10px;
            background: #f6f7f7;
            border: 1px solid #dcdcde;
            white-space: pre-wrap;
            font-size: 12px;
        }
        .sasanperfumes-payment-muted {
            color: #646970;
            font-style: italic;
        }
    ');
}

sasanperfumes_order_admin_init();
