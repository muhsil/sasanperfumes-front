import { PillRowSkeleton, ProductGridSkeleton, SectionHeaderSkeleton } from "@/components/common/Skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col">
      <div className="relative w-full">
        <div className="hidden aspect-[2560/1024] w-full bg-stone-200 md:block" />
        <div className="aspect-[1080/1475] w-full bg-stone-200 md:hidden" />
      </div>
      <div className="bg-brand-beige py-8 md:py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6 md:mb-8">
            <SectionHeaderSkeleton align="center" />
          </div>
          <div className="mb-6 md:mb-8">
            <PillRowSkeleton count={5} />
          </div>
          <ProductGridSkeleton count={10} />
        </div>
      </div>
    </div>
  );
}
