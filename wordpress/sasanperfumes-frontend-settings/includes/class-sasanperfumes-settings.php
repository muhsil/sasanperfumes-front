<?php
/**
 * sasanperfumes - Core Settings Functionality
 * 
 * Handles admin pages, REST API endpoints, and settings management
 * for Home Page, Header & Topbar, SEO, and Mobile Settings.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.9.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Initialize sasanperfumes settings
 */
function sasanperfumes_settings_init() {
    // Admin menu
    add_action('admin_menu', 'sasanperfumes_settings_register_menus');
    
    // REST API endpoints
    add_action('rest_api_init', 'sasanperfumes_settings_register_rest_routes');
    
    // Theme support
    add_action('after_setup_theme', 'sasanperfumes_settings_theme_support');
    
    // CORS handling
    add_action('rest_api_init', 'sasanperfumes_settings_cors_handling', 15);
    
    // Admin styles
    add_action('admin_head', 'sasanperfumes_settings_admin_styles');
    
    // Sync: when blogname/blogdescription change (Settings > General), update ShapeHive SEO
    add_action('update_option_blogname', 'sasanperfumes_sync_blogname_to_seo', 10, 2);
    add_action('update_option_blogdescription', 'sasanperfumes_sync_blogdescription_to_seo', 10, 2);
}

function sasanperfumes_sync_blogname_to_seo($old_value, $new_value) {
    if (!empty($new_value) && $new_value !== get_theme_mod('sasanperfumes_seo_title','')) {
        set_theme_mod('sasanperfumes_seo_title', $new_value);
    }
}

function sasanperfumes_sync_blogdescription_to_seo($old_value, $new_value) {
    if ($new_value !== get_theme_mod('sasanperfumes_seo_description','')) {
        set_theme_mod('sasanperfumes_seo_description', $new_value);
    }
}

/**
 * Register admin menus
 */
function sasanperfumes_settings_register_menus() {
    add_menu_page('sasanperfumes', 'sasanperfumes', 'manage_options', 'sasanperfumes-settings', 'sasanperfumes_render_admin_page', 'dashicons-admin-customizer', 30);
    add_submenu_page('sasanperfumes-settings', 'Home Page', 'Home Page', 'manage_options', 'sasanperfumes-settings', 'sasanperfumes_render_admin_page');
    add_submenu_page('sasanperfumes-settings', 'Header & Topbar', 'Header & Topbar', 'manage_options', 'sasanperfumes-settings-header', 'sasanperfumes_render_header_page');
    add_submenu_page('sasanperfumes-settings', 'SEO Settings', 'SEO Settings', 'manage_options', 'sasanperfumes-settings-seo', 'sasanperfumes_render_seo_page');
}

/**
 * Image field helper
 * Note: ID uses underscores instead of brackets so jQuery selectors work correctly
 */
function sasanperfumes_image_field($name, $value = '') {
    $has = !empty($value);
    $safe_id = str_replace(array('[',']'), array('_',''), $name);
    echo '<div class="sasanperfumes-image-field">';
    echo '<input type="hidden" name="'.esc_attr($name).'" id="'.esc_attr($safe_id).'" value="'.esc_url($value).'">';
    echo '<button type="button" class="button sasanperfumes-upload-btn" data-target="#'.esc_attr($safe_id).'" data-preview="#'.esc_attr($safe_id).'_preview">Upload Image</button>';
    echo '<button type="button" class="button sasanperfumes-remove-btn" data-target="#'.esc_attr($safe_id).'" data-preview="#'.esc_attr($safe_id).'_preview" style="'.($has ? '' : 'display:none;').'">Remove</button>';
    echo '<div id="'.esc_attr($safe_id).'_preview" class="sasanperfumes-preview">';
    if ($has) echo '<img src="'.esc_url($value).'" style="max-width:300px;max-height:150px;display:block;margin-top:10px;">';
    echo '</div></div>';
}

/**
 * Logo image field helper (stores attachment ID alongside URL)
 */
function sasanperfumes_logo_image_field($name, $attachment_id = 0) {
    $url = $attachment_id ? wp_get_attachment_image_url($attachment_id, 'full') : '';
    $has = !empty($url);
    echo '<div class="sasanperfumes-image-field">';
    echo '<input type="hidden" name="'.esc_attr($name).'" id="'.esc_attr($name).'" value="'.esc_attr($attachment_id).'" class="sasanperfumes-logo-id-field">';
    echo '<input type="hidden" name="'.esc_attr($name).'_url" id="'.esc_attr($name).'_url" value="'.esc_url($url).'">';
    echo '<button type="button" class="button sasanperfumes-logo-upload-btn" data-target-id="#'.esc_attr($name).'" data-target-url="#'.esc_attr($name).'_url" data-preview="#'.esc_attr($name).'_preview">Upload Image</button>';
    echo '<button type="button" class="button sasanperfumes-logo-remove-btn" data-target-id="#'.esc_attr($name).'" data-target-url="#'.esc_attr($name).'_url" data-preview="#'.esc_attr($name).'_preview" style="'.($has ? '' : 'display:none;').'">Remove</button>';
    echo '<div id="'.esc_attr($name).'_preview" class="sasanperfumes-preview">';
    if ($has) echo '<img src="'.esc_url($url).'" style="max-width:300px;max-height:150px;display:block;margin-top:10px;">';
    echo '</div></div>';
}

/**
 * Render main admin page (Home Page settings)
 */
function sasanperfumes_render_admin_page() {
    if (!current_user_can('manage_options')) return;
    if (isset($_POST['sasanperfumes_save_home_settings']) && check_admin_referer('sasanperfumes_home_settings_nonce')) {
        sasanperfumes_save_home_settings();
        echo '<div class="notice notice-success is-dismissible"><p>Settings saved!</p></div>';
    }
    $tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'hero';
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <nav class="nav-tab-wrapper">
            <?php foreach (['hero'=>'Hero Slider','new-products'=>'New Products','bestseller'=>'Bestsellers','categories'=>'Categories','featured'=>'Featured','collections'=>'Collections','banners'=>'Banners','why-choose-us'=>'Why Choose Us','our-story'=>'Our Story','faq'=>'FAQ','seo-content'=>'SEO Content'] as $k=>$l): ?>
                <a href="?page=sasanperfumes-settings&tab=<?php echo $k; ?>" class="nav-tab <?php echo $tab===$k?'nav-tab-active':''; ?>"><?php echo $l; ?></a>
            <?php endforeach; ?>
        </nav>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_home_settings_nonce'); ?>
            <input type="hidden" name="sasanperfumes_current_tab" value="<?php echo esc_attr($tab); ?>">
            <div class="tab-content" style="background:#fff;padding:20px;border:1px solid #ccd0d4;border-top:none;">
                <?php
                switch($tab) {
                    case 'hero': sasanperfumes_render_hero_tab(); break;
                    case 'new-products': sasanperfumes_render_products_tab('new_products','New Products'); break;
                    case 'bestseller': sasanperfumes_render_products_tab('bestseller','Bestseller'); break;
                    case 'categories': sasanperfumes_render_categories_tab(); break;
                    case 'featured': sasanperfumes_render_products_tab('featured','Featured'); break;
                    case 'collections': sasanperfumes_render_collections_tab(); break;
                    case 'banners': sasanperfumes_render_banners_tab(); break;
                    case 'why-choose-us': sasanperfumes_render_why_choose_us_tab(); break;
                    case 'our-story': sasanperfumes_render_our_story_tab(); break;
                    case 'faq': sasanperfumes_render_faq_tab(); break;
                    case 'seo-content': sasanperfumes_render_seo_content_tab(); break;
                }
                ?>
            </div>
            <?php submit_button('Save Settings','primary','sasanperfumes_save_home_settings'); ?>
        </form>
    </div>
    <?php
}

/**
 * Render Hero Slider tab
 */
function sasanperfumes_render_hero_tab() {
    $slides = get_theme_mod('sasanperfumes_hero_slides', array());
    if (empty($slides)) {
        for ($i=1; $i<=5; $i++) {
            $img = get_theme_mod("sasanperfumes_hero_slide_{$i}_image",'');
            if (!empty($img)) $slides[] = array('image'=>$img,'mobile'=>get_theme_mod("sasanperfumes_hero_slide_{$i}_mobile",''),'image_ar'=>'','mobile_ar'=>'','link'=>get_theme_mod("sasanperfumes_hero_slide_{$i}_link",''));
        }
        if (empty($slides)) $slides[] = array('image'=>'','mobile'=>'','image_ar'=>'','mobile_ar'=>'','link'=>'');
    }
    ?>
    <h2>Hero Slider Settings</h2>
    <table class="form-table">
        <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_hero_enabled" value="1" <?php checked(get_theme_mod('sasanperfumes_hero_enabled',true)); ?>> Show hero slider</label></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_hero_hide_mobile" value="1" <?php checked(get_theme_mod('sasanperfumes_hero_hide_mobile',false)); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_hero_hide_desktop" value="1" <?php checked(get_theme_mod('sasanperfumes_hero_hide_desktop',false)); ?>> Hide on desktop</label></td></tr>
        <tr><th>Autoplay</th><td><label><input type="checkbox" name="sasanperfumes_hero_autoplay" value="1" <?php checked(get_theme_mod('sasanperfumes_hero_autoplay',true)); ?>> Enable</label></td></tr>
        <tr><th>Autoplay Delay</th><td><input type="number" name="sasanperfumes_hero_autoplay_delay" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_hero_autoplay_delay',5000)); ?>" min="1000" max="10000" class="small-text"> ms</td></tr>
        <tr><th>Loop</th><td><label><input type="checkbox" name="sasanperfumes_hero_loop" value="1" <?php checked(get_theme_mod('sasanperfumes_hero_loop',true)); ?>> Enable</label></td></tr>
    </table>
    <h3>Slides <button type="button" class="button" id="sasanperfumes-add-slide">+ Add Slide</button></h3>
    <div id="sasanperfumes-hero-slides">
        <?php foreach ($slides as $i=>$s):
            $has_media = !empty($s['image']) || !empty($s['mobile']) || !empty($s['image_ar']) || !empty($s['mobile_ar']);
            $slide_enabled = array_key_exists('enabled_set', $s)
                ? !empty($s['enabled'])
                : (array_key_exists('enabled', $s) ? (!empty($s['enabled']) || $has_media) : true);
        ?>
        <div class="sasanperfumes-slide-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
            <h4>Slide <?php echo $i+1; ?> <button type="button" class="button sasanperfumes-remove-slide" style="float:right;color:red;">Remove</button></h4>
            <table class="form-table">
                <tr><th>Enable</th><td><label><input type="hidden" name="sasanperfumes_hero_slides[<?php echo $i; ?>][enabled]" value="0"><input type="checkbox" name="sasanperfumes_hero_slides[<?php echo $i; ?>][enabled]" value="1" <?php checked($slide_enabled); ?>> Show this slide</label></td></tr>
                <tr><th>Slide Type</th><td>
                    <select name="sasanperfumes_hero_slides[<?php echo $i; ?>][slide_type]">
                        <option value="image" <?php selected($s['slide_type']??'image','image'); ?>>Image</option>
                        <option value="video" <?php selected($s['slide_type']??'image','video'); ?>>Video</option>
                    </select>
                    <p class="description">Choose Image for a photo slide, Video for YouTube/Vimeo/mp4.</p>
                </td></tr>
                <tr class="sasanperfumes-slide-image-fields"><th>Desktop Image (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][image]",$s['image']??''); ?></td></tr>
                <tr class="sasanperfumes-slide-image-fields"><th>Mobile Image (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][mobile]",$s['mobile']??''); ?></td></tr>
                <tr class="sasanperfumes-slide-image-fields"><th>Desktop Image (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][image_ar]",$s['image_ar']??''); ?><p class="description">Falls back to EN if empty.</p></td></tr>
                <tr class="sasanperfumes-slide-image-fields"><th>Mobile Image (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][mobile_ar]",$s['mobile_ar']??''); ?><p class="description">Falls back to EN mobile if empty.</p></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Desktop Video URL (EN)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][video_url]" value="<?php echo esc_attr($s['video_url']??''); ?>" class="large-text" placeholder="https://youtube.com/... or .mp4 URL"></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Mobile Video URL (EN)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][video_mobile]" value="<?php echo esc_attr($s['video_mobile']??''); ?>" class="large-text" placeholder="Mobile video URL (falls back to desktop)"></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Desktop Video URL (AR)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][video_ar]" value="<?php echo esc_attr($s['video_ar']??''); ?>" class="large-text" placeholder="Arabic desktop video (falls back to EN)"></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Mobile Video URL (AR)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][video_mobile_ar]" value="<?php echo esc_attr($s['video_mobile_ar']??''); ?>" class="large-text" placeholder="Arabic mobile video (falls back to EN mobile)"></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Desktop Poster (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][poster_url]",$s['poster_url']??''); ?></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Mobile Poster (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][poster_mobile]",$s['poster_mobile']??''); ?></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Desktop Poster (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][poster_ar]",$s['poster_ar']??''); ?><p class="description">Falls back to EN poster if empty.</p></td></tr>
                <tr class="sasanperfumes-slide-video-fields"><th>Mobile Poster (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_hero_slides[{$i}][poster_mobile_ar]",$s['poster_mobile_ar']??''); ?><p class="description">Falls back to EN mobile poster if empty.</p></td></tr>
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][title_en]" value="<?php echo esc_attr($s['title_en']??''); ?>" class="large-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][title_ar]" value="<?php echo esc_attr($s['title_ar']??''); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>Subtitle (EN)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][subtitle_en]" value="<?php echo esc_attr($s['subtitle_en']??''); ?>" class="large-text"></td></tr>
                <tr><th>Subtitle (AR)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][subtitle_ar]" value="<?php echo esc_attr($s['subtitle_ar']??''); ?>" class="large-text" dir="rtl"></td></tr>
                <tr><th>CTA Label (EN)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][cta_label_en]" value="<?php echo esc_attr($s['cta_label_en']??''); ?>" class="regular-text" placeholder="Shop Now"></td></tr>
                <tr><th>CTA Label (AR)</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][cta_label_ar]" value="<?php echo esc_attr($s['cta_label_ar']??''); ?>" class="regular-text" dir="rtl" placeholder="تسوق الآن"></td></tr>
                <tr><th>Link URL</th><td><input type="text" name="sasanperfumes_hero_slides[<?php echo $i; ?>][link]" value="<?php echo esc_attr($s['link']??''); ?>" class="large-text" placeholder="/shop or https://example.com"></td></tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
}

