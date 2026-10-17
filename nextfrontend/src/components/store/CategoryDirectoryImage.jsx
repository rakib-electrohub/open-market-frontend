"use client";

import { Tag } from "lucide-react";
import FallbackImage from "@/components/ui/FallbackImage";

export default function CategoryDirectoryImage({ category, compact = false }) {
  const frameClass = compact
    ? "h-9 w-9 shrink-0 rounded-md"
    : "mb-3 aspect-[16/7] w-full rounded-lg";
  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
      <Tag className={compact ? "h-4 w-4" : "h-8 w-8"} aria-hidden="true" />
    </div>
  );

  return (
    <div className={`overflow-hidden border border-border/70 bg-primary/5 ${frameClass}`}>
      {category.image ? (
        <FallbackImage
          src={category.image}
          alt={`${category.name} category`}
          className="h-full w-full object-cover"
          fallback={fallback}
        />
      ) : fallback}
    </div>
  );
}