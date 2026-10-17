import LegacyPage from "@/components/LegacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "Read the Open Market privacy policy for account data, cookies, security, and marketplace information handling.",
  path: "/policy/privacy",
  noindex: true,
});

export default function PrivacyPolicyPage() { return <LegacyPage page="PrivacyPolicy" />; }