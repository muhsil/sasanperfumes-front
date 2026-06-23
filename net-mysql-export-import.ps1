#!/usr/bin/env pwsh
<#
.SYNOPSIS
Orders Export/Import using .NET MySQL Connector
.DESCRIPTION
Connects to Hostinger MySQL database using pure .NET (no external tools needed)
.NOTES
Requires MySQL Connector/NET .NET package
#>

param(
    [string]$Action = "export",  # export or import
    [string]$InputFile = "orders_export.json",
    [string]$OutputFile = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').json",
    [string]$TargetDatabase = "shapehive"  # shapehive (same db) or specify different
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  .NET MySQL Orders Export/Import Tool                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Database Configuration
$config = @{
    Server = "localhost"
    User = "u346814456_LWBvM"
    Password = ""  # User will be prompted
    Database = "u346814456_XhYmf"
    Port = 3306
}

# Get database password
$securePassword = Read-Host "Enter Hostinger database password" -AsSecureString
$config.Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($securePassword)
)

# Create connection string
$connectionString = "Server=$($config.Server);Port=$($config.Port);Uid=$($config.User);Pwd=$($config.Password);Database=$($config.Database);"

# Function to export orders
function Export-Orders {
    Write-Host "📤 Exporting orders..." -ForegroundColor Cyan
    
    try {
        # Load MySQL.Data assembly
        Add-Type -AssemblyName MySql.Data -ErrorAction Stop
    } catch {
        Write-Host "⚠️  MySQL Connector not found. Install via:" -ForegroundColor Yellow
        Write-Host "   Install-Package MySql.Data -ForceBootstrap" -ForegroundColor Yellow
        return $false
    }
    
    try {
        # Create connection
        $connection = New-Object MySql.Data.MySqlClient.MySqlConnection($connectionString)
        $connection.Open()
        
        Write-Host "✅ Connected to database" -ForegroundColor Green
        
        # SQL query
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
        
        # Execute query
        $command = $connection.CreateCommand()
        $command.CommandText = $query
        $command.CommandTimeout = 300
        
        $reader = $command.ExecuteReader()
        $orders = @()
        
        while ($reader.Read()) {
            $order = @{}
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                $fieldName = $reader.GetName($i)
                $fieldValue = if ($reader.IsDBNull($i)) { $null } else { $reader.GetValue($i) }
                $order[$fieldName] = $fieldValue
            }
            $orders += [PSCustomObject]$order
        }
        
        $reader.Close()
        $connection.Close()
        
        # Save to JSON
        $orders | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding UTF8 -Force
        
        Write-Host "✅ Exported $($orders.Count) orders" -ForegroundColor Green
        Write-Host "   File: $OutputFile" -ForegroundColor Gray
        Write-Host "   Size: $(Get-Item $OutputFile | Select-Object @{Name='Size(KB)';Expression={[math]::Round($_.Length/1KB,2)}}).Size(KB) KB" -ForegroundColor Gray
        
        return $true
        
    } catch {
        Write-Host "❌ Export failed: $_" -ForegroundColor Red
        return $false
    }
}

