# Orders-Only Import Guide
## SasanPerfumes → ShapeHive.com

### **Simplest Method: Direct SQL Copy**

#### **Step 1: Export Orders from SasanPerfumes**
1. Go to Hostinger hPanel → sasanperfumes.com → Databases → phpMyAdmin
2. Select database: `u346814456_XhYmf`
3. Go to **SQL** tab
4. Copy and run this query:

```sql
-- Export only completed/processed orders
SELECT * INTO OUTFILE '/tmp/orders_export.sql'
FROM wc_orders 
WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')
ORDER BY id ASC;
```

OR use the **Export tab** in phpMyAdmin:
- Select table: `wc_orders`
- Filter: `WHERE status IN ('wc-completed', 'wc-processing', 'wc-pending')`
- Format: SQL
- Download file

---

#### **Step 2: Import Orders into ShapeHive**
1. Go to Hostinger hPanel → sasanperfumes.com → Databases → phpMyAdmin
2. Select database: `u346814456_XhYmf`
3. Go to **Import** tab
4. Upload the exported SQL file
5. Click **Import**

---

### **Alternative: WordPress WP-CLI (Simplest)**

If you have SSH/CLI access to sasanperfumes.com:

```bash
# On sasanperfumes.com server
wp woocommerce order list --format=json > orders_list.json

# Then import via REST API or database directly
```

---

### **Manual CSV Import (If using WooCommerce import plugin)**

1. **Export from SasanPerfumes:**
   - Admin → Tools → Export
   - Select "Orders"
   - Download CSV

2. **Import to ShapeHive:**
   - Admin → Tools → Import
   - Choose WooCommerce Importer
   - Upload CSV file
   - Map columns
   - Run import

---

### **What Gets Imported**
- ✅ Order IDs (preserved)
- ✅ Order dates (preserved)
- ✅ Customer info
- ✅ Order items & meta
- ✅ Payment status
- ✅ Shipping info

### **Safety Notes**
- ⚠️ Backup sasanperfumes.com first (already done)
- ⚠️ Test with 1 order first
- ⚠️ Preserve order IDs exactly
- ⚠️ Check for duplicate customers

---

### **Verification After Import**

```sql
-- Check order count on ShapeHive
SELECT COUNT(*) as total_orders FROM wc_orders;

-- List imported orders
SELECT id, status, date_created, total FROM wc_orders ORDER BY id DESC LIMIT 10;

-- Verify customer count
SELECT COUNT(DISTINCT customer_id) FROM wc_orders;
```

---

**Choose the method that works best for your setup.**
