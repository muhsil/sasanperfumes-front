<?php
/**
 * Plugin Name: Sasan Perfumes - promotion window
 * Description: Keeps UAE free delivery in step with the Buy 6 Get 1 Free offer's own dates.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Free delivery runs alongside Buy 6 Get 1 Free, so it ends when that offer
 * ends — and the offer's dates are set in wp-admin under the discount rules,
 * not here. An end date written into this file would quietly overrule whatever
 * was set on the screen: extend the offer to the 12th and delivery would still
 * start being charged on the 6th, with nothing to show why.
 *
 * There is no crontab on this host, so rather than relying on something firing
 * at the closing moment this is evaluated on every request.
 */
const SASAN_FREE_SHIP_INSTANCE = 4;  // UAE zone, free_shipping

/**
 * The latest date any live Buy 6 Get 1 Free rule runs to, or null when none is
 * running. Dates are stored as a bare Y-m-d and mean the whole of that day in
 * Dubai, matching the storefront and the admin screen's date picker.
 */
function sasan_promotion_is_running() {
	$rules = get_option( 'shapehive_discount_rules' );
	if ( ! is_array( $rules ) ) {
		return false;
	}

	$today = current_time( 'Y-m-d' );

	foreach ( $rules as $rule ) {
		if ( 'bogo' !== ( $rule['type'] ?? '' ) ) {
			continue;
		}
		if ( isset( $rule['enabled'] ) && ! $rule['enabled'] ) {
			continue;
		}

		$start = $rule['start_date'] ?? '';
		$end   = $rule['end_date'] ?? '';

		if ( '' !== $start && $today < $start ) {
			continue;
		}
		if ( '' !== $end && $today > $end ) {
			continue;
		}

		return true;
	}

	return false;
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

		if ( sasan_promotion_is_running() ) {
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
		if ( sasan_promotion_is_running() ) {
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
