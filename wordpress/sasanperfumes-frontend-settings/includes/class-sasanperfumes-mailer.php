<?php
/**
 * Sasan Perfumes mail transport helpers.
 *
 * Uses PHPMailer SMTP when ZeptoMail or another SMTP configuration is present.
 *
 * @package sasanperfumes_Frontend_Settings
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class sasanperfumes_Mailer {

	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ), 20 );
	}

	private function get_option_value( $option_name, $default = '' ) {
		$value = get_option( $option_name, $default );
		return is_string( $value ) ? trim( $value ) : $default;
	}

	private function resolve_transport_config() {
		$config = array(
			'enabled'    => false,
			'host'       => '',
			'port'       => 587,
			'encryption' => 'tls',
			'username'   => '',
			'password'   => '',
			'from_email' => 'support@sasanperfumes.com',
			'from_name'  => 'Sasan Perfumes',
		);

		$provider = strtolower( $this->get_option_value( 'sasanperfumes_mail_provider', '' ) );
		$host = $this->get_option_value( 'sasanperfumes_smtp_host', '' );

		if ( '' === $host && in_array( $provider, array( 'zeptomail', 'zoho_zeptomail' ), true ) ) {
			$host = 'smtp.zeptomail.com';
		}

		$port = absint( $this->get_option_value( 'sasanperfumes_smtp_port', 0 ) );
		if ( 0 === $port && in_array( $provider, array( 'zeptomail', 'zoho_zeptomail' ), true ) ) {
			$port = 587;
		}

		$encryption = strtolower( $this->get_option_value( 'sasanperfumes_smtp_encryption', '' ) );
		if ( '' === $encryption && in_array( $provider, array( 'zeptomail', 'zoho_zeptomail' ), true ) ) {
			$encryption = 'tls';
		}

		$username = $this->get_option_value( 'sasanperfumes_smtp_username', '' );
		$password = $this->get_option_value( 'sasanperfumes_smtp_password', '' );
		$from_email = sanitize_email( $this->get_option_value( 'sasanperfumes_mail_from_email', 'support@sasanperfumes.com' ) );
		$from_name = $this->get_option_value( 'sasanperfumes_mail_from_name', 'Sasan Perfumes' );

		if ( '' === $username ) {
			$username = defined( 'SASANPERFUMES_SMTP_USERNAME' ) ? (string) SASANPERFUMES_SMTP_USERNAME : '';
		}

		if ( '' === $password ) {
			$password = defined( 'SASANPERFUMES_SMTP_PASSWORD' ) ? (string) SASANPERFUMES_SMTP_PASSWORD : '';
		}

		if ( '' === $host ) {
			$host = defined( 'SASANPERFUMES_SMTP_HOST' ) ? (string) SASANPERFUMES_SMTP_HOST : '';
		}

		if ( 0 === $port && defined( 'SASANPERFUMES_SMTP_PORT' ) ) {
			$port = absint( SASANPERFUMES_SMTP_PORT );
		}

		if ( '' === $encryption && defined( 'SASANPERFUMES_SMTP_ENCRYPTION' ) ) {
			$encryption = strtolower( (string) SASANPERFUMES_SMTP_ENCRYPTION );
		}

		if ( in_array( $provider, array( 'zeptomail', 'zoho_zeptomail' ), true ) ) {
			if ( '' === $username ) {
				$username = 'emailapikey';
			}
			if ( '' === $port ) {
				$port = 587;
			}
		}

		$config['enabled']    = ( '' !== $host && '' !== $username && '' !== $password );
		$config['host']       = $host;
		$config['port']       = $port > 0 ? $port : 587;
		$config['encryption'] = in_array( $encryption, array( 'ssl', 'tls', '' ), true ) ? $encryption : 'tls';
		$config['username']   = $username;
		$config['password']   = $password;
		$config['from_email'] = $from_email !== '' ? $from_email : 'support@sasanperfumes.com';
		$config['from_name']  = $from_name !== '' ? $from_name : 'Sasan Perfumes';

		return $config;
	}

	public function configure_phpmailer( $phpmailer ) {
		if ( ! is_object( $phpmailer ) ) {
			return;
		}

		$config = $this->resolve_transport_config();
		if ( ! $config['enabled'] || ! method_exists( $phpmailer, 'isSMTP' ) ) {
			return;
		}

		$phpmailer->isSMTP();
		$phpmailer->Host       = $config['host'];
		$phpmailer->Port       = $config['port'];
		$phpmailer->SMTPAuth   = true;
		$phpmailer->Username   = $config['username'];
		$phpmailer->Password   = $config['password'];
		$phpmailer->SMTPAutoTLS = ( 'ssl' !== $config['encryption'] );

		if ( 'ssl' === $config['encryption'] ) {
			$phpmailer->SMTPSecure = 'ssl';
		} elseif ( 'tls' === $config['encryption'] ) {
			$phpmailer->SMTPSecure = 'tls';
		}

		if ( method_exists( $phpmailer, 'setFrom' ) ) {
			$phpmailer->setFrom( $config['from_email'], $config['from_name'], false );
		} else {
			$phpmailer->From     = $config['from_email'];
			$phpmailer->FromName = $config['from_name'];
		}
	}
}

sasanperfumes_Mailer::get_instance();
