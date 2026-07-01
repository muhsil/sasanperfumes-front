# QUICKEST METHOD: Upload PHP Export Script

**Best For**: Getting orders out of sasanperfumes.com FASTEST  
**Time**: 2 minutes  
**Difficulty**: ⭐ Easy  

---

## WHAT IS THIS?

A small PHP script that exports all WooCommerce orders from your database with ONE click. No SQL queries, no phpMyAdmin navigation - just upload and download.

---

## STEP 1: Upload Script to Hostinger

1. **Download the script**:
   - File: `export-orders-php.php` (in your workspace)

2. **Connect to Hostinger**:
   - Go to: https://hpanel.hostinger.com
   - Select: sasanperfumes.com
   - Click: File Manager

3. **Navigate to WordPress root**:
   - Click: public_html folder
   - You should see: wp-config.php, wp-admin, wp-content, etc.

4. **Upload the script**:
   - Right-click → Upload
   - Select: export-orders-php.php
   - Click: Upload

5. **Verify upload**:
   - You should see: export-orders-php.php in the file list
   - Size should be: ~5 KB

---

## STEP 2: Run the Script

1. **Open in browser**:
   ```
   https://sasanperfumes.com/export-orders-php.php
   ```

2. **Wait for page to load**:
   - Should show: Orders Export Tool
   - Shows: Total orders count
   - Shows: Breakdown by status

3. **Choose export format**:
   - Click: **"📋 SQL (Recommended)"** button
   - This downloads: `orders_export_YYYY-MM-DD_HH-mm-ss.sql`

4. **Save the file**:
   - Browser prompts to save
   - Save to your computer

---

## STEP 3: Import into ShapeHive

1. **Go to ShapeHive phpMyAdmin**:
   - https://hpanel.hostinger.com
   - Select: sasanperfumes.com
   - Click: Databases
   - Click: phpMyAdmin

2. **Click: Import tab**

3. **Upload the file**:
   - Click: "Choose File"
   - Select: `orders_export_*.sql` (downloaded file)
   - Click: Open

4. **Click: Import button**

5. **Wait for success**:
   - Should show: "The following queries were executed successfully"
   - Shows: Number of rows affected

---

## STEP 4: Verify Import

1. **Check in WordPress admin**:
   - https://cms.sasanperfumes.com/wp-admin/admin.php?page=wc-orders
   - Should show: New orders in the list
   - Click: One order to verify data

2. **Check order count**:
   - Note the count from SasanPerfumes export
   - Compare with ShapeHive WordPress admin count
   - Should match!

---

## EXAMPLE WALKTHROUGH

```
📱 Step 1: Upload script to sasanperfumes.com/public_html
   File: export-orders-php.php
   Size: 5 KB
   Status: ✅ Uploaded

📊 Step 2: Visit https://sasanperfumes.com/export-orders-php.php
   Page shows:
   - Total Orders: 234
   - Completed: 180
   - Processing: 30
   - Pending: 15
   - On Hold: 9
   - Will Export: 234
   
🔽 Step 3: Click "📋 SQL (Recommended)"
   Downloads: orders_export_2026-06-22_20-15-30.sql
   
📤 Step 4: Upload to ShapeHive phpMyAdmin
   Database: u346814456_XhYmf
   Import file: orders_export_*.sql
   Result: "234 queries executed successfully"
   
✅ Step 5: Verify
   ShapeHive admin shows: 234 orders
   Click one: All data correct!
```

---

## EXPORT FORMATS

The script offers **3 export options**:

| Format | When to Use | File Type |
|--------|------------|-----------|
| **SQL** (Recommended) | Importing to another database | .sql |
| **CSV** | Viewing in Excel/Sheets | .csv |
| **JSON** | Custom processing or WP-CLI | .json |

---

## WHAT GETS EXPORTED

✅ **All orders with status:**
- Completed (wc-completed)
- Processing (wc-processing)  
- Pending (wc-pending)
- On Hold (wc-on-hold)

✅ **All order data:**
- Order ID (exact)
- Customer ID (exact)
- Totals (exact)
- Dates/Times (exact)
- Status
- Payment method
- Shipping info
- Billing info

❌ **What's NOT exported:**
- Cancelled orders
- Refunded (unless explicitly included)
- Draft orders
- Order comments/notes (in separate table)

---

## CLEANUP

After import succeeds:

1. **Delete the script** (optional but recommended):
   - File Manager → public_html
   - Right-click: export-orders-php.php
   - Click: Delete

2. **Verify orders imported**:
   - https://cms.sasanperfumes.com/wp-admin/admin.php?page=wc-orders
   - Look for new orders

3. **Mark source as read-only** (optional):
   - Disable WooCommerce plugin on sasanperfumes.com
   - Or add redirect to backup site

---

## TROUBLESHOOTING

**"WordPress not found" error**:
- Upload to public_html (WordPress root)
- Not in a subfolder

**Page shows blank**:
- Wait 10 seconds, refresh browser
- Check file uploaded correctly
- Check file permissions (644 or 755)

**Download doesn't start**:
- Check browser console for errors (F12)
- Try different export format (CSV instead of SQL)
- Try direct URL: https://sasanperfumes.com/export-orders-php.php?type=sql

**phpMyAdmin import fails**:
- File might be corrupted - re-export
- File size too large - try splitting
- Check database user has permission: u346814456_LWBvM

---

## SAFETY

✅ **Read-only**: Script doesn't modify any data  
✅ **Secure**: No data exposed in URLs  
✅ **Deletable**: Can delete after use  
✅ **No dependencies**: Works standalone  

---

## QUICK SUMMARY

1. Download & upload `export-orders-php.php` → public_html
2. Visit: https://sasanperfumes.com/export-orders-php.php
3. Click: "SQL" button → Download file
4. Go to: ShapeHive phpMyAdmin → Import tab
5. Upload file → Click Import
6. Done! Orders now in ShapeHive

**Total time: 2-3 minutes**
