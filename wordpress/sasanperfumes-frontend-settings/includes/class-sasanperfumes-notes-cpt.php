<?php
/**
 * Sasan Perfumes Notes CPT â€” Fragrance Notes as Custom Post Type
 *
 * Each note is an individual post with bilingual fields (EN/AR).
 * Pattern follows class-sasanperfumes-guide-pages.php.
 *
 * REST API: GET /sasanperfumes/v1/notes-seo/{slug}
 * REST API: GET /sasanperfumes/v1/notes-seo
 *
 * @since 6.3.0
 */
if (!defined('ABSPATH')) exit;

/* ================================================================
   REGISTER CPT
   ================================================================ */

function sasanperfumes_note_cpt_init() {
    add_action('init', 'sasanperfumes_register_note_cpt');
    add_action('add_meta_boxes', 'sasanperfumes_note_add_meta_boxes');
    add_action('save_post_sasanperfumes_note', 'sasanperfumes_note_save_meta', 10, 2);
    add_action('rest_api_init', 'sasanperfumes_note_register_routes');
    add_filter('post_row_actions', 'sasanperfumes_note_row_actions', 10, 2);
    add_action('edit_form_after_title', 'sasanperfumes_note_view_links');
}

function sasanperfumes_register_note_cpt() {
    register_post_type('sasanperfumes_note', [
        'labels' => [
            'name' => 'Notes', 'singular_name' => 'Note',
            'add_new' => 'Add New Note', 'add_new_item' => 'Add New Note',
            'edit_item' => 'Edit Note', 'all_items' => 'All Notes',
            'search_items' => 'Search Notes', 'not_found' => 'No notes found',
        ],
        'public' => false, 'show_ui' => true, 'show_in_menu' => true,
        'menu_position' => 27, 'menu_icon' => 'dashicons-tag',
        'supports' => ['title'], 'has_archive' => false,
        'rewrite' => false, 'show_in_rest' => false,
    ]);
}

/* ================================================================
   METABOX
   ================================================================ */

function sasanperfumes_note_add_meta_boxes() {
    add_meta_box('sasanperfumes_note_mapping', 'Product Mapping', 'sasanperfumes_note_mapping_metabox', 'sasanperfumes_note', 'normal', 'high');
    add_meta_box('sasanperfumes_note_fields', 'Note SEO Content', 'sasanperfumes_note_render_metabox', 'sasanperfumes_note', 'normal', 'high');
}

/**
 * Product Mapping metabox â€” links this Note to a WooCommerce pa_notes attribute
 */
function sasanperfumes_note_mapping_metabox($post) {
    $id = $post->ID;
    $saved_attr = get_post_meta($id, '_sasanperfumes_note_attribute_slug', true);

    // Info banner
    echo '<div style="background:#e7f5ff;border:1px solid #b6d4fe;border-radius:4px;padding:12px 15px;margin-bottom:15px;">';
    echo '<strong>How product mapping works:</strong><br>';
    echo '&bull; Products are loaded <strong>automatically</strong> from WooCommerce based on the <code>pa_notes</code> product attribute.<br>';
    echo '&bull; Select the matching attribute value below to link this Note page to the correct products.<br>';
    echo '&bull; Arabic product details (name, image, price) come <strong>automatically</strong> from WooCommerce/WPML â€” no need to select them separately.<br>';
    echo '&bull; To add/remove products from this page, edit each product in <strong>WooCommerce &rarr; Products</strong> and change its Notes attribute.';
    echo '</div>';

    // Fetch all pa_notes terms
    $terms = get_terms(['taxonomy' => 'pa_notes', 'hide_empty' => false, 'orderby' => 'name']);
    if (is_wp_error($terms)) $terms = [];

    echo '<table class="form-table">';
    echo '<tr><th>WooCommerce Attribute</th><td>';
    echo '<select name="_sasanperfumes_note_attribute_slug" style="min-width:300px;">';
    echo '<option value="">(auto â€” use page slug)</option>';
    foreach ($terms as $term) {
        $count = $term->count;
        $sel = selected($saved_attr, $term->slug, false);
        echo '<option value="' . esc_attr($term->slug) . '"' . $sel . '>';
        echo esc_html($term->name) . ' (' . $term->slug . ') â€” ' . $count . ' product' . ($count !== 1 ? 's' : '');
        echo '</option>';
    }
    echo '</select>';
    echo '<p class="description">Select the <code>pa_notes</code> attribute value that maps to this Note page. If set to "auto", the page slug will be used to match products.</p>';
    echo '</td></tr>';

    // Show matched product count
    $attr_slug = $saved_attr ?: (get_post_meta($id, '_sasanperfumes_note_slug', true) ?: sanitize_title($post->post_title));
    $matched = new WP_Query([
        'post_type' => 'product', 'post_status' => 'publish',
        'posts_per_page' => -1, 'fields' => 'ids',
        'tax_query' => [['taxonomy' => 'pa_notes', 'field' => 'slug', 'terms' => $attr_slug]],
    ]);
    $pcount = $matched->found_posts;
    $color = $pcount > 0 ? '#00a32a' : '#d63638';
    echo '<tr><th>Matched Products</th><td>';
    echo '<span style="font-size:16px;font-weight:bold;color:' . $color . ';">' . $pcount . ' product' . ($pcount !== 1 ? 's' : '') . '</span>';
    echo ' <span style="color:#666;">(attribute: <code>' . esc_html($attr_slug) . '</code>)</span>';
    if ($pcount === 0) {
        echo '<p style="color:#d63638;">No products have this note attribute. Add it to products in WooCommerce &rarr; Products.</p>';
    }
    echo '</td></tr>';
    echo '</table>';
}

