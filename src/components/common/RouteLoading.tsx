import { cn } from "@/lib/utils";
import { ProductGridSkeleton, Skeleton } from "./Skeleton";

export function BreadcrumbsSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Skeleton className="h-3 w-14 rounded-full" />
      <Skeleton className="h-3 w-2 rounded-none" />
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="h-3 w-2 rounded-none" />
      <Skeleton className="h-3 w-24 rounded-full" />
    </div>
  );
}

export function StaticPageLoadingShell() {
  return (
    <main className="bg-white text-brand-primary">
      <section className="bg-[#f8f3ef] px-4 pb-6 pt-8 md:pb-8 md:pt-10">
        <div className="max-w-[760px]">
          <Skeleton className="h-10 w-3/4 max-w-[520px] md:h-12" />
          <Skeleton className="mt-3 h-5 w-40 md:w-56" />
          <div className="mt-5 max-w-[620px] space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </section>

      <div className="bg-white px-4 py-4">
        <BreadcrumbsSkeleton />
      </div>

      <section className="bg-white px-4 pb-14 pt-6 md:pb-16 md:pt-8 lg:pb-20 lg:pt-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-start">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40 md:h-10 md:w-56" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-none bg-[#f5f1ed]" />
        </div>
      </section>

      <section className="bg-[#f8f3ef] px-4 py-14 md:py-16 lg:py-20">
        <div className="grid gap-px overflow-hidden border border-brand-primary/10 bg-brand-primary/10 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="bg-white p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function PrivateLabelingLoadingShell() {
  return (
    <main className="bg-white text-brand-primary">
      <section className="bg-[#f8f3ef]">
        <div className="grid lg:min-h-[calc(100vh-96px)] lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col justify-center gap-10 px-4 py-10 md:py-14 lg:order-2 lg:justify-between lg:py-16">
            <div className="max-w-3xl">
              <Skeleton className="mb-5 h-4 w-32 rounded-full" />
              <Skeleton className="h-12 w-full max-w-[360px] md:h-16 lg:h-20" />
              <Skeleton className="mt-3 h-12 w-4/5 max-w-[320px] md:h-16 lg:h-20" />
            </div>
            <div className="max-w-2xl">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="mt-8 h-11 w-40 rounded-none" />
            </div>
          </div>

          <div className="relative min-h-[320px] bg-brand-beige sm:min-h-[420px] md:min-h-[520px] lg:order-1 lg:min-h-full">
            <Skeleton className="absolute inset-0 rounded-none" />
            <div className="absolute inset-0 flex items-center justify-center px-4 py-8">
              <div className="flex w-full max-w-3xl flex-col items-center gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-32 bg-white/20 md:h-8 md:w-40" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-white px-4 py-4">
        <BreadcrumbsSkeleton />
      </div>

      <section className="bg-white px-4 py-16 md:py-20 lg:py-24">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="flex min-h-[420px] flex-col justify-center py-0 lg:pe-10">
            <Skeleton className="h-10 w-3/4 max-w-[420px] md:h-12" />
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <Skeleton className="min-h-[320px] rounded-none bg-brand-beige sm:min-h-[420px]" />
        </div>
      </section>

      <section className="bg-[#f8f3ef] px-4 py-16 md:py-20 lg:py-24">
        <div className="grid gap-px overflow-hidden border border-brand-primary/10 bg-brand-primary/10 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="bg-white p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:py-20 lg:py-24">
        <div className="grid overflow-hidden border border-brand-primary/10 bg-brand-primary/10 lg:grid-cols-2">
          <div className="bg-[#f4f4f4] px-6 py-12 md:px-10 md:py-14">
            <Skeleton className="mb-8 h-8 w-8 rounded-full" />
            <Skeleton className="h-10 w-3/4 max-w-[360px] md:h-12" />
            <div className="mt-6 max-w-md space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <div className="bg-white p-5 sm:p-6 md:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-3xl space-y-4">
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-28 w-full rounded-none" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-12 w-40 rounded-none" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function CompactCatalogPageLoadingShell({
  withBreadcrumbs = true,
}: {
  withBreadcrumbs?: boolean;
}) {
  return (
    <div className="bg-[#f8f3ef] text-brand-primary">
      <div className="container mx-auto px-4 py-3">
        {withBreadcrumbs && <BreadcrumbsSkeleton className="mb-3" />}
        <div className="mb-3">
          <Skeleton className="h-10 w-56 md:h-12" />
          <Skeleton className="mt-2 h-5 w-48 md:w-60" />
        </div>
      </div>
      <ProductGridSkeleton count={12} />
    </div>
  );
}

export function SearchPageLoadingShell() {
  return (
    <div className="min-h-screen bg-[#f8f3ef] text-brand-primary">
      <section className="px-4 pb-10 pt-12 md:pb-12 md:pt-16">
        <Skeleton className="h-12 w-full max-w-[360px] md:h-16 md:max-w-[460px]" />
        <div className="mt-8 max-w-[620px]">
          <Skeleton className="h-[52px] w-full rounded-full" />
        </div>
        <Skeleton className="mt-4 h-4 w-24" />
      </section>
      <div className="px-4 py-8">
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
