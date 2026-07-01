---
name: testing-storefront
description: Test storefront flows end-to-end — shop infinite scroll, product variations, cart/checkout, reviews, Arabic RTL. Use when verifying product page, cart, or checkout changes.
---

# Testing Sasan Perfumes Storefront

## Environment Setup

### Local Dev (Preferred for most tests)
```bash
cd /home/ubuntu/repos/sasanperfumes-front
npm run dev -p 3001
```
- Uses live backend: `https://cms.sasanperfumes.com`
- Dev server renders fresh per-request (best for testing live API data)
- Port 3001 avoids conflicts with dev server on 3000
- Do NOT use `npm run build` — it invokes `build-preserve-chunks.js` which may serve stale content

### Production (For WC-authenticated features)
- URL: `https://sasanperfumes.com`
- Has real WC consumer key/secret — needed for reviews API v3
- Use for testing reviews, any feature requiring WC REST API v3 auth
- Cache-bust with `?t=<tag>` query param to avoid CDN stale content
- **Note**: Production may be unreachable from Devin VM due to firewall/DNS. Use local dev server instead.

### Multi-Market URLs
| Market | EN URL | AR URL |
|--------|--------|--------|
| International | `localhost:3001/en` | `localhost:3001/ar` |
| Qatar | `localhost:3001/qa/en` | `localhost:3001/qa/ar` |
| Saudi Arabia | `localhost:3001/sa/en` | `localhost:3001/sa/ar` |
| Oman | `localhost:3001/om/en` | `localhost:3001/om/ar` |

## Key Test Products

| Product | ID | Slug | Brand | Use For |
|---------|-----|------|-------|--------|
| The Cashmere Neck Square | 10345 | the-cashmere-neck-square | stiletto | Variations (23 vars, 6 sizes, 4+ colors), OOS cross-out |
| Velvet Amber All Over Spray | 9854 | velvet-amber-all-over-spray | ASL | Reviews (3 reviews with Gravatar) |
| Argan Milk Serum | — | argan-milk-serum | ASL | Custom attributes (Skin type), brand slider |
| Dark Musk All Over Spray | — | dark-musk-all-over-spray | ASL | Brand slider verification |

### Known Out-of-Stock Combos (Product 10345)
- XS + Truffle Spot (variation ID: 10347)
- S + Pearl (variation ID: 10350)

## Test Flows

### 1. Shop Infinite Scroll
- Navigate to `/en/shop`
- Scroll down 3-4 times to trigger IntersectionObserver pagination
- Verify: 44+ products load across 3 pages (15/page), no "Something went wrong" error
- Console check: `document.querySelectorAll('article').length` should be > 30
- Known issue: If `loadError` guard is missing, IntersectionObserver retries infinitely on API failure

### 2. Product Variations & OOS Cross-Out
- Navigate to `/en/product/the-cashmere-neck-square`
- Wait ~5s for `/api/product-variations?product_id=10345` to load (23 variations)
- Verify all Size buttons (XS, S, M, L, XL, 2XL) are ENABLED initially
- Verify all Color buttons are ENABLED initially
- **OOS smart cross-out**: Select Size=XS → Truffle Spot should become `disabled="true"` (with line-through + opacity-50 styling). Other colors (Pearl, Garden Floral, Velvet Noir) remain enabled.
- **Add to Cart disabled**: With no valid combo selected, Add to Cart button should be `disabled="true"`
- **In-stock combo**: Select Size=XS, Color=Pearl:
  - Price should update (e.g., 458→840 AED)
  - Loyalty points badge should update
  - Add to Cart should ENABLE
  - Image gallery may switch
- Click Add to Cart → cart badge count should increment

**Smart cross-out logic** (`ProductDetail.tsx`): Uses `smartDisabledOptions()` which checks all variation combos. Only disables options where NO purchasable variation exists for that combination. Uses `stock_status`, `purchasable`, and `backorders` fields.

**API verification:**
```js
// In browser console — check variation attributes are non-empty
fetch('/api/product-variations?product_id=10345')
  .then(r => r.json())
  .then(vars => {
    console.log('COUNT:', vars.length);
    console.log('ATTRS:', vars[0]?.attributes);
    // Should show [{name:"Size",value:"XS"},{name:"Color",value:"Pearl"}]
  });
```

