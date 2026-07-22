import type { MetadataRoute } from "next";

export function buildSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const altLinks = entry.alternates?.languages
        ? Object.entries(entry.alternates.languages)
            .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`)
            .join("\n")
        : "";
      const lastmod = entry.lastModified
        ? `\n    <lastmod>${entry.lastModified instanceof Date ? entry.lastModified.toISOString() : entry.lastModified}</lastmod>`
        : "";
      return `  <url>
    <loc>${entry.url}</loc>${lastmod}
    <changefreq>${entry.changeFrequency || "weekly"}</changefreq>
    <priority>${entry.priority ?? 0.5}</priority>
${altLinks}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;
}

export function buildSitemapIndexXml(sitemaps: { url: string; lastModified?: Date }[]): string {
  const entries = sitemaps
    .map((s) => `  <sitemap>
    <loc>${s.url}</loc>${s.lastModified ? `\n    <lastmod>${s.lastModified.toISOString()}</lastmod>` : ""}
  </sitemap>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}
