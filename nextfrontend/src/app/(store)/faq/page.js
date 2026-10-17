import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "FAQ",
  description: "Find answers about shopping, delivery, returns, payments, and seller support on Open Market.",
  path: "/faq",
  openGraphTitle: "Open Market FAQ",
  openGraphDescription: "Browse common questions and answers about buying, shipping, and marketplace support.",
});

export default function FaqPage() { return <LegacyPage page="FAQ" />; }