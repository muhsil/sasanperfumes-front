<?php
/**
 * ShapeHive Forms Module
 * 
 * Handles contact form and newsletter submissions via REST API.
 * Uses WordPress wp_mail() function to send emails.
 * 
 * @package sasanperfumes_Frontend_Settings
 * @since 5.10.0
 */

if (!defined('ABSPATH')) exit;

class sasanperfumes_Forms {
    
    /**
     * Initialize the forms module
     */
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    /**
     * Register REST API routes for forms
     */
    public function register_rest_routes() {
        // Contact form endpoint
        sasanperfumes_register_rest_route( '/contact', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_contact_form'),
            'permission_callback' => '__return_true',
            'args' => array(
                'first_name' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'last_name' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'email' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ),
                'phone' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'subject' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'message' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field',
                ),
            ),
        ));
        
        // Newsletter subscription endpoint
        sasanperfumes_register_rest_route( '/newsletter', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_newsletter_form'),
            'permission_callback' => '__return_true',
            'args' => array(
                'email' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ),
            ),
        ));
    }

    private function get_notification_recipients(): string {
        $recipients = trim((string) get_option('woocommerce_new_order_recipient', ''));
        if ($recipients === '') {
            $recipients = 'orders@sasanperfumes.com,sasanperfumesuae@gmail.com';
        }

        $emails = array_filter(array_map('trim', explode(',', $recipients)), 'strlen');
        if (empty($emails)) {
            return 'orders@sasanperfumes.com,sasanperfumesuae@gmail.com';
        }

        return implode(',', array_unique($emails));
    }

	private function get_from_address(): string {
		return 'support@sasanperfumes.com';
	}

    private function get_from_name(): string {
        $name = trim((string) get_option('woocommerce_email_from_name', ''));
        if ($name !== '') {
            return $name;
        }

        return get_bloginfo('name') ?: 'Sasan Perfumes';
    }
    
    /**
     * Handle contact form submission
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function handle_contact_form($request) {
        $first_name = $request->get_param('first_name');
        $last_name = $request->get_param('last_name');
        $email = $request->get_param('email');
        $phone = $request->get_param('phone') ?: '';
        $subject = $request->get_param('subject') ?: 'General Inquiry';
        $message = $request->get_param('message');
        
        // Validate email
        if (!is_email($email)) {
            return new WP_REST_Response(array(
                'success' => false,
                'code' => 'invalid_email',
                'message' => 'Please enter a valid email address.',
            ), 400);
        }
        
        $to = $this->get_notification_recipients();
        
        // Build email subject
        $email_subject = sprintf('[%s] Contact Form: %s', get_bloginfo('name'), $subject);
        
        // Build email body
        $email_body = sprintf(
            "New contact form submission:\n\n" .
            "Name: %s %s\n" .
            "Email: %s\n" .
            "Phone: %s\n" .
            "Subject: %s\n\n" .
            "Message:\n%s\n",
            $first_name,
            $last_name,
            $email,
            $phone,
            $subject,
            $message
        );
        
        // Set headers
        $headers = array(
            'Content-Type: text/plain; charset=UTF-8',
            sprintf('Reply-To: %s %s <%s>', $first_name, $last_name, $email),
        );
        
        // Send email
        $sent = wp_mail($to, $email_subject, $email_body, $headers);
        
        if ($sent) {
            // Log submission (optional - can be used with Flamingo or custom logging)
            do_action('sasanperfumes_contact_form_submitted', array(
                'first_name' => $first_name,
                'last_name' => $last_name,
                'email' => $email,
                'phone' => $phone,
                'subject' => $subject,
                'message' => $message,
            ));
            
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Your message has been sent successfully. We will get back to you soon.',
            ), 200);
        }
        
        return new WP_REST_Response(array(
            'success' => false,
            'code' => 'mail_failed',
            'message' => 'Failed to send message. Please try again later.',
        ), 500);
    }
    
    /**
     * Handle newsletter subscription
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function handle_newsletter_form($request) {
        $email = $request->get_param('email');
        
        // Validate email
        if (!is_email($email)) {
            return new WP_REST_Response(array(
                'success' => false,
                'code' => 'invalid_email',
                'message' => 'Please enter a valid email address.',
            ), 400);
        }
        
        $to = $this->get_notification_recipients();
        
        // Build email subject
        $email_subject = sprintf('[%s] New Newsletter Subscription', get_bloginfo('name'));
        
        // Build email body
        $email_body = sprintf(
            "New newsletter subscription:\n\n" .
            "Email: %s\n" .
            "Date: %s\n",
            $email,
            current_time('mysql')
        );
        
        // Set headers
        $headers = array(
            'Content-Type: text/plain; charset=UTF-8',
        );
        
        // Send notification email to admin
        $sent = wp_mail($to, $email_subject, $email_body, $headers);
        
        if ($sent) {
            $this->send_newsletter_confirmation_email($email);

            do_action('sasanperfumes_newsletter_subscribed', array(
                'email' => $email,
            ));
            
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Thank you for subscribing to our newsletter!',
            ), 200);
        }
        
        return new WP_REST_Response(array(
            'success' => false,
            'code' => 'subscription_failed',
            'message' => 'Failed to subscribe. Please try again later.',
        ), 500);
    }
    /**
     * Send confirmation email to newsletter subscriber
     *
     * @param string $email Subscriber email address
     * @return bool Whether the email was sent successfully
     */
    private function send_newsletter_confirmation_email($email) {
        $site_name = $this->get_from_name();
        $subject = sprintf('Welcome to %s Newsletter!', $site_name);

        $body = sprintf(
            "Hi there,\n\n" .
            "Thank you for subscribing to the %s newsletter!\n\n" .
            "You'll now receive updates on our latest products, exclusive offers, and fragrance tips straight to your inbox.\n\n" .
            "If you did not subscribe, please ignore this email.\n\n" .
            "Best regards,\n" .
            "The %s Team\n",
            $site_name,
            $site_name
        );

        $headers = array(
            'Content-Type: text/plain; charset=UTF-8',
            sprintf('From: %s <%s>', $site_name, $this->get_from_address()),
        );

        return wp_mail($email, $subject, $body, $headers);
    }
}

// Initialize the forms module
new sasanperfumes_Forms();
