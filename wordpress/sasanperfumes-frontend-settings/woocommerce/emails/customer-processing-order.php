<?php
/**
 * Customer processing order email - Sasan Perfumes Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/customer-processing-order.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

defined( 'ABSPATH' ) || exit;

// Frontend app URL for headless setup
$frontend_url = function_exists('sasanperfumes_get_frontend_url') ? sasanperfumes_get_frontend_url() : get_site_url();
$order_url = sasanperfumes_build_frontend_localized_url('en', 'account/orders/' . $order->get_id() . '/');

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #c0392b; margin: 0 0 15px 0;">Hi <?php echo esc_html( $order->get_billing_first_name() ); ?>,</p>

<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #c0392b; margin: 0 0 15px 0;">
	<?php
	printf(
		/* translators: %s: Site title */
		esc_html__( 'Just to let you know â€” we\'ve received your order #%1$s, and it is now being processed at %2$s.', 'woocommerce' ),
		$order->get_order_number(),
		esc_html( get_bloginfo( 'name', 'display' ) )
	);
	?>
</p>

<hr class="divider" style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Order number:', 'woocommerce' ); ?></p>
<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px 0;">
	<a href="<?php echo esc_url( $order_url ); ?>" class="link" style="color: #1a1a1a; text-decoration: underline; font-weight: 500;">#<?php echo esc_html( $order->get_order_number() ); ?></a>
</p>

<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Order date:', 'woocommerce' ); ?></p>
<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px 0;"><?php echo esc_html( wc_format_datetime( $order->get_date_created() ) ); ?></p>

<p style="margin: 20px 0;">
	<a href="<?php echo esc_url( $order_url ); ?>" class="button" style="display: inline-block; padding: 14px 28px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;"><?php esc_html_e( 'View your order', 'woocommerce' ); ?></a>
</p>

<?php

/*
 * @hooked WC_Emails::order_details() Shows the order details table.
 * @hooked WC_Structured_Data::generate_order_data() Generates structured data.
 * @hooked WC_Structured_Data::output_structured_data() Outputs structured data.
 */
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );

/*
 * @hooked WC_Emails::order_meta() Shows order meta data.
 */
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );

/*
 * @hooked WC_Emails::customer_details() Shows customer details
 * @hooked WC_Emails::email_address() Shows email address
 */
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

/**
 * Show user-defined additional content - this is set in each email's settings.
 */
if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

/*
 * @hooked WC_Emails::email_footer() Output the email footer
 */
do_action( 'woocommerce_email_footer', $email );
