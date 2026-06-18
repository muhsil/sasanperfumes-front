<?php
/**
 * Sasan Perfumes Feature Toggles â€” Centralized enable/disable for pages & sections
 *
 * Admin: sasanperfumes â†’ Feature Toggles
 * REST API: GET /sasanperfumes/v1/feature-toggles
 *
 * @since 6.7.0
 */
if (!defined('ABSPATH')) exit;

// â”€â”€ Toggle Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function sasanperfumes_ft_toggles() {
    return [
        // Page toggles
        ['key'=>'sasanperfumes_shop_enabled',           'label'=>'Shop Page',             'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /shop and commerce listing pages'],
        ['key'=>'sasanperfumes_about_enabled',          'label'=>'About Page',            'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /about page'],
        ['key'=>'sasanperfumes_contact_enabled',        'label'=>'Contact Page',          'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /contact page and contact form page'],
        ['key'=>'sasanperfumes_shipping_enabled',       'label'=>'Shipping Page',         'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /shipping page'],
        ['key'=>'sasanperfumes_returns_enabled',        'label'=>'Returns Page',          'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /returns page'],
        ['key'=>'sasanperfumes_privacy_enabled',        'label'=>'Privacy Page',          'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /privacy page'],
        ['key'=>'sasanperfumes_terms_enabled',          'label'=>'Terms Page',            'group'=>'Core Pages',       'default'=>true,  'desc'=>'Show /terms-and-conditions page'],
        ['key'=>'sasanperfumes_reviews_enabled',        'label'=>'Reviews',               'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show product reviews and review form on product pages'],
        ['key'=>'sasanperfumes_brands_page_enabled',    'label'=>'Brands Page',           'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /brands listing page'],
        ['key'=>'sasanperfumes_services_page_enabled',  'label'=>'Services Page',         'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /services listing page and detail pages'],
        ['key'=>'sasanperfumes_what_we_do_enabled',     'label'=>'What We Do Page',       'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /what-we-do page'],
        ['key'=>'sasanperfumes_blog_enabled',           'label'=>'Blog',                  'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /blog listing and detail pages'],
        ['key'=>'sasanperfumes_store_locator_enabled',  'label'=>'Store Locator',         'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /store-locator page'],
        ['key'=>'sasanperfumes_faq_enabled',            'label'=>'FAQ Page',              'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /faq page'],
        ['key'=>'sasanperfumes_private_labeling_enabled','label'=>'Private Labeling',      'group'=>'Pages & Features', 'default'=>true,  'desc'=>'Show /private-labeling landing page'],

        // Homepage section toggles (these overlap with per-section settings but provide a quick master list)
        ['key'=>'sasanperfumes_home_services_enabled',  'label'=>'Homepage Services',     'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show services section on homepage'],
        ['key'=>'sasanperfumes_home_blog_enabled',      'label'=>'Homepage Blog',         'group'=>'Homepage Sections','default'=>false, 'desc'=>'Show blog section on homepage'],
        ['key'=>'sasanperfumes_home_notes_enabled',     'label'=>'Homepage Notes',        'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show notes section on homepage'],
        ['key'=>'sasanperfumes_hero_enabled',           'label'=>'Hero Slider',           'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage hero slider', 'storage'=>'theme_mod'],
        ['key'=>'sasanperfumes_categories_enabled',     'label'=>'Categories',            'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage categories section', 'storage'=>'theme_mod'],
        ['key'=>'sasanperfumes_collections_enabled',    'label'=>'Collections',           'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage collections section', 'storage'=>'theme_mod'],
        ['key'=>'sasanperfumes_banners_enabled',        'label'=>'Banners',               'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage banner section', 'storage'=>'theme_mod'],
        ['key'=>'sasanperfumes_brands_slider_enabled',  'label'=>'Brands Slider',         'group'=>'Homepage Sections','default'=>false, 'desc'=>'Show brands slider on homepage', 'storage'=>'theme_mod'],
        ['key'=>'sasanperfumes_home_wcus_enabled',      'label'=>'Why Choose Us',         'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage Why Choose Us section'],
        ['key'=>'sasanperfumes_home_story_enabled',     'label'=>'Our Story',             'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage Our Story section'],
        ['key'=>'sasanperfumes_home_faq_enabled',       'label'=>'Home FAQ',              'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage FAQ section'],
        ['key'=>'sasanperfumes_home_seo_enabled',       'label'=>'Home SEO Content',      'group'=>'Homepage Sections','default'=>true,  'desc'=>'Show homepage SEO content section'],

        // Global feature toggles
        ['key'=>'sasanperfumes_topbar_enabled',         'label'=>'Topbar',                'group'=>'Global Features',  'default'=>true,  'desc'=>'Show announcement topbar', 'storage'=>'theme_mod'],
        ['key'=>'sasanperfumes_whatsapp_enabled',       'label'=>'WhatsApp Button',       'group'=>'Global Features',  'default'=>true,  'desc'=>'Show floating WhatsApp button'],
        ['key'=>'sasanperfumes_chat_enabled',           'label'=>'Live Chat',             'group'=>'Global Features',  'default'=>false, 'desc'=>'Show live chat widget'],
        ['key'=>'sasanperfumes_popup_enabled',          'label'=>'Promotional Popup',     'group'=>'Global Features',  'default'=>false, 'desc'=>'Show promotional popup'],
        ['key'=>'sasanperfumes_ab_popup_enabled',       'label'=>'Abandoned Cart Popup',  'group'=>'Global Features',  'default'=>false, 'desc'=>'Show abandoned cart popup'],
        ['key'=>'sasanperfumes_gift_wrap_enabled',      'label'=>'Gift Wrap',             'group'=>'Global Features',  'default'=>false, 'desc'=>'Enable gift wrap option'],
        ['key'=>'sasanperfumes_video_hero_enabled',     'label'=>'Video Hero',            'group'=>'Global Features',  'default'=>false, 'desc'=>'Enable video hero content'],
        ['key'=>'sasanperfumes_scent_guide_enabled',    'label'=>'Scent Guide',           'group'=>'Global Features',  'default'=>true,  'desc'=>'Enable scent guide modal/section'],
        ['key'=>'sasanperfumes_size_guide_enabled',     'label'=>'Size Guide',            'group'=>'Global Features',  'default'=>false, 'desc'=>'Enable size guide'],
        ['key'=>'sasanperfumes_loyalty_enabled',        'label'=>'Loyalty Program',       'group'=>'Global Features',  'default'=>false, 'desc'=>'Enable loyalty program'],
        ['key'=>'sasanperfumes_referral_enabled',       'label'=>'Referral Program',      'group'=>'Global Features',  'default'=>false, 'desc'=>'Enable referral program'],
    ];
}

