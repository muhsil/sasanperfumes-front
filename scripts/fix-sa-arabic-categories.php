<?php
/**
 * Gives the Saudi store the Arabic product categories it never had.
 *
 *   wp eval-file fix-sa-arabic-categories.php [apply] --url=cms.sasanperfumes.com
 *
 * Saudi holds 632 Arabic products, and they list fine on the shop page, but
 * every Arabic category page returns the "this page seems to have moved"
 * screen. The products are attached to the ENGLISH category terms, and no
 * Arabic terms exist for the Arabic listing to query, so it finds nothing.
 *
 * Qatar and Oman are the model and are left untouched: there, each category is
 * two separate terms sharing one slug, joined by a trid in icl_translations,
 * and each language's products hang off its own term. This writes the same
 * shape on Saudi and moves the Arabic products across.
 *
 * Terms are inserted with $wpdb rather than wp_insert_term(), which refuses a
 * slug the taxonomy already holds - the duplicate slug is the point, and is
 * what Qatar does.
 *
 * Nothing English is touched: an English product keeps the term it is on, so
 * the English category pages are unchanged. Every relationship this moves is
 * written to a rollback file first.
 */

global $wpdb;

$apply    = in_array( 'apply', $args, true );
$SA_BLOG  = 7;
$ROLLBACK = '/home/u346814456/sa-arabic-categories-rollback.csv';

switch_to_blog( $SA_BLOG );

$icl = $wpdb->prefix . 'icl_translations';

if ( ! $wpdb->get_var( "SHOW TABLES LIKE '$icl'" ) ) {
	echo "no icl_translations table on this blog\n";
	restore_current_blog();
	return;
}

/**
 * Every English category term on this store that currently carries at least
 * one Arabic product, with the number of Arabic products on it.
 */
$targets = $wpdb->get_results(
	"SELECT tt.term_taxonomy_id en_ttid,
	        tt.term_id        en_term_id,
	        term.slug,
	        term.name,
	        tl.trid,
	        COUNT(DISTINCT tr.object_id) ar_products
	 FROM {$wpdb->term_relationships} tr
	 JOIN {$wpdb->term_taxonomy} tt  ON tt.term_taxonomy_id = tr.term_taxonomy_id
	                                AND tt.taxonomy = 'product_cat'
	 JOIN {$wpdb->terms} term        ON term.term_id = tt.term_id
	 JOIN $icl tl                    ON tl.element_id = tt.term_taxonomy_id
	                                AND tl.element_type = 'tax_product_cat'
	                                AND tl.language_code = 'en'
	 JOIN $icl p                     ON p.element_id = tr.object_id
	                                AND p.element_type = 'post_product'
	                                AND p.language_code = 'ar'
	 GROUP BY tt.term_taxonomy_id, tt.term_id, term.slug, term.name, tl.trid
	 ORDER BY ar_products DESC"
);

if ( ! $targets ) {
	echo "nothing to do: no Arabic products are sitting on an English category\n";
	restore_current_blog();
	return;
}

printf( "%-24s %-9s %-8s %-9s %s\n", 'CATEGORY', 'EN_TTID', 'TRID', 'AR_PRODS', 'ARABIC TERM' );

$plan       = array();
$total_move = 0;

foreach ( $targets as $t ) {
	// An Arabic sibling may already exist for this trid, as it does for
	// "uncategorized" - reuse it rather than making a second one.
	$ar_ttid = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT element_id FROM $icl
			 WHERE trid = %d AND element_type = 'tax_product_cat' AND language_code = 'ar' LIMIT 1",
			$t->trid
		)
	);

	$plan[] = array(
		'en_ttid'  => (int) $t->en_ttid,
		'slug'     => $t->slug,
		'name'     => $t->name,
		'trid'     => (int) $t->trid,
		'ar_ttid'  => $ar_ttid,
		'products' => (int) $t->ar_products,
	);
	$total_move += (int) $t->ar_products;

	printf(
		"%-24s %-9d %-8d %-9d %s\n",
		$t->slug,
		$t->en_ttid,
		$t->trid,
		$t->ar_products,
		$ar_ttid ? "reuse #$ar_ttid" : 'create'
	);
}

