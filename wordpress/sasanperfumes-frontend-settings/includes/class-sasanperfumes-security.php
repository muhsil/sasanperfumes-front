<?php
/**
 * ShapeHive Security Hardening Module
 * 
 * Hardens the WordPress backend against common attacks:
 * - Blocks XML-RPC (brute force / DDoS vector)
 * - Disables REST API user enumeration
 * - Removes WordPress version fingerprinting
 * - Redirects WP frontend visitors to main site
 * - Adds noindex/nofollow to WP frontend (headless CMS should not be indexed)
 * - Disables file editing from admin
 * - Blocks author enumeration via ?author= queries
 * - Adds security headers to WP responses
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.10.0
 */

if (!defined('ABSPATH')) exit;

class sasanperfumes_Security {

    private $frontend_redirect_url = 'https://sasanperfumes.com';

    public function __construct() {
        $this->frontend_redirect_url = untrailingslashit(
            sasanperfumes_get_frontend_url($this->frontend_redirect_url)
        );

        $this->disable_xmlrpc();
        $this->hide_wp_version();
        $this->block_user_enumeration();
        $this->redirect_frontend();
        $this->noindex_wp_frontend();
        $this->disable_file_editing();
        $this->add_security_headers();
        $this->protect_login();
        $this->force_backend_admin_urls();
        $this->disable_unnecessary_features();
        $this->fix_admin_rest_url();
        $this->force_mail_from();
    }

