# Sasan Perfumes Site Documentation

Sasan Perfumes is a headless ecommerce storefront. The frontend is a Next.js app. A single WordPress + WooCommerce backend (`cms.shapehive.com`) serves all market frontends.

## Project Summary

| Item | Value |
|---|---|
| Project | Sasan Perfumes |
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | WordPress, WooCommerce, CoCart, WPGraphQL, custom plugin |
| Production storefront(s) | `https://shapehive.com`, `https://shapehive.com/en`, `https://shapehive.com/ar`, `https://shapehive.com/qa/en`, `https://shapehive.com/qa/ar`, `https://shapehive.com/om/en`, `https://shapehive.com/om/ar`, `https://shapehive.com/sa/en`, `https://shapehive.com/sa/ar` |
| CMS/API | `https://cms.shapehive.com` |
| WordPress REST base | `https://cms.shapehive.com/wp-json` |
| Custom REST namespace | `sasanperfumes/v1` |
| Local plugin source | `wordpress/sasanperfumes-frontend-settings/` |
| Local wp-content reference | `fnf_wp_contents/` |

The API namespace intentionally remains `sasanperfumes/v1` for compatibility.

## Architecture

```text
Browser
  -> Next.js frontend
  -> Next.js /api/* proxy routes
  -> Market router (host/prefix aware)
  -> WordPress REST API / WooCommerce Store API / CoCart / WPGraphQL
  -> WordPress MySQL database
```

Primary data flow:

1. Public pages fetch CMS, products, SEO, and settings from WordPress APIs.
2. Client actions use same-origin Next.js `/api/*` routes.
3. Products/categories use WooCommerce Store API and WPGraphQL.
4. Cart uses CoCart.
5. Market context is inferred from the request host/prefix and passed to backend selectors so each market gets isolated pages, products, and SEO.
6. Orders, customers, coupons, and shipping use WooCommerce REST APIs where credentials are needed.
7. Payments use Stripe, Tabby, and Tamara server-side API routes.

## Tech Stack

Frontend:

| Package | Purpose |
|---|---|
| `next` | App Router, Server Components, API routes, ISR |
| `react` / `react-dom` | UI |
| `typescript` | Type safety |
| `tailwindcss` | Styling |
| `next-intl` | English/Arabic routing and dictionaries |
| `@apollo/client` / `graphql` | WPGraphQL queries |
| `swr` | Client-side data fetching |
| `cookies-next` | Cart/auth cookies |
| `swiper` | Sliders |
| `lucide-react` | Icons |
| `@mui/material` | Select/UI widgets |

Backend:

| System | Purpose |
|---|---|
| WordPress | CMS/admin/database |
| WooCommerce | Products, orders, payments, customers |
| CoCart | Headless cart and auth helpers |
| WPGraphQL | Product/page GraphQL data |
| WPML | Multilingual backend content |
| Custom plugin | Admin settings, custom REST APIs, forms, feature toggles |

## Repository Structure

```text
public/
  images/
  fonts/
  plugins/

src/
  app/
    [locale]/
      (pages)/
      (shop)/
      account/
      login/
      register/
      wishlist/
      compare/
      order-confirmation/
    api/
    image-sitemap.xml/
    llms.txt/
    llms-full.txt/
  components/
    account/
    auth/
    bundle-manager/
    cart/
    checkout/
    common/
    layout/
    payment/
    sections/
    seo/
    shop/
    tracking/
  config/
    site.ts
    menu.ts
    theme.ts
  contexts/
  data/
  hooks/
  i18n/
  lib/
    api/
    graphql/
    security/
    utils/
  types/

wordpress/
  sasanperfumes-frontend-settings/
    sasanperfumes-frontend-settings.php
    admin.js
    includes/
    woocommerce/

fnf_wp_contents/
  Local ignored wp-content mirror for backend reference only.
```

## Configuration

Main app configuration:

```text
src/config/site.ts
```

The backend URL is read from:

```ts
process.env.NEXT_PUBLIC_WC_API_URL
```

Fallback:

```text
https://cms.shapehive.com
```

Required local environment file:

```text
.env.local
```

Common values for shared CMS multi-market setup:

