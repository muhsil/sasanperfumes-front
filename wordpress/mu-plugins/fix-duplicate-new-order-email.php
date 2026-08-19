<?php
/**
 * Plugin Name: Fix duplicate new order email
 * Description: Every order produced two "New order" admin emails.
 *
 *              WooCommerce sends it via WC_Email_New_Order::trigger, and WPML's
 *              WooCommerce Multilingual then re-sends the same email once per
 *              admin recipient in that recipient's own language
 *              (WCML_Emails::new_order_admin_email, which whitelists itself
 *              through the woocommerce_new_order_email_allows_resend filter).
 *
 *              Both are registered on the same notification hooks, so the admin
 *              receives duplicates. WooCommerce's own trigger is kept — it uses
 *              the site's admin-new-order template — and the WCML resend is
 *              removed. Admin notifications now arrive once, in the site's
 *              default language.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'init',
	function () {
		global $wp_filter;

		$hooks = array(
			'woocommerce_order_status_pending_to_processing_notification',
			'woocommerce_order_status_pending_to_on-hold_notification',
			'woocommerce_order_status_pending_to_completed_notification',
			'woocommerce_order_status_failed_to_processing_notification',
			'woocommerce_order_status_failed_to_completed_notification',
			'woocommerce_order_status_failed_to_on-hold_notification',
		);

		foreach ( $hooks as $hook ) {
			if ( ! isset( $wp_filter[ $hook ] ) ) {
				continue;
			}

			foreach ( $wp_filter[ $hook ]->callbacks as $priority => $callbacks ) {
				foreach ( $callbacks as $key => $callback ) {
					if ( ! is_array( $callback['function'] ) || ! is_object( $callback['function'][0] ) ) {
						continue;
					}

					if ( 'WCML_Emails' === get_class( $callback['function'][0] )
						&& 'new_order_admin_email' === $callback['function'][1] ) {
						$wp_filter[ $hook ]->remove_filter( $hook, $callback['function'], $priority );
					}
				}
			}
		}
	},
	9999
);
