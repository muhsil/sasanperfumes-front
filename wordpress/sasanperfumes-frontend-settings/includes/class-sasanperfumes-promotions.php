<?php
/**
 * ShapeHive Promotions
 *
 * Handles:
 * 1. Promotional popup settings (admin + REST API)
 * 2. Exposes sale_date_to / sale_date_from on WooCommerce Store API product responses
 * 3. Product badge tag settings
 * 4. Dynamic ad slots for storefront placements
 *
 * REST endpoints (all public):
 *   GET /sasanperfumes/v1/popup-settings
 *   GET /sasanperfumes/v1/badge-tags
 *   GET /sasanperfumes/v1/ad-settings
 *
 * @since 6.6.0
 */

if (!defined('ABSPATH')) exit;

function sasanperfumes_promotions_init() {
    add_action('rest_api_init',       'sasanperfumes_promotions_register_routes');
    add_action('admin_menu',          'sasanperfumes_promotions_register_menu', 99);
    add_action('admin_post_sasanperfumes_save_popup',      'sasanperfumes_promotions_save_popup');
    add_action('admin_post_sasanperfumes_save_badge_tags', 'sasanperfumes_promotions_save_badge_tags');
    add_action('admin_post_sasanperfumes_save_ads',        'sasanperfumes_promotions_save_ads');

    // Inject sale dates into WC Store API product response
    add_filter('woocommerce_store_api_product_data', 'sasanperfumes_promotions_inject_sale_dates', 10, 2);
}
sasanperfumes_promotions_init();

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function sasanperfumes_promotions_register_routes() {
    sasanperfumes_register_rest_route( '/popup-settings', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_get_popup_settings',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/badge-tags', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_get_badge_tags',
        'permission_callback' => '__return_true',
    ]);
    sasanperfumes_register_rest_route( '/ad-settings', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_get_ad_settings',
        'permission_callback' => '__return_true',
    ]);
}

function sasanperfumes_get_popup_settings() {
    return rest_ensure_response([
        'enabled'       => (bool) get_option('sasanperfumes_popup_enabled', false),
        'trigger'       => get_option('sasanperfumes_popup_trigger', 'timed'),   // timed | exit_intent | both
        'delay'         => (int)  get_option('sasanperfumes_popup_delay', 5),    // seconds
        'title_en'      => get_option('sasanperfumes_popup_title_en', ''),
        'title_ar'      => get_option('sasanperfumes_popup_title_ar', ''),
        'body_en'       => get_option('sasanperfumes_popup_body_en', ''),
        'body_ar'       => get_option('sasanperfumes_popup_body_ar', ''),
        'btn_text_en'   => get_option('sasanperfumes_popup_btn_text_en', 'Shop Now'),
        'btn_text_ar'   => get_option('sasanperfumes_popup_btn_text_ar', 'تسوق الآن'),
        'btn_url'       => get_option('sasanperfumes_popup_btn_url', '/shop'),
        'image_url'     => get_option('sasanperfumes_popup_image_url', ''),
        'coupon_code'   => get_option('sasanperfumes_popup_coupon_code', ''),
        'frequency'     => get_option('sasanperfumes_popup_frequency', 'once'), // once | always | session
    ]);
}

function sasanperfumes_get_badge_tags() {
    $defaults = [
        ['tag_slug' => 'new',       'label_en' => 'New',       'label_ar' => 'جديد',     'color' => '#22c55e'],
        ['tag_slug' => 'hot',       'label_en' => 'Hot',       'label_ar' => 'رائج',     'color' => '#ef4444'],
        ['tag_slug' => 'limited',   'label_en' => 'Limited',   'label_ar' => 'محدود',   'color' => '#f97316'],
        ['tag_slug' => 'bestseller','label_en' => 'Bestseller','label_ar' => 'الأكثر مبيعاً','color' => '#8b5cf6'],
        ['tag_slug' => 'exclusive', 'label_en' => 'Exclusive', 'label_ar' => 'حصري',    'color' => '#4A1633'],
    ];
    $saved = get_option('sasanperfumes_badge_tags', $defaults);
    return rest_ensure_response(['badge_tags' => $saved]);
}