```env
NEXT_PUBLIC_WC_API_URL=https://cms.shapehive.com
NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL=https://cms.shapehive.com/graphql
NEXT_PUBLIC_SITE_URL=https://shapehive.com
NEXT_PUBLIC_CANONICAL_HOST=https://shapehive.com
NEXT_PUBLIC_CANONICAL_HOSTS=shapehive.com
NEXT_PUBLIC_ALLOWED_HOSTS=localhost,127.0.0.1,::1,shapehive.com,cms.shapehive.com,localhost:3000,localhost:3001
```

Market entry URLs:

```text
https://shapehive.com/
https://shapehive.com/qa
https://shapehive.com/om
https://shapehive.com/sa
```

CMS content/admin market sites:

```text
https://cms.shapehive.com/wp-admin
https://cms.shapehive.com/qa/wp-admin
https://cms.shapehive.com/om/wp-admin
https://cms.shapehive.com/sa/wp-admin
```

The frontend keeps public markets on path URLs and reads CMS data from matching CMS paths, for example `https://cms.shapehive.com/qa/wp-json` for Qatar.

Private server-side credentials:

```env
WC_CONSUMER_KEY=ck_xxx
WC_CONSUMER_SECRET=cs_xxx
STRIPE_SECRET_KEY=sk_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
TABBY_SECRET_KEY=xxx
TABBY_MERCHANT_CODE=xxx
TAMARA_API_TOKEN=xxx
OMNISEND_API_KEY=xxx
```

## Local Development

Install dependencies:

```powershell
npm install
```

Run development server:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000/en
```

Build:

```powershell
npx next build --webpack
```

The project has a custom `npm run build` script:

```text
scripts/build-preserve-chunks.js
```

For accurate production verification, prefer:

```powershell
npx next build --webpack
```

## Routing

Market routing:

 - Legacy market subdomain hosts are retired.
 - Market prefixes are optional; supported prefixes: `qa`, `om`, `sa`.
- URL pattern is `/{market}/{locale}/...` (for market routes) or `/{locale}/...` for default intl.
- Market is resolved by the first path segment (`/qa`, `/om`, `/sa`) under `shapehive.com`.
- Example: `https://shapehive.com/qa/en/product/{market-product-slug}`.

Locale routing:

| Route | Purpose |
|---|---|
| `/en` | English homepage |
| `/ar` | Arabic homepage |
| `/en/shop` | Shop listing |
| `/en/product/{slug}` | Product detail |
| `/en/category/{slug}` | Category listing |
| `/en/cart` | Cart |
| `/en/checkout` | Checkout |
| `/en/account` | Account dashboard |
| `/en/wishlist` | Wishlist |
| `/en/search?q=...` | Search |
| `/en/brands` | Brands listing |
| `/en/brands/{slug}` | Brand detail |
| `/en/services` | Services listing |
| `/en/services/{slug}` | Service detail |
| `/en/private-labeling` | Private Labeling |
| `/en/what-we-do` | What We Do |
| `/en/blog` | Blog listing |
| `/en/blog/{slug}` | Blog detail |
| `/en/contact` | Contact |
| `/en/about` | About |
| `/en/faq` | FAQ |
| `/en/shipping` | Shipping |
| `/en/returns` | Returns |
| `/en/privacy` | Privacy |
| `/en/terms-and-conditions` | Terms |
| `/en/store-locator` | Store locator |

Arabic uses the same paths under `/ar`.

Market examples:

- Qatar: `/qa/en`, `/qa/ar`
- Oman: `/om/en/shop`
- Saudi Arabia: `/sa/en/product/{slug}`

## Internationalization

Supported locales:

```text
en
ar
```

Files:

```text
src/i18n/dictionaries/en.json
src/i18n/dictionaries/ar.json
src/i18n/index.ts
```

Arabic pages use RTL from locale layout. CMS API responses often return bilingual fields:

```json
{
  "title": {
    "en": "Title",
    "ar": "Arabic title"
  }
}
```

Helpers in `src/lib/api/wordpress.ts` pick the correct locale.

## Frontend API Clients

