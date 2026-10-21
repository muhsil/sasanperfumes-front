<?php
/**
 * Plugin Name: Sasan Perfumes - stock sync across translations
 * Description: Keeps a product's stock the same on every WPML translation of it.
 */

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce keeps stock on the post, so each WPML translation carries its own
 * figure. WooCommerce Multilingual is supposed to keep them level, but its
 * stock hook is not registered on the path an order takes: reducing stock the
 * way an order does moved the English product and left the Arabic one alone.
 * Measured on a matching pair — en 11 -> 10, ar stayed at 11.
 *
 * Left alone the gap widens with every sale. By the time this was written 74 of
 * 333 pairs disagreed, and on two of them the two languages disagreed about
 * whether the product could be sold at all: the English listing said out of
 * stock while the Arabic one carried on selling.
 *
 * Every order line in the database — all 5,758 of them — points at an English
 * product, so English is the figure that reflects reality and the one that is
 * copied outward.
 */

function sasan_sync_stock_to_translations( $product ) {
	static $syncing = false;

	// Writing to the twin fires this same hook; without this the two would
	// bounce the value between them.
	if ( $syncing ) {
		return;
	}

	if ( ! $product instanceof WC_Product ) {
		return;
	}

	$source_id = $product->get_id();
	$trid      = apply_filters( 'wpml_element_trid', null, $source_id, 'post_' . $product->get_type() );
	if ( ! $trid ) {
		$trid = apply_filters( 'wpml_element_trid', null, $source_id, 'post_product' );
	}
	if ( ! $trid ) {
		return;
	}

	$translations = apply_filters( 'wpml_get_element_translations', array(), $trid, 'post_product' );
	if ( ! is_array( $translations ) || count( $translations ) < 2 ) {
		return;
	}

	$stock        = $product->get_stock_quantity();
	$status       = $product->get_stock_status();
	$manage       = $product->get_manage_stock() ? 'yes' : 'no';
	$backorders   = $product->get_backorders();

	$syncing = true;

	foreach ( $translations as $translation ) {
		$target_id = (int) $translation->element_id;
		if ( ! $target_id || $target_id === $source_id ) {
			continue;
		}

		// Written as meta rather than through the product object so this does
		// not re-enter WooCommerce's own stock machinery for every twin.
		update_post_meta( $target_id, '_manage_stock', $manage );
		update_post_meta( $target_id, '_backorders', $backorders );
		update_post_meta( $target_id, '_stock_status', $status );
		if ( null === $stock ) {
			delete_post_meta( $target_id, '_stock' );
		} else {
			update_post_meta( $target_id, '_stock', wc_stock_amount( $stock ) );
		}

		wc_delete_product_transients( $target_id );
		wp_cache_delete( $target_id, 'post_meta' );
	}

	$syncing = false;
}

add_action( 'woocommerce_product_set_stock', 'sasan_sync_stock_to_translations', 20 );
add_action( 'woocommerce_variation_set_stock', 'sasan_sync_stock_to_translations', 20 );

/**
 * An edit in wp-admin changes stock without going through set_stock, so the
 * saved product is mirrored too.
 */
add_action(
	'woocommerce_update_product',
	function ( $product_id, $product = null ) {
		$product = $product instanceof WC_Product ? $product : wc_get_product( $product_id );
		if ( $product ) {
			sasan_sync_stock_to_translations( $product );
		}
	},
	20,
	2
);
