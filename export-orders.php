<?php
/**
 * Export Orders from SasanPerfumes to ShapeHive
 * Usage: php export-orders.php
 */

// Connection details - UPDATE with your actual credentials
$source_host = 'localhost'; // Or Hostinger remote host
$source_user = 'u346814456_LWBvM';
$source_pass = 'YOUR_PASSWORD'; // Set this
$source_db = 'u346814456_XhYmf';

try {
    $source_conn = new mysqli($source_host, $source_user, $source_pass, $source_db);
    
    if ($source_conn->connect_error) {
        die("Source DB connection failed: " . $source_conn->connect_error);
    }
    
    // Query orders (HPOS - High Performance Order Storage tables)
    $query = "
        SELECT 
            o.id as order_id,
            o.status,
            o.date_created,
            o.date_modified,
            o.customer_id,
            o.currency,
            o.total,
            o.billing_first_name,
            o.billing_last_name,
            o.billing_email,
            o.billing_phone,
            o.billing_address_1,
            o.billing_city,
            o.billing_state,
            o.billing_postcode,
            o.billing_country,
            o.shipping_first_name,
            o.shipping_last_name,
            o.shipping_address_1,
            o.shipping_city,
            o.shipping_state,
            o.shipping_postcode,
            o.shipping_country
        FROM wc_orders o
        ORDER BY o.id ASC
    ";
    
    $result = $source_conn->query($query);
    
    if (!$result) {
        die("Query failed: " . $source_conn->error);
    }
    
    // Export as CSV
    $filename = 'orders-export-' . date('Y-m-d-His') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $filename);
    
    $output = fopen('php://output', 'w');
    
    // Write header
    fputcsv($output, [
        'order_id', 'status', 'date_created', 'date_modified', 'customer_id', 
        'currency', 'total', 'billing_first_name', 'billing_last_name', 
        'billing_email', 'billing_phone', 'billing_address_1', 'billing_city',
        'billing_state', 'billing_postcode', 'billing_country',
        'shipping_first_name', 'shipping_last_name', 'shipping_address_1',
        'shipping_city', 'shipping_state', 'shipping_postcode', 'shipping_country'
    ]);
    
    // Write data
    while ($row = $result->fetch_assoc()) {
        fputcsv($output, $row);
    }
    
    fclose($output);
    $source_conn->close();
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