function sasanperfumes_get_ad_settings() {
    $items = get_option('sasanperfumes_ads_items', array());
    if (!is_array($items)) {
        $items = array();
    }

    if (empty($items)) {
        $items = array();
    } else {
        $items = array_values(array_filter(array_map(function ($item) {
            if (!is_array($item)) return null;
            $has_media = !empty($item['image']) || !empty($item['mobile']) || !empty($item['image_ar']) || !empty($item['mobile_ar']);
            $enabled = array_key_exists('enabled_set', $item)
                ? !empty($item['enabled'])
                : (array_key_exists('enabled', $item) ? (!empty($item['enabled']) || $has_media) : $has_media);
            $placement = sanitize_key($item['placement'] ?? 'home');
            if ($placement === '') $placement = 'home';
            $market = sanitize_key($item['market'] ?? 'all');
            if ($market === '') $market = 'all';
            return array(
                'enabled'       => $enabled,
                'placement'     => $placement,
                'market'        => $market,
                'image'         => esc_url_raw($item['image'] ?? ''),
                'mobileImage'   => esc_url_raw($item['mobile'] ?? ($item['image'] ?? '')),
                'imageAr'       => esc_url_raw($item['image_ar'] ?? ''),
                'mobileImageAr' => esc_url_raw($item['mobile_ar'] ?? ''),
                'title'         => sanitize_text_field($item['title'] ?? ''),
                'titleAr'       => sanitize_text_field($item['title_ar'] ?? ''),
                'subtitle'      => sanitize_text_field($item['subtitle'] ?? ''),
                'subtitleAr'    => sanitize_text_field($item['subtitle_ar'] ?? ''),
                'buttonText'    => sanitize_text_field($item['button_text'] ?? ''),
                'buttonTextAr'  => sanitize_text_field($item['button_text_ar'] ?? ''),
                'link'          => sasanperfumes_sanitize_link($item['link'] ?? ''),
            );
        }, $items)));
    }

    return rest_ensure_response([
        'enabled' => (bool) get_option('sasanperfumes_ads_enabled', true),
        'items'   => $items,
    ]);
}

// ---------------------------------------------------------------------------
// Inject sale dates into Store API
// ---------------------------------------------------------------------------

function sasanperfumes_promotions_inject_sale_dates($data, $product) {
    if (!($product instanceof WC_Product)) return $data;
    $to   = $product->get_date_on_sale_to();
    $from = $product->get_date_on_sale_from();
    $data['sale_end']   = $to   ? $to->date('c')   : null;
    $data['sale_start'] = $from ? $from->date('c') : null;
    return $data;
}

// ---------------------------------------------------------------------------
// Admin menu
// ---------------------------------------------------------------------------

function sasanperfumes_promotions_register_menu() {
    add_submenu_page(
        'sasanperfumes-settings',
        'Promotions & Popups',
        'Promotions',
        'manage_options',
        'sasanperfumes-promotions',
        'sasanperfumes_promotions_render_page'
    );
}

// ---------------------------------------------------------------------------
// Admin save handlers
// ---------------------------------------------------------------------------

