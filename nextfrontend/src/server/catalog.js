import { cache } from "react";
import { unstable_cache } from "next/cache";

const internalApiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const cacheSeconds = 60 * 60;

async function readApi(path, options = {}, tags = []) {
  try {
    const response = await fetch(`${internalApiUrl}/api${path}`, {
      ...options,
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function filterProducts(query, order, limit, offset = 0) {
  return (await readApi(
    "/entities/Product/filter",
    { method: "POST", body: JSON.stringify({ query, order, limit, offset }) },
    ["products"]
  )) || [];
}

const getCachedHomepageData = unstable_cache(async (limit = 10) => {
  const settings = await readApi("/entities/SiteSettings/list", {}, ["settings"]);

  const settingsMap = {};
  (settings || []).forEach((setting) => {
    if (settingsMap[setting.key] === undefined) settingsMap[setting.key] = setting.value;
  });

  const configuredLimit = Math.min(20, Math.max(1, Number(settingsMap.home_products_limit) || limit));
  const [featured, newest, trending, flashProducts, banners] = await Promise.all([
    filterProducts({ is_active: true, approval_status: "approved", is_featured: true }, "-created_date", configuredLimit),
    filterProducts({ is_active: true, approval_status: "approved" }, "-created_date", configuredLimit),
    filterProducts({ is_active: true, approval_status: "approved" }, "-sold_count", configuredLimit),
    filterProducts({ is_active: true, approval_status: "approved" }, "-flash_sale_end", configuredLimit),
    readApi("/entities/Banner/filter", { method: "POST", body: JSON.stringify({ query: { is_active: true, position: "hero" }, order: "sort_order" }) }, ["banners"]),
  ]);

  return {
    featured: featured || [],
    newest: newest || [],
    trending: trending || [],
    flashProducts: flashProducts || [],
    banners: banners || [],
    settings: settingsMap,
    limit: configuredLimit,
  };
}, ["homepage-data"], { revalidate: cacheSeconds, tags: ["homepage", "products", "banners", "settings"] });

export const getHomepageData = cache((limit = 10) => getCachedHomepageData(limit));

export const getSiteSettings = cache(async () => {
  const settings = await readApi("/entities/SiteSettings/list", {}, ["settings"]);
  return (settings || []).reduce((map, setting) => {
    if (map[setting.key] === undefined) map[setting.key] = setting.value;
    return map;
  }, {});
});

export const getCategories = cache(async () => (
  await readApi("/entities/Category/list?order=-created_date&limit=200", {}, ["categories"])
) || []);

const getCachedProductsPage = unstable_cache(async ({ page = 1, limit = 30, query = {}, order = "-sold_count" } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const products = await filterProducts(query, order, limit, (safePage - 1) * limit);
  return { products, page: safePage, limit, hasMore: products.length === limit };
}, ["products-page"], { revalidate: cacheSeconds, tags: ["products"] });

export const getProductsPage = cache((options = {}) => getCachedProductsPage(options));

export const getProductById = cache((id) => unstable_cache(
  async () => await readApi(`/entities/Product/${encodeURIComponent(id)}`, {}, ["products", `product:${id}`]),
  ["product-by-id", String(id)],
  { revalidate: cacheSeconds, tags: ["products", `product:${id}`] }
)());

export const getProductReviews = cache((id) => unstable_cache(
  async () => await readApi(
    "/entities/Review/filter",
    { method: "POST", body: JSON.stringify({ query: { product_id: id, is_approved: true } }) },
    ["reviews", `product:${id}:reviews`]
  ) || [],
  ["product-reviews", String(id)],
  { revalidate: cacheSeconds, tags: ["reviews", `product:${id}:reviews`] }
)());
