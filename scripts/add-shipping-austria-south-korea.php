<?php
/**
 * Adds Austria and South Korea as shipping destinations.
 *
 * Both already resolved through the rest-of-world catch-all, but the checkout
 * country list is built from the configured zones, so neither could be
 * selected and nobody in either country could place an order.
 *
 * Austria joins Zone 1 at 250.00 with Germany, Czech Republic, Italy and the
 * Netherlands - core Western EU, where it belongs commercially. That lowers
 * what an Austrian customer pays from the 470.00 the fallback was quoting.
 *
 * South Korea has no comparable zone - there is no Far East tier - so it gets
 * its own at the 470.00 the fallback already charged. Nothing it costs changes.
 */
$apply = in_array('apply', $args, true);

$ZONE_1_ID   = 3;
$ADD_TO_ZONE_1 = array('AT');

$FAR_EAST_NAME = 'Zone 9 — Far East';
$FAR_EAST      = array('KR');
$FAR_EAST_COST = '470.00';

$all = array_merge($ADD_TO_ZONE_1, $FAR_EAST);

// Refuse any country another zone already claims, rather than creating a
// second home that WooCommerce would resolve by zone order.
foreach (WC_Shipping_Zones::get_zones() as $z) {
	$zone = WC_Shipping_Zones::get_zone($z['zone_id']);
	foreach ($zone->get_zone_locations() as $l) {
		if ('country' === $l->type && in_array($l->code, $all, true)) {
			printf("refusing: %s is already in zone %d (%s)\n", $l->code, $z['zone_id'], $z['zone_name']);
			return;
		}
	}
}

// --- Austria into Zone 1 -------------------------------------------------
$zone1 = WC_Shipping_Zones::get_zone($ZONE_1_ID);
if (!$zone1) { printf("zone %d not found\n", $ZONE_1_ID); return; }

$cost1 = '-';
foreach ($zone1->get_shipping_methods(true) as $m) { $cost1 = $m->cost; }

// set_locations() replaces a zone's locations, so write the union.
$existing = array();
foreach ($zone1->get_zone_locations() as $l) {
	if ('country' === $l->type) { $existing[] = $l->code; }
	// A state entry such as US:GA has to survive too.
	elseif ('state' === $l->type) { $existing[] = $l->code; }
}
$final = array_values(array_unique(array_merge($existing, $ADD_TO_ZONE_1)));

printf("zone %d '%s' at %s\n   now:  %s\n   then: %s\n\n", $ZONE_1_ID, $zone1->get_zone_name(), $cost1, implode(' ', $existing), implode(' ', $final));
printf("new zone '%s' with %s at %s\n\n", $FAR_EAST_NAME, implode(' ', $FAR_EAST), $FAR_EAST_COST);

if (!$apply) { echo "[dry run]\n"; return; }

$locations = array();
foreach ($final as $code) {
	$locations[] = (false !== strpos($code, ':'))
		? array('code' => $code, 'type' => 'state')
		: array('code' => $code, 'type' => 'country');
}
$zone1->set_locations($locations);
$zone1->save();

// --- South Korea in its own zone -----------------------------------------
$fe = new WC_Shipping_Zone();
$fe->set_zone_name($FAR_EAST_NAME);
$fe->set_locations(array_map(function ($c) { return array('code' => $c, 'type' => 'country'); }, $FAR_EAST));
$fe_id = $fe->save();
if (!$fe_id) { echo "failed to create the Far East zone\n"; return; }

$instance_id = $fe->add_shipping_method('flat_rate');
if (!$instance_id) { echo "failed to add a flat rate method\n"; return; }

// Writing the cost straight to the option: calling update_option() on the
// method object does not persist it.
update_option("woocommerce_flat_rate_{$instance_id}_settings", array(
	'title'      => 'Shipping',
	'tax_status' => 'none',
	'cost'       => $FAR_EAST_COST,
	'type'       => 'class',
));

WC_Cache_Helper::get_transient_version('shipping', true);

foreach (array($ZONE_1_ID, $fe_id) as $id) {
	$z = WC_Shipping_Zones::get_zone($id);
	$l = array();
	foreach ($z->get_zone_locations() as $x) { $l[] = $x->code; }
	printf("zone %d '%s': %s\n", $id, $z->get_zone_name(), implode(' ', $l));
	foreach ($z->get_shipping_methods(true) as $m) {
		printf("   %s instance %d enabled=%s cost=%s\n", $m->id, $m->instance_id, $m->is_enabled() ? 'yes' : 'no', $m->cost);
	}
}
