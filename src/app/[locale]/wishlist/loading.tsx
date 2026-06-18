import { Skeleton } from "@/components/common/Skeleton";

export default function WishlistLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-5 md:px-7 lg:px-12">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-8 h-8 w-48" />

        <div className="rounded-lg bg-white shadow-sm">
          {/* Table header */}
          <div className="hidden border-b p-4 md:grid md:grid-cols-12 md:gap-4">
            <Skeleton className="col-span-5 h-4 w-16" />
            <Skeleton className="col-span-2 h-4 w-12 justify-self-center" />
            <Skeleton className="col-span-2 h-4 w-16 justify-self-center" />
            <Skeleton className="col-span-3 h-4 w-20 justify-self-center" />
          </div>

          {/* Wishlist rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b p-4">
              <div className="grid items-center gap-4 md:grid-cols-12">
                <div className="flex gap-4 md:col-span-5">
                  <Skeleton className="h-24 w-24 flex-shrink-0 rounded-lg" />
                  <div className="flex flex-col justify-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="md:col-span-2 justify-self-center h-4 w-16" />
                <Skeleton className="md:col-span-2 justify-self-center h-6 w-20 rounded-full" />
                <div className="flex gap-2 md:col-span-3 md:justify-center">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
