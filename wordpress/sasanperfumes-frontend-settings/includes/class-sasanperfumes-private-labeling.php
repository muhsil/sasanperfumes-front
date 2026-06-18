<?php
/**
 * ShapeHive Private Labeling Module
 *
 * Landing page settings + enquiry form submissions CPT.
 * Admin: sasanperfumes → Private Labeling (page content)
 *        sasanperfumes → PL Submissions (form entries)
 * REST:  GET  /sasanperfumes/v1/private-labeling      (page content)
 *        POST /sasanperfumes/v1/private-labeling/submit (form submission)
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.9.0
 */

if (!defined('ABSPATH')) exit;

// ── Helpers ────────────────────────────────────────────────────────
function sasanperfumes_pl_opt($k, $d = '') { return get_option("sasanperfumes_pl_{$k}", $d); }

// ── Admin menu ─────────────────────────────────────────────────────
add_action('admin_menu', function () {
    add_submenu_page(
        'sasanperfumes-settings',
        'Private Labeling',
        'Private Labeling',
        'manage_options',
        'sasanperfumes-private-labeling',
        'sasanperfumes_pl_render'
    );
}, 30);

// ── Admin render ───────────────────────────────────────────────────
function sasanperfumes_pl_render() {
    if (!current_user_can('manage_options')) return;

    // ── Save ──
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('sasanperfumes_pl_save')) {
        $text = function ($k) { return sanitize_text_field($_POST[$k] ?? ''); };
        $ta   = function ($k) { return sanitize_textarea_field($_POST[$k] ?? ''); };
        $url  = function ($k) { return esc_url_raw($_POST[$k] ?? ''); };

        // Hero
        update_option('sasanperfumes_pl_hero_title_en', $text('sasanperfumes_pl_hero_title_en'));
        update_option('sasanperfumes_pl_hero_title_ar', $text('sasanperfumes_pl_hero_title_ar'));
        update_option('sasanperfumes_pl_hero_subtitle_en', $ta('sasanperfumes_pl_hero_subtitle_en'));
        update_option('sasanperfumes_pl_hero_subtitle_ar', $ta('sasanperfumes_pl_hero_subtitle_ar'));
        update_option('sasanperfumes_pl_hero_description_en', $ta('sasanperfumes_pl_hero_description_en'));
        update_option('sasanperfumes_pl_hero_description_ar', $ta('sasanperfumes_pl_hero_description_ar'));
        update_option('sasanperfumes_pl_hero_image', $url('sasanperfumes_pl_hero_image'));
        update_option('sasanperfumes_pl_hero_cta_text_en', $text('sasanperfumes_pl_hero_cta_text_en'));
        update_option('sasanperfumes_pl_hero_cta_text_ar', $text('sasanperfumes_pl_hero_cta_text_ar'));
        $cta_link = sanitize_text_field($_POST['sasanperfumes_pl_hero_cta_link'] ?? '');
        update_option('sasanperfumes_pl_hero_cta_link', str_starts_with($cta_link, '#') ? $cta_link : esc_url_raw($cta_link));

        // Intro
        update_option('sasanperfumes_pl_intro_heading_en', $text('sasanperfumes_pl_intro_heading_en'));
        update_option('sasanperfumes_pl_intro_heading_ar', $text('sasanperfumes_pl_intro_heading_ar'));
        update_option('sasanperfumes_pl_intro_description_en', $ta('sasanperfumes_pl_intro_description_en'));
        update_option('sasanperfumes_pl_intro_description_ar', $ta('sasanperfumes_pl_intro_description_ar'));
        update_option('sasanperfumes_pl_intro_image', $url('sasanperfumes_pl_intro_image'));

        // What Is
        update_option('sasanperfumes_pl_whatis_title_en', $text('sasanperfumes_pl_whatis_title_en'));
        update_option('sasanperfumes_pl_whatis_title_ar', $text('sasanperfumes_pl_whatis_title_ar'));
        update_option('sasanperfumes_pl_whatis_description_en', $ta('sasanperfumes_pl_whatis_description_en'));
        update_option('sasanperfumes_pl_whatis_description_ar', $ta('sasanperfumes_pl_whatis_description_ar'));
        update_option('sasanperfumes_pl_whatis_image', $url('sasanperfumes_pl_whatis_image'));

        // Section titles
        foreach (array('why_title', 'process_title', 'products_title', 'benefits_title') as $key) {
            update_option("sasanperfumes_pl_{$key}_en", $text("sasanperfumes_pl_{$key}_en"));
            update_option("sasanperfumes_pl_{$key}_ar", $text("sasanperfumes_pl_{$key}_ar"));
        }

        // CTA
        update_option('sasanperfumes_pl_cta_title_en', $text('sasanperfumes_pl_cta_title_en'));
        update_option('sasanperfumes_pl_cta_title_ar', $text('sasanperfumes_pl_cta_title_ar'));
        update_option('sasanperfumes_pl_cta_description_en', $ta('sasanperfumes_pl_cta_description_en'));
        update_option('sasanperfumes_pl_cta_description_ar', $ta('sasanperfumes_pl_cta_description_ar'));
        update_option('sasanperfumes_pl_cta_button_en', $text('sasanperfumes_pl_cta_button_en'));
        update_option('sasanperfumes_pl_cta_button_ar', $text('sasanperfumes_pl_cta_button_ar'));
        $cta2_link = sanitize_text_field($_POST['sasanperfumes_pl_cta_link'] ?? '');
        update_option('sasanperfumes_pl_cta_link', str_starts_with($cta2_link, '#') ? $cta2_link : esc_url_raw($cta2_link));

        // SEO
        update_option('sasanperfumes_pl_seo_title_en', $text('sasanperfumes_pl_seo_title_en'));
        update_option('sasanperfumes_pl_seo_title_ar', $text('sasanperfumes_pl_seo_title_ar'));
        update_option('sasanperfumes_pl_seo_desc_en', $ta('sasanperfumes_pl_seo_desc_en'));
        update_option('sasanperfumes_pl_seo_desc_ar', $ta('sasanperfumes_pl_seo_desc_ar'));

        // Form notification email
        update_option('sasanperfumes_pl_form_email', $text('sasanperfumes_pl_form_email'));
        foreach (array(
            'form_title',
            'form_description',
            'form_full_name_label',
            'form_email_label',
            'form_phone_label',
            'form_service_label',
            'form_message_label',
            'form_submit_label',
            'form_sending_label',
            'form_success_title',
            'form_success_message',
            'form_select_service_label',
            'form_consent_label',
            'form_error_message',
            'form_network_error_message',
            'form_services',
        ) as $key) {
            update_option("sasanperfumes_pl_{$key}_en", $ta("sasanperfumes_pl_{$key}_en"));
            update_option("sasanperfumes_pl_{$key}_ar", $ta("sasanperfumes_pl_{$key}_ar"));
        }

        // Repeaters: Why Choose
        $why = [];
        if (!empty($_POST['sasanperfumes_pl_why']) && is_array($_POST['sasanperfumes_pl_why'])) {
            foreach ($_POST['sasanperfumes_pl_why'] as $item) {
                $why[] = [
                    'image'   => esc_url_raw($item['image'] ?? ''),
                    'title_en'=> sanitize_text_field($item['title_en'] ?? ''),
                    'title_ar'=> sanitize_text_field($item['title_ar'] ?? ''),
                    'desc_en' => sanitize_textarea_field($item['desc_en'] ?? ''),
                    'desc_ar' => sanitize_textarea_field($item['desc_ar'] ?? ''),
                ];
            }
        }
        update_option('sasanperfumes_pl_why', $why);

        // Repeaters: Process
        $process = [];
        if (!empty($_POST['sasanperfumes_pl_process']) && is_array($_POST['sasanperfumes_pl_process'])) {
            foreach ($_POST['sasanperfumes_pl_process'] as $item) {
                $process[] = [
                    'image'   => esc_url_raw($item['image'] ?? ''),
                    'title_en'=> sanitize_text_field($item['title_en'] ?? ''),
                    'title_ar'=> sanitize_text_field($item['title_ar'] ?? ''),
                    'desc_en' => sanitize_textarea_field($item['desc_en'] ?? ''),
                    'desc_ar' => sanitize_textarea_field($item['desc_ar'] ?? ''),
                ];
            }
        }
        update_option('sasanperfumes_pl_process', $process);

        // Repeaters: Products/Service Options
        $products = [];
        if (!empty($_POST['sasanperfumes_pl_products']) && is_array($_POST['sasanperfumes_pl_products'])) {
            foreach ($_POST['sasanperfumes_pl_products'] as $item) {
                $products[] = [
                    'image'   => esc_url_raw($item['image'] ?? ''),
                    'title_en'=> sanitize_text_field($item['title_en'] ?? ''),
                    'title_ar'=> sanitize_text_field($item['title_ar'] ?? ''),
                    'desc_en' => sanitize_textarea_field($item['desc_en'] ?? ''),
                    'desc_ar' => sanitize_textarea_field($item['desc_ar'] ?? ''),
                ];
            }
        }
        update_option('sasanperfumes_pl_products', $products);

        // Repeaters: Benefits
        $benefits = [];
        if (!empty($_POST['sasanperfumes_pl_benefits']) && is_array($_POST['sasanperfumes_pl_benefits'])) {
            foreach ($_POST['sasanperfumes_pl_benefits'] as $item) {
                $benefits[] = [
                    'image'   => esc_url_raw($item['image'] ?? ''),
                    'title_en'=> sanitize_text_field($item['title_en'] ?? ''),
                    'title_ar'=> sanitize_text_field($item['title_ar'] ?? ''),
                    'desc_en' => sanitize_textarea_field($item['desc_en'] ?? ''),
                    'desc_ar' => sanitize_textarea_field($item['desc_ar'] ?? ''),
                ];
            }
        }
        update_option('sasanperfumes_pl_benefits', $benefits);

        echo '<div class="notice notice-success"><p>Settings saved.</p></div>';
    }

    // ── Render form ──
    ?>
    <div class="wrap">
        <h1>Private Labeling Page</h1>
        <form method="post"><?php wp_nonce_field('sasanperfumes_pl_save'); ?>
        <h2>Hero Section</h2>
        <table class="form-table">
            <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_pl_hero_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('hero_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_pl_hero_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('hero_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Subtitle (EN)</th><td><textarea name="sasanperfumes_pl_hero_subtitle_en" rows="2" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('hero_subtitle_en')); ?></textarea></td></tr>
            <tr><th>Subtitle (AR)</th><td><textarea name="sasanperfumes_pl_hero_subtitle_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('hero_subtitle_ar')); ?></textarea></td></tr>
            <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_pl_hero_description_en" rows="3" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('hero_description_en')); ?></textarea></td></tr>
            <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_pl_hero_description_ar" rows="3" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('hero_description_ar')); ?></textarea></td></tr>
            <tr><th>Hero Image</th><td><?php sasanperfumes_image_field('sasanperfumes_pl_hero_image', sasanperfumes_pl_opt('hero_image')); ?></td></tr>
            <tr><th>CTA Button Text (EN)</th><td><input type="text" name="sasanperfumes_pl_hero_cta_text_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('hero_cta_text_en')); ?>" class="regular-text"></td></tr>
            <tr><th>CTA Button Text (AR)</th><td><input type="text" name="sasanperfumes_pl_hero_cta_text_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('hero_cta_text_ar')); ?>" class="regular-text" dir="rtl"></td></tr>
            <tr><th>CTA Link</th><td><input type="text" name="sasanperfumes_pl_hero_cta_link" value="<?php echo esc_attr(sasanperfumes_pl_opt('hero_cta_link')); ?>" class="regular-text" placeholder="#enquiry-form"></td></tr>
        </table>

        <h2>Intro Section</h2>
        <table class="form-table">
            <tr><th>Heading (EN)</th><td><input type="text" name="sasanperfumes_pl_intro_heading_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('intro_heading_en')); ?>" class="large-text"></td></tr>
            <tr><th>Heading (AR)</th><td><input type="text" name="sasanperfumes_pl_intro_heading_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('intro_heading_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_pl_intro_description_en" rows="4" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('intro_description_en')); ?></textarea></td></tr>
            <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_pl_intro_description_ar" rows="4" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('intro_description_ar')); ?></textarea></td></tr>
            <tr><th>Image</th><td><?php sasanperfumes_image_field('sasanperfumes_pl_intro_image', sasanperfumes_pl_opt('intro_image')); ?></td></tr>
        </table>

        <h2>What Is Private Labeling?</h2>
        <table class="form-table">
            <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_pl_whatis_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('whatis_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_pl_whatis_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('whatis_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_pl_whatis_description_en" rows="4" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('whatis_description_en')); ?></textarea></td></tr>
            <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_pl_whatis_description_ar" rows="4" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('whatis_description_ar')); ?></textarea></td></tr>
            <tr><th>Image</th><td><?php sasanperfumes_image_field('sasanperfumes_pl_whatis_image', sasanperfumes_pl_opt('whatis_image')); ?></td></tr>
        </table>

        <h2>Section Titles</h2>
        <table class="form-table">
            <tr><th>Why Choose Title (EN)</th><td><input type="text" name="sasanperfumes_pl_why_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('why_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Why Choose Title (AR)</th><td><input type="text" name="sasanperfumes_pl_why_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('why_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Process Title (EN)</th><td><input type="text" name="sasanperfumes_pl_process_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('process_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Process Title (AR)</th><td><input type="text" name="sasanperfumes_pl_process_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('process_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Products Title (EN)</th><td><input type="text" name="sasanperfumes_pl_products_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('products_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Products Title (AR)</th><td><input type="text" name="sasanperfumes_pl_products_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('products_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Benefits Title (EN)</th><td><input type="text" name="sasanperfumes_pl_benefits_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('benefits_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Benefits Title (AR)</th><td><input type="text" name="sasanperfumes_pl_benefits_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('benefits_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
        </table>

        <?php sasanperfumes_pl_repeater_ui('sasanperfumes_pl_why', 'Why Choose Us', get_option('sasanperfumes_pl_why', [])); ?>
        <?php sasanperfumes_pl_repeater_ui('sasanperfumes_pl_process', 'Our Process', get_option('sasanperfumes_pl_process', [])); ?>
        <?php sasanperfumes_pl_repeater_ui('sasanperfumes_pl_products', 'Product / Service Options', get_option('sasanperfumes_pl_products', [])); ?>
        <?php sasanperfumes_pl_repeater_ui('sasanperfumes_pl_benefits', 'Benefits', get_option('sasanperfumes_pl_benefits', [])); ?>

        <h2>CTA Section</h2>
        <table class="form-table">
            <tr><th>Title (EN)</th><td><input type="text" name="sasanperfumes_pl_cta_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('cta_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Title (AR)</th><td><input type="text" name="sasanperfumes_pl_cta_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('cta_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Description (EN)</th><td><textarea name="sasanperfumes_pl_cta_description_en" rows="3" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('cta_description_en')); ?></textarea></td></tr>
            <tr><th>Description (AR)</th><td><textarea name="sasanperfumes_pl_cta_description_ar" rows="3" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('cta_description_ar')); ?></textarea></td></tr>
            <tr><th>Button Text (EN)</th><td><input type="text" name="sasanperfumes_pl_cta_button_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('cta_button_en')); ?>" class="regular-text"></td></tr>
            <tr><th>Button Text (AR)</th><td><input type="text" name="sasanperfumes_pl_cta_button_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('cta_button_ar')); ?>" class="regular-text" dir="rtl"></td></tr>
            <tr><th>Button Link</th><td><input type="text" name="sasanperfumes_pl_cta_link" value="<?php echo esc_attr(sasanperfumes_pl_opt('cta_link')); ?>" class="regular-text" placeholder="#enquiry-form"></td></tr>
        </table>

        <h2>SEO</h2>
        <table class="form-table">
            <tr><th>SEO Title (EN)</th><td><input type="text" name="sasanperfumes_pl_seo_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('seo_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>SEO Title (AR)</th><td><input type="text" name="sasanperfumes_pl_seo_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('seo_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>SEO Description (EN)</th><td><textarea name="sasanperfumes_pl_seo_desc_en" rows="2" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('seo_desc_en')); ?></textarea></td></tr>
            <tr><th>SEO Description (AR)</th><td><textarea name="sasanperfumes_pl_seo_desc_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('seo_desc_ar')); ?></textarea></td></tr>
        </table>

        <h2>Form Settings</h2>
        <table class="form-table">
            <tr><th>Notification Email</th><td><input type="email" name="sasanperfumes_pl_form_email" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_email', get_option('admin_email'))); ?>" class="regular-text"><p class="description">Receives enquiry notifications. Leave blank for default admin email.</p></td></tr>
            <tr><th>Form Title (EN)</th><td><input type="text" name="sasanperfumes_pl_form_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Form Title (AR)</th><td><input type="text" name="sasanperfumes_pl_form_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Form Description (EN)</th><td><textarea name="sasanperfumes_pl_form_description_en" rows="2" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('form_description_en')); ?></textarea></td></tr>
            <tr><th>Form Description (AR)</th><td><textarea name="sasanperfumes_pl_form_description_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('form_description_ar')); ?></textarea></td></tr>
            <tr><th>Full Name Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_full_name_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_full_name_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Full Name Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_full_name_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_full_name_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Email Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_email_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_email_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Email Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_email_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_email_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Phone Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_phone_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_phone_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Phone Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_phone_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_phone_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Service Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_service_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_service_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Service Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_service_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_service_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Message Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_message_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_message_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Message Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_message_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_message_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Submit Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_submit_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_submit_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Submit Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_submit_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_submit_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Sending Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_sending_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_sending_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Sending Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_sending_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_sending_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Success Title (EN)</th><td><input type="text" name="sasanperfumes_pl_form_success_title_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_success_title_en')); ?>" class="large-text"></td></tr>
            <tr><th>Success Title (AR)</th><td><input type="text" name="sasanperfumes_pl_form_success_title_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_success_title_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Success Message (EN)</th><td><textarea name="sasanperfumes_pl_form_success_message_en" rows="2" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('form_success_message_en')); ?></textarea></td></tr>
            <tr><th>Success Message (AR)</th><td><textarea name="sasanperfumes_pl_form_success_message_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('form_success_message_ar')); ?></textarea></td></tr>
            <tr><th>Select Service Label (EN)</th><td><input type="text" name="sasanperfumes_pl_form_select_service_label_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_select_service_label_en')); ?>" class="large-text"></td></tr>
            <tr><th>Select Service Label (AR)</th><td><input type="text" name="sasanperfumes_pl_form_select_service_label_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_select_service_label_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Consent Label (EN)</th><td><textarea name="sasanperfumes_pl_form_consent_label_en" rows="2" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('form_consent_label_en')); ?></textarea></td></tr>
            <tr><th>Consent Label (AR)</th><td><textarea name="sasanperfumes_pl_form_consent_label_ar" rows="2" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('form_consent_label_ar')); ?></textarea></td></tr>
            <tr><th>Error Message (EN)</th><td><input type="text" name="sasanperfumes_pl_form_error_message_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_error_message_en')); ?>" class="large-text"></td></tr>
            <tr><th>Error Message (AR)</th><td><input type="text" name="sasanperfumes_pl_form_error_message_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_error_message_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Network Error Message (EN)</th><td><input type="text" name="sasanperfumes_pl_form_network_error_message_en" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_network_error_message_en')); ?>" class="large-text"></td></tr>
            <tr><th>Network Error Message (AR)</th><td><input type="text" name="sasanperfumes_pl_form_network_error_message_ar" value="<?php echo esc_attr(sasanperfumes_pl_opt('form_network_error_message_ar')); ?>" class="large-text" dir="rtl"></td></tr>
            <tr><th>Service Options (EN)</th><td><textarea name="sasanperfumes_pl_form_services_en" rows="5" class="large-text"><?php echo esc_textarea(sasanperfumes_pl_opt('form_services_en')); ?></textarea><p class="description">One option per line.</p></td></tr>
            <tr><th>Service Options (AR)</th><td><textarea name="sasanperfumes_pl_form_services_ar" rows="5" class="large-text" dir="rtl"><?php echo esc_textarea(sasanperfumes_pl_opt('form_services_ar')); ?></textarea><p class="description">One option per line.</p></td></tr>
        </table>

        <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

// ── Repeater UI helper ─────────────────────────────────────────────
function sasanperfumes_pl_repeater_ui($id, $label, $items) {
    if (!is_array($items)) $items = [];
    $safe_id = esc_attr($id);
    echo "<h2>{$label} <button type=\"button\" class=\"button\" onclick=\"sasanperfumesPLAdd('{$safe_id}')\">+ Add</button></h2>";
    echo "<div id=\"{$safe_id}\">";
    foreach ($items as $i => $item) {
        sasanperfumes_pl_repeater_item_html($safe_id, $i, $item);
    }
    echo '</div>';
    echo "<script>if(typeof window.sasanperfumesPLCounters==='undefined')window.sasanperfumesPLCounters={};window.sasanperfumesPLCounters['{$safe_id}']=" . count($items) . ";</script>";
}

function sasanperfumes_pl_repeater_item_html($id, $i, $item) {
    $v = function ($k) use ($item) { return esc_attr($item[$k] ?? ''); };
    $t = function ($k) use ($item) { return esc_textarea($item[$k] ?? ''); };
    echo '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin:10px 0;border:1px solid #ddd;">';
    echo '<button type="button" class="button" style="float:right;color:red;" onclick="this.parentElement.remove()">Remove</button>';
    echo '<p><label>Image</label><br>';
    sasanperfumes_image_field("{$id}[{$i}][image]", $item['image'] ?? '');
    echo '</p>';
    echo '<p><label>Title (EN)</label><br><input type="text" name="' . $id . '[' . $i . '][title_en]" value="' . $v('title_en') . '" class="regular-text"></p>';
    echo '<p><label>Title (AR)</label><br><input type="text" name="' . $id . '[' . $i . '][title_ar]" value="' . $v('title_ar') . '" class="regular-text" dir="rtl"></p>';
    echo '<p><label>Description (EN)</label><br><textarea name="' . $id . '[' . $i . '][desc_en]" rows="2" class="large-text">' . $t('desc_en') . '</textarea></p>';
    echo '<p><label>Description (AR)</label><br><textarea name="' . $id . '[' . $i . '][desc_ar]" rows="2" class="large-text" dir="rtl">' . $t('desc_ar') . '</textarea></p>';
    echo '</div>';
}

// ── JS for adding repeater items ───────────────────────────────────
add_action('admin_footer', function () {
    $screen = get_current_screen();
    if (!$screen || strpos($screen->id, 'sasanperfumes-private-labeling') === false) return;
    ?>
    <script>
    function sasanperfumesPLAdd(id) {
        if (!window.sasanperfumesPLCounters) window.sasanperfumesPLCounters = {};
        var i = window.sasanperfumesPLCounters[id] || 0;
        window.sasanperfumesPLCounters[id] = i + 1;
        var c = document.getElementById(id);
        var inputId = id.replace(/[\[\]]/g, '_') + '_' + i + '_image';
        var previewId = inputId + '_preview';
        var html = '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin:10px 0;border:1px solid #ddd;">' +
            '<button type="button" class="button" style="float:right;color:red;" onclick="this.parentElement.remove()">Remove</button>' +
            '<p><label>Image</label><br><div class="sasanperfumes-image-field"><input type="hidden" name="' + id + '[' + i + '][image]" id="' + inputId + '" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + inputId + '" data-preview="#' + previewId + '">Upload Image</button> ' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + inputId + '" data-preview="#' + previewId + '" style="display:none;">Remove</button>' +
            '<div id="' + previewId + '" class="sasanperfumes-preview"></div></div></p>' +
            '<p><label>Title (EN)</label><br><input type="text" name="' + id + '[' + i + '][title_en]" class="regular-text"></p>' +
            '<p><label>Title (AR)</label><br><input type="text" name="' + id + '[' + i + '][title_ar]" class="regular-text" dir="rtl"></p>' +
            '<p><label>Description (EN)</label><br><textarea name="' + id + '[' + i + '][desc_en]" rows="2" class="large-text"></textarea></p>' +
            '<p><label>Description (AR)</label><br><textarea name="' + id + '[' + i + '][desc_ar]" rows="2" class="large-text" dir="rtl"></textarea></p>' +
            '</div>';
        c.insertAdjacentHTML('beforeend', html);
    }
    </script>
    <?php
});

// ══════════════════════════════════════════════════════════════════
// SUBMISSIONS CPT
// ══════════════════════════════════════════════════════════════════

add_action('init', function () {
    register_post_type('sasanperfumes_pl_inquiry', [
        'labels' => [
            'name'               => 'PL Submissions',
            'singular_name'      => 'PL Submission',
            'all_items'          => 'PL Submissions',
            'search_items'       => 'Search Submissions',
            'not_found'          => 'No submissions found',
        ],
        'public'             => false,
        'show_ui'            => true,
        'show_in_menu'       => 'sasanperfumes-settings',
        'supports'           => ['title'],
        'has_archive'        => false,
        'rewrite'            => false,
        'capability_type'    => 'post',
    ]);

    register_post_status('sasanperfumes_new', [
        'label'                     => 'New',
        'public'                    => false,
        'internal'                  => true,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop('New <span class="count">(%s)</span>', 'New <span class="count">(%s)</span>'),
    ]);
    register_post_status('sasanperfumes_contacted', [
        'label'                     => 'Contacted',
        'public'                    => false,
        'internal'                  => true,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop('Contacted <span class="count">(%s)</span>', 'Contacted <span class="count">(%s)</span>'),
    ]);
    register_post_status('sasanperfumes_in_progress', [
        'label'                     => 'In Progress',
        'public'                    => false,
        'internal'                  => true,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop('In Progress <span class="count">(%s)</span>', 'In Progress <span class="count">(%s)</span>'),
    ]);
    register_post_status('sasanperfumes_closed', [
        'label'                     => 'Closed',
        'public'                    => false,
        'internal'                  => true,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop('Closed <span class="count">(%s)</span>', 'Closed <span class="count">(%s)</span>'),
    ]);
});

// Submission detail metabox
add_action('add_meta_boxes', function () {
    add_meta_box('sasanperfumes_pl_inquiry_details', 'Submission Details', 'sasanperfumes_pl_inquiry_render', 'sasanperfumes_pl_inquiry', 'normal', 'high');
    add_meta_box('sasanperfumes_pl_inquiry_status', 'Status', 'sasanperfumes_pl_inquiry_status_render', 'sasanperfumes_pl_inquiry', 'side', 'high');
});

function sasanperfumes_pl_inquiry_render($post) {
    $m = function ($k) use ($post) { return get_post_meta($post->ID, $k, true); };
    $fields = [
        '_pl_full_name'    => 'Full Name',
        '_pl_email'        => 'Email',
        '_pl_phone'        => 'Phone',
        '_pl_service'      => 'Service Interest',
        '_pl_message'      => 'Message',
        '_pl_submitted_at' => 'Submitted At',
    ];
    echo '<table class="form-table">';
    foreach ($fields as $key => $label) {
        $val = esc_html($m($key));
        echo "<tr><th>{$label}</th><td>" . ($key === '_pl_message' ? nl2br($val) : $val) . "</td></tr>";
    }
    echo '</table>';
}

function sasanperfumes_pl_inquiry_status_render($post) {
    wp_nonce_field('sasanperfumes_pl_inquiry_status', 'sasanperfumes_pl_status_nonce');
    $status = $post->post_status;
    $statuses = [
        'sasanperfumes_new'         => 'New',
        'sasanperfumes_contacted'   => 'Contacted',
        'sasanperfumes_in_progress' => 'In Progress',
        'sasanperfumes_closed'      => 'Closed',
    ];
    echo '<select name="sasanperfumes_pl_status" style="width:100%">';
    foreach ($statuses as $k => $v) {
        $sel = selected($status, $k, false);
        echo "<option value=\"{$k}\" {$sel}>{$v}</option>";
    }
    echo '</select>';
}

add_action('save_post_sasanperfumes_pl_inquiry', function ($post_id) {
    if (!isset($_POST['sasanperfumes_pl_status_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_pl_status_nonce'], 'sasanperfumes_pl_inquiry_status')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!empty($_POST['sasanperfumes_pl_status'])) {
        $allowed = ['sasanperfumes_new','sasanperfumes_contacted','sasanperfumes_in_progress','sasanperfumes_closed'];
        $status = sanitize_text_field($_POST['sasanperfumes_pl_status']);
        if (in_array($status, $allowed, true)) {
            remove_action('save_post_sasanperfumes_pl_inquiry', __FUNCTION__);
            wp_update_post(['ID' => $post_id, 'post_status' => $status]);
        }
    }
});

// Custom columns for submissions list
add_filter('manage_sasanperfumes_pl_inquiry_posts_columns', function ($cols) {
    return [
        'cb'          => '<input type="checkbox">',
        'title'       => 'Name',
        'pl_email'    => 'Email',
        'pl_service'  => 'Service',
        'pl_status'   => 'Status',
        'date'        => 'Date',
    ];
});

add_action('manage_sasanperfumes_pl_inquiry_posts_custom_column', function ($col, $id) {
    switch ($col) {
        case 'pl_email':
            echo esc_html(get_post_meta($id, '_pl_email', true));
            break;
        case 'pl_service':
            echo esc_html(get_post_meta($id, '_pl_service', true));
            break;
        case 'pl_status':
            $map = ['sasanperfumes_new'=>'🆕 New','sasanperfumes_contacted'=>'📞 Contacted','sasanperfumes_in_progress'=>'⏳ In Progress','sasanperfumes_closed'=>'✅ Closed'];
            $status = get_post_status($id);
            echo $map[$status] ?? ucfirst(str_replace('sasanperfumes_', '', $status));
            break;
    }
}, 10, 2);

// ══════════════════════════════════════════════════════════════════
// REST API
// ══════════════════════════════════════════════════════════════════

add_action('rest_api_init', function () {
    // Page content endpoint
    sasanperfumes_register_rest_route( '/private-labeling', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_pl_api_get',
        'permission_callback' => '__return_true',
    ]);

    // Form submission endpoint
    sasanperfumes_register_rest_route( '/private-labeling/submit', [
        'methods'             => 'POST',
        'callback'            => 'sasanperfumes_pl_api_submit',
        'permission_callback' => '__return_true',
    ]);
});

function sasanperfumes_pl_api_get() {
    $o = 'sasanperfumes_pl_opt';
    $bi = function ($prefix) use ($o) {
        return ['en' => $o("{$prefix}_en"), 'ar' => $o("{$prefix}_ar")];
    };
    $lines = function ($prefix) use ($o) {
        $value = $o($prefix);
        if (!is_string($value) || $value === '') return [];
        return array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $value))));
    };
    $repeater = function ($key) {
        $items = get_option("sasanperfumes_pl_{$key}", []);
        if (!is_array($items)) return [];
        return array_values(array_map(function ($item) {
            return [
                'image'   => $item['image'] ?? '',
                'title'   => ['en' => $item['title_en'] ?? '', 'ar' => $item['title_ar'] ?? ''],
                'description' => ['en' => $item['desc_en'] ?? '', 'ar' => $item['desc_ar'] ?? ''],
            ];
        }, $items));
    };

    return rest_ensure_response([
        'hero' => [
            'title'       => $bi('hero_title'),
            'subtitle'    => $bi('hero_subtitle'),
            'description' => $bi('hero_description'),
            'image'       => sasanperfumes_pl_opt('hero_image'),
            'ctaText'     => $bi('hero_cta_text'),
            'ctaLink'     => sasanperfumes_pl_opt('hero_cta_link'),
        ],
        'intro' => [
            'heading'     => $bi('intro_heading'),
            'description' => $bi('intro_description'),
            'image'       => sasanperfumes_pl_opt('intro_image'),
        ],
        'whatIs' => [
            'title'       => $bi('whatis_title'),
            'description' => $bi('whatis_description'),
            'image'       => sasanperfumes_pl_opt('whatis_image'),
        ],
        'sectionTitles' => [
            'whyChoose' => $bi('why_title'),
            'process'   => $bi('process_title'),
            'products'  => $bi('products_title'),
            'benefits'  => $bi('benefits_title'),
        ],
        'whyChoose'  => $repeater('why'),
        'process'    => $repeater('process'),
        'products'   => $repeater('products'),
        'benefits'   => $repeater('benefits'),
        'cta' => [
            'title'       => $bi('cta_title'),
            'description' => $bi('cta_description'),
            'buttonText'  => $bi('cta_button'),
            'buttonLink'  => sasanperfumes_pl_opt('cta_link'),
        ],
        'form' => [
            'title'              => $bi('form_title'),
            'description'        => $bi('form_description'),
            'fullNameLabel'      => $bi('form_full_name_label'),
            'emailLabel'         => $bi('form_email_label'),
            'phoneLabel'         => $bi('form_phone_label'),
            'serviceLabel'       => $bi('form_service_label'),
            'messageLabel'       => $bi('form_message_label'),
            'submitLabel'        => $bi('form_submit_label'),
            'sendingLabel'       => $bi('form_sending_label'),
            'successTitle'       => $bi('form_success_title'),
            'successMessage'     => $bi('form_success_message'),
            'selectServiceLabel' => $bi('form_select_service_label'),
            'consentLabel'       => $bi('form_consent_label'),
            'errorMessage'       => $bi('form_error_message'),
            'networkErrorMessage'=> $bi('form_network_error_message'),
            'services'           => [
                'en' => $lines('form_services_en'),
                'ar' => $lines('form_services_ar'),
            ],
        ],
        'seo' => [
            'title'       => $bi('seo_title'),
            'description' => $bi('seo_desc'),
        ],
    ]);
}

