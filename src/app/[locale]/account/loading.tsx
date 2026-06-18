import { Skeleton } from "@/components/common/Skeleton";

export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-5 md:px-7 lg:px-12">
        <Skeleton className="mb-8 h-8 w-48 md:h-10" />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile card skeleton */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <Skeleton className="mb-4 h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-48" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
            </div>
          </div>

          {/* Menu items skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg bg-white shadow-sm">
              <ul className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="mt-1 h-4 w-40" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
