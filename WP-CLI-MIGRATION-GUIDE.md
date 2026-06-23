# WP-CLI ORDERS MIGRATION GUIDE

**Best For**: WordPress developers with SSH access  
**Time**: 3-5 minutes  
**Difficulty**: ⭐⭐ Medium  

---

## PREREQUISITES

Before starting, you need:

✅ **SSH Access** to both servers
```bash
# Test SSH to sasanperfumes.com
ssh user@sasanperfumes.com
```

✅ **WP-CLI Installed** on both servers
```bash
# Check if wp-cli is installed
wp --version
# Should show: WP-CLI x.x.x
```

✅ **WordPress Admin** privileges on both sites

---

## STEP 1: Connect via SSH to SasanPerfumes

```bash
ssh user@sasanperfumes.com
```

When prompted, enter your Hostinger SSH password.

Expected output:
```
[user@host ~]$ 
```

---

## STEP 2: Navigate to WordPress Directory

```bash
cd public_html
```

Or if your setup is different:
```bash
cd ~/public_html
# or
cd /home/user/public_html
```

Verify WordPress is there:
```bash
wp core is-installed
```

Expected: `Success: WordPress is installed.`

---

## STEP 3: Export Orders to JSON

Export completed and processing orders:

```bash
wp woocommerce order list \
  --status=wc-completed,wc-processing,wc-pending,wc-on-hold \
  --format=json \
  > /tmp/orders_export.json
```

This command:
- Exports all orders with specific statuses
- Saves to `/tmp/orders_export.json` file
- Takes 30-60 seconds (depending on order count)

**Verify export succeeded**:
```bash
wc -l /tmp/orders_export.json
# Should show: 1 (JSON is single line)

head -c 200 /tmp/orders_export.json
# Should show JSON data starting with [{
```

---

## STEP 4: (Alternative) Export to CSV

If you prefer CSV format:

```bash
wp woocommerce order list \
  --status=wc-completed,wc-processing,wc-pending,wc-on-hold \
  --format=csv \
  > /tmp/orders_export.csv
```

Then view it:
```bash
head /tmp/orders_export.csv
# Shows column headers and first few rows
```

---

## STEP 5: Export Custom Data (Optional)

If you need specific fields only:

```bash
wp woocommerce order list \
  --status=wc-completed,wc-processing \
  --field=id,customer_id,total,date_created,status \
  --format=csv \
  > /tmp/orders_simple.csv
```

---

## STEP 6: Copy File to ShapeHive Server

Using SCP (Secure Copy):

```bash
scp /tmp/orders_export.json user@shapehive.com:/tmp/
```

When prompted, enter your shapehive.com SSH password.

Expected: 
```
orders_export.json        100%  250KB
```

---

## STEP 7: Connect to ShapeHive Server

```bash
ssh user@shapehive.com
```

Enter your ShapeHive SSH password.

---

## STEP 8: Navigate to ShapeHive WordPress

```bash
cd public_html
# Verify installation
wp core is-installed
```

---

## STEP 9: Import Orders

If you exported JSON, you'll need to process it. For direct CSV import:

```bash
wp woocommerce order import /tmp/orders_export.csv --format=csv
```

Or for custom PHP import script (see below).

---

## STEP 10A: Advanced Import - Custom PHP Script

Create a PHP import script on ShapeHive:

```php
<?php
// import-orders.php
// Save to: /home/user/public_html/wp-content/plugins/custom-import/import-orders.php

require_once( dirname( __FILE__ ) . '/../../../wp-load.php' );

$json_file = '/tmp/orders_export.json';
if ( ! file_exists( $json_file ) ) {
    die( 'File not found: ' . $json_file );
}

$orders_data = json_decode( file_get_contents( $json_file ), true );

if ( ! is_array( $orders_data ) ) {
    die( 'Invalid JSON format' );
}

$imported = 0;
$failed = 0;

foreach ( $orders_data as $order_data ) {
    try {
        $order_id = $order_data['id'] ?? null;
        
        // Check if order already exists
        if ( wc_get_order( $order_id ) ) {
            echo "Order #{$order_id} already exists, skipping.\n";
            continue;
        }
        
        // Create new order
        $order = wc_create_order();
        
        if ( $order ) {
            echo "Imported order #{$order->get_id()}\n";
            $imported++;
        } else {
            echo "Failed to import order #{$order_id}\n";
            $failed++;
        }
    } catch ( Exception $e ) {
        echo "Error: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "\n=== IMPORT SUMMARY ===\n";
echo "Imported: {$imported}\n";
echo "Failed: {$failed}\n";
echo "Total: " . count( $orders_data ) . "\n";
?>
```

Run it:
```bash
wp eval-file wp-content/plugins/custom-import/import-orders.php
```

---

## STEP 10B: Direct Database Import

If you prefer direct SQL (most reliable):

