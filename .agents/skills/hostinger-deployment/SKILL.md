# Hostinger Deployment & Server Error Troubleshooting

## Overview
The Sasan Perfumes Frontend (Next.js) is hosted on Hostinger Cloud Professional plan. The WordPress backend (WooCommerce) is hosted separately on the same Hostinger account. This document captures all known deployment issues and their fixes.

## Architecture
- **Frontend**: Next.js app at `sasanperfumes.com` (Hostinger Cloud, Node.js via Phusion Passenger)
- **Backend**: WordPress/WooCommerce at `cms.sasanperfumes.com` (Hostinger WordPress hosting)
- **Markets**: International (AED), Qatar/QAR (/qa), Oman/OMR (/om), Saudi Arabia/SAR (/sa)

## Hostinger Account
- Login: `https://hpanel.hostinger.com`
- Credentials should be stored as Devin secrets (HOSTINGER_EMAIL, HOSTINGER_PASSWORD)
- Plan: Cloud Professional (check renewal status regularly)
- Hostinger may require email verification codes on login from new IPs

## SSH Access
- Host: `72.61.121.107`
- Port: `65002`
- User: `u327034204`
- Command: `ssh -p 65002 u327034204@72.61.121.107`
- Frontend root: `/home/u327034204/domains/sasanperfumes.com/public_html`
- Node.js app root: `/home/u327034204/domains/sasanperfumes.com/nodejs`

## Known Error #1: 503 Service Unavailable (Most Common)

### Symptoms
- Site returns 503 after deployment
- Response headers show `server: cloudflare`, `platform: hostinger`, `x-turbo-charged-by: LiteSpeed`
- WordPress backend API at `sasanperfumes.com` responds fine (200)

### Root Cause
Hostinger uses **Phusion Passenger** to manage Node.js processes. The `.htaccess` file at `public_html/.htaccess` MUST contain `PassengerEnabled on` directive. Without it, Passenger never starts the Next.js app, and LiteSpeed returns 503.

### Fix
```bash
ssh -p 65002 u327034204@72.61.121.107

# Add PassengerEnabled on to .htaccess if missing
sed -i '1i PassengerEnabled on' /home/u327034204/domains/sasanperfumes.com/public_html/.htaccess

# Restart the Passenger process
touch /home/u327034204/domains/sasanperfumes.com/nodejs/tmp/restart.txt

# Wait ~15 seconds then test
curl -I https://sasanperfumes.com
```

### Prevention
- After every Hostinger deployment, verify `.htaccess` contains `PassengerEnabled on`
- Hostinger may regenerate `.htaccess` during deployments and omit this directive
- Hostinger may not set `PassengerEnabled on` automatically for all domains — always verify after deployment

## Known Error #2: 403 Forbidden After Deployment

### Symptoms
- Site returns 403 instead of 503 after code changes

### Root Cause
Adding `output: 'standalone'` to `next.config.ts` causes 403 on Hostinger. Hostinger's Next.js preset does NOT support standalone mode.

### Fix
- NEVER add `output: 'standalone'` to `next.config.ts` for this project
- If accidentally added, revert it immediately

## Known Error #3: WordPress Backend 500 During Build

### Symptoms
- Hostinger build logs show `WordPress API Error: 500 Internal Server Error`
- Build uses 63 concurrent workers hitting the WP backend
- Individual WP API requests work fine

### Root Cause
The WordPress backend gets overwhelmed by concurrent load from Hostinger's static page generation build workers.

### Mitigation
- This is a WordPress resource issue, not a frontend code issue
- The build may still succeed despite these errors (pages that fail get regenerated on-demand via ISR)
- If builds consistently fail, consider increasing PHP workers/memory on the WordPress hosting

## Known Error #4: Node.js Process Not Listening

### Symptoms
- Build succeeds but site still returns 503
- Passenger can't reach the Node.js process

### Root Cause
`next start` defaults to binding on `localhost:3000`. Hostinger's LiteSpeed proxy needs the app to:
1. Bind to `0.0.0.0` (all interfaces), not just localhost
2. Use the `PORT` environment variable

### Fix Applied
The `package.json` start script was changed to:
```json
"start": "next start -H 0.0.0.0 -p ${PORT:-3000}"
```

Environment variable `PORT=3000` was also added in Hostinger hPanel > Environment Variables.

### Prevention
- NEVER change the start script back to just `next start`
- Always ensure `PORT=3000` exists in Hostinger env vars

## Deployment Checklist

1. **Before deploying**: Run `npm run lint` and `npm run build` locally
2. **After deployment succeeds in Hostinger**:
   - Wait 30-60 seconds for Passenger to start the app
   - Check if site loads: `curl -I https://sasanperfumes.com`
   - If 503: SSH in and check `.htaccess` for `PassengerEnabled on`
   - If still 503: Check if Node.js process is running: `ps aux | grep node`
   - Restart Passenger: `touch /home/u327034204/domains/sasanperfumes.com/nodejs/tmp/restart.txt`
3. **If site still down after all fixes**: Check Hostinger hPanel > Deployments > Logs for build errors

## Environment Variables (Hostinger hPanel)
These must be set in Hostinger hPanel > Website > Environment Variables:
- `PORT=3000`
- `MYFATOORAH_API_KEY`
- `MYFATOORAH_TEST_MODE`
- `MYFATOORAH_COUNTRY`
- `TABBY_PUBLIC_KEY`, `TABBY_SECRET_KEY`, `TABBY_MERCHANT_CODE`
- `TAMARA_API_TOKEN`
- `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`
- `REVALIDATE_SECRET_TOKEN`
- `NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WC_API_URL`
- `NEXT_PUBLIC_WC_CONSUMER_KEY`, `NEXT_PUBLIC_WC_CONSUMER_SECRET`
- `NEXT_PUBLIC_TABBY_PUBLIC_KEY`, `NEXT_PUBLIC_TABBY_MERCHANT_CODE`
- `NEXT_PUBLIC_TAMARA_PUBLIC_KEY`, `NEXT_PUBLIC_TAMARA_COUNTRY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_MYFATOORAH_API_KEY`, `NEXT_PUBLIC_MYFATOORAH_COUNTRY`, `NEXT_PUBLIC_MYFATOORAH_TEST_MODE`

## Important: Do NOT Do These
- Do NOT add `output: 'standalone'` to `next.config.ts` (causes 403)
- Do NOT change the start script from `next start -H 0.0.0.0 -p ${PORT:-3000}`
- Do NOT force push to main (auto-deploys to production)
- Do NOT remove `PORT` env var from Hostinger settings
- Do NOT stop all processes via Hostinger hPanel without immediately restarting them
