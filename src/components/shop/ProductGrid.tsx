import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import type { Locale } from "@/config/site";

interface ProductGridProps {
  products: Product[];
  locale: Locale;
  isLoading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function ProductGrid({
  products,
  locale,
  isLoading = false,
  className,
  columns = 4,
}: ProductGridProps) {
  if (isLoading) {
    return <ProductGridSkeleton count={columns * 2} imageAspectClassName="aspect-[2/3]" />;
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No products found</p>
      </div>
    );
  }

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-0", gridCols[columns], className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );
}
