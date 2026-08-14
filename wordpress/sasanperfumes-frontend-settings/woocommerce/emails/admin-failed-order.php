<?php
/**
 * Admin failed order email - Sasan Perfumes Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/admin-failed-order.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

defined( 'ABSPATH' ) || exit;

// Frontend app URL for headless setup
$frontend_url = function_exists( 'sasanperfumes_get_frontend_url' ) ? sasanperfumes_get_frontend_url( 'https://sasanperfumes.com' ) : 'https://sasanperfumes.com';
$order_url = $frontend_url . '/en/account/orders/' . $order->get_id() . '/';
$admin_order_url = $order->get_edit_order_url();

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<div class="admin-status admin-status--failed" style="background-color:#fff4f3; border-left:4px solid #b42318; color:#26231f; font-size:14px; line-height:1.6; margin:0 0 22px; padding:14px 16px;">
	<?php
	printf(
		/* translators: %1$s: Order number. %2$s: Customer full name. */
		esc_html__( 'Payment for order #%1$s from %2$s has failed.', 'woocommerce' ),
		$order->get_order_number(),
		$order->get_formatted_billing_full_name()
	);
	?>
</div>

<!-- Manage Order Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
	<tr>
		<td align="left">
			<a class="button" href="<?php echo esc_url( $admin_order_url ); ?>" style="background-color:#b42318; border-radius:3px; color:#ffffff; display:inline-block; font-size:13px; font-weight:700; padding:13px 22px; text-decoration:none;">
				<?php esc_html_e( 'Manage this order', 'woocommerce' ); ?>
			</a>
		</td>
	</tr>
</table>

<hr class="divider" style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

<table class="admin-summary" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#faf9f7; border:1px solid #dedbd5; margin:0 0 22px;">
	<tr>
		<td width="50%" valign="top" style="padding-right: 10px;">
			<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Order number:', 'woocommerce' ); ?></p>
			<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0;">
				<a href="<?php echo esc_url( $admin_order_url ); ?>" class="link" style="color: #1a1a1a; text-decoration: underline; font-weight: 500;">#<?php echo esc_html( $order->get_order_number() ); ?></a>
			</p>
		</td>
		<td width="50%" valign="top" style="padding-left: 10px;">
			<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Order date:', 'woocommerce' ); ?></p>
			<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0;"><?php echo esc_html( wc_format_datetime( $order->get_date_created() ) ); ?></p>
		</td>
	</tr>
	<tr>
		<td width="50%" valign="top" style="padding:12px 14px;">
			<p class="username-label" style="font-size:12px; color:#77736c; margin:0 0 5px; text-transform:uppercase;"><?php esc_html_e( 'Payment method:', 'woocommerce' ); ?></p>
			<p class="username-value" style="font-size:14px; font-weight:700; color:#171614; margin:0;"><?php echo wp_kses_post( $order->get_payment_method_title() ); ?></p>
		</td>
		<td width="50%" valign="top" style="padding:12px 14px;">
			<p class="username-label" style="font-size:12px; color:#77736c; margin:0 0 5px; text-transform:uppercase;"><?php esc_html_e( 'Order total:', 'woocommerce' ); ?></p>
			<p class="username-value" style="font-size:14px; font-weight:700; color:#171614; margin:0;"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></p>
		</td>
	</tr>
</table>

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
