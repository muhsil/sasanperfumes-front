#!/usr/bin/env pwsh
<#
.SYNOPSIS
Export Orders from SasanPerfumes via WooCommerce REST API
.DESCRIPTION
Fetches orders from sasanperfumes.com REST API and exports as JSON for import to sasanperfumes.com
.PARAMETER OutputFile
Output file path for JSON export
.NOTES
Requires curl and jq (or powershell)
#>

param(
    [string]$OutputFile = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
)

$sasanApiUrl = "https://sasanperfumes.com/wp-json/wc/v3/orders"
$shapehiveApiUrl = "https://cms.sasanperfumes.com/wp-json/wc/v3/orders"

# REST API credentials (if needed for authentication)
# You may need Basic Auth or Bearer token
$ConsumerKey = "YOUR_CONSUMER_KEY"      # From wp-admin → WooCommerce → REST API
$ConsumerSecret = "YOUR_CONSUMER_SECRET"

function Get-OrdersFromAPI {
    param(
        [string]$ApiUrl,
        [int]$PerPage = 100,
        [int]$MaxOrders = 10000
    )
    
    $orders = @()
    $page = 1
    $totalOrders = 0
    
    Write-Host "📤 Fetching orders from: $ApiUrl" -ForegroundColor Cyan
    
    try {
        do {
            $url = "$ApiUrl`?page=$page&per_page=$PerPage&status=completed,processing,pending,on-hold"
            Write-Host "  Fetching page $page..." -ForegroundColor Gray
            
            $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
            
            if ($response -is [array]) {
                $orders += $response
                $totalOrders += $response.Count
                Write-Host "    ✓ Got $($response.Count) orders (total: $totalOrders)" -ForegroundColor Green
                
                $page++
                
                # Stop if we've hit the limit or no more orders
                if ($response.Count -lt $PerPage -or $totalOrders -ge $MaxOrders) {
                    break
                }
            } else {
                break
            }
            
        } while ($totalOrders -lt $MaxOrders)
        
        Write-Host "✅ Total orders fetched: $totalOrders" -ForegroundColor Green
        return $orders
        
    } catch {
        Write-Host "❌ Error fetching orders: $_" -ForegroundColor Red
        return $null
    }
}

function Save-OrdersToJSON {
    param(
        [array]$Orders,
        [string]$FilePath
    )
    
    try {
        $Orders | ConvertTo-Json -Depth 10 | Out-File -FilePath $FilePath -Encoding UTF8
        Write-Host "💾 Orders saved to: $FilePath" -ForegroundColor Green
        Write-Host "   File size: $(Get-Item $FilePath | Select-Object @{Name='Size(KB)';Expression={[math]::Round($_.Length/1KB, 2)}}).Size(KB) KB" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "❌ Error saving orders: $_" -ForegroundColor Red
        return $false
    }
}

function Import-OrdersToAPI {
    param(
        [array]$Orders,
        [string]$TargetApiUrl
    )
    
    Write-Host "📥 Importing orders to: $TargetApiUrl" -ForegroundColor Cyan
    
    $successCount = 0
    $failCount = 0
    
    foreach ($order in $Orders) {
        try {
            # Create minimal order payload (preserve key fields)
            $payload = @{
                status = $order.status
                customer_id = $order.customer_id
                total = $order.total
                currency = $order.currency
                billing = $order.billing
                shipping = $order.shipping
                line_items = $order.line_items
                meta_data = $order.meta_data
            } | ConvertTo-Json -Depth 10
            
            $response = Invoke-RestMethod -Uri $TargetApiUrl `
                -Method Post `
                -Body $payload `
                -ContentType "application/json" `
                -ErrorAction Stop
            
            $successCount++
            if ($successCount % 10 -eq 0) {
                Write-Host "  ✓ Imported $successCount orders..." -ForegroundColor Green
            }
            
        } catch {
            $failCount++
            Write-Host "  ✗ Failed to import order #$($order.id): $_" -ForegroundColor Red
        }
    }
    
    Write-Host "✅ Import complete: $successCount successful, $failCount failed" -ForegroundColor Green
}

# MAIN EXECUTION
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  WooCommerce REST API Orders Export/Import Tool           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Export from SasanPerfumes
$orders = Get-OrdersFromAPI -ApiUrl $sasanApiUrl -PerPage 100

if ($null -ne $orders -and $orders.Count -gt 0) {
    
    # Step 2: Save to JSON
    $saved = Save-OrdersToJSON -Orders $orders -FilePath $OutputFile
    
    if ($saved) {
        Write-Host "`n📋 Export Summary:" -ForegroundColor Cyan
        Write-Host "   Total Orders: $($orders.Count)" -ForegroundColor Gray
        Write-Host "   Output File: $OutputFile" -ForegroundColor Gray
        Write-Host "   Next Step: Review the JSON file, then run import" -ForegroundColor Gray
        
        Write-Host "`n💡 To import to ShapeHive, use:" -ForegroundColor Yellow
        Write-Host "   .\wp-cli-rest-api-import.ps1 -InputFile '$OutputFile'" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ No orders found or error occurred during export" -ForegroundColor Red
}