| File | Purpose |
|---|---|
| `src/lib/api/wordpress.ts` | WordPress custom REST APIs, static pages, settings, brands, services, blog |
| `src/lib/api/woocommerce.ts` | WooCommerce Store API products/categories |
| `src/lib/api/cocart.ts` | CoCart cart operations |
| `src/lib/api/auth.ts` | Login/register/token flows |
| `src/lib/api/customer.ts` | Customer profile |
| `src/lib/api/wishlist.ts` | Wishlist API |
| `src/lib/api/wcpa.ts` | Product addons |
| `src/lib/utils/backendFetch.ts` | Shared backend headers, no-cache URL, safe JSON parser |

## Next.js API Routes

Next.js routes live under:

```text
src/app/api/
```

They proxy backend calls, keep private credentials server-side, normalize error responses, and avoid browser CORS problems.

Route groups:

| Route | Purpose |
|---|---|
| `/api/health` | Health check |
| `/api/debug-backend` | Backend connectivity diagnostics |
| `/api/products` | Product listing proxy |
| `/api/product-categories` | Product categories |
| `/api/product-variations` | Variation data |
| `/api/variation-images` | Variation images |
| `/api/cart` | CoCart cart operations |
| `/api/wishlist` | Wishlist |
| `/api/auth/login` | Login |
| `/api/auth/google` | Google sign-in |
| `/api/auth/verify` | Verify token |
| `/api/auth/renew` | Renew token |
| `/api/auth/forgot-password` | Forgot password |
| `/api/auth/reset-password` | Reset password |
| `/api/customer` | Customer CRUD |
| `/api/customer/check-email` | Email lookup |
| `/api/orders` | Orders |
| `/api/orders/cancel` | Cancel order |
| `/api/orders/notes` | Order notes |
| `/api/coupons` | Coupons |
| `/api/coupons/validate` | Validate coupon |
| `/api/shipping` | Shipping rates/methods |
| `/api/shipping-countries` | Shipping countries |
| `/api/payment-gateways` | Payment gateway list |
| `/api/tabby/*` | Tabby payment APIs |
| `/api/tamara/*` | Tamara payment APIs |
| `/api/contact` | Contact form |
| `/api/newsletter` | Newsletter signup |
| `/api/private-labeling` | Private Labeling form |
| `/api/free-gifts` | Free gift rules |
| `/api/bundles` | Bundle builder |
| `/api/bundle-slugs` | Bundle-enabled product slugs |
| `/api/brands` | Brand list |
| `/api/brands-slider` | Homepage brands slider |
| `/api/scent-guide` | Scent guide |
| `/api/clothing-size-guide` | Clothing/size guide |
| `/api/gift-wrap` | Gift wrap settings |
| `/api/live-chat` | Live chat settings |
| `/api/popup` | Popup settings |
| `/api/abandoned-cart-popup` | Abandoned cart popup |
| `/api/product-detail-settings` | Product detail settings |
| `/api/loyalty` | Loyalty |
| `/api/referral` | Referral |
| `/api/stock-alerts` | Stock alerts |
| `/api/currencies` | Currency list |
| `/api/omnisend/cart` | Omnisend cart sync |
| `/api/upload` | Upload proxy |
| `/api/revalidate` | Cache revalidation |
| `/api/csrf` | CSRF token |

## WordPress Plugin

Local source:

```text
wordpress/sasanperfumes-frontend-settings/
```

Live target:

```text
wp-content/plugins/sasanperfumes-frontend-settings/
```

The plugin provides:

1. WP Admin settings pages.
2. Custom CPTs/metaboxes.
3. Product brand taxonomy fields.
4. REST APIs under `sasanperfumes/v1`.
5. REST APIs under `sasanperfumes-bundles/v1` and `sasanperfumes-free-gifts/v1`.
6. WooCommerce email templates.
7. Admin JavaScript for media upload/repeaters.

The local folder `fnf_wp_contents/` is ignored by Git and is only for reference. Backend changes should be made in `wordpress/sasanperfumes-frontend-settings/`.

## WordPress REST API Reference

Base:

```text
https://cms.shapehive.com/wp-json
```

Core custom endpoints:

