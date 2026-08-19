# CMS must-use plugins

These files live on the WordPress host at:

```
~/domains/cms.sasanperfumes.com/public_html/wp-content/mu-plugins/
```

Everything in `mu-plugins/` loads automatically on **every site in the network**
(`cms.sasanperfumes.com` and the `/qa`, `/om`, `/sa` markets) with no activation
step. That is why these fixes are here rather than inside
`anbar-frontend-settings` — the active plugin folder on the server is named
`anbar-frontend-settings`, not `sasanperfumes-frontend-settings` as in this
repo, and it is deployed by manually uploading a zip. An edit made inside it is
lost on the next upload; an mu-plugin survives.

Deploy by copying a file to the path above, then check it parses:

```bash
ssh sasan-cms "php -l ~/domains/cms.sasanperfumes.com/public_html/wp-content/mu-plugins/<file>.php"
```

## What each one does

| File | Purpose |
| --- | --- |
| `sasan-fragrance-fields.php` | Adds the **Fragrance** tab to the product editor (Inspired By, Top/Middle/Base note) and exposes the values over the REST and Store APIs as `sasan_fragrance`. The storefront previously scraped these out of the description prose. |
| `fix-registration-username.php` | WordPress rejects usernames that do not survive `sanitize_user($v, true)`, so plus-addressed emails failed registration with *"Please provide a valid account username."* Normalises the username on the incoming `/customers/ensure` request. Mirrors upstream commit `82d2fc0`; remove once the plugin ships that fix. |
| `rename-on-hold-to-shipped.php` | Relabels the `wc-on-hold` order status as **Shipped** network-wide. Replaces a per-site WPCode snippet that existed only on the main site, leaving the market sites showing "On hold". Label only — no order data is changed. |
| `fix-shipped-email.php` | The shipped email never sent: the plugin listens for a literal `shipped` status, but this store has none — "Shipped" *is* `on-hold`. Bridges the two. Only treats `on-hold` as shipped when the order arrives from `processing` or `completed`, so a payment hold cannot tell a customer their parcel shipped. |
| `fix-duplicate-new-order-email.php` | Admins received two "New order" emails per order: WooCommerce sends one, and WPML's WooCommerce Multilingual re-sends it per recipient in that recipient's language. Removes the WCML resend and keeps WooCommerce's. |
| `hide-noisy-order-notes.php` | Hides machine-generated order notes (stock level changes, WooCommerce's `Email "…" sent` confirmations) from the admin panel. Display only — nothing is deleted, and status changes, customer notes and staff notes all remain visible. |
| `cli-skip-headless-redirect.php` | `sasanperfumes_Frontend_Urls` redirects any non-admin/ajax/cron request to the headless storefront, which includes **WP-CLI** — silently aborting any command that needed plugin hooks. Marks CLI runs as backend. Web requests are unaffected. |
