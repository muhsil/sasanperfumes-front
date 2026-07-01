#!/usr/bin/env pwsh
<#
.SYNOPSIS
Import Orders to ShapeHive via WooCommerce REST API
.DESCRIPTION
Takes JSON export from wp-rest-api-export-orders.ps1 and imports to sasanperfumes.com
.PARAMETER InputFile
JSON file path from export
.NOTES
Requires pre-authentication or API keys setup
#>

param(
    [string]$InputFile = "orders_export.json",
    [string]$TargetSite = "shapehive"  # shapehive, qa, om, sa
)

$shapehiveApiUrl = "https://cms.sasanperfumes.com/wp-json/wc/v3/orders"
$qaApiUrl = "https://cms.sasanperfumes.com/qa/wp-json/wc/v3/orders"
$omApiUrl = "https://cms.sasanperfumes.com/om/wp-json/wc/v3/orders"
$saApiUrl = "https://cms.sasanperfumes.com/sa/wp-json/wc/v3/orders"

$apiUrls = @{
    'shapehive' = $shapehiveApiUrl
    'qa' = $qaApiUrl
    'om' = $omApiUrl
    'sa' = $saApiUrl
}

function Read-OrdersFromJSON {
    param([string]$FilePath)
    
    try {
        $json = Get-Content -Path $FilePath -Raw | ConvertFrom-Json
        Write-Host "✅ Loaded $($json.Count) orders from: $FilePath" -ForegroundColor Green
        return $json
    } catch {
        Write-Host "❌ Error reading JSON file: $_" -ForegroundColor Red
        return $null
    }
}

function Import-OrdersToAPI {
    param(
        [array]$Orders,
        [string]$TargetApiUrl
    )
    
    Write-Host "📥 Importing to: $TargetApiUrl" -ForegroundColor Cyan
    
    $successCount = 0
    $failCount = 0
    $skipped = 0
    
    foreach ($order in $Orders) {
        try {
            # Build minimal payload to preserve data
            $payload = @{
                status = $order.status
                customer_id = $order.customer_id
                total = [string]$order.total
                currency = $order.currency
                billing = $order.billing
                shipping = $order.shipping
                line_items = $order.line_items
                payment_method = $order.payment_method
                payment_method_title = $order.payment_method_title
            }
            
            $json = $payload | ConvertTo-Json -Depth 10
            
            $response = Invoke-RestMethod -Uri $TargetApiUrl `
                -Method Post `
                -Body $json `
                -ContentType "application/json" `
                -ErrorAction Stop
            
            $successCount++
            
            if ($response.id) {
                Write-Host "  ✓ Order #$($order.id) → #$($response.id)" -ForegroundColor Green
            }
            
            # Show progress every 10 orders
            if ($successCount % 10 -eq 0) {
                Write-Host "  Progress: $successCount/$($Orders.Count) imported" -ForegroundColor Gray
            }
            
        } catch {
            $failCount++
            $errorMsg = $_.Exception.Response.StatusCode
            Write-Host "  ✗ Order #$($order.id): $errorMsg" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n✅ Import Complete:" -ForegroundColor Green
    Write-Host "   ✓ Successful: $successCount" -ForegroundColor Green
    Write-Host "   ✗ Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { 'Yellow' } else { 'Green' })
}

# MAIN EXECUTION
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  WooCommerce REST API Orders Import Tool                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Validate input file
if (-not (Test-Path $InputFile)) {
    Write-Host "❌ File not found: $InputFile" -ForegroundColor Red
    Write-Host "💡 Run export first: .\wp-rest-api-export-orders.ps1" -ForegroundColor Yellow
    exit 1
}

# Read orders from JSON
$orders = Read-OrdersFromJSON -FilePath $InputFile

if ($null -ne $orders -and $orders.Count -gt 0) {
    
    # Get target API URL
    $targetUrl = $apiUrls[$TargetSite]
    
    if (-not $targetUrl) {
        Write-Host "❌ Invalid target site: $TargetSite" -ForegroundColor Red
        Write-Host "Valid options: shapehive, qa, om, sa" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Target Site: $TargetSite" -ForegroundColor Cyan
    Write-Host "Target URL: $targetUrl`n" -ForegroundColor Gray
    
    # Import orders
    Import-OrdersToAPI -Orders $orders -TargetApiUrl $targetUrl
    
    Write-Host "`n📋 Summary:" -ForegroundColor Cyan
    Write-Host "   Source File: $InputFile" -ForegroundColor Gray
    Write-Host "   Target Site: $TargetSite" -ForegroundColor Gray
    Write-Host "   Orders to Import: $($orders.Count)" -ForegroundColor Gray
    
} else {
    Write-Host "❌ No orders found in JSON file" -ForegroundColor Red
}
