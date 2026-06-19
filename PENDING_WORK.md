# ShapeHive Migration - Pending Work

**Date:** 2026-06-19  
**Status:** Routing and backend mapping updates are implemented in code. Remaining work is mostly WordPress admin verification + UI consistency.

## Completed in the repo
- Frontend routing now enforces market-first paths (`/qa`, `/om`, `/sa`) with locale segment second (`/qa/en`).
- Old market subdomain hostnames were removed from canonical/allowed host logic for middleware and config.
- Backend host normalization now supports host+market path keys (`shapehive.com/qa`, etc.) for market detection.
- Backend market content sites are restored in the setup script as CMS-only sites:
  - `qa.cms.shapehive.com` -> `https://shapehive.com/qa`
  - `om.cms.shapehive.com` -> `https://shapehive.com/om`
  - `sa.cms.shapehive.com` -> `https://shapehive.com/sa`
- `x-market` and `x-frontend-host` headers are propagated to route API calls per market.
- Frontend JSON parsing now strips hidden WordPress BOM/zero-width prefixes before parsing backend API responses.
- Plugin CORS whitelist updated to only allow `https://shapehive.com` + `https://cms.shapehive.com` and localhost origins.
- WordPress multisite mapping script updated to map host keys to path-based frontends.
- Default env example updated to match one backend host strategy:
  - Backend/API: `https://cms.shapehive.com`
  - Frontend: `https://shapehive.com`

## Pending work (post-live)
1. Finish live WordPress/Hostinger backend-site access  
   - Live Network Admin sites were recreated on 2026-06-19:
     - `cms.shapehive.com`
     - market sites for QA, OM, SA
   - Hostinger/web-server routing still needs to be confirmed for the market dashboards.
   - If using subdomains, configure DNS/SSL for:
     - `qa.cms.shapehive.com`
     - `om.cms.shapehive.com`
     - `sa.cms.shapehive.com`
   - If using backend paths, configure Hostinger/WordPress routing so these work:
     - `https://cms.shapehive.com/qa/wp-admin/`
     - `https://cms.shapehive.com/om/wp-admin/`
     - `https://cms.shapehive.com/sa/wp-admin/`

2. Confirm WordPress network settings are saved on live  
   - Open `https://cms.shapehive.com/wp-admin/network/admin.php?page=sasanperfumes-frontend-network`
   - Ensure only:
     - `cms.shapehive.com` -> `https://shapehive.com`
     - `qa.cms.shapehive.com` -> `https://shapehive.com/qa`
     - `om.cms.shapehive.com` -> `https://shapehive.com/om`
     - `sa.cms.shapehive.com` -> `https://shapehive.com/sa`
     - `shapehive.com/qa` -> `https://shapehive.com/qa`
     - `shapehive.com/om` -> `https://shapehive.com/om`
     - `shapehive.com/sa` -> `https://shapehive.com/sa`

3. Retire legacy public frontend sites fully on live  
   - Confirm no active or archived frontend sites remain for:
     - `qa.shapehive.com`
     - `om.shapehive.com`
     - `sa.shapehive.com`
   - Keep `*.cms.shapehive.com` sites for backend content management only.

4. Validate live redirects and route matrix  
   - `/qa` -> `/qa/en` (language by browser or default `en`)  
   - `/om` -> `/om/en`  
   - `/sa` -> `/sa/en`  
   - `/en/qa` -> `/qa/en`  
   - `/qa/ar` shows Arabic content with RTL layout  
   - `/ar` serves Arabic locale correctly

5. Frontend UI consistency sweep  
   - Check these pages for spacing, margins, shared component behavior:
     - Home
     - Category listing
     - Product detail
     - Cart and Checkout
     - Account pages

6. SEO and content checks  
   - Validate each route has correct canonical URL, `hreflang`, titles, and market-specific content:
     - `/en`, `/ar`
     - `/qa/en`, `/qa/ar`
     - `/om/en`, `/om/ar`
     - `/sa/en`, `/sa/ar`
   - Confirm sitemap and robots contain expected path format.

7. Go-live verification  
   - Test key flows in production after cache clear:
     - homepage -> category -> product
     - cart -> checkout
     - login/profile
     - language switcher
   - Check browser console for CORS or mixed-content errors.
   - Confirm `https://shapehive.com/api/home-settings?lang=en` no longer returns `{"code":"invalid_response"}` after the frontend deployment lands.

## Deployment note
- WordPress Admin changes are external to Git. Keep this list updated until each item is confirmed on live admin and frontend.
