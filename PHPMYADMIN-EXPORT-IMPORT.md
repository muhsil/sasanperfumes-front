# Complete Orders Export/Import Guide
## SasanPerfumes → ShapeHive (via Hostinger phpMyAdmin)

**Status**: Ready to execute  
**Estimated Time**: 5-10 minutes  
**Data Safety**: ✅ Backup already exists  

---

## **STEP 1: Access Hostinger Control Panel**

1. Go to: https://hpanel.hostinger.com/
2. Login with your Hostinger account (2FA if required)
3. You should see both sites:
   - sasanperfumes.com
   - shapehive.com

---

## **STEP 2: Export Orders from SasanPerfumes**

### 2a. Open phpMyAdmin for SasanPerfumes
1. In Hostinger hPanel, find **sasanperfumes.com** 
2. Click "Manage" → "Databases"
3. Click **phpMyAdmin** button
4. Database selected: `u346814456_XhYmf`

### 2b. Select the Orders Table
1. In the left sidebar, click the database name: `u346814456_XhYmf`
2. Find table: **`wc_orders`**
3. Click on it to expand

### 2c. Export the Table
1. At the top, click **Export** tab
2. Choose **SQL** format (default)
3. In "Export" section:
   - Keep default settings
   - Scroll down to **WHERE clause**
4. In "WHERE clause" add this filter:
   ```
   status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold')
   ```
5. Click **Go** (bottom right button)
6. Browser will download file: `wc_orders.sql`
7. Save it to your computer (remember the location!)

---

## **STEP 3: Import Orders to ShapeHive**

### 3a. Open phpMyAdmin for ShapeHive
1. In Hostinger hPanel, find **shapehive.com**
2. Click "Manage" → "Databases"
3. Click **phpMyAdmin** button
4. Database selected: `u346814456_XhYmf` (same database as source!)

### 3b. Import the SQL File
1. At the top, click **Import** tab
2. Click **Choose File** button
3. Select the `wc_orders.sql` file you just downloaded
4. Scroll down and click **Import** button
5. Wait for success message:
   ```
   The following queries were executed successfully...
   ```

---

## **STEP 4: Verify Import Success**

### 4a. Check Order Count
1. In phpMyAdmin, go to **SQL** tab
2. Paste this query:
   ```sql
   SELECT COUNT(*) as total_orders FROM wc_orders;
   ```
3. Click **Go**
4. You should see a count of imported orders (should match source count)

### 4b. Check Sample Orders
1. In phpMyAdmin, go to **SQL** tab
2. Paste this query:
   ```sql
   SELECT id, customer_id, total, date_created, status 
   FROM wc_orders 
   ORDER BY id DESC 
   LIMIT 10;
   ```
3. Click **Go**
4. Verify you see orders with preserved IDs and dates

### 4c. Verify in WordPress Admin
1. Go to: https://cms.shapehive.com/wp-admin/admin.php?page=wc-orders
2. You should see the imported orders in the list
3. Click on one order to verify full data is present

---

## **IMPORTANT NOTES**

⚠️ **Database Location**: Both sites use the SAME database account at Hostinger
- Source: `u346814456_XhYmf` (sasanperfumes)
- Destination: `u346814456_XhYmf` (shapehive) ← **SAME**
- This is because both are on the same Hostinger account/plan

✅ **Data Preserved**:
- Order IDs (exact match)
- Order dates & times
- Customer information
- Order items
- Payment status
- Shipping addresses

❌ **NOT Preserved** (if using export/import):
- Order relationships to specific sites (if using multisite)
- Custom order actions/notes added after export

🔄 **Rollback Plan**:
- If import fails, the backup at `sasanperfumes.shapehive.com` still has all data
- Delete imported orders and retry

---

## **QUICK REFERENCE: SQL Queries**

### Get Order Count
```sql
SELECT COUNT(*) FROM wc_orders;
```

### Get Recent Orders  
```sql
SELECT id, customer_id, total, date_created 
FROM wc_orders 
ORDER BY id DESC 
LIMIT 20;
```

### Get Orders by Status
```sql
SELECT id, status, COUNT(*) as count 
FROM wc_orders 
GROUP BY status;
```

### Delete Imported Orders (if needed to retry)
```sql
DELETE FROM wc_orders WHERE id >= [FIRST_IMPORTED_ID];
```

---

## **Support**

If you encounter issues:
1. **phpMyAdmin won't load**: Try refresh or clear browser cache
2. **Import timeout**: The SQL file might be large; try splitting it
3. **Permission denied**: Contact Hostinger support (unlikely)
4. **Data mismatch**: Stop and restore from backup, then retry

---

**Ready to proceed? Follow steps 1-4 above.**
