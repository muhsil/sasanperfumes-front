<?php
/**
 * ShapeHive Frontend URL Rewriting
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

    public function __construct() {
        $this->frontend_url = sasanperfumes_get_frontend_url();

        if (empty($this->frontend_url)) {
            return;
        }

        add_action('admin_menu', array($this, 'register_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));

        add_filter('page_link', array($this, 'rewrite_page_link'), 10, 2);
        add_filter('post_link', array($this, 'rewrite_post_link'), 10, 2);
        add_filter('post_type_link', array($this, 'rewrite_post_type_link'), 10, 2);
        add_filter('term_link', array($this, 'rewrite_term_link'), 10, 3);
        add_filter('allowed_redirect_hosts', array($this, 'allow_frontend_redirect_host'));

        add_filter('get_sample_permalink_html', array($this, 'rewrite_sample_permalink_html'), 10, 5);

        add_action('admin_bar_menu', array($this, 'rewrite_admin_bar_urls'), 999);

        add_filter('woocommerce_product_get_permalink', array($this, 'rewrite_wc_product_permalink'), 10, 2);
        add_action('plugins_loaded', array($this, 'redirect_public_request_to_headless_early'), 0);
        add_action('init', array($this, 'redirect_public_request_to_headless_early'), 0);
        add_action('parse_request', array($this, 'redirect_public_request_to_headless_early'), 0);
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
            'default' => 'https://sasanperfumes.com',
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
                            <input type="url" id="sasanperfumes_frontend_url" name="sasanperfumes_frontend_url" value="<?php echo esc_attr($this->frontend_url); ?>" class="regular-text" placeholder="https://sasanperfumes.com">
                            <p class="description">The public URL of your Next.js frontend (no trailing slash).</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function get_known_market_slugs() {
        return array('qa', 'om', 'sa');
    }

    private function normalize_request_path($path) {
        $path = '/' . ltrim((string) $path, '/');
        $path = preg_replace('#/+#', '/', $path);
        return $path ?: '/';
    }

    private function strip_market_prefix_from_path($path) {
        $path = $this->normalize_request_path($path);
        $segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));

        if (!empty($segments) && in_array(strtolower($segments[0]), $this->get_known_market_slugs(), true)) {
            array_shift($segments);
            return empty($segments) ? '/' : '/' . implode('/', $segments);
        }

        return $path;
    }

    private function is_backend_request_uri($request_uri) {
        if (strpos((string) $request_uri, 'rest_route=') !== false) {
            return true;
        }

        if ($this->is_woocommerce_payment_request($request_uri)) {
            return true;
        }

        $path = parse_url((string) $request_uri, PHP_URL_PATH);
        $path = $this->strip_market_prefix_from_path($path ? $path : '/');

        $backend_prefixes = array(
            '/wp-json',
            '/wp-admin',
            '/wp-login.php',
            '/xmlrpc.php',
            '/wp-content',
            '/wp-includes',
            '/wp-cron.php',
            '/favicon.ico',
            '/robots.txt',
            '/sitemap.xml',
        );

        foreach ($backend_prefixes as $prefix) {
            if ($path === $prefix || strpos($path, $prefix . '/') === 0) {
                return true;
            }
        }

        return (bool) preg_match('/\.(?:css|js|json|png|jpe?g|gif|svg|webp|ico|txt|xml|map|woff2?|ttf|eot|otf|pdf)$/i', $path);
    }

    private function is_woocommerce_payment_request($request_uri) {
        $path = parse_url((string) $request_uri, PHP_URL_PATH);
        $path = $this->strip_market_prefix_from_path($path ? $path : '/');
        $query = array();
        parse_str((string) parse_url((string) $request_uri, PHP_URL_QUERY), $query);

        if (!empty($query['pay_for_order'])) {
            return true;
        }

        $payment_paths = array(
            '/checkout/order-pay',
            '/checkout/order-received',
            '/order-pay',
            '/wc-api',
        );

        foreach ($payment_paths as $payment_path) {
            if ($path === $payment_path || strpos($path, $payment_path . '/') === 0) {
                return true;
            }
        }

        return false;
    }

    private function get_headless_redirect_path($request_path) {
        $target_path = $this->strip_market_prefix_from_path($request_path);

        if ($target_path === '/' || $target_path === '') {
            return '/en';
        }

        if (strpos($target_path, '/en') !== 0 && strpos($target_path, '/ar') !== 0) {
            return '/en' . (strpos($target_path, '/') === 0 ? $target_path : '/' . $target_path);
        }

        return $target_path;
    }

    public function allow_frontend_redirect_host($hosts) {
        $frontend_host = parse_url($this->frontend_url, PHP_URL_HOST);
        if ($frontend_host && !in_array($frontend_host, $hosts, true)) {
            $hosts[] = $frontend_host;
        }

        return $hosts;
    }

    private function redirect_to_frontend($target_path, $status = 301) {
        $target_url = trailingslashit($this->frontend_url) . ltrim((string) $target_path, '/');
        wp_redirect($target_url, $status, 'sasanperfumes');
        exit;
    }

    private function get_frontend_path_for_post($post) {
        if (!$post) return '';

        $post_type = get_post_type($post);
        $slug = $post->post_name;

        if ($post_type === 'product') {
            return '/en/product/' . $slug;
        }

        if ($post_type === 'post') {
            return '/en/blog/' . $slug;
        }

        if ($post_type === 'page') {
            if ($slug === 'shop') {
                return '/en/shop';
            }
            if ($slug === 'cart') {
                return '/en/cart';
            }
            if ($slug === 'checkout') {
                return '/en/checkout';
            }
            if ($slug === 'my-account') {
                return '/en/my-account';
            }
            return '/en/' . $slug;
        }

        return '';
    }

    private function get_frontend_path_for_term($term, $taxonomy) {
        if (!$term) return '';

        $slug = $term->slug;

        if ($taxonomy === 'product_cat') {
            return '/en/category/' . $slug;
        }

        if ($taxonomy === 'product_tag') {
            return '/en/shop?tag=' . $slug;
        }

        if ($taxonomy === 'category') {
            return '/en/blog/category/' . $slug;
        }

        return '';
    }

    public function redirect_public_request_to_headless_early() {
        if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
            return;
        }

        $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
        if ($this->is_backend_request_uri($request_uri)) {
            return;
        }

        $path = parse_url($request_uri, PHP_URL_PATH);
        $target_path = $this->get_headless_redirect_path($path ? $path : '/');

        $this->redirect_to_frontend($target_path, 301);
    }

    public function redirect_public_frontend_to_headless() {
        if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
            return;
        }

        $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
        if ($this->is_backend_request_uri($request_uri)) {
            return;
        }

        $target_path = '/en';

        if (is_singular()) {
            $path = $this->get_frontend_path_for_post(get_queried_object());
            if ($path) {
                $target_path = $path;
            }
        } elseif (is_tax() || is_category() || is_tag()) {
            $term = get_queried_object();
            if ($term && isset($term->taxonomy)) {
                $path = $this->get_frontend_path_for_term($term, $term->taxonomy);
                if ($path) {
                    $target_path = $path;
                }
            }
        } elseif (function_exists('is_shop') && is_shop()) {
            $target_path = '/en/shop';
        }

        $this->redirect_to_frontend($target_path, 301);
    }

    public function rewrite_page_link($link, $post_id) {
        if (!is_admin()) return $link;

        $post = get_post($post_id);
        $path = $this->get_frontend_path_for_post($post);
        if ($path) {
            return trailingslashit($this->frontend_url) . ltrim($path, '/');
        }
        return $link;
    }

    public function rewrite_post_link($link, $post) {
        if (!is_admin()) return $link;

        $path = $this->get_frontend_path_for_post($post);
        if ($path) {
            return trailingslashit($this->frontend_url) . ltrim($path, '/');
        }
        return $link;
    }

    public function rewrite_post_type_link($link, $post) {
        if (!is_admin()) return $link;

        $path = $this->get_frontend_path_for_post($post);
        if ($path) {
            return trailingslashit($this->frontend_url) . ltrim($path, '/');
        }
        return $link;
    }

    public function rewrite_term_link($link, $term, $taxonomy) {
        if (!is_admin()) return $link;

        $path = $this->get_frontend_path_for_term($term, $taxonomy);
        if ($path) {
            return trailingslashit($this->frontend_url) . ltrim($path, '/');
        }
        return $link;
    }

    public function rewrite_sample_permalink_html($html, $post_id, $new_title, $new_slug, $post) {
        $post_obj = get_post($post_id);
        $path = $this->get_frontend_path_for_post($post_obj);

        if ($path) {
            $slug = $post_obj->post_name;
            $frontend_base = trailingslashit($this->frontend_url);
            $path_without_slug = str_replace($slug, '', $path);
            $display_url = $frontend_base . ltrim($path_without_slug, '/');
            $full_url = $frontend_base . ltrim($path, '/');

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
            $site_node->href = $this->frontend_url;
            $wp_admin_bar->add_node((array) $site_node);
        }

        $view_site = $wp_admin_bar->get_node('view-site');
        if ($view_site) {
            $view_site->href = $this->frontend_url;
            $wp_admin_bar->add_node((array) $view_site);
        }

        $view_store = $wp_admin_bar->get_node('visit-store');
        if ($view_store) {
            $view_store->href = trailingslashit($this->frontend_url) . 'en/shop';
            $wp_admin_bar->add_node((array) $view_store);
        }

        global $post;
        if ($post && is_admin()) {
            $view_node = $wp_admin_bar->get_node('view');
            if ($view_node) {
                $path = $this->get_frontend_path_for_post($post);
                if ($path) {
                    $view_node->href = trailingslashit($this->frontend_url) . ltrim($path, '/');
                    $wp_admin_bar->add_node((array) $view_node);
                }
            }
        }
    }

    public function rewrite_wc_product_permalink($permalink, $product) {
        if (!is_admin()) return $permalink;

        $slug = $product->get_slug();
        if ($slug) {
            return trailingslashit($this->frontend_url) . 'en/product/' . $slug;
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
            return trailingslashit($this->frontend_url) . 'en/product/' . $slug;
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
            return trailingslashit($this->frontend_url) . 'en/product/' . $slug;
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
            return trailingslashit($this->frontend_url) . 'en/product/' . $slug;
        }
        return $value;
    }
}

new sasanperfumes_Frontend_Urls();
