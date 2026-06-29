# WordPress Admin Guide - ShapeHive

This guide documents how the ShapeHive WordPress backend is managed for the headless Next.js storefront.

The frontend does not execute PHP files directly. The WordPress plugin runs on the CMS server, stores settings in the WordPress database, and exposes JSON through REST API endpoints. The Next.js app reads those endpoints using `NEXT_PUBLIC_WC_API_URL`.

## Current Backend Setup

| Item | Value |
|---|---|
| CMS URL | `https://cms.sasanperfumes.com` |
| Storefront URL | `https://store.sasanperfumes.com` |
| REST API base | `https://cms.sasanperfumes.com/wp-json` |
| Main custom namespace | `sasanperfumes/v1` |
| Plugin name | `ShapeHive Frontend Settings` |
| Local plugin source | `wordpress/sasanperfumes-frontend-settings/` |
| Live plugin path | `wp-content/plugins/sasanperfumes-frontend-settings/` |
| Local wp-content mirror | `fnf_wp_contents/` |

The REST namespace is still `sasanperfumes/v1`. Do not rename it unless the frontend API clients are updated at the same time.

## Local Backend Workflow

The repository contains two backend-related folders:

| Path | Purpose | Git status |
|---|---|---|
| `wordpress/sasanperfumes-frontend-settings/` | Source files for the custom WordPress plugin. Edit these when changing backend behavior. | Tracked |
| `fnf_wp_contents/` | Local copy/reference of server `wp-content`. Used only for understanding the live backend. | Ignored |

When backend changes are needed:

1. Edit files under `wordpress/sasanperfumes-frontend-settings/`.
2. Test PHP syntax locally where possible.
3. Test the affected REST endpoint from the frontend or with curl.
4. You upload the changed plugin files to the WordPress server.
5. Verify the live REST endpoint after upload.

### WordPress Multisite Mapping (shapehive network)

The plugin uses one CMS backend (`cms.sasanperfumes.com`) with separate content/product sites for each market and separate market frontends:

- Path-based markets on the same domain: `/qa`, `/om`, `/sa`
- CMS market content sites: `cms.sasanperfumes.com/qa`, `cms.sasanperfumes.com/om`, `cms.sasanperfumes.com/sa`
- Base intl host: `store.sasanperfumes.com`
- Route rule used by the frontend links: `/{market(optional)}/{locale}/{slug}` (locale is `en` or `ar`)
- Keep URL order as market-first (`/qa/en`, `/om/ar`, `/sa/en`). Any `/en/qa` style request is normalized to market-first by the frontend middleware, but keep canonical content links as market-first.
- Legacy market subdomain hosts are retired and are not part of the live routing plan.

Network mapping is handled by the WordPress multisite helper in:

`wordpress/sasanperfumes-frontend-settings/includes/class-sasanperfumes-multisite.php`

To bootstrap all domain mappings in one pass, run on live CMS after plugin deployment:

```bash
wp eval-file scripts/setup-multisite-network.php
```

After setup, confirm market REST paths return JSON instead of an HTML/default page:

```bash
curl -I https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/home-settings
curl -I https://cms.sasanperfumes.com/wp-json/wc/store/v1/products?per_page=1
curl -I https://cms.sasanperfumes.com/wp-json/wc/store/v1/products?per_page=1
```

If these paths return HTML, flush WordPress permalinks, clear cache/CDN, and confirm the web server routes `/qa`, `/om`, and `/sa` into WordPress. The frontend has a temporary root-API fallback, but fully separate market content/products require these market REST paths to return JSON.

You can also configure it manually from Network Admin:

1. Log in as super admin at `https://cms.sasanperfumes.com/wp-admin/network/admin.php?page=sasanperfumes-frontend-network`
2. Click **Frontend Network Settings**.
3. Set default frontend URL to `https://store.sasanperfumes.com`.
4. Keep JSON map as:

