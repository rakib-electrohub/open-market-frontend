import LegacyPage from "@/components/LegacyPage";
import { getCategories, getProductsPage } from "@/server/catalog";
import { buildPageMetadata } from "@/lib/seo";
import { slugifyCategory } from "@/utils/categories";
import { getProductSortOrder, isProductSort } from "@/utils/productSorting";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const category = params?.category || params?.main_category || "";
  const searchTerm = typeof params?.search === "string" ? params.search.trim() : "";
  const title = category ? `${category} Products` : "Products";
  const description = searchTerm
    ? `Search results for ${searchTerm} on Open Market.`
    : category
    ? `Shop ${category} products from trusted Open Market sellers with competitive pricing and verified quality.`
    : "Browse a wide range of products from trusted Open Market sellers, including top deals, new arrivals, and bestsellers.";
  const hasVariantParams = Object.keys(params || {}).some((key) => !["category", "main_category"].includes(key));

  return buildPageMetadata({
    title,
    description,
    path: category ? `/products/${encodeURIComponent(slugifyCategory(category))}` : "/products",
    noindex: hasVariantParams,
    nofollow: false,
    openGraphTitle: title,
    openGraphDescription: description,
    keywords: ["products", category || "marketplace", "online shopping"].filter(Boolean),
  });
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }) {
	const params = await searchParams;
	const page = Math.max(1, Number(params?.page) || 1);
	const sort = isProductSort(params?.sort) ? params.sort : "popularity";
	const searchTerm = typeof params?.search === "string" ? params.search : "";
	const [productsPage, categories] = await Promise.all([
		getProductsPage({
			page,
			limit: 30,
			query: { is_active: true, approval_status: "approved" },
			order: getProductSortOrder(sort),
			searchTerm,
			sort,
		}),
		getCategories(),
	]);
	return <LegacyPage page="Products" initialData={{ ...productsPage, categories }} />;
}