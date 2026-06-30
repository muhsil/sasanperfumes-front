<?php
/**
 * Email Styles - Sasan Perfumes Custom Style
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/email-styles.php.
 *
 * @package WooCommerce\Templates\Emails
 * @version 7.4.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load colors.
$bg              = get_option( 'woocommerce_email_background_color' );
$body            = get_option( 'woocommerce_email_body_background_color' );
$base            = get_option( 'woocommerce_email_base_color' );
$base_text       = wc_light_or_dark( $base, '#202020', '#ffffff' );
$text            = get_option( 'woocommerce_email_text_color' );

// Pick a contrasting color for links.
$link_color = wc_hex_is_light( $base ) ? $base : $base_text;

if ( wc_hex_is_light( $body ) ) {
	$link_color = wc_hex_is_light( $base ) ? $base_text : $base;
}

$bg_darker_10    = wc_hex_darker( $bg, 10 );
$body_darker_10  = wc_hex_darker( $body, 10 );
$base_lighter_20 = wc_hex_lighter( $base, 20 );
$base_lighter_40 = wc_hex_lighter( $base, 40 );
$text_lighter_20 = wc_hex_lighter( $text, 20 );
$text_lighter_40 = wc_hex_lighter( $text, 40 );

// Custom Sasan Perfumes colors
$sasanperfumes_primary = '#1a1a1a';
$sasanperfumes_accent = '#333333';
$sasanperfumes_gray = '#888888';
$sasanperfumes_light_gray = '#f8f8f8';
$sasanperfumes_border = '#e0e0e0';

// !important; is a gmail hack to prevent styles being stripped if it doesn't like something.
// body{padding: 0}; ensures proper padding in Outlook.
?>
body {
	padding: 0;
	background-color: #f5f5f5;
}

#wrapper {
	background-color: #f5f5f5;
	margin: 0;
	padding: 40px 20px;
	-webkit-text-size-adjust: none !important;
	width: 100%;
}

#template_container {
	box-shadow: none !important;
	background-color: <?php echo esc_attr( $body ); ?>;
	border: none !important;
	border-radius: 0 !important;
	max-width: 600px !important;
}

#template_header {
	background-color: <?php echo esc_attr( $body ); ?>;
	border-radius: 0 !important;
	border-bottom: 1px solid <?php echo esc_attr( $sasanperfumes_border ); ?>;
	font-weight: bold;
	line-height: 100%;
	vertical-align: middle;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	padding: 40px 40px 30px 40px;
}

#template_header h1,
#template_header h1 a {
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	font-size: 24px;
	font-weight: 600;
	line-height: 1.3;
	margin: 0;
	text-decoration: none;
}

#template_body {
	background-color: <?php echo esc_attr( $body ); ?>;
}

#template_body td {
	padding: 40px;
}

#template_footer {
	background-color: <?php echo esc_attr( $sasanperfumes_light_gray ); ?>;
	border-top: 1px solid <?php echo esc_attr( $sasanperfumes_border ); ?>;
}

#template_footer td {
	padding: 30px 40px;
}

#template_footer #credit {
	border: 0;
	color: <?php echo esc_attr( $sasanperfumes_gray ); ?>;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	font-size: 13px;
	line-height: 1.5;
	text-align: center;
	padding: 0;
}

#body_content {
	background-color: <?php echo esc_attr( $body ); ?>;
}

#body_content table td {
	padding: 0;
}

#body_content table td td {
	padding: 12px;
}

#body_content table td th {
	padding: 12px;
}

#body_content td ul.wc-item-meta {
	font-size: small;
	margin: 8px 0 0;
	padding: 0;
	list-style: none;
}

#body_content td ul.wc-item-meta li {
	margin: 0 0 4px;
}

#body_content td ul.wc-item-meta li p {
	margin: 0;
}

#body_content p {
	margin: 0 0 16px;
}

#body_content_inner {
	color: <?php echo esc_attr( $text_lighter_20 ); ?>;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	font-size: 14px;
	line-height: 1.7;
	text-align: <?php echo is_rtl() ? 'right' : 'left'; ?>;
}

.td {
	color: <?php echo esc_attr( $text_lighter_20 ); ?>;
	border: 1px solid <?php echo esc_attr( $sasanperfumes_border ); ?>;
	vertical-align: middle;
}

.address {
	padding: 12px;
	color: <?php echo esc_attr( $text_lighter_20 ); ?>;
	border: 1px solid <?php echo esc_attr( $sasanperfumes_border ); ?>;
}

.text {
	color: <?php echo esc_attr( $text ); ?>;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.link {
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	text-decoration: underline;
	font-weight: 500;
}

h1 {
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	font-size: 24px;
	font-weight: 600;
	line-height: 1.3;
	margin: 0 0 25px;
	text-align: <?php echo is_rtl() ? 'right' : 'left'; ?>;
}

h2 {
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	display: block;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	font-size: 18px;
	font-weight: 600;
	line-height: 1.3;
	margin: 0 0 18px;
	text-align: <?php echo is_rtl() ? 'right' : 'left'; ?>;
}

h3 {
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	display: block;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	font-size: 16px;
	font-weight: 600;
	line-height: 1.3;
	margin: 16px 0 8px;
	text-align: <?php echo is_rtl() ? 'right' : 'left'; ?>;
}

a {
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	font-weight: normal;
	text-decoration: underline;
}

img {
	border: none;
	display: inline-block;
	font-size: 14px;
	font-weight: bold;
	height: auto;
	outline: none;
	text-decoration: none;
	text-transform: capitalize;
	vertical-align: middle;
	margin-<?php echo is_rtl() ? 'left' : 'right'; ?>: 10px;
	max-width: 100%;
}

/* Order items table */
.order_item {
	border-bottom: 1px solid <?php echo esc_attr( $sasanperfumes_border ); ?>;
}

.order_item td {
	padding: 12px 0;
	vertical-align: top;
}

/* Button styles */
.button {
	display: inline-block;
	padding: 14px 28px;
	background-color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	color: #ffffff !important;
	text-decoration: none;
	font-size: 13px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 1px;
	border-radius: 0;
}

.button:hover {
	background-color: #333333;
}

/* Email text styles */
.email-text {
	font-size: 14px;
	line-height: 1.7;
	color: <?php echo esc_attr( $sasanperfumes_accent ); ?>;
	margin: 0 0 15px 0;
}

.username-label {
	font-size: 12px;
	color: <?php echo esc_attr( $sasanperfumes_gray ); ?>;
	margin: 0 0 5px 0;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.username-value {
	font-size: 15px;
	font-weight: 600;
	color: <?php echo esc_attr( $sasanperfumes_primary ); ?>;
	margin: 0 0 20px 0;
}

.divider {
	border: none;
	border-top: 1px solid <?php echo esc_attr( $sasanperfumes_border ); ?>;
	margin: 25px 0;
}

/* Responsive styles */
@media only screen and (max-width: 600px) {
	#template_container {
		width: 100% !important;
		max-width: 100% !important;
	}
	
	#template_header,
	#template_body td,
	#template_footer td {
		padding-left: 20px !important;
		padding-right: 20px !important;
	}
	
	h1 {
		font-size: 20px !important;
	}
	
	h2 {
		font-size: 16px !important;
	}
	
	.button {
		display: block !important;
		width: 100% !important;
		text-align: center !important;
		padding: 12px 20px !important;
	}
}
<?php