function sasanperfumes_promotions_save_popup() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_popup')) wp_die('Unauthorized');
    $fields = [
        'sasanperfumes_popup_enabled'      => !empty($_POST['sasanperfumes_popup_enabled']) ? 1 : 0,
        'sasanperfumes_popup_trigger'      => sanitize_text_field($_POST['sasanperfumes_popup_trigger']   ?? 'timed'),
        'sasanperfumes_popup_delay'        => (int) ($_POST['sasanperfumes_popup_delay']                  ?? 5),
        'sasanperfumes_popup_title_en'     => sanitize_text_field($_POST['sasanperfumes_popup_title_en']  ?? ''),
        'sasanperfumes_popup_title_ar'     => sanitize_text_field($_POST['sasanperfumes_popup_title_ar']  ?? ''),
        'sasanperfumes_popup_body_en'      => wp_kses_post($_POST['sasanperfumes_popup_body_en']           ?? ''),
        'sasanperfumes_popup_body_ar'      => wp_kses_post($_POST['sasanperfumes_popup_body_ar']           ?? ''),
        'sasanperfumes_popup_btn_text_en'  => sanitize_text_field($_POST['sasanperfumes_popup_btn_text_en'] ?? 'Shop Now'),
        'sasanperfumes_popup_btn_text_ar'  => sanitize_text_field($_POST['sasanperfumes_popup_btn_text_ar'] ?? 'تسوق الآن'),
        'sasanperfumes_popup_btn_url'      => sasanperfumes_sanitize_link($_POST['sasanperfumes_popup_btn_url']    ?? '/shop'),
        'sasanperfumes_popup_image_url'    => esc_url_raw($_POST['sasanperfumes_popup_image_url']          ?? ''),
        'sasanperfumes_popup_coupon_code'  => sanitize_text_field($_POST['sasanperfumes_popup_coupon_code'] ?? ''),
        'sasanperfumes_popup_frequency'    => sanitize_text_field($_POST['sasanperfumes_popup_frequency']  ?? 'once'),
    ];
    foreach ($fields as $key => $val) update_option($key, $val);
    wp_redirect(admin_url('admin.php?page=sasanperfumes-promotions&saved=1'));
    exit;
}

function sasanperfumes_promotions_save_badge_tags() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_badge_tags')) wp_die('Unauthorized');
    $raw = $_POST['badge_tags'] ?? [];
    $tags = [];
    foreach ($raw as $t) {
        $tags[] = [
            'tag_slug' => sanitize_title($t['tag_slug']    ?? ''),
            'label_en' => sanitize_text_field($t['label_en'] ?? ''),
            'label_ar' => sanitize_text_field($t['label_ar'] ?? ''),
            'color'    => sanitize_hex_color($t['color']    ?? '#4A1633') ?: '#4A1633',
        ];
    }
    update_option('sasanperfumes_badge_tags', $tags);
    wp_redirect(admin_url('admin.php?page=sasanperfumes-promotions&tab=badges&saved=1'));
    exit;
}

function sasanperfumes_promotions_save_ads() {
    if (!current_user_can('manage_options') || !check_admin_referer('sasanperfumes_save_ads')) wp_die('Unauthorized');
    update_option('sasanperfumes_ads_enabled', !empty($_POST['sasanperfumes_ads_enabled']) ? 1 : 0);
    $items = array();
    if (isset($_POST['sasanperfumes_ads_items']) && is_array($_POST['sasanperfumes_ads_items'])) {
        foreach ($_POST['sasanperfumes_ads_items'] as $item) {
            if (!is_array($item)) continue;
            $placement = sanitize_key($item['placement'] ?? 'home');
            if ($placement === '') $placement = 'home';
            $market = sanitize_key($item['market'] ?? 'all');
            if ($market === '') $market = 'all';
            $items[] = array(
                'enabled'       => !empty($item['enabled']) ? 1 : 0,
                'enabled_set'   => true,
                'placement'     => $placement,
                'market'        => $market,
                'image'         => esc_url_raw($item['image'] ?? ''),
                'mobile'        => esc_url_raw($item['mobile'] ?? ''),
                'image_ar'      => esc_url_raw($item['image_ar'] ?? ''),
                'mobile_ar'     => esc_url_raw($item['mobile_ar'] ?? ''),
                'title'         => sanitize_text_field($item['title'] ?? ''),
                'title_ar'      => sanitize_text_field($item['title_ar'] ?? ''),
                'subtitle'      => sanitize_text_field($item['subtitle'] ?? ''),
                'subtitle_ar'   => sanitize_text_field($item['subtitle_ar'] ?? ''),
                'button_text'   => sanitize_text_field($item['button_text'] ?? ''),
                'button_text_ar'=> sanitize_text_field($item['button_text_ar'] ?? ''),
                'link'          => sasanperfumes_sanitize_link($item['link'] ?? ''),
            );
        }
    }
    update_option('sasanperfumes_ads_items', $items);
    wp_redirect(admin_url('admin.php?page=sasanperfumes-promotions&tab=ads&saved=1'));
    exit;
}

