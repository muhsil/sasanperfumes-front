# ShapeHive CMS Deployment Instructions

## Issue: ASL_Security Class Duplicate Declaration

All REST API endpoints are returning 500 errors due to:
```
PHP Fatal error: Cannot declare class ASL_Security, because the name is already in use
```

## Root Cause
The legacy `asl-security` plugin is still installed and active on the staging server, conflicting with other plugins that also declare the `ASL_Security` class.

## Solution

### Option 1: Must-Use Plugin (Recommended)
1. Copy `99-disable-legacy-asl-security.php` to `/wp-content/mu-plugins/` on staging server
2. This must-use plugin will load BEFORE regular plugins and deactivate asl-security
3. Restart WordPress or clear any caching

### Option 2: Via WordPress Admin Dashboard
1. Log into `https://cms.sasanperfumes.com/wp-admin`
2. Go to **Plugins** → **Installed Plugins**
3. Find and **Deactivate** any of these plugins:
   - `asl-security`
   - `ShapeHive`
   - `ASL Settings`
   - Any other "Aromatic" or "ASL" plugin
4. (Optional) Delete the plugin folder from `/wp-content/plugins/`

### Option 3: Via WP-CLI
```bash
wp plugin deactivate asl-security
wp plugin deactivate aromatic-scents-lab
wp cache flush
```

### Option 4: Via Direct Database
```sql
-- Remove asl-security from active plugins list
UPDATE wp_options 
SET option_value = REPLACE(option_value, '"asl-security/asl-security.php"', '')
WHERE option_name = 'active_plugins';
```

## Verification

After applying the fix:

1. Check REST API response:
   ```bash
   curl https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/home-settings?lang=en
   ```
   Should return JSON with hero settings (not 500 error)

2. Check frontend homepage:
   - Frontend should load hero images/videos from WordPress backend
   - Both English and Arabic locales should display correctly

3. Check WordPress debug log:
   - No more "Cannot declare class ASL_Security" errors

## Files Deployed

- ✅ `wordpress/sasanperfumes-frontend-settings/` — Main CMS plugin source
- 📄 `wordpress/99-disable-legacy-asl-security.php` — Must-use plugin to block asl-security
- 📄 `wordpress/DEPLOYMENT_INSTRUCTIONS.md` — This file

## Next Steps

Once the ASL_Security conflict is resolved:

1. ✅ All REST API endpoints should return 200 with proper data
2. ✅ Frontend homepage will display hero content from WordPress
3. ✅ Run Playwright tests to verify frontend/backend integration
4. ✅ Test EN/AR locale switching with hero video/image fallbacks