printf(
	"\n%d categories, %d Arabic product-to-category links to move%s\n",
	count( $plan ),
	$total_move,
	$apply ? '' : '   [DRY RUN]'
);

if ( ! $apply ) {
	restore_current_blog();
	return;
}

$rollback = fopen( $ROLLBACK, 'w' );
fputcsv( $rollback, array( 'object_id', 'from_term_taxonomy_id', 'to_term_taxonomy_id' ) );

$created = 0;
$moved   = 0;
$touched = array();

foreach ( $plan as $p ) {
	$ar_ttid = $p['ar_ttid'];

	if ( ! $ar_ttid ) {
		// A second term row carrying the same slug, which is how Qatar holds
		// its Arabic categories. wp_insert_term() would reject the slug.
		$wpdb->insert(
			$wpdb->terms,
			array(
				'name'       => $p['name'],
				'slug'       => $p['slug'],
				'term_group' => 0,
			)
		);
		$ar_term_id = (int) $wpdb->insert_id;
		if ( ! $ar_term_id ) {
			printf( "  failed to create a term for %s\n", $p['slug'] );
			continue;
		}

		$wpdb->insert(
			$wpdb->term_taxonomy,
			array(
				'term_id'     => $ar_term_id,
				'taxonomy'    => 'product_cat',
				'description' => '',
				'parent'      => 0,
				'count'       => 0,
			)
		);
		$ar_ttid = (int) $wpdb->insert_id;
		if ( ! $ar_ttid ) {
			printf( "  failed to create a taxonomy row for %s\n", $p['slug'] );
			continue;
		}

		$wpdb->insert(
			$icl,
			array(
				'element_type'         => 'tax_product_cat',
				'element_id'           => $ar_ttid,
				'trid'                 => $p['trid'],
				'language_code'        => 'ar',
				'source_language_code' => 'en',
			)
		);

		$created++;
		printf( "  created arabic '%s' term_id=%d ttid=%d on trid %d\n", $p['slug'], $ar_term_id, $ar_ttid, $p['trid'] );
	}

	// Move only the Arabic products. English products stay where they are.
	$objects = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT tr.object_id
			 FROM {$wpdb->term_relationships} tr
			 JOIN $icl p ON p.element_id = tr.object_id
			            AND p.element_type = 'post_product'
			            AND p.language_code = 'ar'
			 WHERE tr.term_taxonomy_id = %d",
			$p['en_ttid']
		)
	);

	foreach ( $objects as $object_id ) {
		$object_id = (int) $object_id;

		// Skip if it somehow already sits on the Arabic term: the primary key
		// is (object_id, term_taxonomy_id) and the update would collide.
		$already = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->term_relationships} WHERE object_id = %d AND term_taxonomy_id = %d",
				$object_id,
				$ar_ttid
			)
		);
		if ( $already ) {
			$wpdb->delete(
				$wpdb->term_relationships,
				array( 'object_id' => $object_id, 'term_taxonomy_id' => $p['en_ttid'] )
			);
			continue;
		}

		$ok = $wpdb->update(
			$wpdb->term_relationships,
			array( 'term_taxonomy_id' => $ar_ttid ),
			array( 'object_id' => $object_id, 'term_taxonomy_id' => $p['en_ttid'] )
		);

		if ( false !== $ok ) {
			fputcsv( $rollback, array( $object_id, $p['en_ttid'], $ar_ttid ) );
			$moved++;
		}
	}

	$touched[] = $p['en_ttid'];
	$touched[] = $ar_ttid;
}

fclose( $rollback );

// The counts are cached on the taxonomy row; without this the new Arabic
// categories read as empty and the storefront hides them.
wp_update_term_count_now( array_unique( $touched ), 'product_cat' );
clean_term_cache( array(), 'product_cat' );
wp_cache_flush();

printf( "\ncreated %d arabic terms, moved %d links\nrollback written to %s\n", $created, $moved, $ROLLBACK );

restore_current_blog();
