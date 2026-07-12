<?php
/**
 * One-time multisite category content/image seed.
 * Can be run with WP-CLI or pasted into WPCode without the opening PHP tag.
 */

if (!defined('ABSPATH') || !is_multisite()) return;

$done_key = 'sasanperfumes_category_content_seed_20260712_v3';
if (get_site_option($done_key)) return;

$copy = array(
    'air-freshener' => array('Air Freshener', 'معطرات الجو', 'home and car air fresheners with clean, long-lasting fragrance', 'معطرات الجو والسيارة بروائح نظيفة وثابتة'),
    'all-over-spray' => array('All Over Spray', 'بخاخ الجسم', 'refreshing all-over sprays and long-lasting body fragrances', 'بخاخات الجسم المنعشة والعطور اليومية الثابتة'),
    'gift-set' => array('Gift Sets', 'أطقم الهدايا', 'luxury perfume gift sets for birthdays, celebrations, and special occasions', 'أطقم هدايا العطور الفاخرة لأعياد الميلاد والاحتفالات والمناسبات'),
    'sasan-hair-mist' => array('Hair Mist', 'معطر الشعر', 'lightweight hair mists with elegant, lasting scent', 'معطرات شعر خفيفة بروائح أنيقة وثابتة'),
    'hair-mist' => array('Hair Mist', 'معطر الشعر', 'lightweight hair mists with elegant, lasting scent', 'معطرات شعر خفيفة بروائح أنيقة وثابتة'),
    'mens-perfumes' => array("Men's Perfumes", 'عطور رجالية', "men's perfumes with oud, woody, fresh, musk, and amber notes", 'عطور رجالية بنفحات العود والخشب والانتعاش والمسك والعنبر'),
    'new-arrival' => array('New Arrivals', 'وصل حديثًا', 'the latest perfume arrivals and new fragrances', 'أحدث العطور والإصدارات الجديدة'),
    'oud-perfumes' => array('Oud Perfumes', 'عطور العود', 'Arabian oud perfumes with rich woody, smoky, and oriental notes', 'عطور العود العربي بنفحات خشبية ودخانية وشرقية غنية'),
    'perfumes' => array('Perfumes', 'العطور', 'premium, long-lasting perfumes for women and men', 'عطور فاخرة وثابتة للنساء والرجال'),
    'unisex' => array('Unisex Perfumes', 'عطور للجنسين', 'unisex perfumes designed to be shared and worn your way', 'عطور للجنسين بروائح أنيقة تناسب الجميع'),
    'woman-perfumes' => array("Women's Perfumes", 'عطور نسائية', "women's perfumes with floral, musk, amber, fruity, and oriental notes", 'عطور نسائية بنفحات الزهور والمسك والعنبر والفواكه والروائح الشرقية'),
    'womens-perfumes' => array("Women's Perfumes", 'عطور نسائية', "women's perfumes with floral, musk, amber, fruity, and oriental notes", 'عطور نسائية بنفحات الزهور والمسك والعنبر والفواكه والروائح الشرقية'),
    'summer-perfume' => array('Summer Perfumes', 'عطور صيفية', 'fresh summer perfumes with citrus, floral, aquatic, and airy notes', 'عطور صيفية منعشة بنفحات الحمضيات والزهور والروائح المائية'),
    'winter-perfume' => array('Winter Perfumes', 'عطور شتوية', 'warm winter perfumes with oud, amber, musk, spice, and woody notes', 'عطور شتوية دافئة بنفحات العود والعنبر والمسك والتوابل والأخشاب'),
    'top-perfumes-sasan' => array('Best-Selling Perfumes', 'العطور الأكثر مبيعًا', 'best-selling Sasan perfumes chosen by fragrance lovers', 'عطور ساسان الأكثر مبيعًا والمفضلة لدى عشاق العطور'),
);

$aliases = array(
    'sasan-hair-mist' => array('sasan-hair-mist', 'hair-mist'),
    'woman-perfumes' => array('woman-perfumes', 'womens-perfumes'),
);

switch_to_blog(get_main_site_id());
$source_terms = get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => false));
$source_images = array();
if (!is_wp_error($source_terms)) {
    foreach ($source_terms as $term) {
        $thumb_id = (int) get_term_meta($term->term_id, 'thumbnail_id', true);
        $source_images[$term->slug] = $thumb_id ? wp_get_attachment_url($thumb_id) : '';
    }
}
restore_current_blog();

