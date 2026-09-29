<?php
/**
 * Plugin Name: Sasan Perfumes - promotion window
 * Description: Holds the Buy 6 Get 1 Free promotion window and switches UAE free delivery off when it ends.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Free delivery runs alongside Buy 6 Get 1 Free, 29 September to 6 October 2026
 * inclusive, Dubai time.
 *
 * There is no crontab on this host, so nothing can be relied on to fire at the
 * closing moment. Instead the method is filtered out of the response the
 * storefront reads, which is evaluated on every request: the offer stops the
 * second the window closes whether or not anything ran on schedule, and the
 * WooCommerce setting is left untouched so it can be switched back on by hand.
 *
 * To run the promotion again, move PROMO_ENDS_AT and re-enable the method in
 * WooCommerce (UAE zone, "Free Delivery").
 */
const SASAN_PROMO_ENDS_AT   = '2026-10-06T23:59:59+04:00';
const SASAN_FREE_SHIP_ZONE  = 1;  // UAE
const SASAN_FREE_SHIP_INSTANCE = 4;

function sasan_promotion_has_ended() {
	return current_time( 'timestamp', true ) > strtotime( SASAN_PROMO_ENDS_AT );
}

/**
 * The storefront reads /wc/v3/shipping/zones/{id}/methods and offers whichever
 * methods come back enabled, so marking it disabled here is what actually takes
 * the option off the checkout.
 */
add_filter(
	'rest_request_after_callbacks',
	function ( $response, $handler, $request ) {
		if ( ! $response instanceof WP_REST_Response ) {
			return $response;
		}

		$route = $request->get_route();
		if ( false === strpos( $route, '/wc/v3/shipping/zones/' ) || false === strpos( $route, '/methods' ) ) {
			return $response;
		}

		if ( ! sasan_promotion_has_ended() ) {
			return $response;
		}

		$data = $response->get_data();
		if ( ! is_array( $data ) ) {
			return $response;
		}

		$changed = false;
		foreach ( $data as $index => $method ) {
			if ( ! is_array( $method ) ) {
				continue;
			}
			if ( 'free_shipping' === ( $method['method_id'] ?? '' )
				&& SASAN_FREE_SHIP_INSTANCE === (int) ( $method['instance_id'] ?? 0 ) ) {
				$data[ $index ]['enabled'] = false;
				$changed = true;
			}
		}

		if ( $changed ) {
			$response->set_data( $data );
		}

		return $response;
	},
	10,
	3
);

/** Belt and braces for anything that goes through WooCommerce's own cart. */
add_filter(
	'woocommerce_package_rates',
	function ( $rates ) {
		if ( ! sasan_promotion_has_ended() ) {
			return $rates;
		}
		foreach ( array_keys( $rates ) as $key ) {
			if ( 0 === strpos( $key, 'free_shipping:' . SASAN_FREE_SHIP_INSTANCE ) ) {
				unset( $rates[ $key ] );
			}
		}
		return $rates;
	},
	99
);
