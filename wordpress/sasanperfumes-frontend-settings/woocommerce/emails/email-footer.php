<?php
/**
 * Shared Sasan Perfumes email footer.
 *
 * @package WooCommerce\Templates\Emails
 * @version 9.8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$frontend_url = function_exists( 'sasanperfumes_get_frontend_url' )
	? sasanperfumes_get_frontend_url( 'https://sasanperfumes.com' )
	: 'https://sasanperfumes.com';
$store_city   = trim( (string) get_option( 'woocommerce_store_city', '' ) );
$country_code = explode( ':', (string) get_option( 'woocommerce_default_country', 'AE' ) )[0];
$country_name = isset( WC()->countries->countries[ $country_code ] ) ? WC()->countries->countries[ $country_code ] : '';
$location     = implode( ', ', array_filter( array( $store_city, $country_name ) ) );
?>
						</td>
					</tr>
					<tr>
						<td class="email-footer" align="center" style="background-color:#191816; border-top:3px solid #b08a4a; color:#d8d4cc; font-family:Arial, Helvetica, sans-serif; padding:28px 38px;">
							<p style="color:#ffffff; font-family:Georgia, 'Times New Roman', serif; font-size:17px; margin:0 0 8px;"><?php echo esc_html( get_bloginfo( 'name', 'display' ) ); ?></p>
							<?php if ( $location ) : ?>
								<p style="color:#aaa59c; font-size:12px; line-height:1.6; margin:0 0 12px;"><?php echo esc_html( $location ); ?></p>
							<?php endif; ?>
							<p style="font-size:12px; line-height:1.7; margin:0;">
								<a href="<?php echo esc_url( $frontend_url ); ?>" style="color:#d8bb84; text-decoration:none;"><?php esc_html_e( 'Shop online', 'sasanperfumes-frontend-settings' ); ?></a>
								&nbsp;&nbsp;|&nbsp;&nbsp;
								<a href="mailto:support@sasanperfumes.com" style="color:#d8bb84; text-decoration:none;">support@sasanperfumes.com</a>
							</p>
							<p style="color:#77736c; font-size:11px; line-height:1.5; margin:14px 0 0;">&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name', 'display' ) ); ?></p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
