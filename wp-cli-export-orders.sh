#!/usr/bin/env bash
# WP-CLI Orders Export/Import
# Usage: bash wp-cli-export-orders.sh

echo "🔄 Exporting Orders via WP-CLI..."

# STEP 1: Export from SasanPerfumes (source)
echo "📤 Step 1: Exporting from sasanperfumes.com..."
ssh user@sasanperfumes.com << 'EOF'
cd /home/user/public_html

# Export all orders to CSV
wp woocommerce order list \
  --status=completed,processing,pending,on-hold \
  --format=csv \
  --fields=id,status,total,customer_id,date_created \
  > /tmp/orders_export.csv

echo "✅ Exported $(wc -l < /tmp/orders_export.csv) orders"
EOF

# STEP 2: Download export file
echo "📥 Downloading export file..."
scp user@sasanperfumes.com:/tmp/orders_export.csv ./orders_export.csv

# STEP 3: Import to ShapeHive (destination)
echo "📤 Step 2: Importing to shapehive.com..."
ssh user@shapehive.com << 'EOF'
cd /home/user/public_html

# Import orders from CSV
wp import orders_export.csv \
  --skip-comments \
  --skip-attachments

echo "✅ Import complete"
EOF

echo "🎉 Export/Import finished!"
