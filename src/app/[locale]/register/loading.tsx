import { Skeleton } from "@/components/common/Skeleton";
import { AuthBackground } from "@/components/common/AuthBackground";

export default function RegisterLoading() {
  return (
    <AuthBackground showImage={false} className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-transparent px-4 py-6 md:py-10">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-brand-border/70 bg-transparent p-5 md:p-7">
          <Skeleton className="mb-4 h-9 w-9 rounded-md" />
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="mb-6 h-8 w-64" />

          <Skeleton className="mb-4 h-12 w-full rounded-md" />

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-border/70" />
            <Skeleton className="h-4 w-8" />
            <div className="h-px flex-1 bg-brand-border/70" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-start gap-2">
              <Skeleton className="h-4 w-4 rounded mt-0.5" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
          </div>

          <Skeleton className="mt-6 h-4 w-48" />
        </div>
      </div>
    </AuthBackground>
  );
}