function sasanperfumes_pl_api_submit(WP_REST_Request $request) {
    $params = $request->get_json_params();
    $lang = (($params['locale'] ?? '') === 'ar') ? 'ar' : 'en';
    $form_message = function ($key) use ($lang) {
        return sasanperfumes_pl_opt("{$key}_{$lang}");
    };

    // Honeypot check
    if (!empty($params['website'])) {
        return rest_ensure_response(['success' => true, 'message' => $form_message('form_success_message')]);
    }

    // Validate required fields
    $required = ['fullName', 'email', 'phone', 'message'];
    foreach ($required as $f) {
        if (empty($params[$f])) {
            return new WP_REST_Response(['success' => false, 'message' => $form_message('form_error_message')], 400);
        }
    }
    if (!is_email($params['email'])) {
        return new WP_REST_Response(['success' => false, 'message' => $form_message('form_error_message')], 400);
    }

    $name    = sanitize_text_field($params['fullName']);
    $email   = sanitize_email($params['email']);
    $phone   = sanitize_text_field($params['phone']);
    $service = sanitize_text_field($params['service'] ?? '');
    $message = sanitize_textarea_field($params['message']);

    // Create submission post
    $post_id = wp_insert_post([
        'post_type'   => 'sasanperfumes_pl_inquiry',
        'post_title'  => $name . ' — ' . $email,
        'post_status' => 'sasanperfumes_new',
    ]);

    if (is_wp_error($post_id)) {
        return new WP_REST_Response(['success' => false, 'message' => $form_message('form_error_message')], 500);
    }

    update_post_meta($post_id, '_pl_full_name', $name);
    update_post_meta($post_id, '_pl_email', $email);
    update_post_meta($post_id, '_pl_phone', $phone);
    update_post_meta($post_id, '_pl_service', $service);
    update_post_meta($post_id, '_pl_message', $message);
    update_post_meta($post_id, '_pl_submitted_at', current_time('mysql'));

    // Email notification
    $to = sasanperfumes_pl_opt('form_email') ?: get_option('admin_email');
    $subject = sprintf('[%s] New Private Labeling Enquiry from %s', get_bloginfo('name'), $name);
    $body = "New private labeling enquiry:\n\n"
        . "Name: {$name}\nEmail: {$email}\nPhone: {$phone}\n"
        . "Service Interest: {$service}\n\n"
        . "Message:\n{$message}\n\n"
        . "View in admin: " . admin_url("post.php?post={$post_id}&action=edit");
    $headers = ['Content-Type: text/plain; charset=UTF-8', "Reply-To: {$name} <{$email}>"];
    wp_mail($to, $subject, $body, $headers);

    return rest_ensure_response(['success' => true, 'message' => $form_message('form_success_message')]);
}
