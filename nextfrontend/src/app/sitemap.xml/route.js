import { getPublicSitemapCounts } from "@/server/catalog";
import { sitemapIndexResponse } from "@/lib/sitemap-xml";

const SITEMAP_CHUNK_SIZE = 5000;

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const counts = await getPublicSitemapCounts();
  const sitemapUrls = [`${baseUrl}/sitemaps/static.xml`];

  for (const [entity, count] of Object.entries(counts)) {
    const chunkCount = Math.ceil(count / SITEMAP_CHUNK_SIZE);
    for (let chunk = 0; chunk < chunkCount; chunk += 1) {
      sitemapUrls.push(`${baseUrl}/sitemaps/${entity}/${chunk}.xml`);
    }
  }

  return sitemapIndexResponse(sitemapUrls);
}