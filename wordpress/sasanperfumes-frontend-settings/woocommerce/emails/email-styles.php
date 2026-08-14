<?php
/**
 * Shared Sasan Perfumes email styles.
 *
 * @package WooCommerce\Templates\Emails
 * @version 9.8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$align = is_rtl() ? 'right' : 'left';
?>
body {
	background-color: #f3f1ed;
	color: #37342f;
	font-family: Arial, Helvetica, sans-serif;
	margin: 0;
	padding: 0;
}

#wrapper {
	background-color: #f3f1ed;
	padding: 32px 16px;
	width: 100%;
	-webkit-text-size-adjust: none !important;
}

#template_container {
	background-color: #ffffff;
	border: 1px solid #dedbd5;
	border-radius: 6px;
	box-shadow: none;
	max-width: 600px;
}

#template_header {
	background-color: #ffffff;
	border-bottom: 1px solid #e6e2dc;
	border-top: 4px solid #b08a4a;
	color: #171614;
}

#template_header h1,
#template_header h1 a {
	color: #171614;
	font-family: Georgia, 'Times New Roman', serif;
	font-size: 28px;
	font-weight: 400;
	line-height: 1.25;
	text-decoration: none;
}

#template_body,
#body_content {
	background-color: #ffffff;
}

#body_content_inner {
	color: #37342f;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 14px;
	line-height: 1.65;
	text-align: <?php echo esc_attr( $align ); ?>;
}

#body_content p {
	margin: 0 0 16px;
}

#body_content table {
	border-collapse: collapse;
	width: 100%;
}

#body_content table td,
#body_content table th {
	padding: 11px 10px;
}

#body_content table th {
	background-color: #f7f5f1;
	color: #26231f;
	font-size: 12px;
	font-weight: 700;
	text-transform: uppercase;
}

#body_content td ul.wc-item-meta {
	color: #77736c;
	font-size: 12px;
	list-style: none;
	margin: 7px 0 0;
	padding: 0;
}

#body_content td ul.wc-item-meta li,
#body_content td ul.wc-item-meta li p {
	margin: 0 0 3px;
}

#template_footer {
	background-color: #191816;
	border-top: 3px solid #b08a4a;
}

#template_footer #credit {
	color: #aaa59c;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	line-height: 1.6;
	text-align: center;
}

h1, h2, h3 {
	color: #171614;
	font-family: Georgia, 'Times New Roman', serif;
	font-weight: 400;
	text-align: <?php echo esc_attr( $align ); ?>;
}

h1 { font-size: 28px; line-height: 1.25; margin: 0 0 24px; }
h2 { font-size: 20px; line-height: 1.35; margin: 24px 0 14px; }
h3 { font-size: 17px; line-height: 1.4; margin: 20px 0 10px; }

a,
.link {
	color: #8b672f;
	font-weight: 600;
	text-decoration: underline;
}

.button,
a.button {
	background-color: #191816;
	border-radius: 3px;
	color: #ffffff !important;
	display: inline-block;
	font-size: 13px;
	font-weight: 700;
	line-height: 1.2;
	padding: 13px 22px;
	text-align: center;
	text-decoration: none;
}

.td,
.address {
	border: 1px solid #dedbd5;
	color: #37342f;
	vertical-align: middle;
}

.address {
	background-color: #faf9f7;
	line-height: 1.65;
	padding: 14px;
}

.order_item {
	border-bottom: 1px solid #e6e2dc;
}

.order_item td {
	padding: 12px 10px;
	vertical-align: top;
}

.email-text { color: #37342f; font-size: 14px; line-height: 1.65; margin: 0 0 16px; }
.username-label { color: #77736c; font-size: 12px; font-weight: 700; margin: 0 0 4px; text-transform: uppercase; }
.username-value { color: #171614; font-size: 15px; font-weight: 700; margin: 0 0 18px; }
.divider { border: 0; border-top: 1px solid #dedbd5; margin: 24px 0; }

/* Compact operational blocks used by administrator notifications. */
.admin-status {
	background-color: #f7f5f1;
	border-left: 4px solid #b08a4a;
	color: #26231f;
	font-size: 14px;
	line-height: 1.6;
	margin: 0 0 22px;
	padding: 14px 16px;
}

.admin-status--failed {
	background-color: #fff4f3;
	border-left-color: #b42318;
}

.admin-status--cancelled {
	background-color: #f4f4f3;
	border-left-color: #77736c;
}

.admin-summary {
	background-color: #faf9f7;
	border: 1px solid #dedbd5;
	margin: 0 0 22px;
}

.admin-summary td {
	border-bottom: 1px solid #e6e2dc;
	padding: 12px 14px !important;
}

.admin-summary tr:last-child td {
	border-bottom: 0;
}

.admin-label {
	color: #77736c;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
}

.admin-value {
	color: #171614;
	font-size: 14px;
	font-weight: 700;
}

img {
	border: 0;
	height: auto;
	max-width: 100%;
	outline: none;
	text-decoration: none;
}

@media only screen and (max-width: 620px) {
	#wrapper { padding: 16px 10px !important; }
	#template_container { width: 100% !important; }
	#template_header h1, h1 { font-size: 24px !important; }
	#body_content table td, #body_content table th { padding: 9px 6px !important; }
	.button, a.button { box-sizing: border-box; display: block !important; width: 100% !important; }
	.admin-summary td { display: block !important; width: 100% !important; }
}
<?php
