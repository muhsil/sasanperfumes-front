import { Skeleton } from "@/components/common/Skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen overflow-x-clip pb-44 md:pb-8" style={{ backgroundColor: "var(--color-beige)" }}>
      <div className="container mx-auto px-3 py-4 md:px-7 md:py-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* Checkout form skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact section */}
            <div className="border border-gray-100 bg-white p-6">
              <Skeleton className="mb-4 h-6 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Shipping section */}
            <div className="border border-gray-100 bg-white p-6">
              <Skeleton className="mb-4 h-6 w-48" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Payment section */}
            <div className="border border-gray-100 bg-white p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Order summary skeleton */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <div className="border border-gray-100 bg-white p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <div className="space-y-3 border-b border-gray-100 pb-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
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