```json
{
  "cms.sasanperfumes.com": "https://store.sasanperfumes.com",
  "cms.sasanperfumes.com/qa": "https://store.sasanperfumes.com/qa",
  "cms.sasanperfumes.com/om": "https://store.sasanperfumes.com/om",
  "cms.sasanperfumes.com/sa": "https://store.sasanperfumes.com/sa",
  "store.sasanperfumes.com/qa": "https://store.sasanperfumes.com/qa",
  "store.sasanperfumes.com/om": "https://store.sasanperfumes.com/om",
  "store.sasanperfumes.com/sa": "https://store.sasanperfumes.com/sa"
}
```

5. Save.

6. Confirm legacy subdomain paths return 403/404 at the host level and are not configured in live domain settings.

7. Retire legacy network sites if they are still present:

```bash
wp eval-file scripts/retire-legacy-shapehive-sites.php -- --archive
```

Use `--delete` only if you want to permanently remove those sites instead of archiving.

After setup, test from each entry point:

- https://store.sasanperfumes.com/en
- https://store.sasanperfumes.com/ar
- https://store.sasanperfumes.com/qa/en
- https://store.sasanperfumes.com/qa/ar
- https://store.sasanperfumes.com/om/en
- https://store.sasanperfumes.com/om/ar
- https://store.sasanperfumes.com/sa/en
- https://store.sasanperfumes.com/sa/ar

Primary CMS admin entry points:

- WordPress Admin: `https://cms.sasanperfumes.com/wp-admin`
- Qatar content/product admin: `https://cms.sasanperfumes.com/qa/wp-admin`
- Oman content/product admin: `https://cms.sasanperfumes.com/om/wp-admin`
- Saudi content/product admin: `https://cms.sasanperfumes.com/sa/wp-admin`
- Network frontend mapping settings: `https://cms.sasanperfumes.com/wp-admin/network/admin.php?page=sasanperfumes-frontend-network`

### Arabic Content Sync (Products + Pages + CMS)

Use `wp eval-file` on the live CMS host after the plugin files are uploaded:

```bash
wp eval-file scripts/fix-arabic-products.php
```

`scripts/fix-arabic-products.php` is a backward-compatible entrypoint that runs:

- Product EN->AR translations in WPML (creates Arabic product rows when missing).
- EN->AR post meta sync for bilingual fields.
- EN->AR term meta sync for taxonomy SEO fields and product metadata.
- EN->AR option + theme-mod settings sync.

Useful flags:

```bash
wp eval-file scripts/fix-arabic-products.php --dry-run
wp eval-file scripts/fix-arabic-products.php --skip-create-products
wp eval-file scripts/fix-arabic-products.php --skip-options
wp eval-file scripts/fix-arabic-content.php --post-types=product,page,sasanperfumes_service
wp eval-file scripts/fix-arabic-content.php --taxonomies=product_cat,product_brand
```

Do not edit `fnf_wp_contents/` as the source of truth. It is a reference mirror only.

### Market Content Sync (QA + OM + SA)

Each market must be managed separately after it is seeded. Run this only on the live CMS server after plugin deployment and network setup:

```bash
wp eval-file scripts/sync-market-content.php -- --dry-run
wp eval-file scripts/sync-market-content.php -- --markets=qa,om,sa
```

Default mode creates missing records only. It copies the main CMS products, product categories/tags/attributes, media, pages, posts, custom content, plugin settings, and selected WooCommerce options into each market site so each market can then be edited independently.

Use `--overwrite` only when intentionally refreshing existing market records from the main CMS:

```bash
wp eval-file scripts/sync-market-content.php -- --markets=qa,om,sa --overwrite
```

## Plugin Installation

Install the plugin as a regular WordPress plugin:

```text
wp-content/plugins/sasanperfumes-frontend-settings/
```

Required files:

```text
sasanperfumes-frontend-settings.php
admin.js
includes/
woocommerce/
```

Then activate:

```text
WP Admin -> Plugins -> ShapeHive Frontend Settings -> Activate
```

The plugin can also be updated by uploading only changed files into the existing plugin folder.

## Important Plugin Files

