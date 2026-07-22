import fs from "fs";
import path from "path";

// Usage: node scripts/sync-market-hero.mjs --dry-run
// Live mode requires WP_ADMIN_USER and WP_ADMIN_PASSWORD.

const CMS_ORIGIN = "https://cms.sasanperfumes.com";
const MARKETS = ["qa", "om", "sa"];
const dryRun = process.argv.includes("--dry-run");

function loadEnvFile(filePath, env) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!env[key]) env[key] = value;
  }
}

function loadEnv() {
  const env = { ...process.env };
  loadEnvFile(path.join(process.cwd(), ".env"), env);
  loadEnvFile(path.join(process.cwd(), ".env.local"), env);

  const backupRoot = path.join(process.cwd(), ".env.backups");
  if (fs.existsSync(backupRoot)) {
    const stack = [backupRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.name === "hostinger-shapehive-env.json") {
          try {
            const data = JSON.parse(fs.readFileSync(entryPath, "utf8"));
            for (const variable of Array.isArray(data.variables) ? data.variables : []) {
              if (variable?.key && env[variable.key] === undefined) {
                env[variable.key] = String(variable.value ?? "");
              }
            }
          } catch {
            // Ignore malformed backup snapshots.
          }
        }
      }
    }
  }
  return env;
}

class CookieSession {
  constructor() {
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }

  storeCookies(response) {
    for (const rawCookie of response.headers.getSetCookie()) {
      const pair = rawCookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }

  async request(url, init = {}, redirects = 0) {
    if (redirects > 10) throw new Error(`Too many redirects for ${url}`);
    const headers = new Headers(init.headers || {});
    const cookies = this.cookieHeader();
    if (cookies) headers.set("Cookie", cookies);
    const response = await fetch(url, { ...init, headers, redirect: "manual" });
    this.storeCookies(response);

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      const nextUrl = new URL(response.headers.get("location"), url).toString();
      return this.request(nextUrl, { method: "GET" }, redirects + 1);
    }
    return response;
  }
}

async function fetchJson(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}sync=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function appendBoolean(body, name, value) {
  if (value) body.append(name, "1");
}

function buildHeroForm(hero, nonce) {
  const body = new URLSearchParams();
  body.set("_wpnonce", nonce);
  body.set("_wp_http_referer", "/wp-admin/admin.php?page=sasanperfumes-settings&tab=hero");
  body.set("sasanperfumes_current_tab", "hero");
  body.set("sasanperfumes_save_home_settings", "Save Settings");
  appendBoolean(body, "sasanperfumes_hero_enabled", hero.enabled);
  appendBoolean(body, "sasanperfumes_hero_hide_mobile", hero.hideOnMobile);
  appendBoolean(body, "sasanperfumes_hero_hide_desktop", hero.hideOnDesktop);
  appendBoolean(body, "sasanperfumes_hero_autoplay", hero.autoplay);
  body.set("sasanperfumes_hero_autoplay_delay", String(hero.autoplayDelay || 5000));
  appendBoolean(body, "sasanperfumes_hero_loop", hero.loop);

  const fieldMap = {
    image: "image",
    mobile: "mobileImage",
    image_ar: "imageAr",
    mobile_ar: "mobileImageAr",
    link: "link",
    slide_type: "slideType",
    video_url: "videoUrl",
    video_mobile: "videoMobile",
    video_ar: "videoAr",
    video_mobile_ar: "videoMobileAr",
    poster_url: "posterUrl",
    poster_mobile: "posterMobile",
    poster_ar: "posterAr",
    poster_mobile_ar: "posterMobileAr",
    title_en: "title",
    title_ar: "titleAr",
    subtitle_en: "subtitle",
    subtitle_ar: "subtitleAr",
    cta_label_en: "ctaLabel",
    cta_label_ar: "ctaLabelAr",
  };

  for (const [index, slide] of (hero.slides || []).entries()) {
    const prefix = `sasanperfumes_hero_slides[${index}]`;
    body.append(`${prefix}[enabled]`, "0");
    if (slide.enabled) body.append(`${prefix}[enabled]`, "1");
    for (const [formKey, apiKey] of Object.entries(fieldMap)) {
      body.set(`${prefix}[${formKey}]`, String(slide[apiKey] || ""));
    }
  }

  return body;
}

