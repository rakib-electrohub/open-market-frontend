import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata, getSellerSeoData } from "@/lib/seo";
import { getProductsPage, getSellerById } from "@/server/catalog";

export async function generateMetadata({ params }) {
  const { sellerId } = await params;
  const seller = await getSellerById(sellerId);
  const productCount = (await getProductsPage({
    page: 1,
    limit: 1,
    query: { seller_id: sellerId, is_active: true, approval_status: "approved" },
    order: "-created_date",
  })).products.length;
  const seo = getSellerSeoData(seller, productCount);

  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/store/${sellerId}`,
    openGraphTitle: seo.title,
    openGraphDescription: seo.description,
    image: seller?.logo || undefined,
    keywords: [seller?.store_name, seller?.store_description, "Open Market", "seller", "products"].filter(Boolean),
  });
}

export default async function StorePage({ params }) {
  const { sellerId } = await params;
  const [seller, productsPage] = await Promise.all([
    getSellerById(sellerId),
    getProductsPage({
      page: 1,
      limit: 24,
      query: { seller_id: sellerId, is_active: true, approval_status: "approved" },
      order: "-created_date",
    }),
  ]);

  return <LegacyPage page="StorePage" initialData={{ seller, products: productsPage?.products || [] }} />;
}