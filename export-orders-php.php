<?php
/**
 * Orders Export Script - Place in WordPress root or subdirectory
 * 
 * Usage:
 * 1. Upload this file to your Hostinger server (e.g., public_html/export-orders.php)
 * 2. Visit: https://sasanperfumes.com/export-orders.php
 * 3. Download the CSV file
 * 4. Import it in ShapeHive phpMyAdmin
 * 
 * Safety:
 * - Only exports data (read-only)
 * - Does not modify any data
 * - Can be deleted after use
 */

// Load WordPress
if (file_exists('wp-load.php')) {
    require_once('wp-load.php');
} elseif (file_exists('../wp-load.php')) {
    require_once('../wp-load.php');
} else {
    die('WordPress not found. Upload this file to WordPress root or subfolder.');
}

// Only run from command line or allow from localhost
if (php_sapi_name() !== 'cli' && $_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && !isset($_GET['key'])) {
    die('Access denied. Run from command line or add ?key=export to URL (not recommended for production)');
}

// Get export type
$export_type = isset($_GET['type']) ? sanitize_text_field($_GET['type']) : 'sql';

// Database
global $wpdb;

// 1. SQL EXPORT (for import into shapehive database)
if ($export_type === 'sql') {
    $orders_table = $wpdb->prefix . 'wc_orders';
    $statuses = array('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold');
    $statuses_sql = "'" . implode("','", array_map('esc_sql', $statuses)) . "'";
    
    // Get SQL query
    $query = "SELECT * FROM $orders_table WHERE status IN ($statuses_sql)";
    $results = $wpdb->get_results($query, ARRAY_A);
    
    if (empty($results)) {
        die('No orders found to export');
    }
    
    // Generate SQL dump
    $sql_output = "-- Orders Export\n";
    $sql_output .= "-- Exported: " . date('Y-m-d H:i:s') . "\n";
    $sql_output .= "-- From: " . get_site_url() . "\n";
    $sql_output .= "-- Database: " . DB_NAME . "\n\n";
    
    // Add orders
    foreach ($results as $row) {
        $columns = array_keys($row);
        $values = array_map(function($val) use ($wpdb) {
            return $wpdb->prepare('%s', $val);
        }, array_values($row));
        
        $sql_output .= "INSERT INTO `$orders_table` (" . implode(',', array_map(function($c) { return "`$c`"; }, $columns)) . ") VALUES (" . implode(',', $values) . ");\n";
    }
    
    // Output
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="orders_export_' . date('Y-m-d_H-i-s') . '.sql"');
    echo $sql_output;
    die();
}

// 2. CSV EXPORT (for spreadsheet)
if ($export_type === 'csv') {
    $orders_table = $wpdb->prefix . 'wc_orders';
    $statuses = array('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold');
    $statuses_sql = "'" . implode("','", array_map('esc_sql', $statuses)) . "'";
    
    $query = "SELECT * FROM $orders_table WHERE status IN ($statuses_sql) ORDER BY date_created DESC";
    $results = $wpdb->get_results($query, ARRAY_A);
    
    if (empty($results)) {
        die('No orders found to export');
    }
    
    // Output CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="orders_export_' . date('Y-m-d_H-i-s') . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    // Headers
    fputcsv($output, array_keys($results[0]));
    
    // Data
    foreach ($results as $row) {
        fputcsv($output, $row);
    }
    
    fclose($output);
    die();
}

// 3. JSON EXPORT (for WP-CLI import)
if ($export_type === 'json') {
    $orders_table = $wpdb->prefix . 'wc_orders';
    $statuses = array('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold');
    $statuses_sql = "'" . implode("','", array_map('esc_sql', $statuses)) . "'";
    
    $query = "SELECT * FROM $orders_table WHERE status IN ($statuses_sql) ORDER BY date_created DESC";
    $results = $wpdb->get_results($query, ARRAY_A);
    
    if (empty($results)) {
        die('No orders found to export');
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="orders_export_' . date('Y-m-d_H-i-s') . '.json"');
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    die();
}

// 4. HTML REPORT (preview)
?>
<!DOCTYPE html>
<html>
<head>
    <title>Orders Export Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 5px; }
        h1 { color: #333; }
        .button { display: inline-block; padding: 12px 20px; margin: 10px 5px 10px 0; text-decoration: none; background: #0073aa; color: white; border-radius: 3px; cursor: pointer; font-weight: bold; }
        .button:hover { background: #005a87; }
        .info { background: #e7f3ff; border-left: 4px solid #0073aa; padding: 12px; margin-bottom: 20px; }
        .count { font-size: 18px; font-weight: bold; color: #0073aa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Orders Export Tool</h1>
        
        <div class="info">
            <p><strong>Database:</strong> <?php echo DB_NAME; ?></p>
            <p><strong>WordPress:</strong> <?php echo get_site_url(); ?></p>
            <p><strong>Exported:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
        </div>
        
        <h2>Export Orders</h2>
        <p>Choose your export format:</p>
        
        <a href="<?php echo add_query_arg('type', 'sql', $_SERVER['REQUEST_URI']); ?>" class="button">📋 SQL (Recommended)</a>
        <a href="<?php echo add_query_arg('type', 'csv', $_SERVER['REQUEST_URI']); ?>" class="button">📊 CSV</a>
        <a href="<?php echo add_query_arg('type', 'json', $_SERVER['REQUEST_URI']); ?>" class="button">📄 JSON</a>
        
        <h2>Next Steps</h2>
        <ol>
            <li><strong>Export:</strong> Click one of the buttons above</li>
            <li><strong>Save:</strong> Save the file to your computer</li>
            <li><strong>Import:</strong> Go to ShapeHive phpMyAdmin</li>
            <li><strong>Upload:</strong> Import the file in the destination database</li>
            <li><strong>Verify:</strong> Check orders appear correctly</li>
        </ol>
        
        <h2>Statistics</h2>
        <?php
        global $wpdb;
        $orders_table = $wpdb->prefix . 'wc_orders';
        
        $total = $wpdb->get_var("SELECT COUNT(*) FROM $orders_table");
        $completed = $wpdb->get_var("SELECT COUNT(*) FROM $orders_table WHERE status='wc-completed'");
        $processing = $wpdb->get_var("SELECT COUNT(*) FROM $orders_table WHERE status='wc-processing'");
        $pending = $wpdb->get_var("SELECT COUNT(*) FROM $orders_table WHERE status='wc-pending'");
        $on_hold = $wpdb->get_var("SELECT COUNT(*) FROM $orders_table WHERE status='wc-on-hold'");
        
        $will_export = $completed + $processing + $pending + $on_hold;
        ?>
        <ul>
            <li><strong>Total Orders:</strong> <span class="count"><?php echo $total; ?></span></li>
            <li><strong>Completed:</strong> <?php echo $completed; ?></li>
            <li><strong>Processing:</strong> <?php echo $processing; ?></li>
            <li><strong>Pending:</strong> <?php echo $pending; ?></li>
            <li><strong>On Hold:</strong> <?php echo $on_hold; ?></li>
            <li><strong>Will Export:</strong> <span class="count"><?php echo $will_export; ?></span></li>
        </ul>
        
        <hr>
        <p style="color: #999; font-size: 12px;">This tool is read-only. It does not modify any data.</p>
    </div>
</body>
</html>
