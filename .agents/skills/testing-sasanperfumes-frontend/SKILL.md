---
name: testing-sasanperfumes-frontend
description: Test the Sasan Perfumes headless ecommerce frontend and WordPress admin plugin end-to-end. Use when verifying admin settings UI, REST API responses, or Next.js frontend rendering.
---

# Testing Sasan Perfumes Frontend

Next.js e-commerce frontend for Sasan Perfumes (sasanperfumes.com).

## Local Dev Setup

```bash
npm install
npx next build --webpack
npx next start -p 3000
```

**CRITICAL: Do NOT use `npm run build`** — it runs `build-preserve-chunks.js` which can restore old webpack chunks containing stale page code, causing pages to render outdated designs despite correct source code. Always use `npx next build --webpack` directly for accurate builds.

The dev server (`npm run dev`) uses Turbopack which may also have persistent caching issues — prefer production builds for accurate testing.

If you see pages rendering old designs (e.g., dark gradient heroes instead of clean beige PageHeaders), the build cache is the most likely cause. Delete `.next/` and `.next-static-backup/` directories, then rebuild with `npx next build --webpack`.

## Key Test Routes

| Page | Route |
|------|-------|
| Homepage | /en |
| Shop | /en/shop |
| Category | /en/category/perfumes |
| Product Detail | /en/product/mimosa-glow |
| FAQ | /en/faq |
| Cart | /en/cart |
| Search | /en/search?q=musk |
| Info pages | /en/shipping, /en/returns, /en/privacy, /en/terms-and-conditions |
| About | /en/about |
| Contact | /en/contact |
| Brands | /en/brands |
| Services | /en/services |
| Store Locator | /en/store-locator |
| Private Labeling | /en/private-labeling |
| What We Do | /en/what-we-do |
| Blog | /en/blog |

### CMS-Driven Dynamic Pages

| Page | Route | What to Verify |
|------|-------|----------------|
| Brands listing | /en/brands | Page title, subtitle, brand cards with names/descriptions/product counts |
| Brand detail | /en/brands/{slug} | Brand name, about section, perfume notes (3 per brand), filtered products |
| What We Do | /en/what-we-do | Title, subtitle, features section (repeater from CMS), hero image |
| Blog listing | /en/blog | Blog post cards with title, date, excerpt, featured image |
| Blog detail | /en/blog/{slug} | Post title, full content, date, breadcrumb navigation |
| Services listing | /en/services | Title, service cards with links, CTA section (verify no double locale prefix) |
| Service detail | /en/services/{slug} | Service title, description, features repeater, CTA section |
| Private Labeling | /en/private-labeling | 9 CMS sections (Hero, Intro, What Is, Why Choose, Process, Products, Benefits, CTA, Form) |
| Contact | /en/contact | Contact cards, form, phone/email/address from CMS |

Sample brand slugs: `rimal`, `serenity`, `liwan`, `flower-scents`
Sample service slugs: `private-label-fragrances`, `fragrance-manufacturing`, `custom-scent-development`, `packaging-design`, `bulk-perfume-supply`
Sample blog slug: `art-of-perfumery-crafting-memorable-scent-experiences`
Sample product slugs: `mimosa-glow` (Flower Scents, 220 AED), `orange-blossom`, `pure-jasmine`

**Note:** `dark-musk-perfume` slug may not exist. Use `mimosa-glow` as the default test product.

Arabic locale: replace `/en/` with `/ar/`.

## Design Consistency Verification

All pages (except the homepage) should use the shared `PageHeader` component with:
- Light beige background: `bg-[#f8f3ef]`
- Brand-primary text color (warm brown/dark, NOT gray `#6b7280`)
- `font-normal` typography (NOT `font-bold`)
- Thin borders: `border-[#e7ded7]` (NOT shadows or gradients)
- No animated blobs, Sparkles icons, or decorative gold elements

To verify via curl:
```bash
# Check PageHeader class is present
curl -s http://localhost:3000/en/about | grep -o 'bg-\[#f8f3ef\]' | head -3

# Check old gradient classes are absent
curl -s http://localhost:3000/en/about | grep -c 'min-h-\[70vh\]'  # Should be 0
```

The homepage (`/en`) should NOT use PageHeader — it has its own hero slider and sections.

### RTL Verification

Arabic pages should have `dir="rtl"` inherited from the parent layout. The `PageHeader` component does NOT set its own `dir` attribute — it inherits from the layout. Verify:
```bash
curl -s http://localhost:3000/ar/faq | grep -o 'dir="rtl"' | head -3
```

## Mobile Testing

Use browser `set_mobile` to toggle mobile viewport (390px). Key mobile-specific elements:
- Bottom navigation bar (Home, Menu, Search, Wishlist, Account)
- Account drawer with footer links
- Cookie/location banner positioning above bottom bar

