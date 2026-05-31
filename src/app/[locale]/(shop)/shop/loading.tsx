import { PillRowSkeleton, ProductGridSkeleton, Skeleton } from "@/components/common/Skeleton";

function CollectionHeaderLoading() {
  return (
    <section className="section-band text-brand-primary">
      <div className="mb-0 border-b border-brand-border/70 bg-brand-beige/45 px-5 py-6 md:px-7 lg:px-12">
        <PillRowSkeleton count={8} />
      </div>

      <div className="flex flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:gap-8 md:px-7 md:pb-8 lg:gap-12 lg:px-12">
        <div className="flex-1">
          <Skeleton className="h-9 w-32 md:h-12" />
          <Skeleton className="mt-3 h-5 w-full max-w-[420px]" />
        </div>
      </div>
    </section>
  );
}

function ProductToolbarLoading() {
  return (
    <div className="section-band relative flex items-center justify-between gap-4 px-5 py-3 text-brand-primary md:px-7 lg:px-12">
      <Skeleton className="hidden h-4 w-24 md:block" />
      <div className="flex items-center gap-5 md:ms-auto">
        <div className="hidden items-center gap-3 md:flex">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <span className="hidden h-5 w-px bg-brand-border/80 md:block" aria-hidden="true" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

export default function ShopLoading() {
  return (
    <div className="bg-transparent text-brand-primary">
      <CollectionHeaderLoading />
      <ProductToolbarLoading />
      <ProductGridSkeleton count={12} columns={6} />
    </div>
  );
}
