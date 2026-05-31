import { PillRowSkeleton, ProductGridSkeleton, SectionHeaderSkeleton } from "@/components/common/Skeleton";

export default function CategoryLoading() {
  return (
    <div className="bg-[#f8f3ef] text-brand-primary">
      <section className="bg-[#f8f3ef] px-5 pb-6 pt-8 md:px-7 md:pb-8 md:pt-10 lg:px-12">
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