## WordPress Backend

- URL: https://cms.sasanperfumes.com/wp-admin
- Credentials: Use saved WordPress admin credentials
- Plugin: Cadvil Settings (ShapeHive Frontend Settings)
- Plugin path on server: `/home/u327034204/domains/cms.sasanperfumes.com/public_html/wp-content/plugins/sasanperfumes-frontend-settings/`
- Local plugin source: `wordpress/sasanperfumes-frontend-settings/`

### Admin Pages

| Page | URL |
|------|-----|
| Home Page settings | `admin.php?page=sasanperfumes-settings` |
| Hero Slider tab | `admin.php?page=sasanperfumes-settings&tab=hero` |
| Advanced Settings | `admin.php?page=sasanperfumes-advanced` |
| Header & Topbar | `admin.php?page=sasanperfumes-settings-header` |
| SEO Settings | `admin.php?page=sasanperfumes-settings-seo` |
| Footer Settings | `admin.php?page=sasanperfumes-settings-footer` |
| Brands Slider | `admin.php?page=sasanperfumes-settings-brands-slider` |
| Promotions | `admin.php?page=sasanperfumes-promotions` |
| Loyalty Points | `admin.php?page=sasanperfumes-loyalty` |
| Feature Toggles | `admin.php?page=sasanperfumes-feature-toggles` |
| Brands Page | `admin.php?page=sasanperfumes-settings-brands-page` |
| Services Page | `admin.php?page=sasanperfumes-settings-services-page` |
| Private Labeling | `admin.php?page=sasanperfumes-private-labeling` |
| WhatsApp Button | `admin.php?page=sasanperfumes-whatsapp` |
| PL Submissions | `edit.php?post_type=sasanperfumes_pl_inquiry` |
| All Scent Guides | `edit.php?post_type=sasanperfumes_guide` |
| Size Guides | `edit.php?post_type=sasanperfumes_size_guide` |
| Services (CPT) | `edit.php?post_type=sasanperfumes_service` |
| Brand Edit (Flower Scents) | `term.php?taxonomy=product_brand&tag_ID=232&post_type=product` |

### Brand Page Settings (Taxonomy Edit Pages)

Brand edit pages (`term.php?taxonomy=product_brand`) have custom fields managed by `class-sasanperfumes-brand-pages.php`:

- **Brand Logo**: Image upload field (`_sasanperfumes_brand_logo`)
- **Brand Banner**: Image upload field (`_sasanperfumes_brand_banner`)
- **Short Description EN/AR**: Text areas
- **About EN/AR**: Rich text areas
- **Perfume Notes**: Repeater field with Image, Title EN/AR, Description EN/AR per note

**Verification checklist:**
1. `window.__sasanperfumesAdminLoaded` must return `true` (confirms admin.js loaded)
2. "Upload Image" buttons (`.sasanperfumes-upload-btn`) must open WordPress Media Library modal
3. "+ Add Note" button must call `sasanperfumesAddBrandNote()` and create a new note form
4. Each note form should have 5 fields: `image`, `title_en`, `title_ar`, `desc_en`, `desc_ar`

**Known issue:** The "+ Add Note" button may not respond to browser click automation. Use JavaScript `sasanperfumesAddBrandNote()` in console as a workaround.

### REST API Endpoints

| Endpoint | Purpose |
|----------|--------|
| `/wp-json/sasanperfumes/v1/home-settings` | Hero slider, sections config |
| `/wp-json/sasanperfumes/v1/home-sections` | Homepage section data |
| `/wp-json/sasanperfumes/v1/brands-slider` | Brands carousel data (includes subtitle EN/AR) |
| `/wp-json/sasanperfumes/v1/brands` | All brands with perfume notes |
| `/wp-json/sasanperfumes/v1/brands/{slug}` | Single brand detail + notes |
| `/wp-json/sasanperfumes/v1/brands-page` | Brands listing page settings |
| `/wp-json/sasanperfumes/v1/services` | All services listing |
| `/wp-json/sasanperfumes/v1/services/{slug}` | Single service detail + features |
| `/wp-json/sasanperfumes/v1/services-page` | Services page settings (includes ctaLink) |
| `/wp-json/sasanperfumes/v1/pages/{slug}` | Static page content (about, what-we-do, contact, etc.) |
| `/wp-json/sasanperfumes/v1/feature-toggles` | All feature toggles (27 total, flat JSON object) |
| `/wp-json/sasanperfumes/v1/private-labeling` | Private Labeling page content (all 9 sections EN/AR) |
| `/wp-json/sasanperfumes/v1/whatsapp` | WhatsApp button settings (number, message, toggle) |
| `/wp-json/wp/v2/posts` | WordPress blog posts |
| `/wp-json/wp/v2/posts?slug={slug}` | Single blog post |

