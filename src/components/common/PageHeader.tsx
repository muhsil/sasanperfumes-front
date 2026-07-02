import Image from "next/image";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";

interface PageHeaderProps {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  isRTL?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  description,
  image,
  isRTL = false,
  className,
  children,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "section-band px-4 pb-6 pt-7 text-brand-primary md:pb-10 md:pt-12",
        className,
      )}
    >
      {image && (
        <div className="mb-7 max-w-[280px] overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory p-2 shadow-[0_16px_34px_rgba(20,15,10,0.1)]">
          <Image
            src={image}
            alt={decodeHtmlEntities(title)}
            width={280}
            height={280}
            className="rounded-md object-cover"
            unoptimized={shouldUseUnoptimizedImage(image)}
          />
        </div>
      )}
      <div className={cn("max-w-[820px]", isRTL && "ms-auto text-right")}>
        <h1 className="font-title text-2xl leading-tight text-brand-primary md:text-3xl">
          {decodeHtmlEntities(title)}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base font-semibold text-brand-gold md:text-lg">
            {subtitle}
          </p>
        )}
        {description && (
          <p className={cn("mt-5 max-w-[660px] text-base leading-7 text-brand-muted md:text-base", isRTL && "ms-auto")}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