| File | Purpose |
|---|---|
| `sasanperfumes-frontend-settings.php` | Plugin bootstrap, version, module loading, admin scripts, product search AJAX |
| `admin.js` | Media upload buttons, repeaters, sortable admin UI behavior |
| `includes/class-sasanperfumes-settings.php` | Home page, header, topbar, SEO, main settings API |
| `includes/class-sasanperfumes-home-sections.php` | Homepage extra sections: why choose us, story, FAQ, SEO content |
| `includes/class-sasanperfumes-feature-toggles.php` | Feature toggles API and admin page |
| `includes/class-sasanperfumes-footer-settings.php` | Footer settings and footer REST API |
| `includes/class-sasanperfumes-static-pages.php` | Static page settings and legacy page data |
| `includes/class-sasanperfumes-page-fields.php` | Page metaboxes and `/pages/{slug}` API |
| `includes/class-sasanperfumes-brand-pages.php` | Product brand taxonomy fields and brand APIs |
| `includes/class-sasanperfumes-services.php` | Services CPT and service APIs |
| `includes/class-sasanperfumes-private-labeling.php` | Private Labeling page and form submission API |
| `includes/class-sasanperfumes-guide-pages.php` | Guide CPT and guide APIs |
| `includes/class-sasanperfumes-product-pages.php` | Product landing page CPT and APIs |
| `includes/class-sasanperfumes-category-seo.php` | Category SEO content APIs |
| `includes/class-sasanperfumes-notes-cpt.php` | Notes CPT and note SEO APIs |
| `includes/class-sasanperfumes-product-meta.php` | Dynamic product meta description API |
| `includes/class-sasanperfumes-advanced-settings.php` | Live chat, gift wrap, abandoned popup, product detail settings |
| `includes/class-sasanperfumes-brands-slider.php` | Homepage brands slider |
| `includes/class-sasanperfumes-promotions.php` | Popup settings and product badges |
| `includes/class-sasanperfumes-free-gift.php` | Free gift rules |
| `includes/class-sasanperfumes-bundle-builder.php` | Bundle builder APIs and product metaboxes |
| `includes/class-sasanperfumes-referral.php` | Referral settings and registration endpoints |
| `includes/class-sasanperfumes-loyalty.php` | Loyalty settings, history, redemption |
| `includes/class-sasanperfumes-stock-alerts.php` | Back-in-stock alerts |
| `includes/class-sasanperfumes-whatsapp.php` | WhatsApp floating button settings |
| `includes/class-sasanperfumes-size-guide.php` | Size guide CPT and APIs |
| `includes/class-sasanperfumes-forms.php` | Contact/newsletter form endpoints |

## Admin Pages

Main menu:

```text
WP Admin -> ShapeHive Settings
```

Common pages:

| Admin page | URL fragment | Purpose |
|---|---|---|
| Home Page | `admin.php?page=sasanperfumes-settings` | Hero, product sections, categories, collections, banners |
| Header & Topbar | `admin.php?page=sasanperfumes-settings-header` | Logo, sticky header, topbar |
| SEO Settings | `admin.php?page=sasanperfumes-settings-seo` | Metadata, Open Graph, analytics IDs |
| Footer Settings | `admin.php?page=sasanperfumes-settings-footer` | Footer columns, contact, newsletter, payments |
| Brands Slider | `admin.php?page=sasanperfumes-settings-brands-slider` | Homepage brand carousel |
| Promotions | `admin.php?page=sasanperfumes-promotions` | Popup and product badges |
| Advanced | `admin.php?page=sasanperfumes-advanced` | Live chat, gift wrap, abandoned cart popup, product detail |
| Feature Toggles | `admin.php?page=sasanperfumes-feature-toggles` | Enable/disable public pages and sections |
| Brands Page | `admin.php?page=sasanperfumes-settings-brands-page` | Brands listing page settings |
| Services Page | `admin.php?page=sasanperfumes-settings-services-page` | Services listing page settings |
| Private Labeling | `admin.php?page=sasanperfumes-private-labeling` | Private labeling landing page sections |
| WhatsApp Button | `admin.php?page=sasanperfumes-whatsapp` | WhatsApp number/message/position |
| Referral | `admin.php?page=sasanperfumes-referral` | Referral program settings |
| Loyalty Points | `admin.php?page=sasanperfumes-loyalty` | Loyalty program settings |
| Stock Alerts | `admin.php?page=sasanperfumes-stock-alerts` | Back-in-stock alerts |
| Pages | `admin.php?page=sasanperfumes-pages` | Static page fallback content |

