import fs from "fs";
import path from "path";

// Mirrors UAE product publish dates so every market's New Products section has the same order.
// Usage: node scripts/sync-market-new-product-order.mjs [--dry-run] [--count=20]

const API_ROOT = "https://cms.sasanperfumes.com";
const SOURCE_MARKET = "intl";
const DEFAULT_TARGET_MARKETS = ["qa", "om", "sa"];
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const countArg = args.find((arg) => arg.startsWith("--count="));
const displayCount = Math.max(1, Number.parseInt(countArg?.split("=")[1] || "20", 10));
const marketsArg = args.find((arg) => arg.startsWith("--markets="));
const targetMarkets = marketsArg
  ? marketsArg.split("=")[1].split(",").map((market) => market.trim().toLowerCase()).filter(Boolean)
  : DEFAULT_TARGET_MARKETS;

for (const market of targetMarkets) {
  if (!DEFAULT_TARGET_MARKETS.includes(market)) throw new Error(`Unsupported market: ${market}`);
}

function loadEnvFile(filePath, env) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([^#][^=]*)=(.*)$/);
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
  if (!fs.existsSync(backupRoot)) return env;

  const directories = [backupRoot];
  while (directories.length) {
    const directory = directories.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        directories.push(entryPath);
      } else if (entry.name === "hostinger-shapehive-env.json") {
        try {
          const snapshot = JSON.parse(fs.readFileSync(entryPath, "utf8"));
          for (const variable of snapshot.variables || []) {
            if (variable?.key && env[variable.key] === undefined) env[variable.key] = String(variable.value ?? "");
          }
        } catch {
          // Ignore malformed backup snapshots and continue with other credential sources.
        }
      }
    }
  }
  return env;
}

function marketApi(market) {
  const prefix = market === SOURCE_MARKET ? "" : `/${market}`;
  return `${API_ROOT}${prefix}/wp-json/wc/v3`;
}

function authHeaders(env, market) {
  const suffix = market === SOURCE_MARKET ? "" : `_${market.toUpperCase()}`;
  const key = env[`WC_CONSUMER_KEY${suffix}`] || env.WC_CONSUMER_KEY;
  const secret = env[`WC_CONSUMER_SECRET${suffix}`] || env.WC_CONSUMER_SECRET;
  if (!key || !secret) throw new Error(`Missing WooCommerce credentials for ${market}`);

  return {
    Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}: ${text}`);
  return { data, headers: response.headers };
}

async function listPublishedProducts(env, market) {
  const products = [];
  const headers = authHeaders(env, market);
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${marketApi(market)}/products?status=publish&per_page=100&page=${page}&orderby=date&order=desc`;
    const result = await fetchJson(url, { headers });
    products.push(...result.data);
    totalPages = Number.parseInt(result.headers.get("x-wp-totalpages") || "1", 10);
    page += 1;
  } while (page <= totalPages);

  return products;
}

function topSlugs(products) {
  return products.slice(0, displayCount).map((product) => product.slug);
}

function sameOrder(left, right) {
  return left.length === right.length && left.every((slug, index) => slug === right[index]);
}

async function updateDates(env, market, updates) {
  const headers = authHeaders(env, market);
  for (let index = 0; index < updates.length; index += 50) {
    const chunk = updates.slice(index, index + 50);
    await fetchJson(`${marketApi(market)}/products/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ update: chunk }),
    });
  }
}

async function main() {
  const env = loadEnv();
  const sourceProducts = await listPublishedProducts(env, SOURCE_MARKET);
  const sourceBySlug = new Map(sourceProducts.map((product) => [product.slug, product]));
  const sourceTop = topSlugs(sourceProducts);

  console.log(`Source: ${sourceProducts.length} published products`);
  console.log(`Source top ${displayCount}: ${sourceTop.join(", ")}`);

  let hasMismatch = false;
  for (const market of targetMarkets) {
    const targetProducts = await listPublishedProducts(env, market);
    const targetTopBefore = topSlugs(targetProducts);
    const targetOnly = targetProducts.filter((product) => !sourceBySlug.has(product.slug));
    const updates = targetProducts.flatMap((target) => {
      const source = sourceBySlug.get(target.slug);
      if (!source || source.date_created === target.date_created) return [];
      return [{ id: target.id, date_created: source.date_created }];
    });

    const matchesBefore = sameOrder(sourceTop, targetTopBefore);
    hasMismatch ||= !matchesBefore || updates.length > 0;
    console.log(`\n${market.toUpperCase()}: ${targetProducts.length} published products`);
    console.log(`Before: ${matchesBefore ? "matches" : "DIFFERS"}; ${updates.length} publish dates to sync`);
    console.log(`Top ${displayCount}: ${targetTopBefore.join(", ")}`);
    if (targetOnly.length) {
      const sample = targetOnly.slice(0, 12).map((product) => product.slug).join(", ");
      console.log(`Target-only products left unchanged: ${targetOnly.length} (${sample}${targetOnly.length > 12 ? ", ..." : ""})`);
    }

    if (!dryRun && updates.length) await updateDates(env, market, updates);

    if (!dryRun) {
      const verifiedProducts = await listPublishedProducts(env, market);
      const targetTopAfter = topSlugs(verifiedProducts);
      const matchesAfter = sameOrder(sourceTop, targetTopAfter);
      console.log(`After: ${matchesAfter ? "matches" : "DIFFERS"}`);
      console.log(`Verified top ${displayCount}: ${targetTopAfter.join(", ")}`);
      if (!matchesAfter) process.exitCode = 1;
    }
  }

  if (dryRun) console.log(`\nDry run complete: ${hasMismatch ? "changes required" : "all markets already match"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
