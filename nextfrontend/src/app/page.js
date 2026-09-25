import LegacyPage from "@/components/LegacyPage";
import { getHomepageData } from "@/server/catalog";

export const metadata = { title: "Online Marketplace", description: "Shop products from trusted sellers on Open Market." };
export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomepageData(10);
  return <LegacyPage page="Home" initialData={data} />;
}