**Important:** The REST API namespace is `sasanperfumes/v1`. The plugin folder on the server is `anbar-frontend-settings` but the namespace remains `sasanperfumes/v1`.

## Feature Toggle Testing

### Testing Toggle ON/OFF States

Feature toggles control page visibility. When testing toggle changes:

1. **Via WP-CLI (preferred for speed):**
```bash
sshpass -p '$HOSTINGER_SSH_PASSWORD' ssh -p 65002 -o StrictHostKeyChecking=no u327034204@72.61.121.107 \
  "cd domains/cms.sasanperfumes.com/public_html && wp option update sasanperfumes_reviews_enabled 1"
```

2. **Via browser (WP Admin → Feature Toggles)** — may trigger rate limiting.

3. **CRITICAL: After changing a toggle, you MUST rebuild Next.js** for the change to appear in the frontend. Toggle values are fetched at build time for SSG pages:
```bash
npx next build --webpack && npx next start -p 3000
```

The first build after a toggle change may still cache the old value if there's API-level caching. If the RSC payload still shows the old value, wait 30s and rebuild again.

4. **Verify via RSC payload:**
```python
python3 -c "
import urllib.request
html = urllib.request.urlopen('http://localhost:3000/en/product/mimosa-glow').read().decode()
if 'reviewsEnabled' in html:
    idx = html.index('reviewsEnabled')
    print(html[idx:idx+30])
"
```

5. **Restore toggles after testing** — always return toggles to their original state.

### Reviews Toggle Specifics

- Option key: `sasanperfumes_reviews_enabled`
- When OFF: No `id="reviews"` div, no "Write a Review" text, no star ratings in product detail
- When ON: Full review form with star rating (1-5), title, name, email, review text, photo upload
- ProductDetail checks `reviewsEnabled` prop from feature toggles API

### Homepage Blog Toggle

- Requires BOTH `sasanperfumes_home_blog_enabled` AND `sasanperfumes_blog_enabled` to be true
- Also requires at least one blog post to exist
- Section heading: "From Our Blog"
- Section appears below the fold on homepage

## Admin UI Testing Procedures

### Feature Toggles Page

The Feature Toggles page (`admin.php?page=sasanperfumes-feature-toggles`) has:
- **Page title**: `<h1>Feature Toggles</h1>`
- **"Pages & Features" group**: Reviews, Brands Page, Services Page, What We Do, Blog, Store Locator, FAQ Page
- **"Homepage Sections" group**: Homepage Services, Homepage Blog, Homepage Notes
- **Reference table**: Shows existing toggles from other admin modules (Advanced Settings, homepage, etc.)

To verify toggles via curl:
```bash
# Check all toggle names and checked/unchecked state in admin HTML
curl -s -b /tmp/wp_cookies.txt "https://cms.sasanperfumes.com/wp-admin/admin.php?page=sasanperfumes-feature-toggles" | \
  grep -o 'name="sasanperfumes_[^"]*_enabled"[^>]*' | head -20

# Check via REST API
curl -s "https://cms.sasanperfumes.com/wp-json/sasanperfumes/v1/feature-toggles" | python3 -m json.tool
```

### Private Labeling Form Testing

- Form has exactly 5 fields: Full Name, Email, Phone, Service Interest (dropdown), Message
- Submit via curl:
```bash
curl -s -X POST http://localhost:3000/api/private-labeling \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Test","email":"test@example.com","phone":"+971501234567","service":"Custom Fragrance Development","message":"Test"}'
```
- Should return `{"success": true}`
- Submissions visible in WP Admin → PL Submissions

### WhatsApp Button Testing

- WhatsApp button links to `wa.me/{number}?text={encoded_message}`
- Number and message managed from WP Admin → WhatsApp Button
- Verify in HTML: `<a aria-label="Chat on WhatsApp" href="https://wa.me/...">`

### Image Upload Field Verification

All image fields should use the `sasanperfumes_image_field()` helper which renders:
- Text input with URL value
- "Upload Image" button (class `sasanperfumes-upload-btn`)
- Image preview element (class `sasanperfumes-image-preview`)

### Advanced Settings Tabs

Advanced should have exactly 4 tabs:
1. Live Chat
2. Gift Wrapping
3. Abandoned Cart Popup
4. Product Detail

It must NOT have "Scent & Size Guide" or "Video Hero" tabs. Scent Guides and Size Guides are separate CPTs with their own sidebar menu items.

## Hostinger Server Rate Limiting

The Hostinger server at `sasanperfumes.com` and `cms.sasanperfumes.com` has aggressive rate limiting (HTTP 429) that triggers after ~3-5 rapid requests. Mitigation strategies:

