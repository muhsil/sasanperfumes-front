<?php
/**
 * Adds the remaining Central Asian countries to the Central Asia zone.
 *
 * Each already resolved through the rest-of-world catch-all at the same
 * 470.00 AED, but the checkout country list is built from the configured
 * zones, so none of them could be selected and no customer there could order.
 * The rate is unchanged; what changes is that the destinations become
 * selectable and visible in wp-admin.
 */
$apply = in_array('apply', $args, true);
$ZONE_ID = 13;
$ADD = array('UZ', 'TM', 'KZ', 'KG');

$zone = WC_Shipping_Zones::get_zone($ZONE_ID);
if (!$zone) { printf("zone %d not found\n", $ZONE_ID); return; }

// Keep whatever the zone already holds; set_locations() replaces the lot.
$existing = array();
foreach ($zone->get_zone_locations() as $l) {
	if ('country' === $l->type) { $existing[] = $l->code; }
}

// Refuse any country another zone already claims, rather than creating a
// second home that WooCommerce would resolve by zone order.
foreach (WC_Shipping_Zones::get_zones() as $z) {
	if ((int) $z['zone_id'] === $ZONE_ID) { continue; }
	$other = WC_Shipping_Zones::get_zone($z['zone_id']);
	foreach ($other->get_zone_locations() as $l) {
		if ('country' === $l->type && in_array($l->code, $ADD, true)) {
			printf("refusing: %s is already in zone %d (%s)\n", $l->code, $z['zone_id'], $z['zone_name']);
			return;
		}
	}
}

$final = array_values(array_unique(array_merge($existing, $ADD)));
printf("zone %d '%s'\n   now:  %s\n   then: %s\n", $ZONE_ID, $zone->get_zone_name(), implode(' ', $existing), implode(' ', $final));

if (!$apply) { echo "\n[dry run]\n"; return; }

$locations = array();
foreach ($final as $code) { $locations[] = array('code' => $code, 'type' => 'country'); }
$zone->set_locations($locations);
$zone->save();

WC_Cache_Helper::get_transient_version('shipping', true);

$check = WC_Shipping_Zones::get_zone($ZONE_ID);
$got = array();
foreach ($check->get_zone_locations() as $l) { $got[] = $l->code; }
printf("\nsaved. locations: %s\n", implode(' ', $got));
foreach ($check->get_shipping_methods(true) as $m) {
	printf("   %s instance %d enabled=%s cost=%s\n", $m->id, $m->instance_id, $m->is_enabled() ? 'yes' : 'no', $m->cost);
}
