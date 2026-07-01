---
name: testing-app
description: General app testing patterns for Sasan Perfumes — SEO metadata, HTML entity handling, product page verification, cart price normalization, multi-market verification. Use when verifying product detail pages, SEO changes, hero slider content, cart/checkout pricing, or multi-market content isolation.
---

# Testing Sasan Perfumes Application

## Prerequisites

- Dev server running: `npm run dev -p 3001` (runs on http://localhost:3001)
- Or production build: `npx next build --webpack && npx next start -p 3001`
- No additional backend setup needed — the app fetches from the live WooCommerce API

**CRITICAL BUILD NOTE**: Do NOT use `npm run build` — it invokes `build-preserve-chunks.js` which restores old webpack chunks, causing stale page renders. Always use `npx next build --webpack` directly. If pages render old designs despite correct source code, this is likely the cause.

**DEV SERVER FOR TESTING**: When testing frontend changes that depend on live API data (e.g., CMS content), use the dev server (`npm run dev -p 3001`) which renders fresh per-request. The production build caches API responses at build time.

## CMS Field Name Convention

The WordPress `/SasanPerfumes/v1/pages/{slug}` API returns repeater fields with page-specific prefixes:

| Page | Frontend accesses | API returns |
|------|-------------------|-------------|
| Shipping | `wp?.shipping_sections`, `wp?.shipping_rates` | `shipping_sections`, `shipping_rates` |
| Returns | `wp?.returns_features`, `wp?.returns_steps`, `wp?.returns_eligible`, `wp?.returns_not_eligible` | `returns_features`, `returns_steps`, `returns_eligible`, `returns_not_eligible` |
| Privacy | `wp?.privacy_sections` | `privacy_sections` |
| Terms | `wp?.terms_sections` | `terms_sections` |
| Contact | `wp?.contact_info`, `wp?.contact_social` | `contact_info`, `contact_social` |
| FAQ | `wp?.faq_items` | `faq_items` |

**Pattern**: Repeater fields are prefixed with `{page_slug}_` in the API response. When adding new CMS pages, always check the API response first:
```bash
curl -s https://cms.sasanperfumes.com/wp-json/SasanPerfumes/v1/pages/{slug} | python3 -c "import sys,json; print(list(json.load(sys.stdin).keys()))"
```

## Test Product URLs

Useful products covering different scenarios:

| Scenario | EN URL | What to verify |
|----------|--------|----------------|
| Simple product (Flower Scents) | `/en/product/mimosa-glow` | Default test product, 220 AED, Flower Scents category |
| Product with `&` in category | `/en/product/secret-leather-hair-body-mist` | `&` renders correctly, not `&amp;` |
| Gift set (no olfactory family) | `/en/product/sasanperfumes-ramadan-box` | Fallback title without olfactory family |
| Smart quotes in description | `/en/product/the-ultimate-fragrance-collection` | Apostrophes render as `'` not `&#8217;` |
| Arabic locale | `/ar/product/mimosa-glow` | Arabic product name, correct RTL layout |
| Variable product (23 vars) | `/en/product/the-cashmere-neck-square` | Variation selection, stock logic, price updates |
| Product with reviews | `/en/product/velvet-amber-all-over-spray` | 3 reviews with Gravatar avatars (production only) |
| Simple product (no variations) | `/en/product/dark-musk-all-over-spray` | Add to cart without variation selection |

**Note:** `dark-musk-perfume` slug may not exist. Use `mimosa-glow` as default.

Other known working slugs: `orange-blossom`, `pure-jasmine`, `scarlet-rose`, `silky-violet`, `timeless-sakura`, `tuberose-bloom`, `velvet-topaz`

## Verifying Spacing/Margin Consistency

When testing CSS class changes (margin/padding normalization), use code-level verification as the primary test method since Tailwind utilities have deterministic pixel values:

### Expected Page Container Padding Pattern
All page-level containers should use:
- Mobile: `px-4` (16px) or `px-5` (20px)
- Tablet (>=768px): `md:px-7` (28px / 1.75rem)
- Desktop (>=1024px): `lg:px-12` (48px / 3rem)

### Verification Commands
```bash
# Check all files use consistent padding pattern
grep -rn 'px-4.*md:px-7.*lg:px-12\|px-5.*md:px-7.*lg:px-12' src/

# Check for OLD inconsistent values at page level (should return 0 matches in page files)
grep -rn '\bmd:px-5\b\|\bmd:px-6\b\|\blg:px-8\b\|\blg:px-10\b' src/app/

# Verify page-flush class on all page wrappers
grep -rn 'page-flush' src/app/
```

### page-flush Class
The `page-flush` class prevents double margins. The global CSS rule at `globals.css:156` applies `margin-inline` and `width: calc(100% - var(--page-container-margin)*2)` to direct `<main>` children. Pages with `page-flush` class are excluded from this rule and manage their own padding.

**Required on**: homepage, shop, category, cart, new-products, featured-products, product detail page wrappers.

### Component-Internal Padding (NOT page-level)
`px-1`, `px-2`, `px-3` inside badges, buttons, pills, form inputs, and overlay elements are CORRECT and should NOT be normalized to `px-4`. Only page-level containers need the standard pattern.

### Product Detail Section Spacing
- NO `space-y-8` on main container (creates uneven gaps)
- Reviews section: `mt-10 border-t border-brand-border/50 pt-8`
- Upsell products: `mt-10 pt-2`
- Related products wrapper: `mt-10 pb-6 md:pb-8`

## Verifying SEO Metadata

Browser console method:
```js
console.log('TITLE:', document.title)
console.log('DESC:', document.querySelector('meta[name="description"]')?.content)
```

## Verifying Entity Decoding (charCodeAt method)

The most reliable way to check for invisible backslash or entity issues is charCodeAt:
```js
// Find the hero subtitle and check characters around apostrophe
const heroSection = document.querySelector('main section');
const ps = heroSection.querySelectorAll('p');
for (const p of ps) {
  if (p.textContent.includes('good for you')) {
    const t = p.textContent;
    const idx = t.indexOf('that');
    for (let i = idx; i < idx + 10 && i < t.length; i++) {
      console.log(`[${i}] '${t[i]}' (${t.charCodeAt(i)})`);
    }
    console.log('Contains backslash:', t.includes('\\'));
    console.log('Contains raw entity:', t.includes('&#'));
    break;
  }
}
```
**Expected**: Position after "that" should be `''' (39)` (apostrophe), NOT `'\' (92)` (backslash).

## Verifying Cart Prices (NaN check)

Store API returns prices as strings in minor units (e.g., "20000" = 200.00 AED). The `SuggestedProducts` component normalizes these. To verify:
```js
// On /en/cart or /ar/cart, check for NaN in suggested products
console.log('Contains NaN:', document.body.textContent.includes('NaN'));
```
**Expected**: `false`. If `true`, the `normalizeProduct()` function in `SuggestedProducts.tsx` may have a price parsing issue.

## Verifying Topbar Placeholder Interpolation

The topbar text may contain `{{amount}}` and `{{currency}}` templates. To verify:
```js
console.log('Has unresolved placeholders:', document.querySelector('header').textContent.includes('{{'));
```
**Expected**: `false`. The `Header.tsx` component interpolates these with `freeShippingThreshold` and currency values.

## Verifying Variation Stock API

```js
// Check that stock_quantity is null (not copied from low_stock_remaining)
fetch('/api/product-variations?product_id=10345')
  .then(r => r.json())
  .then(data => {
    const allNull = data.every(v => v.stock_quantity === null);
    console.log('All stock_quantity null:', allNull);
    console.log('OOS count:', data.filter(v => v.stock_status === 'outofstock').length);
  });
```
**Expected**: `stock_quantity` is `null` for all variations. `low_stock_remaining` is a separate field used for "Only X left" badges.

## Verifying CMS-Driven Pages via curl

When browser rate limiting blocks visual testing, use curl to verify page content:
```bash
# Verify page loads and contains expected content
curl -s http://localhost:3001/en/shipping | grep -o 'Order Processing'
curl -s http://localhost:3001/en/returns | grep -o '14-Day Return Window'
curl -s http://localhost:3001/en/privacy | grep -o 'Information We Collect'
curl -s http://localhost:3001/en/terms-and-conditions | grep -o 'General Terms'
curl -s http://localhost:3001/en/faq | grep -o 'What is ShapeHive'
curl -s http://localhost:3001/en/contact | grep -o 'Visit Us'

# Verify no double locale prefix in CTA links
curl -s http://localhost:3001/en/services | grep -o '/en/en/contact'  # Should return nothing
curl -s http://localhost:3001/en/services | grep -o '/en/contact'   # Should match

# Verify disabled page returns 404 content
curl -s http://localhost:3001/en/size-guide | grep -o 'drifted away'
```

## Verifying REST API Content Directly

```bash
# Feature toggles
curl -s https://cms.sasanperfumes.com/wp-json/SasanPerfumes/v1/feature-toggles | python3 -m json.tool

# Homepage blog section check (both toggles must be true)
curl -s https://cms.sasanperfumes.com/wp-json/SasanPerfumes/v1/feature-toggles | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('blog:', d.get('sasanperfumes_blog_enabled'), 'home_blog:', d.get('sasanperfumes_home_blog_enabled'))"

# Private labeling content
curl -s https://cms.sasanperfumes.com/wp-json/SasanPerfumes/v1/private-labeling | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys())[:10])"

# Brands API (used by mega menu)
curl -s http://localhost:3001/api/brands | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'brands')"

# Arabic products verification
curl -s 'https://cms.sasanperfumes.com/wp-json/wc/store/v1/products?per_page=30&lang=ar' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} Arabic products'); [print(f'  - {p[\"name\"]}') for p in d[:5]]"

# Our Story stats check
curl -s https://cms.sasanperfumes.com/wp-json/SasanPerfumes/v1/home-sections | \
  python3 -c "import sys,json; d=json.load(sys.stdin); stats=d.get('ourStory',{}).get('stats',[]); [print(f'{s[\"value\"]} - {s[\"label\"][\"en\"]}') for s in stats]"
```

## Verifying Reviews Toggle

```python
# Check if reviews are hidden (toggle OFF)
python3 -c "
import urllib.request
html = urllib.request.urlopen('http://localhost:3001/en/product/mimosa-glow').read().decode()
print('Has reviews div:', 'id=\"reviews\"' in html)
print('Has Write a Review:', 'Write a Review' in html)
if 'reviewsEnabled' in html:
    idx = html.index('reviewsEnabled')
    print('RSC payload:', html[idx:idx+30])
"
```

## Verifying Homepage Blog Section

```python
# Check if blog section is rendered on homepage
python3 -c "
import urllib.request
html = urllib.request.urlopen('http://localhost:3001/en/').read().decode()
print('Has blog section:', 'From Our Blog' in html)
"
```

## Verifying Our Story Stats

```bash
# Check stats render in homepage HTML
curl -s http://localhost:3001/en | grep -o '24+'
curl -s http://localhost:3001/en | grep -o 'Premium Products\|Exclusive Collections\|Authentic Fragrances'
curl -s http://localhost:3001/en | grep -o 'grid-cols-3 gap-4'
```
**Expected**: All three grep commands return matches. If stats are missing, check that the API returns `ourStory.stats` array.

**GSAP Animation Note**: The Our Story section uses GSAP scroll-triggered animations that hide elements (opacity: 0) until scrolled into view. When taking visual screenshots, inject JS to force visibility:
```js
document.querySelectorAll('[data-animate]').forEach(el => {
  el.style.cssText = 'opacity: 1 !important; transform: none !important;';
});
```

## When CMS is Down (Fallback Testing)

If `cms.sasanperfumes.com` is unreachable (timeout), pages cannot render server-side. In this case:
- **Code-level verification IS valid** for pure CSS class changes (Tailwind utilities have deterministic pixel values)
- `npx tsc --noEmit` verifies TypeScript compilation
- `npx eslint src/` verifies lint passes
- `next build --webpack` will compile but may hang during "Collecting page data" phase
- Visual testing must wait until CMS comes back online
- The local dev server will hang on page loads waiting for API responses

**Hostinger Resource Limits**: The CMS may go down due to Hostinger Cloud Professional plan resource limits. Signs:
- All curl requests to `cms.sasanperfumes.com` timeout
- `sasanperfumes.com` returns 000 (connection timeout)
- Local dev server pages hang indefinitely

## Devin Secrets Needed

- `HOSTINGER_SSH_PASSWORD`: For SSH access to staging server (WP-CLI, deployment)
- `WP_ADMIN_PASSWORD`: WordPress admin credentials for CMS backend (username: shapehive_admin_9284)

## Comprehensive Multi-Market SEO Verification

When testing SEO across all 4 markets (International, QA, OM, SA) in both EN and AR, use this browser console snippet on each page:

```js
const results = {
  title: document.title,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  ogType: document.querySelector('meta[property="og:type"]')?.content,
  ogUrl: document.querySelector('meta[property="og:url"]')?.content,
  twitterCard: document.querySelector('meta[name="twitter:card"]')?.content,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  hreflangEn: document.querySelector('link[hreflang="en"]')?.href,
  hreflangAr: document.querySelector('link[hreflang="ar"]')?.href,
  hreflangDefault: document.querySelector('link[hreflang="x-default"]')?.href,
  priceAmount: document.querySelector('meta[name="product:price:amount"]')?.content,
  priceCurrency: document.querySelector('meta[name="product:price:currency"]')?.content,
  dir: document.documentElement.getAttribute('dir'),
  lang: document.documentElement.getAttribute('lang'),
};
console.log(JSON.stringify(results, null, 2));
```

### Expected Canonical Patterns
| Market | EN Canonical | AR Canonical |
|--------|-------------|-------------|
| International | `sasanperfumes.com/en` | `sasanperfumes.com/ar` |
| Qatar | `sasanperfumes.com/qa/en` | `sasanperfumes.com/qa/ar` |
| Saudi Arabia | `sasanperfumes.com/sa/en` | `sasanperfumes.com/sa/ar` |
| Oman | `sasanperfumes.com/om/en` | `sasanperfumes.com/om/ar` |

**Key check**: Content pages (FAQ, About, etc.) on sub-markets must include the market prefix in their canonical. E.g., `/sa/en/faq` canonical must be `sasanperfumes.com/sa/en/faq`, NOT `sasanperfumes.com/en/faq`. This was fixed in PR #25 by passing `marketCode` to `generateSeoMetadata` on all 26+ pages.

### Product Price OG Tags
Product pages should render `product:price:amount` and `product:price:currency` as `<meta name="...">` tags (via `metadata.other`), NOT as `<meta property="...">` (Next.js silently drops unknown OG namespace properties). Verify with:
```js
document.querySelector('meta[name="product:price:amount"]')?.content  // e.g. "75.00"
document.querySelector('meta[name="product:price:currency"]')?.content  // e.g. "AED"
```

### Arabic RTL Verification
For AR pages, verify:
- `document.documentElement.getAttribute('dir')` === `'rtl'`
- `document.documentElement.getAttribute('lang')` === `'ar'`
- Navigation labels are in Arabic (العطور, بخاخ الجسم, معطر الشعر, عطور العود, مجموعات الهدايا)
- Layout is mirrored (logo on right, cart/icons on left)
- Section headers in Arabic (منتجات جديدة, الأكثر مبيعاً)

## Verifying Market-Specific Content Isolation

Each market (QA, OM, SA) is a separate WordPress subsite. To verify content isolation:

```bash
# Check site names per market
curl -s -H "x-market: intl" "https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/site-settings" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','?'))"
curl -s -H "x-market: qa" "https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/site-settings" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','?'))"
# Expected: "ShapeHive" vs "ShapeHive Qatar"

# Check hero slider per market
curl -s -H "x-market: qa" "https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/home-settings" | python3 -c "import sys,json; d=json.load(sys.stdin); slides=d.get('hero',{}).get('slides',[]); print(f'{len(slides)} slides'); [print(f'  {s.get(\"image\",\"?\")[:100]}') for s in slides]"
```

**Frontend verification** (dev server must be running):
```bash
# Title check — each market should show its own site name
curl -s http://localhost:3003/en | grep -o '<title>[^<]*</title>'       # Expected: <title>ShapeHive</title>
curl -s http://localhost:3003/qa/en | grep -o '<title>[^<]*</title>'   # Expected: <title>ShapeHive Qatar</title>
curl -s http://localhost:3003/sa/en | grep -o '<title>[^<]*</title>'   # Expected: <title>ShapeHive Saudi Arabia</title>
curl -s http://localhost:3003/om/en | grep -o '<title>[^<]*</title>'   # Expected: <title>ShapeHive Oman</title>

# Hero image check — QA should NOT show main site's BUY banner
curl -s http://localhost:3003/qa/en | grep -oP 'src="[^"]*(?:ornate|lantern|BUY|hero)[^"]*"' | head -3
```

**Key architecture**: WordPress API functions accept `frontendHost` parameter explicitly from page components. The `detectMarketFromRequest()` dynamic import of `next/headers` is kept as fallback but may fail on Hostinger production. Always pass `frontendHost` explicitly for reliable market detection.

**Blog IDs**: Main=1, QA=5, OM=6, SA=7

## Verifying Discount Rules Frontend

The discount rules system uses a custom mu-plugin (`shapehive/v1/discount-rules`) on the WordPress backend. The frontend fetches rules via `DiscountRulesProvider` (SSR in layout.tsx) and displays them as badges on product cards and info boxes on product detail pages.

### API Route Verification
```bash
# Main site discount rules
curl -s http://localhost:3000/api/discount-rules | python3 -m json.tool

# Per-market discount rules
curl -s "http://localhost:3000/api/discount-rules?market=qa" | python3 -m json.tool
curl -s "http://localhost:3000/api/discount-rules?market=sa" | python3 -m json.tool
curl -s "http://localhost:3000/api/discount-rules?market=om" | python3 -m json.tool

# Security validation — invalid market should return main site rules
curl -s "http://localhost:3000/api/discount-rules?market=invalid" | python3 -m json.tool
```
**Expected**: Each returns a JSON array with at least 1 rule. Invalid market falls back to main site.

### Backend API Verification
```bash
# Direct backend check (without frontend)
curl -s "https://cms.sasanperfumes.com/wp-json/shapehive/v1/discount-rules"
curl -s -H "X-Market: qa" "https://cms.sasanperfumes.com/wp-json/shapehive/v1/discount-rules"
```

### Visual Verification — Badges on Product Cards
```js
// In browser console on /en/shop
const articles = document.querySelectorAll('article');
let badgeCount = 0;
articles.forEach(art => {
  const spans = art.querySelectorAll('span');
  spans.forEach(s => {
    if (s.textContent.includes('Buy 6') || s.textContent.includes('Get 1 Free')) badgeCount++;
  });
});
console.log('Badge count:', badgeCount); // Should be > 0 if rules apply to "all"
```

### Visual Verification — DiscountInfo on Product Detail
Navigate to any product page (e.g. `/en/product/1957`). Look for a green-bordered box below the price section containing the discount title and description.

### Critical: CMS URL Must Match
The discount rules mu-plugin must be deployed to the same CMS domain that `.env.local` points to (`NEXT_PUBLIC_WC_API_URL`). If the mu-plugin is missing, the API will return 404 and badges won't render. Verify:
```bash
# Confirm the discount-rules endpoint is reachable
curl -s "https://cms.sasanperfumes.com/wp-json/shapehive/v1/discount-rules" | head -1
# Should return JSON array of rules, not 404 or empty
```

### Sub-site Backend 500 Errors
The `sasanperfumes/v1/*` REST endpoints may return 500 for sub-site markets (QA/OM/SA). This is a pre-existing backend configuration issue. The `shapehive/v1/discount-rules` endpoint typically works independently of the main plugin endpoints.

## Known Issues

- **Hostinger Rate Limiting**: The server rate-limits at ~10 requests per 5 minutes by default. Fix applied: `.htaccess` has `WordPressProtect throttle, 500`. If you get HTTP 429 errors, wait or use API endpoints directly.
- **GSAP Animations**: Elements with `data-animate` attribute start with `opacity: 0` — inject CSS to override when taking screenshots.
- **Build Cache**: `npm run build` uses `build-preserve-chunks.js` which can serve stale content. Always verify with dev server or use `npx next build --webpack`.
- **CMS URL**: The backend API URL is now `https://cms.sasanperfumes.com`. Check `.env.local` for the correct URL. The `NEXT_PUBLIC_SITE_URL` should be `https://sasanperfumes.com` in production (canonical URLs are generated from this).
- **Production build error page**: The production build (`npx next start`) may show "Something went wrong" if API calls fail at build time. Use dev server (`npm run dev`) for testing that requires fresh API calls.
- **Dynamic import of next/headers**: The `detectMarketFromRequest()` function uses `await import("next/headers")` which works locally but may fail silently on Hostinger. WordPress API functions should always receive `frontendHost` explicitly from page components rather than relying on this fallback.
- **Production unreachable from Devin VM**: `sasanperfumes.com` may return HTTP 000 (connection timeout) from the Devin VM due to firewall/DNS restrictions. Use the local dev server (`npm run dev -p 3001`) which connects to the live CMS backend for testing.
- **Canonical domain**: Both `.env.local` and production should use `NEXT_PUBLIC_SITE_URL=https://sasanperfumes.com`. Canonicals will show `sasanperfumes.com` in both environments.
- **Cache headers in dev mode**: Next.js dev server overrides all cache headers to `no-store, no-cache`. Cache headers added via `next.config.ts` can only be verified in production build mode. Code review is valid verification for cache config.
- **instrumentation.ts Edge Runtime warnings**: The dev server shows warnings about `process.cwd`, `node:fs`, and `node:path` being used in Edge Runtime. These are non-blocking warnings and don't affect functionality.
- **ar.json BOM issue**: `src/i18n/dictionaries/ar.json` may have a UTF-8 BOM (`ef bb bf`) at the start of the file, which causes Turbopack to fail with "Unable to make a module from invalid JSON". Fix with `sed -i '1s/^\xEF\xBB\xBF//' src/i18n/dictionaries/ar.json`. This is a pre-existing issue unrelated to any specific PR.