/**
 * Render Products tab (New Products, Bestsellers, Featured)
 */
function sasanperfumes_render_products_tab($key,$label) {
    $selected_slugs = get_theme_mod("sasanperfumes_{$key}_selected_products", array());
    if (!is_array($selected_slugs)) $selected_slugs = array();
    ?>
    <h2><?php echo $label; ?> Section</h2>
    <table class="form-table">
        <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_<?php echo $key; ?>_enabled" value="1" <?php checked(get_theme_mod("sasanperfumes_{$key}_enabled",true)); ?>> Show</label></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_<?php echo $key; ?>_hide_mobile" value="1" <?php checked(get_theme_mod("sasanperfumes_{$key}_hide_mobile",false)); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_<?php echo $key; ?>_hide_desktop" value="1" <?php checked(get_theme_mod("sasanperfumes_{$key}_hide_desktop",false)); ?>> Hide on desktop</label></td></tr>
        <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_<?php echo $key; ?>_title" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_title",$label)); ?>" class="regular-text"></td></tr>
        <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_<?php echo $key; ?>_title_ar" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_title_ar",'')); ?>" class="regular-text" dir="rtl"></td></tr>
        <tr><th>Subtitle (EN)</th><td><input type="text" name="sasanperfumes_<?php echo $key; ?>_subtitle" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_subtitle",'')); ?>" class="regular-text"></td></tr>
        <tr><th>Subtitle (AR)</th><td><input type="text" name="sasanperfumes_<?php echo $key; ?>_subtitle_ar" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_subtitle_ar",'')); ?>" class="regular-text" dir="rtl"></td></tr>
        <tr><th>Count</th><td><input type="number" name="sasanperfumes_<?php echo $key; ?>_count" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_count",8)); ?>" min="4" max="24" class="small-text"><p class="description">Max products to display. If selected products exceed this, only the first N are shown.</p></td></tr>
        <tr><th>Display</th><td><select name="sasanperfumes_<?php echo $key; ?>_display"><option value="slider" <?php selected(get_theme_mod("sasanperfumes_{$key}_display",'slider'),'slider'); ?>>Slider</option><option value="grid" <?php selected(get_theme_mod("sasanperfumes_{$key}_display",'slider'),'grid'); ?>>Grid</option></select></td></tr>
        <tr><th>Show View All</th><td><label><input type="checkbox" name="sasanperfumes_<?php echo $key; ?>_show_view_all" value="1" <?php checked(get_theme_mod("sasanperfumes_{$key}_show_view_all",true)); ?>> Show "View All" button</label></td></tr>
        <tr><th>View All Link</th><td><input type="text" name="sasanperfumes_<?php echo $key; ?>_view_all_link" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_view_all_link",'/shop')); ?>" class="regular-text"><p class="description">URL for the "View All" button (e.g. /shop, /shop?featured=true)</p></td></tr>
        <tr><th>Autoplay</th><td><label><input type="checkbox" name="sasanperfumes_<?php echo $key; ?>_autoplay" value="1" <?php checked(get_theme_mod("sasanperfumes_{$key}_autoplay",true)); ?>> Enable</label></td></tr>
        <tr><th>Desktop Cols</th><td><input type="number" name="sasanperfumes_<?php echo $key; ?>_cols_desktop" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_cols_desktop",4)); ?>" min="2" max="6" class="small-text"></td></tr>
        <tr><th>Tablet Cols</th><td><input type="number" name="sasanperfumes_<?php echo $key; ?>_cols_tablet" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_cols_tablet",3)); ?>" min="2" max="4" class="small-text"></td></tr>
        <tr><th>Mobile Cols</th><td><input type="number" name="sasanperfumes_<?php echo $key; ?>_cols_mobile" value="<?php echo esc_attr(get_theme_mod("sasanperfumes_{$key}_cols_mobile",2)); ?>" min="1" max="3" class="small-text"></td></tr>
    </table>

    <h3>Selected Products <small style="color:#666;font-weight:normal;">(drag to reorder, products load automatically if none selected)</small></h3>
    <div class="sasanperfumes-product-selector-section" data-section="<?php echo $key; ?>">
        <div class="sasanperfumes-prod-selected-list" id="sasanperfumes-prod-selected-<?php echo $key; ?>" style="min-height:40px;padding:10px;background:#f9f9f9;border:1px solid #ddd;border-radius:4px;margin-bottom:15px;">
            <p class="sasanperfumes-prod-empty-msg" style="color:#999;margin:0;<?php echo !empty($selected_slugs) ? 'display:none;' : ''; ?>">No products selected. Products will load automatically based on section type.</p>
            <?php foreach ($selected_slugs as $slug): ?>
            <div class="sasanperfumes-prod-selected-item" data-slug="<?php echo esc_attr($slug); ?>" style="display:flex;align-items:center;padding:10px;margin-bottom:6px;background:#fff;border:1px solid #c5d9ed;border-radius:4px;cursor:grab;">
                <span class="dashicons dashicons-menu" style="margin-right:10px;color:#999;cursor:grab;"></span>
                <div style="flex:1;" class="sasanperfumes-prod-item-info"><strong><?php echo esc_html($slug); ?></strong> <small style="color:#666;">(loading...)</small></div>
                <input type="hidden" name="sasanperfumes_<?php echo $key; ?>_selected_products[]" value="<?php echo esc_attr($slug); ?>">
                <button type="button" class="button sasanperfumes-prod-deselect" style="color:red;" title="Remove">&times;</button>
            </div>
            <?php endforeach; ?>
        </div>
        <div style="margin-bottom:15px;">
            <input type="text" class="sasanperfumes-prod-search regular-text" placeholder="Search products by name, slug, or SKU..." autocomplete="off">
            <div class="sasanperfumes-prod-results" style="display:none;max-height:300px;overflow-y:auto;border:1px solid #ddd;border-top:none;background:#fff;"></div>
        </div>
    </div>
    <?php
}

/**
 * Render Categories tab
 */
function sasanperfumes_render_categories_tab() {
    // Fetch all WooCommerce product categories (parent=0, exclude uncategorized)
    $all_cats = get_terms(array(
        'taxonomy'   => 'product_cat',
        'hide_empty' => false,
        'parent'     => 0,
        'exclude'    => array(get_option('default_product_cat', 0)),
    ));
    if (is_wp_error($all_cats)) $all_cats = array();

    $selected_ids = get_theme_mod('sasanperfumes_categories_selected', array());
    if (!is_array($selected_ids)) $selected_ids = array();
    // Cast to int
    $selected_ids = array_map('intval', $selected_ids);
    ?>
    <h2>Categories Section</h2>
    <table class="form-table">
        <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_categories_enabled" value="1" <?php checked(get_theme_mod('sasanperfumes_categories_enabled',true)); ?>> Show</label></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_categories_hide_mobile" value="1" <?php checked(get_theme_mod('sasanperfumes_categories_hide_mobile',false)); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_categories_hide_desktop" value="1" <?php checked(get_theme_mod('sasanperfumes_categories_hide_desktop',false)); ?>> Hide on desktop</label></td></tr>
        <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_categories_title" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_categories_title','Shop by Category')); ?>" class="regular-text"></td></tr>
        <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_categories_title_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_categories_title_ar','')); ?>" class="regular-text" dir="rtl"></td></tr>
        <tr><th>Desktop Cols</th><td><input type="number" name="sasanperfumes_categories_cols_desktop" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_categories_cols_desktop',6)); ?>" min="3" max="8" class="small-text"></td></tr>
        <tr><th>Tablet Cols</th><td><input type="number" name="sasanperfumes_categories_cols_tablet" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_categories_cols_tablet',4)); ?>" min="2" max="6" class="small-text"></td></tr>
        <tr><th>Mobile Cols</th><td><input type="number" name="sasanperfumes_categories_cols_mobile" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_categories_cols_mobile',3)); ?>" min="2" max="4" class="small-text"></td></tr>
    </table>

    <h3>Select Categories to Display</h3>
    <p class="description" style="margin-bottom:12px;">Check the categories you want to show on the homepage. Drag to reorder. The number of selected categories determines how many are shown (the old Count field is no longer needed). If 4 categories are selected and Desktop Cols is 3, the 4th category wraps to the next row.</p>

    <!-- Selected categories (ordered) -->
    <div id="sasanperfumes-cat-selected" style="margin-bottom:20px;">
        <h4 style="margin-bottom:8px;">Selected Categories (drag to reorder)</h4>
        <div id="sasanperfumes-cat-selected-list" style="min-height:40px;padding:8px;background:#f0f7ff;border:2px dashed #c5d9ed;border-radius:6px;">
            <?php
            // Render selected categories in saved order
            foreach ($selected_ids as $cat_id) {
                $term = get_term($cat_id, 'product_cat');
                if (!$term || is_wp_error($term)) continue;
                $thumb_id = get_term_meta($cat_id, 'thumbnail_id', true);
                $thumb_url = $thumb_id ? wp_get_attachment_image_url($thumb_id, 'thumbnail') : '';
                $count = $term->count;
                ?>
                <div class="sasanperfumes-cat-item sasanperfumes-cat-selected-item" data-id="<?php echo esc_attr($cat_id); ?>" style="display:flex;align-items:center;padding:10px;margin-bottom:6px;background:#fff;border:1px solid #c5d9ed;border-radius:4px;cursor:grab;">
                    <span class="dashicons dashicons-menu" style="margin-right:10px;color:#999;cursor:grab;"></span>
                    <?php if ($thumb_url): ?>
                        <img src="<?php echo esc_url($thumb_url); ?>" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px;">
                    <?php endif; ?>
                    <div style="flex:1;">
                        <strong><?php echo esc_html($term->name); ?></strong>
                        <small style="color:#666;"> (<?php echo $count; ?> products) &middot; slug: <?php echo esc_html($term->slug); ?></small>
                    </div>
                    <input type="hidden" name="sasanperfumes_categories_selected[]" value="<?php echo esc_attr($cat_id); ?>">
                    <button type="button" class="button sasanperfumes-cat-deselect" style="color:red;" title="Remove">&times;</button>
                </div>
                <?php
            }
            ?>
        </div>
        <p id="sasanperfumes-cat-empty-msg" style="color:#999;text-align:center;padding:10px;<?php echo !empty($selected_ids) ? 'display:none;' : ''; ?>">No categories selected. Check categories below to add them.</p>
    </div>

    <!-- Available categories -->
    <div id="sasanperfumes-cat-available">
        <h4 style="margin-bottom:8px;">Available Categories</h4>
        <div style="max-height:400px;overflow-y:auto;border:1px solid #ddd;border-radius:6px;padding:8px;background:#fafafa;">
            <?php foreach ($all_cats as $cat):
                $is_selected = in_array($cat->term_id, $selected_ids);
                $thumb_id = get_term_meta($cat->term_id, 'thumbnail_id', true);
                $thumb_url = $thumb_id ? wp_get_attachment_image_url($thumb_id, 'thumbnail') : '';
            ?>
                <div class="sasanperfumes-cat-available-item" data-id="<?php echo esc_attr($cat->term_id); ?>" data-name="<?php echo esc_attr($cat->name); ?>" data-slug="<?php echo esc_attr($cat->slug); ?>" data-count="<?php echo esc_attr($cat->count); ?>" data-thumb="<?php echo esc_url($thumb_url); ?>" style="display:flex;align-items:center;padding:8px;border-bottom:1px solid #eee;<?php echo $is_selected ? 'opacity:0.4;' : ''; ?>">
                    <label style="display:flex;align-items:center;flex:1;cursor:pointer;">
                        <input type="checkbox" class="sasanperfumes-cat-checkbox" value="<?php echo esc_attr($cat->term_id); ?>" <?php checked($is_selected); ?> style="margin-right:10px;">
                        <?php if ($thumb_url): ?>
                            <img src="<?php echo esc_url($thumb_url); ?>" style="width:36px;height:36px;object-fit:cover;border-radius:4px;margin-right:10px;">
                        <?php endif; ?>
                        <div>
                            <strong><?php echo esc_html($cat->name); ?></strong>
                            <small style="color:#666;"> (<?php echo $cat->count; ?> products) &middot; slug: <?php echo esc_html($cat->slug); ?></small>
                        </div>
                    </label>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Cleanup: Empty / unused categories -->
    <?php
    $empty_cats = array_filter($all_cats, function($cat) { return $cat->count === 0; });
    if (!empty($empty_cats)):
    ?>
    <div style="margin-top:30px;padding:15px;background:#fff8e1;border:1px solid #ffecb3;border-radius:6px;">
        <h4 style="margin-bottom:8px;color:#e65100;">Category Cleanup</h4>
        <p class="description" style="margin-bottom:12px;">The following categories have <strong>0 products</strong> and may be leftover from the old website. You can delete them from <a href="<?php echo admin_url('edit-tags.php?taxonomy=product_cat&post_type=product'); ?>" target="_blank">Products &gt; Categories</a>.</p>
        <div style="max-height:200px;overflow-y:auto;">
            <?php foreach ($empty_cats as $cat): ?>
                <div style="display:flex;align-items:center;padding:6px 0;border-bottom:1px solid #ffecb3;">
                    <span style="flex:1;"><strong><?php echo esc_html($cat->name); ?></strong> <small style="color:#999;">slug: <?php echo esc_html($cat->slug); ?></small></span>
                    <a href="<?php echo admin_url('edit-tags.php?taxonomy=product_cat&post_type=product&s=' . urlencode($cat->name)); ?>" class="button button-small" target="_blank" style="color:#e65100;">Manage</a>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>
    <?php
}

