import LegacyPage from "@/components/LegacyPage";
import { getCategories, getProductsPage } from "@/server/catalog";

export const metadata = { title: "Products", description: "Browse products from trusted Open Market sellers." };
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