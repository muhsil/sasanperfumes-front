<?php
/**
 * Sasan Perfumes Stock Alerts â€” Back in Stock Notifications
 *
 * Stores email subscriptions in a custom DB table.
 * Sends emails when a product transitions from out_of_stock â†’ instock.
 *
 * REST endpoints:
 *   POST /sasanperfumes/v1/stock-alerts           { product_id, email, locale }
 *   DELETE /sasanperfumes/v1/stock-alerts         { product_id, email }
 *   GET  /sasanperfumes/v1/stock-alerts/check     ?product_id=&email=
 *
 * @since 6.6.0
 */

if (!defined('ABSPATH')) exit;

// Create table on plugin init / activation
add_action('init', 'sasanperfumes_stock_alerts_maybe_create_table');
add_action('rest_api_init', 'sasanperfumes_stock_alerts_register_routes');
add_action('woocommerce_product_set_stock_status', 'sasanperfumes_stock_alerts_on_stock_change', 10, 3);
add_action('woocommerce_variation_set_stock_status', 'sasanperfumes_stock_alerts_on_stock_change', 10, 3);
add_action('admin_menu', 'sasanperfumes_stock_alerts_register_menu', 99);

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function sasanperfumes_stock_alerts_table(): string {
    global $wpdb;
    return $wpdb->prefix . 'sasanperfumes_stock_alerts';
}

function sasanperfumes_stock_alerts_maybe_create_table() {
    global $wpdb;
    $table = sasanperfumes_stock_alerts_table();
    if ($wpdb->get_var("SHOW TABLES LIKE '$table'") === $table) return;
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE $table (
        id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id  BIGINT(20) UNSIGNED NOT NULL,
        email       VARCHAR(200) NOT NULL,
        locale      VARCHAR(5)   NOT NULL DEFAULT 'en',
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notified_at DATETIME     DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY email_product (email, product_id),
        KEY product_id (product_id)
    ) $charset;";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function sasanperfumes_stock_alerts_register_routes() {
    sasanperfumes_register_rest_route( '/stock-alerts', [
        ['methods' => 'POST',   'callback' => 'sasanperfumes_stock_alerts_subscribe',   'permission_callback' => '__return_true'],
        ['methods' => 'DELETE', 'callback' => 'sasanperfumes_stock_alerts_unsubscribe', 'permission_callback' => '__return_true'],
    ]);
    sasanperfumes_register_rest_route( '/stock-alerts/check', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_stock_alerts_check',
        'permission_callback' => '__return_true',
    ]);
}

function sasanperfumes_stock_alerts_subscribe(WP_REST_Request $req) {
    global $wpdb;
    $product_id = (int) $req->get_param('product_id');
    $email      = sanitize_email($req->get_param('email') ?? '');
    $locale     = sanitize_text_field($req->get_param('locale') ?? 'en');

    if (!$product_id || !is_email($email)) {
        return new WP_Error('invalid_input', 'Valid product_id and email required.', ['status' => 400]);
    }
    $product = wc_get_product($product_id);
    if (!$product) return new WP_Error('not_found', 'Product not found.', ['status' => 404]);
    if ($product->is_in_stock()) {
        return new WP_Error('in_stock', 'Product is already in stock.', ['status' => 409]);
    }

    $table = sasanperfumes_stock_alerts_table();
    $existing = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE email=%s AND product_id=%d", $email, $product_id));
    if ($existing) return rest_ensure_response(['success' => true, 'message' => 'Already subscribed.']);

    $wpdb->insert($table, ['product_id' => $product_id, 'email' => $email, 'locale' => $locale]);
    return rest_ensure_response(['success' => true, 'message' => 'Subscribed successfully.']);
}

function sasanperfumes_stock_alerts_unsubscribe(WP_REST_Request $req) {
    global $wpdb;
    $product_id = (int) sanitize_text_field($req->get_param('product_id') ?? 0);
    $email      = sanitize_email($req->get_param('email') ?? '');
    if (!$product_id || !is_email($email)) {
        return new WP_Error('invalid_input', 'Valid product_id and email required.', ['status' => 400]);
    }
    $table = sasanperfumes_stock_alerts_table();
    $wpdb->delete($table, ['email' => $email, 'product_id' => $product_id]);
    return rest_ensure_response(['success' => true]);
}