| Endpoint | Purpose |
|---|---|
| `/sasanperfumes/v1/home-settings` | Homepage hero/products/categories/collections/banners |
| `/sasanperfumes/v1/home-sections` | Homepage extra sections |
| `/sasanperfumes/v1/site-settings` | Site logo/name |
| `/sasanperfumes/v1/header-settings` | Header settings |
| `/sasanperfumes/v1/seo-settings` | SEO/tracking settings |
| `/sasanperfumes/v1/topbar` | Topbar settings |
| `/sasanperfumes/v1/footer-settings` | Footer settings |
| `/sasanperfumes/v1/feature-toggles` | Feature flags |
| `/sasanperfumes/v1/whatsapp` | WhatsApp settings |
| `/sasanperfumes/v1/pages/{slug}` | Static page content |
| `/sasanperfumes/v1/brands` | Brands |
| `/sasanperfumes/v1/brands/{slug}` | Brand detail |
| `/sasanperfumes/v1/brands-page` | Brands page settings |
| `/sasanperfumes/v1/brands-slider` | Homepage brands slider |
| `/sasanperfumes/v1/services` | Services |
| `/sasanperfumes/v1/services/{slug}` | Service detail |
| `/sasanperfumes/v1/services-page` | Services page settings |
| `/sasanperfumes/v1/private-labeling` | Private Labeling page |
| `/sasanperfumes/v1/private-labeling/submit` | Private Labeling form submit |
| `/sasanperfumes/v1/guides` | Guides |
| `/sasanperfumes/v1/guides/{slug}` | Guide detail |
| `/sasanperfumes/v1/product-pages` | Product landing pages |
| `/sasanperfumes/v1/product-pages/{slug}` | Product landing detail |
| `/sasanperfumes/v1/category-seo` | Category SEO list |
| `/sasanperfumes/v1/category-seo/{slug}` | Category SEO |
| `/sasanperfumes/v1/category-subtitle/{slug}` | Category subtitle |
| `/sasanperfumes/v1/product-meta/{slug}` | Product meta description |
| `/sasanperfumes/v1/notes-seo` | Notes SEO list |
| `/sasanperfumes/v1/notes-seo/{slug}` | Notes SEO detail |
| `/sasanperfumes/v1/scent-guide` | Scent guide |
| `/sasanperfumes/v1/size-guide?product_id={id}` | Size guide |
| `/sasanperfumes/v1/product-variation-images?product_id={id}` | Variation images |
| `/sasanperfumes/v1/live-chat` | Live chat |
| `/sasanperfumes/v1/gift-wrap` | Gift wrap |
| `/sasanperfumes/v1/abandoned-cart-popup` | Abandoned cart popup |
| `/sasanperfumes/v1/popup-settings` | Popup settings |
| `/sasanperfumes/v1/product-detail` | Product detail settings |
| `/sasanperfumes/v1/loyalty/settings` | Loyalty settings |
| `/sasanperfumes/v1/referral/settings` | Referral settings |
| `/sasanperfumes/v1/stock-alerts` | Stock alert create/delete |
| `/sasanperfumes/v1/stock-alerts/check` | Stock alert lookup |
| `/sasanperfumes-free-gifts/v1/rules` | Free gift rules |
| `/sasanperfumes-bundles/v1` | Bundle data |
| `/sasanperfumes-bundles/v1/config` | Bundle config |
| `/sasanperfumes-bundles/v1/enabled-products` | Bundle product slugs |

WooCommerce/WordPress endpoints:

| Endpoint | Purpose |
|---|---|
| `/wc/store/v1/products` | Product listing |
| `/wc/store/v1/products/categories` | Categories |
| `/wc/store/v1/products/reviews` | Product reviews |
| `/wc/store/v1/cart` | Store API cart |
| `/cocart/v2/cart` | CoCart cart |
| `/cocart/v2/login` | Login |
| `/cocart/jwt/validate-token` | Token validation |
| `/cocart/jwt/refresh-token` | Token refresh |
| `/wp/v2/posts` | Blog posts |
| `/wp/v2/media` | Media |

## API Response Check Summary

Latest local check:

| Area | Result |
|---|---|
| Documented live CMS endpoints | `17/17` returned `200` JSON |
| Local Next public GET routes | Returned JSON |
| Payment routes | Returned JSON errors when env secrets were missing |
| WooCommerce authenticated routes | Returned JSON errors when WC keys were missing |

Known observations:

