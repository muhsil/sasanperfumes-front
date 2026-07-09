<?php
/**
 * ShapeHive Advanced Settings
 *
 * Handles:
 * 1. Live chat widget configuration (Tidio / Tawk.to / Crisp / Custom)
 * 2. Gift wrapping configuration
 * 3. Abandoned cart popup settings
 * 4. Product detail settings
 *
 * REST endpoints (all public GET):
 *   GET /sasanperfumes/v1/live-chat
 *   GET /sasanperfumes/v1/scent-guide   (data only, no admin tab)
 *   GET /sasanperfumes/v1/gift-wrap
 *   GET /sasanperfumes/v1/video-hero    (data only, no admin tab)
 *   GET /sasanperfumes/v1/abandoned-cart-popup
 *
 * @since 6.6.0
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init',                          'sasanperfumes_adv_register_routes');
add_action('admin_menu',                             'sasanperfumes_adv_register_menu', 99);
add_action('admin_post_sasanperfumes_save_live_chat',        'sasanperfumes_adv_save_live_chat');
add_action('admin_post_sasanperfumes_save_gift_wrap',        'sasanperfumes_adv_save_gift_wrap');
add_action('admin_post_sasanperfumes_save_abandoned_popup',  'sasanperfumes_adv_save_abandoned_popup');
add_action('admin_post_sasanperfumes_save_product_detail',   'sasanperfumes_adv_save_product_detail');

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function sasanperfumes_adv_register_routes() {
    $routes = [
        'live-chat'            => 'sasanperfumes_adv_get_live_chat',
        'scent-guide'          => 'sasanperfumes_adv_get_scent_guide',
        'gift-wrap'            => 'sasanperfumes_adv_get_gift_wrap',
        'video-hero'           => 'sasanperfumes_adv_get_video_hero',
        'abandoned-cart-popup' => 'sasanperfumes_adv_get_abandoned_popup',
        'product-detail'           => 'sasanperfumes_adv_get_product_detail',
        'product-variation-images' => 'sasanperfumes_adv_get_variation_images',
    ];
    foreach ($routes as $path => $cb) {
        sasanperfumes_register_rest_route( "/{$path}", ['methods' => 'GET', 'callback' => $cb, 'permission_callback' => '__return_true']);
    }
}

function sasanperfumes_adv_get_live_chat() {
    return rest_ensure_response([
        'enabled'   => (bool) get_option('sasanperfumes_chat_enabled', false),
        'provider'  => get_option('sasanperfumes_chat_provider', 'tidio'),  // tidio|tawkto|crisp|custom
        'widget_id' => get_option('sasanperfumes_chat_widget_id', ''),
        'script_url'=> get_option('sasanperfumes_chat_script_url', ''),     // for custom
        'color'     => get_option('sasanperfumes_chat_color', '#4A1633'),
    ]);
}

function sasanperfumes_adv_get_scent_guide() {
    $default_sections = [
        ['title_en' => 'Fresh & Citrus',   'title_ar' => 'نضارة وحمضيات',
         'content_en' => 'Light, invigorating scents featuring bergamot, lemon, and grapefruit. Perfect for daytime wear and warm climates.',
         'content_ar' => 'روائح خفيفة ومنعشة تتميز بالبرغموت والليمون والجريب فروت. مثالية للارتداء النهاري والمناخ الدافئ.'],
        ['title_en' => 'Oriental & Oud',   'title_ar' => 'شرقي وعود',
         'content_en' => 'Rich, warm fragrances built around precious oud wood, amber, and musk — a signature of Arabian luxury that lasts all day.',
         'content_ar' => 'عطور غنية ودافئة مبنية على خشب العود الثمين والعنبر والمسك — توقيع الفخامة العربية الذي يدوم طوال اليوم.'],
        ['title_en' => 'Floral & Rose',    'title_ar' => 'زهري وورد',
         'content_en' => 'Romantic scents centered around rose, jasmine, and peony. Timeless classics for special occasions.',
         'content_ar' => 'روائح رومانسية تتمحور حول الورد والياسمين. كلاسيكيات خالدة تناسب المناسبات الخاصة.'],
        ['title_en' => 'Woody & Amber',    'title_ar' => 'خشبي وعنبري',
         'content_en' => 'Warm, earthy fragrances with sandalwood, cedarwood, and amber. Sophisticated scents that leave a lasting impression.',
         'content_ar' => 'عطور دافئة وترابية بخشب الصندل وخشب الأرز والعنبر. روائح راقية تترك انطباعاً دائماً.'],
    ];
    $default_size_chart = [
        ['size' => 'Travel',  'ml' => '10 ml',  'description_en' => 'Fits carry-on bags. Ideal for trips.',            'description_ar' => 'مناسب للحقائب. مثالي للرحلات.'],
        ['size' => 'Small',   'ml' => '30 ml',  'description_en' => 'Great for sampling. ~300–400 sprays.',             'description_ar' => 'رائع للتجربة. ~300–400 رشّة.'],
        ['size' => 'Medium',  'ml' => '50 ml',  'description_en' => 'Ideal for daily use. Lasts 2–3 months.',           'description_ar' => 'للاستخدام اليومي. يدوم 2–3 أشهر.'],
        ['size' => 'Large',   'ml' => '100 ml', 'description_en' => 'Best value for your signature scent. 1000+ sprays.', 'description_ar' => 'أفضل قيمة لعطرك المميز. +1000 رشّة.'],
        ['size' => 'Luxury',  'ml' => '200 ml', 'description_en' => 'For collectors. Exceptional longevity.',            'description_ar' => 'للهواة. طول أمد استثنائي.'],
    ];

    $sections   = get_option('sasanperfumes_scent_guide_sections', $default_sections);
    // Separate enable flag — fall back to legacy combined flag if new option not yet set
    $legacy_enabled = (bool) get_option('sasanperfumes_scent_guide_enabled', true);
    $raw_scent = get_option('sasanperfumes_scent_guide_section_enabled');
    $scent_enabled = ($raw_scent !== false) ? (bool) $raw_scent : $legacy_enabled;

    return rest_ensure_response([
        'scentGuide' => [
            'enabled'  => $scent_enabled,
            'title'    => get_option('sasanperfumes_scent_guide_title_en', 'Scent Guide'),
            'titleAr'  => get_option('sasanperfumes_scent_guide_title_ar', 'دليل العطور'),
            'imageUrl' => get_option('sasanperfumes_scent_guide_image', ''),
            'sections' => is_array($sections) ? $sections : $default_sections,
        ],
    ]);
}

function sasanperfumes_adv_get_gift_wrap() {
    return rest_ensure_response([
        'enabled'      => (bool) get_option('sasanperfumes_gift_wrap_enabled', false),
        'price'        => (float) get_option('sasanperfumes_gift_wrap_price', 15),
        'label_en'     => get_option('sasanperfumes_gift_wrap_label_en', 'Add gift wrapping'),
        'label_ar'     => get_option('sasanperfumes_gift_wrap_label_ar', 'أضف تغليف الهدية'),
        'desc_en'      => get_option('sasanperfumes_gift_wrap_desc_en', 'Beautiful gift box with ribbon'),
        'desc_ar'      => get_option('sasanperfumes_gift_wrap_desc_ar', 'صندوق هدية أنيق مع شريط'),
        'image_url'    => get_option('sasanperfumes_gift_wrap_image', ''),
        'product_id'   => (int) get_option('sasanperfumes_gift_wrap_product_id', 0),
    ]);
}

function sasanperfumes_adv_get_video_hero() {
    return rest_ensure_response([
        'enabled'      => (bool) get_option('sasanperfumes_video_hero_enabled', false),
        'video_url'    => get_option('sasanperfumes_video_hero_url', ''),      // YouTube / Vimeo / mp4
        'poster_url'   => get_option('sasanperfumes_video_hero_poster', ''),
        'title_en'     => get_option('sasanperfumes_video_hero_title_en', ''),
        'title_ar'     => get_option('sasanperfumes_video_hero_title_ar', ''),
        'subtitle_en'  => get_option('sasanperfumes_video_hero_subtitle_en', ''),
        'subtitle_ar'  => get_option('sasanperfumes_video_hero_subtitle_ar', ''),
        'btn_text_en'  => get_option('sasanperfumes_video_hero_btn_en', 'Explore Now'),
        'btn_text_ar'  => get_option('sasanperfumes_video_hero_btn_ar', 'استكشف الآن'),
        'btn_url'      => get_option('sasanperfumes_video_hero_btn_url', '/shop'),
        'autoplay'     => (bool) get_option('sasanperfumes_video_hero_autoplay', true),
        'muted'        => (bool) get_option('sasanperfumes_video_hero_muted', true),
    ]);
}

function sasanperfumes_adv_get_abandoned_popup() {
    return rest_ensure_response([
        'enabled'        => (bool) get_option('sasanperfumes_ab_popup_enabled', false),
        'idle_minutes'   => (int)  get_option('sasanperfumes_ab_popup_idle', 5),
        'title_en'       => get_option('sasanperfumes_ab_popup_title_en', 'Still thinking?'),
        'title_ar'       => get_option('sasanperfumes_ab_popup_title_ar', 'لا تزال تفكر؟'),
        'body_en'        => get_option('sasanperfumes_ab_popup_body_en', 'Complete your order and enjoy free shipping!'),
        'body_ar'        => get_option('sasanperfumes_ab_popup_body_ar', 'أكمل طلبك واستمتع بالشحن المجاني!'),
        'coupon_code'    => get_option('sasanperfumes_ab_popup_coupon', ''),
        'btn_text_en'    => get_option('sasanperfumes_ab_popup_btn_en', 'Complete Order'),
        'btn_text_ar'    => get_option('sasanperfumes_ab_popup_btn_ar', 'أكمل الطلب'),
    ]);
}

// ---------------------------------------------------------------------------
// Admin save handlers
// ---------------------------------------------------------------------------

function sasanperfumes_adv_save_live_chat() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_live_chat')) wp_die('Unauthorized');
    update_option('sasanperfumes_chat_enabled',    !empty($_POST['enabled']) ? 1 : 0);
    update_option('sasanperfumes_chat_provider',   sanitize_text_field($_POST['provider']   ?? 'tidio'));
    update_option('sasanperfumes_chat_widget_id',  sanitize_text_field($_POST['widget_id']  ?? ''));
    update_option('sasanperfumes_chat_script_url', esc_url_raw($_POST['script_url']         ?? ''));
    update_option('sasanperfumes_chat_color',      sanitize_hex_color($_POST['color']       ?? '#4A1633') ?: '#4A1633');
    wp_redirect(admin_url('admin.php?page=sasanperfumes-advanced&tab=live_chat&saved=1')); exit;
}


function sasanperfumes_adv_save_gift_wrap() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_gift_wrap')) wp_die('Unauthorized');
    update_option('sasanperfumes_gift_wrap_enabled',    !empty($_POST['enabled']) ? 1 : 0);
    update_option('sasanperfumes_gift_wrap_price',      (float) ($_POST['price'] ?? 15));
    update_option('sasanperfumes_gift_wrap_label_en',   sanitize_text_field($_POST['label_en'] ?? 'Add gift wrapping'));
    update_option('sasanperfumes_gift_wrap_label_ar',   sanitize_text_field($_POST['label_ar'] ?? 'أضف تغليف الهدية'));
    update_option('sasanperfumes_gift_wrap_desc_en',    sanitize_textarea_field($_POST['desc_en'] ?? ''));
    update_option('sasanperfumes_gift_wrap_desc_ar',    sanitize_textarea_field($_POST['desc_ar'] ?? ''));
    update_option('sasanperfumes_gift_wrap_image',      esc_url_raw($_POST['image_url'] ?? ''));
    update_option('sasanperfumes_gift_wrap_product_id', (int) ($_POST['product_id'] ?? 0));
    wp_redirect(admin_url('admin.php?page=sasanperfumes-advanced&tab=gift_wrap&saved=1')); exit;
}


function sasanperfumes_adv_save_abandoned_popup() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_abandoned_popup')) wp_die('Unauthorized');
    update_option('sasanperfumes_ab_popup_enabled', !empty($_POST['enabled']) ? 1 : 0);
    update_option('sasanperfumes_ab_popup_idle',    (int) ($_POST['idle_minutes'] ?? 5));
    update_option('sasanperfumes_ab_popup_title_en',sanitize_text_field($_POST['title_en'] ?? ''));
    update_option('sasanperfumes_ab_popup_title_ar',sanitize_text_field($_POST['title_ar'] ?? ''));
    update_option('sasanperfumes_ab_popup_body_en', sanitize_textarea_field($_POST['body_en'] ?? ''));
    update_option('sasanperfumes_ab_popup_body_ar', sanitize_textarea_field($_POST['body_ar'] ?? ''));
    update_option('sasanperfumes_ab_popup_coupon',  sanitize_text_field($_POST['coupon_code'] ?? ''));
    update_option('sasanperfumes_ab_popup_btn_en',  sanitize_text_field($_POST['btn_text_en'] ?? 'Complete Order'));
    update_option('sasanperfumes_ab_popup_btn_ar',  sanitize_text_field($_POST['btn_text_ar'] ?? 'أكمل الطلب'));
    wp_redirect(admin_url('admin.php?page=sasanperfumes-advanced&tab=abandoned_popup&saved=1')); exit;
}

// ---------------------------------------------------------------------------
// Admin page
// ---------------------------------------------------------------------------

function sasanperfumes_adv_register_menu() {
    add_submenu_page('sasanperfumes-settings', 'Advanced Settings', 'Advanced', 'manage_options', 'sasanperfumes-advanced', 'sasanperfumes_adv_render_page');
}

function sasanperfumes_adv_render_page() {
    $tab   = sanitize_key($_GET['tab'] ?? 'live_chat');
    $saved = !empty($_GET['saved']);
    $tabs  = [
        'live_chat'       => 'Live Chat',
        'gift_wrap'       => 'Gift Wrapping',
        'abandoned_popup' => 'Abandoned Cart Popup',
        'product_detail'  => 'Product Detail',
    ];
    ?>
    <div class="wrap">
        <h1>Advanced Settings</h1>
        <?php if ($saved): ?><div class="notice notice-success is-dismissible"><p>Settings saved.</p></div><?php endif; ?>
        <nav class="nav-tab-wrapper">
            <?php foreach ($tabs as $k => $l): ?>
                <a href="?page=sasanperfumes-advanced&tab=<?=$k?>" class="nav-tab <?=$tab===$k?'nav-tab-active':''?>"><?=$l?></a>
            <?php endforeach; ?>
        </nav>

        <?php
        match($tab) {
            'live_chat'       => sasanperfumes_adv_render_live_chat_tab(),
            'gift_wrap'       => sasanperfumes_adv_render_gift_wrap_tab(),
            'abandoned_popup' => sasanperfumes_adv_render_abandoned_popup_tab(),
            'product_detail'  => sasanperfumes_adv_render_product_detail_tab(),
            default           => null,
        };
        ?>
    </div>
    <?php
}

function sasanperfumes_adv_render_live_chat_tab() {
    $g = fn($k,$d='')=>get_option($k,$d);
    ?>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_live_chat'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_live_chat">
        <table class="form-table">
            <tr><th>Enable Chat Widget</th><td><input type="checkbox" name="enabled" value="1" <?=checked($g('sasanperfumes_chat_enabled',0),1,false)?>></td></tr>
            <tr><th>Provider</th><td>
                <select name="provider">
                    <?php foreach(['tidio'=>'Tidio','tawkto'=>'Tawk.to','crisp'=>'Crisp','custom'=>'Custom Script'] as $v=>$l): ?>
                        <option value="<?=$v?>" <?=selected($g('sasanperfumes_chat_provider','tidio'),$v,false)?>><?=$l?></option>
                    <?php endforeach; ?>
                </select>
            </td></tr>
            <tr><th>Widget ID / Key</th><td><input type="text" name="widget_id" value="<?=esc_attr($g('sasanperfumes_chat_widget_id'))?>" class="large-text"><br><small>Tidio: Public Key. Tawk.to: Property ID/Widget ID. Crisp: Website ID.</small></td></tr>
            <tr><th>Custom Script URL</th><td><input type="url" name="script_url" value="<?=esc_attr($g('sasanperfumes_chat_script_url'))?>" class="large-text"><br><small>Only used when Provider = Custom Script</small></td></tr>
        </table>
        <?php submit_button('Save Live Chat Settings'); ?>
    </form>
    <?php
}

function sasanperfumes_adv_render_gift_wrap_tab() {
    $g = fn($k,$d='')=>get_option($k,$d);
    ?>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_gift_wrap'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_gift_wrap">
        <table class="form-table">
            <tr><th>Enable Gift Wrapping</th><td><input type="checkbox" name="enabled" value="1" <?=checked($g('sasanperfumes_gift_wrap_enabled',0),1,false)?>></td></tr>
            <tr><th>Price (AED)</th><td><input type="number" step="0.5" name="price" value="<?=esc_attr($g('sasanperfumes_gift_wrap_price',15))?>"></td></tr>
            <tr><th>Label (EN)</th><td><input type="text" name="label_en" value="<?=esc_attr($g('sasanperfumes_gift_wrap_label_en','Add gift wrapping'))?>" class="large-text"></td></tr>
            <tr><th>Label (AR)</th><td><input type="text" name="label_ar" value="<?=esc_attr($g('sasanperfumes_gift_wrap_label_ar','أضف تغليف الهدية'))?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Description (EN)</th><td><input type="text" name="desc_en" value="<?=esc_attr($g('sasanperfumes_gift_wrap_desc_en','Beautiful gift box with ribbon'))?>" class="large-text"></td></tr>
            <tr><th>Description (AR)</th><td><input type="text" name="desc_ar" value="<?=esc_attr($g('sasanperfumes_gift_wrap_desc_ar','صندوق هدية أنيق مع شريط'))?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Product Image</th><td><?php sasanperfumes_image_field('image_url', $g('sasanperfumes_gift_wrap_image')); ?></td></tr>
        </table>
        <?php submit_button('Save Gift Wrap Settings'); ?>
    </form>
    <?php
}

function sasanperfumes_adv_render_abandoned_popup_tab() {
    $g = fn($k,$d='')=>get_option($k,$d);
    ?>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_abandoned_popup'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_abandoned_popup">
        <table class="form-table">
            <tr><th>Enable Popup</th><td><input type="checkbox" name="enabled" value="1" <?=checked($g('sasanperfumes_ab_popup_enabled',0),1,false)?>></td></tr>
            <tr><th>Show after idle (minutes)</th><td><input type="number" name="idle_minutes" value="<?=esc_attr($g('sasanperfumes_ab_popup_idle',5))?>" min="1" max="60"></td></tr>
            <tr><th>Title (EN)</th><td><input type="text" name="title_en" value="<?=esc_attr($g('sasanperfumes_ab_popup_title_en','Still thinking?'))?>" class="large-text"></td></tr>
            <tr><th>Title (AR)</th><td><input type="text" name="title_ar" value="<?=esc_attr($g('sasanperfumes_ab_popup_title_ar','لا تزال تفكر؟'))?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Body (EN)</th><td><textarea name="body_en" rows="3" class="large-text"><?=esc_textarea($g('sasanperfumes_ab_popup_body_en','Complete your order and enjoy free shipping!'))?></textarea></td></tr>
            <tr><th>Body (AR)</th><td><textarea name="body_ar" rows="3" class="large-text" dir="rtl"><?=esc_textarea($g('sasanperfumes_ab_popup_body_ar','أكمل طلبك واستمتع بالشحن المجاني!'))?></textarea></td></tr>
            <tr><th>Coupon Code</th><td><input type="text" name="coupon_code" value="<?=esc_attr($g('sasanperfumes_ab_popup_coupon'))?>" class="regular-text"></td></tr>
            <tr><th>Button Text (EN)</th><td><input type="text" name="btn_text_en" value="<?=esc_attr($g('sasanperfumes_ab_popup_btn_en','Complete Order'))?>" class="regular-text"></td></tr>
            <tr><th>Button Text (AR)</th><td><input type="text" name="btn_text_ar" value="<?=esc_attr($g('sasanperfumes_ab_popup_btn_ar','أكمل الطلب'))?>" class="regular-text" dir="rtl"></td></tr>
        </table>
        <?php submit_button('Save Abandoned Cart Popup'); ?>
    </form>
    <?php
}

function sasanperfumes_adv_render_product_detail_tab() {
    $badge_on = (bool) get_option('sasanperfumes_variation_stock_badge_enabled', true);
    ?>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_product_detail'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_product_detail">
        <table class="form-table">
            <tr>
                <th>Variation Stock Badge</th>
                <td>
                    <input type="checkbox" name="variation_stock_badge_enabled" value="1" <?=checked($badge_on, true, false)?>>
                    <p class="description">Show a badge on the product page when a selected variation has low stock, is on backorder, or is out of stock.</p>
                </td>
            </tr>
        </table>
        <?php submit_button('Save Product Detail Settings'); ?>
    </form>
    <?php
}

function sasanperfumes_adv_save_product_detail() {
    check_admin_referer('sasanperfumes_save_product_detail');
    update_option('sasanperfumes_variation_stock_badge_enabled', !empty($_POST['variation_stock_badge_enabled']));
    wp_redirect(admin_url('admin.php?page=sasanperfumes-advanced&tab=product_detail&saved=1'));
    exit;
}

function sasanperfumes_adv_get_product_detail() {
    return rest_ensure_response([
        'variationStockBadge' => (bool) get_option('sasanperfumes_variation_stock_badge_enabled', true),
    ]);
}

function sasanperfumes_adv_get_variation_images() {
    $product_id = absint($_GET['product_id'] ?? 0);
    if (!$product_id || !function_exists('wc_get_product')) {
        return rest_ensure_response([]);
    }

    $product = wc_get_product($product_id);
    if (!$product || !$product->is_type('variable')) {
        return rest_ensure_response([]);
    }

    $result    = [];
    $src_cache = [];
    $seen_images = []; // Track which images we've added to avoid duplicates

    foreach ($product->get_children() as $variation_id) {
        $variation = wc_get_product($variation_id);
        if (!$variation) continue;

        $image_id = (int) $variation->get_image_id();
        if (!$image_id) continue;

        // Get variation attributes
        $attributes = [];
        $attr_data = $variation->get_attributes();
        if (is_array($attr_data)) {
            foreach ($attr_data as $attr_name => $attr_value) {
                // Normalize attribute name to remove 'pa_' prefix if present
                $clean_name = str_replace('pa_', '', $attr_name);
                $attributes[$clean_name] = $attr_value;
            }
        }

        if (!isset($src_cache[$image_id])) {
            $src = wp_get_attachment_image_url($image_id, 'full');
            if (!$src) continue;
            $src_cache[$image_id] = [
                'src'       => $src,
                'thumbnail' => wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail') ?: $src,
                'alt'       => (string) get_post_meta($image_id, '_wp_attachment_image_alt', true),
            ];
        }

        // Create a key for this image to avoid returning the same image multiple times
        $img_key = md5($image_id . json_encode($attributes));

        // Only add if we haven't seen this exact image+attributes combination
        if (!isset($seen_images[$img_key])) {
            $seen_images[$img_key] = true;
            $result[] = [
                'variation_id' => $variation_id,
                'id'           => $image_id,
                'src'          => $src_cache[$image_id]['src'],
                'thumbnail'    => $src_cache[$image_id]['thumbnail'],
                'alt'          => $src_cache[$image_id]['alt'],
                'attributes'   => $attributes,
            ];
        }
    }

    return rest_ensure_response($result);
}
