import { Skeleton } from "@/components/common/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="mb-8 h-4 w-48" />

      <div className="rounded-lg bg-transparent">
        {/* Table header */}
        <div className="hidden border-b p-4 md:grid md:grid-cols-12 md:gap-4">
          <Skeleton className="col-span-3 h-4 w-16" />
          <Skeleton className="col-span-2 h-4 w-12" />
          <Skeleton className="col-span-2 h-4 w-16" />
          <Skeleton className="col-span-2 h-4 w-12" />
          <Skeleton className="col-span-3 h-4 w-20" />
        </div>

        {/* Order rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b p-4">
            <div className="grid items-center gap-4 md:grid-cols-12">
              <div className="md:col-span-3">
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="md:col-span-2 h-4 w-20" />
              <Skeleton className="md:col-span-2 h-4 w-16" />
              <Skeleton className="md:col-span-2 h-4 w-16" />
              <div className="flex gap-2 md:col-span-3">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