| Endpoint/route | Status | Note |
|---|---|---|
| `/wp-json/sasanperfumes/v1/mobile-bar` | 200 JSON on 2026-06-21 | Previously 404 before the live backend picked up the route |
| `/wp-json/sasanperfumes/v1/referral/settings` | 200 JSON on 2026-06-21 | Previously 404 before the live backend loaded the referral module |
| `/wp-json/sasanperfumes/v1/currencies` | 200 JSON on 2026-06-21 | Previously 404 before the live backend exposed the ShapeHive currency alias |
| `/api/bundles` POST/PUT empty body | 500 JSON | Should be improved to 400 validation |
| `/api/orders` POST empty body | 500 JSON | Should validate body before reading billing fields |
| `/api/upload` JSON body | 500 JSON | Should return 400 unsupported content type |
| `/api/product-categories?per_page=3` | 200 JSON | Returned `{"categories":{}}`; verify expected shape |

## Authentication

Auth-related cookies and APIs:

| Flow | API |
|---|---|
| Login | `/api/auth/login` -> CoCart login |
| Verify | `/api/auth/verify` -> CoCart JWT validate |
| Renew | `/api/auth/renew` -> CoCart JWT refresh |
| Google sign-in | `/api/auth/google` |
| Forgot password | `/api/auth/forgot-password` |
| Reset password | `/api/auth/reset-password` |

Customer/account data uses WooCommerce customer APIs through Next.js routes.

## Cart

Cart route:

```text
/api/cart
```

Supported actions:

```text
GET /api/cart
POST /api/cart?action=add
POST /api/cart?action=update&item_key={key}
POST /api/cart?action=remove&item_key={key}
POST /api/cart?action=clear
POST /api/cart?action=apply-coupon
POST /api/cart?action=remove-coupon
```

Cart backend:

```text
/wp-json/cocart/v2/cart
```

## Orders

Orders route:

```text
/api/orders
```

Common operations:

| Method | Purpose |
|---|---|
| GET | Fetch order or customer orders |
| POST | Create order |
| PUT | Update order |

Supporting routes:

```text
/api/orders/cancel
/api/orders/notes
```

Order/customer/coupon/shipping APIs need valid WooCommerce REST credentials.

## Payments

Payment integrations are server-side only:

| Provider | Routes | Required env |
|---|---|---|
| Stripe | `/api/stripe/*` | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Tabby | `/api/tabby/*` | `TABBY_SECRET_KEY`, `TABBY_MERCHANT_CODE` |
| Tamara | `/api/tamara/*` | `TAMARA_API_TOKEN`, `NEXT_PUBLIC_TAMARA_PUBLIC_KEY`, `NEXT_PUBLIC_TAMARA_COUNTRY` |

Expected missing-config response:

```json
{
  "success": false,
  "error": {
    "code": "missing_api_key",
    "message": "..."
  }
}
```

## Forms And Tracking

Forms:

| Route | Purpose |
|---|---|
| `/api/contact` | Contact form |
| `/api/newsletter` | Newsletter signup |
| `/api/private-labeling` | Private labeling inquiry |
| `/api/stock-alerts` | Back-in-stock alert |

Tracking:

| Component/util | Purpose |
|---|---|
| `src/components/tracking/GoogleAnalytics.tsx` | GA |
| `src/components/tracking/GoogleTagManager.tsx` | GTM |
| `src/components/tracking/FacebookPixel.tsx` | Meta Pixel |
| `src/components/tracking/TikTokPixel.tsx` | TikTok |
| `src/components/tracking/SnapchatPixel.tsx` | Snapchat |
| `src/components/tracking/OmnisendTracking.tsx` | Omnisend |
| `src/lib/utils/fbpixel.ts` | Meta event helper |
| `src/lib/utils/omnisend.ts` | Omnisend helper |

## SEO

SEO sources:

1. `src/config/site.ts` defaults.
2. WordPress `/sasanperfumes/v1/seo-settings`.
3. Page-specific metadata from CMS endpoints.
4. Product metadata from WooCommerce and `/sasanperfumes/v1/product-meta/{slug}`.
5. Category metadata from `/sasanperfumes/v1/category-seo/{slug}`.
6. JSON-LD components in `src/components/seo/`.

Routes:

| File | Purpose |
|---|---|
| `src/app/sitemap.ts` | Sitemap |
| `src/app/robots.ts` | Robots |
| `src/app/image-sitemap.xml/route.ts` | Image sitemap |
| `src/app/llms.txt/route.ts` | LLM summary |
| `src/app/llms-full.txt/route.ts` | Full LLM content |

