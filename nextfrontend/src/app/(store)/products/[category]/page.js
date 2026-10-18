import LegacyPage from "@/components/LegacyPage";
import { getCategories, getProductsPage } from "@/server/catalog";
import { buildPageMetadata } from "@/lib/seo";
import { resolveCategoryFromSlug } from "@/utils/categories";
import { getProductSortOrder, isProductSort } from "@/utils/productSorting";

export async function generateMetadata({ params, searchParams }) {
  const { category: categorySlug } = await params;
  const queryParams = await searchParams;
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
    noindex: Object.keys(queryParams || {}).length > 0,
    nofollow: false,
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
  const searchTerm = typeof queryParams?.search === "string" ? queryParams.search : "";
  const sort = isProductSort(queryParams?.sort) ? queryParams.sort : searchTerm.trim() ? "relevance" : "popularity";
  const filters = category
    ? {
        is_active: true,
        approval_status: "approved",
        ...(subcategory ? { subcategory } : {}),
        $or: [{ main_category: category }, { category }, { subcategory: category }],
      }
    : { is_active: true, approval_status: "approved" };

  const [productsPage, categories] = await Promise.all([
    getProductsPage({
      page,
      limit: 30,
      query: filters,
      order: getProductSortOrder(sort),
      searchTerm,
      sort,
    }),
    getCategories(),
  ]);

  return <LegacyPage page="Products" initialData={{ ...productsPage, categories, category }} />;
}
