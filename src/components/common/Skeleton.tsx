import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("skeleton-shimmer rounded-lg", className)} {...props} />;
}

export function ProductCardSkeleton({ placeholderLogo: _placeholderLogo }: { placeholderLogo?: string }) {
  void _placeholderLogo;

  return (
    <article className="flex h-full flex-col">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-[0_16px_34px_rgba(20,15,10,0.08)]">
        <div className="relative">
          <div className="relative aspect-square overflow-hidden bg-brand-beige">
            <Skeleton className="absolute inset-0 rounded-none" />
          </div>
          <div className="absolute left-3 top-3 flex max-w-[60%] flex-col gap-1">
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="absolute inset-x-3 bottom-3 hidden h-9 rounded-md sm:block" />
        </div>

        <div className="relative flex min-h-[68px] flex-1 items-center justify-center overflow-hidden px-2 py-1.5 text-center sm:min-h-[82px] sm:px-3 sm:py-2">
          <div className="flex w-full flex-col items-center">
            <div className="mb-1 flex justify-center gap-1">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="mt-1 h-3.5 w-1/2" />
            <Skeleton className="mt-1.5 h-4 w-20" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({
  count = 8,
  placeholderLogo,
  columns = 4,
  className,
}: {
  count?: number;
  placeholderLogo?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-x-2 gap-y-3 px-2 sm:gap-x-3 sm:gap-y-4 md:px-4 lg:px-8", gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} placeholderLogo={placeholderLogo} />
      ))}
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      <Skeleton className="h-20 w-20 flex-shrink-0 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CartItemsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="divide-y divide-brand-border/60">
      {Array.from({ length: count }).map((_, i) => (
        <CartItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-18" />
      </div>
    </div>
  );
}

export function CategoriesGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <CategorySkeleton key={i} />
      ))}
    </div>
  );
}

export function MiniProductCardSkeleton() {
  return (
    <div className="block">
      <Skeleton className="aspect-square w-full" />
      <div className="mt-2 space-y-1.5 p-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function MiniProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MiniProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TextLineSkeleton({ width = "full" }: { width?: "full" | "3/4" | "1/2" | "1/3" | "1/4" }) {
  const widthClasses = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/3": "w-1/3",
    "1/4": "w-1/4",
  };
  return <Skeleton className={cn("h-4", widthClasses[width])} />;
}

export function ButtonSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-9 w-24",
    md: "h-11 w-32",
    lg: "h-12 w-40",
  };
  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

export function PriceSkeleton() {
  return <Skeleton className="h-5 w-20" />;
}

export function SectionHeaderSkeleton({
  align = "left",
  compact = false,
}: {
  align?: "left" | "center";
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-2", align === "center" && "mx-auto max-w-2xl text-center")}>
      <Skeleton className={cn(compact ? "h-7 w-40" : "h-8 w-48 md:h-9", align === "center" && "mx-auto")} />
      <Skeleton className={cn("h-5 w-64", align === "center" && "mx-auto")} />
    </div>
  );
}

export function PillRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden pb-1 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-3 text-center">
          <Skeleton className="h-[72px] w-[72px] rounded-full md:h-[78px] md:w-[78px]" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