CPT/admin areas:

| Area | URL fragment | Purpose |
|---|---|---|
| Services | `edit.php?post_type=sasanperfumes_service` | Service detail records |
| Guide Pages | `edit.php?post_type=sasanperfumes_guide` | Guide landing/detail content |
| Product Pages | `edit.php?post_type=sasanperfumes_product_page` | Custom product landing pages |
| Size Guides | `edit.php?post_type=sasanperfumes_size_guide` | Size guide content |
| Notes | `edit.php?post_type=sasanperfumes_note` | Notes SEO/CPT content |
| Private Labeling submissions | `edit.php?post_type=sasanperfumes_pl_inquiry` | Submitted inquiries |
| Product brands | `term.php?taxonomy=product_brand&post_type=product` | Brand logo/banner/about/notes fields |

## Admin UI Notes

The plugin uses WordPress Media Library buttons for image fields. Image fields should be rendered through `sasanperfumes_image_field()` from:

```text
includes/sasanperfumes-field-helpers.php
```

Expected image field markup:

```text
.sasanperfumes-upload-btn
.sasanperfumes-image-preview
```

If upload buttons fail in WP Admin:

1. Check browser console for `window.__sasanperfumesAdminLoaded`.
2. Confirm `admin.js` loaded.
3. Confirm `wp_enqueue_media()` is active on the page.
4. Check for Hostinger rate limiting. The plugin includes inline JS fallback logic for this.

## Feature Toggles

Feature toggles live in:

```text
ShapeHive Settings -> Feature Toggles
```

REST endpoint:

```text
GET /wp-json/sasanperfumes/v1/feature-toggles
```

Important toggle keys:

| Key | Purpose |
|---|---|
| `sasanperfumes_reviews_enabled` | Product reviews and review form |
| `sasanperfumes_brands_page_enabled` | Brands listing/detail pages |
| `sasanperfumes_services_page_enabled` | Services listing/detail pages |
| `sasanperfumes_what_we_do_enabled` | What We Do page |
| `sasanperfumes_blog_enabled` | Blog listing/detail pages |
| `sasanperfumes_store_locator_enabled` | Store Locator page |
| `sasanperfumes_faq_enabled` | FAQ page |
| `sasanperfumes_private_labeling_enabled` | Private Labeling page |
| `sasanperfumes_home_services_enabled` | Homepage services section |
| `sasanperfumes_home_blog_enabled` | Homepage blog section |
| `sasanperfumes_home_notes_enabled` | Homepage notes section |
| `sasanperfumes_size_guide_enabled` | Size guide feature |
| `sasanperfumes_loyalty_enabled` | Loyalty feature |
| `sasanperfumes_scent_guide_enabled` | Scent guide feature |
| `sasanperfumes_whatsapp_enabled` | WhatsApp floating button |

Next.js pages may cache toggle values through ISR. After changing toggles on production, rebuild or wait for revalidation.

## Public WordPress REST APIs

Base:

```text
https://cms.sasanperfumes.com/wp-json
```

Main settings/content endpoints:

| Endpoint | Purpose |
|---|---|
| `/sasanperfumes/v1/home-settings` | Hero, products, categories, collections, banners |
| `/sasanperfumes/v1/home-sections` | Why choose us, story, homepage FAQ, SEO content |
| `/sasanperfumes/v1/site-settings` | Site identity/logo settings |
| `/sasanperfumes/v1/header-settings` | Header logo/sticky settings |
| `/sasanperfumes/v1/seo-settings` | SEO and tracking settings |
| `/sasanperfumes/v1/topbar` | Promotional topbar settings |
| `/sasanperfumes/v1/footer-settings` | Footer columns and footer metadata |
| `/sasanperfumes/v1/feature-toggles` | Feature toggle map |
| `/sasanperfumes/v1/whatsapp` | WhatsApp floating button settings |
| `/sasanperfumes/v1/live-chat` | Live chat settings |
| `/sasanperfumes/v1/gift-wrap` | Gift wrap settings |
| `/sasanperfumes/v1/abandoned-cart-popup` | Abandoned cart popup settings |
| `/sasanperfumes/v1/popup-settings` | Promotional popup settings |
| `/sasanperfumes/v1/product-detail` | Product detail UI settings |