# Function to import orders
function Import-Orders {
    param([string]$FilePath)
    
    Write-Host "📥 Importing orders..." -ForegroundColor Cyan
    
    try {
        # Load MySQL.Data assembly
        Add-Type -AssemblyName MySql.Data -ErrorAction Stop
    } catch {
        Write-Host "⚠️  MySQL Connector not found. Install via:" -ForegroundColor Yellow
        Write-Host "   Install-Package MySql.Data -ForceBootstrap" -ForegroundColor Yellow
        return $false
    }
    
    try {
        # Read JSON
        $orders = Get-Content $FilePath -Raw | ConvertFrom-Json
        
        if ($null -eq $orders -or $orders.Count -eq 0) {
            throw "No orders found in JSON file"
        }
        
        Write-Host "   Found $($orders.Count) orders to import" -ForegroundColor Gray
        
        # Create connection
        $connection = New-Object MySql.Data.MySqlClient.MySqlConnection($connectionString)
        $connection.Open()
        
        Write-Host "✅ Connected to database" -ForegroundColor Green
        
        $successCount = 0
        $failureCount = 0
        
        # Insert each order
        foreach ($order in $orders) {
            try {
                $insertQuery = @"
INSERT INTO wc_orders (
    id, status, date_created, date_modified, customer_id, currency, total,
    billing_first_name, billing_last_name, billing_email, billing_phone,
    billing_address_1, billing_city, billing_state, billing_postcode, billing_country,
    shipping_first_name, shipping_last_name, shipping_address_1,
    shipping_city, shipping_state, shipping_postcode, shipping_country,
    payment_method, payment_method_title
) VALUES (
    @id, @status, @date_created, @date_modified, @customer_id, @currency, @total,
    @billing_first_name, @billing_last_name, @billing_email, @billing_phone,
    @billing_address_1, @billing_city, @billing_state, @billing_postcode, @billing_country,
    @shipping_first_name, @shipping_last_name, @shipping_address_1,
    @shipping_city, @shipping_state, @shipping_postcode, @shipping_country,
    @payment_method, @payment_method_title
)
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    date_modified = VALUES(date_modified)
"@
                
                $command = $connection.CreateCommand()
                $command.CommandText = $insertQuery
                
                # Bind parameters
                $command.Parameters.AddWithValue("@id", $order.id ?? 0)
                $command.Parameters.AddWithValue("@status", $order.status ?? "wc-pending")
                $command.Parameters.AddWithValue("@date_created", $order.date_created ?? (Get-Date))
                $command.Parameters.AddWithValue("@date_modified", $order.date_modified ?? (Get-Date))
                $command.Parameters.AddWithValue("@customer_id", $order.customer_id ?? 0)
                $command.Parameters.AddWithValue("@currency", $order.currency ?? "USD")
                $command.Parameters.AddWithValue("@total", $order.total ?? 0)
                $command.Parameters.AddWithValue("@billing_first_name", $order.billing_first_name ?? "")
                $command.Parameters.AddWithValue("@billing_last_name", $order.billing_last_name ?? "")
                $command.Parameters.AddWithValue("@billing_email", $order.billing_email ?? "")
                $command.Parameters.AddWithValue("@billing_phone", $order.billing_phone ?? "")
                $command.Parameters.AddWithValue("@billing_address_1", $order.billing_address_1 ?? "")
                $command.Parameters.AddWithValue("@billing_city", $order.billing_city ?? "")
                $command.Parameters.AddWithValue("@billing_state", $order.billing_state ?? "")
                $command.Parameters.AddWithValue("@billing_postcode", $order.billing_postcode ?? "")
                $command.Parameters.AddWithValue("@billing_country", $order.billing_country ?? "")
                $command.Parameters.AddWithValue("@shipping_first_name", $order.shipping_first_name ?? "")
                $command.Parameters.AddWithValue("@shipping_last_name", $order.shipping_last_name ?? "")
                $command.Parameters.AddWithValue("@shipping_address_1", $order.shipping_address_1 ?? "")
                $command.Parameters.AddWithValue("@shipping_city", $order.shipping_city ?? "")
                $command.Parameters.AddWithValue("@shipping_state", $order.shipping_state ?? "")
                $command.Parameters.AddWithValue("@shipping_postcode", $order.shipping_postcode ?? "")
                $command.Parameters.AddWithValue("@shipping_country", $order.shipping_country ?? "")
                $command.Parameters.AddWithValue("@payment_method", $order.payment_method ?? "")
                $command.Parameters.AddWithValue("@payment_method_title", $order.payment_method_title ?? "")
                
                $command.ExecuteNonQuery()
                $successCount++
                
                if ($successCount % 10 -eq 0) {
                    Write-Host "   ✓ Imported $successCount/$($orders.Count) orders..." -ForegroundColor Green
                }
                
            } catch {
                $failureCount++
                Write-Host "   ✗ Failed order #$($order.id): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        
        $connection.Close()
        
        Write-Host "`n✅ Import Complete:" -ForegroundColor Green
        Write-Host "   ✓ Successful: $successCount" -ForegroundColor Green
        Write-Host "   ✗ Failed: $failureCount" -ForegroundColor $(if ($failureCount -gt 0) { 'Yellow' } else { 'Green' })
        
        return $true
        
    } catch {
        Write-Host "❌ Import failed: $_" -ForegroundColor Red
        return $false
    }
}

# MAIN LOGIC
if ($Action -eq "export") {
    Export-Orders
} elseif ($Action -eq "import") {
    Import-Orders -FilePath $InputFile
} else {
    Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
    exit 1
}
