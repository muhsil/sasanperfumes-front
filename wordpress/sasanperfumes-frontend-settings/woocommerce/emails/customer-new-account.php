<?php
/**
 * Customer new account email - ShapeHive Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/customer-new-account.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

defined( 'ABSPATH' ) || exit;

// Frontend app URL for headless setup
$frontend_url = class_exists( 'sasanperfumes_Email_Templates' )
	? sasanperfumes_Email_Templates::get_customer_frontend_url()
	: ( function_exists( 'sasanperfumes_get_frontend_url' ) ? sasanperfumes_get_frontend_url( 'https://store.sasanperfumes.com' ) : 'https://store.sasanperfumes.com' );
// Correct URL structure: /en/account/
$account_url = $frontend_url . '/en/account/';
$login_url = $frontend_url . '/en/login/';

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #c0392b; margin: 0 0 15px 0;">Hi <?php echo esc_html( $user_login ); ?>,</p>

<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #c0392b; margin: 0 0 15px 0;">
	<?php
	printf(
		/* translators: %s: Site title */
		esc_html__( 'Thanks for creating an account on %s. Your username is below.', 'woocommerce' ),
		esc_html( get_bloginfo( 'name', 'display' ) )
	);
	?>
</p>

<hr class="divider" style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

<p class="username-label" style="font-size: 12px; color: #888888; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;"><?php esc_html_e( 'Username:', 'woocommerce' ); ?></p>
<p class="username-value" style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px 0;"><?php echo esc_html( $user_login ); ?></p>

<?php if ( 'yes' === get_option( 'woocommerce_registration_generate_password' ) && $password_generated && $set_password_url ) : ?>
<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #c0392b; margin: 0 0 15px 0;">
	<?php esc_html_e( 'To set your password, visit the following address:', 'woocommerce' ); ?>
</p>
<p style="margin: 20px 0;">
	<a href="<?php echo esc_url( $frontend_url . '/en/reset-password/?key=' . rawurlencode( $reset_key ) . '&login=' . rawurlencode( $user_login ) ); ?>" class="button" style="display: inline-block; padding: 14px 28px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;"><?php esc_html_e( 'Set your password', 'woocommerce' ); ?></a>
</p>
<?php endif; ?>

<p class="email-text" style="font-size: 14px; line-height: 1.7; color: #c0392b; margin: 0 0 15px 0;">
	<?php esc_html_e( 'You can access your account area to view orders, change your password, and more at:', 'woocommerce' ); ?>
</p>

<p style="margin: 20px 0;">
	<a href="<?php echo esc_url( $login_url ); ?>" class="button" style="display: inline-block; padding: 14px 28px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;"><?php esc_html_e( 'Go to My Account', 'woocommerce' ); ?></a>
</p>

<?php
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
