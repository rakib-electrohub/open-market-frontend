"use client";

import dynamic from "next/dynamic";

const LegacyPage = dynamic(() => import("@/components/LegacyPage"), { ssr: false });

export default function AdminClientPage({ page }) {
  return <LegacyPage page={page} />;
}
