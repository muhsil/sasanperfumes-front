# ShapeHive Live Status And Pending Work

**Last updated:** 2026-06-21, Asia/Dubai
**Overall status:** Public frontend path routing and market dashboard access are live. The repo now contains fixes for path-based CMS market switching, per-market content/product seeding, plugin activation on market sites, and the 1-7 verification workflow. Deploy the plugin/source changes, then run the WP-CLI scripts below on live CMS.

## What Is Live Now

### Public frontend routes

Verified on live production on 2026-06-19:

| Route | Status | Market signal |
| --- | --- | --- |
| `https://store.sasanperfumes.com/en` | 200, homepage renders | AED |
| `https://store.sasanperfumes.com/ar` | 200, Arabic RTL renders | AED |
| `https://store.sasanperfumes.com/qa/en` | 200, homepage renders | QAR |
| `https://store.sasanperfumes.com/qa/ar` | 200, Arabic RTL renders | QAR |
| `https://store.sasanperfumes.com/om/en` | 200, homepage renders | OMR |
| `https://store.sasanperfumes.com/om/ar` | 200, Arabic RTL renders | OMR |
| `https://store.sasanperfumes.com/sa/en` | 200, homepage renders | SAR |
| `https://store.sasanperfumes.com/sa/ar` | 200, Arabic RTL renders | SAR |

The frontend API check is also healthy:

- `https://store.sasanperfumes.com/api/home-settings?lang=en` returns valid JSON.
- `https://store.sasanperfumes.com/api/home-settings?lang=ar` returns valid JSON.
- The previous `{"code":"invalid_response"}` problem is fixed on live.

### Routing behavior implemented in code

- Market URLs now use path-based routing:
  - UAE/global: `/en`, `/ar`
  - Qatar: `/qa/en`, `/qa/ar`
  - Oman: `/om/en`, `/om/ar`
  - Saudi Arabia: `/sa/en`, `/sa/ar`
- Public legacy market subdomains are removed from frontend canonical and allowed-host logic.
- Market routes internally resolve to the existing locale pages while preserving market context through request headers.
- `x-market` and `x-frontend-host` are propagated to backend/API calls.
- Backend JSON parsing now strips hidden WordPress BOM/zero-width characters before parsing, preventing frontend crashes from malformed response prefixes.
- CORS defaults are narrowed to `https://store.sasanperfumes.com`, `https://cms.sasanperfumes.com`, and local development origins.

### Backend network changes already performed

The WordPress multisite network was restored to include the main CMS plus QA, OM, and SA market sites. The intended backend content model is:

| Backend site | Purpose | Frontend path |
| --- | --- | --- |
| `cms.sasanperfumes.com` | Main/UAE content | `https://store.sasanperfumes.com` |
| `cms.sasanperfumes.com/qa` | Qatar content | `https://store.sasanperfumes.com/qa` |
| `cms.sasanperfumes.com/om` | Oman content | `https://store.sasanperfumes.com/om` |
| `cms.sasanperfumes.com/sa` | Saudi content | `https://store.sasanperfumes.com/sa` |

## Pushed Code Record

These commits are already pushed to GitHub `main`:

- `009ca9d` - Migrate ShapeHive to path-based market routing
- `4538f53` - Restore CMS market sites and harden backend JSON parsing
- `73b80be` - Map backend market sites from network settings
- `3dd7d69` - Rewrite market routes to locale pages

Local build verification used:

```bash
npx next build --webpack
```

## Verification Screenshots

Fresh production screenshots were saved locally here:

`C:\Users\muhas\Desktop\MUHSIL\sasanperfumes\.tmp-live-screenshots\verified-2026-06-19\`

Key files:

- `shapehive-en-anonymous-cdp.png`
- `shapehive-en-chrome.png`
- `shapehive-ar.png`
- `qa-en.png`
- `qa-ar.png`
- `om-en.png`
- `om-ar.png`
- `sa-en.png`
- `sa-ar.png`

Note: one basic headless screenshot of `/en` briefly captured the global error screen, but a clean DevTools-controlled anonymous browser session and the user Chrome profile both rendered `/en` correctly afterward. Keep monitoring this route after cache clears.

## Fix And Verification Workflow

### 1. ShapeHive plugin settings admin access

Checked on 2026-06-21 with the provided WordPress admin credentials:

- `https://cms.sasanperfumes.com/wp-admin/` logs in successfully.
- `https://cms.sasanperfumes.com/qa/wp-admin/`, `/om/wp-admin/`, and `/sa/wp-admin/` open dashboards after login.
- The root dashboard does not expose `sasanperfumes` admin links.
- Direct plugin settings pages return `403 Forbidden`, including:
  - `https://cms.sasanperfumes.com/wp-admin/admin.php?page=sasanperfumes-settings`
  - `https://cms.sasanperfumes.com/wp-admin/admin.php?page=sasanperfumes-feature-toggles`
  - `https://cms.sasanperfumes.com/qa/wp-admin/admin.php?page=sasanperfumes-settings`

Repo fix:

- `scripts/setup-multisite-network.php` now ensures the ShapeHive plugin is active on each path-based market site unless it is already network-active.
- `scripts/sync-market-content.php` also activates the plugin on market sites before syncing content.
- Live CMS note: production currently has an active legacy plugin folder, `anbar-frontend-settings/anbar-frontend-settings.php`, plus inactive `sasanperfumes-frontend-settings` duplicates. The setup/sync scripts now treat the active legacy folder as valid to avoid activating a duplicate copy and triggering a fatal error.

Run after deployment:

