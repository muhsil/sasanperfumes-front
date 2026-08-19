<?php
/**
 * Plugin Name: Hide noisy order notes
 * Description: Keeps the order notes panel to what a human actually needs —
 *              status changes, customer notes and notes written by staff.
 *              Hides the machine-generated noise: stock level adjustments and
 *              WooCommerce's own "Email ... sent" confirmations.
 *
 *              Display only. Nothing is deleted, and the notes remain in the
 *              database, so they can still be read if a problem needs tracing.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Patterns for the generated notes to hide.
 *
 * The "Email ..." pattern deliberately requires the quoted form WooCommerce
 * uses ( Email "New order" sent. ) so that the plugin's own
 * "Shipped email sent to <address>." note stays visible — that one is the only
 * record that a shipped notification actually reached the customer.
 */
function sasan_noisy_order_note_patterns() {
	return array(
		'/^Stock levels? (reduced|increased|restored)/i',
		'/^Item .* stock (increased|reduced)/i',
		'/^Email\s+"[^"]*"\s+sent/i',
	);
}

function sasan_is_noisy_order_note( $content ) {
	$content = trim( wp_strip_all_tags( (string) $content ) );

	foreach ( sasan_noisy_order_note_patterns() as $pattern ) {
		if ( preg_match( $pattern, $content ) ) {
			return true;
		}
	}

	return false;
}

add_filter(
	'the_comments',
	function ( $comments, $query = null ) {
		if ( ! is_admin() || ! is_array( $comments ) ) {
			return $comments;
		}

		$filtered = array();

		foreach ( $comments as $comment ) {
			if ( isset( $comment->comment_type ) && 'order_note' === $comment->comment_type
				&& sasan_is_noisy_order_note( $comment->comment_content ) ) {
				continue;
			}

			$filtered[] = $comment;
		}

		return $filtered;
	},
	10,
	2
);
