import LegacyPage from "@/components/LegacyPage";
import { getCategories, getProductsPage } from "@/server/catalog";
import { buildPageMetadata } from "@/lib/seo";
import { resolveCategoryFromSlug } from "@/utils/categories";

export async function generateMetadata({ params }) {
  const { category: categorySlug } = await params;
  const resolvedCategory = resolveCategoryFromSlug(categorySlug, await getCategories());
  const category = resolvedCategory || "Products";
  const title = category === "Products" ? "Products" : `${category} Products`;
  const description = category === "Products"
    ? "Browse a wide range of products from trusted Open Market sellers, including top deals, new arrivals, and bestsellers."
    : `Explore ${category} products from trusted Open Market sellers with competitive pricing and verified quality.`;

  return buildPageMetadata({
    title,
    description,
    path: category === "Products" ? "/products" : `/products/${encodeURIComponent(categorySlug || category)}`,
    openGraphTitle: title,
    openGraphDescription: description,
    keywords: [category, "Open Market", "products", "online shopping"].filter(Boolean),
  });
}

export const dynamic = "force-dynamic";

export default async function CategoryProductsPage({ params, searchParams }) {
  const { category: categorySlug } = await params;
  const queryParams = await searchParams;
  const category = resolveCategoryFromSlug(categorySlug, await getCategories()) || "";
  const page = Math.max(1, Number(queryParams?.page) || 1);
  const subcategory = queryParams?.subcategory || "";
  const filters = category
    ? {
        is_active: true,
        approval_status: "approved",
        ...(subcategory ? { subcategory } : {}),
        $or: [{ main_category: category }, { category }, { subcategory: category }],
      }
    : { is_active: true, approval_status: "approved" };

  const [productsPage, categories] = await Promise.all([
    getProductsPage({ page, limit: 30, query: filters, order: "-sold_count" }),
    getCategories(),
  ]);

  return <LegacyPage page="Products" initialData={{ ...productsPage, categories, category }} />;
}
