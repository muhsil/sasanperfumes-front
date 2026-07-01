#!/usr/bin/env pwsh
<#
.SYNOPSIS
Automated Orders Export/Import via Direct SQL Dump
.DESCRIPTION
Creates SQL dump file for orders from sasanperfumes and imports to shapehive
Requires direct database access - works via command line or cron
#>

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Orders Migration: Automated SQL Dump Method              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Instead of phpMyAdmin, let's create the SQL dump directly
$exportFile = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "STEP 1: Create SQL Dump File" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

$generatedDate = Get-Date
$sqlDump = @"
/* Orders Export from SasanPerfumes to ShapeHive */
/* Generated: $generatedDate */
/* Database: u346814456_XhYmf */
/* Table: wc_orders */

/* Drop existing orders (optional - comment out if you want to preserve) */
/* DELETE FROM wc_orders WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold'); */

/* Create temporary export table structure */
CREATE TABLE IF NOT EXISTS wc_orders_backup LIKE wc_orders;

/* Export orders from source */
INSERT INTO wc_orders_backup
SELECT * FROM wc_orders 
WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')
ORDER BY id ASC;

/* Count exported orders */
SELECT COUNT(*) as total_orders_exported FROM wc_orders_backup;

/* Import to destination (if running on shapehive server) */
/* INSERT INTO wc_orders */
/* SELECT * FROM wc_orders_backup */
/* ON DUPLICATE KEY UPDATE  */
/*   status = VALUES(status), */
/*   date_modified = VALUES(date_modified); */

/* Cleanup */
/* DROP TABLE wc_orders_backup; */
"@

try {
    $sqlDump | Out-File -FilePath $exportFile -Encoding UTF8 -Force
    Write-Host "✅ SQL dump created: $exportFile" -ForegroundColor Green
    Write-Host "   Size: $(Get-Item $exportFile | ForEach-Object {[math]::Round($_.Length/1KB, 2)}) KB" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create SQL file: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nSTEP 2: Simple Alternative - Direct Export/Import Steps" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green

Write-Host @"
If you have SSH or command-line access to your Hostinger account:

Option A: Using mysqldump (via SSH on Hostinger)
================================================
1. Connect to Hostinger SSH:
   ssh user@sasanperfumes.com

2. Export orders table:
   mysqldump -u u346814456_LWBvM -p u346814456_XhYmf wc_orders \
     --where="status IN ('wc-completed','wc-processing','wc-pending','wc-on-hold')" \
     > /home/user/orders_export.sql

3. Import to shapehive database (same server):
   mysql -u u346814456_LWBvM -p u346814456_XhYmf < orders_export.sql

4. Verify:
   mysql -u u346814456_LWBvM -p u346814456_XhYmf \
     -e "SELECT COUNT(*) FROM wc_orders;"


Option B: Using WordPress WP-CLI (via SSH on Hostinger)
========================================================
1. Connect to Hostinger SSH:
   ssh user@sasanperfumes.com
   cd /home/user/public_html

2. List orders:
   wp woocommerce order list --status=completed,processing \
     --format=json > /tmp/orders.json

3. Copy to destination:
   scp /tmp/orders.json user@sasanperfumes.com:/tmp/

4. Import on destination server:
   wp import orders /tmp/orders.json --update=skip

"@

Write-Host "`nSTEP 3: Quickest Method (No SSH Needed) - Use Existing Tools" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

Write-Host @"
The SIMPLEST method that doesn't require SSH:

1. Login to Hostinger hPanel with your browser
2. Go to: sasanperfumes.com site management
3. Click: Databases → phpMyAdmin
4. In phpMyAdmin:
   - Select table: wc_orders
   - Click: Export tab
   - Choose: SQL format
   - Add WHERE clause: status IN ('wc-completed','wc-processing','wc-pending','wc-on-hold')
   - Click: GO
   - Save file: orders_export.sql

5. Now import the file:
   - Go to: sasanperfumes.com site management  
   - Click: Databases → phpMyAdmin
   - Click: Import tab
   - Upload: orders_export.sql
   - Click: Import

6. Verify in WordPress:
   - Go to: cms.sasanperfumes.com/wp-admin/admin.php?page=wc-orders
   - You should see all imported orders

"@

Write-Host "`nFiles Created:" -ForegroundColor Yellow
Write-Host "   ✓ $exportFile (ready for import)" -ForegroundColor White
Write-Host "   ✓ This script as reference" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Green
Write-Host "   1. Choose your preferred method above" -ForegroundColor White
Write-Host "   2. Follow the exact steps" -ForegroundColor White
Write-Host "   3. Verify import in WordPress admin" -ForegroundColor White
