<?php
/**
 * Plugin Name: Sasan fragrance fields
 * Description: Adds editable "Inspired By" and Top/Middle/Base note fields to the
 *              product edit screen, and exposes them over the REST API.
 *
 *              Previously this information only existed inside the product
 *              description prose, where the storefront had to scrape it with
 *              regexes — so it was invisible and uneditable in wp-admin.
 *
 *              Network-wide: lives in mu-plugins so every market site gets it.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Meta keys are intentionally NOT underscore-prefixed so WooCommerce exposes
 * them in the REST meta_data array without extra allow-listing.
 */
function sasan_fragrance_fields() {
	return array(
		'sasan_inspired_by' => array(
			'label'       => 'Inspired By (Perfume Name)',
			'placeholder' => 'e.g. Baccarat Rouge 540',
		),
		'sasan_note_top'    => array(
			'label'       => 'Top Note',
			'placeholder' => 'e.g. bergamot, aldehydes, pink pepper',
		),
		'sasan_note_middle' => array(
			'label'       => 'Middle Note',
			'placeholder' => 'e.g. jasmine, orange blossom',
		),
		'sasan_note_base'   => array(
			'label'       => 'Base Note',
			'placeholder' => 'e.g. white musk, cedar, vanilla',
		),
		'sasan_notes_raw'   => array(
			'label'       => 'Notes (raw import)',
			'placeholder' => 'Original text from the source sheet',
		),
	);
}

/* -------------------------------------------------------------------------
 * Admin: a dedicated "Fragrance" tab on the Product data box
 * ---------------------------------------------------------------------- */

add_filter(
	'woocommerce_product_data_tabs',
	function ( $tabs ) {
		$tabs['sasan_fragrance'] = array(
			'label'    => 'Fragrance',
			'target'   => 'sasan_fragrance_product_data',
			'class'    => array(),
			'priority' => 65,
		);

		return $tabs;
	}
);

add_action(
	'woocommerce_product_data_panels',
	function () {
		global $post;

		echo '<div id="sasan_fragrance_product_data" class="panel woocommerce_options_panel hidden">';
		echo '<div class="options_group">';

		foreach ( sasan_fragrance_fields() as $key => $field ) {
			$value = get_post_meta( $post->ID, $key, true );

			// The raw import text duplicates the three note fields, so it is only
			// shown for the handful of products whose notes could not be split —
			// there it is the only record of the fragrance.
			if ( 'sasan_notes_raw' === $key && '' === trim( (string) $value ) ) {
				continue;
			}

			woocommerce_wp_text_input(
				array(
					'id'          => $key,
					'label'       => $field['label'],
					'placeholder' => $field['placeholder'],
					'value'       => $value,
					'desc_tip'    => false,
					'wrapper_class' => 'form-row-full',
				)
			);
		}

		echo '</div></div>';
	}
);

add_action(
	'woocommerce_process_product_meta',
	function ( $post_id ) {
		foreach ( array_keys( sasan_fragrance_fields() ) as $key ) {
			if ( ! isset( $_POST[ $key ] ) ) {
				continue;
			}

			$value = sanitize_text_field( wp_unslash( $_POST[ $key ] ) );

			if ( '' === $value ) {
				delete_post_meta( $post_id, $key );
			} else {
				update_post_meta( $post_id, $key, $value );
			}
		}
	}
);

// Give the fields room to breathe — they hold sentence-length values.
add_action(
	'admin_head',
	function () {
		echo '<style>
			#sasan_fragrance_product_data .form-row-full { width: 100%; padding: 8px 12px; }
			#sasan_fragrance_product_data .form-row-full label { display:block; float:none; width:auto; margin-bottom:4px; font-weight:600; }
			#sasan_fragrance_product_data .form-row-full input { width: 100%; }
		</style>';
	}
);

/* -------------------------------------------------------------------------
 * REST: surface the fields as a single object on the product response
 * ---------------------------------------------------------------------- */

function sasan_fragrance_payload( $product_id ) {
	$payload = array();

	foreach ( array_keys( sasan_fragrance_fields() ) as $key ) {
		$short             = str_replace( array( 'sasan_note_', 'sasan_' ), '', $key );
		$payload[ $short ] = (string) get_post_meta( $product_id, $key, true );
	}

	return $payload;
}

add_filter(
	'woocommerce_rest_prepare_product_object',
	function ( $response, $product ) {
		if ( ! $response instanceof WP_REST_Response ) {
			return $response;
		}

		$data                     = $response->get_data();
		$data['sasan_fragrance']  = sasan_fragrance_payload( $product->get_id() );
		$response->set_data( $data );

		return $response;
	},
	20,
	2
);

/**
 * The storefront reads products through the Store API, not wc/v3, so the same
 * payload is registered there too. It arrives as extensions.sasan_fragrance.
 */
add_action(
	'woocommerce_blocks_loaded',
	function () {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			return;
		}

		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => 'product',
				'namespace'       => 'sasan_fragrance',
				'data_callback'   => function ( $product ) {
					return sasan_fragrance_payload( $product->get_id() );
				},
				'schema_callback' => function () {
					$schema = array();

					foreach ( array( 'inspired_by', 'top', 'middle', 'base', 'notes_raw' ) as $key ) {
						$schema[ $key ] = array(
							'description' => 'Fragrance field: ' . $key,
							'type'        => 'string',
							'readonly'    => true,
						);
					}

					return $schema;
				},
				'schema_type'     => ARRAY_A,
			)
		);
	}
);
