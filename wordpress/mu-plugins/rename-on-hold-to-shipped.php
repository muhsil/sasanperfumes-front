<?php
/**
 * Plugin Name: Rename On Hold to Shipped (network-wide)
 * Description: Relabels the WooCommerce "On hold" order status as "Shipped" on
 *              every site in the network. Replaces the per-site WPCode snippet
 *              "Rename On Hold to Shipped", which only existed on the main site
 *              and so left /qa, /om and /sa showing "On hold".
 *
 * This only changes the label. The underlying status slug stays wc-on-hold, so
 * no order data is touched and the storefront (which already maps on-hold to
 * "Shipped") keeps working unchanged.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'wc_order_statuses',
	function ( $statuses ) {
		if ( isset( $statuses['wc-on-hold'] ) ) {
			$statuses['wc-on-hold'] = 'Shipped';
		}

		return $statuses;
	}
);

add_filter(
	'woocommerce_register_shop_order_post_statuses',
	function ( $statuses ) {
		if ( isset( $statuses['wc-on-hold'] ) ) {
			$statuses['wc-on-hold']['label'] = 'Shipped';

			$statuses['wc-on-hold']['label_count'] = _n_noop(
				'Shipped <span class="count">(%s)</span>',
				'Shipped <span class="count">(%s)</span>'
			);
		}

		return $statuses;
	}
);
