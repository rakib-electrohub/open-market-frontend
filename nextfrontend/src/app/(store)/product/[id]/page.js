import LegacyPage from "@/components/LegacyPage";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Product ${id}`, description: "View product details, price, availability, and seller information." };
}

export default async function ProductPage({ params }) {
  return <LegacyPage page="ProductDetail" />;
}