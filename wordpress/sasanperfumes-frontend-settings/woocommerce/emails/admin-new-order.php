<?php
/**
 * Admin new order email - Sasan Perfumes Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/admin-new-order.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

defined( 'ABSPATH' ) || exit;

// Frontend app URL for headless setup (for customer-facing links)
$frontend_url = function_exists( 'sasanperfumes_get_frontend_url' ) ? sasanperfumes_get_frontend_url( 'https://sasanperfumes.com' ) : 'https://sasanperfumes.com';
$order_url = $frontend_url . '/en/account/orders/' . $order->get_id() . '/';
$admin_order_url = $order->get_edit_order_url();
$currency = $order->get_currency();
$items = $order->get_items();
$products_subtotal = 0.0;
foreach ( $items as $invoice_item ) {
	$products_subtotal += function_exists( 'sasanperfumes_order_admin_line_gross_total' )
		? sasanperfumes_order_admin_line_gross_total( $invoice_item )
		: ( (float) $invoice_item->get_total() + (float) $invoice_item->get_total_tax() );
}
$shipping_total = function_exists( 'sasanperfumes_order_admin_shipping_gross_total' )
	? sasanperfumes_order_admin_shipping_gross_total( $order )
	: ( (float) $order->get_shipping_total() + (float) $order->get_shipping_tax() );
$discount_total = function_exists( 'sasanperfumes_order_admin_discount_gross_total' )
	? sasanperfumes_order_admin_discount_gross_total( $order )
	: (float) $order->get_total_discount();
$fee_total = function_exists( 'sasanperfumes_order_admin_fee_gross_total' )
	? sasanperfumes_order_admin_fee_gross_total( $order )
	: array_reduce(
		$order->get_fees(),
		static function ( $sum, $fee ) {
			return $sum + ( (float) $fee->get_total() + (float) $fee->get_total_tax() );
		},
		0.0
	);

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #333333; margin: 0 0 15px 0;">
	<?php
	printf(
		/* translators: %s: Customer billing full name */
		esc_html__( 'You\'ve received the following order from %s:', 'woocommerce' ),
		$order->get_formatted_billing_full_name()
	);
	?>
</p>

<!-- Manage Order Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
	<tr>
		<td align="center">
			<a href="<?php echo esc_url( $admin_order_url ); ?>" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 6px; letter-spacing: 0.3px;">
				<?php esc_html_e( 'Manage this order', 'woocommerce' ); ?>
			</a>
		</td>
	</tr>
</table>

<hr class="divider" style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 20px 0;">
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
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 20px 0;">
	<tr>
		<td width="50%" valign="top" style="padding-right: 10px;">
			<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Payment method:', 'woocommerce' ); ?></p>
			<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0;"><?php echo wp_kses_post( $order->get_payment_method_title() ); ?></p>
		</td>
		<td width="50%" valign="top" style="padding-left: 10px;">
			<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Order total:', 'woocommerce' ); ?></p>
			<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0;"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></p>
		</td>
	</tr>
</table>

<?php
/*
 * Render order items table directly so that content appears even when
 * a PDF-invoice (or similar) plugin removes the default
 * woocommerce_email_order_details hook callbacks.
 */
$items = $order->get_items();
if ( $items ) : ?>
<hr class="divider" style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
<h2 style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">
	<?php esc_html_e( 'Order details', 'woocommerce' ); ?>
