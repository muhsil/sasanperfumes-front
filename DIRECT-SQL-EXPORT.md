# Orders Export/Import via Direct SQL
# This method bypasses the slow WordPress UI

## STEP 1: Export Orders from SasanPerfumes
```sql
-- Run this in phpMyAdmin on sasanperfumes database (u346814456_XhYmf)
-- Export as SQL file

-- Export wc_orders table
SELECT * FROM wc_orders 
WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')
ORDER BY id ASC;
```

## STEP 2: Get the export
1. In phpMyAdmin, click the table name `wc_orders`
2. Click **Export** tab (top right)
3. Select **SQL** format
4. Click **Go** to download the .sql file
5. Save as `orders-backup.sql`

## STEP 3: Import into ShapeHive
1. In phpMyAdmin, select the **shapehive.com database** (u346814456_XhYmf - same account)
2. Click **Import** tab
3. Click **Choose File** and select the `orders-backup.sql` file
4. Click **Import**

## STEP 4: Verify Import
```sql
-- Run this to check import was successful
SELECT COUNT(*) as total_orders FROM wc_orders;
SELECT id, customer_id, total, date_created FROM wc_orders ORDER BY id DESC LIMIT 10;
```

---

## Why phpMyAdmin Direct Export Works Better:
✅ No WordPress UI slowness  
✅ Exact data preservation (all columns, IDs unchanged)  
✅ Can filter specific statuses  
✅ Easy to verify counts before/after  
✅ Simple and reliable (2-step process)

---

## Alternative: If you have MySQL CLI access:
```bash
# Export from sasanperfumes (source)
mysql -u u346814456_LWBvM -p u346814456_XhYmf \
  -e "SELECT * FROM wc_orders WHERE status IN ('wc-completed', 'wc-processing') ORDER BY id ASC" \
  > orders_export.txt

# Import to shapehive (destination - same database)
mysql -u u346814456_LWBvM -p u346814456_XhYmf < orders_import.sql
```

---

## Summary:
- **Source DB**: sasanperfumes.com database (u346814456_XhYmf)
- **Dest DB**: shapehive.com database (same: u346814456_XhYmf)
- **Table**: `wc_orders`
- **Statuses**: completed, processing, pending, on-hold
- **Method**: phpMyAdmin Export/Import
- **Time**: ~2 minutes
