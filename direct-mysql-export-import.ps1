#!/usr/bin/env pwsh
<#
.SYNOPSIS
Direct MySQL Export/Import via Hostinger
.DESCRIPTION
Connects directly to Hostinger MySQL database and exports/imports orders
.NOTES
Requires MySQL .NET connector or native MySQL client
#>

param(
    [string]$Action = "export",  # export or import
    [string]$InputFile = "orders_export.json",
    [string]$OutputFile = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
)

# Hostinger Configuration
$hostinger = @{
    Host = "localhost"  # Or your Hostinger remote host if available
    User = "u346814456_LWBvM"
    Password = "YOUR_PASSWORD"  # Set this
    Database = "u346814456_XhYmf"
    Port = 3306
}

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Direct MySQL Orders Export/Import Tool                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if MySQL CLI is available
function Test-MySQLClient {
    try {
        $mysql = Get-Command mysql -ErrorAction Stop
        Write-Host "✅ MySQL client found: $($mysql.Source)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ MySQL client not found. Please install MySQL tools." -ForegroundColor Red
        Write-Host "   Download: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Yellow
        return $false
    }
}

function Export-OrdersViaMySQL {
    Write-Host "📤 Exporting orders via MySQL..." -ForegroundColor Cyan
    
    $query = @"
SELECT 
    id, status, date_created, date_modified, customer_id, currency, total,
    billing_first_name, billing_last_name, billing_email, billing_phone,
    billing_address_1, billing_city, billing_state, billing_postcode, billing_country,
    shipping_first_name, shipping_last_name, shipping_address_1,
    shipping_city, shipping_state, shipping_postcode, shipping_country,
    payment_method, payment_method_title
FROM wc_orders
WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')
ORDER BY id ASC
"@
    
    try {
        # Execute mysql command and capture JSON output
        $csvOutput = mysql -h $hostinger.Host `
                           -u $hostinger.User `
                           -p$($hostinger.Password) `
                           -D $hostinger.Database `
                           --batch `
                           --skip-column-names `
                           -e "$query" 2>$null
        
        if ($null -eq $csvOutput) {
            throw "Query returned no results or connection failed"
        }
        
        # Parse and convert to JSON
        $lines = $csvOutput -split "`n" | Where-Object { $_ }
        $headers = @('id', 'status', 'date_created', 'date_modified', 'customer_id', 'currency', 'total',
                     'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
                     'billing_address_1', 'billing_city', 'billing_state', 'billing_postcode', 'billing_country',
                     'shipping_first_name', 'shipping_last_name', 'shipping_address_1',
                     'shipping_city', 'shipping_state', 'shipping_postcode', 'shipping_country',
                     'payment_method', 'payment_method_title')
        
        $orders = @()
        foreach ($line in $lines) {
            $values = $line -split "`t"
            if ($values.Count -eq $headers.Count) {
                $obj = @{}
                for ($i = 0; $i -lt $headers.Count; $i++) {
                    $obj[$headers[$i]] = $values[$i]
                }
                $orders += [PSCustomObject]$obj
            }
        }
        
        # Save to JSON
        $orders | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding UTF8
        
        Write-Host "✅ Exported $($orders.Count) orders" -ForegroundColor Green
        Write-Host "   File: $OutputFile" -ForegroundColor Gray
        return $true
        
    } catch {
        Write-Host "❌ Export failed: $_" -ForegroundColor Red
        return $false
    }
}

function Import-OrdersViaMySQL {
    param([string]$FilePath)
    
    Write-Host "📥 Importing orders via MySQL..." -ForegroundColor Cyan
    
    try {
        # Read JSON file
        $orders = Get-Content $FilePath -Raw | ConvertFrom-Json
        
        if ($null -eq $orders) {
            throw "No orders found in JSON file"
        }
        
        Write-Host "   Found $($orders.Count) orders to import" -ForegroundColor Gray
        
        # Build INSERT query
        $sqlStatements = @()
        foreach ($order in $orders) {
            $sql = "INSERT INTO wc_orders (id, status, date_created, date_modified, customer_id, currency, total, " +
                   "billing_first_name, billing_last_name, billing_email, billing_phone, " +
                   "billing_address_1, billing_city, billing_state, billing_postcode, billing_country, " +
                   "shipping_first_name, shipping_last_name, shipping_address_1, " +
                   "shipping_city, shipping_state, shipping_postcode, shipping_country, " +
                   "payment_method, payment_method_title) " +
                   "VALUES ('$($order.id)', '$($order.status)', '$($order.date_created)', '$($order.date_modified)', " +
                   "'$($order.customer_id)', '$($order.currency)', '$($order.total)', " +
                   "'$($order.billing_first_name)', '$($order.billing_last_name)', '$($order.billing_email)', " +
                   "'$($order.billing_phone)', '$($order.billing_address_1)', '$($order.billing_city)', " +
                   "'$($order.billing_state)', '$($order.billing_postcode)', '$($order.billing_country)', " +
                   "'$($order.shipping_first_name)', '$($order.shipping_last_name)', '$($order.shipping_address_1)', " +
                   "'$($order.shipping_city)', '$($order.shipping_state)', '$($order.shipping_postcode)', " +
                   "'$($order.shipping_country)', '$($order.payment_method)', '$($order.payment_method_title)') " +
                   "ON DUPLICATE KEY UPDATE status=VALUES(status), date_modified=VALUES(date_modified);"
            
            $sqlStatements += $sql
        }
        
        # Execute import
        $importSuccess = 0
        foreach ($sql in $sqlStatements) {
            try {
                mysql -h $hostinger.Host `
                      -u $hostinger.User `
                      -p$($hostinger.Password) `
                      -D $hostinger.Database `
                      -e "$sql" 2>$null
                $importSuccess++
                
                if ($importSuccess % 10 -eq 0) {
                    Write-Host "   ✓ Imported $importSuccess/$($sqlStatements.Count) orders..." -ForegroundColor Green
                }
                
            } catch {
                Write-Host "   ✗ Failed to import order: $_" -ForegroundColor Yellow
            }
        }
        
        Write-Host "✅ Import complete: $importSuccess/$($sqlStatements.Count) successful" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "❌ Import failed: $_" -ForegroundColor Red
        return $false
    }
}

# MAIN LOGIC

if (-not (Test-MySQLClient)) {
    Write-Host "`n⚠️  MySQL client required. Install from: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Yellow
    exit 1
}

if ($Action -eq "export") {
    Export-OrdersViaMySQL
} elseif ($Action -eq "import") {
    Import-OrdersViaMySQL -FilePath $InputFile
} else {
    Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
    Write-Host "   Valid actions: export, import" -ForegroundColor Yellow
}
