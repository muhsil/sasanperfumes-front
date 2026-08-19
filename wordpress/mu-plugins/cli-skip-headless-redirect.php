<?php
/**
 * Plugin Name: Skip headless redirect under WP-CLI
 * Description: sasanperfumes_Frontend_Urls redirects any request that is not
 *              admin/ajax/cron to the headless storefront. WP-CLI is none of
 *              those, so every CLI command that loads the plugin was redirected
 *              and aborted — which silently prevented plugin-provided hooks
 *              (order emails, for example) from running.
 *
 *              The plugin already exempts backend request URIs, so this marks
 *              CLI runs as one. Only affects WP-CLI; web requests are untouched.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Unconditional under WP-CLI: --url populates REQUEST_URI with the site path
 * (e.g. /om/), which the plugin treats as a public front-end request and
 * redirects. A CLI run has no meaningful request URI, so mark it as backend.
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	$_SERVER['REQUEST_URI'] = '/wp-admin/';
}