```bash
wp eval-file scripts/setup-multisite-network.php
```

Then re-check:

- `https://cms.sasanperfumes.com/wp-admin/admin.php?page=sasanperfumes-settings`
- `https://cms.sasanperfumes.com/qa/wp-admin/admin.php?page=sasanperfumes-settings`
- `https://cms.sasanperfumes.com/om/wp-admin/admin.php?page=sasanperfumes-settings`
- `https://cms.sasanperfumes.com/sa/wp-admin/admin.php?page=sasanperfumes-settings`

### 2. WordPress network settings

Open:

`https://cms.sasanperfumes.com/wp-admin/network/admin.php?page=sasanperfumes-frontend-network`

Checked on 2026-06-21: the network page loaded successfully and contained the expected path-based map values:

- `cms.sasanperfumes.com` -> `https://store.sasanperfumes.com`
- `cms.sasanperfumes.com/qa` -> `https://store.sasanperfumes.com/qa`
- `cms.sasanperfumes.com/om` -> `https://store.sasanperfumes.com/om`
- `cms.sasanperfumes.com/sa` -> `https://store.sasanperfumes.com/sa`
- `store.sasanperfumes.com/qa` -> `https://store.sasanperfumes.com/qa`
- `store.sasanperfumes.com/om` -> `https://store.sasanperfumes.com/om`
- `store.sasanperfumes.com/sa` -> `https://store.sasanperfumes.com/sa`

Repo fix:

- `wordpress/sasanperfumes-frontend-settings/includes/class-sasanperfumes-multisite.php` now uses path-based CMS examples only.
- `scripts/setup-multisite-network.php` creates/updates `cms.sasanperfumes.com/qa`, `/om`, and `/sa`.
- Frontend CMS requests now use market-aware paths such as `https://cms.sasanperfumes.com/wp-json`.
- Frontend content/product fetchers prefer market CMS paths first and fall back to the root CMS API with market headers if a market path temporarily returns HTML instead of JSON.

Live REST probe on 2026-06-21: `https://cms.sasanperfumes.com/wp-json/...`, `/om/wp-json/...`, and `/sa/wp-json/...` returned HTML, not JSON. After deploying the plugin/scripts, verify server rewrites, permalink flushes, and cache/CDN rules until these paths return JSON. The fallback prevents hard page breaks, but fully separate products/content require the market CMS REST paths to work.

Important: an older live plugin build normalized mappings by host only, which could collapse path rows. The current code preserves path-aware keys; keep this on the deployment verification list after future plugin updates.

### 3. Old public market subdomain leftovers

The frontend code no longer uses public market subdomains.

Repo fix:

- Active setup code and docs no longer use public market subdomains.
- `scripts/retire-legacy-shapehive-sites.php` keeps old hosts only as cleanup targets.

Run if old network sites still exist:

```bash
wp eval-file scripts/retire-legacy-shapehive-sites.php -- --archive
```

Still confirm in Hostinger/DNS/CDN that old market subdomains are removed, disabled, or redirected intentionally. They should not be active public storefronts.

### 4. UI consistency sweep

Run a visual pass on live pages after deploying the market-content fixes:

- Home pages for all markets and languages
- Category listing pages
- Product detail pages
- Cart
- Checkout
- Account pages
- Header, footer, currency selector, language switcher, and mobile navigation

Target result: same spacing, margins, component behavior, and visual hierarchy across `/en`, `/qa/en`, `/om/en`, `/sa/en`, and Arabic equivalents.

### 5. SEO and sitemap verification

Validate each route has correct SEO output:

- Canonical URLs use path format, not old subdomains.
- `hreflang` includes global, QA, OM, and SA paths.
- Titles/descriptions are market-appropriate.
- Sitemap includes path-based market URLs.
- Robots rules do not expose deprecated subdomains as primary pages.

### 6. Commerce flow testing

After cache clears and market products are synced, test:

- Homepage -> category -> product
- Product add to cart
- Cart update/remove item
- Checkout
- Login/profile
- Wishlist
- Language switcher
- Currency selector
- Contact/private-label forms

### 7. Category route warnings

During one clean browser diagnostic run, background RSC prefetch requests for a few category links logged `500` responses. Direct category loads and a real menu click to `/en/category/perfumes` both returned working pages with no visible error.

Keep this on the watch list:

- `/en/category/perfumes`
- `/en/category/all-over-spray`
- `/en/category/sasan-hair-mist`
- `/en/category/oud-perfumes`

Repo fix:

- Product/category API calls now use market-aware CMS paths and preserve `x-market`/`x-frontend-host`, reducing mismatches that can trigger RSC prefetch failures.

If these warnings repeat in live browser logs, inspect server logs and cache behavior for RSC requests.

## Market Content/Product Sync

Each market must have its own WordPress site, settings, pages, products, taxonomies, and WooCommerce options. Use the new sync script to seed or refresh the market sites from the main CMS:

```bash
wp eval-file scripts/sync-market-content.php -- --dry-run
wp eval-file scripts/sync-market-content.php -- --markets=qa,om,sa
```

Default mode creates missing records only so market teams can manage content separately afterward. Use `--overwrite` only when you intentionally want to refresh existing market records from the main site.

## Deployment And Access Notes

- GitHub `main` contains the latest frontend and WordPress plugin source changes.
- Public frontend production now appears to have picked up the market route rewrite.
- Hostinger SSH access was not available from this environment due authentication failure, so any manual Hostinger-side changes still need hPanel, working SSH, or browser admin access.
- Do not store WordPress or Hostinger credentials in this document.