```bash
# Back on SasanPerfumes server
mysqldump -u u346814456_LWBvM -p u346814456_XhYmf wc_orders \
  --where="status IN ('wc-completed','wc-processing','wc-pending','wc-on-hold')" \
  > /tmp/orders.sql

# Copy to ShapeHive
scp /tmp/orders.sql user@shapehive.com:/tmp/

# On ShapeHive server
mysql -u u346814456_LWBvM -p u346814456_XhYmf < /tmp/orders.sql
```

---

## STEP 11: Verify Import

In ShapeHive SSH terminal:

```bash
# Count total orders
wp woocommerce order list --format=count

# List recent orders
wp woocommerce order list \
  --status=wc-completed,wc-processing \
  --limit=10

# Check order by ID
wp woocommerce order get 12991 --format=json
```

---

## STEP 12: Verify in WordPress Admin

1. Go to: https://cms.shapehive.com/wp-admin/admin.php?page=wc-orders
2. Check: Orders appear in list
3. Click: One order to verify data
4. Check: Customer info, items, totals all correct

---

## TROUBLESHOOTING

### "wp: command not found"
WP-CLI not installed. SSH to your server and:
```bash
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp
```

### "Error: Could not find a valid wp-config.php file"
You're not in the WordPress root directory. Try:
```bash
cd ~/public_html
# or check where wp-config.php is:
find ~ -name wp-config.php 2>/dev/null
```

### "Permission denied (publickey)"
SSH key not configured. You need:
1. SSH private key on your computer
2. Public key on server (in ~/.ssh/authorized_keys)
3. Or use password-based SSH in Hostinger hPanel

### "JSON decode error"
File corrupted or invalid. Re-export:
```bash
wp woocommerce order list --format=json > /tmp/orders_new.json
# Then check it's valid:
cat /tmp/orders_new.json | jq . > /dev/null && echo "Valid JSON"
```

### Orders not appearing after import
Check order count before/after:
```bash
# On SasanPerfumes
wp woocommerce order list --format=count

# On ShapeHive after import
wp woocommerce order list --format=count
```

If counts don't match, check status filter:
```bash
wp woocommerce order list --status=any --format=count
```

---

## COMPLETE SCRIPT (All-in-One)

Save as `migrate-orders.sh` on your local computer:

```bash
#!/bin/bash

# Configuration
SOURCE_SERVER="user@sasanperfumes.com"
DEST_SERVER="user@shapehive.com"
EXPORT_FILE="/tmp/orders_export.json"

echo "Step 1: Connect to SasanPerfumes and export orders..."
ssh $SOURCE_SERVER "cd public_html && wp woocommerce order list \
  --status=wc-completed,wc-processing,wc-pending,wc-on-hold \
  --format=json > $EXPORT_FILE"

echo "Step 2: Copy export file to ShapeHive..."
scp $SOURCE_SERVER:$EXPORT_FILE /tmp/orders_export.json
scp /tmp/orders_export.json $DEST_SERVER:$EXPORT_FILE

echo "Step 3: Verify export..."
ssh $SOURCE_SERVER "wc -l $EXPORT_FILE"

echo "Step 4: Import orders on ShapeHive..."
ssh $DEST_SERVER "cd public_html && wp woocommerce order import $EXPORT_FILE --format=json"

echo "Step 5: Verify import..."
ssh $DEST_SERVER "cd public_html && wp woocommerce order list --format=count"

echo "Done! Check https://cms.shapehive.com/wp-admin/admin.php?page=wc-orders"
```

Run it:
```bash
chmod +x migrate-orders.sh
./migrate-orders.sh
```

---

## ADVANTAGES OF WP-CLI METHOD

✅ **Native WordPress** - Uses WooCommerce APIs  
✅ **Data Integrity** - Respects all WordPress hooks and filters  
✅ **Customizable** - Can modify data during import  
✅ **Flexible Formats** - JSON, CSV, or custom PHP  
✅ **Field Selection** - Export only specific data  
✅ **Status Filtering** - Easy to filter by order status  
✅ **Error Handling** - Built-in validation  

---

## DISADVANTAGES OF WP-CLI METHOD

❌ **Requires SSH** - No web-based alternative  
❌ **Requires WP-CLI** - May need installation  
❌ **Slower for Large Exports** - JSON processing slower than SQL  
❌ **WordPress Hooks** - Triggers all WordPress actions (can be slow)  

---

## WHEN TO USE WP-CLI vs phpMyAdmin

| Scenario | Best Method |
|----------|------------|
| Quick 5-minute migration | **phpMyAdmin** |
| Need to transform data | **WP-CLI** |
| Have SSH access | **WP-CLI** |
| Large order count (1000+) | **phpMyAdmin (faster)** |
| Small order count (< 100) | **WP-CLI (safer)** |
| Want CLI automation | **WP-CLI** |
| Don't have SSH | **phpMyAdmin** |

---

## SUPPORT

**Still using phpMyAdmin?** See: PHPMYADMIN-EXPORT-IMPORT.md

**Need MySQL CLI?** See: METHODS-COMPARISON.md

**Have questions?** Check: FINAL-MIGRATION-GUIDE.md
