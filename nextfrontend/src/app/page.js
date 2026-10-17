import LegacyPage from "@/components/LegacyPage";
import { getHomepageData } from "@/server/catalog";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Online Marketplace",
    description: "Shop the latest deals, trending products, and trusted seller picks on Open Market.",
    path: "/",
    openGraphTitle: "Open Market | Trusted Marketplace Deals",
    openGraphDescription: "Shop popular products, limited-time flash sales, and verified seller offers on Open Market.",
  });
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomepageData(10);
  return <LegacyPage page="Home" initialData={data} />;
}
