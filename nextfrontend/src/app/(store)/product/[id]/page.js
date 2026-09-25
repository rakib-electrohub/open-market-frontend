import LegacyPage from "@/components/LegacyPage";
import { getProductById, getProductReviews } from "@/server/catalog";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  return {
    title: product?.name || `Product ${id}`,
    description: product?.short_description || product?.description || "View product details, price, availability, and seller information.",
    alternates: { canonical: `/product/${id}` },
    openGraph: { type: "website", title: product?.name || `Product ${id}`, description: product?.short_description || product?.description || "" },
  };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const [product, reviews] = await Promise.all([getProductById(id), getProductReviews(id)]);
  return <LegacyPage page="ProductDetail" initialData={{ product, reviews }} />;
}