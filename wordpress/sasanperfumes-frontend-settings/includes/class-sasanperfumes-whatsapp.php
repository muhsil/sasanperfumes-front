<?php
/**
 * ShapeHive WhatsApp Floating Button Settings
 *
 * Admin: sasanperfumes → WhatsApp Button
 * REST:  GET /sasanperfumes/v1/whatsapp
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.9.0
 */

if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_submenu_page(
        'sasanperfumes-settings',
        'WhatsApp Button',
        'WhatsApp Button',
        'manage_options',
        'sasanperfumes-whatsapp',
        'sasanperfumes_wa_render'
    );
}, 32);

function sasanperfumes_wa_render() {
    if (!current_user_can('manage_options')) return;

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('sasanperfumes_wa_save')) {
        update_option('sasanperfumes_whatsapp_enabled',       !empty($_POST['sasanperfumes_whatsapp_enabled']) ? '1' : '0');
        update_option('sasanperfumes_whatsapp_number',         sanitize_text_field($_POST['sasanperfumes_whatsapp_number'] ?? ''));
        update_option('sasanperfumes_whatsapp_message_en',     sanitize_textarea_field($_POST['sasanperfumes_whatsapp_message_en'] ?? ''));
        update_option('sasanperfumes_whatsapp_message_ar',     sanitize_textarea_field($_POST['sasanperfumes_whatsapp_message_ar'] ?? ''));
        update_option('sasanperfumes_whatsapp_show_desktop',   !empty($_POST['sasanperfumes_whatsapp_show_desktop']) ? '1' : '0');
        update_option('sasanperfumes_whatsapp_show_mobile',    !empty($_POST['sasanperfumes_whatsapp_show_mobile']) ? '1' : '0');
        update_option('sasanperfumes_whatsapp_position',       sanitize_text_field($_POST['sasanperfumes_whatsapp_position'] ?? 'bottom-left'));
        echo '<div class="notice notice-success"><p>Settings saved.</p></div>';
    }

    $enabled  = get_option('sasanperfumes_whatsapp_enabled', '1');
    $number   = get_option('sasanperfumes_whatsapp_number', '');
    $msgEn    = get_option('sasanperfumes_whatsapp_message_en', 'Hello Sasan Perfumes, I would like to know more about your products and services.');
    $msgAr    = get_option('sasanperfumes_whatsapp_message_ar', 'مرحباً، أود معرفة المزيد عن منتجاتكم وخدماتكم.');
    $desktop  = get_option('sasanperfumes_whatsapp_show_desktop', '1');
    $mobile   = get_option('sasanperfumes_whatsapp_show_mobile', '1');
    $position = get_option('sasanperfumes_whatsapp_position', 'bottom-left');
    ?>
    <div class="wrap">
        <h1>WhatsApp Floating Button</h1>
        <form method="post"><?php wp_nonce_field('sasanperfumes_wa_save'); ?>
        <table class="form-table">
            <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_whatsapp_enabled" value="1" <?php checked($enabled, '1'); ?>> Show WhatsApp floating button</label></td></tr>
            <tr><th>WhatsApp Number</th><td><input type="text" name="sasanperfumes_whatsapp_number" value="<?php echo esc_attr($number); ?>" class="regular-text" placeholder="97143442448"><p class="description">International format without + (e.g., 97143442448)</p></td></tr>
            <tr><th>Default Message (EN)</th><td><textarea name="sasanperfumes_whatsapp_message_en" rows="2" class="large-text"><?php echo esc_textarea($msgEn); ?></textarea></td></tr>
            <tr><th>Default Message (AR)</th><td><textarea name="sasanperfumes_whatsapp_message_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea($msgAr); ?></textarea></td></tr>
            <tr><th>Show on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_whatsapp_show_desktop" value="1" <?php checked($desktop, '1'); ?>> Visible on desktop</label></td></tr>
            <tr><th>Show on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_whatsapp_show_mobile" value="1" <?php checked($mobile, '1'); ?>> Visible on mobile</label></td></tr>
            <tr><th>Position</th><td>
                <select name="sasanperfumes_whatsapp_position">
                    <option value="bottom-left" <?php selected($position, 'bottom-left'); ?>>Bottom Left</option>
                    <option value="bottom-right" <?php selected($position, 'bottom-right'); ?>>Bottom Right</option>
                </select>
            </td></tr>
        </table>
        <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

// REST API
add_action('rest_api_init', function () {
    sasanperfumes_register_rest_route( '/whatsapp', [
        'methods'             => 'GET',
        'callback'            => function () {
            return rest_ensure_response([
                'enabled'     => (bool) get_option('sasanperfumes_whatsapp_enabled', true),
                'number'      => get_option('sasanperfumes_whatsapp_number', ''),
                'message'     => [
                    'en' => get_option('sasanperfumes_whatsapp_message_en', 'Hello Sasan Perfumes, I would like to know more about your products and services.'),
                    'ar' => get_option('sasanperfumes_whatsapp_message_ar', 'مرحباً، أود معرفة المزيد عن منتجاتكم وخدماتكم.'),
                ],
                'showDesktop' => (bool) get_option('sasanperfumes_whatsapp_show_desktop', true),
                'showMobile'  => (bool) get_option('sasanperfumes_whatsapp_show_mobile', true),
                'position'    => get_option('sasanperfumes_whatsapp_position', 'bottom-left'),
            ]);
        },
        'permission_callback' => '__return_true',
    ]);
});
