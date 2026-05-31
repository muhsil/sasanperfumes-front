import { Skeleton } from "@/components/common/Skeleton";
import { AuthBackground } from "@/components/common/AuthBackground";

export default function LoginLoading() {
  return (
    <AuthBackground showImage={false} className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-brand-beige/25 px-4 py-6 md:py-10">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-brand-border/70 bg-brand-ivory p-5 shadow-[0_18px_48px_rgba(20,15,10,0.08)] md:p-7">
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
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>

          <Skeleton className="mt-6 h-4 w-48" />
        </div>
      </div>
    </AuthBackground>
  );
}
