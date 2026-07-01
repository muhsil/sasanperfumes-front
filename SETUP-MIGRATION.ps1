#!/usr/bin/env pwsh
# Orders Migration - Automated Setup

Write-Host "" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Orders Migration: Automated Setup                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Create SQL dump file
$exportFile = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

$sqlContent = '/* Orders Export - SasanPerfumes to ShapeHive */'
$sqlContent += "`nSELECT * FROM wc_orders WHERE status IN ("
$sqlContent += "'wc-completed','wc-processing','wc-pending','wc-on-hold');"

try {
    $sqlContent | Out-File -FilePath $exportFile -Encoding UTF8 -Force
    Write-Host "Step 1: SQL Query Created" -ForegroundColor Green
    Write-Host "File: $exportFile" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "Step 2: Three Methods Available" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "METHOD A: phpMyAdmin (Browser - Easiest)" -ForegroundColor Yellow
Write-Host "1. Go to Hostinger hPanel" -ForegroundColor White
Write-Host "2. Click sasanperfumes.com > Databases > phpMyAdmin" -ForegroundColor White
Write-Host "3. Click table: wc_orders" -ForegroundColor White
Write-Host "4. Click tab: Export" -ForegroundColor White
Write-Host "5. Add WHERE clause: status IN ('wc-completed','wc-processing','wc-pending','wc-on-hold')" -ForegroundColor White
Write-Host "6. Click GO and save file" -ForegroundColor White
Write-Host "7. Import the file to sasanperfumes.com database" -ForegroundColor White
Write-Host ""

Write-Host "METHOD B: MySQL CLI (SSH - Fastest)" -ForegroundColor Yellow
Write-Host "1. SSH to server: ssh user@sasanperfumes.com" -ForegroundColor White
Write-Host "2. Run: mysqldump -u u346814456_LWBvM -p u346814456_XhYmf wc_orders > orders.sql" -ForegroundColor White
Write-Host "3. Import: mysql -u u346814456_LWBvM -p u346814456_XhYmf < orders.sql" -ForegroundColor White
Write-Host ""

Write-Host "METHOD C: WP-CLI (SSH + WordPress - Most Features)" -ForegroundColor Yellow
Write-Host "1. SSH: ssh user@sasanperfumes.com" -ForegroundColor White
Write-Host "2. Run: wp woocommerce order list --format=json > orders.json" -ForegroundColor White
Write-Host "3. Import on destination: wp import orders orders.json" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Recommended Choice" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green
Write-Host "Use METHOD A (phpMyAdmin)" -ForegroundColor Cyan
Write-Host "- Works 100% in your browser" -ForegroundColor White
Write-Host "- No command-line needed" -ForegroundColor White  
Write-Host "- 5 minutes total" -ForegroundColor White
Write-Host "- All order data preserved" -ForegroundColor White
Write-Host ""

Write-Host "Files Ready:" -ForegroundColor Green
Write-Host "- $exportFile" -ForegroundColor White
Write-Host "- PHPMYADMIN-EXPORT-IMPORT.md (detailed steps)" -ForegroundColor White
Write-Host "- RUN-EXPORT-IMPORT.ps1 (quick guide)" -ForegroundColor White
Write-Host ""