function sasanperfumes_ft_get_value($toggle) {
    $storage = $toggle['storage'] ?? 'option';
    $default = !empty($toggle['default']);
    if ($storage === 'theme_mod') {
        return (bool) get_theme_mod($toggle['key'], $default);
    }
    $raw = get_option($toggle['key']);
    return ($raw !== false) ? (bool) $raw : $default;
}

function sasanperfumes_ft_save_value($toggle, $enabled) {
    if (($toggle['storage'] ?? 'option') === 'theme_mod') {
        set_theme_mod($toggle['key'], $enabled ? 1 : 0);
        return;
    }
    update_option($toggle['key'], $enabled ? 1 : 0);
}

// â”€â”€ Admin Menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
add_action('admin_menu', function() {
    add_submenu_page('sasanperfumes-settings', 'Feature Toggles', 'Feature Toggles', 'manage_options', 'sasanperfumes-feature-toggles', 'sasanperfumes_ft_render');
});

// â”€â”€ Admin Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function sasanperfumes_ft_render() {
    if (!current_user_can('manage_options')) return;

    // Save
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('sasanperfumes_ft_save')) {
        foreach (sasanperfumes_ft_toggles() as $t) {
            sasanperfumes_ft_save_value($t, !empty($_POST[$t['key']]));
        }
        echo '<div class="notice notice-success"><p>Feature toggles saved.</p></div>';
    }

    $toggles = sasanperfumes_ft_toggles();
    ?>
    <div class="wrap">
        <h1>Feature Toggles</h1>
        <p>Enable or disable pages and homepage sections. Disabled features return 404 (pages) or are hidden from the frontend (sections).</p>
        <form method="post">
            <?php wp_nonce_field('sasanperfumes_ft_save'); ?>
            <table class="form-table">
                <?php
                $current_group = '';
                foreach ($toggles as $t) {
                    if ($t['group'] !== $current_group) {
                        $current_group = $t['group'];
                        echo '<tr><th colspan="2"><h2 style="margin:0;">' . esc_html($current_group) . '</h2></th></tr>';
                    }
                    $val = sasanperfumes_ft_get_value($t);
                    ?>
                    <tr>
                        <th><?php echo esc_html($t['label']); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr($t['key']); ?>" value="1" <?php checked($val); ?>>
                                <?php echo esc_html($t['desc']); ?>
                            </label>
                        </td>
                    </tr>
                    <?php
                }
                ?>
            </table>
            <p><strong>Note:</strong> This page is the central control panel. Some toggles are also mirrored in their feature-specific settings pages.</p>
            <?php submit_button('Save Feature Toggles'); ?>
        </form>

        <hr>
        <h2>Mirrored Settings Reference</h2>
        <p>These settings are also available in their feature-specific pages and are included in the REST API response:</p>
        <table class="widefat" style="max-width:700px;">
            <thead><tr><th>Feature</th><th>Option Key</th><th>Status</th><th>Managed In</th></tr></thead>
            <tbody>
            <?php
            $ref = [
                ['Size Guide',     'sasanperfumes_size_guide_enabled',          'sasanperfumes â†’ Advanced'],
                ['Loyalty',        'sasanperfumes_loyalty_enabled',             'sasanperfumes â†’ Loyalty Points'],
                ['Scent Guide',    'sasanperfumes_scent_guide_section_enabled', 'sasanperfumes â†’ Advanced'],
                ['Brands Slider',  'sasanperfumes_brands_slider_enabled',      'sasanperfumes â†’ Brands Slider'],
                ['Popup',          'sasanperfumes_popup_enabled',               'sasanperfumes â†’ Promotions'],
                ['Chat Widget',    'sasanperfumes_chat_enabled',                'sasanperfumes â†’ Advanced'],
                ['Gift Wrap',      'sasanperfumes_gift_wrap_enabled',           'sasanperfumes â†’ Advanced'],
                ['Video Hero',     'sasanperfumes_video_hero_enabled',          'sasanperfumes â†’ Advanced'],
                ['Hero Slider',    'sasanperfumes_hero_enabled',                'sasanperfumes â†’ Home Page â†’ Hero'],
                ['Categories',     'sasanperfumes_categories_enabled',          'sasanperfumes â†’ Home Page â†’ Categories'],
                ['Collections',    'sasanperfumes_collections_enabled',         'sasanperfumes â†’ Home Page â†’ Collections'],
                ['Banners',        'sasanperfumes_banners_enabled',             'sasanperfumes â†’ Home Page â†’ Banners'],
                ['Topbar',         'sasanperfumes_topbar_enabled',              'sasanperfumes â†’ Header & Topbar'],
                ['Why Choose Us',  'sasanperfumes_home_wcus_enabled',           'sasanperfumes â†’ Home Sections'],
                ['Our Story',      'sasanperfumes_home_story_enabled',          'sasanperfumes â†’ Home Sections'],
                ['Home FAQ',       'sasanperfumes_home_faq_enabled',            'sasanperfumes â†’ Home Sections'],
                ['Home SEO Content','sasanperfumes_home_seo_enabled',           'sasanperfumes â†’ Home Sections'],
                ['WhatsApp Button','sasanperfumes_whatsapp_enabled',            'sasanperfumes â†’ WhatsApp Button'],
            ];
            foreach ($ref as $r) {
                $raw = get_option($r[1]);
                if ($raw === false) $raw = get_theme_mod($r[1]);
                $status = $raw ? '<span style="color:green;">Enabled</span>' : '<span style="color:red;">Disabled</span>';
                echo "<tr><td>{$r[0]}</td><td><code>{$r[1]}</code></td><td>{$status}</td><td>{$r[2]}</td></tr>";
            }
            ?>
            </tbody>
        </table>
    </div>
    <?php
}

