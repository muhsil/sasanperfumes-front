<?php
/**
 * Sasan Perfumes Page Fields — Custom metaboxes on native WordPress Pages
 *
 * Content for: about, contact, faq, privacy, terms-and-conditions, shipping, returns, shop, home
 * Each page gets a sidebar "Sasan Perfumes Page Type" selector + content metaboxes.
 *
 * REST API: GET /sasanperfumes/v1/pages/{slug}
 * REST API: GET /sasanperfumes/v1/home-sections
 *
 * @since 6.3.0
 */
if (!defined('ABSPATH')) exit;

function sasanperfumes_pf_content_prefix() {
    return '_sasanperfumes_page';
}

function sasanperfumes_pf_legacy_content_prefix() {
    return '_asl';
}

function sasanperfumes_pf_migrate_legacy_bi($post_id, $key) {
    $prefix = sasanperfumes_pf_content_prefix();
    $legacy = sasanperfumes_pf_legacy_content_prefix();

    foreach (array('en', 'ar') as $lang) {
        $new_key = "{$prefix}_{$key}_{$lang}";
        $legacy_key = "{$legacy}_{$key}_{$lang}";
        $new_value = get_post_meta($post_id, $new_key, true);
        $legacy_value = get_post_meta($post_id, $legacy_key, true);

        if ($new_value === '' && $legacy_value !== '') {
            update_post_meta($post_id, $new_key, $legacy_value);
        }
    }
}

function sasanperfumes_pf_render_bi($post_id, $key, $label, $type = 'text', $config = array()) {
    sasanperfumes_pf_migrate_legacy_bi($post_id, $key);
    sasanperfumes_f_bi($post_id, sasanperfumes_pf_content_prefix(), $key, $label, $type, $config);
}

function sasanperfumes_pf_save_bi($post_id, $key, $type = 'text') {
    $prefix = sasanperfumes_pf_content_prefix();
    $legacy = sasanperfumes_pf_legacy_content_prefix();

    sasanperfumes_f_save_bi($post_id, $prefix, $key, $type);
    delete_post_meta($post_id, "{$legacy}_{$key}_en");
    delete_post_meta($post_id, "{$legacy}_{$key}_ar");
}

function sasanperfumes_pf_api_bi($post_id, $key) {
    $prefix = sasanperfumes_pf_content_prefix();
    $legacy = sasanperfumes_pf_legacy_content_prefix();
    $en = get_post_meta($post_id, "{$prefix}_{$key}_en", true);
    $ar = get_post_meta($post_id, "{$prefix}_{$key}_ar", true);

    if ($en !== '' || $ar !== '') {
        return array('en' => $en, 'ar' => $ar);
    }

    return sasanperfumes_f_api_bi($post_id, $legacy, $key);
}

/* ================================================================
   PAGE TYPE CONFIGS — defines fields for each page type
   ================================================================ */

