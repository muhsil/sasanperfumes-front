<?php
/**
 * Plugin Name: Sasan Perfumes - storefront revalidation
 * Description: Tells the storefront to drop its cache when content changes here.
 */

defined( 'ABSPATH' ) || exit;

/**
 * The storefront caches what it reads from WordPress for ten minutes, so an
 * edit made here did not show until that expired — a banner changed in the
 * morning was still the old one ten minutes later, with nothing to say why.
 *
 * It exposes /api/revalidate for exactly this, guarded by a shared secret. The
 * secret lives in the storefront's own environment file and is read from
 * wp-config here, so it is not written into this plugin.
 *
 * Fired on a shutdown hook so the editor's save returns immediately and a slow
 * or unreachable storefront can never block saving in wp-admin.
 */

const SASAN_REVALIDATE_ENDPOINT = 'https://sasanperfumes.com/api/revalidate';

function sasan_revalidate_token() {
	if ( defined( 'SASAN_REVALIDATE_TOKEN' ) && SASAN_REVALIDATE_TOKEN ) {
		return SASAN_REVALIDATE_TOKEN;
	}
	return (string) get_option( 'sasan_revalidate_token', '' );
}

function sasan_queue_revalidation( $type = 'all', $slug = null ) {
	if ( ! sasan_revalidate_token() ) {
		return;
	}

	$GLOBALS['sasan_revalidate_queued'] = $GLOBALS['sasan_revalidate_queued'] ?? array();
	$GLOBALS['sasan_revalidate_queued'][ $type . '|' . (string) $slug ] = array( $type, $slug );

	if ( ! has_action( 'shutdown', 'sasan_send_revalidation' ) ) {
		add_action( 'shutdown', 'sasan_send_revalidation', 99 );
	}
}

function sasan_send_revalidation() {
	$queued = $GLOBALS['sasan_revalidate_queued'] ?? array();
	if ( ! $queued ) {
		return;
	}
	$GLOBALS['sasan_revalidate_queued'] = array();

	foreach ( $queued as $entry ) {
		list( $type, $slug ) = $entry;

		$body = array( 'type' => $type );
		if ( $slug ) {
			$body['slug'] = $slug;
		}

		wp_remote_post(
			SASAN_REVALIDATE_ENDPOINT,
			array(
				// Fire and forget: the editor is already done, and a storefront
				// that is slow to answer must not hold up wp-admin.
				'blocking'  => false,
				'timeout'   => 2,
				'headers'   => array(
					'Content-Type'       => 'application/json',
					'x-revalidate-token' => sasan_revalidate_token(),
				),
				'body'      => wp_json_encode( $body ),
			)
		);
	}
}

/* ---------- what counts as a change ---------- */

add_action( 'save_post', function ( $post_id, $post ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	if ( 'auto-draft' === $post->post_status ) {
		return;
	}

	if ( 'product' === $post->post_type ) {
		sasan_queue_revalidation( 'products', $post->post_name );
		return;
	}
	if ( 'page' === $post->post_type || 'post' === $post->post_type ) {
		sasan_queue_revalidation( 'pages', $post->post_name );
		return;
	}

	sasan_queue_revalidation( 'all' );
}, 10, 2 );

add_action( 'edited_product_cat', function () { sasan_queue_revalidation( 'categories' ); } );
add_action( 'created_product_cat', function () { sasan_queue_revalidation( 'categories' ); } );
add_action( 'woocommerce_product_set_stock', function () { sasan_queue_revalidation( 'products' ); } );
add_action( 'woocommerce_variation_set_stock', function () { sasan_queue_revalidation( 'products' ); } );

/**
 * Everything the settings screens write goes through theme mods and options,
 * and those are what the home page, header, footer and the promotion rules are
 * built from — the slowest things to appear and the ones most often edited.
 */
add_action( 'updated_option', function ( $option ) {
	if ( 0 === strpos( $option, 'sasanperfumes_' )
		|| 0 === strpos( $option, 'anbar_' )
		|| 0 === strpos( $option, 'asl_' )
		|| 0 === strpos( $option, 'shapehive_' )
		|| 0 === strpos( $option, 'theme_mods_' ) ) {
		sasan_queue_revalidation( 'all' );
	}
} );