// â”€â”€ REST API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
add_action('rest_api_init', function() {
    sasanperfumes_register_rest_route( '/feature-toggles', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_ft_api',
        'permission_callback' => '__return_true',
    ]);
});

function sasanperfumes_ft_api() {
    $out = [];

    // Centralized feature toggles
    foreach (sasanperfumes_ft_toggles() as $t) {
        $out[$t['key']] = sasanperfumes_ft_get_value($t);
    }

    // Include existing toggles from other modules for convenience
    $out['sasanperfumes_size_guide_enabled']          = (bool) get_option('sasanperfumes_size_guide_enabled', 0);
    $out['sasanperfumes_loyalty_enabled']             = (bool) get_option('sasanperfumes_loyalty_enabled', 0);
    $out['sasanperfumes_brands_slider_enabled']       = (bool) get_theme_mod('sasanperfumes_brands_slider_enabled', false);
    $out['sasanperfumes_popup_enabled']               = (bool) get_option('sasanperfumes_popup_enabled', false);
    $out['sasanperfumes_hero_enabled']                = (bool) get_theme_mod('sasanperfumes_hero_enabled', true);
    $out['sasanperfumes_categories_enabled']          = (bool) get_theme_mod('sasanperfumes_categories_enabled', true);
    $out['sasanperfumes_collections_enabled']         = (bool) get_theme_mod('sasanperfumes_collections_enabled', true);
    $out['sasanperfumes_banners_enabled']             = (bool) get_theme_mod('sasanperfumes_banners_enabled', true);
    $out['sasanperfumes_topbar_enabled']              = (bool) get_theme_mod('sasanperfumes_topbar_enabled', true);
    $out['sasanperfumes_chat_enabled']                = (bool) get_option('sasanperfumes_chat_enabled', false);
    $out['sasanperfumes_gift_wrap_enabled']           = (bool) get_option('sasanperfumes_gift_wrap_enabled', false);
    $out['sasanperfumes_video_hero_enabled']          = (bool) get_option('sasanperfumes_video_hero_enabled', false);

    // Scent guide (complex legacy logic)
    $legacy = (bool) get_option('sasanperfumes_scent_guide_enabled', true);
    $raw_scent = get_option('sasanperfumes_scent_guide_section_enabled');
    $out['sasanperfumes_scent_guide_enabled'] = ($raw_scent !== false) ? (bool) $raw_scent : $legacy;

    // Home sections
    $out['sasanperfumes_home_wcus_enabled']  = (bool) get_option('sasanperfumes_home_wcus_enabled', true);
    $out['sasanperfumes_home_story_enabled'] = (bool) get_option('sasanperfumes_home_story_enabled', true);
    $out['sasanperfumes_home_faq_enabled']   = (bool) get_option('sasanperfumes_home_faq_enabled', true);
    $out['sasanperfumes_home_seo_enabled']   = (bool) get_option('sasanperfumes_home_seo_enabled', true);

    return rest_ensure_response($out);
}