1. **Wait 30-60 seconds** between page navigations in the browser
2. **Use curl from shell** for content verification — curl requests are generally not affected by the same rate limiting as browser sessions
3. **Hybrid testing approach**: Use spaced browser visits for visual screenshots + curl for content verification in parallel
4. **Restart browser** with a neutral site (e.g., example.com) if you get persistent 429 errors — this resets the browser session
5. **Use JS console** for DOM inspection instead of navigating to new pages
6. **Set field values via JS** (`element.value = 'text'`) instead of typing which triggers fewer requests
7. If a form POST returns 429, wait ~60-90s and retry — the data was NOT saved
8. The rate limit window appears to be ~60 seconds but may be longer during heavy testing
9. **Use WP-CLI via SSH** for toggle changes instead of WP Admin to avoid rate limiting
10. **Use fetch() with redirect:'manual'** for form submissions to avoid the extra redirect request that triggers rate limiting
11. **Avoid multiple rapid console evaluations** — each console call is a separate request that counts toward rate limits
12. **For taxonomy edit pages (term.php)**, form submissions go to `/wp-admin/edit-tags.php` via POST, which may be more aggressively rate-limited than plugin settings pages

### Deploying Plugin Updates

When the WP plugin needs updating on the server:
1. **Preferred: WP Plugin File Editor** — Navigate to Plugins → Plugin File Editor → select `sasanperfumes-frontend-settings` → edit files directly
2. **Alternative: SSH** — `scp -P 65002 local-file.php u327034204@72.61.121.107:/home/u327034204/domains/cms.sasanperfumes.com/public_html/wp-content/plugins/sasanperfumes-frontend-settings/`
3. **Alternative: Hostinger File Manager** — Upload via hPanel file manager (requires Hostinger login)
4. SSH may time out frequently — use `-o ConnectTimeout=30` and retry

## CMS Page Testing Checklist

When testing CMS-driven pages, verify:
1. Page title and subtitle render from API (not hardcoded)
2. Dynamic content sections (features, notes, services) show correct count and content
3. Links use correct locale prefix (e.g., `/en/services/{slug}`, NOT `/en/en/services/{slug}`)
4. Footer links include all new pages (Brands, What We Do, Services, Blog, Private Labeling)
5. Footer does NOT include disabled pages (Size Guide, Loyalty)
6. Disabled pages return 404 or redirect appropriately
7. Homepage services section shows dynamic service cards from CMS
8. No JavaScript errors in console (ignore 429 rate-limit errors from staging)
9. Brand detail pages show perfume notes (stored as PHP serialized arrays in term meta)
10. Arabic routes show Arabic content with RTL layout (`dir="rtl"`, `lang="ar"`)
11. Form submissions (PL, Contact) work and store in WP Admin
12. All pages use `PageHeader` component with `bg-[#f8f3ef]` (except homepage)

## Frontend Verification

- Frontend URL: https://sasanperfumes.com
- Hero slider renders on `/en` with backend data
- Verify title/subtitle overlays match saved admin values
- Check for navigation arrows and slide images

### Brands Mega Menu Testing

- Hover "Brands" in desktop nav → mega menu panel opens
- Shows brand cards with logo (or initial letter fallback) + brand name
- "View All Brands →" link points to `/en/brands`
- Each brand links to its detail page
- Menu closes after ~150ms delay on mouse leave
- Only one mega menu should be visible at a time (no overlap with Shop menu)

### ISR Caching Caveat

Next.js uses ISR with `revalidate = 300` (5 minutes). When testing toggle changes on the production-built server:
- Pages cached for 300 seconds
- A fresh build (`npx next build --webpack`) creates a new cache with current API values
- If toggle values appear stale after rebuild, wait 30s and rebuild again (API may cache)
- On staging (Hostinger), ISR cache persists across server restarts — only a fresh build clears it

## Devin Secrets Needed

- `HOSTINGER_SSH_PASSWORD`: SSH access to Hostinger server (port 65002, user u327034204@72.61.121.107) for WP-CLI and deployment
- WordPress admin credentials: shapehive_admin_9284 / (stored in session) for CMS backend access

## Multi-Market Architecture

| Market | Blog ID | Currency | Path Prefix | Country |
|--------|---------|----------|-------------|--------|
| International | 1 | AED | (none) | AE |
| Qatar | 5 | QAR | /qa | QA |
| Oman | 6 | OMR | /om | OM |
| Saudi Arabia | 7 | SAR | /sa | SA |

**Important:** WooCommerce backend returns `currency_code=AED` for all subsites. The frontend uses `market.defaultCurrency` from `src/config/market.ts` for OG tags and JSON-LD. Never trust `product.prices.currency_code` for multi-market currency display.
