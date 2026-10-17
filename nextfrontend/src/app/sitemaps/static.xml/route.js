import { getCategories } from "@/server/catalog";
import { slugifyCategory } from "@/utils/categories";
import { sitemapUrlsetResponse } from "@/lib/sitemap-xml";

const publicRoutes = [
  ["/", 1, "daily"],
  ["/products", 0.9, "daily"],
  ["/categories", 0.8, "weekly"],
  ["/contact", 0.5, "monthly"],
  ["/customer-reviews", 0.4, "weekly"],
  ["/flash-sales", 0.7, "daily"],
  ["/faq", 0.5, "monthly"],
  ["/policy/return", 0.3, "yearly"],
  ["/policy/privacy", 0.3, "yearly"],
  ["/policy/terms", 0.3, "yearly"],
  ["/policy/shipping", 0.3, "yearly"],
];

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const categories = await getCategories();
  const staticEntries = publicRoutes.map(([path, priority, changeFrequency]) => ({
    url: `${baseUrl}${path}`,
    priority,
    changeFrequency,
  }));
  const categoryEntries = categories.flatMap((category) => {
    const name = typeof category === "string" ? category : category?.name || category?.title || "";
    const slug = category?.slug || slugifyCategory(name);
    if (!slug) return [];
    return [{
      url: `${baseUrl}/products/${encodeURIComponent(slug)}`,
      lastModified: category?.updated_date || category?.created_date,
      changeFrequency: "weekly",
      priority: 0.7,
    }];
  });

  return sitemapUrlsetResponse([...staticEntries, ...categoryEntries]);
}