<?php
/**
 * Plugin Name: Sasan Perfumes - CoCart coupon endpoints
 * Description: Applies and removes coupons on the CoCart cart the storefront actually uses.
 */

defined( 'ABSPATH' ) || exit;

/**
 * CoCart v2 ships no coupon endpoints, so the storefront applied coupons through
 * the WooCommerce Store API instead. That opens a separate cart: the Store API
 * request carried no cart identity, so every attempt created a fresh empty cart,
 * applied the coupon to it, and threw it away. The CoCart cart the customer was
 * actually shopping with never saw a discount, which is why coupon requests
 * returned success with discount_total 0 and no coupon ever recorded a use.
 *
 * These routes live in the cocart/v2 namespace on purpose: CoCart decides whether
 * to install its session handler by looking for "cocart/" in the request URI, so
 * registering here means WC()->cart is the caller's real cart, resolved from the
 * same cart_key the rest of the storefront already sends.
 */
add_action(
	'rest_api_init',
	function () {
		$shared = array(
			'methods'             => 'POST',
			'permission_callback' => '__return_true',
			'args'                => array(
				'code' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'wc_format_coupon_code',
				),
			),
		);

		register_rest_route(
			'cocart/v2',
			'/cart/apply-coupon',
			array_merge( $shared, array( 'callback' => 'sasanperfumes_cocart_apply_coupon' ) )
		);

		register_rest_route(
			'cocart/v2',
			'/cart/remove-coupon',
			array_merge( $shared, array( 'callback' => 'sasanperfumes_cocart_remove_coupon' ) )
		);
	}
);

function sasanperfumes_cocart_prepare_cart() {
	if ( ! function_exists( 'WC' ) ) {
		return false;
	}
	if ( null === WC()->cart && function_exists( 'wc_load_cart' ) ) {
		wc_load_cart();
	}
	if ( null === WC()->cart ) {
		return false;
	}

	// Force the cart to hydrate from the session before anything reads it.
	// WC()->cart exists on a REST request but starts empty, so without this
	// get_applied_coupons() reported no coupons at all: the one-at-a-time rule
	// found nothing to replace, and removing a coupon removed it from an empty
	// in-memory cart while the stored one came back on the next read.
	WC()->cart->get_cart();

	return true;
}

/**
 * Runs a callback in the blog CoCart booted on.
 *
 * CoCart reads the session through a table name captured when it loaded, but
 * writes it with "{$wpdb->prefix}cocart_carts" resolved at the moment of the
 * write. Requests for /qa, /om and /sa are switched to their own blog before
 * the route runs, so a save made during the request went to a per-market table
 * that does not exist. The query failed silently, CoCart marked the session
 * clean, and the shutdown save then skipped it: the coupon applied, the
 * response showed the discount, and the next read of the cart had no coupon at
 * all. Items were unaffected because CoCart saves those at shutdown, by which
 * point the blog has already been restored.
 */
function sasanperfumes_cocart_with_session_blog( callable $callback ) {
	$switched = ! empty( $GLOBALS['sh_rest_blog_switched'] ) ? (int) $GLOBALS['sh_rest_blog_switched'] : 0;

	if ( ! $switched ) {
		return $callback();
	}

	restore_current_blog();
	try {
		return $callback();
	} finally {
		switch_to_blog( $switched );
	}
}

function sasanperfumes_cocart_persist_cart() {
	WC()->cart->calculate_totals();

	if ( WC()->session ) {
		// Write the coupon list back explicitly. Applying a coupon persists on
		// its own because WooCommerce recalculates inside apply_coupon, but
		// remove_coupon only mutates the in-memory cart, so removals were lost
		// the moment the session reloaded - a removed coupon came straight back,
		// and the one-coupon-at-a-time rule could never take effect because the
		// codes it dropped were never actually gone.
		WC()->session->set( 'applied_coupons', array_values( WC()->cart->get_applied_coupons() ) );
		sasanperfumes_cocart_with_session_blog(
			static function () {
				WC()->session->save_data();
			}
		);
	}
}

function sasanperfumes_cocart_cart_payload() {
	sasanperfumes_cocart_persist_cart();

	$decimals = wc_get_price_decimals();

	return array(
		'success'        => true,
		'coupons'        => array_values( WC()->cart->get_applied_coupons() ),
		'discount_total' => wc_format_decimal( WC()->cart->get_discount_total(), $decimals ),
		'subtotal'       => wc_format_decimal( WC()->cart->get_subtotal(), $decimals ),
		'total'          => wc_format_decimal( WC()->cart->get_total( 'edit' ), $decimals ),
	);
}

function sasanperfumes_cocart_apply_coupon( WP_REST_Request $request ) {
	if ( ! sasanperfumes_cocart_prepare_cart() ) {
		return new WP_Error( 'sasanperfumes_no_cart', 'Cart is not available.', array( 'status' => 500 ) );
	}

	$code = wc_format_coupon_code( $request->get_param( 'code' ) );

	// Re-applying an already applied coupon is not an error worth surfacing.
	if ( WC()->cart->has_discount( $code ) ) {
		return rest_ensure_response( sasanperfumes_cocart_cart_payload() );
	}

	// Coupons are per blog in multisite, so a code that exists on one market
	// store is genuinely absent on another. Say so plainly.
	$coupon = new WC_Coupon( $code );
	if ( ! $coupon->get_id() ) {
		return new WP_Error(
			'sasanperfumes_coupon_not_found',
			sprintf( 'Coupon "%s" does not exist in this store.', $code ),
			array( 'status' => 404 )
		);
	}

	// One coupon at a time. Enforced here rather than through each coupon's
	// individual_use flag so the rule holds for every coupon, including ones
	// added later by someone who does not know to tick that box. The existing
	// codes are only dropped once the new one is known to exist, so a typo
	// cannot cost the customer the discount they already had.
	$previous = WC()->cart->get_applied_coupons();
	foreach ( $previous as $existing ) {
		WC()->cart->remove_coupon( $existing );
	}

	$applied = WC()->cart->apply_coupon( $code );

	if ( ! $applied ) {
		// WooCommerce reports why it refused through the notice store. Read it
		// before restoring, or the restore's own notices would be reported
		// instead of the actual reason this code was rejected.
		$notices = wc_get_notices( 'error' );
		$message = ! empty( $notices ) ? wp_strip_all_tags( $notices[0]['notice'] ) : 'Coupon could not be applied.';
		wc_clear_notices();

		// Put back whatever was there before, so a rejected code leaves the
		// basket exactly as it was found.
		foreach ( $previous as $existing ) {
			WC()->cart->apply_coupon( $existing );
		}
		wc_clear_notices();
		sasanperfumes_cocart_persist_cart();

		return new WP_Error( 'sasanperfumes_coupon_rejected', $message, array( 'status' => 400 ) );
	}

	wc_clear_notices();

	return rest_ensure_response( sasanperfumes_cocart_cart_payload() );
}

function sasanperfumes_cocart_remove_coupon( WP_REST_Request $request ) {
	if ( ! sasanperfumes_cocart_prepare_cart() ) {
		return new WP_Error( 'sasanperfumes_no_cart', 'Cart is not available.', array( 'status' => 500 ) );
	}

	WC()->cart->remove_coupon( wc_format_coupon_code( $request->get_param( 'code' ) ) );
	wc_clear_notices();

	return rest_ensure_response( sasanperfumes_cocart_cart_payload() );
}