</h2>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; margin: 0 0 20px 0;">
	<thead>
		<tr>
			<th style="text-align: left; padding: 10px; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;"><?php esc_html_e( 'Product', 'woocommerce' ); ?></th>
			<th style="text-align: center; padding: 10px; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;"><?php esc_html_e( 'Quantity', 'woocommerce' ); ?></th>
			<th style="text-align: right; padding: 10px; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;"><?php esc_html_e( 'Price', 'woocommerce' ); ?></th>
		</tr>
	</thead>
	<tbody>
	<?php foreach ( $items as $item_id => $item ) :
		$product = $item->get_product();
		$qty     = $item->get_quantity();
		$total   = function_exists( 'sasanperfumes_order_admin_money' )
			? sasanperfumes_order_admin_money(
				function_exists( 'sasanperfumes_order_admin_line_gross_total' ) ? sasanperfumes_order_admin_line_gross_total( $item ) : ( (float) $item->get_total() + (float) $item->get_total_tax() ),
				$currency
			)
			: wc_price( (float) $item->get_total() + (float) $item->get_total_tax(), array( 'currency' => $currency ) );
		$name    = $item->get_name();
		$sku     = $product ? $product->get_sku() : '';
		$meta    = strip_tags( wc_display_item_meta( $item, array( 'before' => '', 'after' => '', 'separator' => ', ', 'echo' => false ) ) );
	?>
		<tr>
			<td style="text-align: left; padding: 10px; font-size: 14px; color: #333333; border-bottom: 1px solid #f0f0f0;">
				<?php echo esc_html( $name ); ?>
				<?php if ( $sku ) : ?>
					<br><span style="font-size: 12px; color: #888888;">SKU: <?php echo esc_html( $sku ); ?></span>
				<?php endif; ?>
				<?php if ( $meta ) : ?>
					<br><span style="font-size: 12px; color: #888888;"><?php echo esc_html( $meta ); ?></span>
				<?php endif; ?>
			</td>
			<td style="text-align: center; padding: 10px; font-size: 14px; color: #333333; border-bottom: 1px solid #f0f0f0;"><?php echo esc_html( $qty ); ?></td>
			<td style="text-align: right; padding: 10px; font-size: 14px; color: #333333; border-bottom: 1px solid #f0f0f0;"><?php echo wp_kses_post( $total ); ?></td>
		</tr>
	<?php endforeach; ?>
	</tbody>
	<tfoot>
		<tr>
			<td colspan="2" style="text-align: right; padding: 8px 10px; font-size: 13px; color: #888888;">Subtotal</td>
			<td style="text-align: right; padding: 8px 10px; font-size: 13px; color: #333333;"><?php echo wp_kses_post( function_exists( 'sasanperfumes_order_admin_money' ) ? sasanperfumes_order_admin_money( $products_subtotal, $currency ) : wc_price( $products_subtotal, array( 'currency' => $currency ) ) ); ?></td>
		</tr>
		<tr>
			<td colspan="2" style="text-align: right; padding: 8px 10px; font-size: 13px; color: #888888;">Shipping</td>
			<td style="text-align: right; padding: 8px 10px; font-size: 13px; color: #333333;"><?php echo wp_kses_post( function_exists( 'sasanperfumes_order_admin_money' ) ? sasanperfumes_order_admin_money( $shipping_total, $currency ) : wc_price( $shipping_total, array( 'currency' => $currency ) ) ); ?></td>
		</tr>
		<?php if ( $fee_total > 0 ) : ?>
		<tr>
			<td colspan="2" style="text-align: right; padding: 8px 10px; font-size: 13px; color: #888888;">Fees</td>
			<td style="text-align: right; padding: 8px 10px; font-size: 13px; color: #333333;"><?php echo wp_kses_post( function_exists( 'sasanperfumes_order_admin_money' ) ? sasanperfumes_order_admin_money( $fee_total, $currency ) : wc_price( $fee_total, array( 'currency' => $currency ) ) ); ?></td>
		</tr>
		<?php endif; ?>
		<?php if ( $discount_total > 0 ) : ?>
		<tr>
			<td colspan="2" style="text-align: right; padding: 8px 10px; font-size: 13px; color: #888888;">Discount</td>
			<td style="text-align: right; padding: 8px 10px; font-size: 13px; color: #c0392b;">-<?php echo wp_kses_post( function_exists( 'sasanperfumes_order_admin_money' ) ? sasanperfumes_order_admin_money( $discount_total, $currency ) : wc_price( $discount_total, array( 'currency' => $currency ) ) ); ?></td>
		</tr>
		<?php endif; ?>
		<tr>
			<td colspan="2" style="text-align: right; padding: 8px 10px; font-size: 13px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #e0e0e0;">Total</td>
			<td style="text-align: right; padding: 8px 10px; font-size: 13px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #e0e0e0;"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></td>
		</tr>
	</tfoot>
</table>
<?php endif; ?>

<?php
/*
 * Render customer billing & shipping addresses directly.
 */
$billing_address  = $order->get_formatted_billing_address();
$shipping_address = $order->get_formatted_shipping_address();
if ( $billing_address || $shipping_address ) : ?>
<hr class="divider" style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
<h2 style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">
	<?php esc_html_e( 'Customer details', 'woocommerce' ); ?>
</h2>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 20px 0;">
	<tr>
	<?php if ( $billing_address ) : ?>
		<td width="50%" valign="top" style="padding-right: 10px;">
			<p style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Billing address', 'woocommerce' ); ?></p>
			<p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0;"><?php echo wp_kses_post( $billing_address ); ?></p>
			<?php if ( $order->get_billing_phone() ) : ?>
				<p style="font-size: 13px; color: #555555; margin: 8px 0 0 0;"><?php echo esc_html( $order->get_billing_phone() ); ?></p>
			<?php endif; ?>
			<?php if ( $order->get_billing_email() ) : ?>
				<p style="font-size: 13px; color: #555555; margin: 4px 0 0 0;">
					<a href="mailto:<?php echo esc_attr( $order->get_billing_email() ); ?>" style="color: #555555;"><?php echo esc_html( $order->get_billing_email() ); ?></a>
				</p>
			<?php endif; ?>
		</td>
	<?php endif; ?>
	<?php if ( $shipping_address ) : ?>
		<td width="50%" valign="top" style="padding-left: 10px;">
			<p style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Shipping address', 'woocommerce' ); ?></p>
			<p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0;"><?php echo wp_kses_post( $shipping_address ); ?></p>
		</td>
	<?php endif; ?>
	</tr>
</table>
<?php endif;

/*
 * Fire standard WooCommerce hooks for backward compatibility.
 * PDF-invoice plugins may have removed the callbacks that render order details,
 * which is fine — we already rendered them above. These calls let other plugins
 * (analytics, structured data, etc.) still run their hooks.
 */
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

/*
 * @hooked WC_Emails::email_footer() Output the email footer
 */
do_action( 'woocommerce_email_footer', $email );
