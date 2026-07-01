# Testing Sasan Perfumes Frontend - Shop Pages & Product Ordering

## Overview
The Sasan Perfumes Frontend is a Next.js e-commerce site that connects to a WooCommerce backend at `https://cms.sasanperfumes.com`. It supports two locales: English (`en`) and Arabic (`ar`, RTL), and four markets: International (AED), Qatar (QAR), Oman (OMR), Saudi Arabia (SAR).

## Local Setup
1. Copy `.env.example` to `.env.local` (default values point to the live WooCommerce backend)
2. Run `npm run dev` to start the dev server on `http://localhost:3000`
3. The frontend fetches all product data from the live WooCommerce Store API

## Key URLs for Testing
- Shop page: `/en/shop` (EN) or `/ar/shop` (AR)
- Category pages: `/en/category/{slug}` (e.g., `gifts-set`, `perfumes`, `personal-care`, `home-fragrances`, `hand-body-lotion`, `fragrance-oils`, `hair-body-mist`, `reed-diffusers`, `air-fresheners`)
- Product detail: `/en/product/{slug}`

## Product Ordering Logic
- Products are fetched from the WooCommerce Store API with `orderby=date&order=desc` (newest first)
- Client-side `sortBestsellersFirst()` in `ProductListing.tsx` and `ShopClient.tsx` promotes bestseller products to the top
- Bestsellers are defined in `BESTSELLER_PRODUCT_IDS` and `BESTSELLER_PRODUCT_SLUGS` in `src/lib/api/woocommerce.ts`
- Both ID and slug matching are used because WPML assigns different product IDs per locale, but slugs remain the same

## WPML Multi-Locale Considerations
- Product IDs differ between English and Arabic locales
- Product slugs are the same across locales
- When testing sorting/filtering logic, always verify both `/en/` and `/ar/` paths
- Arabic pages use RTL layout - the "first" product appears on the right side

## Common Testing Scenarios
1. **Product ordering**: Check that bestsellers appear at the top of shop and category pages
2. **New product visibility**: The latest added product should appear first if it's in the bestseller list
3. **Category filtering**: Gift products (free items) are filtered out from shop and category listings
4. **Infinite scroll**: Shop page loads 12 products initially, more on scroll. Note: `sortBestsellersFirst` only sorts within fetched products, not across pages

## WordPress Admin
- URL: `https://cms.sasanperfumes.com/wp-admin`
- Username: shapehive_admin_9284
- Credentials should be stored as Devin secrets (WP_ADMIN_PASSWORD)
- Product ordering in WP admin (Products > Sorting) sets `menu_order` but the frontend currently overrides this with date desc + bestseller sorting

## Devin Secrets Needed
- `WP_ADMIN_PASSWORD` - WordPress admin password for cms.sasanperfumes.com (username: shapehive_admin_9284)

## Multi-Market URLs
| Market | Shop URL | Currency |
|--------|----------|----------|
| International | `/en/shop` | AED |
| Qatar | `/qa/en/shop` | QAR |
| Saudi Arabia | `/sa/en/shop` | SAR |
| Oman | `/om/en/shop` | OMR |

## Lint & Build
- Lint: `npm run lint` (runs eslint)
- Build: `npx next build --webpack` (do NOT use `npm run build`)
- No CI checks are configured on the repo - rely on local lint/build verification
