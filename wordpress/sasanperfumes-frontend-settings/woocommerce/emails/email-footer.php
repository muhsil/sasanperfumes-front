<?php
/**
 * Email Footer - ShapeHive Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/email-footer.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Frontend app URL for headless setup
$frontend_url = 'https://shapehive.com';
?>
						</td>
					</tr>
					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; background-color: #f8f8f8; border-top: 1px solid #e0e0e0;">
							<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
								<tr>
									<td align="center" style="padding-bottom: 15px;">
										<p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
											<?php echo esc_html( get_bloginfo( 'name', 'display' ) ); ?>
										</p>
									</td>
								</tr>
								<tr>
									<td align="center" style="padding-bottom: 15px;">
										<p style="margin: 0; font-size: 13px; color: #888888;">
											<?php 
											$store_address = get_option( 'woocommerce_store_address' );
											$store_city = get_option( 'woocommerce_store_city' );
											$store_country = WC()->countries->countries[ get_option( 'woocommerce_default_country' ) ] ?? 'United Arab Emirates';
											
											if ( $store_city ) {
												echo esc_html( $store_city . ', ' . $store_country );
											} else {
												echo esc_html( $store_country );
											}
											?>
										</p>
									</td>
								</tr>
								<tr>
									<td align="center">
										<p style="margin: 0; font-size: 12px; color: #888888;">
											<a href="<?php echo esc_url( $frontend_url ); ?>" style="color: #888888; text-decoration: none;"><?php echo esc_url( $frontend_url ); ?></a>
										</p>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
<?php
