<?php
/**
 * Shared Sasan Perfumes email header.
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
$logo_url     = (string) get_option( 'woocommerce_email_header_image', '' );

if ( ! $logo_url ) {
	$custom_logo_id = get_theme_mod( 'custom_logo' );
	$logo_data      = $custom_logo_id ? wp_get_attachment_image_src( $custom_logo_id, 'full' ) : false;
	$logo_url       = $logo_data ? $logo_data[0] : 'https://cms.sasanperfumes.com/wp-content/uploads/2026/05/Sasan-logo-03-1.png';
}

$direction = is_rtl() ? 'rtl' : 'ltr';
$alignment = is_rtl() ? 'right' : 'left';
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> dir="<?php echo esc_attr( $direction ); ?>">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="color-scheme" content="light" />
	<meta name="supported-color-schemes" content="light" />
	<title><?php echo esc_html( get_bloginfo( 'name', 'display' ) ); ?></title>
	<style type="text/css">
		body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
		table, td { mso-table-lspace: 0; mso-table-rspace: 0; border-collapse: collapse; }
		img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
		body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
		@media only screen and (max-width: 620px) {
			.email-frame { padding: 16px 10px !important; }
			.email-container { width: 100% !important; }
			.email-header { padding: 26px 22px 22px !important; }
			.email-content { padding: 28px 22px 30px !important; }
			.email-footer { padding: 24px 22px !important; }
			.email-heading { font-size: 24px !important; }
		}
	</style>
</head>
<body style="background-color:#f3f1ed; margin:0; padding:0; width:100%;">
	<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f1ed;">
		<tr>
			<td class="email-frame" align="center" style="padding:32px 16px;">
				<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="background-color:#ffffff; border:1px solid #dedbd5; border-radius:6px; max-width:600px; overflow:hidden; width:100%;">
					<tr>
						<td class="email-header" align="center" style="background-color:#ffffff; border-top:4px solid #b08a4a; padding:32px 36px 26px;">
							<a href="<?php echo esc_url( $frontend_url ); ?>" style="display:inline-block; text-decoration:none;">
								<img src="<?php echo esc_url( $logo_url ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name', 'display' ) ); ?>" width="156" style="display:block; height:auto; margin:0 auto; max-width:156px;" />
							</a>
						</td>
					</tr>
					<tr>
						<td class="email-content" dir="<?php echo esc_attr( $direction ); ?>" style="background-color:#ffffff; color:#37342f; font-family:Arial, Helvetica, sans-serif; padding:36px 42px 40px; text-align:<?php echo esc_attr( $alignment ); ?>;">
							<?php if ( $email_heading ) : ?>
								<h1 class="email-heading" style="color:#171614; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:400; line-height:1.25; margin:0 0 24px; text-align:<?php echo esc_attr( $alignment ); ?>;"><?php echo esc_html( $email_heading ); ?></h1>
							<?php endif; ?>
