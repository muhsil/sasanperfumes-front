import { Skeleton } from "@/components/common/Skeleton";

export default function CartLoading() {
  return (
    <div className="min-h-screen bg-transparent pb-44 md:pb-8">
      <div className="container mx-auto px-4 py-2 md:py-3">
        {/* Breadcrumb skeleton */}
        <Skeleton className="mb-4 h-4 w-32" />

        {/* Title */}
        <Skeleton className="mb-8 h-8 w-48 md:h-10" />

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* Cart items skeleton */}
          <div className="lg:col-span-2">
            <div className="border border-gray-100 bg-transparent">
              {/* Header row */}
              <div className="hidden border-b p-4 md:grid md:grid-cols-12 md:gap-4">
                <Skeleton className="col-span-6 h-4 w-16" />
                <Skeleton className="col-span-2 h-4 w-12 justify-self-center" />
                <Skeleton className="col-span-2 h-4 w-16 justify-self-center" />
                <Skeleton className="col-span-2 h-4 w-12 justify-self-center" />
              </div>

              {/* Item rows */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border-b">
                  <div className="grid items-center gap-4 md:grid-cols-12">
                    <div className="flex gap-4 md:col-span-6">
                      <Skeleton className="h-24 w-24 flex-shrink-0" />
                      <div className="flex flex-col justify-center gap-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="hidden md:col-span-2 md:block justify-self-center h-4 w-16" />
                    <div className="flex items-center gap-2 md:col-span-2 md:justify-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="md:col-span-2 justify-self-end h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary skeleton */}
          <div className="lg:col-span-1">
            <div className="border border-gray-100 bg-transparent p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <div className="space-y-3 border-b border-gray-100 pb-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="flex justify-between py-4">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