function sasanperfumes_stock_alerts_check(WP_REST_Request $req) {
    global $wpdb;
    $product_id = (int) $req->get_param('product_id');
    $email      = sanitize_email($req->get_param('email') ?? '');
    if (!$product_id || !is_email($email)) return rest_ensure_response(['subscribed' => false]);
    $table = sasanperfumes_stock_alerts_table();
    $row = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE email=%s AND product_id=%d", $email, $product_id));
    return rest_ensure_response(['subscribed' => (bool) $row]);
}

// ---------------------------------------------------------------------------
// Send emails when product comes back in stock
// ---------------------------------------------------------------------------

function sasanperfumes_stock_alerts_on_stock_change($product_id, $status, $product) {
    if ($status !== 'instock') return;
    global $wpdb;
    $table = sasanperfumes_stock_alerts_table();
    $alerts = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table WHERE product_id=%d AND notified_at IS NULL", $product_id
    ));
    if (empty($alerts)) return;

    $product_obj = wc_get_product($product_id);
    if (!$product_obj) return;
    $product_name = $product_obj->get_name();
    $product_url  = home_url('/product/' . $product_obj->get_slug());

    foreach ($alerts as $alert) {
        $subject = $alert->locale === 'ar'
            ? "Ù…Ù†ØªØ¬Ùƒ Ø§Ù„Ù…ÙØ¶Ù„ Ø¹Ø§Ø¯ Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†! - {$product_name}"
            : "Back in Stock: {$product_name}";

        $body = $alert->locale === 'ar'
            ? "<p>Ù…Ø±Ø­Ø¨Ø§Ù‹ØŒ</p><p>Ø§Ù„Ù…Ù†ØªØ¬ Ø§Ù„Ø°ÙŠ Ø·Ù„Ø¨Øª Ø¥Ø´Ø¹Ø§Ø±Ø§Ù‹ Ø¹Ù†Ù‡ Ø£ØµØ¨Ø­ Ù…ØªÙˆÙØ±Ø§Ù‹ Ø§Ù„Ø¢Ù†.</p><p><strong>{$product_name}</strong></p><p><a href='{$product_url}' style='background:#4A1633;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px'>Ø§Ø·Ù„Ø¨ Ø§Ù„Ø¢Ù†</a></p>"
            : "<p>Good news! A product you requested is back in stock.</p><p><strong>{$product_name}</strong></p><p><a href='{$product_url}' style='background:#4A1633;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px'>Shop Now</a></p>";

        wp_mail($alert->email, $subject, $body, ['Content-Type: text/html; charset=UTF-8']);
        $wpdb->update($table, ['notified_at' => current_time('mysql')], ['id' => $alert->id]);
    }
}

// ---------------------------------------------------------------------------
// Admin menu â€” view subscribers
// ---------------------------------------------------------------------------

function sasanperfumes_stock_alerts_register_menu() {
    add_submenu_page(
        'woocommerce',
        'Stock Alert Subscribers',
        'Stock Alerts',
        'manage_woocommerce',
        'sasanperfumes-stock-alerts',
        'sasanperfumes_stock_alerts_render_admin'
    );
}

function sasanperfumes_stock_alerts_render_admin() {
    global $wpdb;
    $table = sasanperfumes_stock_alerts_table();
    $rows  = $wpdb->get_results("SELECT s.*, p.post_title as product_name FROM $table s LEFT JOIN {$wpdb->posts} p ON p.ID=s.product_id ORDER BY s.created_at DESC LIMIT 200");
    ?>
    <div class="wrap">
        <h1>Back in Stock Subscribers</h1>
        <table class="widefat fixed striped">
            <thead><tr><th>ID</th><th>Product</th><th>Email</th><th>Locale</th><th>Subscribed</th><th>Notified</th></tr></thead>
            <tbody>
            <?php foreach ($rows as $r): ?>
                <tr>
                    <td><?=$r->id?></td>
                    <td>[<?=$r->product_id?>] <?=esc_html($r->product_name)?></td>
                    <td><?=esc_html($r->email)?></td>
                    <td><?=esc_html($r->locale)?></td>
                    <td><?=$r->created_at?></td>
                    <td><?=$r->notified_at ?: 'â€”'?></td>
                </tr>
            <?php endforeach; ?>
            <?php if (empty($rows)): ?><tr><td colspan="6">No subscribers yet.</td></tr><?php endif; ?>
            </tbody>
        </table>
    </div>
    <?php
}
