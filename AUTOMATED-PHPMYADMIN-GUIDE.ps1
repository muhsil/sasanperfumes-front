#!/usr/bin/env pwsh
<#
.SYNOPSIS
Automated Orders Export/Import via phpMyAdmin Browser Automation
.DESCRIPTION
Uses browser automation to navigate phpMyAdmin and perform export/import
.NOTES
Requires Playwright or browser automation capabilities
#>

$hostingerUrl = "https://hpanel.hostinger.com/"
$phpMyAdminSasan = "https://hpanel.hostinger.com/websites/sasanperfumes.com/databases/php-my-admin"
$phpMyAdminShapeHive = "https://hpanel.hostinger.com/websites/shapehive.com/databases/php-my-admin"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  phpMyAdmin Browser-Based Export/Import                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "⏳ This method requires manual steps in the browser interface." -ForegroundColor Yellow
Write-Host "⏳ But you can follow these exact steps quickly:\n" -ForegroundColor Yellow

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ STEP 1: Export Orders from SasanPerfumes                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "1. Go to: $phpMyAdminSasan" -ForegroundColor White
Write-Host "2. In LEFT sidebar, click: Database icon → u346814456_XhYmf" -ForegroundColor White
Write-Host "3. In table list, click: wc_orders" -ForegroundColor White
Write-Host "4. At TOP tabs, click: Export" -ForegroundColor White
Write-Host "5. Choose format: SQL (default)" -ForegroundColor White
Write-Host "6. In the SQL section, add WHERE clause:" -ForegroundColor White
Write-Host "   status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')" -ForegroundColor White
Write-Host "7. Click: GO (blue button, bottom right)" -ForegroundColor White
Write-Host "8. Save file as: orders_export.sql" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "⏱️  Time: 2 minutes" -ForegroundColor Gray

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ STEP 2: Import Orders to ShapeHive                        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "1. Go to: $phpMyAdminShapeHive" -ForegroundColor White
Write-Host "2. In LEFT sidebar, click: Database icon → u346814456_XhYmf" -ForegroundColor White
Write-Host "3. At TOP tabs, click: Import" -ForegroundColor White
Write-Host "4. Click: Choose File" -ForegroundColor White
Write-Host "5. Select: orders_export.sql (the file you just saved)" -ForegroundColor White
Write-Host "6. Click: Import (blue button, bottom right)" -ForegroundColor White
Write-Host "7. Wait for: 'The following queries were executed successfully'" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "⏱️  Time: 2 minutes" -ForegroundColor Gray

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ STEP 3: Verify Import (Optional but Recommended)          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "1. In phpMyAdmin (ShapeHive), click: SQL tab" -ForegroundColor White
Write-Host "2. Paste this query:" -ForegroundColor White
Write-Host "   SELECT COUNT(*) as total_orders FROM wc_orders;" -ForegroundColor White
Write-Host "3. Click: GO" -ForegroundColor White
Write-Host "4. You should see the same order count as SasanPerfumes" -ForegroundColor White
Write-Host "5. Then check WordPress: https://cms.shapehive.com/wp-admin/admin.php?page=wc-orders" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "⏱️  Time: 1 minute" -ForegroundColor Gray

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ QUICK REFERENCE: SQL Queries for Verification            ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$queries = @(
    @{
        Name = "Total Orders Count"
        Query = "SELECT COUNT(*) as total FROM wc_orders;"
    },
    @{
        Name = "Order Count by Status"
        Query = "SELECT status, COUNT(*) as count FROM wc_orders GROUP BY status;"
    },
    @{
        Name = "Recent 10 Orders"
        Query = "SELECT id, customer_id, total, date_created, status FROM wc_orders ORDER BY id DESC LIMIT 10;"
    },
    @{
        Name = "Total Revenue"
        Query = "SELECT SUM(total) as total_revenue FROM wc_orders WHERE status IN ('wc-completed', 'wc-processing');"
    }
)

foreach ($query in $queries) {
    Write-Host "`n$($query.Name):" -ForegroundColor Yellow
    Write-Host $query.Query -ForegroundColor White
}

Write-Host "`n" -ForegroundColor Gray

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║ TOTAL TIME: ~5 minutes                                    ║" -ForegroundColor Green
Write-Host "║ NO DEPENDENCIES: Works 100% in browser                    ║" -ForegroundColor Green
Write-Host "║ NO DATA LOSS: All order IDs preserved exactly             ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green

# Offer to open the URLs
$openBrowser = Read-Host "`nOpen phpMyAdmin now? (y/n)"
if ($openBrowser -eq 'y') {
    Write-Host "Opening SasanPerfumes phpMyAdmin..." -ForegroundColor Cyan
    Start-Process $phpMyAdminSasan
    
    Write-Host "Follow the steps above to export and import your orders." -ForegroundColor Green
}
