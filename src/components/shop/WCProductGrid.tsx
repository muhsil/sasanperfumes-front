import { WCProductCard } from "./WCProductCard";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { cn } from "@/lib/utils";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";

interface WCProductGridProps {
  products: WCProduct[];
  locale: Locale;
  isLoading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  bundleProductSlugs?: string[];
  productNameLines?: 1 | 2;
}

export function WCProductGrid({
  products,
  locale,
  isLoading = false,
  className,
  columns = 4,
  bundleProductSlugs = [],
  productNameLines = 2,
}: WCProductGridProps) {
  if (isLoading) {
    return <ProductGridSkeleton count={columns * 2} />;
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-brand-muted">No products found</p>
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
    <div className={cn("grid gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4", gridCols[columns], className)}>
      {products.map((product) => (
        <WCProductCard
          key={product.id}
          product={product}
          locale={locale}
          bundleProductSlugs={bundleProductSlugs}
          productNameLines={productNameLines}
        />
      ))}
    </div>
  );
}
