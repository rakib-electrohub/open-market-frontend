import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact",
  description: "Contact Open Market for support, seller inquiries, order help, and marketplace assistance.",
  path: "/contact",
  openGraphTitle: "Contact Open Market",
  openGraphDescription: "Get help with orders, sellers, shipping, and support on Open Market.",
});

export default function ContactPage() { return <LegacyPage page="Contact" />; }