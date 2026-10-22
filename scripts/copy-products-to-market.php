<?php
/**
 * Copies products from the main store to a market store, putting the price into
 * that market's currency and bringing the Arabic translation across where one
 * exists.
 *
 *   wp eval-file copy-products.php <skufile> <target-slug> <rate> <currency> [limit] [apply] --url=cms.sasanperfumes.com
 *
 * Each store is its own blog with its own posts and its own uploads directory,
 * so a product cannot be pointed at from another store — it has to be recreated,
 * and its image copied on disk into the target blog's uploads. The image is
 * copied rather than fetched over HTTP because this host cannot reach its own
 * public hostname.
 *
 * Stock is deliberately left unmanaged on the copy: each store keeps its own
 * counts, and carrying a number across would claim stock the market may not
 * hold.
 */

global $wpdb;

$skuFile    = isset( $args[0] ) ? $args[0] : '';
$targetSlug = isset( $args[1] ) ? trim( $args[1], '/' ) : '';
$rate       = isset( $args[2] ) ? (float) $args[2] : 0;
$currency   = isset( $args[3] ) ? strtoupper( $args[3] ) : '';
$limit      = ( isset( $args[4] ) && is_numeric( $args[4] ) ) ? (int) $args[4] : 0;
$apply      = in_array( 'apply', $args, true );

if ( ! $skuFile || ! $targetSlug || ! $rate || ! $currency ) {
	echo "usage: copy-products.php <skufile> <target-slug> <rate> <currency> [limit] [apply]\n";
	return;
}

// The currency is named on the command line rather than read with
// get_woocommerce_currency(), which is filtered and answers for the blog
// WooCommerce booted on — on the SA store it still returns AED. Getting it
// wrong would round an OMR price to two decimals instead of three.
$decimals = in_array( $currency, array( 'OMR', 'BHD', 'KWD' ), true ) ? 3 : 2;

$skus = array_filter( array_map( 'trim', explode( "\n", (string) file_get_contents( $skuFile ) ) ) );
if ( $limit > 0 ) {
	$skus = array_slice( $skus, 0, $limit );
}

$source_blog = get_current_blog_id();
$target_blog = (int) $wpdb->get_var(
	$wpdb->prepare( "SELECT blog_id FROM {$wpdb->blogs} WHERE path = %s", '/' . $targetSlug . '/' )
);

if ( ! $target_blog ) {
	printf( "cannot resolve a blog for '%s'\n", $targetSlug );
	return;
}

// Stop rather than publish prices in the wrong currency if the market and the
// rate on the command line disagree.
$stored_currency = get_blog_option( $target_blog, 'woocommerce_currency' );
if ( $stored_currency !== $currency ) {
	printf(
		"refusing: the %s store sells in %s, but %s was given on the command line\n",
		$targetSlug,
		$stored_currency ? $stored_currency : '(unset)',
		$currency
	);
	return;
}

function sasan_read_product( $id ) {
	$p = wc_get_product( $id );
	if ( ! $p ) {
		return null;
	}

	$img_id = $p->get_image_id();
	$img    = $img_id ? get_attached_file( $img_id ) : '';
	$terms  = (array) get_the_terms( $id, 'product_cat' );
	$cats   = wp_list_pluck( $terms, 'slug' );
	$names  = wp_list_pluck( $terms, 'name' );

	return array(
		'sku'         => $p->get_sku(),
		'name'        => $p->get_name(),
		'slug'        => $p->get_slug(),
		'description' => $p->get_description(),
		'short'       => $p->get_short_description(),
		'regular'     => (float) $p->get_regular_price(),
		'sale'        => ( '' === $p->get_sale_price() ) ? null : (float) $p->get_sale_price(),
		'cats'        => array_values( array_filter( $cats ) ),
		'cat_names'   => array_values( $names ),
		'image_path'  => ( $img && file_exists( $img ) ) ? $img : '',
		'image_name'  => $img ? basename( $img ) : '',
		'image_alt'   => $img_id ? (string) get_post_meta( $img_id, '_wp_attachment_image_alt', true ) : '',
		'fragrance'   => get_post_meta( $id, '_sasan_fragrance', true ),
		'menu_order'  => $p->get_menu_order(),
	);
}

function sasan_sideload( $path, $name, $alt, $post_id ) {
	if ( ! $path || ! file_exists( $path ) ) {
		return 0;
	}

	$up = wp_upload_dir();
	if ( ! empty( $up['error'] ) ) {
		return 0;
	}

	$dest = trailingslashit( $up['path'] ) . wp_unique_filename( $up['path'], $name );
	if ( ! @copy( $path, $dest ) ) {
		return 0;
	}

	$type = wp_check_filetype( $dest );
	$att  = wp_insert_attachment(
		array(
			'guid'           => trailingslashit( $up['url'] ) . basename( $dest ),
			'post_mime_type' => $type['type'] ? $type['type'] : 'image/jpeg',
			'post_title'     => sanitize_file_name( pathinfo( $dest, PATHINFO_FILENAME ) ),
			'post_content'   => '',
			'post_status'    => 'inherit',
		),
		$dest,
		$post_id
	);

	if ( is_wp_error( $att ) || ! $att ) {
		return 0;
	}

	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $att, wp_generate_attachment_metadata( $att, $dest ) );
	if ( $alt ) {
		update_post_meta( $att, '_wp_attachment_image_alt', $alt );
	}

	return (int) $att;
}

/**
 * An English product and its Arabic translation share one SKU here, on every
 * store — that is how the 1,200-odd pairs already in place are written. But
 * WC_Product::save() rejects a SKU another product already holds, so the
 * translation cannot be saved with it. Pass $share_sku to write it afterwards,
 * the way WPML's own duplication does, instead of going through the setter.
 */
