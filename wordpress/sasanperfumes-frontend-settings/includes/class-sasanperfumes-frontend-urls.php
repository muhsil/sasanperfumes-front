<?php
/**
 * Sasan Perfumes Frontend URL Rewriting
 * 
 * Rewrites WordPress admin URLs (Visit Site, View Product, permalinks, etc.)
 * to point to the headless Next.js frontend instead of the WordPress backend.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.9.1
 */

if (!defined('ABSPATH')) exit;

class sasanperfumes_Frontend_Urls {

    private $frontend_url = '';
    private $frontend_root_url = '';

    public function __construct() {
        $this->frontend_url = sasanperfumes_get_frontend_url();
        $this->frontend_root_url = sasanperfumes_get_frontend_url_root($this->frontend_url);
        if ($this->frontend_root_url === '') {
            $this->frontend_root_url = untrailingslashit($this->frontend_url);
        }

        if (empty($this->frontend_url)) {
            return;
        }

        add_action('admin_menu', array($this, 'register_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));

        add_filter('page_link', array($this, 'rewrite_page_link'), 10, 2);
        add_filter('post_link', array($this, 'rewrite_post_link'), 10, 2);
        add_filter('post_type_link', array($this, 'rewrite_post_type_link'), 10, 2);
        add_filter('term_link', array($this, 'rewrite_term_link'), 10, 3);

        add_filter('get_sample_permalink_html', array($this, 'rewrite_sample_permalink_html'), 10, 5);

        add_action('admin_bar_menu', array($this, 'rewrite_admin_bar_urls'), 999);

        add_filter('woocommerce_product_get_permalink', array($this, 'rewrite_wc_product_permalink'), 10, 2);
        add_action('plugins_loaded', array($this, 'redirect_public_request_to_headless_early'), 0);
        add_action('init', array($this, 'redirect_public_request_to_headless_early'), 0);
        add_action('template_redirect', array($this, 'redirect_public_frontend_to_headless'), 1);

        // Google Listings & Ads (Merchant Center) - rewrite product URLs in feeds
        add_filter('woocommerce_gla_product_attribute_value_link', array($this, 'rewrite_gla_product_link'), 10, 2);
        add_filter('woocommerce_gla_product_attribute_value_canonical_link', array($this, 'rewrite_gla_product_link'), 10, 2);

        // WooCommerce product feed / REST API - always rewrite product permalinks
        add_filter('woocommerce_product_get_permalink', array($this, 'rewrite_wc_product_permalink_global'), 20, 2);
        add_filter('post_type_link', array($this, 'rewrite_product_post_type_link_global'), 20, 2);
    }

    public function register_settings_page() {
        add_submenu_page(
            'sasanperfumes-settings',
            'Frontend URL',
            'Frontend URL',
            'manage_options',
            'sasanperfumes-settings-frontend-url',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('sasanperfumes_frontend_url_group', 'sasanperfumes_frontend_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => 'https://shapehive.com',
        ));
    }

    public function render_settings_page() {
        if (!current_user_can('manage_options')) return;
        ?>
        <div class="wrap">
            <h1>Frontend URL Settings</h1>
            <p>Configure the headless frontend URL. All "Visit Site", "View Product", and permalink URLs in the WordPress admin will point to this URL instead of the WordPress backend.</p>
            <form method="post" action="options.php">
                <?php settings_fields('sasanperfumes_frontend_url_group'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="sasanperfumes_frontend_url">Frontend URL</label></th>
                        <td>
                            <input type="url" id="sasanperfumes_frontend_url" name="sasanperfumes_frontend_url" value="<?php echo esc_attr($this->frontend_url); ?>" class="regular-text" placeholder="https://shapehive.com">
                            <p class="description">The public URL of your Next.js frontend (no trailing slash).</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function build_frontend_url(string $locale, string $path = ''): string {
        return sasanperfumes_build_frontend_localized_url($locale, $path, $this->frontend_url);
    }

    private function build_frontend_path(string $locale, string $path = ''): string {
        $market = sasanperfumes_frontend_market_for_url($this->frontend_url);
        $segments = [];

        if ($market !== '') {
            $segments[] = $market;
        }

        $segments[] = in_array($locale, array('en', 'ar'), true) ? $locale : 'en';

        $clean_path = trim((string) $path);
        if ($clean_path !== '') {
            $segments[] = ltrim($clean_path, '/');
        }

        return '/' . implode('/', array_filter($segments, 'strlen'));
    }

    private function normalize_frontend_request_path(string $path): string {
        $known_markets = array('qa', 'om', 'sa');
        $known_locales = array('en', 'ar');

        $path = trim((string) $path);
        if ($path === '' || $path === '/') {
            return $this->build_frontend_path('en', '');
        }

        $segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
        if (empty($segments)) {
            return $this->build_frontend_path('en', '');
        }

        $market = '';
        $locale = '';
        $remaining = $segments;

        if (in_array($segments[0], $known_markets, true)) {
            $market = array_shift($remaining);
            if (!empty($remaining[0]) && in_array($remaining[0], $known_locales, true)) {
                $locale = array_shift($remaining);
            } else {
                $locale = 'en';
            }
        } elseif (in_array($segments[0], $known_locales, true)) {
            $locale = array_shift($remaining);
            if (!empty($remaining[0]) && in_array($remaining[0], $known_markets, true)) {
                $market = array_shift($remaining);
            }
        } else {
            $locale = 'en';
            $market = sasanperfumes_frontend_market_for_url($this->frontend_url);
        }

        if (!in_array($locale, $known_locales, true)) {
            $locale = 'en';
        }

        if ($market === '') {
            $market = sasanperfumes_frontend_market_for_url($this->frontend_url);
        }

        $parts = array();
        if ($market !== '') {
            $parts[] = $market;
        }
        $parts[] = $locale;

        foreach ($remaining as $segment) {
            if ($segment !== '') {
                $parts[] = $segment;
            }
        }

        return '/' . implode('/', $parts);
    }

    private function get_frontend_path_for_post($post) {
        if (!$post) return '';

        $post_type = get_post_type($post);
        $slug = $post->post_name;

        if ($post_type === 'product') {
            return 'product/' . $slug;
        }

        if ($post_type === 'post') {
            return 'blog/' . $slug;
        }

        if ($post_type === 'page') {
            if ($slug === 'shop') {
                return 'shop';
            }
            if ($slug === 'cart') {
                return 'cart';
            }
            if ($slug === 'checkout') {
                return 'checkout';
            }
            if ($slug === 'my-account') {
                return 'my-account';
            }
            return $slug;
        }

        return '';
    }

    private function get_frontend_path_for_term($term, $taxonomy) {
        if (!$term) return '';

        $slug = $term->slug;

        if ($taxonomy === 'product_cat') {
            return 'category/' . $slug;
        }

        if ($taxonomy === 'product_tag') {
            return 'shop?tag=' . $slug;
        }

        if ($taxonomy === 'category') {
            return 'blog/category/' . $slug;
        }

        return '';
    }

    public function redirect_public_request_to_headless_early() {
        if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
            return;
        }

        $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
        $path = parse_url($request_uri, PHP_URL_PATH);
        $path = $path ? $path : '/';

        if (
            $path === '/wp-json' ||
            strpos($path, '/wp-json/') === 0 ||
            $path === '/wp-admin' ||
            strpos($path, '/wp-admin/') === 0 ||
            strpos($path, '/wp-login.php') === 0 ||
            strpos($path, '/xmlrpc.php') === 0 ||
            strpos($path, '/wp-content/') === 0 ||
            strpos($path, '/wp-includes/') === 0 ||
            strpos($path, '/wp-cron.php') === 0
        ) {
            return;
        }

        $target_path = $this->normalize_frontend_request_path($path);

        wp_safe_redirect(trailingslashit($this->frontend_root_url) . ltrim($target_path, '/'), 301);
        exit;
    }

    public function redirect_public_frontend_to_headless() {
        if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
            return;
        }

        $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
        $request_path = parse_url($request_uri, PHP_URL_PATH);
        $request_path = $request_path ? $request_path : '/';
        if (
            $request_path === '/wp-json' ||
            strpos($request_path, '/wp-json/') === 0 ||
            $request_path === '/wp-admin' ||
            strpos($request_path, '/wp-admin/') === 0 ||
            strpos($request_path, '/wp-login.php') === 0 ||
            strpos($request_path, '/xmlrpc.php') === 0
        ) {
            return;
        }

        $target_path = $this->build_frontend_path('en', '');

        if (is_singular()) {
            $path = $this->get_frontend_path_for_post(get_queried_object());
            if ($path) {
                $target_path = $this->build_frontend_path('en', $path);
            }
        } elseif (is_tax() || is_category() || is_tag()) {
            $term = get_queried_object();
            if ($term && isset($term->taxonomy)) {
                $path = $this->get_frontend_path_for_term($term, $term->taxonomy);
                if ($path) {
                    $target_path = $this->build_frontend_path('en', $path);
                }
            }
        } elseif (function_exists('is_shop') && is_shop()) {
            $target_path = $this->build_frontend_path('en', 'shop');
        }

        wp_safe_redirect(trailingslashit($this->frontend_root_url) . ltrim($target_path, '/'), 301);
        exit;
    }

    public function rewrite_page_link($link, $post_id) {
        if (!is_admin()) return $link;

        $post = get_post($post_id);
        $path = $this->get_frontend_path_for_post($post);
        if ($path) {
            return $this->build_frontend_url('en', $path);
        }
        return $link;
    }

    public function rewrite_post_link($link, $post) {
        if (!is_admin()) return $link;

        $path = $this->get_frontend_path_for_post($post);
        if ($path) {
            return $this->build_frontend_url('en', $path);
        }
        return $link;
    }

    public function rewrite_post_type_link($link, $post) {
        if (!is_admin()) return $link;

        $path = $this->get_frontend_path_for_post($post);
        if ($path) {
            return $this->build_frontend_url('en', $path);
        }
        return $link;
    }

    public function rewrite_term_link($link, $term, $taxonomy) {
        if (!is_admin()) return $link;

        $path = $this->get_frontend_path_for_term($term, $taxonomy);
        if ($path) {
            return $this->build_frontend_url('en', $path);
        }
        return $link;
    }

    public function rewrite_sample_permalink_html($html, $post_id, $new_title, $new_slug, $post) {
        $post_obj = get_post($post_id);
        $path = $this->get_frontend_path_for_post($post_obj);

        if ($path) {
            $slug = $post_obj->post_name;
            $path_without_slug = str_replace($slug, '', $path);
            $display_url = $this->build_frontend_url('en', $path_without_slug);
            $full_url = $this->build_frontend_url('en', $path);

            $html = '<span id="sample-permalink">';
            $html .= '<a href="' . esc_url($full_url) . '">' . esc_html($display_url) . '</a>';
            $html .= '<span id="editable-post-name" title="Click to edit this part of the permalink">' . esc_html($slug) . '</span>';
            $html .= '/</span>';
            $html .= ' <span id="view-post-btn"><a href="' . esc_url($full_url) . '" class="button button-small">View</a></span>';
        }

        return $html;
    }

    public function rewrite_admin_bar_urls($wp_admin_bar) {
        $site_node = $wp_admin_bar->get_node('site-name');
        if ($site_node) {
            $site_node->href = $this->build_frontend_url('en', '');
            $wp_admin_bar->add_node((array) $site_node);
        }

        $view_site = $wp_admin_bar->get_node('view-site');
        if ($view_site) {
            $view_site->href = $this->build_frontend_url('en', '');
            $wp_admin_bar->add_node((array) $view_site);
        }

        $view_store = $wp_admin_bar->get_node('visit-store');
        if ($view_store) {
            $view_store->href = $this->build_frontend_url('en', 'shop');
            $wp_admin_bar->add_node((array) $view_store);
        }

        global $post;
        if ($post && is_admin()) {
            $view_node = $wp_admin_bar->get_node('view');
            if ($view_node) {
                $path = $this->get_frontend_path_for_post($post);
                if ($path) {
                    $view_node->href = $this->build_frontend_url('en', $path);
                    $wp_admin_bar->add_node((array) $view_node);
                }
            }
        }
    }

    public function rewrite_wc_product_permalink($permalink, $product) {
        if (!is_admin()) return $permalink;

        $slug = $product->get_slug();
        if ($slug) {
            return $this->build_frontend_url('en', 'product/' . $slug);
        }
        return $permalink;
    }

    /**
     * Rewrite product permalinks globally (not just in admin)
     * This ensures Google Merchant Center feeds, REST API, and Content API
     * all use the new Next.js frontend URL structure.
     */
    public function rewrite_wc_product_permalink_global($permalink, $product) {
        $slug = $product->get_slug();
        if ($slug) {
            return $this->build_frontend_url('en', 'product/' . $slug);
        }
        return $permalink;
    }

    /**
     * Rewrite product post type links globally for feeds and API responses.
     * Only applies to 'product' post type to avoid affecting other post types.
     */
    public function rewrite_product_post_type_link_global($link, $post) {
        if (get_post_type($post) !== 'product') {
            return $link;
        }

        $slug = $post->post_name;
        if ($slug) {
            return $this->build_frontend_url('en', 'product/' . $slug);
        }
        return $link;
    }

    /**
     * Rewrite product link attribute for Google Listings & Ads plugin feeds.
     * This ensures the Merchant Center product feed uses the new URL structure.
     */
    public function rewrite_gla_product_link($value, $product) {
        if (!$product) return $value;

        $slug = '';
        if (is_a($product, 'WC_Product')) {
            $slug = $product->get_slug();
        } elseif (is_a($product, 'WP_Post')) {
            $slug = $product->post_name;
        }

        if ($slug) {
            return $this->build_frontend_url('en', 'product/' . $slug);
        }
        return $value;
    }
}

new sasanperfumes_Frontend_Urls();