// ---------------------------------------------------------------------------
// Admin render page
// ---------------------------------------------------------------------------

function sasanperfumes_promotions_render_page() {
    $tab = $_GET['tab'] ?? 'popup';
    $saved = !empty($_GET['saved']);
    ?>
    <div class="wrap">
        <h1>Promotions & Popups</h1>
        <?php if ($saved): ?><div class="notice notice-success is-dismissible"><p>Settings saved.</p></div><?php endif; ?>
        <nav class="nav-tab-wrapper">
            <a href="?page=sasanperfumes-promotions&tab=popup"  class="nav-tab <?= $tab === 'popup'  ? 'nav-tab-active' : '' ?>">Popup</a>
            <a href="?page=sasanperfumes-promotions&tab=badges" class="nav-tab <?= $tab === 'badges' ? 'nav-tab-active' : '' ?>">Product Badges</a>
            <a href="?page=sasanperfumes-promotions&tab=ads"    class="nav-tab <?= $tab === 'ads'    ? 'nav-tab-active' : '' ?>">Ads</a>
        </nav>

        <?php if ($tab === 'popup'): sasanperfumes_promotions_render_popup_tab();
        elseif ($tab === 'badges'): sasanperfumes_promotions_render_badges_tab();
        elseif ($tab === 'ads'): sasanperfumes_promotions_render_ads_tab(); endif; ?>
    </div>
    <?php
}

function sasanperfumes_promotions_render_popup_tab() {
    $g = fn($k, $d='') => get_option($k, $d);
    ?>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_popup'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_popup">
        <table class="form-table">
            <tr><th>Enable Popup</th><td><label><input type="checkbox" name="sasanperfumes_popup_enabled" value="1" <?= checked($g('sasanperfumes_popup_enabled',0),1,false) ?>></label></td></tr>
            <tr><th>Trigger</th><td>
                <select name="sasanperfumes_popup_trigger">
                    <?php foreach(['timed'=>'Timer only','exit_intent'=>'Exit intent only','both'=>'Both'] as $v=>$l): ?>
                        <option value="<?=$v?>" <?=selected($g('sasanperfumes_popup_trigger','timed'),$v,false)?>><?=$l?></option>
                    <?php endforeach; ?>
                </select>
            </td></tr>
            <tr><th>Delay (seconds)</th><td><input type="number" name="sasanperfumes_popup_delay" value="<?=esc_attr($g('sasanperfumes_popup_delay',5))?>" min="1" max="120"></td></tr>
            <tr><th>Frequency</th><td>
                <select name="sasanperfumes_popup_frequency">
                    <?php foreach(['once'=>'Once per browser','session'=>'Once per session','always'=>'Every visit'] as $v=>$l): ?>
                        <option value="<?=$v?>" <?=selected($g('sasanperfumes_popup_frequency','once'),$v,false)?>><?=$l?></option>
                    <?php endforeach; ?>
                </select>
            </td></tr>
            <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_popup_title_en" value="<?=esc_attr($g('sasanperfumes_popup_title_en'))?>" class="large-text"></td></tr>
            <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_popup_title_ar" value="<?=esc_attr($g('sasanperfumes_popup_title_ar'))?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Body (EN)</th><td><textarea name="sasanperfumes_popup_body_en" rows="4" class="large-text"><?=esc_textarea($g('sasanperfumes_popup_body_en'))?></textarea></td></tr>
            <tr><th>Body (AR)</th><td><textarea name="sasanperfumes_popup_body_ar" rows="4" class="large-text" dir="rtl"><?=esc_textarea($g('sasanperfumes_popup_body_ar'))?></textarea></td></tr>
            <tr><th>Button Text (EN)</th><td><input type="text" name="sasanperfumes_popup_btn_text_en" value="<?=esc_attr($g('sasanperfumes_popup_btn_text_en','Shop Now'))?>" class="regular-text"></td></tr>
            <tr><th>Button Text (AR)</th><td><input type="text" name="sasanperfumes_popup_btn_text_ar" value="<?=esc_attr($g('sasanperfumes_popup_btn_text_ar','تسوق الآن'))?>" class="regular-text" dir="rtl"></td></tr>
            <tr><th>Button URL</th><td><input type="text" name="sasanperfumes_popup_btn_url" value="<?=esc_attr($g('sasanperfumes_popup_btn_url','/shop'))?>" class="large-text"></td></tr>
            <tr><th>Image</th><td><?php sasanperfumes_image_field('sasanperfumes_popup_image_url', $g('sasanperfumes_popup_image_url')); ?><br><small>Leave empty for text-only popup</small></td></tr>
            <tr><th>Coupon Code</th><td><input type="text" name="sasanperfumes_popup_coupon_code" value="<?=esc_attr($g('sasanperfumes_popup_coupon_code'))?>" class="regular-text"><br><small>Optional — displayed in popup to encourage checkout</small></td></tr>
        </table>
        <?php submit_button('Save Popup Settings'); ?>
    </form>
    <?php
}

