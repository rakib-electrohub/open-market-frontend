const internalSiteUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function invalidateEntityCache(entity, record = {}) {
  const id = record.id;
  const tags = [];
  const paths = [];

  if (entity === "Product") {
    tags.push("products", "homepage");
    if (id) {
      tags.push(`product:${id}`);
      paths.push(`/product/${id}`);
    }
    paths.push("/", "/products", "/sitemap.xml", "/robots.txt");
  } else if (entity === "Seller") {
    tags.push("sellers");
    if (id) paths.push(`/store/${id}`);
    paths.push("/sitemap.xml", "/robots.txt");
  } else if (entity === "Review") {
    tags.push("reviews");
    if (record.product_id) tags.push(`product:${record.product_id}:reviews`, `product:${record.product_id}`);
    if (record.product_id) paths.push(`/product/${record.product_id}`);
  } else if (entity === "Category") {
    tags.push("categories", "homepage", "products");
    paths.push("/", "/products", "/sitemaps/static.xml", "/sitemap.xml");
  } else if (entity === "Banner") {
    tags.push("banners", "homepage");
    paths.push("/");
  } else if (entity === "SiteSettings") {
    tags.push("settings", "homepage");
    paths.push("/");
  }

  if (!tags.length && !paths.length) return;

  try {
    await fetch(`${internalSiteUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": process.env.REVALIDATE_SECRET || "",
      },
      body: JSON.stringify({ tags, paths }),
    });
  } catch (error) {
    console.warn("Cache invalidation request failed:", error.message);
  }
}