$markets = array(
    '/' => array('the UAE', 'الإمارات', 'Dubai, Abu Dhabi, Sharjah, and across the UAE', 'دبي وأبوظبي والشارقة وجميع أنحاء الإمارات'),
    '/qa/' => array('Qatar', 'قطر', 'Doha and across Qatar', 'الدوحة وجميع أنحاء قطر'),
    '/om/' => array('Oman', 'عُمان', 'Muscat and across Oman', 'مسقط وجميع أنحاء عُمان'),
    '/sa/' => array('Saudi Arabia', 'السعودية', 'Riyadh, Jeddah, and across Saudi Arabia', 'الرياض وجدة وجميع أنحاء السعودية'),
);

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

foreach (get_sites(array('number' => 0)) as $site) {
    $path = $site->path;
    if (!isset($markets[$path])) continue;
    $market = $markets[$path];
    switch_to_blog((int) $site->blog_id);

    foreach ($copy as $slug => $item) {
        $candidate_slugs = isset($aliases[$slug]) ? $aliases[$slug] : array($slug);
        $term = false;
        foreach ($candidate_slugs as $candidate) {
            $term = get_term_by('slug', $candidate, 'product_cat');
            if ($term) break;
        }
        if (!$term || is_wp_error($term) || $term->slug === 'uncategorized') continue;

        $intro_en = 'Discover ' . $item[2] . ' from Sasan Perfumes, with convenient shopping and delivery options for customers in ' . $market[0] . '.';
        $intro_ar = 'اكتشف ' . $item[3] . ' من ساسان للعطور مع خيارات تسوق وتوصيل مخصصة للعملاء في ' . $market[1] . '.';
        $seo_title_en = 'Shop ' . $item[0] . ' Online in ' . $market[0];
        $seo_title_ar = 'تسوق ' . $item[1] . ' أونلاين في ' . $market[1];
        $seo_desc_en = 'Explore ' . $item[2] . ' from Sasan Perfumes. Choose carefully selected scents for everyday wear or gifting, with a convenient shopping experience for customers in ' . $market[2] . '. Our collection combines more than 60 years of fragrance heritage with modern style.';
        $seo_desc_ar = 'اكتشف ' . $item[3] . ' من ساسان للعطور. اختر من روائح مختارة بعناية للاستخدام اليومي أو الإهداء، مع تجربة تسوق سهلة للعملاء في ' . $market[3] . '. تجمع مجموعتنا بين خبرة عطرية تتجاوز 60 عامًا وأناقة تناسب الذوق العصري.';

        wp_update_term($term->term_id, 'product_cat', array('description' => $intro_en));
        update_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_en', $intro_en);
        update_term_meta($term->term_id, 'sasanperfumes_cat_subtitle_ar', $intro_ar);
        update_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_en', $seo_title_en);
        update_term_meta($term->term_id, 'sasanperfumes_cat_seo_title_ar', $seo_title_ar);
        update_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_en', $seo_desc_en);
        update_term_meta($term->term_id, 'sasanperfumes_cat_seo_desc_ar', $seo_desc_ar);

        // WPML can keep translated categories as duplicate terms with the same
        // slug. get_term_by() returns the current English term, so update every
        // matching translated term directly with native Arabic Description.
        global $wpdb;
        $translated_term_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT t.term_id FROM {$wpdb->terms} t INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id=t.term_id WHERE tt.taxonomy='product_cat' AND t.slug=%s AND t.term_id<>%d",
            $term->slug,
            $term->term_id
        ));
        foreach ($translated_term_ids as $translated_term_id) {
            wp_update_term((int) $translated_term_id, 'product_cat', array('description' => $intro_ar));
            update_term_meta((int) $translated_term_id, 'sasanperfumes_cat_subtitle_en', $intro_en);
            update_term_meta((int) $translated_term_id, 'sasanperfumes_cat_subtitle_ar', $intro_ar);
            update_term_meta((int) $translated_term_id, 'sasanperfumes_cat_seo_title_en', $seo_title_en);
            update_term_meta((int) $translated_term_id, 'sasanperfumes_cat_seo_title_ar', $seo_title_ar);
            update_term_meta((int) $translated_term_id, 'sasanperfumes_cat_seo_desc_en', $seo_desc_en);
            update_term_meta((int) $translated_term_id, 'sasanperfumes_cat_seo_desc_ar', $seo_desc_ar);
        }

        if (!(int) get_term_meta($term->term_id, 'thumbnail_id', true)) {
            $source_slug = $slug === 'hair-mist' ? 'sasan-hair-mist' : ($slug === 'womens-perfumes' ? 'woman-perfumes' : $slug);
            $image_url = $source_images[$source_slug] ?? '';
            if ($image_url) {
                $attachment_id = media_sideload_image($image_url, 0, $item[0] . ' category', 'id');
                if (!is_wp_error($attachment_id)) update_term_meta($term->term_id, 'thumbnail_id', (int) $attachment_id);
            }
        }
    }
    restore_current_blog();
}

update_site_option($done_key, gmdate('c'));
