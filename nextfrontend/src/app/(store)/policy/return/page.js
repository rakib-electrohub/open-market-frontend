import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Return Policy",
  description: "Learn about return eligibility, refund conditions, and exchange policies for Open Market purchases.",
  path: "/policy/return",
  noindex: true,
});

export default function ReturnPolicyPage() { return <LegacyPage page="ReturnPolicy" />; }