**Known gotcha:** Store API v1 individual variation endpoints return EMPTY attributes. The fix uses parent product's `variations` array with a Map-based lookup to populate attributes.

**Variation attribute slugification:** WooCommerce expects hyphenated attribute slugs in the add-to-cart payload. Custom attributes like "Skin type" must be sent as `attribute_skin-type` (with hyphens), not `attribute_skin type` (with spaces). The fix applies `.replace(/\s+/g, "-")` on attribute keys.

### 3. Argan Milk Serum Variation
- Navigate to `/en/product/argan-milk-serum`
- Select each skin type ("Sensitive skin", "Dry skin", "Oily skin", etc.)
- Click Add to Cart — should succeed with no "No matching variation found" error
- Repeat on `/ar/product/argan-milk-serum` for Arabic locale
- Root cause if broken: attribute keys have spaces instead of hyphens

### 4. Reviews
- **Must test on production** if local `.env.local` has placeholder WC credentials
- Navigate to product with reviews (e.g., `/en/product/velvet-amber-all-over-spray`)
- Scroll to Reviews section
- Verify: reviewer names, star ratings, Gravatar avatars (no broken image icons)
- Console check: `document.querySelectorAll('img[src*="gravatar"]').length` should be > 0
- Verify each avatar has `naturalWidth > 0` (confirms image loaded)
- If WC credentials are placeholders (`ck_your_consumer_key_here`), reviews route tries WC v3 first, gets 401, returns empty — this is a config issue, not a code bug
- **Review images**: If reviews have `_review_images` meta, frontend renders image gallery. Currently no test data with review images exists — mark as UNTESTED if no images in backend.

### 5. Cart Flow & Brand/Category Display
- After adding product with variation, navigate to `/en/cart`
- Verify: product image, title with variation name, attributes ("Size: XS, Color: Pearl"), price, qty controls
- **Brand/Category**: Look for `stiletto/Body` (or similar) text below product name. This uses parent_id lookup.
- Verify: "Parent_id" does NOT appear in the variation attributes display
- Verify: Order Summary shows Subtotal + Shipping = Total
- Verify: Coupon code input is editable
- Verify: "You Might Like" section present with valid AED prices (no NaN)

**Parent_id lookup** (`cart/page.tsx`): Variable products store variation IDs in the cart, but the `product-categories` API returns data keyed by parent product IDs. The `getParentId()` function extracts `Parent_id` from `item.meta.variation` for the lookup. If this is broken, brand/category will be blank for variable products.

### 6. Checkout Flow & Brand/Category Display
- Navigate to `/en/checkout`
- Verify: line items show variation attributes and **brand/category** (`stiletto/Body`)
- Verify: "Parent_id" does NOT appear in variation attributes
- Verify: Loyalty Points section present
- Verify: Coupon is read-only ("Go back to cart to add a coupon")
- Verify: Payment methods load
- Verify: Gift wrapping option available
- Same parent_id lookup as cart (`CheckoutClient.tsx`)

### 6a. Checkout — Registered Email Guest Checkout
- **Email check trigger**: The email check fires on blur (not on type). After typing the email, click on the Phone field or another field to trigger the blur event. Wait 1-2s for the API call.
- **Registered email (e.g. `muhsilv@gmail.com`)**: Should show a **soft info panel** (muted border, beige background `bg-brand-beige/55`) with text "It looks like you have an account with this email. You can log in to track your orders, or continue as a guest."
  - "Log In" button (outline variant) — navigates to `/{marketPrefix}/{locale}/login?redirect=/{marketPrefix}/{locale}/checkout`
  - NO "Use Different Email" button (removed)
  - Place Order button remains ENABLED (not disabled)
  - NO red error banner at top
  - "Create account" checkbox should be HIDDEN (registered users already have an account)
- **New/unregistered email**: No info panel appears. "Create account" checkbox is visible.
- **Console validation script:**
```js
const infoPanel = document.querySelector('.bg-brand-beige\\/55');
const placeOrder = document.querySelector('button[type="submit"]');
const loginBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Log In');
console.log('INFO_PANEL:', infoPanel ? 'PRESENT' : 'ABSENT');
console.log('LOGIN_BTN:', loginBtn ? 'PRESENT' : 'MISSING');
console.log('PLACE_ORDER_ENABLED:', !placeOrder?.disabled);
```
- **Multi-market**: Test on all 4 markets (intl, QA, SA, OM). The Log In button href should include the market prefix (e.g., `/qa/en/login?redirect=%2Fqa%2Fen%2Fcheckout`).
- **Arabic RTL**: On `/ar/checkout`, info panel shows Arabic text ("يبدو أن لديك حسابًا...") and button shows "تسجيل الدخول".

