-- Export Orders from SasanPerfumes to ShapeHive
-- Run this in phpMyAdmin > SQL tab on sasanperfumes.com database

-- Step 1: Get all order IDs to be imported
SELECT DISTINCT id as order_id FROM wc_orders ORDER BY id ASC LIMIT 100;

-- Step 2: Export full order data (modify LIMIT as needed)
SELECT * FROM wc_orders 
WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending') 
ORDER BY id ASC;

-- Step 3: Export order items for those orders
SELECT * FROM wc_order_items 
WHERE order_id IN (
    SELECT id FROM wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
)
ORDER BY order_id ASC;

-- Step 4: Export order item meta
SELECT oim.* FROM wc_order_itemmeta oim
INNER JOIN wc_order_items oi ON oim.order_item_id = oi.order_item_id
WHERE oi.order_id IN (
    SELECT id FROM wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
);

-- Step 5: Export order meta
SELECT om.* FROM wc_order_meta om
WHERE om.order_id IN (
    SELECT id FROM wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
);

-- Step 6: Export customer data for those orders
SELECT DISTINCT oc.* FROM wc_customers oc
WHERE oc.customer_id IN (
    SELECT DISTINCT customer_id FROM wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
);

-- Step 7: Export customer data from wp_users (legacy support)
SELECT DISTINCT u.* FROM wp_users u
WHERE u.ID IN (
    SELECT DISTINCT customer_id FROM wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
);