function comparableHero(hero) {
  return {
    enabled: Boolean(hero.enabled),
    hideOnMobile: Boolean(hero.hideOnMobile),
    hideOnDesktop: Boolean(hero.hideOnDesktop),
    autoplay: Boolean(hero.autoplay),
    autoplayDelay: Number(hero.autoplayDelay),
    loop: Boolean(hero.loop),
    slides: (hero.slides || []).map((slide) => ({
      ...slide,
      enabled: Boolean(slide.enabled),
    })),
  };
}

async function main() {
  const env = loadEnv();
  const sourceSettings = await fetchJson(`${CMS_ORIGIN}/wp-json/sasanperfumes/v1/home-settings`);
  const sourceHero = comparableHero(sourceSettings.hero);
  console.log(`Source hero: ${sourceHero.slides.length} slides, autoplay ${sourceHero.autoplayDelay}ms`);
  if (dryRun) {
    for (const market of MARKETS) {
      const targetSettings = await fetchJson(`${CMS_ORIGIN}/${market}/wp-json/sasanperfumes/v1/home-settings`);
      const matches = JSON.stringify(comparableHero(targetSettings.hero)) === JSON.stringify(sourceHero);
      console.log(`${market}: ${matches ? "already matches" : "update required"}`);
    }
    return;
  }

  if (!env.WP_ADMIN_USER || !env.WP_ADMIN_PASSWORD) {
    throw new Error("Missing WP_ADMIN_USER or WP_ADMIN_PASSWORD");
  }

  const session = new CookieSession();
  await session.request(`${CMS_ORIGIN}/wp-login.php`);
  const loginBody = new URLSearchParams({
    log: env.WP_ADMIN_USER,
    pwd: env.WP_ADMIN_PASSWORD,
    "wp-submit": "Log In",
    redirect_to: `${CMS_ORIGIN}/wp-admin/`,
    testcookie: "1",
  });
  const loginResponse = await session.request(`${CMS_ORIGIN}/wp-login.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${CMS_ORIGIN}/wp-login.php`,
    },
    body: loginBody,
  });
  const loginHtml = await loginResponse.text();
  if (loginResponse.url.includes("wp-login.php") || loginHtml.includes("login_error")) {
    throw new Error("WordPress admin login failed");
  }

  for (const market of MARKETS) {
    const adminUrl = `${CMS_ORIGIN}/${market}/wp-admin/admin.php?page=sasanperfumes-settings&tab=hero`;
    const settingsResponse = await session.request(adminUrl);
    const settingsHtml = await settingsResponse.text();
    const nonce = settingsHtml.match(/name=["']_wpnonce["'][^>]*value=["']([^"']+)["']/)?.[1]
      || settingsHtml.match(/value=["']([^"']+)["'][^>]*name=["']_wpnonce["']/)?.[1];
    if (!nonce) throw new Error(`Could not read hero nonce for ${market}`);

    const saveResponse = await session.request(adminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: adminUrl,
      },
      body: buildHeroForm(sourceHero, nonce),
    });
    if (!saveResponse.ok) throw new Error(`Hero save failed for ${market}: HTTP ${saveResponse.status}`);
    await saveResponse.text();

    const targetSettings = await fetchJson(`${CMS_ORIGIN}/${market}/wp-json/sasanperfumes/v1/home-settings`);
    const matches = JSON.stringify(comparableHero(targetSettings.hero)) === JSON.stringify(sourceHero);
    if (!matches) throw new Error(`Hero verification failed for ${market}`);
    console.log(`${market}: hero synced and verified`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
