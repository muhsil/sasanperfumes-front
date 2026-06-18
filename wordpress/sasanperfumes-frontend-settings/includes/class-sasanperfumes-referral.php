<?php
/**
 * ShapeHive Referral Program
 *
 * Each customer gets a unique referral code. When a new user registers
 * using that code (via ?ref=CODE in the URL, stored in a cookie/meta),
 * both the referrer and the new user get a discount coupon on next order.
 *
 * REST endpoints:
 *   GET  /sasanperfumes/v1/referral           ?customer_id=
 *   POST /sasanperfumes/v1/referral/register  { referral_code, new_customer_id }
 *
 * @since 6.6.0
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init',                     'sasanperfumes_referral_register_routes');
add_action('user_register',                     'sasanperfumes_referral_assign_code', 10, 1);
add_action('admin_menu',                        'sasanperfumes_referral_register_menu', 99);
add_action('admin_post_sasanperfumes_save_referral',    'sasanperfumes_referral_save_settings');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sasanperfumes_referral_opt($k, $d = '') { return get_option("sasanperfumes_referral_{$k}", $d); }

function sasanperfumes_referral_get_code(int $user_id): string {
    $code = get_user_meta($user_id, 'sasanperfumes_referral_code', true);
    if (!$code) {
        $code = strtoupper(substr(md5($user_id . wp_salt()), 0, 8));
        update_user_meta($user_id, 'sasanperfumes_referral_code', $code);
    }
    return $code;
}

function sasanperfumes_referral_generate_coupon(string $prefix, float $amount, string $email): string {
    $code = strtoupper($prefix . '-' . wp_generate_password(6, false));
    $c = new WC_Coupon();
    $c->set_code($code);
    $c->set_discount_type('fixed_cart');
    $c->set_amount($amount);
    $c->set_usage_limit(1);
    $c->set_usage_limit_per_user(1);
    if ($email) $c->set_email_restrictions([$email]);
    $c->set_date_expires(strtotime('+60 days'));
    $c->save();
    return $code;
}

// ---------------------------------------------------------------------------
// Auto-assign referral code on registration
// ---------------------------------------------------------------------------

function sasanperfumes_referral_assign_code(int $user_id) {
    sasanperfumes_referral_get_code($user_id); // creates if not exists
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function sasanperfumes_referral_register_routes() {
    sasanperfumes_register_rest_route( '/referral', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_referral_get_info',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/referral/settings', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_referral_get_settings',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/referral/register', [
        'methods'             => 'POST',
        'callback'            => 'sasanperfumes_referral_process',
        'permission_callback' => '__return_true',
    ]);
}

function sasanperfumes_referral_get_settings() {
    return rest_ensure_response([
        'enabled'              => (bool) sasanperfumes_referral_opt('enabled', true),
        'referrer_discount'    => (float) sasanperfumes_referral_opt('referrer_discount', 25),
        'referee_discount'     => (float) sasanperfumes_referral_opt('referee_discount', 15),
        'title_en'             => sasanperfumes_referral_opt('title_en', 'Refer a Friend'),
        'title_ar'             => sasanperfumes_referral_opt('title_ar', 'أحل صديقاً'),
        'desc_en'              => sasanperfumes_referral_opt('desc_en', 'Share your code and both get a discount!'),
        'desc_ar'              => sasanperfumes_referral_opt('desc_ar', 'شارك كودك وكلاكما يحصل على خصم!'),
    ]);
}

function sasanperfumes_referral_get_info(WP_REST_Request $req) {
    $customer_id = (int) $req->get_param('customer_id') ?: get_current_user_id();
    if (!$customer_id) return new WP_Error('unauthorized', 'Login required.', ['status' => 401]);

    $code     = sasanperfumes_referral_get_code($customer_id);
    $referred = (int) get_user_meta($customer_id, 'sasanperfumes_referral_count', true);
    $site_url = sasanperfumes_get_frontend_url(home_url());

    return rest_ensure_response([
        'referral_code'  => $code,
        'referral_url'   => "{$site_url}/register?ref={$code}",
        'referral_count' => $referred,
    ]);
}

function sasanperfumes_referral_process(WP_REST_Request $req) {
    $referral_code   = strtoupper(sanitize_text_field($req->get_param('referral_code') ?? ''));
    $new_customer_id = (int) $req->get_param('new_customer_id');

    if (!$referral_code || !$new_customer_id) {
        return new WP_Error('invalid_input', 'referral_code and new_customer_id required.', ['status' => 400]);
    }

    // Already processed?
    if (get_user_meta($new_customer_id, 'sasanperfumes_referred_by', true)) {
        return rest_ensure_response(['success' => true, 'message' => 'Already processed.']);
    }

    // Find referrer by code
    $users = get_users(['meta_key' => 'sasanperfumes_referral_code', 'meta_value' => $referral_code, 'number' => 1]);
    if (empty($users)) return new WP_Error('invalid_code', 'Invalid referral code.', ['status' => 404]);

    $referrer = $users[0];
    if ($referrer->ID === $new_customer_id) return new WP_Error('self_ref', 'Cannot refer yourself.', ['status' => 400]);

    $referrer_discount = (float) sasanperfumes_referral_opt('referrer_discount', 25);
    $referee_discount  = (float) sasanperfumes_referral_opt('referee_discount', 15);

    // Coupon for referrer
    $ref_email   = $referrer->user_email;
    $ref_coupon  = sasanperfumes_referral_generate_coupon('REF', $referrer_discount, $ref_email);

    // Coupon for new customer
    $new_user    = get_user_by('id', $new_customer_id);
    $new_coupon  = sasanperfumes_referral_generate_coupon('WELCOME', $referee_discount, $new_user ? $new_user->user_email : '');

    // Store metadata
    update_user_meta($new_customer_id, 'sasanperfumes_referred_by', $referrer->ID);
    $count = (int) get_user_meta($referrer->ID, 'sasanperfumes_referral_count', true);
    update_user_meta($referrer->ID, 'sasanperfumes_referral_count', $count + 1);

    // Email referrer
    if ($ref_email) {
        wp_mail($ref_email, 'Someone used your referral code!',
            "<p>A friend registered using your referral code. Your reward coupon: <strong>{$ref_coupon}</strong> (AED {$referrer_discount} off)</p>",
            ['Content-Type: text/html; charset=UTF-8']
        );
    }

    return rest_ensure_response([
        'success'        => true,
        'referee_coupon' => $new_coupon,
        'discount_aed'   => $referee_discount,
    ]);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

function sasanperfumes_referral_register_menu() {
    add_submenu_page('sasanperfumes-settings', 'Referral Program', 'Referral', 'manage_options', 'sasanperfumes-referral', 'sasanperfumes_referral_render_page');
}

function sasanperfumes_referral_save_settings() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_referral')) wp_die('Unauthorized');
    update_option('sasanperfumes_referral_enabled',           !empty($_POST['enabled']) ? 1 : 0);
    update_option('sasanperfumes_referral_referrer_discount', (float) ($_POST['referrer_discount'] ?? 25));
    update_option('sasanperfumes_referral_referee_discount',  (float) ($_POST['referee_discount']  ?? 15));
    update_option('sasanperfumes_referral_title_en',          sanitize_text_field($_POST['title_en'] ?? 'Refer a Friend'));
    update_option('sasanperfumes_referral_title_ar',          sanitize_text_field($_POST['title_ar'] ?? 'أحل صديقاً'));
    update_option('sasanperfumes_referral_desc_en',           sanitize_textarea_field($_POST['desc_en'] ?? ''));
    update_option('sasanperfumes_referral_desc_ar',           sanitize_textarea_field($_POST['desc_ar'] ?? ''));
    wp_redirect(admin_url('admin.php?page=sasanperfumes-referral&saved=1')); exit;
}

function sasanperfumes_referral_render_page() {
    $g = fn($k,$d='')=>get_option($k,$d);
    $saved = !empty($_GET['saved']);
    ?>
    <div class="wrap">
        <h1>Referral Program</h1>
        <?php if ($saved): ?><div class="notice notice-success is-dismissible"><p>Saved.</p></div><?php endif; ?>
        <form method="post" action="<?= admin_url('admin-post.php') ?>">
            <?php wp_nonce_field('sasanperfumes_save_referral'); ?>
            <input type="hidden" name="action" value="sasanperfumes_save_referral">
            <table class="form-table">
                <tr><th>Enable</th><td><input type="checkbox" name="enabled" value="1" <?=checked($g('sasanperfumes_referral_enabled',1),1,false)?>></td></tr>
                <tr><th>Referrer discount (AED)</th><td><input type="number" step="1" name="referrer_discount" value="<?=esc_attr($g('sasanperfumes_referral_referrer_discount',25))?>"><br><small>Reward for the person who shared the code</small></td></tr>
                <tr><th>New customer discount (AED)</th><td><input type="number" step="1" name="referee_discount" value="<?=esc_attr($g('sasanperfumes_referral_referee_discount',15))?>"><br><small>Reward for the new customer who used the code</small></td></tr>
                <tr><th>Title (EN)</th><td><input type="text" name="title_en" value="<?=esc_attr($g('sasanperfumes_referral_title_en','Refer a Friend'))?>" class="large-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="title_ar" value="<?=esc_attr($g('sasanperfumes_referral_title_ar','أحل صديقاً'))?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>Description (EN)</th><td><textarea name="desc_en" rows="3" class="large-text"><?=esc_textarea($g('sasanperfumes_referral_desc_en','Share your code and both get a discount!'))?></textarea></td></tr>
                <tr><th>Description (AR)</th><td><textarea name="desc_ar" rows="3" class="large-text" dir="rtl"><?=esc_textarea($g('sasanperfumes_referral_desc_ar','شارك كودك وكلاكما يحصل على خصم!'))?></textarea></td></tr>
            </table>
            <?php submit_button('Save Referral Settings'); ?>
        </form>
    </div>
    <?php
}
