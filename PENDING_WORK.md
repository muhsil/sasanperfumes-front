# ShapeHive Live Status And Pending Work

**Last updated:** 2026-06-19, Asia/Dubai  
**Overall status:** Public frontend path routing is live and working. The main remaining blocker is backend market admin access for separate QA, OM, and SA content management.

## What Is Live Now

### Public frontend routes

Verified on live production on 2026-06-19:

| Route | Status | Market signal |
| --- | --- | --- |
| `https://shapehive.com/en` | 200, homepage renders | AED |
| `https://shapehive.com/ar` | 200, Arabic RTL renders | AED |
| `https://shapehive.com/qa/en` | 200, homepage renders | QAR |
| `https://shapehive.com/qa/ar` | 200, Arabic RTL renders | QAR |
| `https://shapehive.com/om/en` | 200, homepage renders | OMR |
| `https://shapehive.com/om/ar` | 200, Arabic RTL renders | OMR |
| `https://shapehive.com/sa/en` | 200, homepage renders | SAR |
| `https://shapehive.com/sa/ar` | 200, Arabic RTL renders | SAR |

The frontend API check is also healthy:

- `https://shapehive.com/api/home-settings?lang=en` returns valid JSON.
- `https://shapehive.com/api/home-settings?lang=ar` returns valid JSON.
- The previous `{"code":"invalid_response"}` problem is fixed on live.

### Routing behavior implemented in code

- Market URLs now use path-based routing:
  - UAE/global: `/en`, `/ar`
  - Qatar: `/qa/en`, `/qa/ar`
  - Oman: `/om/en`, `/om/ar`
  - Saudi Arabia: `/sa/en`, `/sa/ar`
- Public legacy subdomains are removed from frontend canonical and allowed-host logic:
  - `qa.shapehive.com`
  - `om.shapehive.com`
  - `sa.shapehive.com`
- Market routes internally resolve to the existing locale pages while preserving market context through request headers.
- `x-market` and `x-frontend-host` are propagated to backend/API calls.
- Backend JSON parsing now strips hidden WordPress BOM/zero-width characters before parsing, preventing frontend crashes from malformed response prefixes.
- CORS defaults are narrowed to `https://shapehive.com`, `https://cms.shapehive.com`, and local development origins.

### Backend network changes already performed

The WordPress multisite network was restored to include the main CMS plus QA, OM, and SA market sites. The intended backend content model is:

| Backend site | Purpose | Frontend path |
| --- | --- | --- |
| `cms.shapehive.com` | Main/UAE content | `https://shapehive.com` |
| `cms.shapehive.com/qa` | Qatar content | `https://shapehive.com/qa` |
| `cms.shapehive.com/om` | Oman content | `https://shapehive.com/om` |
| `cms.shapehive.com/sa` | Saudi content | `https://shapehive.com/sa` |

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

## Still Pending

### 1. Fix backend market dashboard access

This is the main remaining blocker.

Current live checks show the market admin paths redirect instead of opening cleanly:

- `https://cms.shapehive.com/qa/wp-admin/` ends in repeated `301`
- `https://cms.shapehive.com/om/wp-admin/` ends in repeated `301`
- `https://cms.shapehive.com/sa/wp-admin/` ends in repeated `301`

Until this is fixed, separate market content exists conceptually but is not comfortably manageable from direct market dashboard URLs.

Choose and complete one backend access strategy:

1. Path-based CMS dashboards:
   - Configure Hostinger/web-server/WordPress routing so these work:
     - `https://cms.shapehive.com/qa/wp-admin/`
     - `https://cms.shapehive.com/om/wp-admin/`
     - `https://cms.shapehive.com/sa/wp-admin/`

2. Backend-only CMS subdomains:
   - Revert backend market sites to:
     - `qa.cms.shapehive.com`
     - `om.cms.shapehive.com`
     - `sa.cms.shapehive.com`
   - Configure DNS and SSL for those CMS-only subdomains.
   - Keep public frontend traffic on path routes only.

Recommended direction: use path-based CMS dashboards if Hostinger can be configured cleanly. If Hostinger blocks WordPress multisite subdirectory admin paths, use backend-only CMS subdomains for admin/content management while keeping public site paths unchanged.

### 2. Re-check WordPress network settings after plugin deployment

Open:

`https://cms.shapehive.com/wp-admin/network/admin.php?page=sasanperfumes-frontend-network`

Confirm the live map supports path keys and is saved as intended:

- `cms.shapehive.com` -> `https://shapehive.com`
- `cms.shapehive.com/qa` -> `https://shapehive.com/qa`
- `cms.shapehive.com/om` -> `https://shapehive.com/om`
- `cms.shapehive.com/sa` -> `https://shapehive.com/sa`
- `shapehive.com/qa` -> `https://shapehive.com/qa`
- `shapehive.com/om` -> `https://shapehive.com/om`
- `shapehive.com/sa` -> `https://shapehive.com/sa`

Important: an older live plugin build normalized mappings by host only, which could collapse `shapehive.com/qa`, `shapehive.com/om`, and `shapehive.com/sa` into one `shapehive.com` row. The repo code now supports path-aware keys, but the live WordPress plugin must be confirmed or redeployed.

### 3. Remove old public frontend subdomain leftovers from hosting/DNS

The frontend code no longer uses:

- `qa.shapehive.com`
- `om.shapehive.com`
- `sa.shapehive.com`

Still confirm in Hostinger/DNS/CDN that these are removed, disabled, or redirected intentionally. They should not be active public storefronts.

### 4. UI consistency sweep

Run a visual pass on live pages after backend access is resolved:

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

After cache clears and backend admin access is fixed, test:

- Homepage -> category -> product
- Product add to cart
- Cart update/remove item
- Checkout
- Login/profile
- Wishlist
- Language switcher
- Currency selector
- Contact/private-label forms

### 7. Monitor category prefetch warnings

During one clean browser diagnostic run, background RSC prefetch requests for a few category links logged `500` responses. Direct category loads and a real menu click to `/en/category/perfumes` both returned working pages with no visible error.

Keep this on the watch list:

- `/en/category/perfumes`
- `/en/category/all-over-spray`
- `/en/category/sasan-hair-mist`
- `/en/category/oud-perfumes`

If these warnings repeat in live browser logs, inspect server logs and cache behavior for RSC requests.

## Deployment And Access Notes

- GitHub `main` contains the latest frontend and WordPress plugin source changes.
- Public frontend production now appears to have picked up the market route rewrite.
- Hostinger SSH access was not available from this environment due authentication failure, so any manual Hostinger-side changes still need hPanel, working SSH, or browser admin access.
- Do not store WordPress or Hostinger credentials in this document.