CMS page/content endpoints:

| Endpoint | Purpose |
|---|---|
| `/sasanperfumes/v1/pages/{slug}` | Static page content |
| `/sasanperfumes/v1/brands` | Brand list |
| `/sasanperfumes/v1/brands/{slug}` | Brand detail |
| `/sasanperfumes/v1/brands-page` | Brands listing page settings |
| `/sasanperfumes/v1/brands-slider` | Homepage brands slider |
| `/sasanperfumes/v1/services` | Service list |
| `/sasanperfumes/v1/services/{slug}` | Service detail |
| `/sasanperfumes/v1/services-page` | Services listing page settings |
| `/sasanperfumes/v1/private-labeling` | Private Labeling page content |
| `/sasanperfumes/v1/private-labeling/submit` | Private Labeling form submission |
| `/sasanperfumes/v1/guides` | Guide list |
| `/sasanperfumes/v1/guides/{slug}` | Guide detail |
| `/sasanperfumes/v1/product-pages` | Custom product landing pages |
| `/sasanperfumes/v1/product-pages/{slug}` | Product landing page detail |
| `/sasanperfumes/v1/category-seo` | All category SEO records |
| `/sasanperfumes/v1/category-seo/{slug}` | Category SEO detail |
| `/sasanperfumes/v1/category-subtitle/{slug}` | Category subtitle |
| `/sasanperfumes/v1/product-meta/{slug}` | Dynamic product meta description |
| `/sasanperfumes/v1/notes-seo` | All notes SEO records |
| `/sasanperfumes/v1/notes-seo/{slug}` | Single note SEO record |
| `/sasanperfumes/v1/scent-guide` | Scent guide content |
| `/sasanperfumes/v1/size-guide?product_id={id}` | Product size guide |
| `/sasanperfumes/v1/product-variation-images?product_id={id}` | Variation image map |

Commerce/custom endpoints:

| Endpoint | Purpose |
|---|---|
| `/sasanperfumes/v1/loyalty/settings` | Loyalty settings |
| `/sasanperfumes/v1/loyalty?customer_id={id}` | Customer loyalty summary |
| `/sasanperfumes/v1/loyalty/history?customer_id={id}` | Loyalty history |
| `/sasanperfumes/v1/loyalty/redeem` | Redeem loyalty points |
| `/sasanperfumes/v1/referral/settings` | Referral settings |
| `/sasanperfumes/v1/referral?customer_id={id}` | Customer referral data |
| `/sasanperfumes/v1/referral/register` | Register referral |
| `/sasanperfumes/v1/stock-alerts/check?product_id={id}&email={email}` | Check stock alert |
| `/sasanperfumes/v1/stock-alerts` | Create/delete stock alert |
| `/sasanperfumes-free-gifts/v1/rules` | Free gift rules |
| `/sasanperfumes-bundles/v1` | Bundle builder data |
| `/sasanperfumes-bundles/v1/config` | Bundle builder config |
| `/sasanperfumes-bundles/v1/enabled-products` | Bundle-enabled product slugs |

WordPress/WooCommerce endpoints:

| Endpoint | Purpose |
|---|---|
| `/wp/v2/posts` | Blog posts |
| `/wp/v2/posts?slug={slug}` | Blog post by slug |
| `/wp/v2/media/{id}` | Media details |
| `/wc/store/v1/products` | Product listing |
| `/wc/store/v1/products/{id}` | Product detail |
| `/wc/store/v1/products/categories` | Product categories |
| `/wc/store/v1/cart` | WooCommerce Store API cart |
| `/cocart/v2/cart` | CoCart cart |
| `/cocart/v2/cart/add-item` | Add item to cart |
| `/cocart/jwt/validate-token` | Validate auth token |
| `/cocart/jwt/refresh-token` | Refresh auth token |

## Latest API Check Result

The documented live CMS endpoints were checked from this workspace.

Working `200 JSON` endpoints included:

