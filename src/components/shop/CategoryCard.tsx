import Image from "next/image";
import Link from "next/link";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import type { ProductCategory } from "@/types";
import type { Locale } from "@/config/site";

interface CategoryCardProps {
  category: ProductCategory;
  locale: Locale;
  className?: string;
  variant?: "default" | "featured";
  pathPrefix?: string;
}

export function CategoryCard({
  category,
  locale,
  className,
  variant = "default",
  pathPrefix = "",
}: CategoryCardProps) {
  return (
    <Link
      href={`${pathPrefix}/${locale}/category/${category.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-[0_16px_34px_rgba(20,15,10,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45",
        variant === "featured" ? "aspect-[4/3]" : "aspect-square",
        className
      )}
    >
      {/* Background image */}
      {category.image ? (
                <Image
                  src={category.image.sourceUrl}
                  alt={category.image.altText || decodeHtmlEntities(category.name)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
      ) : (
        <div className="h-full w-full bg-brand-beige" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark-brown/72 via-brand-dark-brown/18 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3
                  className={cn(
                    "font-title font-semibold text-white",
                    variant === "featured" ? "text-xl md:text-2xl" : "text-lg"
                  )}
                >
                  {decodeHtmlEntities(category.name)}
                </h3>
        {variant === "featured" && category.description && (
          <p className="mt-1 text-sm text-white/80 line-clamp-2">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
}
