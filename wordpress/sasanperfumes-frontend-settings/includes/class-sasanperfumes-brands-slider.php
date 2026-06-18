<?php
/**
 * Sasan Perfumes Brands Slider
 *
 * Admin page and REST API endpoint for the homepage brands/partners logo slider.
 * Each brand has a name, image URL, and optional link.
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.6.2
 */

if (!defined('ABSPATH')) exit;

function sasanperfumes_brands_slider_init() {
    add_action('admin_menu',    'sasanperfumes_brands_slider_register_menu');
    add_action('rest_api_init', 'sasanperfumes_brands_slider_register_rest');
}

function sasanperfumes_brands_slider_register_menu() {
    add_submenu_page(
        'sasanperfumes-settings',
        'Brands Slider',
        'Brands Slider',
        'manage_options',
        'sasanperfumes-settings-brands-slider',
        'sasanperfumes_brands_slider_render_page'
    );
}

function sasanperfumes_brands_slider_register_rest() {
    sasanperfumes_register_rest_route( '/brands-slider', array(
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_brands_slider_get',
        'permission_callback' => '__return_true',
    ));
}

function sasanperfumes_brands_slider_render_page() {
    if (!current_user_can('manage_options')) return;

    if (isset($_POST['sasanperfumes_save_brands_slider']) && check_admin_referer('sasanperfumes_brands_slider_nonce')) {
        $brands = array();
        foreach ((array)($_POST['sasanperfumes_brands'] ?? array()) as $item) {
            $row = array(
                'name'    => sanitize_text_field($item['name']  ?? ''),
                'image'   => esc_url_raw($item['image']         ?? ''),
                'url'     => sasanperfumes_sanitize_link($item['url']   ?? ''),
                'enabled' => !empty($item['enabled']),
            );
            if (!empty($row['image'])) {
                $brands[] = $row;
            }
        }
        set_theme_mod('sasanperfumes_brands_slider_enabled', !empty($_POST['sasanperfumes_brands_slider_enabled']));
        set_theme_mod('sasanperfumes_brands_slider_heading_en', sanitize_text_field($_POST['sasanperfumes_brands_slider_heading_en'] ?? ''));
        set_theme_mod('sasanperfumes_brands_slider_heading_ar', sanitize_text_field($_POST['sasanperfumes_brands_slider_heading_ar'] ?? ''));
        set_theme_mod('sasanperfumes_brands_slider_subtitle_en', sanitize_text_field($_POST['sasanperfumes_brands_slider_subtitle_en'] ?? ''));
        set_theme_mod('sasanperfumes_brands_slider_subtitle_ar', sanitize_text_field($_POST['sasanperfumes_brands_slider_subtitle_ar'] ?? ''));
        // Slider options
        set_theme_mod('sasanperfumes_brands_slider_desktop_count', max(1, (int)($_POST['sasanperfumes_brands_slider_desktop_count'] ?? 6)));
        set_theme_mod('sasanperfumes_brands_slider_tablet_count', max(1, (int)($_POST['sasanperfumes_brands_slider_tablet_count'] ?? 4)));
        set_theme_mod('sasanperfumes_brands_slider_mobile_count', max(1, (int)($_POST['sasanperfumes_brands_slider_mobile_count'] ?? 2)));
        set_theme_mod('sasanperfumes_brands_slider_autoplay', !empty($_POST['sasanperfumes_brands_slider_autoplay']));
        set_theme_mod('sasanperfumes_brands_slider_autoplay_speed', max(1000, (int)($_POST['sasanperfumes_brands_slider_autoplay_speed'] ?? 3000)));
        set_theme_mod('sasanperfumes_brands_slider_loop', !empty($_POST['sasanperfumes_brands_slider_loop']));
        set_theme_mod('sasanperfumes_brands_slider_arrows', !empty($_POST['sasanperfumes_brands_slider_arrows']));
        set_theme_mod('sasanperfumes_brands_slider_dots', !empty($_POST['sasanperfumes_brands_slider_dots']));
        set_theme_mod('sasanperfumes_brands', $brands);
        echo '<div class="notice notice-success is-dismissible"><p>Brands Slider saved!</p></div>';
    }

    $enabled         = get_theme_mod('sasanperfumes_brands_slider_enabled', false);
    $heading_en      = get_theme_mod('sasanperfumes_brands_slider_heading_en', 'Our Brands');
    $heading_ar      = get_theme_mod('sasanperfumes_brands_slider_heading_ar', 'Ø¹Ù„Ø§Ù…Ø§ØªÙ†Ø§ Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©');
    $subtitle_en     = get_theme_mod('sasanperfumes_brands_slider_subtitle_en', '');
    $subtitle_ar     = get_theme_mod('sasanperfumes_brands_slider_subtitle_ar', '');
    $desktop_count   = get_theme_mod('sasanperfumes_brands_slider_desktop_count', 6);
    $tablet_count    = get_theme_mod('sasanperfumes_brands_slider_tablet_count', 4);
    $mobile_count    = get_theme_mod('sasanperfumes_brands_slider_mobile_count', 2);
    $autoplay        = get_theme_mod('sasanperfumes_brands_slider_autoplay', true);
    $autoplay_speed  = get_theme_mod('sasanperfumes_brands_slider_autoplay_speed', 3000);
    $loop            = get_theme_mod('sasanperfumes_brands_slider_loop', true);
    $arrows          = get_theme_mod('sasanperfumes_brands_slider_arrows', false);
    $dots            = get_theme_mod('sasanperfumes_brands_slider_dots', false);
    $brands          = get_theme_mod('sasanperfumes_brands', array());
    if (!is_array($brands)) $brands = array();
    ?>
    <div class="wrap">
        <h1>Brands Slider</h1>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_brands_slider_nonce'); ?>
            <table class="form-table">
                <tr>
                    <th>Enable Section</th>
                    <td><label><input type="checkbox" name="sasanperfumes_brands_slider_enabled" value="1" <?php checked($enabled); ?>> Show brands slider on homepage</label></td>
                </tr>
                <tr>
                    <th>Heading (EN)</th>
                    <td><input type="text" name="sasanperfumes_brands_slider_heading_en" value="<?php echo esc_attr($heading_en); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th>Heading (AR)</th>
                    <td><input type="text" name="sasanperfumes_brands_slider_heading_ar" value="<?php echo esc_attr($heading_ar); ?>" class="regular-text" dir="rtl"></td>
                </tr>
                <tr>
                    <th>Subtitle (EN)</th>
                    <td><input type="text" name="sasanperfumes_brands_slider_subtitle_en" value="<?php echo esc_attr($subtitle_en); ?>" class="large-text" placeholder="e.g. Explore our signature fragrance brands crafted for every mood and occasion."></td>
                </tr>
                <tr>
                    <th>Subtitle (AR)</th>
                    <td><input type="text" name="sasanperfumes_brands_slider_subtitle_ar" value="<?php echo esc_attr($subtitle_ar); ?>" class="large-text" dir="rtl" placeholder="e.g. Ø§ÙƒØªØ´Ù Ø¹Ù„Ø§Ù…Ø§ØªÙ†Ø§ Ø§Ù„Ø¹Ø·Ø±ÙŠØ© Ø§Ù„Ù…ØµÙ…Ù…Ø© Ù„ÙƒÙ„ Ø°ÙˆÙ‚ ÙˆÙ…Ù†Ø§Ø³Ø¨Ø©."></td>
                </tr>
            </table>

            <h2 style="margin-top:20px;">Slider Options</h2>
            <table class="form-table">
                <tr>
                    <th>Desktop Items</th>
                    <td><input type="number" name="sasanperfumes_brands_slider_desktop_count" value="<?php echo esc_attr($desktop_count); ?>" min="1" max="12" class="small-text"></td>
                </tr>
                <tr>
                    <th>Tablet Items</th>
                    <td><input type="number" name="sasanperfumes_brands_slider_tablet_count" value="<?php echo esc_attr($tablet_count); ?>" min="1" max="8" class="small-text"></td>
                </tr>
                <tr>
                    <th>Mobile Items</th>
                    <td><input type="number" name="sasanperfumes_brands_slider_mobile_count" value="<?php echo esc_attr($mobile_count); ?>" min="1" max="4" class="small-text"></td>
                </tr>
                <tr>
                    <th>Autoplay</th>
                    <td><label><input type="checkbox" name="sasanperfumes_brands_slider_autoplay" value="1" <?php checked($autoplay); ?>> Enable autoplay</label></td>
                </tr>
                <tr>
                    <th>Autoplay Speed</th>
                    <td><input type="number" name="sasanperfumes_brands_slider_autoplay_speed" value="<?php echo esc_attr($autoplay_speed); ?>" min="1000" max="10000" class="small-text"> ms</td>
                </tr>
                <tr>
                    <th>Loop</th>
                    <td><label><input type="checkbox" name="sasanperfumes_brands_slider_loop" value="1" <?php checked($loop); ?>> Enable loop</label></td>
                </tr>
                <tr>
                    <th>Show Arrows</th>
                    <td><label><input type="checkbox" name="sasanperfumes_brands_slider_arrows" value="1" <?php checked($arrows); ?>> Show navigation arrows</label></td>
                </tr>
                <tr>
                    <th>Show Dots</th>
                    <td><label><input type="checkbox" name="sasanperfumes_brands_slider_dots" value="1" <?php checked($dots); ?>> Show pagination dots</label></td>
                </tr>
            </table>

            <h2 style="margin-top:20px;">Brand Logos <button type="button" class="button" id="sasanperfumes-add-brand">+ Add Brand</button></h2>
            <p class="description">Each brand needs at least an image. Name and link are optional.</p>
            <div id="sasanperfumes-brands-list">
                <?php foreach ($brands as $i => $brand): ?>
                <div class="sasanperfumes-brand-item" style="background:#f9f9f9;padding:15px;margin-bottom:10px;border:1px solid #ddd;max-width:700px;">
                    <h4>Brand <?php echo $i + 1; ?> <button type="button" class="button sasanperfumes-remove-brand" style="float:right;color:red;">Remove</button></h4>
                    <table class="form-table">
                        <tr>
                            <th style="width:130px;">Active</th>
                            <td><label><input type="hidden" name="sasanperfumes_brands[<?php echo $i; ?>][enabled]" value="0"><input type="checkbox" name="sasanperfumes_brands[<?php echo $i; ?>][enabled]" value="1" <?php checked($brand['enabled'] ?? true); ?>> Show this brand</label></td>
                        </tr>
                        <tr>
                            <th style="width:130px;">Name</th>
                            <td><input type="text" name="sasanperfumes_brands[<?php echo $i; ?>][name]" value="<?php echo esc_attr($brand['name'] ?? ''); ?>" class="regular-text" placeholder="Brand name (optional)"></td>
                        </tr>
                        <tr>
                            <th>Image</th>
                            <td>
                                <?php if (!empty($brand['image'])): ?>
                                    <img src="<?php echo esc_url($brand['image']); ?>" style="max-height:60px;margin-bottom:8px;display:block;">
                                <?php endif; ?>
                                <input type="text" name="sasanperfumes_brands[<?php echo $i; ?>][image]" value="<?php echo esc_attr($brand['image'] ?? ''); ?>" class="large-text sasanperfumes-image-url" placeholder="https://...">
                                <button type="button" class="button sasanperfumes-upload-image">Upload Image</button>
                            </td>
                        </tr>
                        <tr>
                            <th>Link URL</th>
                            <td><input type="text" name="sasanperfumes_brands[<?php echo $i; ?>][url]" value="<?php echo esc_attr($brand['url'] ?? ''); ?>" class="large-text" placeholder="/shop or https://brand.com (optional)"></td>
                        </tr>
                    </table>
                </div>
                <?php endforeach; ?>
            </div>

            <?php submit_button('Save Brands Slider', 'primary', 'sasanperfumes_save_brands_slider'); ?>
        </form>
    </div>
    <script>
    jQuery(function($) {
        var count = <?php echo count($brands); ?>;

        function brandHtml(i) {
            return '<div class="sasanperfumes-brand-item" style="background:#f9f9f9;padding:15px;margin-bottom:10px;border:1px solid #ddd;max-width:700px;">' +
                '<h4>Brand ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-brand" style="float:right;color:red;">Remove</button></h4>' +
                '<table class="form-table">' +
                '<tr><th style="width:130px;">Active</th><td><label><input type="hidden" name="sasanperfumes_brands[' + i + '][enabled]" value="0"><input type="checkbox" name="sasanperfumes_brands[' + i + '][enabled]" value="1" checked> Show this brand</label></td></tr>' +
                '<tr><th style="width:130px;">Name</th><td><input type="text" name="sasanperfumes_brands[' + i + '][name]" value="" class="regular-text" placeholder="Brand name (optional)"></td></tr>' +
                '<tr><th>Image</th><td><input type="text" name="sasanperfumes_brands[' + i + '][image]" value="" class="large-text sasanperfumes-image-url" placeholder="https://..."> <button type="button" class="button sasanperfumes-upload-image">Upload Image</button></td></tr>' +
                '<tr><th>Link URL</th><td><input type="text" name="sasanperfumes_brands[' + i + '][url]" value="" class="large-text" placeholder="/shop or https://brand.com (optional)"></td></tr>' +
                '</table></div>';
        }

        function reindex() {
            $('#sasanperfumes-brands-list .sasanperfumes-brand-item').each(function(i) {
                $(this).find('h4').contents().first().replaceWith('Brand ' + (i+1) + ' ');
                $(this).find('input').each(function() {
                    var n = $(this).attr('name');
                    if (n) $(this).attr('name', n.replace(/\[\d+\]/, '[' + i + ']'));
                });
            });
            count = $('#sasanperfumes-brands-list .sasanperfumes-brand-item').length;
        }

        $('#sasanperfumes-add-brand').on('click', function() {
            $('#sasanperfumes-brands-list').append(brandHtml(count++));
        });

        $(document).on('click', '.sasanperfumes-remove-brand', function() {
            $(this).closest('.sasanperfumes-brand-item').remove();
            reindex();
        });

        $(document).on('click', '.sasanperfumes-upload-image', function() {
            var btn = $(this);
            var input = btn.prev('.sasanperfumes-image-url');
            var frame = wp.media({ title: 'Select Brand Image', button: { text: 'Use this image' }, multiple: false });
            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                input.val(attachment.url);
                var preview = btn.parent().find('img');
                if (preview.length) { preview.attr('src', attachment.url); }
                else { btn.parent().prepend('<img src="' + attachment.url + '" style="max-height:60px;margin-bottom:8px;display:block;">'); }
            });
            frame.open();
        });
    });
    </script>
    <?php
}

