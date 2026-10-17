const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
})[character]);

const response = (xml) => new Response(xml, {
  headers: {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=3600",
  },
});

export const sitemapIndexResponse = (urls) => response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("")}</sitemapindex>`
);

export const sitemapUrlsetResponse = (entries) => response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => {
    const lastModified = entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : "";
    const changeFrequency = entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : "";
    const priority = Number.isFinite(Number(entry.priority)) ? `<priority>${Number(entry.priority)}</priority>` : "";
    return `<url><loc>${escapeXml(entry.url)}</loc>${lastModified}${changeFrequency}${priority}</url>`;
  }).join("")}</urlset>`
);