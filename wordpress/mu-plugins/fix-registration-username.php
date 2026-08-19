<?php
/**
 * Plugin Name: Fix registration username
 * Description: The storefront registers customers with their email as the WordPress
 *              username. WordPress rejects usernames that do not survive
 *              sanitize_user($value, true) — plus-addressed emails such as
 *              name+tag@example.com in particular — so WooCommerce answers
 *              "Please provide a valid account username." and registration fails.
 *
 *              This normalises the username on the incoming REST request to
 *              /sasanperfumes/v1/customers/ensure before the plugin handler reads it.
 *
 *              Mirrors the upstream fix in commit 82d2fc0. Implemented as an
 *              mu-plugin so it survives re-uploads of the anbar-frontend-settings
 *              plugin; remove this file once that plugin ships the fix itself.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Produces a username WordPress will accept, preferring the supplied one.
 */
function sasan_resolve_valid_wp_username( $username, $email ) {
	$desired = '' !== trim( (string) $username ) ? trim( (string) $username ) : (string) $email;

	if ( ! validate_username( $desired ) ) {
		$desired = function_exists( 'wc_create_new_customer_username' )
			? wc_create_new_customer_username( (string) $email )
			: sanitize_user( (string) $email, true );
	}

	if ( '' === $desired || username_exists( $desired ) ) {
		$base    = '' !== $desired ? $desired : 'customer';
		$desired = $base . wp_rand( 100, 99999 );

		while ( username_exists( $desired ) ) {
			$desired = $base . wp_rand( 100, 99999 );
		}
	}

	return $desired;
}

add_filter(
	'rest_pre_dispatch',
	function ( $result, $server, $request ) {
		if ( null !== $result ) {
			return $result;
		}

		if ( ! $request instanceof WP_REST_Request || 'POST' !== $request->get_method() ) {
			return $result;
		}

		if ( false === strpos( (string) $request->get_route(), '/customers/ensure' ) ) {
			return $result;
		}

		$payload = $request->get_json_params();
		if ( ! is_array( $payload ) || ! empty( $payload['attach_only'] ) ) {
			return $result;
		}

		$email = isset( $payload['email'] ) ? (string) $payload['email'] : '';
		if ( ! is_email( $email ) ) {
			return $result;
		}

		// Only matters when the account is about to be created.
		if ( get_user_by( 'email', $email ) ) {
			return $result;
		}

		$username = isset( $payload['username'] ) ? (string) $payload['username'] : '';
		$resolved = sasan_resolve_valid_wp_username( $username, $email );

		if ( '' !== $resolved && $resolved !== $username ) {
			$payload['username'] = $resolved;
			$request->set_body( wp_json_encode( $payload ) );
		}

		return $result;
	},
	10,
	3
);