function sasanperfumes_brands_slider_get() {
    $enabled = get_theme_mod('sasanperfumes_brands_slider_enabled', false);
    $brands_raw = get_theme_mod('sasanperfumes_brands', array());
    if (!is_array($brands_raw)) $brands_raw = array();

    $brands = array();
    foreach ($brands_raw as $brand) {
        if (empty($brand['image'])) continue;
        if (isset($brand['enabled']) && !$brand['enabled']) continue;
        $brands[] = array(
            'name'  => $brand['name'] ?? '',
            'image' => $brand['image'],
            'url'   => $brand['url'] ?? '',
        );
    }

    return array(
        'enabled'    => (bool) $enabled,
        'heading'    => array(
            'en' => get_theme_mod('sasanperfumes_brands_slider_heading_en', 'Our Brands'),
            'ar' => get_theme_mod('sasanperfumes_brands_slider_heading_ar', 'Ø¹Ù„Ø§Ù…Ø§ØªÙ†Ø§ Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©'),
        ),
        'subtitle'   => array(
            'en' => get_theme_mod('sasanperfumes_brands_slider_subtitle_en', ''),
            'ar' => get_theme_mod('sasanperfumes_brands_slider_subtitle_ar', ''),
        ),
        'slider_options' => array(
            'desktop_count'  => (int) get_theme_mod('sasanperfumes_brands_slider_desktop_count', 6),
            'tablet_count'   => (int) get_theme_mod('sasanperfumes_brands_slider_tablet_count', 4),
            'mobile_count'   => (int) get_theme_mod('sasanperfumes_brands_slider_mobile_count', 2),
            'autoplay'       => (bool) get_theme_mod('sasanperfumes_brands_slider_autoplay', true),
            'autoplay_speed' => (int) get_theme_mod('sasanperfumes_brands_slider_autoplay_speed', 3000),
            'loop'           => (bool) get_theme_mod('sasanperfumes_brands_slider_loop', true),
            'arrows'         => (bool) get_theme_mod('sasanperfumes_brands_slider_arrows', false),
            'dots'           => (bool) get_theme_mod('sasanperfumes_brands_slider_dots', false),
        ),
        'brands'     => $brands,
    );
}

sasanperfumes_brands_slider_init();