function sasanperfumes_note_render_metabox($post) {
    wp_nonce_field('sasanperfumes_note_save', 'sasanperfumes_note_nonce');
    $id = $post->ID;
    $prefix = '_sasanperfumes_note';

    echo '<table class="form-table">';
    // Slug
    $slug = get_post_meta($id, '_sasanperfumes_note_slug', true) ?: sanitize_title($post->post_title);
    echo '<tr><th>Slug</th><td>';
    sasanperfumes_f_text('_sasanperfumes_note_slug', $slug, ['class'=>'regular-text','placeholder'=>'e.g. amber, rose, oud']);
    echo '<p class="description">URL slug used in /notes/{slug}. This is the page URL, not the product attribute. The attribute mapping is set above.</p>';
    echo '</td></tr>';

    // Bilingual fields
    sasanperfumes_f_bi($id, $prefix, 'name', 'Display Name', 'text', ['class'=>'regular-text']);
    sasanperfumes_f_bi($id, $prefix, 'title', 'SEO Title');
    sasanperfumes_f_bi($id, $prefix, 'desc', 'SEO Description', 'textarea', ['rows'=>4]);
    echo '</table>';
}

/* ================================================================
   SAVE
   ================================================================ */

function sasanperfumes_note_save_meta($post_id, $post) {
    if (!isset($_POST['sasanperfumes_note_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_note_nonce'], 'sasanperfumes_note_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    update_post_meta($post_id, '_sasanperfumes_note_slug', sanitize_title($_POST['_sasanperfumes_note_slug'] ?? ''));
    update_post_meta($post_id, '_sasanperfumes_note_attribute_slug', sanitize_text_field($_POST['_sasanperfumes_note_attribute_slug'] ?? ''));
    sasanperfumes_f_save_bi($post_id, '_sasanperfumes_note', 'name');
    sasanperfumes_f_save_bi($post_id, '_sasanperfumes_note', 'title');
    sasanperfumes_f_save_bi($post_id, '_sasanperfumes_note', 'desc', 'textarea');
}

/* ================================================================
   REST API
   ================================================================ */

function sasanperfumes_note_register_routes() {
    sasanperfumes_register_rest_route( '/notes-seo/(?P<slug>[a-zA-Z0-9_-]+)', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_note_rest_single', 'permission_callback' => '__return_true',
        'args' => ['slug' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    sasanperfumes_register_rest_route( '/notes-seo', [
        'methods' => 'GET', 'callback' => 'sasanperfumes_note_rest_all', 'permission_callback' => '__return_true',
    ]);
}

/** Format a note post for API */
function sasanperfumes_note_format($post) {
    $id = $post->ID;
    $slug = get_post_meta($id, '_sasanperfumes_note_slug', true) ?: sanitize_title($post->post_title);
    $attr = get_post_meta($id, '_sasanperfumes_note_attribute_slug', true);
    return [
        'name'          => sasanperfumes_f_api_bi($id, '_sasanperfumes_note', 'name'),
        'title'         => sasanperfumes_f_api_bi($id, '_sasanperfumes_note', 'title'),
        'description'   => sasanperfumes_f_api_bi($id, '_sasanperfumes_note', 'desc'),
        'attributeSlug' => $attr ?: $slug,
    ];
}

/** REST: GET /sasanperfumes/v1/notes-seo/{slug} */
function sasanperfumes_note_rest_single($request) {
    $slug = $request['slug'];
    $posts = get_posts([
        'post_type' => 'sasanperfumes_note', 'post_status' => 'publish',
        'meta_key' => '_sasanperfumes_note_slug', 'meta_value' => $slug,
        'posts_per_page' => 1,
    ]);
    if (empty($posts)) {
        // Fallback: try by post_name
        $posts = get_posts([
            'post_type' => 'sasanperfumes_note', 'post_status' => 'publish',
            'name' => $slug, 'posts_per_page' => 1,
        ]);
    }
    if (empty($posts)) {
        return new WP_REST_Response(['name'=>['en'=>'','ar'=>''],'title'=>['en'=>'','ar'=>''],'description'=>['en'=>'','ar'=>'']], 200);
    }
    return new WP_REST_Response(sasanperfumes_note_format($posts[0]), 200);
}

/** REST: GET /sasanperfumes/v1/notes-seo */
function sasanperfumes_note_rest_all() {
    $posts = get_posts([
        'post_type' => 'sasanperfumes_note', 'post_status' => 'publish',
        'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC',
    ]);
    $notes = [];
    foreach ($posts as $p) {
        $slug = get_post_meta($p->ID, '_sasanperfumes_note_slug', true) ?: sanitize_title($p->post_title);
        $formatted = sasanperfumes_note_format($p);
        // Only include if has content
        if (!empty($formatted['name']['en']) || !empty($formatted['title']['en'])) {
            $notes[$slug] = $formatted;
        }
    }
    return new WP_REST_Response($notes, 200);
}

/* ================================================================
   VIEW LINKS
   ================================================================ */

/** Add View EN/AR links to Notes list row actions */
function sasanperfumes_note_row_actions($actions, $post) {
    if ($post->post_type !== 'sasanperfumes_note') return $actions;
    $slug = get_post_meta($post->ID, '_sasanperfumes_note_slug', true) ?: sanitize_title($post->post_title);
    $actions['view_en'] = '<a href="' . esc_url(sasanperfumes_build_frontend_localized_url('en', 'notes/' . $slug)) . '" target="_blank">View EN</a>';
    $actions['view_ar'] = '<a href="' . esc_url(sasanperfumes_build_frontend_localized_url('ar', 'notes/' . $slug)) . '" target="_blank">View AR</a>';
    return $actions;
}

/** Show view links banner on Note edit page */
function sasanperfumes_note_view_links($post) {
    if ($post->post_type !== 'sasanperfumes_note') return;
    $slug = get_post_meta($post->ID, '_sasanperfumes_note_slug', true) ?: sanitize_title($post->post_title);
    echo '<div class="notice notice-info inline" style="margin:10px 0;padding:10px 15px;">';
    echo '<strong>View on site:</strong> ';
    echo '<a href="' . esc_url(sasanperfumes_build_frontend_localized_url('en', 'notes/' . $slug)) . '" target="_blank" class="button button-small" style="margin-left:8px;">View EN</a> ';
    echo '<a href="' . esc_url(sasanperfumes_build_frontend_localized_url('ar', 'notes/' . $slug)) . '" target="_blank" class="button button-small" style="margin-left:4px;">View AR</a>';
    echo '</div>';
}

/* ================================================================
   INIT
   ================================================================ */
sasanperfumes_note_cpt_init();
