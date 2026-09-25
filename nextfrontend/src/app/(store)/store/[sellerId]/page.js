import LegacyPage from "@/components/LegacyPage";
export async function generateMetadata({ params }) { const { sellerId } = await params; return { title: `Seller ${sellerId}`, description: "Explore products from this Open Market seller." }; }
export default function StorePage() { return <LegacyPage page="StorePage" />; }