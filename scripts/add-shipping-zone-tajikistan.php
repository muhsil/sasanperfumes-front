<?php
/**
 * Gives Tajikistan its own shipping zone.
 *
 * It already resolved, but only through the rest-of-world catch-all, so it was
 * invisible in wp-admin and would follow any future change to that fallback.
 * The rate is the 470.00 AED it already charged, so nothing a customer pays
 * changes.
 *
 * The cost is written straight to the method's settings option: calling
 * update_option() on the method object does not persist it.
 */
$apply = in_array('apply', $args, true);
$COUNTRY = 'TJ';
$COST = '470.00';
$NAME = 'Zone 8 — Central Asia';

// Refuse if some other zone already claims it, rather than creating an
// ambiguous second home that WooCommerce would resolve by zone order.
foreach (WC_Shipping_Zones::get_zones() as $z) {
	$zone = WC_Shipping_Zones::get_zone($z['zone_id']);
	foreach ($zone->get_zone_locations() as $l) {
		if ($l->type === 'country' && $l->code === $COUNTRY) {
			printf("refusing: %s is already in zone %d (%s)\n", $COUNTRY, $z['zone_id'], $z['zone_name']);
			return;
		}
	}
}

if (!$apply) {
	printf("would create zone '%s' with country %s at %s %s\n", $NAME, $COUNTRY, $COST, get_woocommerce_currency());
	return;
}

$zone = new WC_Shipping_Zone();
$zone->set_zone_name($NAME);
$zone->set_locations(array(array('code' => $COUNTRY, 'type' => 'country')));
$zone_id = $zone->save();
if (!$zone_id) { echo "failed to create the zone\n"; return; }

$instance_id = $zone->add_shipping_method('flat_rate');
if (!$instance_id) { echo "failed to add a flat rate method\n"; return; }

update_option("woocommerce_flat_rate_{$instance_id}_settings", array(
	'title'        => 'Shipping',
	'tax_status'   => 'none',
	'cost'         => $COST,
	'type'         => 'class',
));

WC_Cache_Helper::get_transient_version('shipping', true);

$check = WC_Shipping_Zones::get_zone($zone_id);
$locs = array();
foreach ($check->get_zone_locations() as $l) { $locs[] = $l->type . ':' . $l->code; }
printf("created zone %d '%s'  locations: %s\n", $zone_id, $check->get_zone_name(), implode(' ', $locs));
foreach ($check->get_shipping_methods(true) as $m) {
	printf("   %s instance %d enabled=%s cost=%s\n", $m->id, $m->instance_id, $m->is_enabled() ? 'yes' : 'no', $m->cost);
}
