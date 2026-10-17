import LegacyPage from "@/components/LegacyPage";
import { notFound } from "next/navigation";
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
    noindex: !product,
    openGraphTitle: product?.name || title,
    openGraphDescription: description,
    image: Array.isArray(product?.images) && product.images[0] ? product.images[0] : undefined,
    keywords: [product?.name, product?.brand, product?.main_category, "Open Market"].filter(Boolean),
  });
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const [product, reviews] = await Promise.all([getProductById(id), getProductReviews(id)]);
  if (!product) notFound();

  const isFlashSale = product?.flash_sale_price && product.flash_sale_end && new Date(product.flash_sale_end) > new Date();
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0;
  const structuredData = product
    ? productJsonLd(
        {
          ...product,
          price: isFlashSale ? product.flash_sale_price : product.price,
          average_rating: averageRating,
          review_count: reviews.length,
        },
        product.seller_id ? { id: product.seller_id, store_name: product.seller_name } : undefined,
      )
    : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      )}
      <LegacyPage page="ProductDetail" initialData={{ product, reviews }} />
    </>
  );
}