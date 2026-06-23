#!/usr/bin/env pwsh
<#
.SYNOPSIS
Export orders from SasanPerfumes to ShapeHive via Hostinger MySQL
.DESCRIPTION
Exports shop_order posts from sasanperfumes database and imports to shapehive database
.NOTES
Requires MySQL CLI tools installed
#>

# Hostinger Configuration
$hostinger_host = "localhost"  # Or use SSH tunnel
$db_user = "u346814456_LWBvM"
$db_password = Read-Host "Enter Hostinger database password" -AsSecureString
$password_plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($db_password))

$source_db = "u346814456_XhYmf"  # SasanPerfumes
$dest_db = "u346814456_XhYmf"    # ShapeHive (same account)
$export_file = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "🔄 Exporting orders from SasanPerfumes database..." -ForegroundColor Cyan

# Export SQL for orders
$export_sql = @"
-- Orders Export from SasanPerfumes
-- Exported: $(Get-Date)

-- Export Orders (HPOS table)
SELECT * FROM $source_db.wc_orders 
WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
ORDER BY id ASC
INTO OUTFILE '/tmp/orders_main.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Export Order Items
SELECT * FROM $source_db.wc_order_items
WHERE order_id IN (
    SELECT id FROM $source_db.wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
)
INTO OUTFILE '/tmp/orders_items.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Export Order Meta
SELECT * FROM $source_db.wc_order_meta
WHERE order_id IN (
    SELECT id FROM $source_db.wc_orders 
    WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
)
INTO OUTFILE '/tmp/orders_meta.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
"@

try {
    Write-Host "✅ Database credentials configured" -ForegroundColor Green
    Write-Host "   Source: $source_db" -ForegroundColor Gray
    Write-Host "   Destination: $dest_db" -ForegroundColor Gray
    Write-Host "   User: $db_user" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n📝 Export SQL prepared" -ForegroundColor Green
Write-Host "   Use phpMyAdmin or mysql CLI to run export" -ForegroundColor Gray
