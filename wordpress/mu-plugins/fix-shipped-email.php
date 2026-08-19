<?php
/**
 * Plugin Name: Fix shipped order email
 * Description: The shipped email never sent. The plugin listens for a literal
 *              "shipped" order status, but this store has no such status — it
 *              relabels WooCommerce's on-hold as "Shipped". The two never met,
 *              so woocommerce_order_status_shipped never fired.
 *
 *              This bridges the gap: moving an order to on-hold ("Shipped")
 *              triggers the existing shipped-email handler, which keeps its own
 *              duplicate guard via _sasanperfumes_shipped_email_sent.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'woocommerce_order_status_changed',
	function ( $order_id, $from_status, $to_status, $order ) {
		if ( 'on-hold' !== $to_status || 'on-hold' === $from_status ) {
			return;
		}

		/**
		 * on-hold is also WooCommerce's "awaiting payment / manual review" state.
		 * Only treat it as "shipped" when the order arrives from a paid or
		 * fulfilled state, so a payment hold can never tell a customer their
		 * parcel is on its way.
		 */
		$shippable_from = array( 'processing', 'completed' );
		if ( ! in_array( $from_status, $shippable_from, true ) ) {
			return;
		}

		do_action( 'woocommerce_order_status_shipped', $order_id, $order );
	},
	30,
	4
);
