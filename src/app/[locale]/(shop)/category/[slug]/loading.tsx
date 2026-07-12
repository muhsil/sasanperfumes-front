import { PillRowSkeleton, ProductGridSkeleton, SectionHeaderSkeleton } from "@/components/common/Skeleton";

export default function CategoryLoading() {
  return (
    <div className="bg-transparent text-brand-primary">
      <section className="bg-transparent px-4 pb-6 pt-8 md:pb-8 md:pt-10">
        <div className="max-w-[760px]">
          <SectionHeaderSkeleton />
        </div>
        <div className="mt-6">
          <PillRowSkeleton count={5} />
        </div>
      </section>
      <ProductGridSkeleton count={12} columns={6} />
    </div>
  );
}
