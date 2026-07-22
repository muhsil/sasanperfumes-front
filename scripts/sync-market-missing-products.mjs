import fs from "fs";
import path from "path";

// Usage: node scripts/sync-market-missing-products.mjs [--dry-run] [--slugs=slug-one,slug-two]

const SOURCE_BASE = "https://cms.sasanperfumes.com/wp-json/wc/v3";
const MARKETS = ["qa", "om", "sa"];
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugsArg = args.find((arg) => arg.startsWith("--slugs="));
const requestedSlugs = slugsArg
  ? slugsArg.slice("--slugs=".length).split(",").map((slug) => slug.trim()).filter(Boolean)
  : [];
const REQUIRED_CATEGORIES = [
  { slug: "extrait-de-parfum", name: "Extrait de Parfum" },
  { slug: "perfume", name: "Perfume" },
  { slug: "new-products", name: "New Products" },
];
const CATEGORY_ALIASES = new Map([
  ["woman-perfumes", "womens-perfumes"],
]);

function loadEnvFile(filePath, env) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!env[key]) {
      env[key] = value;
    }
  }
}

function loadEnvSources() {
  const env = { ...process.env };

  loadEnvFile(path.join(process.cwd(), ".env"), env);
  loadEnvFile(path.join(process.cwd(), ".env.local"), env);

  const backupRoot = path.join(process.cwd(), ".env.backups");
  if (fs.existsSync(backupRoot)) {
    const stack = [backupRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }
        if (entry.isFile() && entry.name === "hostinger-shapehive-env.json") {
          try {
            const data = JSON.parse(fs.readFileSync(entryPath, "utf8"));
            for (const variable of Array.isArray(data.variables) ? data.variables : []) {
              if (variable && variable.key && env[variable.key] === undefined) {
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

function basicAuth(env, market) {
  const upper = market.toUpperCase();
  const key = env[`WC_CONSUMER_KEY_${upper}`] || env.WC_CONSUMER_KEY;
  const secret = env[`WC_CONSUMER_SECRET_${upper}`] || env.WC_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error(`Missing WooCommerce credentials for ${market}`);
  }
  return Buffer.from(`${key}:${secret}`).toString("base64");
}

function headersFor(env, market) {
  return {
    Authorization: `Basic ${basicAuth(env, market)}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`HTTP ${response.status} for ${url}: ${message}`);
  }

  return data;
}

async function listAll(url, init = {}) {
  const data = await fetchJson(url, init);
  return Array.isArray(data) ? data : [];
}

async function listAllPages(baseUrl, pathName, authHeaders) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const separator = pathName.includes("?") ? "&" : "?";
    const pageItems = await listAll(`${baseUrl}/${pathName}${separator}per_page=100&page=${page}`, {
      headers: authHeaders,
    });
    items.push(...pageItems);
    if (pageItems.length < 100) {
      return items;
    }
  }
}

async function getProductBySlug(baseUrl, authHeaders, slug) {
  const url = `${baseUrl}/products?slug=${encodeURIComponent(slug)}&status=publish&per_page=1`;
  const products = await listAll(url, { headers: authHeaders });
  return products[0] || null;
}

async function getCategories(baseUrl, authHeaders) {
  const url = `${baseUrl}/products/categories?per_page=100&orderby=id&order=asc`;
  const categories = await listAll(url, { headers: authHeaders });
  return new Map(categories.map((category) => [String(category.slug || "").toLowerCase(), category]));
}

async function getTags(baseUrl, authHeaders) {
  const url = `${baseUrl}/products/tags?per_page=100&orderby=id&order=asc`;
  const tags = await listAll(url, { headers: authHeaders });
  return new Map(tags.map((tag) => [String(tag.slug || "").toLowerCase(), tag]));
}

async function ensureCategory(baseUrl, authHeaders, categoryMap, slug, name) {
  const normalized = String(slug || "").toLowerCase();
  const alias = CATEGORY_ALIASES.get(normalized);
  const existing = categoryMap.get(normalized) || (alias ? categoryMap.get(alias) : null);
  if (existing) {
    return existing;
  }

  const payload = {
    name,
    slug,
  };
  const created = await fetchJson(`${baseUrl}/products/categories`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  categoryMap.set(String(created.slug || "").toLowerCase(), created);
  return created;
}

async function ensureTag(baseUrl, authHeaders, tagMap, slug, name) {
  const normalized = String(slug || "").toLowerCase();
  const existing = tagMap.get(normalized);
  if (existing) {
    return existing;
  }

  const created = await fetchJson(`${baseUrl}/products/tags`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name, slug }),
  });
  tagMap.set(String(created.slug || "").toLowerCase(), created);
  return created;
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
  }
  return value;
}

function buildCategoryRefs(sourceProduct, categoryMap, targetMarket) {
  const refs = [];
  for (const category of sourceProduct.categories || []) {
    const slug = String(category.slug || "").toLowerCase();
    const alias = CATEGORY_ALIASES.get(slug);
    const target = categoryMap.get(slug) || (alias ? categoryMap.get(alias) : null);
    if (target) {
      refs.push({ id: target.id });
      continue;
    }

    if (targetMarket) {
      // The target market should have all relevant categories seeded before
      // product creation, but keep the original slug available if the site is
      // missing something unexpected.
      refs.push({ name: category.name, slug: category.slug });
    }
  }
  return refs;
}

function buildTagRefs(sourceProduct, tagMap) {
  const refs = [];
  for (const tag of sourceProduct.tags || []) {
    const slug = String(tag.slug || "").toLowerCase();
    const target = tagMap.get(slug);
    if (target) {
      refs.push({ id: target.id });
    }
  }
  return refs;
}

async function syncProductToMarket(env, market, sourceProduct, existingProductsBySlug, categoryMap, tagMap) {
  const baseUrl = `https://cms.sasanperfumes.com/${market}/wp-json/wc/v3`;
  const authHeaders = headersFor(env, market);

  const existing = existingProductsBySlug.get(sourceProduct.slug);
  if (existing) {
    return { market, slug: sourceProduct.slug, action: "exists", id: existing.id };
  }

  if (dryRun) {
    return { market, slug: sourceProduct.slug, type: sourceProduct.type, action: "missing", id: null };
  }

  for (const category of REQUIRED_CATEGORIES) {
    await ensureCategory(baseUrl, authHeaders, categoryMap, category.slug, category.name);
  }

  for (const category of sourceProduct.categories || []) {
    if (!category?.slug) continue;
    await ensureCategory(baseUrl, authHeaders, categoryMap, category.slug, category.name || category.slug);
  }

  for (const tag of sourceProduct.tags || []) {
    if (!tag?.slug) continue;
    await ensureTag(baseUrl, authHeaders, tagMap, tag.slug, tag.name || tag.slug);
  }

  const categoryRefs = buildCategoryRefs(sourceProduct, categoryMap, market);
  const tagRefs = buildTagRefs(sourceProduct, tagMap);

  const payload = {
    name: sourceProduct.name,
    slug: sourceProduct.slug,
    sku: sourceProduct.sku || undefined,
    type: sourceProduct.type || "simple",
    status: "publish",
    catalog_visibility: sourceProduct.catalog_visibility || "visible",
    description: sourceProduct.description || "",
    short_description: sourceProduct.short_description || "",
    regular_price: String(sourceProduct.regular_price || sourceProduct.price || "75"),
    sale_price: String(sourceProduct.sale_price || ""),
    weight: String(sourceProduct.weight || ""),
    manage_stock: Boolean(sourceProduct.manage_stock),
    stock_quantity: Number.isFinite(Number(sourceProduct.stock_quantity)) ? Number(sourceProduct.stock_quantity) : 50,
    stock_status: sourceProduct.stock_status || "instock",
    virtual: Boolean(sourceProduct.virtual),
    tax_status: sourceProduct.tax_status || "taxable",
    tax_class: sourceProduct.tax_class || "",
    attributes: (sourceProduct.attributes || []).map((attribute) => ({
      name: attribute.name,
      visible: attribute.visible !== false,
      variation: Boolean(attribute.variation),
      options: Array.isArray(attribute.options) ? attribute.options : [],
    })),
    images: (sourceProduct.images || []).map((image) => ({
      src: image.src,
      name: image.name || sourceProduct.name,
      alt: image.alt || sourceProduct.name,
    })),
    categories: categoryRefs,
    tags: tagRefs,
    meta_data: (sourceProduct.meta_data || [])
      .filter((meta) => {
        const key = String(meta?.key || "");
        return key.startsWith("_yoast_") || key.startsWith("_wpml_");
      })
      .map((meta) => ({
        key: meta.key,
        value: normalizeValue(meta.value),
      })),
  };

  let created;
  try {
    created = await fetchJson(`${baseUrl}/products`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("product_invalid_sku")) {
      throw error;
    }

    const payloadWithoutSku = { ...payload };
    delete payloadWithoutSku.sku;
    created = await fetchJson(`${baseUrl}/products`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payloadWithoutSku),
    });
  }

  return { market, slug: sourceProduct.slug, action: "created", id: created.id };
}

async function main() {
  const env = loadEnvSources();
  const sourceHeaders = headersFor(env, "intl");

  const sourceProducts = requestedSlugs.length > 0
    ? await Promise.all(requestedSlugs.map(async (slug) => {
        const product = await getProductBySlug(SOURCE_BASE, sourceHeaders, slug);
        if (!product) throw new Error(`Source product missing: ${slug}`);
        return product;
      }))
    : await listAllPages(SOURCE_BASE, "products?status=publish", sourceHeaders);

  const results = [];
  for (const market of MARKETS) {
    const marketBaseUrl = `https://cms.sasanperfumes.com/${market}/wp-json/wc/v3`;
    const marketProducts = await listAllPages(
      marketBaseUrl,
      "products?status=any",
      headersFor(env, market)
    );
    const existingProductsBySlug = new Map(marketProducts.map((product) => [product.slug, product]));
    const categoryMap = dryRun ? new Map() : await getCategories(marketBaseUrl, headersFor(env, market));
    const tagMap = dryRun ? new Map() : await getTags(marketBaseUrl, headersFor(env, market));

    for (const product of sourceProducts) {
      const result = await syncProductToMarket(
        env,
        market,
        product,
        existingProductsBySlug,
        categoryMap,
        tagMap
      );
      results.push(result);
      const label = `${market} ${product.slug}`;
      if (result.action === "created") {
        console.log(`[created] ${label} -> id ${result.id}`);
      } else if (result.action === "missing") {
        console.log(`[missing] ${label} (${result.type || "simple"})`);
      } else if (requestedSlugs.length > 0) {
        console.log(`[exists]   ${label} -> id ${result.id}`);
      }
    }
  }

  console.log("\nSummary:");
  for (const market of MARKETS) {
    const created = results.filter((result) => result.market === market && result.action === "created").length;
    const missing = results.filter((result) => result.market === market && result.action === "missing").length;
    console.log(`${market}: ${created} products created${dryRun ? `, ${missing} missing` : ""}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