function sasanperfumes_promotions_render_badges_tab() {
    $defaults = [
        ['tag_slug'=>'new','label_en'=>'New','label_ar'=>'جديد','color'=>'#22c55e'],
        ['tag_slug'=>'hot','label_en'=>'Hot','label_ar'=>'رائج','color'=>'#ef4444'],
        ['tag_slug'=>'limited','label_en'=>'Limited','label_ar'=>'محدود','color'=>'#f97316'],
        ['tag_slug'=>'bestseller','label_en'=>'Bestseller','label_ar'=>'الأكثر مبيعاً','color'=>'#8b5cf6'],
        ['tag_slug'=>'exclusive','label_en'=>'Exclusive','label_ar'=>'حصري','color'=>'#4A1633'],
    ];
    $tags = get_option('sasanperfumes_badge_tags', $defaults);
    ?>
    <p>Map WooCommerce product tag slugs to badge labels. Add tags to products in WooCommerce → Products → Tags.</p>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_badge_tags'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_badge_tags">
        <table class="widefat fixed" style="max-width:800px">
            <thead><tr><th>Tag Slug</th><th>Label EN</th><th>Label AR</th><th>Color</th></tr></thead>
            <tbody id="sasanperfumes-badge-rows">
            <?php foreach ($tags as $i => $t): ?>
            <tr>
                <td><input type="text" name="badge_tags[<?=$i?>][tag_slug]" value="<?=esc_attr($t['tag_slug'])?>" class="regular-text"></td>
                <td><input type="text" name="badge_tags[<?=$i?>][label_en]" value="<?=esc_attr($t['label_en'])?>" class="regular-text"></td>
                <td><input type="text" name="badge_tags[<?=$i?>][label_ar]" value="<?=esc_attr($t['label_ar'])?>" class="regular-text" dir="rtl"></td>
                <td><input type="color" name="badge_tags[<?=$i?>][color]"    value="<?=esc_attr($t['color'])?>"></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php submit_button('Save Badge Settings'); ?>
    </form>
    <?php
}

