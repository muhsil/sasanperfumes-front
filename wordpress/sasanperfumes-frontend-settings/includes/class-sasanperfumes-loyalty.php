<?php
/**
 * ShapeHive Loyalty Points & Rewards
 *
 * Awards points on order completion, redeemable as discount coupons.
 *
 * REST endpoints:
 *   GET  /sasanperfumes/v1/loyalty           ?customer_id=   (auth required)
 *   POST /sasanperfumes/v1/loyalty/redeem    { customer_id, points }  → returns coupon_code
 *
 * Settings (sasanperfumes > Loyalty):
 *   - points_per_aed     : points earned per 1 AED spent  (default: 1)
 *   - aed_per_point      : discount per point when redeeming (default: 0.05 AED)
 *   - min_redeem_points  : minimum points needed to redeem  (default: 100)
 *   - enabled            : toggle
 *
 * @since 6.6.0
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init',                         'sasanperfumes_loyalty_register_routes');
add_action('woocommerce_order_status_completed',    'sasanperfumes_loyalty_award_points', 10, 1);
add_action('admin_menu',                            'sasanperfumes_loyalty_register_menu', 99);
add_action('admin_post_sasanperfumes_save_loyalty',         'sasanperfumes_loyalty_save_settings');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sasanperfumes_loyalty_opt($k, $d = '') { return get_option("sasanperfumes_loyalty_{$k}", $d); }
function sasanperfumes_loyalty_get_points(int $customer_id): int {
    return (int) get_user_meta($customer_id, 'sasanperfumes_loyalty_points', true);
}
function sasanperfumes_loyalty_set_points(int $customer_id, int $points): void {
    update_user_meta($customer_id, 'sasanperfumes_loyalty_points', max(0, $points));
}
function sasanperfumes_loyalty_add_points(int $customer_id, int $delta): void {
    sasanperfumes_loyalty_set_points($customer_id, sasanperfumes_loyalty_get_points($customer_id) + $delta);
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function sasanperfumes_loyalty_register_routes() {
    sasanperfumes_register_rest_route( '/loyalty', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_loyalty_get_balance',
        'permission_callback' => 'sasanperfumes_loyalty_auth_check',
    ]);
    sasanperfumes_register_rest_route( '/loyalty/redeem', [
        'methods'             => 'POST',
        'callback'            => 'sasanperfumes_loyalty_redeem',
        'permission_callback' => 'sasanperfumes_loyalty_auth_check',
    ]);
    sasanperfumes_register_rest_route( '/loyalty/settings', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_loyalty_get_settings',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/loyalty/history', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_loyalty_get_history',
        'permission_callback' => 'sasanperfumes_loyalty_auth_check',
    ]);
    sasanperfumes_register_rest_route( '/loyalty/admin/adjust', [
        'methods'             => 'POST',
        'callback'            => 'sasanperfumes_loyalty_admin_adjust',
        'permission_callback' => fn() => current_user_can('manage_woocommerce'),
    ]);
}

function sasanperfumes_loyalty_auth_check() {
    return is_user_logged_in() || current_user_can('manage_woocommerce');
}

function sasanperfumes_loyalty_get_settings() {
    return rest_ensure_response([
        'enabled'           => (bool) sasanperfumes_loyalty_opt('enabled', true),
        'points_per_aed'    => (float) sasanperfumes_loyalty_opt('points_per_aed', 1),
        'aed_per_point'     => (float) sasanperfumes_loyalty_opt('aed_per_point', 0.05),
        'min_redeem_points' => (int)   sasanperfumes_loyalty_opt('min_redeem_points', 100),
        'label_en'          => sasanperfumes_loyalty_opt('label_en', 'Sasan Perfumes Points'),
        'label_ar'          => sasanperfumes_loyalty_opt('label_ar', 'نقاط عنبر'),
    ]);
}

function sasanperfumes_loyalty_get_balance(WP_REST_Request $req) {
    $customer_id = (int) $req->get_param('customer_id');
    if (!$customer_id) $customer_id = get_current_user_id();
    if (!$customer_id) return new WP_Error('unauthorized', 'Login required.', ['status' => 401]);

    $points = sasanperfumes_loyalty_get_points($customer_id);
    $aed_per_point = (float) sasanperfumes_loyalty_opt('aed_per_point', 0.05);
    $min = (int) sasanperfumes_loyalty_opt('min_redeem_points', 100);

    return rest_ensure_response([
        'points'        => $points,
        'value_aed'     => round($points * $aed_per_point, 2),
        'can_redeem'    => $points >= $min,
        'min_to_redeem' => $min,
    ]);
}

function sasanperfumes_loyalty_redeem(WP_REST_Request $req) {
    $customer_id = (int) $req->get_param('customer_id');
    if (!$customer_id) $customer_id = get_current_user_id();
    if (!$customer_id) return new WP_Error('unauthorized', 'Login required.', ['status' => 401]);

    $points_to_redeem = (int) $req->get_param('points');
    $min = (int) sasanperfumes_loyalty_opt('min_redeem_points', 100);
    $current = sasanperfumes_loyalty_get_points($customer_id);

    if ($points_to_redeem < $min)   return new WP_Error('below_min', "Minimum {$min} points required.", ['status' => 400]);
    if ($points_to_redeem > $current) return new WP_Error('insufficient', 'Not enough points.', ['status' => 400]);

    $aed_per_point = (float) sasanperfumes_loyalty_opt('aed_per_point', 0.05);
    $discount = round($points_to_redeem * $aed_per_point, 2);

    // Generate a unique coupon
    $code = 'LOYALTY-' . strtoupper(wp_generate_password(8, false));
    $coupon = new WC_Coupon();
    $coupon->set_code($code);
    $coupon->set_discount_type('fixed_cart');
    $coupon->set_amount($discount);
    $coupon->set_usage_limit(1);
    $coupon->set_usage_limit_per_user(1);
    $coupon->set_email_restrictions([$customer_id ? get_user_by('id', $customer_id)->user_email : '']);
    $coupon->set_date_expires(strtotime('+30 days'));
    $coupon->save();

    sasanperfumes_loyalty_add_points($customer_id, -$points_to_redeem);

    // Log redemption
    add_user_meta($customer_id, 'sasanperfumes_loyalty_history', [
        'type'    => 'redeem',
        'points'  => -$points_to_redeem,
        'note'    => "Redeemed for coupon {$code} (AED {$discount})",
        'date'    => current_time('mysql'),
    ]);

    return rest_ensure_response([
        'success'      => true,
        'coupon_code'  => $code,
        'discount_aed' => $discount,
        'points_left'  => sasanperfumes_loyalty_get_points($customer_id),
    ]);
}

function sasanperfumes_loyalty_get_history(WP_REST_Request $req) {
    $customer_id = (int) $req->get_param('customer_id');
    if (!$customer_id) $customer_id = get_current_user_id();
    if (!$customer_id) return new WP_Error('unauthorized', 'Login required.', ['status' => 401]);

    $entries = get_user_meta($customer_id, 'sasanperfumes_loyalty_history');
    if (!is_array($entries)) $entries = [];
    // Sort newest first
    usort($entries, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));
    return rest_ensure_response(array_slice($entries, 0, 30));
}

function sasanperfumes_loyalty_admin_adjust(WP_REST_Request $req) {
    $customer_id = (int) $req->get_param('customer_id');
    $delta       = (int) $req->get_param('delta');
    $note        = sanitize_text_field($req->get_param('note') ?? 'Admin adjustment');
    if (!$customer_id) return new WP_Error('missing_customer', 'customer_id required.', ['status' => 400]);

    sasanperfumes_loyalty_add_points($customer_id, $delta);
    add_user_meta($customer_id, 'sasanperfumes_loyalty_history', [
        'type'  => $delta >= 0 ? 'earn' : 'redeem',
        'points' => $delta,
        'note'  => $note,
        'date'  => current_time('mysql'),
    ]);

    return rest_ensure_response(['success' => true, 'points' => sasanperfumes_loyalty_get_points($customer_id)]);
}

// ---------------------------------------------------------------------------
// Award points on completed order
// ---------------------------------------------------------------------------

function sasanperfumes_loyalty_award_points(int $order_id) {
    if (!(bool) sasanperfumes_loyalty_opt('enabled', true)) return;
    $order = wc_get_order($order_id);
    if (!$order) return;

    $customer_id = $order->get_customer_id();
    if (!$customer_id) return;

    // Avoid double-awarding
    if (get_post_meta($order_id, '_sasanperfumes_loyalty_awarded', true)) return;

    $total = (float) $order->get_subtotal();
    $rate  = (float) sasanperfumes_loyalty_opt('points_per_aed', 1);
    $points = (int) floor($total * $rate);
    if ($points <= 0) return;

    sasanperfumes_loyalty_add_points($customer_id, $points);
    update_post_meta($order_id, '_sasanperfumes_loyalty_awarded', $points);

    add_user_meta($customer_id, 'sasanperfumes_loyalty_history', [
        'type'    => 'earn',
        'points'  => $points,
        'note'    => "Earned from order #{$order_id}",
        'date'    => current_time('mysql'),
    ]);

    $order->add_order_note("Awarded {$points} Sasan Perfumes loyalty points to customer.");
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

function sasanperfumes_loyalty_register_menu() {
    add_submenu_page('sasanperfumes-settings', 'Loyalty Points', 'Loyalty Points', 'manage_options', 'sasanperfumes-loyalty', 'sasanperfumes_loyalty_render_page');
}

function sasanperfumes_loyalty_save_settings() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_loyalty')) wp_die('Unauthorized');
    update_option('sasanperfumes_loyalty_enabled',           !empty($_POST['sasanperfumes_loyalty_enabled']) ? 1 : 0);
    update_option('sasanperfumes_loyalty_points_per_aed',    (float) ($_POST['sasanperfumes_loyalty_points_per_aed']  ?? 1));
    update_option('sasanperfumes_loyalty_aed_per_point',     (float) ($_POST['sasanperfumes_loyalty_aed_per_point']   ?? 0.05));
    update_option('sasanperfumes_loyalty_min_redeem_points', (int)   ($_POST['sasanperfumes_loyalty_min_redeem_points'] ?? 100));
    update_option('sasanperfumes_loyalty_label_en',          sanitize_text_field($_POST['sasanperfumes_loyalty_label_en'] ?? 'Sasan Perfumes Points'));
    update_option('sasanperfumes_loyalty_label_ar',          sanitize_text_field($_POST['sasanperfumes_loyalty_label_ar'] ?? 'نقاط عنبر'));
    wp_redirect(admin_url('admin.php?page=sasanperfumes-loyalty&saved=1')); exit;
}

function sasanperfumes_loyalty_render_page() {
    $g = fn($k,$d='')=>get_option($k,$d);
    $saved = !empty($_GET['saved']);
    $lookup_email = isset($_POST['lookup_email']) ? sanitize_email($_POST['lookup_email']) : '';
    $lookup_user  = $lookup_email ? get_user_by('email', $lookup_email) : null;
    $lookup_adjust_msg = '';

    // Handle manual point adjustment
    if (isset($_POST['sasanperfumes_adjust_points']) && check_admin_referer('sasanperfumes_adjust_loyalty')) {
        $adj_customer = (int) ($_POST['adj_customer_id'] ?? 0);
        $adj_delta    = (int) ($_POST['adj_delta'] ?? 0);
        $adj_note     = sanitize_text_field($_POST['adj_note'] ?? 'Admin manual adjustment');
        if ($adj_customer && $adj_delta !== 0) {
            sasanperfumes_loyalty_add_points($adj_customer, $adj_delta);
            add_user_meta($adj_customer, 'sasanperfumes_loyalty_history', [
                'type'   => $adj_delta >= 0 ? 'earn' : 'redeem',
                'points' => $adj_delta,
                'note'   => $adj_note,
                'date'   => current_time('mysql'),
            ]);
            $lookup_adjust_msg = "Adjusted " . ($adj_delta >= 0 ? "+{$adj_delta}" : "{$adj_delta}") . " points. New balance: " . sasanperfumes_loyalty_get_points($adj_customer);
            if ($lookup_email) $lookup_user = get_user_by('email', $lookup_email);
        }
    }
    ?>
    <div class="wrap">
        <h1>Loyalty Points Settings</h1>
        <?php if ($saved): ?><div class="notice notice-success is-dismissible"><p>Settings saved.</p></div><?php endif; ?>

        <!-- Settings Form -->
        <form method="post" action="<?= admin_url('admin-post.php') ?>">
            <?php wp_nonce_field('sasanperfumes_save_loyalty'); ?>
            <input type="hidden" name="action" value="sasanperfumes_save_loyalty">
            <table class="form-table">
                <tr><th>Enable Loyalty Program</th><td><input type="checkbox" name="sasanperfumes_loyalty_enabled" value="1" <?=checked($g('sasanperfumes_loyalty_enabled',1),1,false)?>></td></tr>
                <tr><th>Points per AED spent</th><td><input type="number" step="0.1" name="sasanperfumes_loyalty_points_per_aed" value="<?=esc_attr($g('sasanperfumes_loyalty_points_per_aed',1))?>"><br><small>e.g. 1 = earn 1 point per AED</small></td></tr>
                <tr><th>AED value per point</th><td><input type="number" step="0.01" name="sasanperfumes_loyalty_aed_per_point" value="<?=esc_attr($g('sasanperfumes_loyalty_aed_per_point',0.05))?>"><br><small>e.g. 0.05 = each point = 0.05 AED discount</small></td></tr>
                <tr><th>Min points to redeem</th><td><input type="number" name="sasanperfumes_loyalty_min_redeem_points" value="<?=esc_attr($g('sasanperfumes_loyalty_min_redeem_points',100))?>"></td></tr>
                <tr><th>Program name (EN)</th><td><input type="text" name="sasanperfumes_loyalty_label_en" value="<?=esc_attr($g('sasanperfumes_loyalty_label_en','Sasan Perfumes Points'))?>" class="regular-text"></td></tr>
                <tr><th>Program name (AR)</th><td><input type="text" name="sasanperfumes_loyalty_label_ar" value="<?=esc_attr($g('sasanperfumes_loyalty_label_ar','نقاط عنبر'))?>" class="regular-text" dir="rtl"></td></tr>
            </table>
            <?php submit_button('Save Loyalty Settings'); ?>
        </form>

        <hr>
        <h2>Customer Balance Lookup</h2>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_adjust_loyalty'); ?>
            <table class="form-table">
                <tr><th>Customer Email</th><td>
                    <input type="email" name="lookup_email" value="<?=esc_attr($lookup_email)?>" class="regular-text" placeholder="customer@example.com">
                    <button type="submit" class="button">Look Up</button>
                </td></tr>
            </table>
        </form>

        <?php if ($lookup_adjust_msg): ?>
            <div class="notice notice-success inline"><p><?=esc_html($lookup_adjust_msg)?></p></div>
        <?php endif; ?>

        <?php if ($lookup_user && $lookup_email): ?>
            <?php
            $cid    = $lookup_user->ID;
            $points = sasanperfumes_loyalty_get_points($cid);
            $history = get_user_meta($cid, 'sasanperfumes_loyalty_history') ?: [];
            usort($history, fn($a,$b) => strcmp($b['date']??'',$a['date']??''));
            ?>
            <div style="background:#fff;border:1px solid #ccd0d4;padding:20px;margin-top:15px;max-width:700px;">
                <h3><?=esc_html($lookup_user->display_name)?> (<?=esc_html($lookup_email)?>)</h3>
                <p><strong>Current Points:</strong> <?=number_format($points)?></p>
                <p><strong>AED Value:</strong> <?=number_format($points * (float)$g('sasanperfumes_loyalty_aed_per_point',0.05),2)?></p>

                <h4 style="margin-top:15px;">Manual Adjustment</h4>
                <form method="post" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
                    <?php wp_nonce_field('sasanperfumes_adjust_loyalty'); ?>
                    <input type="hidden" name="lookup_email" value="<?=esc_attr($lookup_email)?>">
                    <input type="hidden" name="adj_customer_id" value="<?=$cid?>">
                    <div>
                        <label style="display:block;font-weight:600;margin-bottom:4px;">Points (use negative to deduct)</label>
                        <input type="number" name="adj_delta" value="" class="small-text" placeholder="e.g. 50 or -25">
                    </div>
                    <div>
                        <label style="display:block;font-weight:600;margin-bottom:4px;">Reason</label>
                        <input type="text" name="adj_note" value="" class="regular-text" placeholder="Admin adjustment">
                    </div>
                    <button type="submit" name="sasanperfumes_adjust_points" value="1" class="button button-primary">Apply</button>
                </form>

                <?php if (!empty($history)): ?>
                <h4 style="margin-top:20px;">Transaction History (last 20)</h4>
                <table class="widefat striped" style="margin-top:8px;">
                    <thead><tr><th>Date</th><th>Type</th><th>Points</th><th>Note</th></tr></thead>
                    <tbody>
                    <?php foreach(array_slice($history,0,20) as $h): ?>
                        <tr>
                            <td><?=esc_html($h['date']??'')?></td>
                            <td><?=esc_html(ucfirst($h['type']??''))?></td>
                            <td style="color:<?=($h['points']??0)>=0?'green':'red'?>"><?=($h['points']??0)>=0?'+':''?><?=(int)($h['points']??0)?></td>
                            <td><?=esc_html($h['note']??'')?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
                <?php endif; ?>
            </div>
        <?php elseif ($lookup_email && !$lookup_user): ?>
            <div class="notice notice-warning inline"><p>No user found with email: <?=esc_html($lookup_email)?></p></div>
        <?php endif; ?>
    </div>
    <?php
}
