import { Skeleton } from "@/components/ui/skeleton";

export default function StoreLoading() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-border bg-white p-2">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="mt-3 h-4 w-4/5" />
              <Skeleton className="mt-2 h-4 w-2/5" />
            </div>
          ))}
        </div>
    </main>
  );
}