function sasanperfumes_promotions_render_ads_tab() {
    $defaults = array(
        array('enabled'=>1,'placement'=>'home','market'=>'all','image'=>'','mobile'=>'','image_ar'=>'','mobile_ar'=>'','title'=>'','title_ar'=>'','subtitle'=>'','subtitle_ar'=>'','button_text'=>'','button_text_ar'=>'','link'=>'')
    );
    $items = get_option('sasanperfumes_ads_items', $defaults);
    if (!is_array($items) || empty($items)) {
        $items = $defaults;
    }
    ?>
    <p>Use this section to add promotional ad cards without changing code. You can target a market, a page placement, or both.</p>
    <form method="post" action="<?= admin_url('admin-post.php') ?>">
        <?php wp_nonce_field('sasanperfumes_save_ads'); ?>
        <input type="hidden" name="action" value="sasanperfumes_save_ads">
        <table class="form-table">
            <tr><th>Enable Ads</th><td><label><input type="checkbox" name="sasanperfumes_ads_enabled" value="1" <?php checked(get_option('sasanperfumes_ads_enabled', true)); ?>> Show ad slots on the storefront</label></td></tr>
        </table>

        <h3>Ad Slots <button type="button" class="button" id="sasanperfumes-add-ad">+ Add Ad</button></h3>
        <div id="sasanperfumes-ads-items">
            <?php foreach ($items as $i => $item): ?>
            <div class="sasanperfumes-ad-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
                <h4>Ad <?php echo $i+1; ?> <button type="button" class="button sasanperfumes-remove-ad" style="float:right;color:red;">Remove</button></h4>
                <table class="form-table">
                    <tr><th>Enable</th><td><label><input type="hidden" name="sasanperfumes_ads_items[<?php echo $i; ?>][enabled]" value="0"><input type="checkbox" name="sasanperfumes_ads_items[<?php echo $i; ?>][enabled]" value="1" <?php checked(array_key_exists('enabled', $item) ? !empty($item['enabled']) : true); ?>> Show this ad</label></td></tr>
                    <tr><th>Placement</th><td>
                        <select name="sasanperfumes_ads_items[<?php echo $i; ?>][placement]">
                            <?php foreach (array('home'=>'Home page','shop'=>'Shop page','category'=>'Category pages','product'=>'Product pages','all'=>'All pages') as $value => $label): ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($item['placement'] ?? 'home', $value); ?>><?php echo esc_html($label); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td></tr>
                    <tr><th>Market</th><td>
                        <select name="sasanperfumes_ads_items[<?php echo $i; ?>][market]">
                            <?php foreach (array('all'=>'All markets','intl'=>'International / UAE','qa'=>'Qatar','om'=>'Oman','sa'=>'Saudi Arabia') as $value => $label): ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($item['market'] ?? 'all', $value); ?>><?php echo esc_html($label); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td></tr>
                    <tr><th>Desktop Image (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_ads_items[{$i}][image]", $item['image'] ?? ''); ?></td></tr>
                    <tr><th>Mobile Image (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_ads_items[{$i}][mobile]", $item['mobile'] ?? ''); ?></td></tr>
                    <tr><th>Desktop Image (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_ads_items[{$i}][image_ar]", $item['image_ar'] ?? ''); ?><p class="description">Falls back to the English image if empty.</p></td></tr>
                    <tr><th>Mobile Image (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_ads_items[{$i}][mobile_ar]", $item['mobile_ar'] ?? ''); ?><p class="description">Falls back to the English mobile image if empty.</p></td></tr>
                    <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][title]" value="<?php echo esc_attr($item['title'] ?? ''); ?>" class="regular-text"></td></tr>
                    <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][title_ar]" value="<?php echo esc_attr($item['title_ar'] ?? ''); ?>" class="regular-text" dir="rtl"></td></tr>
                    <tr><th>Subtitle (EN)</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][subtitle]" value="<?php echo esc_attr($item['subtitle'] ?? ''); ?>" class="regular-text"></td></tr>
                    <tr><th>Subtitle (AR)</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][subtitle_ar]" value="<?php echo esc_attr($item['subtitle_ar'] ?? ''); ?>" class="regular-text" dir="rtl"></td></tr>
                    <tr><th>Button Text (EN)</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][button_text]" value="<?php echo esc_attr($item['button_text'] ?? ''); ?>" class="regular-text" placeholder="Shop Now"></td></tr>
                    <tr><th>Button Text (AR)</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][button_text_ar]" value="<?php echo esc_attr($item['button_text_ar'] ?? ''); ?>" class="regular-text" dir="rtl" placeholder="تسوق الآن"></td></tr>
                    <tr><th>Link</th><td><input type="text" name="sasanperfumes_ads_items[<?php echo $i; ?>][link]" value="<?php echo esc_attr($item['link'] ?? ''); ?>" class="large-text" placeholder="/shop or https://example.com"></td></tr>
                </table>
            </div>
            <?php endforeach; ?>
        </div>
        <?php submit_button('Save Ads Settings'); ?>
    </form>
    <?php
}
