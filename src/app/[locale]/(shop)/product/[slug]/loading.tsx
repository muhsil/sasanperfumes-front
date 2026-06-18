import { ProductGridSkeleton, Skeleton } from "@/components/common/Skeleton";

function ProductGalleryLoading() {
  return (
    <div>
      <Skeleton className="aspect-[10/11] w-full rounded-none" />
      <div className="grid grid-cols-2 gap-0">
        <Skeleton className="aspect-square w-full rounded-none" />
        <Skeleton className="aspect-square w-full rounded-none" />
      </div>
      <div className="grid grid-cols-3 gap-0">
        <Skeleton className="aspect-square w-full rounded-none" />
        <Skeleton className="aspect-square w-full rounded-none" />
        <Skeleton className="aspect-square w-full rounded-none" />
      </div>
    </div>
  );
}

function RelatedProductsLoading() {
  return (
    <section className="mt-16 border-t border-brand-primary/15 pt-12">
      <div className="mb-8 flex items-center justify-between px-5 md:px-7 lg:px-12">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-none" />
          <Skeleton className="h-9 w-9 rounded-none" />
        </div>
      </div>
      <div className="relative overflow-hidden border-t border-l border-[#e7ded7]">
        <ProductGridSkeleton count={4} columns={4} />
      </div>
    </section>
  );
}

export default function ProductLoading() {
  return (
    <div className="bg-[#f8f3ef] text-brand-primary">
      <div className="w-full px-5 pb-3 pt-4 md:px-7 md:pb-4 md:pt-6 lg:px-12">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-3 rounded-none" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden h-4 w-3 rounded-none sm:block" />
            <Skeleton className="hidden h-4 w-36 sm:block" />
          </div>
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="w-full px-0">
        <div className="grid w-full gap-y-7 gap-x-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
          <div className="min-w-0 bg-[#f8f3ef]">
            <ProductGalleryLoading />
          </div>

          <aside className="min-w-0 bg-[#f8f3ef] px-5 pb-10 pt-2 text-brand-primary md:px-7 md:pb-12 md:pt-8 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:px-10 lg:pt-10 xl:px-12">
            <div className="mx-auto flex w-full max-w-[560px] flex-col items-stretch space-y-0 lg:ml-0 lg:mr-auto">
              <div className="mb-5 flex w-full flex-wrap items-center gap-x-3 gap-y-2 self-start">
                <Skeleton className="h-5 w-24 rounded-none" />
                <Skeleton className="h-4 w-3 rounded-none" />
                <Skeleton className="h-4 w-28" />
              </div>

              <Skeleton className="h-9 w-full max-w-[420px] self-start sm:h-10 md:h-12 lg:h-[54px]" />
              <Skeleton className="mt-2 h-9 w-3/4 self-start sm:h-10 md:h-12 lg:h-[54px]" />

              <div className="mt-4 flex items-center gap-2 self-start">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-3.5 w-3.5 rounded-full" />
                ))}
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="mt-5 border-b border-[#e7ded7] pb-6">
                <Skeleton className="h-9 w-32" />
                <div className="mt-3 flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>

              <Skeleton className="mt-5 h-8 w-56 rounded-full" />

              <div className="mt-5 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-2/3" />
              </div>

              <div className="mt-6 space-y-5 border-t border-[#e7ded7] pt-5">
                <div>
                  <Skeleton className="mb-2.5 h-4 w-24" />
                  <div className="flex flex-wrap gap-2.5">
                    <Skeleton className="h-9 w-16 rounded-full" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-9 w-14 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Skeleton className="h-12 rounded-full" />
                  <Skeleton className="h-12 min-w-[56px] rounded-full" />
                </div>
                <Skeleton className="h-12 w-full rounded-full" />
              </div>

              <div className="mt-5 space-y-2">
                <Skeleton className="h-10 w-full rounded-none" />
                <Skeleton className="h-10 w-full rounded-none" />
              </div>

              <div className="mt-8 border-t border-[#e7ded7] pt-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border-b border-[#e7ded7] py-5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-4 rounded-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <RelatedProductsLoading />
    </div>
  );
}
