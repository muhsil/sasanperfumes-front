# ORDERS MIGRATION - FINAL GUIDE

## ✅ READY TO EXECUTE

You have 3 methods available. Choose ONE:

---

## METHOD 1: phpMyAdmin (Recommended)
**Time: 5 minutes | Difficulty: Easy | Browser-based**

### STEP 1 - Export (2 min)
1. Login to: https://hpanel.hostinger.com/
2. Go to: sasanperfumes.com
3. Click: Databases
4. Click: phpMyAdmin button
5. In left sidebar: Click database u346814456_XhYmf
6. Click table: wc_orders
7. At top: Click "Export" tab
8. Keep format: SQL
9. Find section "WHERE clause" and paste:
   status IN ('wc-completed','wc-processing','wc-pending','wc-on-hold')
10. Click blue "GO" button
11. Save file: orders_export.sql

### STEP 2 - Import (2 min)
1. In Hostinger: Go to sasanperfumes.com
2. Click: Databases
3. Click: phpMyAdmin button
4. Click: "Import" tab
5. Click: "Choose File" button
6. Select: orders_export.sql (file from Step 1)
7. Click: "Import" button
8. Wait for success message

### STEP 3 - Verify (1 min)
1. In phpMyAdmin: Click "SQL" tab
2. Paste: SELECT COUNT(*) FROM wc_orders;
3. Click "GO"
4. Note the count number
5. Go to: https://cms.sasanperfumes.com/wp-admin/admin.php?page=wc-orders
6. Verify orders appear in WordPress

---

## METHOD 2: MySQL CLI (If you have SSH)
**Time: 3 minutes | Difficulty: Medium | Command-line**

```bash
# Step 1: Connect via SSH
ssh user@sasanperfumes.com

# Step 2: Export orders
mysqldump -u u346814456_LWBvM -p u346814456_XhYmf wc_orders \
  --where="status IN ('wc-completed','wc-processing','wc-pending','wc-on-hold')" \
  > orders_export.sql

# Step 3: Import to shapehive (same server)
mysql -u u346814456_LWBvM -p u346814456_XhYmf < orders_export.sql

# Step 4: Verify
mysql -u u346814456_LWBvM -p u346814456_XhYmf -e "SELECT COUNT(*) FROM wc_orders;"
```

---

## METHOD 3: WP-CLI (If you have SSH + WordPress)
**Time: 3 minutes | Difficulty: Medium | Most features**

```bash
# Step 1: Connect via SSH
ssh user@sasanperfumes.com
cd /home/user/public_html

# Step 2: List orders
wp woocommerce order list --status=completed,processing \
  --format=json > /tmp/orders.json

# Step 3: Copy to destination
scp /tmp/orders.json user@sasanperfumes.com:/tmp/

# Step 4: Import on destination
ssh user@sasanperfumes.com
cd /home/user/public_html
wp import orders /tmp/orders.json
```

---

## WHICH METHOD TO CHOOSE?

| Method | Browser | SSH | WP-CLI | Best For |
|--------|---------|-----|--------|----------|
| **1. phpMyAdmin** | ✅ Yes | ❌ No | ❌ No | **You - use this!** |
| **2. MySQL CLI** | ❌ No | ✅ Yes | ❌ No | Command-line users |
| **3. WP-CLI** | ❌ No | ✅ Yes | ✅ Yes | Advanced users |

---

## QUICK CHECKLIST

Before you start:
- [ ] You're logged into Hostinger hPanel
- [ ] You have access to sasanperfumes.com dashboard
- [ ] You have access to sasanperfumes.com dashboard
- [ ] You chose your method (1, 2, or 3 above)

After import:
- [ ] Orders count matches between source and destination
- [ ] Orders visible in WordPress admin (cms.sasanperfumes.com/wp-admin)
- [ ] Order IDs are preserved (same numbers)
- [ ] Order dates are correct

---

## SUPPORT NOTES

**phpMyAdmin Method Issues:**
- Timeout? → Try splitting into smaller batches (different statuses)
- Permission denied? → Contact Hostinger support
- File too large? → Use WHERE clause to filter by date range

**MySQL CLI Issues:**
- Command not found? → MySQL CLI not installed
- Access denied? → Check credentials (user/password)
- Wrong database? → Verify database name: u346814456_XhYmf

**WP-CLI Issues:**
- wp command not found? → WP-CLI not installed
- Permission denied? → Check SSH user permissions
- Import fails? → Check JSON file format

---

## IMPORTANT SECURITY NOTES

⚠️ **Database Credentials**
- User: u346814456_LWBvM
- Database: u346814456_XhYmf
- Keep password secure
- Don't share in public

⚠️ **Data Safety**
- Backup exists at: sasanperfumes.com (legacy backup)
- No data loss risk
- Can always restore from backup

⚠️ **Read-Only Requirements**
- After import: Mark sasanperfumes.com as read-only
- Disable plugins: Disable all except essential
- Redirect: Optionally redirect to sasanperfumes.com

---

**Ready? Pick METHOD 1 above and follow the steps. Takes 5 minutes!**
