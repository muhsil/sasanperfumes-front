# Orders Export/Import Methods Comparison
## SasanPerfumes → ShapeHive

---

## **Method 1: phpMyAdmin Direct SQL** ⭐ MOST RELIABLE
**Status**: Ready now | **Complexity**: Low | **Time**: 5-10 min

### Overview
Direct database export/import via Hostinger control panel. No WordPress involved.

### Pros
✅ Direct database access  
✅ Exact data preservation (all columns preserved)  
✅ Exact order IDs maintained  
✅ Can filter by status before export  
✅ Simple, no tools needed  
✅ Fastest method  

### Cons
❌ Requires Hostinger access  
❌ Manual steps in UI  

### Steps
1. Hostinger hPanel → sasanperfumes.com → phpMyAdmin
2. Export `wc_orders` table with SQL format
3. Hostinger hPanel → shapehive.com → phpMyAdmin
4. Import the SQL file
5. Verify with SELECT COUNT query

### Script
See: [PHPMYADMIN-EXPORT-IMPORT.md](./PHPMYADMIN-EXPORT-IMPORT.md)

---

## **Method 2: REST API (PowerShell)** ⚡ FLEXIBLE
**Status**: Ready now | **Complexity**: Medium | **Time**: 10-20 min

### Overview
Uses WooCommerce REST API to fetch orders and import to destination.

### Pros
✅ No database access needed  
✅ Works via HTTPS/API  
✅ Can target multiple sites (shapehive, qa, om, sa)  
✅ Human-readable JSON export  
✅ Easy to inspect/modify data before import  

### Cons
❌ Requires API authentication setup  
❌ Slower than SQL (network latency)  
❌ May not preserve all metadata  
❌ Need REST API credentials  

### Steps
1. Run export script:
   ```powershell
   .\wp-rest-api-export-orders.ps1
   ```
2. Optionally review the JSON file
3. Run import script:
   ```powershell
   .\wp-rest-api-import-orders.ps1 -InputFile orders_export.json -TargetSite shapehive
   ```

### Scripts
- [wp-rest-api-export-orders.ps1](./wp-rest-api-export-orders.ps1)
- [wp-rest-api-import-orders.ps1](./wp-rest-api-import-orders.ps1)

### Requirements
- PowerShell 5.0+
- Curl or Invoke-RestMethod
- WooCommerce REST API enabled
- Optional: API credentials (if site requires auth)

---

## **Method 3: WP-CLI (Command Line)** 🚀 MOST POWERFUL
**Status**: Ready now | **Complexity**: High | **Time**: 15-30 min

### Overview
WordPress command-line tool for advanced operations. Requires SSH access.

### Pros
✅ Most powerful & flexible  
✅ Direct WordPress functions  
✅ Preserves all WordPress features  
✅ Can run custom hooks/filters  
✅ Scriptable & automatable  
✅ Best for large datasets  

### Cons
❌ Requires SSH/CLI access  
❌ More complex setup  
❌ Need WP-CLI installed on server  
❌ Steeper learning curve  

### Steps (if you have SSH)
```bash
# Export from sasanperfumes
ssh user@sasanperfumes.com
cd /home/user/public_html
wp woocommerce order list \
  --status=completed,processing,pending \
  --format=csv > orders_export.csv
exit

# Import to shapehive
ssh user@shapehive.com
cd /home/user/public_html
wp import orders_export.csv --skip-comments
```

### Script
See: [wp-cli-export-orders.sh](./wp-cli-export-orders.sh)

### Requirements
- SSH access to both servers
- WP-CLI installed on servers
- Bash shell access

---

## **Method 4: WordPress Export Tool** (BACKUP OPTION)
**Status**: Available | **Complexity**: Low | **Time**: 10-15 min

### Overview
Use WordPress built-in export feature (if UI responds).

### Pros
✅ Native WordPress tool  
✅ No additional tools needed  
✅ Official, supported method  