function sasan_write_shared_sku( $id, $sku ) {
	global $wpdb;

	update_post_meta( $id, '_sku', $sku );
	$wpdb->update( $wpdb->prefix . 'wc_product_meta_lookup', array( 'sku' => $sku ), array( 'product_id' => $id ) );
	wp_cache_delete( 'wc_product_' . $id, 'products' );
}

function sasan_create_product( $d, $rate, $decimals, $share_sku = false ) {
	$p = new WC_Product_Simple();
	$p->set_name( $d['name'] );
	$p->set_slug( $d['slug'] );
	if ( ! $share_sku ) {
		$p->set_sku( $d['sku'] );
	}
	$p->set_description( $d['description'] );
	$p->set_short_description( $d['short'] );
	$p->set_regular_price( (string) round( $d['regular'] * $rate, $decimals ) );
	if ( null !== $d['sale'] ) {
		$p->set_sale_price( (string) round( $d['sale'] * $rate, $decimals ) );
	}
	$p->set_catalog_visibility( 'visible' );
	$p->set_status( 'publish' );
	$p->set_menu_order( $d['menu_order'] );
	$p->set_manage_stock( false );
	$p->set_stock_status( 'instock' );
	$p->set_backorders( 'no' );

	$id = $p->save();
	if ( ! $id ) {
		return 0;
	}

	if ( $share_sku ) {
		sasan_write_shared_sku( $id, $d['sku'] );
	}

	if ( $d['cats'] ) {
		$ids = array();
		foreach ( $d['cats'] as $i => $slug ) {
			// The markets spell this one differently; everything else matches.
			$slug = ( 'woman-perfumes' === $slug ) ? 'womens-perfumes' : $slug;
			$t    = get_term_by( 'slug', $slug, 'product_cat' );

			if ( ! $t ) {
				$made = wp_insert_term(
					isset( $d['cat_names'][ $i ] ) ? $d['cat_names'][ $i ] : $slug,
					'product_cat',
					array( 'slug' => $slug )
				);
				if ( ! is_wp_error( $made ) ) {
					$t = get_term( (int) $made['term_id'], 'product_cat' );
					printf( "      created category %s\n", $slug );
				}
			}

			if ( $t && ! is_wp_error( $t ) ) {
				$ids[] = (int) $t->term_id;
			}
		}
		if ( $ids ) {
			wp_set_object_terms( $id, $ids, 'product_cat' );
		}
	}

	if ( $d['fragrance'] ) {
		update_post_meta( $id, '_sasan_fragrance', $d['fragrance'] );
	}

	$att = sasan_sideload( $d['image_path'], $d['image_name'], $d['image_alt'], $id );
	if ( $att ) {
		set_post_thumbnail( $id, $att );
	}

	return $id;
}

printf(
	"source blog %d -> target blog %d (%s)   rate %.4f   %s at %d dp\n",
	$source_blog,
	$target_blog,
	$targetSlug,
	$rate,
	$currency,
	$decimals
);
printf( "%d SKUs%s\n\n", count( $skus ), $apply ? '' : '   [DRY RUN]' );

$created = 0;
$createdAr = 0;
$skipped = 0;
$failed = 0;

foreach ( $skus as $sku ) {
	switch_to_blog( $source_blog );

	$src_id = wc_get_product_id_by_sku( $sku );
	if ( ! $src_id ) {
		restore_current_blog();
		$failed++;
		continue;
	}

	$en   = sasan_read_product( $src_id );
	$ar   = null;
	$trid = apply_filters( 'wpml_element_trid', null, $src_id, 'post_product' );

	if ( $trid ) {
		foreach ( (array) apply_filters( 'wpml_get_element_translations', array(), $trid, 'post_product' ) as $t ) {
			if ( 'ar' === $t->language_code && (int) $t->element_id !== $src_id ) {
				$ar = sasan_read_product( (int) $t->element_id );
			}
		}
	}

	restore_current_blog();

	switch_to_blog( $target_blog );

	if ( wc_get_product_id_by_sku( $sku ) ) {
		restore_current_blog();
		$skipped++;
		continue;
	}

	printf(
		"  %-14s %-26s %7.2f -> %s %s%s\n",
		$sku,
		mb_substr( $en['name'], 0, 26 ),
		$en['regular'],
		number_format( round( $en['regular'] * $rate, $decimals ), $decimals ),
		$currency,
		$ar ? '  +ar' : ''
	);

	if ( $apply ) {
		$new_en = sasan_create_product( $en, $rate, $decimals );

		if ( $new_en ) {
			$created++;
			do_action(
				'wpml_set_element_language_details',
				array(
					'element_id'    => $new_en,
					'element_type'  => 'post_product',
					'trid'          => null,
					'language_code' => 'en',
				)
			);

			if ( $ar ) {
				$new_trid = apply_filters( 'wpml_element_trid', null, $new_en, 'post_product' );
				$new_ar   = sasan_create_product( $ar, $rate, $decimals, true );

				if ( $new_ar ) {
					$createdAr++;
					do_action(
						'wpml_set_element_language_details',
						array(
							'element_id'           => $new_ar,
							'element_type'         => 'post_product',
							'trid'                 => $new_trid,
							'language_code'        => 'ar',
							'source_language_code' => 'en',
						)
					);
				}
			}
		} else {
			$failed++;
		}
	}

	restore_current_blog();
}

printf(
	"\n%s   created=%d  arabic=%d  already_present=%d  failed=%d\n",
	$apply ? 'APPLIED' : 'DRY RUN',
	$created,
	$createdAr,
	$skipped,
	$failed
);
