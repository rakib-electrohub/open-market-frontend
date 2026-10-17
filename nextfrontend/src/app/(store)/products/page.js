import LegacyPage from "@/components/LegacyPage";
import { getCategories, getProductsPage } from "@/server/catalog";
import { buildCollectionPageSchema, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const category = params?.category || params?.main_category || params?.subcategory || "";
  const title = category ? `${category} Products` : "Products";
  const description = category
    ? `Shop ${category} products from trusted Open Market sellers with competitive pricing and verified quality.`
    : "Browse a wide range of products from trusted Open Market sellers, including top deals, new arrivals, and bestsellers.";

  return buildPageMetadata({
    title,
    description,
    path: category ? `/products?${new URLSearchParams({ ...(params || {}), ...(category ? { category } : {}) }).toString()}` : "/products",
    openGraphTitle: title,
    openGraphDescription: description,
    keywords: ["products", category || "marketplace", "online shopping"].filter(Boolean),
  });
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }) {
	const params = await searchParams;
	const page = Math.max(1, Number(params?.page) || 1);
	const [productsPage, categories] = await Promise.all([
		getProductsPage({ page, limit: 30, query: { is_active: true, approval_status: "approved" }, order: "-sold_count" }),
		getCategories(),
	]);
	return <LegacyPage page="Products" initialData={{ ...productsPage, categories }} />;
}