```text
/sasanperfumes/v1/home-settings
/sasanperfumes/v1/home-sections
/sasanperfumes/v1/brands-slider
/sasanperfumes/v1/brands
/sasanperfumes/v1/brands/rimal
/sasanperfumes/v1/brands-page
/sasanperfumes/v1/services
/sasanperfumes/v1/services/private-label-fragrances
/sasanperfumes/v1/services-page
/sasanperfumes/v1/pages/about
/sasanperfumes/v1/pages/contact
/sasanperfumes/v1/pages/what-we-do
/sasanperfumes/v1/feature-toggles
/sasanperfumes/v1/private-labeling
/sasanperfumes/v1/whatsapp
/sasanperfumes/v1/mobile-bar
/sasanperfumes/v1/referral/settings
/sasanperfumes/v1/currencies
/wp/v2/posts
```

Previously observed issues and fixture caveats:

| Endpoint | Result | Note |
|---|---|---|
| `/sasanperfumes/v1/mobile-bar` | 200 JSON on 2026-06-21 | Previously 404 before the live backend picked up the route |
| `/sasanperfumes/v1/referral/settings` | 200 JSON on 2026-06-21 | Previously 404 before the live backend loaded the referral module |
| `/wp-json/sasanperfumes/v1/currencies` | 200 JSON on 2026-06-21 | Previously 404 before the live backend exposed the ShapeHive currency alias |
| `/sasanperfumes/v1/product-pages/mimosa-glow` | 404 | Product page CPT record not found for that slug |
| `/sasanperfumes/v1/guides/art-of-perfumery-crafting-memorable-scent-experiences` | 404 | That slug is a blog slug, not a guide slug |

## Frontend Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_WC_API_URL=https://cms.sasanperfumes.com
NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL=https://cms.sasanperfumes.com/graphql
NEXT_PUBLIC_SITE_URL=https://store.sasanperfumes.com

WC_CONSUMER_KEY=ck_xxx
WC_CONSUMER_SECRET=cs_xxx

TABBY_SECRET_KEY=xxx
TABBY_MERCHANT_CODE=xxx

TAMARA_API_TOKEN=xxx
NEXT_PUBLIC_TAMARA_PUBLIC_KEY=xxx
NEXT_PUBLIC_TAMARA_COUNTRY=AE

OMNISEND_API_KEY=xxx
NEXT_PUBLIC_OMNISEND_BRAND_ID=xxx
```

Without private credentials, public APIs work but authenticated/payment routes return expected configuration errors.

## Testing API Responses

From PowerShell:

```powershell
Invoke-WebRequest -Uri "https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/home-settings" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/api/debug-backend" -UseBasicParsing
```

Expected response format:

```json
{
  "success": true
}
```

or a route-specific JSON object/array.

Error responses should also be JSON:

```json
{
  "success": false,
  "error": {
    "code": "missing_api_key",
    "message": "Stripe secret key is missing"
  }
}
```

## Deployment Checklist

Before uploading plugin changes:

1. Check PHP syntax on edited files:

```powershell
php -l wordpress/sasanperfumes-frontend-settings/sasanperfumes-frontend-settings.php
php -l wordpress/sasanperfumes-frontend-settings/includes/class-sasanperfumes-settings.php
```

2. Upload changed files to:

```text
wp-content/plugins/sasanperfumes-frontend-settings/
```

3. In WP Admin, confirm the plugin is active.
4. Clear any WordPress/server cache.
5. Check the REST route directly.
6. Rebuild/redeploy the Next.js frontend if the changed data is statically cached.

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| REST route returns 404 | Plugin file not uploaded, module not loaded, namespace mismatch | Check live plugin files and `register_rest_route()` |
| REST route returns HTML | Firewall/WAF/cache blocking `/wp-json` | Bypass cache/WAF for `/wp-json/*` |
| Upload buttons do not work | `admin.js` or Media Library failed to load | Check `window.__sasanperfumesAdminLoaded`, browser console, rate limit |
| Frontend still shows old data | Next.js ISR/build cache | Rebuild frontend or wait for revalidation |
| WooCommerce authenticated route returns 401 | Missing/invalid `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET` | Add valid read/write keys to `.env.local` and deployment env |
| Payment route returns missing key | Missing payment env variable | Add provider secret key/token |
| Product images fail | Hotlink/CORS/security rule | Allow frontend and Next image optimizer to access CMS uploads |