    /**
     * Disable XML-RPC entirely (major attack vector for brute force and DDoS)
     */
    private function disable_xmlrpc() {
        add_filter('xmlrpc_enabled', '__return_false');

        add_filter('wp_headers', function($headers) {
            unset($headers['X-Pingback']);
            return $headers;
        });

        add_filter('xmlrpc_methods', function() {
            return array();
        });

        add_action('init', function() {
            if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'xmlrpc.php') !== false) {
                http_response_code(403);
                exit('Access denied.');
            }
        }, 1);
    }

    /**
     * Remove WordPress version from HTML, RSS, scripts, and styles
     */
    private function hide_wp_version() {
        remove_action('wp_head', 'wp_generator');

        add_filter('the_generator', '__return_empty_string');

        add_filter('style_loader_src', array($this, 'remove_version_query'), 10, 2);
        add_filter('script_loader_src', array($this, 'remove_version_query'), 10, 2);
    }

    public function remove_version_query($src, $handle) {
        if ($src && strpos($src, 'ver=' . get_bloginfo('version')) !== false) {
            $src = remove_query_arg('ver', $src);
        }
        return $src;
    }

    /**
     * Block user enumeration via REST API and ?author= queries
     */
    private function block_user_enumeration() {
        add_filter('rest_endpoints', function($endpoints) {
            if (isset($endpoints['/wp/v2/users'])) {
                unset($endpoints['/wp/v2/users']);
            }
            if (isset($endpoints['/wp/v2/users/(?P<id>[\d]+)'])) {
                unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
            }
            return $endpoints;
        });

        add_action('template_redirect', function() {
            if (isset($_GET['author']) && !is_admin()) {
                wp_redirect(home_url(), 301);
                exit;
            }
        });

        add_filter('redirect_canonical', function($redirect_url, $requested_url) {
            if (preg_match('/\?author=(\d+)/i', $requested_url)) {
                return home_url();
            }
            return $redirect_url;
        }, 10, 2);
    }

    /**
     * Redirect WP frontend visitors to the main Next.js site.
     * Admin, API, login, GraphQL, and cron requests are excluded.
     */
    private function redirect_frontend() {
        add_action('template_redirect', function() {
            if (is_admin()) return;
            if (defined('DOING_AJAX') && DOING_AJAX) return;
            if (defined('DOING_CRON') && DOING_CRON) return;
            if (defined('REST_REQUEST') && REST_REQUEST) return;
            if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) return;

            $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
            if ($this->is_backend_request_uri($uri)) {
                return;
            }
            $path = parse_url((string) $uri, PHP_URL_PATH);
            $query = array();
            parse_str((string) parse_url((string) $uri, PHP_URL_QUERY), $query);

            if (
                !empty($query['pay_for_order']) ||
                strpos((string) $path, '/checkout/order-pay') === 0 ||
                strpos((string) $path, '/checkout/order-received') === 0 ||
                strpos((string) $path, '/order-pay') === 0 ||
                strpos((string) $path, '/wc-api') === 0
            ) {
                return;
            }

            if (
                strpos($uri, '/wp-admin') !== false ||
                strpos($uri, '/wp-login') !== false ||
                strpos($uri, '/wp-json') !== false ||
                strpos($uri, '/graphql') !== false ||
                strpos($uri, 'wc-auth') !== false ||
                strpos($uri, 'wp-cron') !== false
            ) {
                return;
            }

            wp_redirect($this->frontend_redirect_url, 301);
            exit;
        }, 1);
    }

    /**
     * Force backend/admin/login URLs to stay on the CMS host instead of the storefront.
     *
     * This keeps wp-admin and wp-login.php isolated on the WordPress backend even when
     * the storefront URL is configured to a separate frontend domain.
     */
    private function force_backend_admin_urls() {
        $build_backend_base = function(): string {
            $scheme = 'https';
            $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
            $host = is_array($host) ? '' : trim(explode(',', (string) $host)[0]);
            if ($host === '') {
                return '';
            }

            $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
            $request_path = parse_url($request_uri, PHP_URL_PATH) ?: '/';
            $normalized = $host . ($request_path ? $request_path : '');

            if (function_exists('sasanperfumes_normalize_frontend_host_with_market')) {
                $normalized = sasanperfumes_normalize_frontend_host_with_market($normalized);
            } else {
                $normalized = preg_replace('/^www\./', '', strtolower($host));
            }

            if ($normalized === '') {
                return '';
            }

            return untrailingslashit($scheme . '://' . $normalized);
        };

        $build_site_url = function(string $path = '') use ($build_backend_base): string {
            $base = $build_backend_base();
            if ($base === '') {
                return '';
            }

            return trailingslashit($base) . ltrim($path, '/');
        };

        $is_backend_context = function(): bool {
            if (is_admin()) {
                return true;
            }

            $uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
            return $this->is_backend_request_uri($uri);
        };

        add_filter('site_url', function($url, $path = '', $scheme = null, $blog_id = null) use ($build_site_url, $is_backend_context) {
            if (!$is_backend_context()) {
                return $url;
            }

            $backend_url = $build_site_url((string) $path);
            return $backend_url !== '' ? $backend_url : $url;
        }, 10, 4);

        add_filter('network_site_url', function($url, $path = '', $scheme = null) use ($build_site_url, $is_backend_context) {
            if (!$is_backend_context()) {
                return $url;
            }

            $backend_url = $build_site_url((string) $path);
            return $backend_url !== '' ? $backend_url : $url;
        }, 10, 3);

        add_filter('login_url', function($login_url, $redirect = '', $force_reauth = false) use ($build_site_url, $is_backend_context) {
            if (!$is_backend_context()) {
                return $login_url;
            }

            $backend_login = $build_site_url('wp-login.php');
            if ($backend_login === '') {
                return $login_url;
            }

            if (!empty($redirect)) {
                $backend_login = add_query_arg('redirect_to', $redirect, $backend_login);
            }

            if ($force_reauth) {
                $backend_login = add_query_arg('reauth', '1', $backend_login);
            }

            return $backend_login;
        }, 10, 3);
    }

    /**
     * Add noindex/nofollow to WP frontend since it is used as headless CMS only.
     * The Next.js frontend handles all public-facing SEO.
     */
    private function noindex_wp_frontend() {
        add_action('wp_head', function() {
            if (!is_admin()) {
                echo '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">' . "\n";
            }
        }, 1);

        add_filter('wp_robots', function($robots) {
            if (!is_admin()) {
                $robots['noindex'] = true;
                $robots['nofollow'] = true;
                $robots['noarchive'] = true;
                $robots['nosnippet'] = true;
            }
            return $robots;
        });

        add_action('send_headers', function() {
            if (!is_admin() && !wp_doing_ajax()) {
                header('X-Robots-Tag: noindex, nofollow, noarchive', true);
            }
        });

        add_filter('wp_sitemaps_enabled', '__return_false');
    }

    /**
     * Disable file editing from WordPress admin panel
     */
    private function disable_file_editing() {
        if (!defined('DISALLOW_FILE_EDIT')) {
            define('DISALLOW_FILE_EDIT', true);
        }
    }

    /**
     * Add security headers to WordPress responses
     */
    private function add_security_headers() {
        add_action('send_headers', function() {
            if (!headers_sent()) {
                header('X-Frame-Options: SAMEORIGIN');
                header('X-Content-Type-Options: nosniff');
                header('X-XSS-Protection: 1; mode=block');
                header('Referrer-Policy: strict-origin-when-cross-origin');
                header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

                if (is_ssl()) {
                    header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
                }
            }
        });
    }

    /**
     * Add login page security (obfuscate errors, noindex login page)
     */
    private function protect_login() {
        add_filter('login_errors', function() {
            return 'Invalid credentials. Please try again.';
        });

        add_action('login_head', function() {
            echo '<meta name="robots" content="noindex, nofollow">' . "\n";
        });
    }

    /**
     * Enforce the storefront sender for all WordPress and WooCommerce outbound emails
     * so login and OTP-style flows consistently use the requested address.
     */
    private function force_mail_from() {
        add_filter('wp_mail_from', function() {
            return 'support@sasanperfumes.com';
        }, 999);

        add_filter('wp_mail_from_name', function($name) {
            return trim((string) $name) !== '' ? $name : 'Sasan Perfumes';
        }, 999);
    }

    /**
     * Fix REST API URL in admin context for headless setups.
     *
     * When WordPress 'home' (Site Address) differs from 'siteurl' (WordPress Address),
     * WooCommerce admin JS constructs REST API URLs using home_url(), which points to
     * the Next.js frontend (e.g. sasanperfumes.com). Since the admin is served from
     * the WordPress backend (cms.sasanperfumes.com), these cross-origin requests are
     * blocked by the browser's CORS policy, breaking Analytics and other admin features.
     *
     * This filter forces admin REST API URLs to use siteurl instead of home.
     */
    private function fix_admin_rest_url() {
        add_filter('rest_url', function($url) {
            if (is_admin() && !wp_doing_ajax()) {
                $home = untrailingslashit(home_url());
                $site = untrailingslashit(site_url());
                if ($home !== $site) {
                    $url = str_replace($home, $site, $url);
                }
            }
            return $url;
        });
    }

    /**
     * Disable unnecessary WordPress features that expand attack surface
     */
    private function disable_unnecessary_features() {
        remove_action('wp_head', 'rsd_link');
        remove_action('wp_head', 'wlwmanifest_link');
        remove_action('wp_head', 'wp_shortlink_wp_head');
        remove_action('wp_head', 'rest_output_link_wp_head');
        remove_action('wp_head', 'wp_oembed_add_discovery_links');
        remove_action('wp_head', 'wp_oembed_add_host_js');
        remove_action('wp_head', 'feed_links', 2);
        remove_action('wp_head', 'feed_links_extra', 3);

        add_filter('emoji_svg_url', '__return_false');
        remove_action('wp_head', 'print_emoji_detection_script', 7);
        remove_action('wp_print_styles', 'print_emoji_styles');
        remove_action('admin_print_scripts', 'print_emoji_detection_script');
        remove_action('admin_print_styles', 'print_emoji_styles');
    }
}

new sasanperfumes_Security();
