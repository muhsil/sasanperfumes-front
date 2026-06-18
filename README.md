# Sasan Perfumes - Headless E-commerce Frontend

A modern, bilingual (English/Arabic) headless e-commerce frontend built with Next.js 15, Tailwind CSS, and WordPress/WooCommerce REST API.

## Features

- **Next.js 15 App Router** - Server-side rendering and ISR for SEO and performance
- **Bilingual Support** - English and Arabic (RTL) with seamless language switching
- **Multi-Currency** - Support for AED, BHD, KWD, OMR, QAR, SAR, USD with persistent selection
- **WordPress/WooCommerce Backend** - Headless CMS via REST API, Store API, and CoCart
- **Market-aware Frontend Routing** - Shared CMS with separate frontends at `/qa`, `/om`, and `/sa` (plus base `https://shapehive.com`)
- **Multisite market separation** - One WordPress host (`cms.shapehive.com`) with market-specific content, pages, products, and SEO returned by market context.
- **Tailwind CSS** - Utility-first styling with RTL support
- **TypeScript** - Full type safety throughout the codebase
- **SEO Optimized** - Metadata, hreflang, structured data (Product, Offer, BreadcrumbList, Organization)
- **Image Optimization** - Blur placeholders, lazy loading, error handling with logo fallback
- **Payment Integration** - MyFatoorah (cards), Tabby (BNPL), Tamara (BNPL), Cash on Delivery
- **Google Sign-In** - OAuth-based social login
- **Product Bundles** - Build-your-own-set functionality
- **41 API Routes** - Server-side proxy layer for security and data transformation

## Project Structure

```
src/
├── app/
│   ├── [locale]/              # Locale-based routing (en/ar)
│   │   ├── (pages)/           # Static pages (about, contact, faq)
│   │   ├── (shop)/            # Shop pages (shop, product, category, cart, checkout)
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── page.tsx           # Home page
│   └── api/                   # 41 Next.js API routes
│       ├── auth/              # Login, verify, renew, Google OAuth, password reset
│       ├── cart/              # Cart operations (CoCart proxy)
│       ├── wishlist/          # Wishlist operations
│       ├── customer/          # Customer profile, email check
│       ├── orders/            # Orders, cancellation, notes
│       ├── products/          # Product listings
│       ├── bundles/           # Bundle configurations
│       ├── shipping/          # Shipping rates
│       ├── myfatoorah/        # MyFatoorah payment (7 endpoints)
│       ├── tabby/             # Tabby BNPL payment
│       ├── tamara/            # Tamara BNPL payment
│       └── ...                # Currencies, coupons, CSRF, health, etc.
├── components/
│   ├── common/                # Reusable UI components
│   ├── layout/                # Header, Footer
│   ├── seo/                   # SEO components (JsonLd, Breadcrumbs)
│   └── shop/                  # E-commerce components
├── config/                    # Site configuration
├── contexts/                  # React contexts (Currency, Cart, Auth, Wishlist)
├── i18n/                      # Internationalization dictionaries
├── lib/
│   └── utils/                 # Utility functions
├── types/                     # TypeScript type definitions
└── middleware.ts              # Locale detection middleware
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- WordPress with WooCommerce, CoCart, and WPML (for backend)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/muhsil/sasanperfumes-front.git
cd sasanperfumes
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and configure:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your WordPress backend and market frontend details:
```
NEXT_PUBLIC_SITE_URL=https://shapehive.com
NEXT_PUBLIC_WC_API_URL=https://cms.shapehive.com
NEXT_PUBLIC_CANONICAL_HOST=https://shapehive.com
WC_CONSUMER_KEY=ck_xxxxx
WC_CONSUMER_SECRET=cs_xxxxx
```

Market frontends:
```
https://shapehive.com/        -> intl market (default currency/country logic)
https://shapehive.com/qa      -> Qatar market
https://shapehive.com/om      -> Oman market
https://shapehive.com/sa      -> Saudi market
```

All market routes use one backend:
`https://cms.shapehive.com`

The backend uses market context to resolve separate site data per market (market pages, products, SEO, and settings are served from the active frontend segment).

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## WordPress Backend Setup

### Required Plugins (single shared backend for all markets)

- WooCommerce
- CoCart (headless cart API)
- WPML (for multilingual support)
- WooCommerce Multilingual & Multicurrency (WCML)
- TI WooCommerce Wishlist
- JWT Authentication for WP REST API
- Sasan Perfumes Frontend Settings (custom plugin, see `wordpress/` folder)

### REST API Configuration

Ensure the following WordPress REST API endpoints are accessible:
- `/wp-json/wc/store/v1/` - WooCommerce Store API (products, categories)
- `/wp-json/wc/v3/` - WooCommerce REST API (orders, customers)
- `/wp-json/cocart/v2/` - CoCart API (cart operations)
- `/wp-json/sasanperfumes/v1/` - Sasan Perfumes custom settings API

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Supported Currencies

| Market | Code | Symbol |
|--------|------|--------|
| United Arab Emirates | AED | AED |
| Bahrain | BHD | BD |
| Kuwait | KWD | KD |
| Oman | OMR | OMR |
| Qatar | QAR | QR |
| Saudi Arabia | SAR | SAR |
| United States | USD | $ |

Note: Currencies and SEO/content are loaded per market context from the shared backend.

## Frontend Market URLs

Use one canonical backend and separate frontend market routes:
- `https://shapehive.com/`
- `https://shapehive.com/qa`
- `https://shapehive.com/om`
- `https://shapehive.com/sa`

Market-specific hostnames are not used for frontend routing now; use path-based market routes (`/qa`, `/om`, `/sa`).

For a full host/canonicals matrix, keep `NEXT_PUBLIC_CANONICAL_HOSTS` and `NEXT_PUBLIC_ALLOWED_HOSTS` in sync in `.env.local`.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables (see `SASANPERFUMES-WEBSITE.md` for full list)
4. Deploy

### Other Platforms

The project can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Self-hosted with Node.js

## Caching Strategy

This app uses a multi-layer caching strategy optimized for SSR with Cloudflare CDN.

### Next.js ISR (Incremental Static Regeneration)

Pages use `revalidate` for time-based cache invalidation:
- Home page: 60 seconds
- Product pages: 300 seconds (5 minutes)
- Categories: 600 seconds (10 minutes)

### API Route Caching

API routes include their own caching layers:
- Products: 300s with 600s stale-while-revalidate
- Coupons, free gifts, payment gateways, shipping countries: 300s
- Currencies, bundles: 60s

### Cloudflare Cache Rules

When using Cloudflare as CDN, configure these cache rules:

| Route Pattern | Cache Behavior | Reason |
|---------------|----------------|--------|
| `/cart`, `/checkout`, `/account/*`, `/api/*` | **Bypass** | User-specific, session-dependent |
| `/_next/static/*`, images, fonts | **Cache 1 month** | Content-hashed, safe to cache |
| All other HTML | **Default (ISR)** | Let Next.js control freshness |

**Important:** Never enable "Cache Everything" for HTML pages - this breaks cart, checkout, and authentication flows.

See `TODO-LIVE.md` for detailed Cloudflare rule expressions and verification checklist.

## Documentation

| Document | Description |
|----------|-------------|
| **SASANPERFUMES-WEBSITE.md** | Complete technical overview with all 41 API routes listed |
| **WORDPRESS_ADMIN_GUIDE.md** | WordPress configuration guide + complete API reference with request/response schemas |
| **TODO-LIVE.md** | Production checklist and testing results |

## License

This project is proprietary software for Sasan Perfumes.