## Build And Deployment

Frontend:

```powershell
npx next build --webpack
```

Run production build locally:

```powershell
npx next start -p 3000
```

Backend plugin deployment:

1. Edit local plugin source under `wordpress/sasanperfumes-frontend-settings/`.
2. Syntax-check edited PHP files.
3. Upload changed files to `wp-content/plugins/sasanperfumes-frontend-settings/`.
4. Clear WordPress/server cache.
5. Verify REST endpoint.
6. Rebuild frontend if pages are statically cached.

Market setup and content/product separation:

```bash
wp eval-file scripts/setup-multisite-network.php
wp eval-file scripts/sync-market-content.php -- --dry-run
wp eval-file scripts/sync-market-content.php -- --markets=qa,om,sa
wp eval-file scripts/retire-legacy-shapehive-sites.php -- --archive
```

Run the sync without `--overwrite` for the first production pass. It creates missing records in each market site while keeping future QA, Oman, and Saudi content/product management separate. Use `--overwrite` only when intentionally refreshing market records from the main CMS.

Market REST verification:

```powershell
Invoke-WebRequest -Uri "https://cms.shapehive.com/qa/wp-json/sasanperfumes/v1/home-settings" -UseBasicParsing
Invoke-WebRequest -Uri "https://cms.shapehive.com/om/wp-json/wc/store/v1/products?per_page=1" -UseBasicParsing
Invoke-WebRequest -Uri "https://cms.shapehive.com/sa/wp-json/wc/store/v1/products?per_page=1" -UseBasicParsing
```

These must return JSON, not an HTML/default page. If they return HTML, flush WordPress permalinks, clear cache/CDN, and confirm the server routes `/qa`, `/om`, and `/sa` to WordPress before relying on separate market content/products.

## Testing

Health:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

Backend diagnostics:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/debug-backend" -UseBasicParsing
```

Live CMS:

```powershell
Invoke-WebRequest -Uri "https://cms.shapehive.com/wp-json/sasanperfumes/v1/home-settings" -UseBasicParsing
```

Recommended page checks:

| Page | URL |
|---|---|
| Homepage | `/en` |
| Shop | `/en/shop` |
| Product | `/en/product/misk-al-shioukhsa` |
| Category | `/en/category/perfumes` |
| Brands | `/en/brands` |
| Services | `/en/services` |
| Private Labeling | `/en/private-labeling` |
| Contact | `/en/contact` |
| Arabic homepage | `/ar` |
| Qatar homepage | `/qa/en` |
| Oman shop | `/om/en/shop` |
| Saudi shop | `/sa/en/shop` |

Product availability is market-specific. Do not reuse a base-market product slug as a cross-market fixture unless the Store API confirms that product exists for the target market.

## Operational Notes

| Topic | Note |
|---|---|
| Rate limiting | Hostinger can rate-limit rapid WP Admin/browser requests. Space manual checks when possible. |
| Admin JS | Plugin inlines `admin.js` as fallback because rate limiting can block script files. |
| ISR cache | Next.js pages can keep old API values until rebuild/revalidation. |
| Backend source | Edit `wordpress/sasanperfumes-frontend-settings/`, not `fnf_wp_contents/`. |
| Git ignore | `fnf_wp_contents/` is ignored because it is a local server mirror. |
| API errors | API routes should return JSON errors, never HTML. |
| Credentials | Payment and WooCommerce secrets must stay server-side only. |

## Troubleshooting

| Symptom | Check |
|---|---|
| Frontend cannot reach CMS | `NEXT_PUBLIC_WC_API_URL`, `/api/debug-backend`, WAF/cache rules |
| Route returns 404 | Plugin file deployed, module included, namespace case, `register_rest_route()` |
| Route returns HTML | Server security/caching layer blocking REST |
| Product images fail | CMS hotlink/CORS/image optimizer remote patterns |
| Admin upload buttons fail | `admin.js`, `wp_enqueue_media()`, browser console |
| Payment route fails | Provider env variables |
| WooCommerce route 401 | `WC_CONSUMER_KEY` and `WC_CONSUMER_SECRET` |
| Toggle changes not visible | Rebuild frontend or wait for ISR |
