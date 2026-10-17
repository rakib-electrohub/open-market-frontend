import { getPublicSitemapEntries } from "@/server/catalog";
import { sitemapUrlsetResponse } from "@/lib/sitemap-xml";

const SITEMAP_CHUNK_SIZE = 5000;

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { entity, chunk: rawChunk } = await params;
  if (!['products', 'sellers'].includes(entity)) {
    return new Response("Not found", { status: 404 });
  }

  const chunk = Number.parseInt(rawChunk, 10);
  if (!Number.isSafeInteger(chunk) || chunk < 0) {
    return new Response("Not found", { status: 404 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const entries = await getPublicSitemapEntries(entity, chunk * SITEMAP_CHUNK_SIZE, SITEMAP_CHUNK_SIZE);
  const routePrefix = entity === "products" ? "/product/" : "/store/";
  const urls = entries.map((entry) => ({
    url: `${baseUrl}${routePrefix}${encodeURIComponent(entry.id)}`,
    lastModified: entry.last_modified,
    changeFrequency: "weekly",
    priority: entity === "products" ? 0.8 : 0.6,
  }));

  return sitemapUrlsetResponse(urls);
}