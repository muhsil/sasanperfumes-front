<?php
/**
 * Customer invoice email - Sasan Perfumes Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/customer-invoice.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

defined( 'ABSPATH' ) || exit;

// Frontend app URL for headless setup
$frontend_url = function_exists( 'sasanperfumes_get_frontend_url' ) ? sasanperfumes_get_frontend_url( 'https://sasanperfumes.com' ) : 'https://sasanperfumes.com';
$order_url = $frontend_url . '/en/account/orders/' . $order->get_id() . '/';
$checkout_url = $frontend_url . '/en/checkout/';

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="font-size: 14px; line-height: 1.7; color: #333333; margin: 0 0 15px 0;">Hi <?php echo esc_html( $order->get_billing_first_name() ); ?>,</p>

<?php if ( $order->has_status( 'pending' ) ) : ?>
<p style="font-size: 14px; line-height: 1.7; color: #333333; margin: 0 0 15px 0;">
	<?php
	printf(
		esc_html__( 'An order has been created for you on %2$s. Your invoice is below, with a link to make payment when you\'re ready:', 'woocommerce' ),
		$order->get_order_number(),
		esc_html( get_bloginfo( 'name', 'display' ) )
	);
	?>
</p>

<p style="margin: 20px 0;">
	<a href="<?php echo esc_url( $checkout_url ); ?>" style="display: inline-block; padding: 14px 28px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
		<?php esc_html_e( 'Pay for this order', 'woocommerce' ); ?>
	</a>
</p>

<?php else : ?>
<p style="font-size: 14px; line-height: 1.7; color: #333333; margin: 0 0 15px 0;">
	<?php
	printf(
		esc_html__( 'Here are the details of your order #%1$s placed on %2$s:', 'woocommerce' ),
		$order->get_order_number(),
		esc_html( get_bloginfo( 'name', 'display' ) )
	);
	?>
</p>
<?php endif; ?>

<!-- Invoice Card -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border: 1px solid #e0e0e0;">
	<!-- Invoice Header -->
	<tr>
		<td style="background-color: #1a1a1a; padding: 20px 25px;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
				<tr>
					<td style="color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">
						INVOICE
					</td>
					<td align="right" style="color: #ffffff; font-size: 14px;">
						#<?php echo esc_html( $order->get_order_number() ); ?>
					</td>
				</tr>
			</table>
		</td>
	</tr>
	<!-- Invoice Meta -->
	<tr>
		<td style="padding: 20px 25px; background-color: #f8f8f8; border-bottom: 1px solid #e0e0e0;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
				<tr>
					<td width="50%" valign="top">
						<p style="margin: 0 0 4px 0; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Order Date</p>
						<p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;"><?php echo esc_html( wc_format_datetime( $order->get_date_created() ) ); ?></p>
					</td>
					<td width="50%" valign="top" align="right">
						<p style="margin: 0 0 4px 0; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</p>
						<p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;"><?php echo esc_html( $order->get_payment_method_title() ); ?></p>
					</td>
				</tr>
			</table>
		</td>
	</tr>
	<!-- Billing / Shipping -->
	<tr>
		<td style="padding: 20px 25px; border-bottom: 1px solid #e0e0e0;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
				<tr>
					<td width="50%" valign="top">
						<p style="margin: 0 0 8px 0; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Bill To</p>
						<p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333333;">
							<?php echo wp_kses_post( $order->get_formatted_billing_address() ); ?>
							<?php if ( $order->get_billing_email() ) : ?>
								<br/><?php echo esc_html( $order->get_billing_email() ); ?>
							<?php endif; ?>
							<?php if ( $order->get_billing_phone() ) : ?>
								<br/><?php echo esc_html( $order->get_billing_phone() ); ?>
							<?php endif; ?>
						</p>
					</td>
					<?php if ( ! wc_ship_to_billing_address_only() && $order->needs_shipping_address() ) : ?>
					<td width="50%" valign="top">
						<p style="margin: 0 0 8px 0; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Ship To</p>
						<p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333333;">
							<?php echo wp_kses_post( $order->get_formatted_shipping_address() ); ?>
						</p>
					</td>
					<?php endif; ?>
				</tr>
			</table>
		</td>
	</tr>
</table>

<?php if ( ! $order->has_status( 'pending' ) ) : ?>
<p style="margin: 20px 0;">
	<a href="<?php echo esc_url( $order_url ); ?>" style="display: inline-block; padding: 14px 28px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
		<?php esc_html_e( 'View your order', 'woocommerce' ); ?>
	</a>
</p>
<?php endif; ?>

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

/**
 * Show user-defined additional content - this is set in each email's settings.
 */
if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

?>

<!-- Support Footer -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0 0 0;">
	<tr>
		<td style="padding: 20px; background-color: #f8f8f8; border: 1px solid #e0e0e0; text-align: center;">
			<p style="margin: 0 0 5px 0; font-size: 13px; color: #333333;">
				Need help with your order? Contact us at
			</p>
			<p style="margin: 0; font-size: 13px;">
				<a href="mailto:support@sasanperfumes.com" style="color: #1a1a1a; font-weight: 600; text-decoration: underline;">support@sasanperfumes.com</a>
			</p>
		</td>
	</tr>
</table>

<?php
/*
 * @hooked WC_Emails::email_footer() Output the email footer
 */
do_action( 'woocommerce_email_footer', $email );
