import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Shipping Information",
  description: "Check shipping options, delivery times, and order fulfillment details on Open Market.",
  path: "/policy/shipping",
  noindex: true,
});

export default function ShippingPage() { return <LegacyPage page="ShippingInfo" />; }