### 6b. Login Page Redirect Validation
- Login page accepts `?redirect=` query param
- **Valid**: `/en/login?redirect=%2Fen%2Fcheckout` — after login, redirects to `/en/checkout`
- **Invalid (external URL)**: `/en/login?redirect=https://evil.com` — `redirectUrl` should be `null`
- **Invalid (protocol-relative)**: `/en/login?redirect=//evil.com` — `redirectUrl` should be `null`
- Validation logic: must start with `/` AND must NOT start with `//`
- Console check: `new URLSearchParams(location.search).get('redirect')` to see raw value

### 7. Arabic RTL
- Navigate to `/ar`
- Verify: `document.documentElement.getAttribute('dir')` === 'rtl'
- Verify: `document.documentElement.getAttribute('lang')` === 'ar'
- Check Arabic navigation labels: العطور, بخاخ الجسم, معطر الشعر, عطور العود, مجموعات الهدايا
- Check section headers: منتجات جديدة (New Products), الأكثر مبيعاً (Bestsellers)
- Layout should be mirrored: logo on right, cart/wishlist icons on left
- Hero slider might show English fallback if AR translations not set in backend
- **Loyalty badge**: Should show Arabic label (e.g., "نقاط عنبر") from backend `label_ar`
- **OOS message**: Should show Arabic message (e.g., "هذا المزيج غير متوفر حالياً")
- **Topbar**: Should show interpolated Arabic text (e.g., "شحن مجاني للطلبات فوق 700 AED")
- **Multi-market AR**: Also test `/qa/ar`, `/sa/ar`, `/om/ar` — each should have RTL layout, market-prefixed canonical, and correct currency (QAR/SAR/OMR)
- **Product price currency**: Verify product OG tags show market-correct currency: intl=AED, qa=QAR, sa=SAR, om=OMR. The backend returns AED for all subsites — frontend uses `market.defaultCurrency` from config.

### 8. Language Switch
- Navigate to `/en` — note all English nav items
- Click "العربية" (language switcher) — wait for full page reload
- Verify URL is `/ar`, all nav items Arabic
- Click "English" — wait for full page reload
- Verify URL is `/en`, ALL nav items are English again (no Arabic remnants)
- Root cause if broken: `router.push()` does soft navigation leaving stale dictionary; fix uses `window.location.href`

### 9. Cookie Consent Persistence
- Clear: `localStorage.removeItem('sasanperfumes_cookie_consent')` + delete cookie
- Reload — banner should appear
- Click "Accept All"
- Verify: `localStorage.getItem('sasanperfumes_cookie_consent')` === `"accepted"`
- Reload page — banner should NOT reappear
- Navigate to another page — still no banner
- Storage keys: cookie `sasanperfumes_cookie_consent` (maxAge 180 days, sameSite: lax) + localStorage backup

### 10. Promo Popup Dismiss
- Clear: `sessionStorage.removeItem('sasanperfumes_popup_dismissed')` + `sessionStorage.removeItem('sasanperfumes_popup_seen')`
- Navigate to homepage — popup appears after delay (~5s)
- Dismiss popup
- Verify: `sessionStorage.getItem('sasanperfumes_popup_dismissed')` === `"1"`
- Navigate to shop, product, cart pages — popup should NOT reappear
- Storage key: `sasanperfumes_popup_dismissed` in sessionStorage

### 11. Search
- Click search icon (magnifier) in header on `/en`
- Verify overlay opens with input field and placeholder "Search products..."
- Type query (e.g., "velvet"), press Enter → navigates to `/en/search?q=velvet`
- Repeat on `/ar` — placeholder should be Arabic "ابحث عن المنتجات..."
- Close button should work

### 12. Currency Selector
- Click AED/currency button in header
- Verify modal opens with currency grid: AED, BHD, KWD, OMR, QAR, SAR, USD
- Each currency has country flag icon

