import LegacyPage from "@/components/LegacyPage";
import { getProductById, getProductReviews } from "@/server/catalog";
import { buildPageMetadata, productJsonLd, stripHtml } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  const description = stripHtml(product?.short_description || product?.description || "View product details, price, availability, and seller information.");
  const title = product?.name || `Product ${id}`;

  return buildPageMetadata({
    title,
    description,
    path: `/product/${id}`,
    openGraphTitle: product?.name || title,
    openGraphDescription: description,
    image: Array.isArray(product?.images) && product.images[0] ? product.images[0] : undefined,
    keywords: [product?.name, product?.brand, product?.main_category, "Open Market"].filter(Boolean),
  });
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const [product, reviews] = await Promise.all([getProductById(id), getProductReviews(id)]);
  return <LegacyPage page="ProductDetail" initialData={{ product, reviews }} />;
}