/**
 * Render Collections tab
 */
function sasanperfumes_render_collections_tab() {
    $items = get_theme_mod('sasanperfumes_collections_items', array());
    if (empty($items)) {
        for ($i=1; $i<=6; $i++) {
            $img = get_theme_mod("sasanperfumes_collection_{$i}_image",'');
            $title = get_theme_mod("sasanperfumes_collection_{$i}_title",'');
            if (!empty($img)||!empty($title)) $items[] = array('image'=>$img,'title'=>$title,'title_ar'=>get_theme_mod("sasanperfumes_collection_{$i}_title_ar",''),'description'=>get_theme_mod("sasanperfumes_collection_{$i}_description",''),'description_ar'=>get_theme_mod("sasanperfumes_collection_{$i}_description_ar",''),'link'=>get_theme_mod("sasanperfumes_collection_{$i}_link",''));
        }
        if (empty($items)) $items[] = array('image'=>'','title'=>'','title_ar'=>'','description'=>'','description_ar'=>'','link'=>'');
    }
    ?>
    <h2>Collections Section</h2>
    <table class="form-table">
        <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_collections_enabled" value="1" <?php checked(get_theme_mod('sasanperfumes_collections_enabled',true)); ?>> Show</label></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_collections_hide_mobile" value="1" <?php checked(get_theme_mod('sasanperfumes_collections_hide_mobile',false)); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_collections_hide_desktop" value="1" <?php checked(get_theme_mod('sasanperfumes_collections_hide_desktop',false)); ?>> Hide on desktop</label></td></tr>
        <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_collections_title" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_collections_title','Our Collections')); ?>" class="regular-text"></td></tr>
        <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_collections_title_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_collections_title_ar','')); ?>" class="regular-text" dir="rtl"></td></tr>
        <tr><th>Layout</th><td><select name="sasanperfumes_collections_layout"><option value="grid" <?php selected(get_theme_mod('sasanperfumes_collections_layout','grid'),'grid'); ?>>Grid</option><option value="masonry" <?php selected(get_theme_mod('sasanperfumes_collections_layout','grid'),'masonry'); ?>>Masonry</option><option value="slider" <?php selected(get_theme_mod('sasanperfumes_collections_layout','grid'),'slider'); ?>>Slider</option></select></td></tr>
        <tr><th>Desktop Cols</th><td><input type="number" name="sasanperfumes_collections_cols_desktop" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_collections_cols_desktop',3)); ?>" min="2" max="4" class="small-text"></td></tr>
        <tr><th>Tablet Cols</th><td><input type="number" name="sasanperfumes_collections_cols_tablet" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_collections_cols_tablet',2)); ?>" min="1" max="3" class="small-text"></td></tr>
        <tr><th>Mobile Cols</th><td><input type="number" name="sasanperfumes_collections_cols_mobile" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_collections_cols_mobile',1)); ?>" min="1" max="2" class="small-text"></td></tr>
    </table>
    <h3>Items <button type="button" class="button" id="sasanperfumes-add-collection">+ Add</button></h3>
    <div id="sasanperfumes-collections-items">
        <?php foreach ($items as $i=>$item): ?>
        <div class="sasanperfumes-collection-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
            <h4>Collection <?php echo $i+1; ?> <button type="button" class="button sasanperfumes-remove-collection" style="float:right;color:red;">Remove</button></h4>
            <table class="form-table">
                <tr><th>Image</th><td><?php sasanperfumes_image_field("sasanperfumes_collections_items[{$i}][image]",$item['image']??''); ?></td></tr>
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_collections_items[<?php echo $i; ?>][title]" value="<?php echo esc_attr($item['title']??''); ?>" class="regular-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_collections_items[<?php echo $i; ?>][title_ar]" value="<?php echo esc_attr($item['title_ar']??''); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_collections_items[<?php echo $i; ?>][description]" class="large-text" rows="2"><?php echo esc_textarea($item['description']??''); ?></textarea></td></tr>
                <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_collections_items[<?php echo $i; ?>][description_ar]" class="large-text" rows="2" dir="rtl"><?php echo esc_textarea($item['description_ar']??''); ?></textarea></td></tr>
                <tr><th>Link</th><td><input type="text" name="sasanperfumes_collections_items[<?php echo $i; ?>][link]" value="<?php echo esc_attr($item['link']??''); ?>" class="large-text" placeholder="/shop or https://example.com"></td></tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
}

/**
 * Render Banners tab
 */
