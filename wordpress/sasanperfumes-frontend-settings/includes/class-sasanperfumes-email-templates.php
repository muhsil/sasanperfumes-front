<?php
/**
 * ShapeHive Email Templates
 *
 * Overrides WooCommerce email templates with custom sasanperfumes-branded versions
 * that use the headless frontend URLs instead of WordPress admin URLs.
 *
 * @package sasanperfumes_Frontend_Settings
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class sasanperfumes_Email_Templates {

	private static $instance = null;
	private const DEFAULT_FRONTEND_URL = 'https://sasanperfumes.com';

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_filter( 'woocommerce_locate_template', array( $this, 'override_woocommerce_template' ), 10, 3 );
		add_filter( 'woocommerce_currency_symbol', array( $this, 'replace_aed_currency_symbol' ), 10, 2 );
		add_filter( 'woocommerce_email_footer_text', array( $this, 'remove_app_promo_from_footer' ), 999 );
		add_filter( 'woocommerce_email_mobile_messaging', '__return_empty_string' );
		add_action( 'init', array( $this, 'remove_mobile_app_banner' ) );
		add_action( 'init', array( $this, 'enforce_email_sender_settings' ), 20 );
		add_action( 'admin_init', array( $this, 'enforce_email_sender_settings' ), 20 );
		add_filter( 'woocommerce_email_from_name', array( $this, 'override_email_from_name' ), 999 );
		add_filter( 'woocommerce_email_from_address', array( $this, 'override_email_from_address' ), 999 );
		add_filter( 'wp_mail_from_name', array( $this, 'override_email_from_name' ), 999 );
		add_filter( 'wp_mail_from', array( $this, 'override_email_from_address' ), 999 );
		add_filter( 'pre_wp_mail', array( $this, 'maybe_send_mail_directly' ), 999, 2 );
		add_action( 'rest_api_init', array( $this, 'register_email_preview_send_override' ), 999 );
		add_filter( 'wp_mail', array( $this, 'prepare_large_order_email_for_php_mail' ), 10000 );
		add_filter( 'woocommerce_email_enabled_customer_new_account', '__return_true', 999 );
		add_filter( 'woocommerce_email_enabled_customer_reset_password', '__return_true', 999 );
		add_filter( 'password_change_email', array( $this, 'rewrite_password_change_email' ), 999, 3 );
		add_filter( 'email_change_email', array( $this, 'rewrite_email_change_email' ), 999, 3 );
		add_action( 'rest_api_init', array( $this, 'register_account_email_routes' ) );
	}

	private function get_frontend_url() {
		return self::get_customer_frontend_url();
	}

	public static function get_customer_frontend_url() {
		if ( function_exists( 'sasanperfumes_get_frontend_url' ) ) {
			$resolved_url = untrailingslashit( sasanperfumes_get_frontend_url( self::DEFAULT_FRONTEND_URL ) );
			if ( ! self::is_backend_url( $resolved_url ) ) {
				return $resolved_url;
			}
		}

		$configured_url = trim( (string) get_option( 'sasanperfumes_frontend_url', '' ) );
		$configured_url = untrailingslashit( $configured_url !== '' ? $configured_url : self::DEFAULT_FRONTEND_URL );

		if ( self::is_backend_url( $configured_url ) ) {
			return self::DEFAULT_FRONTEND_URL;
		}

		return $configured_url;
	}

	private static function is_backend_url( $url ) {
		$host = wp_parse_url( (string) $url, PHP_URL_HOST );
		return is_string( $host ) && preg_match( '/(^|\.)cms\.sasanperfumes\.(com|ae)$/i', $host );
	}

	public function register_account_email_routes() {
		if ( ! function_exists( 'sasanperfumes_register_rest_route' ) ) {
			return;
		}

		sasanperfumes_register_rest_route(
			'/account/request-password-reset',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_password_reset_request' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'email' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_email',
					),
				),
			)
		);
	}

	public function handle_password_reset_request( $request ) {
		$email = sanitize_email( (string) $request->get_param( 'email' ) );

		if ( ! is_email( $email ) ) {
			return new WP_REST_Response(
				array(
					'success' => false,
					'code'    => 'invalid_email',
					'message' => 'Please enter a valid email address.',
				),
				400
			);
		}

		$user = get_user_by( 'email', $email );

		if ( $user instanceof WP_User ) {
			$reset_key = get_password_reset_key( $user );

			if ( ! is_wp_error( $reset_key ) ) {
				if ( function_exists( 'WC' ) && WC() ) {
					WC()->mailer();
				}

				do_action( 'woocommerce_reset_password_notification', $user->user_login, $reset_key );
			}
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'If an account exists with this email, you will receive a password reset link shortly.',
			)
		);
	}

	public function remove_app_promo_from_footer( $footer_text ) {
		$footer_text = preg_replace( '/<p[^>]*>.*?Process your orders on the go.*?<\/p>/is', '', $footer_text );
		$footer_text = preg_replace( '/<p[^>]*>.*?Get the app.*?<\/p>/is', '', $footer_text );
		$footer_text = preg_replace( '/Process your orders on the go.*?Get the app[^<]*/is', '', $footer_text );
		return trim( $footer_text );
	}

	public function remove_mobile_app_banner() {
		remove_all_actions( 'woocommerce_email_mobile_messaging' );
	}

	public function replace_aed_currency_symbol( $currency_symbol, $currency ) {
		if ( 'AED' === $currency ) {
			return 'AED';
		}
		return $currency_symbol;
	}

	public function override_email_from_name( $from_name ) {
		$configured_name = trim( (string) get_option( 'woocommerce_email_from_name', '' ) );
		if ( $configured_name !== '' ) {
			return $configured_name;
		}

		return get_bloginfo( 'name' ) ?: 'Sasan Perfumes';
	}

	public function override_email_from_address( $from_address ) {
		return 'support@sasanperfumes.com';
	}

	private function normalize_mail_recipients( $to ) {
		if ( is_array( $to ) ) {
			$emails = $to;
		} else {
			$emails = preg_split( '/\s*,\s*/', (string) $to, -1, PREG_SPLIT_NO_EMPTY );
		}

		$emails = array_filter(
			array_map(
				static function ( $email ) {
					return sanitize_email( (string) $email );
				},
				$emails
			),
			'is_email'
		);

		return array_values( array_unique( $emails ) );
	}

	private function mail_body_is_html( $message ) {
		$message = (string) $message;
		return ( false !== strpos( $message, '<html' ) )
			|| ( false !== strpos( $message, '<table' ) )
			|| ( false !== strpos( $message, '<div' ) )
			|| ( false !== strpos( $message, '<p' ) )
			|| ( false !== strpos( $message, '<br' ) );
	}

	private function build_raw_mail_headers( $headers, $message ) {
		$lines = array();

		if ( is_string( $headers ) && trim( $headers ) !== '' ) {
			$lines = preg_split( '/\r\n|\r|\n/', trim( $headers ) );
		} elseif ( is_array( $headers ) ) {
			$lines = $headers;
		}

		$lines = array_values(
			array_filter(
				array_map(
					static function ( $line ) {
						return trim( (string) $line );
					},
					$lines
				)
			)
		);

		$normalized = array();
		$has_from = false;
		$has_content_type = false;
		$has_mime_version = false;

		foreach ( $lines as $line ) {
			$lower = strtolower( $line );
			if ( 0 === strpos( $lower, 'from:' ) ) {
				$has_from = true;
			}
			if ( 0 === strpos( $lower, 'content-type:' ) ) {
				$has_content_type = true;
			}
			if ( 0 === strpos( $lower, 'mime-version:' ) ) {
				$has_mime_version = true;
			}
			$normalized[] = $line;
		}

		if ( ! $has_from ) {
			$normalized[] = 'From: Sasan Perfumes <support@sasanperfumes.com>';
		}

		if ( ! $has_mime_version ) {
			$normalized[] = 'MIME-Version: 1.0';
		}

		if ( ! $has_content_type ) {
			$normalized[] = $this->mail_body_is_html( $message )
				? 'Content-Type: text/html; charset=UTF-8'
				: 'Content-Type: text/plain; charset=UTF-8';
		}

		return implode( "\r\n", $normalized );
	}

	private function send_raw_mail( $to, $subject, $message, $headers = array() ) {
		$recipients = $this->normalize_mail_recipients( $to );

		if ( empty( $recipients ) ) {
			return false;
		}

		$subject = wp_specialchars_decode( (string) $subject, ENT_QUOTES );
		$message = (string) $message;
		$header_string = $this->build_raw_mail_headers( $headers, $message );
		$to_string = implode( ',', $recipients );
		$sent = false;

		if ( function_exists( 'mail' ) ) {
			$sent = @mail( $to_string, $subject, $message, $header_string, '-fsupport@sasanperfumes.com' );
			if ( ! $sent ) {
				$sent = @mail( $to_string, $subject, $message, $header_string );
			}
		}

		return (bool) $sent;
	}

	private function should_use_raw_mail_fallback( $atts ) {
		if ( ! is_array( $atts ) ) {
			return false;
		}

		$recipients = $this->normalize_mail_recipients( $atts['to'] ?? '' );
		if ( empty( array_intersect( $recipients, array( 'orders@sasanperfumes.com', 'sasanperfumesuae@gmail.com' ) ) ) ) {
			return false;
		}

		$subject = strtolower( (string) ( $atts['subject'] ?? '' ) );
		$message = strtolower( (string) ( $atts['message'] ?? '' ) );

		if ( false !== strpos( $subject, 'new order' ) || false !== strpos( $subject, 'order #' ) || false !== strpos( $subject, 'test email' ) ) {
			return true;
		}

		if ( false !== strpos( $message, 'order details' ) || false !== strpos( $message, 'customer details' ) || false !== strpos( $message, 'new order' ) ) {
			return true;
		}

		return false;
	}

	public function maybe_send_mail_directly( $pre, $atts ) {
		if ( null !== $pre || ! $this->should_use_raw_mail_fallback( $atts ) ) {
			return $pre;
		}

		$sent = $this->send_raw_mail(
			$atts['to'] ?? '',
			$atts['subject'] ?? '',
			$atts['message'] ?? '',
			$atts['headers'] ?? array()
		);

		return $sent ? true : $pre;
	}

	public function enforce_email_sender_settings() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}

		$desired_name = 'Sasan Perfumes';
		$desired_address = 'support@sasanperfumes.com';

		if ( trim( (string) get_option( 'woocommerce_email_from_name', '' ) ) !== $desired_name ) {
			update_option( 'woocommerce_email_from_name', $desired_name );
		}

		if ( trim( (string) get_option( 'woocommerce_email_from_address', '' ) ) !== $desired_address ) {
			update_option( 'woocommerce_email_from_address', $desired_address );
		}
	}

	public function prepare_large_order_email_for_php_mail( $args ) {
		if ( ! isset( $args['message'] ) || ! is_string( $args['message'] ) ) {
			return $args;
		}

		$subject = isset( $args['subject'] ) ? wp_specialchars_decode( (string) $args['subject'], ENT_QUOTES ) : '';
		$message = $args['message'];
		$is_order_email = false !== stripos( $subject, 'new order' )
			|| ( false !== strpos( $message, 'email-order-details' ) && false !== strpos( $message, 'Billing address' ) );

		if ( ! $is_order_email ) {
			return $args;
		}

		$message = preg_replace( '/<style\b[^>]*>.*?<\/style>/is', '', $message );
		$message = preg_replace( '/<!--.*?-->/s', '', $message );
		$message = preg_replace( '/\sstyle=(".*?"|\'.*?\')/is', '', $message );
		$message = preg_replace( '/<br>\s*<p[^>]*>\s*<\/p>\s*Process your orders on the go\.\s*<a\b[^>]*>Get the app<\/a>\.?/is', '', $message );
		$message = preg_replace( '/Process your orders on the go\.\s*<a\b[^>]*>Get the app<\/a>\.?/is', '', $message );
		$message = preg_replace( '/>\s+</', ">\n<", $message );
		$message = preg_replace( '/[ \t]{2,}/', ' ', $message );
		$message = preg_replace( "/\n{3,}/", "\n\n", $message );

		$args['message'] = trim( $message );
		return $args;
	}

	public function register_email_preview_send_override() {
		if ( ! function_exists( 'register_rest_route' ) || ! class_exists( 'WP_REST_Server' ) ) {
			return;
		}

		register_rest_route(
			'wc-admin-email',
			'/settings/email/send-preview',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'send_email_preview_with_prepared_email' ),
					'permission_callback' => function( $request ) {
						return current_user_can( 'manage_woocommerce' );
					},
				),
			),
			true
		);
	}

	public function send_email_preview_with_prepared_email( $request ) {
		if ( ! wp_verify_nonce( (string) $request->get_param( 'nonce' ), 'email-preview-nonce' ) || ! current_user_can( 'manage_woocommerce' ) ) {
			return new WP_Error( 'invalid_nonce', __( 'Invalid nonce.', 'woocommerce' ), array( 'status' => 403 ) );
		}

		if ( ! function_exists( 'wc_get_container' ) || ! class_exists( 'Automattic\WooCommerce\Internal\Admin\EmailPreview\EmailPreview' ) ) {
			return new WP_Error(
				'woocommerce_rest_email_preview_not_available',
				__( 'Email preview is not available.', 'woocommerce' ),
				array( 'status' => 500 )
			);
		}

		$email_address = sanitize_email( (string) $request->get_param( 'email' ) );
		if ( ! is_email( $email_address ) ) {
			return new WP_Error( 'invalid_email', __( 'Invalid email address.', 'woocommerce' ), array( 'status' => 400 ) );
		}

		$email_type = sanitize_text_field( (string) $request->get_param( 'type' ) );

		$buffer_level = ob_get_level();
		ob_start();

		try {
			$preview = wc_get_container()->get( \Automattic\WooCommerce\Internal\Admin\EmailPreview\EmailPreview::class );
			$preview->set_email_type( $email_type );

			$email_content = $preview->render();
			$email_subject = $preview->get_subject();

			$content_type = function() {
				return 'text/html';
			};
			add_filter( 'wp_mail_content_type', $content_type, 999 );
			try {
				$sent = wp_mail(
					$email_address,
					wp_specialchars_decode( $email_subject, ENT_QUOTES ),
					$email_content,
					array(
						'Content-Type: text/html; charset=UTF-8',
					)
				);
				if ( ! $sent ) {
					$sent = $this->send_raw_mail(
						$email_address,
						$email_subject,
						$email_content,
						array(
							'Content-Type: text/html; charset=UTF-8',
						)
					);
				}
			} finally {
				remove_filter( 'wp_mail_content_type', $content_type, 999 );
			}
		} catch ( \Throwable $e ) {
			while ( ob_get_level() > $buffer_level ) {
				ob_end_clean();
			}

			return new WP_Error(
				'woocommerce_rest_email_preview_not_rendered',
				__( 'There was an error rendering an email preview.', 'woocommerce' ),
				array( 'status' => 500 )
			);
		}

		while ( ob_get_level() > $buffer_level ) {
			ob_end_clean();
		}

		if ( $sent ) {
			return rest_ensure_response(
				array(
					'message' => sprintf(
						/* translators: %s: Email address. */
						__( 'Test email sent to %s.', 'woocommerce' ),
						$email_address
					),
				)
			);
		}

		return new WP_Error(
			'woocommerce_rest_email_preview_not_sent',
			__( 'Error sending test email. Please try again.', 'woocommerce' ),
			array( 'status' => 500 )
		);
	}

	public function rewrite_password_change_email( $pass_change_email, $user, $userdata ) {
		$frontend_url = $this->get_frontend_url();

		$pass_change_email['subject'] = '[%s] Password Changed';
		$pass_change_email['message'] = "Hi ###USERNAME###,\n\n"
			. "This notice confirms that your password was changed on ###SITENAME###.\n\n"
			. "If you did not change your password, please contact us at\n"
			. "support@sasanperfumes.com\n\n"
			. "This email has been sent to ###EMAIL###\n\n"
			. "Regards,\n"
			. "All at ###SITENAME###\n"
			. $frontend_url;

		return $pass_change_email;
	}

	public function rewrite_email_change_email( $email_change_email, $user, $userdata ) {
		$frontend_url = $this->get_frontend_url();

		$email_change_email['subject'] = '[%s] Email Changed';
		$email_change_email['message'] = "Hi ###USERNAME###,\n\n"
			. "This notice confirms that your email address on ###SITENAME### was changed to ###NEW_EMAIL###.\n\n"
			. "If you did not change your email, please contact us at\n"
			. "support@sasanperfumes.com\n\n"
			. "This email has been sent to ###EMAIL###\n\n"
			. "Regards,\n"
			. "All at ###SITENAME###\n"
			. $frontend_url;

		return $email_change_email;
	}

	public function override_woocommerce_template( $template, $template_name, $template_path ) {
		if ( strpos( $template_name, 'emails/' ) !== 0 ) {
			return $template;
		}

		$plugin_template = sasanperfumes_SETTINGS_PATH . 'woocommerce/' . $template_name;

		if ( file_exists( $plugin_template ) ) {
			return $plugin_template;
		}

		return $template;
	}
}

sasanperfumes_Email_Templates::get_instance();
