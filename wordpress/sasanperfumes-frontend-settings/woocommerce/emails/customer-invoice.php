<?php
/**
 * Customer invoice email - Sasan Perfumes Custom Style
 *
 * Matches the PDF invoice layout: logo + company address header,
 * INVOICE title, Bill To / Ship To / metadata columns,
 * product table with black header, subtotal/shipping/total.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

defined( 'ABSPATH' ) || exit;

$frontend_url  = function_exists( 'sasanperfumes_get_frontend_url' ) ? sasanperfumes_get_frontend_url( 'https://sasanperfumes.com' ) : 'https://sasanperfumes.com';
$order_url     = $frontend_url . '/en/account/orders/' . $order->get_id() . '/';
$checkout_url  = $frontend_url . '/en/checkout/';

// Company info
$company_name    = 'SASAN BOUTIQUE LLC';
$company_address = 'Industrial Area 17 – Industrial Area – Sharjah<br>Sharjah – UAE<br>Sharjah<br>United Arab Emirates';

// Logo URL
$logo_url = (string) get_option( 'woocommerce_email_header_image', '' );
$custom_logo_id = get_theme_mod( 'custom_logo' );
if ( ! $logo_url && $custom_logo_id ) {
	$logo_data = wp_get_attachment_image_src( $custom_logo_id, 'full' );
	if ( $logo_data ) {
		$logo_url = $logo_data[0];
	}
}
if ( ! $logo_url ) {
	$logo_url = 'https://cms.sasanperfumes.com/wp-content/uploads/2026/05/Sasan-logo-03-1.png';
}

// Invoice number: zero-padded order number + year
$invoice_number = str_pad( $order->get_order_number(), 5, '0', STR_PAD_LEFT ) . '-' . date( 'Y', $order->get_date_created() ? $order->get_date_created()->getTimestamp() : time() );
$invoice_date   = $order->get_date_created() ? wc_format_datetime( $order->get_date_created(), 'F j, Y' ) : '';
$order_date     = $invoice_date;

// Currency
$currency = $order->get_currency();

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

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
<?php endif; ?>

<!-- ============================================================ -->
<!-- INVOICE START -->
<!-- ============================================================ -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 10px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

	<!-- Row 1: Logo (left) + Company Address (right) -->
	<tr>
		<td style="padding: 0 0 25px 0;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
				<tr>
					<td width="50%" valign="top">
						<a href="<?php echo esc_url( $frontend_url ); ?>" style="text-decoration: none;">
							<img src="<?php echo esc_url( $logo_url ); ?>" alt="Sasan Perfumes" width="140" style="display: block; max-width: 140px; height: auto;" />
						</a>
					</td>
					<td width="50%" valign="top" align="right">
						<p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #1a1a1a;"><?php echo esc_html( $company_name ); ?></p>
						<p style="margin: 0; font-size: 12px; line-height: 1.6; color: #555555;"><?php echo wp_kses_post( $company_address ); ?></p>
					</td>
				</tr>
			</table>
		</td>
	</tr>

	<!-- Row 2: INVOICE title -->
	<tr>
		<td style="padding: 25px 0 20px 0; border-top: 1px solid #e0e0e0;">
			<h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: 1px;">INVOICE</h1>
		</td>
	</tr>

	<!-- Row 3: Bill To | Ship To | Invoice Metadata -->
	<tr>
		<td style="padding: 0 0 25px 0;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
				<tr>
					<!-- Bill To -->
					<td width="33%" valign="top" style="padding-right: 10px;">
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
					<!-- Ship To -->
					<?php if ( ! wc_ship_to_billing_address_only() && $order->needs_shipping_address() ) : ?>
					<td width="33%" valign="top" style="padding: 0 10px;">
						<p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1a1a1a; text-decoration: underline;">Ship To:</p>
						<p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333333;">
							<?php echo wp_kses_post( $order->get_formatted_shipping_address() ); ?>
						</p>
					</td>
					<?php endif; ?>
					<!-- Invoice Metadata -->
					<td width="34%" valign="top" align="right">
						<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="font-size: 12px; color: #333333;">
							<tr>
								<td style="padding: 2px 10px 2px 0; font-weight: 600; white-space: nowrap;">Invoice Number:</td>
								<td style="padding: 2px 0; white-space: nowrap;"><?php echo esc_html( $invoice_number ); ?></td>
							</tr>
							<tr>
								<td style="padding: 2px 10px 2px 0; font-weight: 600; white-space: nowrap;">Invoice Date:</td>
								<td style="padding: 2px 0; white-space: nowrap;"><?php echo esc_html( $invoice_date ); ?></td>
							</tr>
							<tr>
								<td style="padding: 2px 10px 2px 0; font-weight: 600; white-space: nowrap;">Order Number:</td>
								<td style="padding: 2px 0; white-space: nowrap;"><?php echo esc_html( $order->get_order_number() ); ?></td>
							</tr>
							<tr>
								<td style="padding: 2px 10px 2px 0; font-weight: 600; white-space: nowrap;">Order Date:</td>
								<td style="padding: 2px 0; white-space: nowrap;"><?php echo esc_html( $order_date ); ?></td>
							</tr>
							<tr>
								<td style="padding: 2px 10px 2px 0; font-weight: 600; white-space: nowrap;">Payment Method:</td>
								<td style="padding: 2px 0; white-space: nowrap;"><?php echo esc_html( $order->get_payment_method_title() ); ?></td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</td>
	</tr>

	<!-- Row 4: Product Table -->
	<tr>
		<td style="padding: 0 0 5px 0;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
				<!-- Table Header (black) -->
				<tr>
					<td width="55%" style="background-color: #1a1a1a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 12px; border: 1px solid #1a1a1a;">Product</td>
					<td width="20%" align="center" style="background-color: #1a1a1a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 12px; border: 1px solid #1a1a1a;">Quantity</td>
					<td width="25%" align="right" style="background-color: #1a1a1a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 12px; border: 1px solid #1a1a1a;">Price</td>
				</tr>
				<!-- Table Body -->
				<?php
				$items = $order->get_items();
				if ( $items ) :
					foreach ( $items as $item_id => $item ) :
						$product  = $item->get_product();
						$sku      = $product ? $product->get_sku() : '';
						$weight   = $product ? $product->get_weight() : '';
						$qty      = $item->get_quantity();
						$subtotal = $order->get_formatted_line_subtotal( $item );
				?>
				<tr>
					<td style="padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top; font-size: 14px; color: #1a1a1a;">
						<strong><?php echo esc_html( $item->get_name() ); ?></strong>
						<?php if ( $sku ) : ?>
							<br><span style="font-size: 11px; color: #888888;">SKU: <?php echo esc_html( $sku ); ?></span>
						<?php endif; ?>
						<?php if ( $weight ) : ?>
							<br><span style="font-size: 11px; color: #888888;">Weight: <?php echo esc_html( $weight ); ?>kg</span>
						<?php endif; ?>
						<?php
						// Display item meta (variations, etc.)
						$meta_data = $item->get_formatted_meta_data( '_', true );
						if ( $meta_data ) :
							foreach ( $meta_data as $meta ) :
						?>
							<br><span style="font-size: 11px; color: #888888;"><?php echo wp_kses_post( $meta->display_key ); ?>: <?php echo wp_kses_post( $meta->display_value ); ?></span>
						<?php
							endforeach;
						endif;
						?>
					</td>
					<td align="center" style="padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top; font-size: 14px; color: #333333;">
						<?php echo esc_html( $qty ); ?>
					</td>
					<td align="right" style="padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top; font-size: 14px; color: #1a1a1a;">
						<?php echo wp_kses_post( $subtotal ); ?>
					</td>
				</tr>
				<?php
					endforeach;
				endif;
				?>
			</table>
		</td>
	</tr>

	<!-- Row 5: Totals -->
	<tr>
		<td style="padding: 0 0 25px 0;">
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
				<tr>
					<td width="55%">&nbsp;</td>
					<td width="45%">
						<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
							<!-- Subtotal -->
							<tr>
								<td style="padding: 6px 12px; font-size: 13px; font-weight: 600; color: #333333; border-bottom: 1px solid #e0e0e0;">Subtotal</td>
								<td align="right" style="padding: 6px 12px; font-size: 13px; color: #333333; border-bottom: 1px solid #e0e0e0;"><?php echo wp_kses_post( $order->get_subtotal_to_display() ); ?></td>
							</tr>
							<!-- Shipping -->
							<?php if ( $order->get_shipping_methods() ) : ?>
							<tr>
								<td style="padding: 6px 12px; font-size: 13px; font-weight: 600; color: #333333; border-bottom: 1px solid #e0e0e0;">Shipping</td>
								<td align="right" style="padding: 6px 12px; font-size: 13px; color: #333333; border-bottom: 1px solid #e0e0e0;">
									<?php echo wp_kses_post( $order->get_shipping_to_display() ); ?>
								</td>
							</tr>
							<?php endif; ?>
							<!-- Fees -->
							<?php foreach ( $order->get_fees() as $fee ) : ?>
							<tr>
								<td style="padding: 6px 12px; font-size: 13px; font-weight: 600; color: #333333; border-bottom: 1px solid #e0e0e0;"><?php echo esc_html( $fee->get_name() ); ?></td>
								<td align="right" style="padding: 6px 12px; font-size: 13px; color: #333333; border-bottom: 1px solid #e0e0e0;"><?php echo wp_kses_post( wc_price( $fee->get_total(), array( 'currency' => $currency ) ) ); ?></td>
							</tr>
							<?php endforeach; ?>
							<!-- Discount -->
							<?php if ( $order->get_total_discount() > 0 ) : ?>
							<tr>
								<td style="padding: 6px 12px; font-size: 13px; font-weight: 600; color: #333333; border-bottom: 1px solid #e0e0e0;">Discount</td>
								<td align="right" style="padding: 6px 12px; font-size: 13px; color: #c0392b; border-bottom: 1px solid #e0e0e0;">-<?php echo wp_kses_post( wc_price( $order->get_total_discount(), array( 'currency' => $currency ) ) ); ?></td>
							</tr>
							<?php endif; ?>
							<!-- Total -->
							<tr>
								<td style="padding: 10px 12px; font-size: 14px; font-weight: 700; color: #1a1a1a; border-bottom: 2px solid #1a1a1a;">Total</td>
								<td align="right" style="padding: 10px 12px; font-size: 14px; font-weight: 700; color: #1a1a1a; border-bottom: 2px solid #1a1a1a;">
									<?php echo wp_kses_post( $order->get_formatted_order_total() ); ?>
									<?php
									// Show tax info
									$tax_display = '';
									$tax_totals  = $order->get_tax_totals();
									if ( $tax_totals ) {
										foreach ( $tax_totals as $code => $tax ) {
											$tax_display .= sprintf(
												'<br><span style="font-size: 11px; font-weight: 400; color: #555555;">(includes %s %s)</span>',
												wp_kses_post( $tax->formatted_amount ),
												esc_html( $tax->label )
											);
										}
										echo $tax_display;
									}
									?>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</td>
	</tr>

</table>
<!-- ============================================================ -->
<!-- INVOICE END -->
<!-- ============================================================ -->

<?php if ( ! $order->has_status( 'pending' ) ) : ?>
<p style="margin: 20px 0;">
	<a href="<?php echo esc_url( $order_url ); ?>" style="display: inline-block; padding: 14px 28px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
		<?php esc_html_e( 'View your order', 'woocommerce' ); ?>
	</a>
</p>
<?php endif; ?>

<?php

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