function sasanperfumes_render_banners_tab() {
    $items = get_theme_mod('sasanperfumes_banners_items', array());
    if (empty($items)) {
        for ($i=1; $i<=4; $i++) {
            $img = get_theme_mod("sasanperfumes_banner_{$i}_image",'');
            if (!empty($img)) $items[] = array('image'=>$img,'mobile'=>get_theme_mod("sasanperfumes_banner_{$i}_mobile",''),'title'=>get_theme_mod("sasanperfumes_banner_{$i}_title",''),'title_ar'=>get_theme_mod("sasanperfumes_banner_{$i}_title_ar",''),'subtitle'=>get_theme_mod("sasanperfumes_banner_{$i}_subtitle",''),'subtitle_ar'=>get_theme_mod("sasanperfumes_banner_{$i}_subtitle_ar",''),'link'=>get_theme_mod("sasanperfumes_banner_{$i}_link",''));
        }
        if (empty($items)) $items[] = array('image'=>'','mobile'=>'','image_ar'=>'','mobile_ar'=>'','title'=>'','title_ar'=>'','subtitle'=>'','subtitle_ar'=>'','link'=>'');
    }
    ?>
    <h2>Banners Section</h2>
    <table class="form-table">
        <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_banners_enabled" value="1" <?php checked(get_theme_mod('sasanperfumes_banners_enabled',true)); ?>> Show</label></td></tr>
        <tr><th>Hide on Mobile</th><td><label><input type="checkbox" name="sasanperfumes_banners_hide_mobile" value="1" <?php checked(get_theme_mod('sasanperfumes_banners_hide_mobile',false)); ?>> Hide on mobile</label></td></tr>
        <tr><th>Hide on Desktop</th><td><label><input type="checkbox" name="sasanperfumes_banners_hide_desktop" value="1" <?php checked(get_theme_mod('sasanperfumes_banners_hide_desktop',false)); ?>> Hide on desktop</label></td></tr>
        <tr><th>Layout</th><td><select name="sasanperfumes_banners_layout"><option value="grid" <?php selected(get_theme_mod('sasanperfumes_banners_layout','grid'),'grid'); ?>>Grid</option><option value="full-width" <?php selected(get_theme_mod('sasanperfumes_banners_layout','grid'),'full-width'); ?>>Full Width</option><option value="slider" <?php selected(get_theme_mod('sasanperfumes_banners_layout','grid'),'slider'); ?>>Slider</option></select></td></tr>
        <tr><th>Desktop Cols</th><td><input type="number" name="sasanperfumes_banners_cols_desktop" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_banners_cols_desktop',2)); ?>" min="1" max="4" class="small-text"></td></tr>
        <tr><th>Tablet Cols</th><td><input type="number" name="sasanperfumes_banners_cols_tablet" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_banners_cols_tablet',2)); ?>" min="1" max="3" class="small-text"></td></tr>
        <tr><th>Mobile Cols</th><td><input type="number" name="sasanperfumes_banners_cols_mobile" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_banners_cols_mobile',1)); ?>" min="1" max="2" class="small-text"></td></tr>
    </table>
    <h3>Items <button type="button" class="button" id="sasanperfumes-add-banner">+ Add</button></h3>
    <div id="sasanperfumes-banners-items">
        <?php foreach ($items as $i=>$item): ?>
        <div class="sasanperfumes-banner-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">
            <h4>Banner <?php echo $i+1; ?> <button type="button" class="button sasanperfumes-remove-banner" style="float:right;color:red;">Remove</button></h4>
            <table class="form-table">
                <tr><th>Desktop Image (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_banners_items[{$i}][image]",$item['image']??''); ?></td></tr>
                <tr><th>Mobile Image (EN)</th><td><?php sasanperfumes_image_field("sasanperfumes_banners_items[{$i}][mobile]",$item['mobile']??''); ?></td></tr>
                <tr><th>Desktop Image (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_banners_items[{$i}][image_ar]",$item['image_ar']??''); ?><p class="description">Arabic version. Falls back to EN image if empty.</p></td></tr>
                <tr><th>Mobile Image (AR)</th><td><?php sasanperfumes_image_field("sasanperfumes_banners_items[{$i}][mobile_ar]",$item['mobile_ar']??''); ?><p class="description">Arabic version. Falls back to EN mobile image if empty.</p></td></tr>
                <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_banners_items[<?php echo $i; ?>][title]" value="<?php echo esc_attr($item['title']??''); ?>" class="regular-text"></td></tr>
                <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_banners_items[<?php echo $i; ?>][title_ar]" value="<?php echo esc_attr($item['title_ar']??''); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>Subtitle (EN)</th><td><input type="text" name="sasanperfumes_banners_items[<?php echo $i; ?>][subtitle]" value="<?php echo esc_attr($item['subtitle']??''); ?>" class="regular-text"></td></tr>
                <tr><th>Subtitle (AR)</th><td><input type="text" name="sasanperfumes_banners_items[<?php echo $i; ?>][subtitle_ar]" value="<?php echo esc_attr($item['subtitle_ar']??''); ?>" class="regular-text" dir="rtl"></td></tr>
                <tr><th>Link</th><td><input type="text" name="sasanperfumes_banners_items[<?php echo $i; ?>][link]" value="<?php echo esc_attr($item['link']??''); ?>" class="large-text" placeholder="/shop or https://example.com"></td></tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
}

/**
 * Render Header & Topbar page
 */
function sasanperfumes_render_header_page() {
    if (!current_user_can('manage_options')) return;
    if (isset($_POST['sasanperfumes_save_header_settings']) && check_admin_referer('sasanperfumes_header_settings_nonce')) {
        sasanperfumes_save_header_settings();
        echo '<div class="notice notice-success is-dismissible"><p>Settings saved!</p></div>';
    }
    ?>
    <div class="wrap">
        <h1>Header & Topbar Settings</h1>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_header_settings_nonce'); ?>
            <div style="background:#fff;padding:20px;border:1px solid #ccd0d4;">
                <h2>Site Logo</h2>
                <p class="description">Upload your site logo here. This logo will be used across the entire site (header, footer, invoices, etc.).</p>
                <table class="form-table">
                    <tr><th>Logo</th><td><?php sasanperfumes_logo_image_field('sasanperfumes_site_logo', get_theme_mod('custom_logo', 0)); ?></td></tr>
                </table>
                <h2>Header Settings</h2>
                <table class="form-table">
                    <tr><th>Sticky Header</th><td><label><input type="checkbox" name="sasanperfumes_header_sticky" value="1" <?php checked(get_theme_mod('sasanperfumes_header_sticky',true)); ?>> Enable</label></td></tr>
                </table>
                <h2>Promotional Top Bar</h2>
                <table class="form-table">
                    <tr><th>Enable</th><td><label><input type="checkbox" name="sasanperfumes_topbar_enabled" value="1" <?php checked(get_theme_mod('sasanperfumes_topbar_enabled',true)); ?>> Show</label></td></tr>
                    <tr><th>Text (EN)</th><td><input type="text" name="sasanperfumes_topbar_text" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_topbar_text','Free shipping on orders over 200 SAR')); ?>" class="large-text"></td></tr>
                    <tr><th>Text (AR)</th><td><input type="text" name="sasanperfumes_topbar_text_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_topbar_text_ar','')); ?>" class="large-text" dir="rtl"></td></tr>
                    <tr><th>Link</th><td><input type="text" name="sasanperfumes_topbar_link" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_topbar_link','')); ?>" class="large-text" placeholder="/shop or https://example.com"></td></tr>
                    <tr><th>BG Color</th><td><input type="text" name="sasanperfumes_topbar_bg_color" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_topbar_bg_color','#f3f4f6')); ?>" class="regular-text"></td></tr>
                    <tr><th>Text Color</th><td><input type="text" name="sasanperfumes_topbar_text_color" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_topbar_text_color','#4b5563')); ?>" class="regular-text"></td></tr>
                    <tr><th>Dismissible</th><td><label><input type="checkbox" name="sasanperfumes_topbar_dismissible" value="1" <?php checked(get_theme_mod('sasanperfumes_topbar_dismissible',false)); ?>> Allow dismiss</label></td></tr>
                    <tr><th>Mobile Visibility</th><td><label><input type="checkbox" name="sasanperfumes_topbar_hide_mobile" value="1" <?php checked(get_theme_mod('sasanperfumes_topbar_hide_mobile',true)); ?>> Hide on mobile</label></td></tr>
                    <tr><th>Free Shipping Threshold (AED)</th><td><input type="number" name="sasanperfumes_free_shipping_threshold" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_free_shipping_threshold', 500)); ?>" min="0" step="1" class="small-text"><p class="description">Minimum order value for free shipping. Used by the frontend cart and topbar. Default: 500.</p></td></tr>
                </table>
                <h2>Mega Menu (Shop All)</h2>
                <table class="form-table">
                    <tr><th>Display Mode</th><td>
                        <select name="sasanperfumes_megamenu_display_mode">
                            <option value="child-based" <?php selected(get_theme_mod('sasanperfumes_megamenu_display_mode','child-based'),'child-based'); ?>>Child-Based (show subcategories under parent)</option>
                            <option value="flat" <?php selected(get_theme_mod('sasanperfumes_megamenu_display_mode','child-based'),'flat'); ?>>Flat (show all categories at same level)</option>
                        </select>
                        <p class="description">Controls how the Shop All mega menu is displayed. "Child-Based" groups items under parent categories. "Flat" shows all categories at the same level.</p>
                    </td></tr>
                    <tr><th>Show Featured Products</th><td><label><input type="checkbox" name="sasanperfumes_megamenu_show_products" value="1" <?php checked(get_theme_mod('sasanperfumes_megamenu_show_products',true)); ?>> Show featured products column in mega menu</label></td></tr>
                    <tr><th>Max Columns</th><td><input type="number" name="sasanperfumes_megamenu_max_columns" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_megamenu_max_columns',3)); ?>" min="2" max="5" class="small-text"><p class="description">Maximum number of category columns to display.</p></td></tr>
                </table>
            </div>
            <?php submit_button('Save Settings','primary','sasanperfumes_save_header_settings'); ?>
        </form>
    </div>
    <?php
}

/**
 * Render SEO Settings page
 */
function sasanperfumes_render_seo_page() {
    if (!current_user_can('manage_options')) return;
    if (isset($_POST['sasanperfumes_save_seo_settings']) && check_admin_referer('sasanperfumes_seo_settings_nonce')) {
        sasanperfumes_save_seo_settings();
        echo '<div class="notice notice-success is-dismissible"><p>Settings saved!</p></div>';
    }
    $seo_tab = isset($_GET['seo_tab']) ? sanitize_text_field($_GET['seo_tab']) : 'general';
    ?>
    <div class="wrap">
        <h1>SEO Settings</h1>
        <nav class="nav-tab-wrapper">
            <?php foreach (['general'=>'General','opengraph'=>'Open Graph (Facebook)','twitter'=>'Twitter Card','google'=>'Google & Analytics','advanced'=>'Advanced'] as $k=>$l): ?>
                <a href="?page=sasanperfumes-settings-seo&seo_tab=<?php echo $k; ?>" class="nav-tab <?php echo $seo_tab===$k?'nav-tab-active':''; ?>"><?php echo $l; ?></a>
            <?php endforeach; ?>
        </nav>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_seo_settings_nonce'); ?>
            <input type="hidden" name="sasanperfumes_seo_current_tab" value="<?php echo esc_attr($seo_tab); ?>">
            <div style="background:#fff;padding:20px;border:1px solid #ccd0d4;border-top:none;">
                <?php
                switch($seo_tab) {
                    case 'general': sasanperfumes_render_seo_general_tab(); break;
                    case 'opengraph': sasanperfumes_render_seo_opengraph_tab(); break;
                    case 'twitter': sasanperfumes_render_seo_twitter_tab(); break;
                    case 'google': sasanperfumes_render_seo_google_tab(); break;
                    case 'advanced': sasanperfumes_render_seo_advanced_tab(); break;
                }
                ?>
            </div>
            <?php submit_button('Save Settings','primary','sasanperfumes_save_seo_settings'); ?>
        </form>
    </div>
    <?php
}

function sasanperfumes_render_seo_general_tab() {
    $site_title = get_bloginfo('name');
    $site_tagline = get_bloginfo('description');
    ?>
    <h2>General Meta Tags</h2>
    <p class="description" style="margin-bottom:15px;">These are the default meta tags for your site. The Meta Title (EN) syncs with WordPress Site Title, and Meta Description (EN) syncs with Tagline in <strong>Settings &gt; General</strong> and <strong>Appearance &gt; Customize &gt; Site Identity</strong>.</p>
    <table class="form-table">
        <tr><th>Meta Title (EN)</th><td><input type="text" name="sasanperfumes_seo_title" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_title',$site_title)); ?>" class="large-text"><p class="description">Synced with WordPress Site Title. Updates here will update Site Title everywhere.</p></td></tr>
        <tr><th>Meta Title (AR)</th><td><input type="text" name="sasanperfumes_seo_title_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_title_ar','')); ?>" class="large-text" dir="rtl"><p class="description">Arabic version of the meta title for RTL pages.</p></td></tr>
        <tr><th>Meta Description (EN)</th><td><textarea name="sasanperfumes_seo_description" class="large-text" rows="3"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_description',$site_tagline)); ?></textarea><p class="description">Synced with WordPress Tagline. Updates here will update the Tagline everywhere.</p></td></tr>
        <tr><th>Meta Description (AR)</th><td><textarea name="sasanperfumes_seo_description_ar" class="large-text" rows="3" dir="rtl"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_description_ar','')); ?></textarea><p class="description">Arabic version of the meta description for RTL pages.</p></td></tr>
        <tr><th>Meta Keywords (EN)</th><td><input type="text" name="sasanperfumes_seo_keywords" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_keywords','')); ?>" class="large-text"><p class="description">Comma-separated keywords for search engines.</p></td></tr>
        <tr><th>Meta Keywords (AR)</th><td><input type="text" name="sasanperfumes_seo_keywords_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_keywords_ar','')); ?>" class="large-text" dir="rtl"></td></tr>
    </table>
    <?php
}

function sasanperfumes_render_seo_opengraph_tab() {
    ?>
    <h2>Open Graph Tags (Facebook / Social Media)</h2>
    <p class="description" style="margin-bottom:15px;">These tags control how your site appears when shared on Facebook, LinkedIn, WhatsApp, and other platforms that support Open Graph.</p>
    <table class="form-table">
        <tr><th>OG Title (EN)</th><td><input type="text" name="sasanperfumes_seo_og_title" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_og_title','')); ?>" class="large-text"><p class="description">Leave empty to use Meta Title.</p></td></tr>
        <tr><th>OG Title (AR)</th><td><input type="text" name="sasanperfumes_seo_og_title_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_og_title_ar','')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>OG Description (EN)</th><td><textarea name="sasanperfumes_seo_og_description" class="large-text" rows="3"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_og_description','')); ?></textarea><p class="description">Leave empty to use Meta Description.</p></td></tr>
        <tr><th>OG Description (AR)</th><td><textarea name="sasanperfumes_seo_og_description_ar" class="large-text" rows="3" dir="rtl"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_og_description_ar','')); ?></textarea></td></tr>
        <tr><th>OG Image</th><td><?php sasanperfumes_image_field('sasanperfumes_seo_og_image',get_theme_mod('sasanperfumes_seo_og_image','')); ?><p class="description">Recommended: 1200x630 pixels. Used when sharing on Facebook, WhatsApp, LinkedIn, etc.</p></td></tr>
        <tr><th>OG Type</th><td><select name="sasanperfumes_seo_og_type"><option value="website" <?php selected(get_theme_mod('sasanperfumes_seo_og_type','website'),'website'); ?>>Website</option><option value="article" <?php selected(get_theme_mod('sasanperfumes_seo_og_type','website'),'article'); ?>>Article</option><option value="product" <?php selected(get_theme_mod('sasanperfumes_seo_og_type','website'),'product'); ?>>Product</option><option value="business.business" <?php selected(get_theme_mod('sasanperfumes_seo_og_type','website'),'business.business'); ?>>Business</option></select></td></tr>
        <tr><th>OG Site Name</th><td><input type="text" name="sasanperfumes_seo_og_site_name" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_og_site_name','')); ?>" class="regular-text"><p class="description">Leave empty to use Site Title.</p></td></tr>
        <tr><th>Facebook App ID</th><td><input type="text" name="sasanperfumes_seo_fb_app_id" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_fb_app_id','')); ?>" class="regular-text"><p class="description">Optional. For Facebook Insights integration.</p></td></tr>
    </table>
    <?php
}

function sasanperfumes_render_seo_twitter_tab() {
    ?>
    <h2>Twitter Card Tags</h2>
    <p class="description" style="margin-bottom:15px;">These tags control how your site appears when shared on Twitter/X.</p>
    <table class="form-table">
        <tr><th>Card Type</th><td><select name="sasanperfumes_seo_twitter_card"><option value="summary_large_image" <?php selected(get_theme_mod('sasanperfumes_seo_twitter_card','summary_large_image'),'summary_large_image'); ?>>Summary Large Image</option><option value="summary" <?php selected(get_theme_mod('sasanperfumes_seo_twitter_card','summary_large_image'),'summary'); ?>>Summary</option><option value="app" <?php selected(get_theme_mod('sasanperfumes_seo_twitter_card','summary_large_image'),'app'); ?>>App</option></select></td></tr>
        <tr><th>Twitter Site (@handle)</th><td><input type="text" name="sasanperfumes_seo_twitter_site" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_twitter_site','')); ?>" class="regular-text" placeholder="@yourbrand"><p class="description">Your brand's Twitter/X handle.</p></td></tr>
        <tr><th>Twitter Creator</th><td><input type="text" name="sasanperfumes_seo_twitter_creator" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_twitter_creator','')); ?>" class="regular-text" placeholder="@creatorhandle"><p class="description">Content creator's Twitter/X handle (optional).</p></td></tr>
        <tr><th>Twitter Title (EN)</th><td><input type="text" name="sasanperfumes_seo_twitter_title" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_twitter_title','')); ?>" class="large-text"><p class="description">Leave empty to use Meta Title.</p></td></tr>
        <tr><th>Twitter Title (AR)</th><td><input type="text" name="sasanperfumes_seo_twitter_title_ar" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_twitter_title_ar','')); ?>" class="large-text" dir="rtl"></td></tr>
        <tr><th>Twitter Description (EN)</th><td><textarea name="sasanperfumes_seo_twitter_description" class="large-text" rows="3"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_twitter_description','')); ?></textarea><p class="description">Leave empty to use Meta Description.</p></td></tr>
        <tr><th>Twitter Description (AR)</th><td><textarea name="sasanperfumes_seo_twitter_description_ar" class="large-text" rows="3" dir="rtl"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_twitter_description_ar','')); ?></textarea></td></tr>
        <tr><th>Twitter Image</th><td><?php sasanperfumes_image_field('sasanperfumes_seo_twitter_image',get_theme_mod('sasanperfumes_seo_twitter_image','')); ?><p class="description">Leave empty to use OG Image. Recommended: 1200x600 pixels.</p></td></tr>
    </table>
    <?php
}

function sasanperfumes_render_seo_google_tab() {
    ?>
    <h2>Google & Analytics</h2>
    <p class="description" style="margin-bottom:15px;">Verification codes and analytics tracking IDs for search engines and analytics platforms.</p>
    <table class="form-table">
        <tr><th>Google Site Verification</th><td><input type="text" name="sasanperfumes_seo_google_verification" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_google_verification','')); ?>" class="large-text"><p class="description">The content value from Google Search Console verification meta tag.</p></td></tr>
        <tr><th>Bing Site Verification</th><td><input type="text" name="sasanperfumes_seo_bing_verification" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_bing_verification','')); ?>" class="large-text"><p class="description">The content value from Bing Webmaster Tools verification meta tag.</p></td></tr>
        <tr><th>Google Analytics ID</th><td><input type="text" name="sasanperfumes_seo_ga_id" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_ga_id','')); ?>" class="regular-text" placeholder="G-XXXXXXXXXX"><p class="description">Google Analytics 4 Measurement ID.</p></td></tr>
        <tr><th>Google Tag Manager ID</th><td><input type="text" name="sasanperfumes_seo_gtm_id" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_gtm_id','')); ?>" class="regular-text" placeholder="GTM-XXXXXXX"><p class="description">Google Tag Manager Container ID.</p></td></tr>
        <tr><th>Facebook Pixel ID</th><td><input type="text" name="sasanperfumes_seo_fb_pixel_id" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_fb_pixel_id','')); ?>" class="regular-text"><p class="description">Facebook/Meta Pixel tracking ID.</p></td></tr>
        <tr><th>Snapchat Pixel ID</th><td><input type="text" name="sasanperfumes_seo_snap_pixel_id" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_snap_pixel_id','')); ?>" class="regular-text"><p class="description">Snapchat Pixel tracking ID.</p></td></tr>
        <tr><th>TikTok Pixel ID</th><td><input type="text" name="sasanperfumes_seo_tiktok_pixel_id" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_tiktok_pixel_id','')); ?>" class="regular-text"><p class="description">TikTok Pixel tracking ID.</p></td></tr>
    </table>
    <?php
}

function sasanperfumes_render_seo_advanced_tab() {
    ?>
    <h2>Advanced SEO</h2>
    <table class="form-table">
        <tr><th>Canonical URL</th><td><input type="url" name="sasanperfumes_seo_canonical_url" value="<?php echo esc_attr(get_theme_mod('sasanperfumes_seo_canonical_url','')); ?>" class="large-text" placeholder="https://yourdomain.com"><p class="description">Override the default canonical URL for the homepage. Leave empty to use the site URL.</p></td></tr>
        <tr><th>Robots</th><td><select name="sasanperfumes_seo_robots"><option value="index,follow" <?php selected(get_theme_mod('sasanperfumes_seo_robots','index,follow'),'index,follow'); ?>>Index, Follow</option><option value="noindex,follow" <?php selected(get_theme_mod('sasanperfumes_seo_robots','index,follow'),'noindex,follow'); ?>>No Index, Follow</option><option value="index,nofollow" <?php selected(get_theme_mod('sasanperfumes_seo_robots','index,follow'),'index,nofollow'); ?>>Index, No Follow</option><option value="noindex,nofollow" <?php selected(get_theme_mod('sasanperfumes_seo_robots','index,follow'),'noindex,nofollow'); ?>>No Index, No Follow</option></select></td></tr>
        <tr><th>Schema.org Type</th><td><select name="sasanperfumes_seo_schema_type"><option value="Organization" <?php selected(get_theme_mod('sasanperfumes_seo_schema_type','Organization'),'Organization'); ?>>Organization</option><option value="LocalBusiness" <?php selected(get_theme_mod('sasanperfumes_seo_schema_type','Organization'),'LocalBusiness'); ?>>Local Business</option><option value="Store" <?php selected(get_theme_mod('sasanperfumes_seo_schema_type','Organization'),'Store'); ?>>Store</option><option value="OnlineStore" <?php selected(get_theme_mod('sasanperfumes_seo_schema_type','Organization'),'OnlineStore'); ?>>Online Store</option></select><p class="description">Schema.org structured data type for your business.</p></td></tr>
        <tr><th>Custom Head Code</th><td><textarea name="sasanperfumes_seo_custom_head" class="large-text code" rows="6"><?php echo esc_textarea(get_theme_mod('sasanperfumes_seo_custom_head','')); ?></textarea><p class="description">Custom HTML/scripts to inject in the &lt;head&gt; section. Use for additional tracking codes or meta tags.</p></td></tr>
    </table>
    <?php
}


/**
 * Save Home Settings
 */
function sasanperfumes_save_home_settings() {
    $tab = isset($_POST['sasanperfumes_current_tab']) ? sanitize_text_field($_POST['sasanperfumes_current_tab']) : '';
    
    switch ($tab) {
        case 'hero':
            set_theme_mod('sasanperfumes_hero_enabled', isset($_POST['sasanperfumes_hero_enabled']));
            set_theme_mod('sasanperfumes_hero_hide_mobile', isset($_POST['sasanperfumes_hero_hide_mobile']));
            set_theme_mod('sasanperfumes_hero_hide_desktop', isset($_POST['sasanperfumes_hero_hide_desktop']));
            set_theme_mod('sasanperfumes_hero_autoplay', isset($_POST['sasanperfumes_hero_autoplay']));
            $hero_autoplay_delay = absint($_POST['sasanperfumes_hero_autoplay_delay'] ?? 5000);
            set_theme_mod('sasanperfumes_hero_autoplay_delay', min(10000, max(1000, $hero_autoplay_delay)));
            set_theme_mod('sasanperfumes_hero_loop', isset($_POST['sasanperfumes_hero_loop']));
            $slides = array();
            if (isset($_POST['sasanperfumes_hero_slides']) && is_array($_POST['sasanperfumes_hero_slides'])) {
                foreach ($_POST['sasanperfumes_hero_slides'] as $s) {
                    if (!is_array($s)) continue;
                    $image = esc_url_raw($s['image'] ?? '');
                    $mobile = esc_url_raw($s['mobile'] ?? '');
                    $image_ar = esc_url_raw($s['image_ar'] ?? '');
                    $mobile_ar = esc_url_raw($s['mobile_ar'] ?? '');
                    $has_media = !empty($image) || !empty($mobile) || !empty($image_ar) || !empty($mobile_ar);
                    $enabled = array_key_exists('enabled', $s) ? !empty($s['enabled']) && $s['enabled'] !== '0' : $has_media;
                    $raw_type = $s['slide_type'] ?? 'image';
                    $slide_type = in_array($raw_type, array('image','video'), true) ? $raw_type : 'image';
                    $video_url      = esc_url_raw($s['video_url'] ?? '');
                    $video_mobile   = esc_url_raw($s['video_mobile'] ?? '');
                    $video_ar       = esc_url_raw($s['video_ar'] ?? '');
                    $video_mobile_ar= esc_url_raw($s['video_mobile_ar'] ?? '');
                    $poster_url     = esc_url_raw($s['poster_url'] ?? '');
                    $poster_mobile  = esc_url_raw($s['poster_mobile'] ?? '');
                    $poster_ar      = esc_url_raw($s['poster_ar'] ?? '');
                    $poster_mobile_ar = esc_url_raw($s['poster_mobile_ar'] ?? '');
                    $title_en      = sanitize_text_field($s['title_en'] ?? '');
                    $title_ar      = sanitize_text_field($s['title_ar'] ?? '');
                    $subtitle_en   = sanitize_text_field($s['subtitle_en'] ?? '');
                    $subtitle_ar   = sanitize_text_field($s['subtitle_ar'] ?? '');
                    $cta_label_en  = sanitize_text_field($s['cta_label_en'] ?? '');
                    $cta_label_ar  = sanitize_text_field($s['cta_label_ar'] ?? '');
                    $slides[] = array(
                        'enabled'=>$enabled,'enabled_set'=>true,
                        'image'=>$image,'mobile'=>$mobile,'image_ar'=>$image_ar,'mobile_ar'=>$mobile_ar,
                        'link'=>sasanperfumes_sanitize_link($s['link']??''),'slide_type'=>$slide_type,
                        'video_url'=>$video_url,'video_mobile'=>$video_mobile,'video_ar'=>$video_ar,'video_mobile_ar'=>$video_mobile_ar,
                        'poster_url'=>$poster_url,'poster_mobile'=>$poster_mobile,'poster_ar'=>$poster_ar,'poster_mobile_ar'=>$poster_mobile_ar,
                        'title_en'=>$title_en,'title_ar'=>$title_ar,'subtitle_en'=>$subtitle_en,'subtitle_ar'=>$subtitle_ar,
                        'cta_label_en'=>$cta_label_en,'cta_label_ar'=>$cta_label_ar,
                    );
                }
            }
            set_theme_mod('sasanperfumes_hero_slides', $slides);
            break;
            
        case 'new-products':
            sasanperfumes_save_products_section('new_products');
            break;
            
        case 'bestseller':
            sasanperfumes_save_products_section('bestseller');
            break;
            
        case 'featured':
            sasanperfumes_save_products_section('featured');
            break;
            
        case 'categories':
            set_theme_mod('sasanperfumes_categories_enabled', isset($_POST['sasanperfumes_categories_enabled']));
            set_theme_mod('sasanperfumes_categories_hide_mobile', isset($_POST['sasanperfumes_categories_hide_mobile']));
            set_theme_mod('sasanperfumes_categories_hide_desktop', isset($_POST['sasanperfumes_categories_hide_desktop']));
            set_theme_mod('sasanperfumes_categories_title', sanitize_text_field($_POST['sasanperfumes_categories_title']??''));
            set_theme_mod('sasanperfumes_categories_title_ar', sanitize_text_field($_POST['sasanperfumes_categories_title_ar']??''));
            set_theme_mod('sasanperfumes_categories_cols_desktop', absint($_POST['sasanperfumes_categories_cols_desktop']??6));
            set_theme_mod('sasanperfumes_categories_cols_tablet', absint($_POST['sasanperfumes_categories_cols_tablet']??4));
            set_theme_mod('sasanperfumes_categories_cols_mobile', absint($_POST['sasanperfumes_categories_cols_mobile']??3));
            // Save selected category IDs (ordered)
            $selected = array();
            if (isset($_POST['sasanperfumes_categories_selected']) && is_array($_POST['sasanperfumes_categories_selected'])) {
                $selected = array_map('absint', $_POST['sasanperfumes_categories_selected']);
                $selected = array_filter($selected); // remove zeros
                $selected = array_values($selected); // reindex
            }
            set_theme_mod('sasanperfumes_categories_selected', $selected);
            // Keep count in sync for backward compat
            set_theme_mod('sasanperfumes_categories_count', count($selected) > 0 ? count($selected) : 6);
            break;
            
        case 'collections':
            set_theme_mod('sasanperfumes_collections_enabled', isset($_POST['sasanperfumes_collections_enabled']));
            set_theme_mod('sasanperfumes_collections_hide_mobile', isset($_POST['sasanperfumes_collections_hide_mobile']));
            set_theme_mod('sasanperfumes_collections_hide_desktop', isset($_POST['sasanperfumes_collections_hide_desktop']));
            set_theme_mod('sasanperfumes_collections_title', sanitize_text_field($_POST['sasanperfumes_collections_title']??''));
            set_theme_mod('sasanperfumes_collections_title_ar', sanitize_text_field($_POST['sasanperfumes_collections_title_ar']??''));
            set_theme_mod('sasanperfumes_collections_layout', sanitize_text_field($_POST['sasanperfumes_collections_layout']??'grid'));
            set_theme_mod('sasanperfumes_collections_cols_desktop', absint($_POST['sasanperfumes_collections_cols_desktop']??3));
            set_theme_mod('sasanperfumes_collections_cols_tablet', absint($_POST['sasanperfumes_collections_cols_tablet']??2));
            set_theme_mod('sasanperfumes_collections_cols_mobile', absint($_POST['sasanperfumes_collections_cols_mobile']??1));
            $collections = array();
            if (isset($_POST['sasanperfumes_collections_items']) && is_array($_POST['sasanperfumes_collections_items'])) {
                foreach ($_POST['sasanperfumes_collections_items'] as $item) {
                    $collections[] = array('image'=>esc_url_raw($item['image']??''),'title'=>sanitize_text_field($item['title']??''),'title_ar'=>sanitize_text_field($item['title_ar']??''),'description'=>sanitize_textarea_field($item['description']??''),'description_ar'=>sanitize_textarea_field($item['description_ar']??''),'link'=>sasanperfumes_sanitize_link($item['link']??''));
                }
            }
            set_theme_mod('sasanperfumes_collections_items', $collections);
            break;
            
        case 'banners':
            set_theme_mod('sasanperfumes_banners_enabled', isset($_POST['sasanperfumes_banners_enabled']));
            set_theme_mod('sasanperfumes_banners_hide_mobile', isset($_POST['sasanperfumes_banners_hide_mobile']));
            set_theme_mod('sasanperfumes_banners_hide_desktop', isset($_POST['sasanperfumes_banners_hide_desktop']));
            set_theme_mod('sasanperfumes_banners_layout', sanitize_text_field($_POST['sasanperfumes_banners_layout']??'grid'));
            set_theme_mod('sasanperfumes_banners_cols_desktop', absint($_POST['sasanperfumes_banners_cols_desktop']??2));
            set_theme_mod('sasanperfumes_banners_cols_tablet', absint($_POST['sasanperfumes_banners_cols_tablet']??2));
            set_theme_mod('sasanperfumes_banners_cols_mobile', absint($_POST['sasanperfumes_banners_cols_mobile']??1));
            $banners = array();
            if (isset($_POST['sasanperfumes_banners_items']) && is_array($_POST['sasanperfumes_banners_items'])) {
                foreach ($_POST['sasanperfumes_banners_items'] as $item) {
                    $banners[] = array('image'=>esc_url_raw($item['image']??''),'mobile'=>esc_url_raw($item['mobile']??''),'image_ar'=>esc_url_raw($item['image_ar']??''),'mobile_ar'=>esc_url_raw($item['mobile_ar']??''),'title'=>sanitize_text_field($item['title']??''),'title_ar'=>sanitize_text_field($item['title_ar']??''),'subtitle'=>sanitize_text_field($item['subtitle']??''),'subtitle_ar'=>sanitize_text_field($item['subtitle_ar']??''),'link'=>sasanperfumes_sanitize_link($item['link']??''));
                }
            }
            set_theme_mod('sasanperfumes_banners_items', $banners);
            break;

        case 'why-choose-us':
        case 'our-story':
        case 'faq':
        case 'seo-content':
            sasanperfumes_save_home_sections_tab($tab);
            break;

    }
}

/**
 * Save Products Section settings
 */
function sasanperfumes_save_products_section($key) {
    set_theme_mod("sasanperfumes_{$key}_enabled", isset($_POST["sasanperfumes_{$key}_enabled"]));
    set_theme_mod("sasanperfumes_{$key}_hide_mobile", isset($_POST["sasanperfumes_{$key}_hide_mobile"]));
    set_theme_mod("sasanperfumes_{$key}_hide_desktop", isset($_POST["sasanperfumes_{$key}_hide_desktop"]));
    set_theme_mod("sasanperfumes_{$key}_title", sanitize_text_field($_POST["sasanperfumes_{$key}_title"]??''));
    set_theme_mod("sasanperfumes_{$key}_title_ar", sanitize_text_field($_POST["sasanperfumes_{$key}_title_ar"]??''));
    set_theme_mod("sasanperfumes_{$key}_subtitle", sanitize_text_field($_POST["sasanperfumes_{$key}_subtitle"]??''));
    set_theme_mod("sasanperfumes_{$key}_subtitle_ar", sanitize_text_field($_POST["sasanperfumes_{$key}_subtitle_ar"]??''));
    set_theme_mod("sasanperfumes_{$key}_count", absint($_POST["sasanperfumes_{$key}_count"]??8));
    set_theme_mod("sasanperfumes_{$key}_display", sanitize_text_field($_POST["sasanperfumes_{$key}_display"]??'slider'));
    set_theme_mod("sasanperfumes_{$key}_show_view_all", isset($_POST["sasanperfumes_{$key}_show_view_all"]));
    set_theme_mod("sasanperfumes_{$key}_view_all_link", sanitize_text_field($_POST["sasanperfumes_{$key}_view_all_link"]??'/shop'));
    set_theme_mod("sasanperfumes_{$key}_autoplay", isset($_POST["sasanperfumes_{$key}_autoplay"]));
    set_theme_mod("sasanperfumes_{$key}_cols_desktop", absint($_POST["sasanperfumes_{$key}_cols_desktop"]??4));
    set_theme_mod("sasanperfumes_{$key}_cols_tablet", absint($_POST["sasanperfumes_{$key}_cols_tablet"]??3));
    set_theme_mod("sasanperfumes_{$key}_cols_mobile", absint($_POST["sasanperfumes_{$key}_cols_mobile"]??2));
    // Save selected product slugs (ordered)
    $selected = array();
    if (isset($_POST["sasanperfumes_{$key}_selected_products"]) && is_array($_POST["sasanperfumes_{$key}_selected_products"])) {
        foreach ($_POST["sasanperfumes_{$key}_selected_products"] as $slug) {
            $slug = sanitize_title($slug);
            if (!empty($slug)) $selected[] = $slug;
        }
    }
    set_theme_mod("sasanperfumes_{$key}_selected_products", $selected);
}

/**
 * Save Header Settings
 */
function sasanperfumes_save_header_settings() {
    $logo_id = absint($_POST['sasanperfumes_site_logo'] ?? 0);
    set_theme_mod('custom_logo', $logo_id ? $logo_id : 0);
    set_theme_mod('sasanperfumes_header_sticky', isset($_POST['sasanperfumes_header_sticky']));
    set_theme_mod('sasanperfumes_topbar_enabled', isset($_POST['sasanperfumes_topbar_enabled']));
    set_theme_mod('sasanperfumes_topbar_text', sanitize_text_field($_POST['sasanperfumes_topbar_text']??''));
    set_theme_mod('sasanperfumes_topbar_text_ar', sanitize_text_field($_POST['sasanperfumes_topbar_text_ar']??''));
    set_theme_mod('sasanperfumes_topbar_link', sasanperfumes_sanitize_link($_POST['sasanperfumes_topbar_link']??''));
    set_theme_mod('sasanperfumes_topbar_bg_color', sanitize_hex_color($_POST['sasanperfumes_topbar_bg_color']??'#f3f4f6'));
    set_theme_mod('sasanperfumes_topbar_text_color', sanitize_hex_color($_POST['sasanperfumes_topbar_text_color']??'#4b5563'));
    set_theme_mod('sasanperfumes_topbar_dismissible', isset($_POST['sasanperfumes_topbar_dismissible']));
    set_theme_mod('sasanperfumes_topbar_hide_mobile', isset($_POST['sasanperfumes_topbar_hide_mobile']));
    set_theme_mod('sasanperfumes_free_shipping_threshold', absint($_POST['sasanperfumes_free_shipping_threshold'] ?? 500));
    // Mega menu settings
    set_theme_mod('sasanperfumes_megamenu_display_mode', sanitize_text_field($_POST['sasanperfumes_megamenu_display_mode'] ?? 'child-based'));
    set_theme_mod('sasanperfumes_megamenu_show_products', isset($_POST['sasanperfumes_megamenu_show_products']));
    set_theme_mod('sasanperfumes_megamenu_max_columns', absint($_POST['sasanperfumes_megamenu_max_columns'] ?? 3));
}

/**
 * Save SEO Settings
 */
function sasanperfumes_save_seo_settings() {
    $tab = sanitize_text_field($_POST['sasanperfumes_seo_current_tab']??'general');

    switch($tab) {
        case 'general':
            $title = sanitize_text_field($_POST['sasanperfumes_seo_title']??'');
            $description = sanitize_textarea_field($_POST['sasanperfumes_seo_description']??'');
            set_theme_mod('sasanperfumes_seo_title', $title);
            set_theme_mod('sasanperfumes_seo_title_ar', sanitize_text_field($_POST['sasanperfumes_seo_title_ar']??''));
            set_theme_mod('sasanperfumes_seo_description', $description);
            set_theme_mod('sasanperfumes_seo_description_ar', sanitize_textarea_field($_POST['sasanperfumes_seo_description_ar']??''));
            set_theme_mod('sasanperfumes_seo_keywords', sanitize_text_field($_POST['sasanperfumes_seo_keywords']??''));
            set_theme_mod('sasanperfumes_seo_keywords_ar', sanitize_text_field($_POST['sasanperfumes_seo_keywords_ar']??''));
            if (!empty($title)) update_option('blogname', $title);
            if (!empty($description)) update_option('blogdescription', $description);
            break;

        case 'opengraph':
            set_theme_mod('sasanperfumes_seo_og_title', sanitize_text_field($_POST['sasanperfumes_seo_og_title']??''));
            set_theme_mod('sasanperfumes_seo_og_title_ar', sanitize_text_field($_POST['sasanperfumes_seo_og_title_ar']??''));
            set_theme_mod('sasanperfumes_seo_og_description', sanitize_textarea_field($_POST['sasanperfumes_seo_og_description']??''));
            set_theme_mod('sasanperfumes_seo_og_description_ar', sanitize_textarea_field($_POST['sasanperfumes_seo_og_description_ar']??''));
            set_theme_mod('sasanperfumes_seo_og_image', esc_url_raw($_POST['sasanperfumes_seo_og_image']??''));
            set_theme_mod('sasanperfumes_seo_og_type', sanitize_text_field($_POST['sasanperfumes_seo_og_type']??'website'));
            set_theme_mod('sasanperfumes_seo_og_site_name', sanitize_text_field($_POST['sasanperfumes_seo_og_site_name']??''));
            set_theme_mod('sasanperfumes_seo_fb_app_id', sanitize_text_field($_POST['sasanperfumes_seo_fb_app_id']??''));
            break;

        case 'twitter':
            set_theme_mod('sasanperfumes_seo_twitter_card', sanitize_text_field($_POST['sasanperfumes_seo_twitter_card']??'summary_large_image'));
            set_theme_mod('sasanperfumes_seo_twitter_site', sanitize_text_field($_POST['sasanperfumes_seo_twitter_site']??''));
            set_theme_mod('sasanperfumes_seo_twitter_creator', sanitize_text_field($_POST['sasanperfumes_seo_twitter_creator']??''));
            set_theme_mod('sasanperfumes_seo_twitter_title', sanitize_text_field($_POST['sasanperfumes_seo_twitter_title']??''));
            set_theme_mod('sasanperfumes_seo_twitter_title_ar', sanitize_text_field($_POST['sasanperfumes_seo_twitter_title_ar']??''));
            set_theme_mod('sasanperfumes_seo_twitter_description', sanitize_textarea_field($_POST['sasanperfumes_seo_twitter_description']??''));
            set_theme_mod('sasanperfumes_seo_twitter_description_ar', sanitize_textarea_field($_POST['sasanperfumes_seo_twitter_description_ar']??''));
            set_theme_mod('sasanperfumes_seo_twitter_image', esc_url_raw($_POST['sasanperfumes_seo_twitter_image']??''));
            break;

        case 'google':
            set_theme_mod('sasanperfumes_seo_google_verification', sanitize_text_field($_POST['sasanperfumes_seo_google_verification']??''));
            set_theme_mod('sasanperfumes_seo_bing_verification', sanitize_text_field($_POST['sasanperfumes_seo_bing_verification']??''));
            set_theme_mod('sasanperfumes_seo_ga_id', sanitize_text_field($_POST['sasanperfumes_seo_ga_id']??''));
            set_theme_mod('sasanperfumes_seo_gtm_id', sanitize_text_field($_POST['sasanperfumes_seo_gtm_id']??''));
            set_theme_mod('sasanperfumes_seo_fb_pixel_id', sanitize_text_field($_POST['sasanperfumes_seo_fb_pixel_id']??''));
            set_theme_mod('sasanperfumes_seo_snap_pixel_id', sanitize_text_field($_POST['sasanperfumes_seo_snap_pixel_id']??''));
            set_theme_mod('sasanperfumes_seo_tiktok_pixel_id', sanitize_text_field($_POST['sasanperfumes_seo_tiktok_pixel_id']??''));
            break;

        case 'advanced':
            set_theme_mod('sasanperfumes_seo_canonical_url', esc_url_raw($_POST['sasanperfumes_seo_canonical_url']??''));
            set_theme_mod('sasanperfumes_seo_robots', sanitize_text_field($_POST['sasanperfumes_seo_robots']??'index,follow'));
            set_theme_mod('sasanperfumes_seo_schema_type', sanitize_text_field($_POST['sasanperfumes_seo_schema_type']??'Organization'));
            set_theme_mod('sasanperfumes_seo_custom_head', wp_kses($_POST['sasanperfumes_seo_custom_head']??'', array('meta'=>array('name'=>true,'content'=>true,'property'=>true,'charset'=>true,'http-equiv'=>true),'link'=>array('rel'=>true,'href'=>true,'type'=>true,'hreflang'=>true),'script'=>array('type'=>true,'src'=>true,'async'=>true,'defer'=>true))));
            break;
    }
}

/**
 * Register REST API routes
 */
function sasanperfumes_settings_register_rest_routes() {
    sasanperfumes_register_rest_route( '/customizer', array('methods'=>'GET','callback'=>'sasanperfumes_get_customizer_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/home-settings', array('methods'=>'GET','callback'=>'sasanperfumes_get_home_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/site-settings', array('methods'=>'GET','callback'=>'sasanperfumes_get_site_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/header-settings', array('methods'=>'GET','callback'=>'sasanperfumes_get_header_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/seo-settings', array('methods'=>'GET','callback'=>'sasanperfumes_get_seo_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/topbar', array('methods'=>'GET','callback'=>'sasanperfumes_get_topbar_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/mobile-bar', array('methods'=>'GET','callback'=>'sasanperfumes_get_mobile_bar_settings','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/currencies', array('methods'=>'GET','callback'=>'sasanperfumes_get_currencies','permission_callback'=>'__return_true'));
    sasanperfumes_register_rest_route( '/menu/(?P<location>[a-zA-Z0-9_-]+)', array('methods'=>'GET','callback'=>'sasanperfumes_get_menu','permission_callback'=>'__return_true'));
}

/**
 * Get all customizer settings
 */
function sasanperfumes_get_customizer_settings() {
    return array('site'=>sasanperfumes_get_site_settings(),'header'=>sasanperfumes_get_header_settings(),'topBar'=>sasanperfumes_get_topbar_settings(),'seo'=>sasanperfumes_get_seo_settings(),'hero'=>sasanperfumes_get_hero_settings(),'newProducts'=>sasanperfumes_get_products_settings('new_products'),'bestseller'=>sasanperfumes_get_products_settings('bestseller'),'categories'=>sasanperfumes_get_categories_settings(),'featured'=>sasanperfumes_get_products_settings('featured'),'collections'=>sasanperfumes_get_collections_settings(),'banners'=>sasanperfumes_get_banners_settings());
}

/**
 * Get home settings
 */
function sasanperfumes_get_home_settings() {
    return array('hero'=>sasanperfumes_get_hero_settings(),'newProducts'=>sasanperfumes_get_products_settings('new_products'),'bestseller'=>sasanperfumes_get_products_settings('bestseller'),'categories'=>sasanperfumes_get_categories_settings(),'featured'=>sasanperfumes_get_products_settings('featured'),'collections'=>sasanperfumes_get_collections_settings(),'banners'=>sasanperfumes_get_banners_settings(),'brandSlider'=>sasanperfumes_get_brand_slider_settings());
}

function sasanperfumes_get_brand_slider_settings() {
    return array(
        'enabled'       => (bool) get_theme_mod('sasanperfumes_brand_slider_enabled', true),
        'title_en'      => get_theme_mod('sasanperfumes_brand_slider_title_en', 'More from this brand'),
        'title_ar'      => get_theme_mod('sasanperfumes_brand_slider_title_ar', 'المزيد من هذه العلامة التجارية'),
        'count'         => (int) get_theme_mod('sasanperfumes_brand_slider_count', 12),
        'cols_desktop'  => (int) get_theme_mod('sasanperfumes_brand_slider_cols_desktop', 4),
        'cols_tablet'   => (int) get_theme_mod('sasanperfumes_brand_slider_cols_tablet', 3),
        'cols_mobile'   => (int) get_theme_mod('sasanperfumes_brand_slider_cols_mobile', 2),
        'fallback'      => get_theme_mod('sasanperfumes_brand_slider_fallback', 'category'),
    );
}

/**
 * Get site settings
 */
function sasanperfumes_get_site_settings() {
    $logo_id = get_theme_mod('custom_logo');
    $icon_id = get_option('site_icon');
    return array('name'=>get_bloginfo('name'),'description'=>get_bloginfo('description'),'url'=>get_bloginfo('url'),'logo'=>array('id'=>$logo_id,'url'=>$logo_id?wp_get_attachment_image_url($logo_id,'full'):''),'favicon'=>array('id'=>$icon_id,'url'=>$icon_id?wp_get_attachment_image_url($icon_id,'full'):''));
}

/**
 * Get header settings
 */
function sasanperfumes_get_header_settings() {
    $logo_id = get_theme_mod('custom_logo');
    $logo_url = $logo_id ? wp_get_attachment_image_url($logo_id, 'full') : '';
    return array('sticky'=>get_theme_mod('sasanperfumes_header_sticky',true),'logo'=>$logo_url,'stickyLogo'=>$logo_url,'logoDark'=>$logo_url,'megaMenu'=>array('displayMode'=>get_theme_mod('sasanperfumes_megamenu_display_mode','child-based'),'showProducts'=>(bool)get_theme_mod('sasanperfumes_megamenu_show_products',true),'maxColumns'=>(int)get_theme_mod('sasanperfumes_megamenu_max_columns',3)));
}

/**
 * Get mobile bottom bar settings.
 *
 * The frontend already falls back when this route is missing, but exposing it
 * avoids unnecessary 404s and gives admins a stable API surface.
 */
function sasanperfumes_get_mobile_bar_settings() {
    $items = get_theme_mod('sasanperfumes_mobile_bar_items', array());
    if (!is_array($items) || empty($items)) {
        $items = array(
            array('icon' => 'home', 'label' => 'Home', 'labelAr' => 'الرئيسية', 'url' => '/'),
            array('icon' => 'grid', 'label' => 'Menu', 'labelAr' => 'القائمة', 'url' => '/shop'),
            array('icon' => 'search', 'label' => 'Search', 'labelAr' => 'بحث', 'url' => '/search'),
            array('icon' => 'heart', 'label' => 'Wishlist', 'labelAr' => 'المفضلة', 'url' => '/wishlist'),
            array('icon' => 'user', 'label' => 'Account', 'labelAr' => 'حسابي', 'url' => '/account'),
        );
    }

    return array(
        'enabled' => (bool) get_theme_mod('sasanperfumes_mobile_bar_enabled', true),
        'items'   => array_values($items),
    );
}

/**
 * Get currencies.
 *
 * Current live installs store currency data in the legacy CADVIL/ASL currency
 * plugin option. This endpoint gives the frontend a ShapeHive namespace
 * while preserving that stored data.
 */
function sasanperfumes_get_currencies() {
    $defaults = array(
        array('code' => 'AED', 'label' => 'UAE (AED)', 'symbol' => 'AED', 'decimals' => 2, 'rateFromAED' => 1),
        array('code' => 'BHD', 'label' => 'Bahrain (BHD)', 'symbol' => 'BD', 'decimals' => 3, 'rateFromAED' => 0.103),
        array('code' => 'KWD', 'label' => 'Kuwait (KWD)', 'symbol' => 'KD', 'decimals' => 3, 'rateFromAED' => 0.083),
        array('code' => 'OMR', 'label' => 'Oman (OMR)', 'symbol' => 'OMR', 'decimals' => 3, 'rateFromAED' => 0.105),
        array('code' => 'QAR', 'label' => 'Qatar (QAR)', 'symbol' => 'QR', 'decimals' => 2, 'rateFromAED' => 0.99),
        array('code' => 'SAR', 'label' => 'Saudi Arabia (SAR)', 'symbol' => 'SAR', 'decimals' => 2, 'rateFromAED' => 1.02),
        array('code' => 'USD', 'label' => 'United States (USD)', 'symbol' => '$', 'decimals' => 2, 'rateFromAED' => 0.27),
    );

    $data = get_option('asl_currencies_data');
    if (is_array($data) && !empty($data['currencies']) && is_array($data['currencies'])) {
        return array_values($data['currencies']);
    }

    return $defaults;
}

/**
 * Get topbar settings
 */
function sasanperfumes_get_topbar_settings() {
    return array('enabled'=>get_theme_mod('sasanperfumes_topbar_enabled',true),'text'=>get_theme_mod('sasanperfumes_topbar_text','Free shipping on orders over 200 SAR'),'textAr'=>get_theme_mod('sasanperfumes_topbar_text_ar',''),'link'=>get_theme_mod('sasanperfumes_topbar_link',''),'bgColor'=>get_theme_mod('sasanperfumes_topbar_bg_color','#f3f4f6'),'textColor'=>get_theme_mod('sasanperfumes_topbar_text_color','#4b5563'),'dismissible'=>get_theme_mod('sasanperfumes_topbar_dismissible',false),'hideOnMobile'=>get_theme_mod('sasanperfumes_topbar_hide_mobile',true),'freeShippingThreshold'=>(int)get_theme_mod('sasanperfumes_free_shipping_threshold',500),'freeShippingThresholds'=>null);
}

/**
 * Get SEO settings
 */
function sasanperfumes_get_seo_settings() {
    return array(
        'title'=>get_theme_mod('sasanperfumes_seo_title',get_bloginfo('name')),
        'titleAr'=>get_theme_mod('sasanperfumes_seo_title_ar',''),
        'description'=>get_theme_mod('sasanperfumes_seo_description',get_bloginfo('description')),
        'descriptionAr'=>get_theme_mod('sasanperfumes_seo_description_ar',''),
        'keywords'=>get_theme_mod('sasanperfumes_seo_keywords',''),
        'keywordsAr'=>get_theme_mod('sasanperfumes_seo_keywords_ar',''),
        'ogTitle'=>get_theme_mod('sasanperfumes_seo_og_title',''),
        'ogTitleAr'=>get_theme_mod('sasanperfumes_seo_og_title_ar',''),
        'ogDescription'=>get_theme_mod('sasanperfumes_seo_og_description',''),
        'ogDescriptionAr'=>get_theme_mod('sasanperfumes_seo_og_description_ar',''),
        'ogImage'=>get_theme_mod('sasanperfumes_seo_og_image',''),
        'ogType'=>get_theme_mod('sasanperfumes_seo_og_type','website'),
        'ogSiteName'=>get_theme_mod('sasanperfumes_seo_og_site_name',''),
        'fbAppId'=>get_theme_mod('sasanperfumes_seo_fb_app_id',''),
        'twitterCard'=>get_theme_mod('sasanperfumes_seo_twitter_card','summary_large_image'),
        'twitterSite'=>get_theme_mod('sasanperfumes_seo_twitter_site',''),
        'twitterCreator'=>get_theme_mod('sasanperfumes_seo_twitter_creator',''),
        'twitterTitle'=>get_theme_mod('sasanperfumes_seo_twitter_title',''),
        'twitterTitleAr'=>get_theme_mod('sasanperfumes_seo_twitter_title_ar',''),
        'twitterDescription'=>get_theme_mod('sasanperfumes_seo_twitter_description',''),
        'twitterDescriptionAr'=>get_theme_mod('sasanperfumes_seo_twitter_description_ar',''),
        'twitterImage'=>get_theme_mod('sasanperfumes_seo_twitter_image',''),
        'googleVerification'=>get_theme_mod('sasanperfumes_seo_google_verification',''),
        'bingVerification'=>get_theme_mod('sasanperfumes_seo_bing_verification',''),
        'gaId'=>get_theme_mod('sasanperfumes_seo_ga_id',''),
        'gtmId'=>get_theme_mod('sasanperfumes_seo_gtm_id',''),
        'fbPixelId'=>get_theme_mod('sasanperfumes_seo_fb_pixel_id',''),
        'snapPixelId'=>get_theme_mod('sasanperfumes_seo_snap_pixel_id',''),
        'tiktokPixelId'=>get_theme_mod('sasanperfumes_seo_tiktok_pixel_id',''),
        'robots'=>get_theme_mod('sasanperfumes_seo_robots','index,follow'),
        'canonicalUrl'=>get_theme_mod('sasanperfumes_seo_canonical_url',''),
        'schemaType'=>get_theme_mod('sasanperfumes_seo_schema_type','Organization'),
        'customHead'=>get_theme_mod('sasanperfumes_seo_custom_head',''),
    );
}

/**
 * Get hero settings
 */
function sasanperfumes_get_hero_settings() {
    $slides = get_theme_mod('sasanperfumes_hero_slides', array());
    if (empty($slides)) {
        for ($i=1; $i<=5; $i++) {
            $img = get_theme_mod("sasanperfumes_hero_slide_{$i}_image",'');
            if (!empty($img)) $slides[] = array('enabled'=>true,'image'=>$img,'mobileImage'=>get_theme_mod("sasanperfumes_hero_slide_{$i}_mobile",$img),'imageAr'=>'','mobileImageAr'=>'','link'=>get_theme_mod("sasanperfumes_hero_slide_{$i}_link",''));
        }
    } else {
        $slides = array_map(function($s) {
            $img = $s['image']??'';
            $mob = $s['mobile']??$img;
            $img_ar = $s['image_ar']??'';
            $mob_ar = $s['mobile_ar']??'';
            $has_media = !empty($img) || !empty($mob) || !empty($img_ar) || !empty($mob_ar);
            $enabled = array_key_exists('enabled_set', $s)
                ? (bool) $s['enabled']
                : (array_key_exists('enabled', $s) ? ((bool) $s['enabled'] || $has_media) : $has_media);
            $raw_type = $s['slide_type'] ?? 'image';
            $slide_type = in_array($raw_type, array('image','video'), true) ? $raw_type : 'image';
            return array(
                'enabled'=>$enabled,
                'image'=>$img ?: $mob,'mobileImage'=>$mob ?: $img,'imageAr'=>$img_ar,'mobileImageAr'=>$mob_ar,
                'link'=>$s['link']??'','slideType'=>$slide_type,
                'videoUrl'=>$s['video_url']??'','videoMobile'=>$s['video_mobile']??'','videoAr'=>$s['video_ar']??'','videoMobileAr'=>$s['video_mobile_ar']??'',
                'posterUrl'=>$s['poster_url']??'','posterMobile'=>$s['poster_mobile']??'','posterAr'=>$s['poster_ar']??'','posterMobileAr'=>$s['poster_mobile_ar']??'',
                'title'=>$s['title_en']??'','titleAr'=>$s['title_ar']??'',
                'subtitle'=>$s['subtitle_en']??'','subtitleAr'=>$s['subtitle_ar']??'',
                'ctaLabel'=>$s['cta_label_en']??'','ctaLabelAr'=>$s['cta_label_ar']??'',
            );
        }, $slides);
        $slides = array_values(array_filter($slides, function($s) {
            if (($s['slideType']??'image') === 'video') return !empty($s['videoUrl']);
            return !empty($s['image']) || !empty($s['mobileImage']) || !empty($s['imageAr']) || !empty($s['mobileImageAr']);
        }));
    }
    return array('enabled'=>get_theme_mod('sasanperfumes_hero_enabled',true),'hideOnMobile'=>get_theme_mod('sasanperfumes_hero_hide_mobile',false),'hideOnDesktop'=>get_theme_mod('sasanperfumes_hero_hide_desktop',false),'autoplay'=>get_theme_mod('sasanperfumes_hero_autoplay',true),'autoplayDelay'=>get_theme_mod('sasanperfumes_hero_autoplay_delay',5000),'loop'=>get_theme_mod('sasanperfumes_hero_loop',true),'slides'=>$slides);
}

/**
 * Get products settings
 */
function sasanperfumes_get_products_settings($key) {
    $selected = get_theme_mod("sasanperfumes_{$key}_selected_products", array());
    if (!is_array($selected)) $selected = array();
    $selected = array_values(array_filter($selected));
    return array('enabled'=>get_theme_mod("sasanperfumes_{$key}_enabled",true),'hideOnMobile'=>get_theme_mod("sasanperfumes_{$key}_hide_mobile",false),'hideOnDesktop'=>get_theme_mod("sasanperfumes_{$key}_hide_desktop",false),'title'=>get_theme_mod("sasanperfumes_{$key}_title",''),'titleAr'=>get_theme_mod("sasanperfumes_{$key}_title_ar",''),'subtitle'=>get_theme_mod("sasanperfumes_{$key}_subtitle",''),'subtitleAr'=>get_theme_mod("sasanperfumes_{$key}_subtitle_ar",''),'count'=>get_theme_mod("sasanperfumes_{$key}_count",8),'display'=>get_theme_mod("sasanperfumes_{$key}_display",'slider'),'showViewAll'=>get_theme_mod("sasanperfumes_{$key}_show_view_all",true),'viewAllLink'=>get_theme_mod("sasanperfumes_{$key}_view_all_link",'/shop'),'autoplay'=>get_theme_mod("sasanperfumes_{$key}_autoplay",true),'selectedProductSlugs'=>$selected,'responsive'=>array('desktop'=>get_theme_mod("sasanperfumes_{$key}_cols_desktop",4),'tablet'=>get_theme_mod("sasanperfumes_{$key}_cols_tablet",3),'mobile'=>get_theme_mod("sasanperfumes_{$key}_cols_mobile",2)));
}

/**
 * Get categories settings
 */
function sasanperfumes_get_categories_settings() {
    $selected = get_theme_mod('sasanperfumes_categories_selected', array());
    if (!is_array($selected)) $selected = array();
    $selected = array_map('intval', $selected);
    $selected = array_filter($selected);
    $selected = array_values($selected);
    return array(
        'enabled'      => get_theme_mod('sasanperfumes_categories_enabled', true),
        'hideOnMobile'  => get_theme_mod('sasanperfumes_categories_hide_mobile', false),
        'hideOnDesktop' => get_theme_mod('sasanperfumes_categories_hide_desktop', false),
        'title'         => get_theme_mod('sasanperfumes_categories_title', 'Shop by Category'),
        'titleAr'       => get_theme_mod('sasanperfumes_categories_title_ar', ''),
        'subtitle'      => get_theme_mod('sasanperfumes_categories_subtitle', ''),
        'subtitleAr'    => get_theme_mod('sasanperfumes_categories_subtitle_ar', ''),
        'count'         => count($selected) > 0 ? count($selected) : (int)get_theme_mod('sasanperfumes_categories_count', 6),
        'selectedIds'   => $selected,
        'responsive'    => array(
            'desktop' => get_theme_mod('sasanperfumes_categories_cols_desktop', 6),
            'tablet'  => get_theme_mod('sasanperfumes_categories_cols_tablet', 4),
            'mobile'  => get_theme_mod('sasanperfumes_categories_cols_mobile', 3),
        ),
    );
}

/**
 * Get collections settings
 */
function sasanperfumes_get_collections_settings() {
    $items = get_theme_mod('sasanperfumes_collections_items', array());
    if (empty($items)) {
        for ($i=1; $i<=6; $i++) {
            $img = get_theme_mod("sasanperfumes_collection_{$i}_image",'');
            $title = get_theme_mod("sasanperfumes_collection_{$i}_title",'');
            if (!empty($img)||!empty($title)) $items[] = array('image'=>$img,'title'=>$title,'titleAr'=>get_theme_mod("sasanperfumes_collection_{$i}_title_ar",''),'description'=>get_theme_mod("sasanperfumes_collection_{$i}_description",''),'descriptionAr'=>get_theme_mod("sasanperfumes_collection_{$i}_description_ar",''),'link'=>get_theme_mod("sasanperfumes_collection_{$i}_link",''));
        }
    } else {
        $items = array_map(function($item) { return array('image'=>$item['image']??'','title'=>$item['title']??'','titleAr'=>$item['title_ar']??'','description'=>$item['description']??'','descriptionAr'=>$item['description_ar']??'','link'=>$item['link']??''); }, $items);
    }
    return array('enabled'=>get_theme_mod('sasanperfumes_collections_enabled',true),'hideOnMobile'=>get_theme_mod('sasanperfumes_collections_hide_mobile',false),'hideOnDesktop'=>get_theme_mod('sasanperfumes_collections_hide_desktop',false),'title'=>get_theme_mod('sasanperfumes_collections_title','Our Collections'),'titleAr'=>get_theme_mod('sasanperfumes_collections_title_ar',''),'subtitle'=>get_theme_mod('sasanperfumes_collections_subtitle',''),'subtitleAr'=>get_theme_mod('sasanperfumes_collections_subtitle_ar',''),'layout'=>get_theme_mod('sasanperfumes_collections_layout','grid'),'responsive'=>array('desktop'=>get_theme_mod('sasanperfumes_collections_cols_desktop',3),'tablet'=>get_theme_mod('sasanperfumes_collections_cols_tablet',2),'mobile'=>get_theme_mod('sasanperfumes_collections_cols_mobile',1)),'items'=>$items);
}

/**
 * Get banners settings
 */
function sasanperfumes_get_banners_settings() {
    $items = get_theme_mod('sasanperfumes_banners_items', array());
    if (empty($items)) {
        for ($i=1; $i<=4; $i++) {
            $img = get_theme_mod("sasanperfumes_banner_{$i}_image",'');
            if (!empty($img)) $items[] = array('image'=>$img,'mobileImage'=>get_theme_mod("sasanperfumes_banner_{$i}_mobile",$img),'title'=>get_theme_mod("sasanperfumes_banner_{$i}_title",''),'titleAr'=>get_theme_mod("sasanperfumes_banner_{$i}_title_ar",''),'subtitle'=>get_theme_mod("sasanperfumes_banner_{$i}_subtitle",''),'subtitleAr'=>get_theme_mod("sasanperfumes_banner_{$i}_subtitle_ar",''),'link'=>get_theme_mod("sasanperfumes_banner_{$i}_link",''));
        }
    } else {
        $items = array_map(function($item) { return array('image'=>$item['image']??'','mobileImage'=>$item['mobile']??$item['image']??'','imageAr'=>$item['image_ar']??'','mobileImageAr'=>$item['mobile_ar']??'','title'=>$item['title']??'','titleAr'=>$item['title_ar']??'','subtitle'=>$item['subtitle']??'','subtitleAr'=>$item['subtitle_ar']??'','link'=>$item['link']??''); }, $items);
    }
    return array('enabled'=>get_theme_mod('sasanperfumes_banners_enabled',true),'hideOnMobile'=>get_theme_mod('sasanperfumes_banners_hide_mobile',false),'hideOnDesktop'=>get_theme_mod('sasanperfumes_banners_hide_desktop',false),'layout'=>get_theme_mod('sasanperfumes_banners_layout','grid'),'responsive'=>array('desktop'=>get_theme_mod('sasanperfumes_banners_cols_desktop',2),'tablet'=>get_theme_mod('sasanperfumes_banners_cols_tablet',2),'mobile'=>get_theme_mod('sasanperfumes_banners_cols_mobile',1)),'items'=>$items);
}

/**
 * Get menu
 */
function sasanperfumes_get_menu($request) {
    $location = $request['location'];
    $locations = get_nav_menu_locations();
    if (!isset($locations[$location])) {
        $menu = wp_get_nav_menu_object($location);
        if (!$menu) return new WP_Error('no_menu','Menu not found',array('status'=>404));
        $menu_id = $menu->term_id;
    } else {
        $menu_id = $locations[$location];
    }
    $menu_items = wp_get_nav_menu_items($menu_id);
    if (!$menu_items) return array('items'=>array());
    $items = array();
    foreach ($menu_items as $item) {
        $items[] = array('id'=>$item->ID,'title'=>$item->title,'url'=>$item->url,'target'=>$item->target,'parent'=>$item->menu_item_parent,'classes'=>implode(' ',$item->classes),'order'=>$item->menu_order);
    }
    return array('id'=>$menu_id,'name'=>wp_get_nav_menu_object($menu_id)->name,'items'=>$items);
}

/**
 * Theme support
 */
function sasanperfumes_settings_theme_support() {
    register_nav_menus(array('primary'=>'Primary Menu','primary_ar'=>'Primary Menu (Arabic)','footer'=>'Footer Menu','footer_ar'=>'Footer Menu (Arabic)'));
    add_theme_support('custom-logo',array('height'=>100,'width'=>400,'flex-height'=>true,'flex-width'=>true));
}

/**
 * Register Customizer sections for site logo
 */
function sasanperfumes_settings_customize_register($wp_customize) {
    $wp_customize->add_section('sasanperfumes_logo_section', array(
        'title' => 'Site Logo',
        'priority' => 30,
    ));
    $wp_customize->add_setting('custom_logo', array(
        'transport' => 'refresh',
    ));
    $wp_customize->add_control(new WP_Customize_Media_Control($wp_customize, 'custom_logo', array(
        'label' => 'Site Logo',
        'description' => 'Upload your site logo. This logo is used across the entire site.',
        'section' => 'sasanperfumes_logo_section',
        'mime_type' => 'image',
    )));
}
add_action('customize_register', 'sasanperfumes_settings_customize_register');

/**
 * CORS handling
 */
function sasanperfumes_settings_cors_handling() {
    remove_filter('rest_pre_serve_request','rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = get_http_origin();
        $allowed = array(
            'https://store.sasanperfumes.com',
            'https://cms.sasanperfumes.com',
            'http://localhost:3000',
            'http://localhost:3001',
        );
        header('Access-Control-Allow-Origin: '.(in_array($origin,$allowed)?esc_url_raw($origin):'*'));
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        return $value;
    });
}

/**
 * Admin styles
 */
function sasanperfumes_settings_admin_styles() {
    if (strpos(get_current_screen()->id,'sasanperfumes-settings')===false) return;
    echo '<style>.nav-tab-wrapper{margin-bottom:0}.tab-content{margin-top:0}.form-table th{width:200px}.sasanperfumes-image-field{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px}.sasanperfumes-preview{flex-basis:100%}</style>';
}

// Initialize sasanperfumes settings
sasanperfumes_settings_init();
