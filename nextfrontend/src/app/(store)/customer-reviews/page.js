import CustomerReviewsPage from "@/components/store/CustomerReviewsPage";
import { getPublicReviewsPage } from "@/server/catalog";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Customer Reviews",
  description: "Read approved customer ratings and reviews from shoppers on Open Market BD.",
  path: "/customer-reviews",
  openGraphTitle: "Customer Reviews | Open Market BD",
  openGraphDescription: "Browse shopper feedback and ratings on Open Market BD.",
});

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const initialData = await getPublicReviewsPage({ limit: 10, offset: 0 });
  return <CustomerReviewsPage initialData={initialData} />;
}
