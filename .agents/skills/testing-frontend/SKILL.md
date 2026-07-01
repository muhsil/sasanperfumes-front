# Testing Sasan Perfumes Frontend

## Dev Server
- Run `npm run dev` in the repo root to start Next.js dev server on `http://localhost:3000`
- The frontend connects to the WordPress/WooCommerce backend at `https://cms.sasanperfumes.com`
- No additional backend setup is needed for local testing — the CMS is remote

## Supported Locales
- English: `/en/...`
- Arabic: `/ar/...` (RTL layout)
- Default locale is `en`

## Key Page Routes
| Route | Description |
|---|---|
| `/[locale]` | Homepage |
| `/[locale]/shop` | Shop all products |
| `/[locale]/category/[slug]` | Category product listing |
| `/[locale]/notes/[slug]` | Fragrance note product listing |
| `/[locale]/guides/[slug]` | Guide/SEO content pages |
| `/[locale]/product/[slug]` | Product detail page |
| `/[locale]/about` | About page |
| `/[locale]/contact` | Contact page |
| `/[locale]/faq` | FAQ page |

## Testing Patterns

### Product Listing Pages (Category, Notes)
- Verify H1 title matches the category/note name
- Check breadcrumbs render correctly (Home > Shop > [Section] > [Name])
- Verify product count is shown (e.g. "4 Products")
- Confirm product cards display name, price (AED), and image
- Check SEO content block at the bottom of the page (h2 + description)
- For Arabic pages: verify RTL layout, Arabic text, Arabic breadcrumbs

### Guide Pages
- Verify title, eyebrow text, intro paragraph
- Check product recommendations render
- Verify FAQ section expands/collapses on click
- Check Related Guides section links

### Common Assertions
- No 404 errors on expected routes
- Product cards link to `/[locale]/product/[slug]` and navigate correctly
- Arabic pages have RTL text direction and Arabic UI labels
- SEO meta tags present in page source (check with browser console or curl)

## Lint
- Run `npm run lint` before committing
- Only 0 errors required; pre-existing warnings are acceptable
- No CI is configured for this repo

## Notes
- The WooCommerce Store API might return different product counts for EN vs AR locales due to localization
- Product filtering for notes pages is done client-side by `pa_notes` taxonomy attribute
- The `1 Issue` / `2 Issues` badge in the bottom-left corner of the dev server is a Next.js dev overlay — not a bug in the app

## Multi-Market Currencies
| Market | Currency | Path |
|--------|----------|------|
| International | AED | /en, /ar |
| Qatar | QAR | /qa/en, /qa/ar |
| Oman | OMR | /om/en, /om/ar |
| Saudi Arabia | SAR | /sa/en, /sa/ar |

## Devin Secrets Needed
- No secrets required for local frontend testing — the CMS backend is publicly accessible