function sasanperfumes_pf_configs() {
    return [
        'about' => [
            'label' => 'About',
            'images' => [
                'heroImage' => ['label' => 'Hero Image', 'meta_key' => '_sasanperfumes_about_hero_image'],
                'storyImage' => ['label' => 'Story Image', 'meta_key' => '_sasanperfumes_about_story_image'],
                'detailImage' => ['label' => 'Journey Detail Image', 'meta_key' => '_sasanperfumes_about_detail_image'],
                'missionImage' => ['label' => 'Mission/Vision Image', 'meta_key' => '_sasanperfumes_about_mission_image'],
            ],
            'bi' => [
                'title' => ['label'=>'Title'],
                'hero_subtitle' => ['label'=>'Hero Subtitle'],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'stats_since' => ['label'=>'Stats: Since'],
                'stats_location' => ['label'=>'Stats: Location'],
                'stats_handcrafted' => ['label'=>'Stats: Handcrafted'],
                'stats_sustainable' => ['label'=>'Stats: Sustainable'],
                'main_title' => ['label'=>'Main Content Title'],
                'main_p1' => ['label'=>'Main Paragraph 1','type'=>'textarea','rows'=>4],
                'main_p2' => ['label'=>'Main Paragraph 2','type'=>'textarea','rows'=>4],
                'main_p3' => ['label'=>'Main Paragraph 3','type'=>'textarea','rows'=>4],
                'uniqueness_title' => ['label'=>'Uniqueness Title'],
                'uniqueness_subtitle' => ['label'=>'Uniqueness Subtitle'],
                'uniqueness_content' => ['label'=>'Uniqueness Content','type'=>'textarea','rows'=>4],
                'journey_title' => ['label'=>'Journey Title'],
                'journey_content' => ['label'=>'Journey Content','type'=>'textarea','rows'=>4],
                'ingredients_title' => ['label'=>'Ingredients Title'],
                'ingredients_subtitle' => ['label'=>'Ingredients Subtitle'],
                'ingredients_desc' => ['label'=>'Ingredients Description','type'=>'textarea','rows'=>3],
                'mission_title' => ['label'=>'Mission Title'],
                'mission_content' => ['label'=>'Mission Content','type'=>'textarea','rows'=>4],
                'vision_title' => ['label'=>'Vision Title'],
                'vision_content' => ['label'=>'Vision Content','type'=>'textarea','rows'=>4],
                'core_values_title' => ['label'=>'Core Values Title'],
                'core_values_subtitle' => ['label'=>'Core Values Subtitle'],
                'cta_title' => ['label'=>'CTA Title'],
                'cta_subtitle' => ['label'=>'CTA Subtitle'],
                'cta_button' => ['label'=>'CTA Button Text'],
                'cta_link' => ['label'=>'CTA Button Link','class'=>'large-text'],
            ],
            'repeaters' => [
                '_sasanperfumes_about_sections' => ['label'=>'Bottom Sections','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>3],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_about_ingredients' => ['label'=>'Ingredient Items','fields'=>[
                    'name_en'=>['label'=>'Name (EN)','class'=>'regular-text'],
                    'name_ar'=>['label'=>'Name (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Desc (EN)','type'=>'textarea','rows'=>2],
                    'desc_ar'=>['label'=>'Desc (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                    'image'=>['label'=>'Image','type'=>'image'],
                ]],
                '_sasanperfumes_about_faq' => ['label'=>'About FAQ','fields'=>[
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_about_core_values' => ['label'=>'Core Values Items','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'description_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>2],
                    'description_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                ]],
            ],
        ],
        'contact' => [
            'label' => 'Contact',
            'bi' => [
                'hero_title' => ['label'=>'Hero Title'],
                'hero_subtitle' => ['label'=>'Hero Subtitle'],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'quick_contact' => ['label'=>'Quick Contact Label','class'=>'regular-text'],
                'whatsapp' => ['label'=>'WhatsApp Label','class'=>'regular-text'],
                'call_us' => ['label'=>'Call Us Label','class'=>'regular-text'],
                'email_us' => ['label'=>'Email Us Label','class'=>'regular-text'],
                'send_message' => ['label'=>'Send Message Label','class'=>'regular-text'],
                'send_message_sub' => ['label'=>'Send Message Subtitle','type'=>'textarea','rows'=>2],
                'contact_info_label' => ['label'=>'Contact Info Label','class'=>'regular-text'],
                'contact_info_title' => ['label'=>'Contact Info Title'],
                'follow_us' => ['label'=>'Follow Us Label','class'=>'regular-text'],
                'cta_title' => ['label'=>'CTA Title'],
                'cta_subtitle' => ['label'=>'CTA Subtitle'],
                'cta_button' => ['label'=>'CTA Button','class'=>'regular-text'],
            ],
            'repeaters' => [
                '_sasanperfumes_contact_info' => ['label'=>'Contact Info Items','fields'=>[
                    'key'=>['label'=>'Key (address/phone/email/hours)','class'=>'regular-text'],
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)'],
                    'content_ar'=>['label'=>'Content (AR)','rtl'=>true],
                ]],
                '_sasanperfumes_contact_social' => ['label'=>'Social Links','fields'=>[
                    'platform'=>['label'=>'Platform','class'=>'regular-text'],
                    'url'=>['label'=>'URL'],
                ]],
                '_sasanperfumes_trust_indicators' => ['label'=>'Trust Indicators','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'description_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>2],
                    'description_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                    'icon'=>['label'=>'Icon Key','class'=>'regular-text'],
                ]],
            ],
        ],
        'faq' => [
            'label' => 'FAQ',
            'bi' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'not_found' => ['label'=>'Not Found Title'],
                'not_found_text' => ['label'=>'Not Found Text','type'=>'textarea','rows'=>2],
                'featured_links_title' => ['label'=>'Featured Links Title','class'=>'regular-text'],
                'featured_links_description' => ['label'=>'Featured Links Description','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                '_sasanperfumes_faq_items' => ['label'=>'FAQ Items','fields'=>[
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_faq_groups' => ['label'=>'FAQ Groups','fields'=>[
                    'group_title_en'=>['label'=>'Group Title (EN)','class'=>'regular-text'],
                    'group_title_ar'=>['label'=>'Group Title (AR)','class'=>'regular-text','rtl'=>true],
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_featured_links' => ['label'=>'Featured Links','fields'=>[
                    'label_en'=>['label'=>'Label (EN)','class'=>'regular-text'],
                    'label_ar'=>['label'=>'Label (AR)','class'=>'regular-text','rtl'=>true],
                    'url'=>['label'=>'URL','class'=>'large-text'],
                ]],
            ],
        ],
        'privacy' => [
            'label' => 'Privacy Policy',
            'bi' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'last_updated' => ['label'=>'Last Updated','class'=>'regular-text'],
                'contact_cta' => ['label'=>'Contact CTA','type'=>'textarea','rows'=>2],
                'featured_links_title' => ['label'=>'Featured Links Title','class'=>'regular-text'],
                'featured_links_description' => ['label'=>'Featured Links Description','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                '_sasanperfumes_privacy_sections' => ['label'=>'Sections','fields'=>[
                    'title_en'=>['label'=>'Title (EN)'],
                    'title_ar'=>['label'=>'Title (AR)','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>4],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>4,'rtl'=>true],
                ]],
                '_sasanperfumes_privacy_faq_groups' => ['label'=>'FAQ Groups','fields'=>[
                    'group_title_en'=>['label'=>'Group Title (EN)','class'=>'regular-text'],
                    'group_title_ar'=>['label'=>'Group Title (AR)','class'=>'regular-text','rtl'=>true],
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_featured_links' => ['label'=>'Featured Links','fields'=>[
                    'label_en'=>['label'=>'Label (EN)','class'=>'regular-text'],
                    'label_ar'=>['label'=>'Label (AR)','class'=>'regular-text','rtl'=>true],
                    'url'=>['label'=>'URL','class'=>'large-text'],
                ]],
            ],
        ],
        'terms' => [
            'label' => 'Terms & Conditions',
            'bi' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'last_updated' => ['label'=>'Last Updated','class'=>'regular-text'],
                'agreement' => ['label'=>'Agreement Text','type'=>'textarea','rows'=>2],
                'featured_links_title' => ['label'=>'Featured Links Title','class'=>'regular-text'],
                'featured_links_description' => ['label'=>'Featured Links Description','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                '_sasanperfumes_terms_sections' => ['label'=>'Sections','fields'=>[
                    'title_en'=>['label'=>'Title (EN)'],
                    'title_ar'=>['label'=>'Title (AR)','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>4],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>4,'rtl'=>true],
                ]],
                '_sasanperfumes_terms_faq_groups' => ['label'=>'FAQ Groups','fields'=>[
                    'group_title_en'=>['label'=>'Group Title (EN)','class'=>'regular-text'],
                    'group_title_ar'=>['label'=>'Group Title (AR)','class'=>'regular-text','rtl'=>true],
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_featured_links' => ['label'=>'Featured Links','fields'=>[
                    'label_en'=>['label'=>'Label (EN)','class'=>'regular-text'],
                    'label_ar'=>['label'=>'Label (AR)','class'=>'regular-text','rtl'=>true],
                    'url'=>['label'=>'URL','class'=>'large-text'],
                ]],
            ],
        ],
        'shipping' => [
            'label' => 'Shipping',
            'bi' => [
                'title' => ['label'=>'Title'],
                'have_questions' => ['label'=>'Have Questions Title'],
                'have_questions_text' => ['label'=>'Have Questions Text','type'=>'textarea','rows'=>2],
                'rates_title' => ['label'=>'Rates Table Title'],
                'rates_destination' => ['label'=>'Column: Destination','class'=>'regular-text'],
                'rates_cost_label' => ['label'=>'Column: Cost','class'=>'regular-text'],
                'rates_delivery_label' => ['label'=>'Column: Est. Delivery','class'=>'regular-text'],
                'rates_currency' => ['label'=>'Currency','class'=>'regular-text'],
                'rates_note' => ['label'=>'Rates Note','type'=>'textarea','rows'=>2],
                'featured_links_title' => ['label'=>'Featured Links Title','class'=>'regular-text'],
                'featured_links_description' => ['label'=>'Featured Links Description','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                '_sasanperfumes_shipping_sections' => ['label'=>'Sections','fields'=>[
                    'key'=>['label'=>'Key','class'=>'regular-text'],
                    'title_en'=>['label'=>'Title (EN)'],
                    'title_ar'=>['label'=>'Title (AR)','rtl'=>true],
                    'content_en'=>['label'=>'Content (EN)','type'=>'textarea','rows'=>3],
                    'content_ar'=>['label'=>'Content (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_shipping_rates' => ['label'=>'Shipping Rates','fields'=>[
                    'location_en'=>['label'=>'Location (EN)','class'=>'regular-text'],
                    'location_ar'=>['label'=>'Location (AR)','class'=>'regular-text','rtl'=>true],
                    'cost_en'=>['label'=>'Cost (EN)','class'=>'regular-text'],
                    'cost_ar'=>['label'=>'Cost (AR)','class'=>'regular-text','rtl'=>true],
                    'delivery_en'=>['label'=>'Delivery (EN)','class'=>'regular-text'],
                    'delivery_ar'=>['label'=>'Delivery (AR)','class'=>'regular-text','rtl'=>true],
                ]],
                '_sasanperfumes_shipping_freight_rates' => ['label'=>'Freight Charges','fields'=>[
                    'weight'=>['label'=>'Weight / الوزن','class'=>'regular-text'],
                    'pcs'=>['label'=>'PCS / القطع','class'=>'regular-text'],
                    'saudi_arabia'=>['label'=>'Saudi Arabia / السعودية','class'=>'regular-text'],
                    'bahrain'=>['label'=>'Bahrain / البحرين','class'=>'regular-text'],
                    'kuwait'=>['label'=>'Kuwait / الكويت','class'=>'regular-text'],
                    'qatar'=>['label'=>'Qatar / قطر','class'=>'regular-text'],
                ]],
                '_sasanperfumes_shipping_faq_groups' => ['label'=>'FAQ Groups','fields'=>[
                    'group_title_en'=>['label'=>'Group Title (EN)','class'=>'regular-text'],
                    'group_title_ar'=>['label'=>'Group Title (AR)','class'=>'regular-text','rtl'=>true],
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_featured_links' => ['label'=>'Featured Links','fields'=>[
                    'label_en'=>['label'=>'Label (EN)','class'=>'regular-text'],
                    'label_ar'=>['label'=>'Label (AR)','class'=>'regular-text','rtl'=>true],
                    'url'=>['label'=>'URL','class'=>'large-text'],
                ]],
            ],
        ],
        'returns' => [
            'label' => 'Returns',
            'bi' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'process_title' => ['label'=>'Process Title'],
                'eligible_title' => ['label'=>'Eligible Title'],
                'not_eligible_title' => ['label'=>'Not Eligible Title'],
                'need_help' => ['label'=>'Need Help Title'],
                'need_help_text' => ['label'=>'Need Help Text','type'=>'textarea','rows'=>2],
                'featured_links_title' => ['label'=>'Featured Links Title','class'=>'regular-text'],
                'featured_links_description' => ['label'=>'Featured Links Description','type'=>'textarea','rows'=>2],
            ],
            'repeaters' => [
                '_sasanperfumes_returns_features' => ['label'=>'Features','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>3],
                    'desc_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_returns_steps' => ['label'=>'Return Steps','fields'=>[
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>3],
                    'desc_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_returns_eligible' => ['label'=>'Eligible Items','fields'=>[
                    'text_en'=>['label'=>'Text (EN)'],
                    'text_ar'=>['label'=>'Text (AR)','rtl'=>true],
                ]],
                '_sasanperfumes_returns_not_eligible' => ['label'=>'Not Eligible Items','fields'=>[
                    'text_en'=>['label'=>'Text (EN)'],
                    'text_ar'=>['label'=>'Text (AR)','rtl'=>true],
                ]],
                '_sasanperfumes_returns_faq_groups' => ['label'=>'FAQ Groups','fields'=>[
                    'group_title_en'=>['label'=>'Group Title (EN)','class'=>'regular-text'],
                    'group_title_ar'=>['label'=>'Group Title (AR)','class'=>'regular-text','rtl'=>true],
                    'q_en'=>['label'=>'Question (EN)'],
                    'q_ar'=>['label'=>'Question (AR)','rtl'=>true],
                    'a_en'=>['label'=>'Answer (EN)','type'=>'textarea','rows'=>3],
                    'a_ar'=>['label'=>'Answer (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
                ]],
                '_sasanperfumes_featured_links' => ['label'=>'Featured Links','fields'=>[
                    'label_en'=>['label'=>'Label (EN)','class'=>'regular-text'],
                    'label_ar'=>['label'=>'Label (AR)','class'=>'regular-text','rtl'=>true],
                    'url'=>['label'=>'URL','class'=>'large-text'],
                ]],
            ],
        ],
        'what-we-do' => [
            'label' => 'What We Do',
            'bi' => [
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle','type'=>'textarea','rows'=>2],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'content' => ['label'=>'Main Content','type'=>'textarea','rows'=>6],
            ],
            'has_image' => '_sasanperfumes_what_we_do_hero_image',
            'repeaters' => [
                '_sasanperfumes_whatwedo_features' => ['label'=>'Features','fields'=>[
                    'image'=>['label'=>'Image','type'=>'image'],
                    'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                    'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                    'desc_en'=>['label'=>'Description (EN)','type'=>'textarea','rows'=>2],
                    'desc_ar'=>['label'=>'Description (AR)','type'=>'textarea','rows'=>2,'rtl'=>true],
                ]],
            ],
        ],
        'store-locator' => [
            'label' => 'Store Locator',
            'bi' => [
                'hero_title' => ['label'=>'Hero Title'],
                'hero_subtitle' => ['label'=>'Hero Subtitle'],
                'hero_description' => ['label'=>'Hero Description','type'=>'textarea','rows'=>3],
                'opening_hours' => ['label'=>'Opening Hours','class'=>'regular-text'],
                'cta_title' => ['label'=>'CTA Title'],
                'cta_subtitle' => ['label'=>'CTA Subtitle','type'=>'textarea','rows'=>2],
                'cta_button' => ['label'=>'CTA Button Text','class'=>'regular-text'],
            ],
            'repeaters' => [
                '_sasanperfumes_stores' => ['label'=>'Store Locations','fields'=>[
                    'name_en'=>['label'=>'Store Name (EN)','class'=>'regular-text'],
                    'name_ar'=>['label'=>'Store Name (AR)','class'=>'regular-text','rtl'=>true],
                    'floor_en'=>['label'=>'Floor (EN)','class'=>'regular-text'],
                    'floor_ar'=>['label'=>'Floor (AR)','class'=>'regular-text','rtl'=>true],
                    'city_en'=>['label'=>'City (EN)','class'=>'regular-text'],
                    'city_ar'=>['label'=>'City (AR)','class'=>'regular-text','rtl'=>true],
                    'region'=>['label'=>'Region slug','class'=>'regular-text'],
                    'country'=>['label'=>'Country slug (uae/oman)','class'=>'regular-text'],
                    'google_maps_url'=>['label'=>'Google Maps URL'],
                    'image'=>['label'=>'Store Image','type'=>'image'],
                ]],
            ],
        ],
        'shop' => [
            'label' => 'Shop',
            'bi' => [
                'subtitle' => ['label'=>'Subtitle'],
            ],
        ],
    ];
}

/* ================================================================
   HOME SECTIONS CONFIG — Why Choose Us, Our Story, FAQ, SEO Content
   ================================================================ */

function sasanperfumes_pf_home_sections() {
    return [
        'wcus' => [
            'label' => 'Why Choose Us',
            'bi' => [
                'eyebrow' => ['label'=>'Eyebrow','class'=>'regular-text'],
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle'],
            ],
            'repeater' => ['key'=>'_sasanperfumes_wcus_items','label'=>'Items','fields'=>[
                'title_en'=>['label'=>'Title (EN)','class'=>'regular-text'],
                'title_ar'=>['label'=>'Title (AR)','class'=>'regular-text','rtl'=>true],
                'desc_en'=>['label'=>'Desc (EN)','type'=>'textarea','rows'=>3],
                'desc_ar'=>['label'=>'Desc (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
            ]],
        ],
        'story' => [
            'label' => 'Our Story',
            'bi' => [
                'eyebrow' => ['label'=>'Eyebrow','class'=>'regular-text'],
                'title' => ['label'=>'Title'],
                'desc1' => ['label'=>'Description 1','type'=>'textarea'],
                'desc2' => ['label'=>'Description 2','type'=>'textarea'],
            ],
            'has_image' => '_sasanperfumes_story_image',
            'repeater' => ['key'=>'_sasanperfumes_story_stats','label'=>'Stats','fields'=>[
                'value'=>['label'=>'Value','class'=>'regular-text'],
                'label_en'=>['label'=>'Label (EN)','class'=>'regular-text'],
                'label_ar'=>['label'=>'Label (AR)','class'=>'regular-text','rtl'=>true],
            ]],
        ],
        'faq_home' => [
            'label' => 'FAQ',
            'prefix' => '_sasanperfumes_hfaq',
            'bi' => [
                'eyebrow' => ['label'=>'Eyebrow','class'=>'regular-text'],
                'title' => ['label'=>'Title'],
                'subtitle' => ['label'=>'Subtitle'],
            ],
            'repeater' => ['key'=>'_sasanperfumes_hfaq_items','label'=>'FAQ Items','fields'=>[
                'q_en'=>['label'=>'Q (EN)'],
                'q_ar'=>['label'=>'Q (AR)','rtl'=>true],
                'a_en'=>['label'=>'A (EN)','type'=>'textarea','rows'=>3],
                'a_ar'=>['label'=>'A (AR)','type'=>'textarea','rows'=>3,'rtl'=>true],
            ]],
        ],
        'seo' => [
            'label' => 'SEO Content',
            'bi' => [
                'title' => ['label'=>'Title'],
                'para1' => ['label'=>'Paragraph 1','type'=>'textarea','rows'=>5],
                'para2' => ['label'=>'Paragraph 2','type'=>'textarea','rows'=>5],
            ],
        ],
    ];
}

/* ================================================================
   DETECT PAGE TYPE
   ================================================================ */

/** Get the Sasan Perfumes page type for a given post */
function sasanperfumes_pf_get_type($post_id) {
    return get_post_meta($post_id, '_sasanperfumes_page_type', true);
}

/** Find the WP Page ID for a given Sasan Perfumes page type */
function sasanperfumes_pf_find_page($type) {
    // Check cached option first
    $id = (int) get_option("sasanperfumes_page_id_{$type}", 0);
    if ($id && get_post_status($id) !== false) return $id;

    $known_page_ids = [
        'what-we-do' => 11304,
    ];
    if (isset($known_page_ids[$type])) {
        $known_id = (int) $known_page_ids[$type];
        if ($known_id && get_post_status($known_id) !== false) {
            update_option("sasanperfumes_page_id_{$type}", $known_id);
            update_post_meta($known_id, '_sasanperfumes_page_type', $type);
            return $known_id;
        }
    }

    // Search by meta
    $posts = get_posts([
        'post_type' => 'page', 'post_status' => 'any',
        'meta_key' => '_sasanperfumes_page_type', 'meta_value' => $type,
        'posts_per_page' => 1, 'fields' => 'ids',
    ]);
    if (!empty($posts)) {
        update_option("sasanperfumes_page_id_{$type}", $posts[0]);
        return $posts[0];
    }

    $page = get_page_by_path($type);
    if ($page && get_post_status($page->ID) !== false) {
        update_option("sasanperfumes_page_id_{$type}", $page->ID);
        update_post_meta($page->ID, '_sasanperfumes_page_type', $type);
        return $page->ID;
    }

    return 0;
}

/* ================================================================
   ADMIN: METABOXES ON WORDPRESS PAGES
   ================================================================ */

function sasanperfumes_pf_add_metaboxes() {
    // Sidebar: page type selector (on all pages)
    add_meta_box('sasanperfumes_page_type', 'Sasan Perfumes Page Type', 'sasanperfumes_pf_type_metabox', 'page', 'side', 'high');

    // Content metaboxes: only show if page has a Sasan Perfumes type assigned
    global $post;
    if (!$post) return;
    $type = sasanperfumes_pf_get_type($post->ID);
    if (!$type) return;

    $configs = sasanperfumes_pf_configs();
    if (isset($configs[$type])) {
        add_meta_box('sasanperfumes_page_content', $configs[$type]['label'] . ' — Content Fields', 'sasanperfumes_pf_content_metabox', 'page', 'normal', 'high');
        if (!empty($configs[$type]['repeaters'])) {
            add_meta_box('sasanperfumes_page_repeaters', $configs[$type]['label'] . ' — Repeaters', 'sasanperfumes_pf_repeaters_metabox', 'page', 'normal', 'default');
        }
    }

    if ($type === 'home') {
        foreach (sasanperfumes_pf_home_sections() as $key => $sec) {
            add_meta_box("sasanperfumes_home_{$key}", $sec['label'], function($post) use ($key, $sec) {
                sasanperfumes_pf_home_section_metabox($post, $key, $sec);
            }, 'page', 'normal', 'default');
        }
    }
}

/** Sidebar: Sasan Perfumes Page Type selector */
function sasanperfumes_pf_type_metabox($post) {
    wp_nonce_field('sasanperfumes_pf_save', 'sasanperfumes_pf_nonce');
    $current = sasanperfumes_pf_get_type($post->ID);
    $types = [''=>'— None —'] + array_map(fn($c) => $c['label'], sasanperfumes_pf_configs()) + ['home'=>'Home Page'];
    echo '<select name="_sasanperfumes_page_type" style="width:100%">';
    foreach ($types as $val => $label) {
        echo '<option value="'.esc_attr($val).'"'.selected($current, $val, false).'>'.esc_html($label).'</option>';
    }
    echo '</select>';
    echo '<p class="description">Select the Sasan Perfumes page type. Save to see content fields.</p>';
}

/** Content metabox: bilingual fields */
function sasanperfumes_pf_content_metabox($post) {
    $type = sasanperfumes_pf_get_type($post->ID);
    $cfg = sasanperfumes_pf_configs()[$type] ?? null;
    if (!$cfg) return;

    echo '<table class="form-table">';
    foreach ($cfg['bi'] ?? [] as $key => $fc) {
        sasanperfumes_pf_render_bi($post->ID, $key, $fc['label'], $fc['type'] ?? 'text', $fc);
    }
    foreach ($cfg['images'] ?? [] as $image_cfg) {
        $meta_key = $image_cfg['meta_key'] ?? '';
        if (!$meta_key) continue;
        $img = get_post_meta($post->ID, $meta_key, true);
        echo '<tr><th>' . esc_html($image_cfg['label'] ?? 'Image') . '</th><td>';
        if (function_exists('sasanperfumes_image_field')) {
            sasanperfumes_image_field($meta_key, $img);
        } else {
            echo '<input type="text" name="' . esc_attr($meta_key) . '" value="' . esc_attr($img) . '" class="large-text">';
        }
        echo '</td></tr>';
    }
    if (!empty($cfg['has_image'])) {
        $img = get_post_meta($post->ID, $cfg['has_image'], true);
        echo '<tr><th>Hero Image</th><td>';
        if (function_exists('sasanperfumes_image_field')) {
            sasanperfumes_image_field($cfg['has_image'], $img);
        } else {
            echo '<input type="text" name="' . esc_attr($cfg['has_image']) . '" value="' . esc_attr($img) . '" class="large-text">';
        }
        echo '</td></tr>';
    }
    echo '</table>';
}

/** Repeaters metabox */
function sasanperfumes_pf_repeaters_metabox($post) {
    $type = sasanperfumes_pf_get_type($post->ID);
    $cfg = sasanperfumes_pf_configs()[$type] ?? null;
    if (!$cfg || empty($cfg['repeaters'])) return;

    foreach ($cfg['repeaters'] as $meta_key => $rep) {
        sasanperfumes_f_repeater($post->ID, $meta_key, $rep['label'], $rep['fields']);
    }
}

/** Home section metabox */
function sasanperfumes_pf_home_section_metabox($post, $key, $sec) {
    $prefix = $sec['prefix'] ?? "_sasanperfumes_{$key}";

    echo '<table class="form-table">';
    sasanperfumes_f_enable($post->ID, $prefix);
    foreach ($sec['bi'] ?? [] as $fk => $fc) {
        sasanperfumes_f_bi($post->ID, $prefix, $fk, $fc['label'], $fc['type'] ?? 'text', $fc);
    }
    // Image field
    if (!empty($sec['has_image']) && function_exists('sasanperfumes_image_field')) {
        $img = get_post_meta($post->ID, $sec['has_image'], true);
        echo '<tr><th>Image</th><td>';
        sasanperfumes_image_field($sec['has_image'], $img);
        echo '</td></tr>';
    }
    echo '</table>';

    // Repeater
    if (!empty($sec['repeater'])) {
        $r = $sec['repeater'];
        sasanperfumes_f_repeater($post->ID, $r['key'], $r['label'], $r['fields']);
    }
}

/* ================================================================
   SAVE
   ================================================================ */

function sasanperfumes_pf_save($post_id) {
    if (!isset($_POST['sasanperfumes_pf_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_pf_nonce'], 'sasanperfumes_pf_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    // Save page type
    $type = sanitize_text_field($_POST['_sasanperfumes_page_type'] ?? '');
    update_post_meta($post_id, '_sasanperfumes_page_type', $type);
    if ($type) update_option("sasanperfumes_page_id_{$type}", $post_id);
    if (!$type) return;

    // Save page content fields
    $configs = sasanperfumes_pf_configs();
    if (isset($configs[$type])) {
        foreach ($configs[$type]['bi'] ?? [] as $key => $fc) {
            sasanperfumes_pf_save_bi($post_id, $key, $fc['type'] ?? 'text');
        }
        foreach ($configs[$type]['images'] ?? [] as $image_cfg) {
            $meta_key = $image_cfg['meta_key'] ?? '';
            if ($meta_key) {
                update_post_meta($post_id, $meta_key, esc_url_raw($_POST[$meta_key] ?? ''));
            }
        }
        if (!empty($configs[$type]['has_image'])) {
            update_post_meta($post_id, $configs[$type]['has_image'], esc_url_raw($_POST[$configs[$type]['has_image']] ?? ''));
        }
        foreach ($configs[$type]['repeaters'] ?? [] as $meta_key => $rep) {
            sasanperfumes_f_save_repeater($post_id, $meta_key, $rep['fields']);
        }
    }

    // Save home sections
    if ($type === 'home') {
        foreach (sasanperfumes_pf_home_sections() as $key => $sec) {
            $prefix = $sec['prefix'] ?? "_sasanperfumes_{$key}";
            sasanperfumes_f_save_check($post_id, "{$prefix}_enabled");
            foreach ($sec['bi'] ?? [] as $fk => $fc) {
                sasanperfumes_f_save_bi($post_id, $prefix, $fk, $fc['type'] ?? 'text');
            }
            if (!empty($sec['has_image'])) {
                update_post_meta($post_id, $sec['has_image'], esc_url_raw($_POST[$sec['has_image']] ?? ''));
            }
            if (!empty($sec['repeater'])) {
                sasanperfumes_f_save_repeater($post_id, $sec['repeater']['key'], $sec['repeater']['fields']);
            }
        }
    }
}

/* ================================================================
   REST API
   ================================================================ */

function sasanperfumes_pf_rest_init() {
    sasanperfumes_register_rest_route( '/pages/(?P<slug>[a-z0-9-]+)', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_pf_rest_page', 'permission_callback' => '__return_true',
        'args' => ['slug' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    sasanperfumes_register_rest_route( '/home-sections', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_pf_rest_home_sections', 'permission_callback' => '__return_true',
    ]);
}

/** REST: GET /sasanperfumes/v1/pages/{slug} */
function sasanperfumes_pf_rest_page($request) {
    $slug = $request['slug'];

    // Map URL slugs to page types
    $slug_map = [
        'about' => 'about', 'contact' => 'contact', 'faq' => 'faq',
        'privacy' => 'privacy', 'terms' => 'terms', 'terms-and-conditions' => 'terms',
        'shipping' => 'shipping', 'returns' => 'returns', 'shop' => 'shop',
    ];
    $type = $slug_map[$slug] ?? $slug;
    $configs = sasanperfumes_pf_configs();
    if (!isset($configs[$type])) {
        // Fallthrough to static-pages system if this slug is defined there
        if (function_exists('sasanperfumes_sp_get_page')) {
            return sasanperfumes_sp_get_page($request);
        }
        return new WP_REST_Response(['error' => 'Page not found'], 404);
    }

    $page_id = sasanperfumes_pf_find_page($type);
    if (!$page_id) {
        if (function_exists('sasanperfumes_sp_get_page')) {
            return sasanperfumes_sp_get_page($request);
        }
        return new WP_REST_Response(['error' => 'Page not configured'], 404);
    }

    $cfg = $configs[$type];
    $data = [];

    // Bilingual fields
    foreach ($cfg['bi'] ?? [] as $key => $fc) {
        $data[$key] = sasanperfumes_pf_api_bi($page_id, $key);
    }

    foreach ($cfg['images'] ?? [] as $api_key => $image_cfg) {
        $meta_key = $image_cfg['meta_key'] ?? '';
        if ($meta_key) {
            $data[$api_key] = get_post_meta($page_id, $meta_key, true) ?: '';
        }
    }

    if (!empty($cfg['has_image'])) {
        $data['heroImage'] = get_post_meta($page_id, $cfg['has_image'], true) ?: '';
    }

    // Repeaters
    foreach ($cfg['repeaters'] ?? [] as $meta_key => $rep) {
        // Build mapping: auto-detect _en/_ar pairs
        $mapping = [];
        $processed = [];
        foreach ($rep['fields'] as $fk => $fc) {
            if (in_array($fk, $processed)) continue;
            $base = preg_replace('/_en$/', '', $fk);
            if (isset($rep['fields'][$base.'_en']) && isset($rep['fields'][$base.'_ar'])) {
                $mapping[$base] = [$base.'_en', $base.'_ar'];
                $processed[] = $base.'_en';
                $processed[] = $base.'_ar';
            } else {
                $mapping[$fk] = $fk;
                $processed[] = $fk;
            }
        }
        // Use repeater key without _sasanperfumes_ prefix for API
        $api_key = preg_replace('/^_sasanperfumes_/', '', $meta_key);
        $data[$api_key] = sasanperfumes_f_api_rep($page_id, $meta_key, $mapping);
    }

    // Add field name aliases for frontend compatibility
    if ($type === 'about') {
        if (isset($data['main_p1'])) $data['main_paragraph1'] = $data['main_p1'];
        if (isset($data['main_p2'])) $data['main_paragraph2'] = $data['main_p2'];
        if (isset($data['main_p3'])) $data['main_paragraph3'] = $data['main_p3'];
        if (isset($data['ingredients_desc'])) $data['ingredients_description'] = $data['ingredients_desc'];
        if (isset($data['about_faq'])) $data['faq_items'] = $data['about_faq'];
    }

    return new WP_REST_Response($data, 200);
}

/** REST: GET /sasanperfumes/v1/home-sections */
function sasanperfumes_pf_rest_home_sections() {
    $page_id = sasanperfumes_pf_find_page('home');
    if (!$page_id) {
        // Fallback: return empty structure
        return new WP_REST_Response([
            'whyChooseUs' => ['enabled'=>true,'eyebrow'=>['en'=>'','ar'=>''],'title'=>['en'=>'','ar'=>''],'subtitle'=>['en'=>'','ar'=>''],'items'=>[]],
            'ourStory' => ['enabled'=>true,'eyebrow'=>['en'=>'','ar'=>''],'title'=>['en'=>'','ar'=>''],'description1'=>['en'=>'','ar'=>''],'description2'=>['en'=>'','ar'=>''],'image'=>'','stats'=>[]],
            'faq' => ['enabled'=>true,'eyebrow'=>['en'=>'','ar'=>''],'title'=>['en'=>'','ar'=>''],'subtitle'=>['en'=>'','ar'=>''],'items'=>[]],
            'seoContent' => ['enabled'=>true,'title'=>['en'=>'','ar'=>''],'paragraphs'=>[['en'=>'','ar'=>''],['en'=>'','ar'=>'']]],
        ], 200);
    }

    $bi = fn($prefix, $key, $d_en='', $d_ar='') => sasanperfumes_f_api_bi($page_id, $prefix, $key, $d_en, $d_ar);
    $enabled = function($prefix) use ($page_id) {
        $raw = get_post_meta($page_id, "{$prefix}_enabled", true);
        return $raw === '' ? true : (bool) $raw;
    };

    return new WP_REST_Response([
        'whyChooseUs' => [
            'enabled' => $enabled('_sasanperfumes_wcus'),
            'eyebrow' => $bi('_sasanperfumes_wcus','eyebrow'),
            'title' => $bi('_sasanperfumes_wcus','title'),
            'subtitle' => $bi('_sasanperfumes_wcus','subtitle'),
            'items' => sasanperfumes_f_api_rep($page_id, '_sasanperfumes_wcus_items', [
                'title'=>['title_en','title_ar'], 'description'=>['desc_en','desc_ar'],
            ]),
        ],
        'ourStory' => [
            'enabled' => $enabled('_sasanperfumes_story'),
            'eyebrow' => $bi('_sasanperfumes_story','eyebrow'),
            'title' => $bi('_sasanperfumes_story','title'),
            'description1' => $bi('_sasanperfumes_story','desc1'),
            'description2' => $bi('_sasanperfumes_story','desc2'),
            'image' => get_post_meta($page_id, '_sasanperfumes_story_image', true) ?: '',
            'stats' => sasanperfumes_f_api_rep($page_id, '_sasanperfumes_story_stats', [
                'value'=>'value', 'label'=>['label_en','label_ar'],
            ]),
        ],
        'faq' => [
            'enabled' => $enabled('_sasanperfumes_hfaq'),
            'eyebrow' => $bi('_sasanperfumes_hfaq','eyebrow'),
            'title' => $bi('_sasanperfumes_hfaq','title'),
            'subtitle' => $bi('_sasanperfumes_hfaq','subtitle'),
            'items' => sasanperfumes_f_api_rep($page_id, '_sasanperfumes_hfaq_items', [
                'question'=>['q_en','q_ar'], 'answer'=>['a_en','a_ar'],
            ]),
        ],
        'seoContent' => [
            'enabled' => $enabled('_sasanperfumes_seo'),
            'title' => $bi('_sasanperfumes_seo','title'),
            'paragraphs' => [$bi('_sasanperfumes_seo','para1'), $bi('_sasanperfumes_seo','para2')],
        ],
    ], 200);
}

/* ================================================================
   INIT
   ================================================================ */

function sasanperfumes_pf_init() {
    add_action('add_meta_boxes', 'sasanperfumes_pf_add_metaboxes');
    add_action('save_post_page', 'sasanperfumes_pf_save', 10, 2);
    add_action('rest_api_init', 'sasanperfumes_pf_rest_init');
}
sasanperfumes_pf_init();
