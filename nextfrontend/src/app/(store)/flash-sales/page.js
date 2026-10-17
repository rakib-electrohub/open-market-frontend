import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Flash Sales",
  description: "Shop limited-time deals and hot discounts from trusted sellers on Open Market.",
  path: "/flash-sales",
  openGraphTitle: "Open Market Flash Sales",
  openGraphDescription: "Browse limited-time deals and trending discounts across the Open Market marketplace.",
});

export default function FlashSalesPage() { return <LegacyPage page="FlashSales" />; }