### Cons
❌ WordPress UI very slow on sasanperfumes  
❌ May time out on large datasets  
❌ Need to use WordPress importer on destination  

### Steps
1. Go to sasanperfumes.com/wp-admin/export.php
2. Select "Orders" content type
3. Click Download XML
4. Go to shapehive.com/wp-admin/import.php
5. Choose WordPress as importer
6. Upload XML file
7. Map authors and import

---

## **Comparison Table**

| Feature | phpMyAdmin | REST API | WP-CLI | WP Export |
|---------|-----------|----------|--------|-----------|
| **Setup Time** | Immediate | 5 min | 15 min | Immediate |
| **Execution Time** | 2 min | 10 min | 5 min | 10 min |
| **Data Fidelity** | 100% | 95% | 100% | 90% |
| **Order IDs** | Exact ✅ | Exact ✅ | Exact ✅ | New IDs ❌ |
| **Requires SSH** | ❌ | ❌ | ✅ | ❌ |
| **Requires Auth Keys** | ❌ | ✅* | ❌ | ❌ |
| **Offline Support** | ✅ | ❌ | ❌ | ✅ |
| **Can Filter** | ✅ | ✅ | ✅ | ✅ |
| **Can Modify Data** | ✅ | ✅ | ✅ | ❌ |
| **Speed** | Fastest | Medium | Fast | Slowest |
| **Reliability** | Highest | High | High | Medium |

*REST API: Only if API requires authentication

---

## **QUICK RECOMMENDATION**

### For You (Hostinger User Without SSH):
**Use phpMyAdmin Method** ⭐
- No setup needed
- Fastest
- Most reliable
- Direct database access
- See: [PHPMYADMIN-EXPORT-IMPORT.md](./PHPMYADMIN-EXPORT-IMPORT.md)

### Alternative (If REST API Is Set Up):
**Use REST API Method** ⚡
- Better control
- Can inspect data
- Can target multiple sites
- More flexible
- See: [wp-rest-api-export-orders.ps1](./wp-rest-api-export-orders.ps1)

### Advanced (If You Have SSH):
**Use WP-CLI Method** 🚀
- Most powerful
- Full WordPress integration
- Scriptable
- See: [wp-cli-export-orders.sh](./wp-cli-export-orders.sh)

---

## **Data Preservation Notes**

### Preserved in All Methods:
✅ Order ID (exact)  
✅ Order date & time  
✅ Customer name & email  
✅ Billing/shipping address  
✅ Order total  
✅ Order items (products)  
✅ Order status  

### Preserved in phpMyAdmin Only:
✅ All custom fields  
✅ All order metadata  
✅ Internal notes  
✅ Refund data  
✅ Plugin-specific data  

### Might Not Be Preserved (REST API):
❌ Some plugin-specific metadata  
❌ Internal order notes  
❌ Custom post meta fields  

---

## **Next Steps**

1. **Choose your method** based on the table above
2. **Follow the corresponding guide** in the documentation
3. **Verify import** with:
   ```sql
   SELECT COUNT(*) FROM wc_orders;
   SELECT id, total, customer_id FROM wc_orders ORDER BY id DESC LIMIT 10;
   ```
4. **Check WordPress admin**: cms.shapehive.com/wp-admin/admin.php?page=wc-orders

---

## **Support & Troubleshooting**

### phpMyAdmin Method
- Import timing out? → Check file size, may need to split
- Permission denied? → Contact Hostinger support
- Data mismatch? → Check WHERE clause filter

### REST API Method
- Authentication error? → Set up API credentials
- Slow import? → Reduce batch size
- Failed orders? → Check JSON format

### WP-CLI Method
- Command not found? → Install WP-CLI on server
- Permission denied? → Check SSH user permissions
- Import errors? → Check WordPress error logs

---

**Ready to proceed? Choose a method above and let me know!**
