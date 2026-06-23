<?php
/**
 * Email Header - Sasan Perfumes Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/email-header.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$header_text = $email_heading;

// Frontend URL for storefront links
$frontend_url = function_exists( 'sasanperfumes_get_frontend_url' ) ? sasanperfumes_get_frontend_url( 'https://shapehive.com' ) : 'https://shapehive.com';

// Use the WooCommerce email logo when set, then fall back to the site logo.
$logo_url = (string) get_option( 'woocommerce_email_header_image', '' );

// Try to get the site logo from WordPress customizer
$custom_logo_id = get_theme_mod( 'custom_logo' );
if ( ! $logo_url && $custom_logo_id ) {
	$logo_data = wp_get_attachment_image_src( $custom_logo_id, 'full' );
	if ( $logo_data ) {
		$logo_url = $logo_data[0];
	}
}

if ( ! $logo_url ) {
	$logo_url = 'https://sasanperfumes.com/wp-content/uploads/2025/08/Sasan-logo-03-1.png';
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
	<title><?php echo esc_html( get_bloginfo( 'name', 'display' ) ); ?></title>
	<style type="text/css">
		/* Reset styles */
		body, table, td, p, a, li, blockquote {
			-webkit-text-size-adjust: 100%;
			-ms-text-size-adjust: 100%;
		}
		table, td {
			mso-table-lspace: 0pt;
			mso-table-rspace: 0pt;
		}
		img {
			-ms-interpolation-mode: bicubic;
			border: 0;
			height: auto;
			line-height: 100%;
			outline: none;
			text-decoration: none;
		}
		body {
			height: 100% !important;
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
			background-color: #f5f5f5;
		}
		
		/* Typography */
		body, table, td, p, a, li, blockquote {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		}
		
		/* Links */
		a {
			color: #1a1a1a;
			text-decoration: underline;
		}
		
		/* Button styles */
		.button {
			display: inline-block;
			padding: 14px 28px;
			background-color: #1a1a1a;
			color: #ffffff !important;
			text-decoration: none;
			font-size: 13px;
			font-weight: 500;
			text-transform: uppercase;
			letter-spacing: 1px;
		}
		
		/* Responsive */
		@media only screen and (max-width: 600px) {
			.email-container {
				width: 100% !important;
				max-width: 100% !important;
			}
			.email-content {
				padding: 30px 20px !important;
			}
		}
	</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
	<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<!-- Email Container -->
				<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff;">
					<!-- Logo Header -->
					<tr>
						<td align="center" style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e0e0e0;">
							<a href="<?php echo esc_url( $frontend_url ); ?>" style="text-decoration: none;">
								<img src="<?php echo esc_url( $logo_url ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name', 'display' ) ); ?>" width="180" style="display: block; max-width: 180px; height: auto;" />
							</a>
						</td>
					</tr>
					<!-- Email Content -->
					<tr>
						<td class="email-content" style="padding: 40px;">
							<?php if ( $email_heading ) : ?>
							<h1 style="margin: 0 0 25px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: left;"><?php echo esc_html( $email_heading ); ?></h1>
							<?php endif; ?>