### 13. Price Symbol Verification
- Check product cards, product detail, cart, checkout for "Ð" symbol
- Console check: `document.body.innerText.includes('Ð')` should be `false`
- All prices should use AED SVG icon (`aria-label="AED"`) or text "AED"
- Count AED SVG icons: `document.querySelectorAll('svg[aria-label="AED"]').length`

### 14. WhatsApp Button
- Check `/en` homepage — WhatsApp floating button in bottom-left
- Inspect href: should be `https://wa.me/<phone>?text=<encoded_message>`
- Phone from `siteConfig.contact.whatsapp` (currently 97143442448)
- EN message: "Hello! I'm interested in your products."
- AR message: "مرحباً! أنا مهتم بمنتجاتكم."
- Button should have `target="_blank"` and `rel="noopener noreferrer"`
- If `phoneNumber` is undefined/empty, button should not render

### 15. Mobile Layout
- Enable mobile emulation (375x667 viewport)
- Check homepage: hamburger menu visible, logo centered, search/account/cart icons, bottom nav bar
- Check product page: image carousel with prev/next arrows, variation buttons wrap properly
- Check cart: responsive layout, sticky "Total + Proceed to Checkout" bar at bottom
- Bottom navigation: Home, Menu, Search, Wishlist, Account

### 16. Loyalty Points (Backend Settings)
- Product page: look for "Earn X points" or "ShapeHive Points" badge (based on product/variation price)
- The label comes from backend `label_en` / `label_ar` with `{points}` interpolation
- Points calculation: `Math.floor((price / divisor) * pointsPerAed)` where divisor=100 for minor units
- Checkout: guest state shows "Sign in to earn points on this order"
- Verify `/api/loyalty/route.ts` proxy route exists (not direct backend calls)
- Points should update when variation price changes

### 17. Brand-Wise Product Slider
- Navigate to `/en/product/argan-milk-serum` (brand: ASL)
- Scroll to bottom — look for "More from ASL" section
- Verify: shows other ASL products (Dark Musk, Velvet Amber) but NOT the current product
- Also test on `/en/product/the-cashmere-neck-square` — should show "More from stiletto"
- If no brand, section may fall back to same-category related products
- Component: `BrandProducts.tsx` — fetches by brand slug, excludes current product

### 18. HTML Entity Decoding
- Check cart/checkout for raw `&quot;`, `&#039;`, `&amp;` in visible text
- Check hero slider for backslash-escaped quotes (e.g., `that\'s` instead of `that's`)
- `decodeHtmlEntities()` utility in `src/lib/utils/index.ts` handles WooCommerce message decoding
- Also strips PHP `addslashes()` output: `.replace(/\\+(?=['"])/g, "")`

### 19. Homepage Sliders (Backend-Configurable)
- Verify homepage sections load from backend API (not hardcoded):
  - New Products, Featured, Bestsellers product sliders
  - Our Brands slider with brand logos
  - Hero slider, banners, FAQ, Our Story, collections
- All sections should be enable/disable-able from backend Cadvil/ShapeHive Settings
- No hardcoded product IDs, brand names, or business content in frontend

## PR #18 Regression Checklist
- EN cart "You Might Like" — no NaN prices
- AR cart "You Might Like" — no NaN prices  
- AR topbar — no `{{amount}} {{currency}}` placeholders
- EN hero subtitle — clean apostrophe, no backslashes or raw entities
- `stock_quantity` mapping — API returns `null` (not from `low_stock_remaining`)
- AR hero — Arabic text displayed (not English fallback)

## Rate Limiting
- Staging backend might return HTTP 429
- Wait 30-60 seconds between rapid API requests
- Admin API requests are more likely to be rate-limited

## Minor Known Issues
- Hero text on `/en` homepage shows `&#39;` (HTML entity) — this is backend content from WordPress that may intermittently have HTML entities; the `decodeHtmlEntities` function handles known patterns but new entity formats from the CMS might appear
- WPML has an unrelated JS error — do not treat as Sasan Perfumes plugin issue
- Pre-existing React hydration mismatch (#418) on production — console error on page load, not related to any specific PR
- Review images: Code exists in `ProductReviews.tsx` but no test reviews with images in backend — mark UNTESTED if testing review images
