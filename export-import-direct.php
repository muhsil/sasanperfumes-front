<?php
/**
 * Direct Database Orders Export
 * Place in: /wp-content/plugins/orders-export/export.php
 * Access: https://sasanperfumes.com/wp-content/plugins/orders-export/export.php
 */

// Minimal WordPress loading (if needed)
// require_once( dirname( __FILE__ ) . '/../../wp-load.php' );

// Direct database connection
$db_host = 'localhost';
$db_user = 'u346814456_LWBvM';
$db_pass = getenv('DB_PASS') ?: 'YOUR_PASSWORD'; // Set via environment or hardcode
$db_name = 'u346814456_XhYmf';

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

// Get action from query parameter
$action = $_GET['action'] ?? 'export';

if ($action === 'export') {
    // Export orders from wc_orders table
    try {
        $sql = "
            SELECT id, status, date_created, date_modified, customer_id, currency, total,
                   billing_first_name, billing_last_name, billing_email, billing_phone,
                   billing_address_1, billing_city, billing_state, billing_postcode, billing_country,
                   shipping_first_name, shipping_last_name, shipping_address_1,
                   shipping_city, shipping_state, shipping_postcode, shipping_country,
                   payment_method, payment_method_title
            FROM wc_orders
            WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')
            ORDER BY id ASC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to JSON
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename=orders_export_' . date('Y-m-d-His') . '.json');
        
        echo json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        die(json_encode(['error' => $e->getMessage()]));
    }
}

elseif ($action === 'import') {
    // Import orders from JSON POST
    try {
        $input = file_get_contents('php://input');
        $orders = json_decode($input, true);
        
        if (!is_array($orders)) {
            http_response_code(400);
            die(json_encode(['error' => 'Invalid JSON format']));
        }
        
        $imported = 0;
        $failed = 0;
        
        foreach ($orders as $order) {
            try {
                $sql = "
                    INSERT INTO wc_orders (
                        id, status, date_created, date_modified, customer_id, currency, total,
                        billing_first_name, billing_last_name, billing_email, billing_phone,
                        billing_address_1, billing_city, billing_state, billing_postcode, billing_country,
                        shipping_first_name, shipping_last_name, shipping_address_1,
                        shipping_city, shipping_state, shipping_postcode, shipping_country,
                        payment_method, payment_method_title
                    ) VALUES (
                        :id, :status, :date_created, :date_modified, :customer_id, :currency, :total,
                        :billing_first_name, :billing_last_name, :billing_email, :billing_phone,
                        :billing_address_1, :billing_city, :billing_state, :billing_postcode, :billing_country,
                        :shipping_first_name, :shipping_last_name, :shipping_address_1,
                        :shipping_city, :shipping_state, :shipping_postcode, :shipping_country,
                        :payment_method, :payment_method_title
                    )
                    ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        date_modified = VALUES(date_modified),
                        total = VALUES(total)
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($order);
                $imported++;
                
            } catch (Exception $e) {
                $failed++;
                error_log("Failed to import order: " . json_encode($order) . " - " . $e->getMessage());
            }
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'imported' => $imported,
            'failed' => $failed,
            'total' => count($orders)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        die(json_encode(['error' => $e->getMessage()]));
    }
}

elseif ($action === 'count') {
    // Just get order count
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM wc_orders WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        header('Content-Type: application/json');
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        die(json_encode(['error' => $e->getMessage()]));
    }
}

else {
    http_response_code(400);
    die(json_encode(['error' => 'Unknown action']));
}
?>
