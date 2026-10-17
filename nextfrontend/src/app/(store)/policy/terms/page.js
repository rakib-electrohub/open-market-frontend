import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms and Conditions",
  description: "Review the Open Market terms and conditions for purchases, seller accounts, and site usage.",
  path: "/policy/terms",
  noindex: true,
});

export default function TermsPage() { return <LegacyPage page="Terms" />; }