import Image from "next/image";
import { BLUR_DATA_URL, cn } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";

interface SeoContentSectionProps {
  title?: string;
  paragraphs: string[];
  backgroundImage?: string;
  isRTL?: boolean;
}

export function SeoContentSection({ title, paragraphs, backgroundImage, isRTL = false }: SeoContentSectionProps) {
  return (
    <section
      data-section="seo-content"
      className="lazy-section section-band relative overflow-hidden py-8 md:py-10 lg:py-12"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative px-5 md:px-7 lg:px-12">
        <div className="grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className={cn(isRTL ? "text-right" : "text-left")}>
            <p className="mb-3 text-[11px] font-semibold uppercase text-brand-gold">
              {isRTL ? "Fragrance Guide" : "Fragrance Notes"}
            </p>
            {title && (
              <h2 className="max-w-xl font-title text-[28px] leading-tight text-brand-primary md:text-[34px]">
                {title}
              </h2>
            )}
            <div className="mt-5 h-px w-full max-w-sm bg-brand-border" />
          </div>

          <div className={cn("grid gap-5", backgroundImage && "lg:grid-cols-[1fr_0.72fr]")}>
            <div className="border-y border-brand-border/75">
              {paragraphs.map((p, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 border-b border-brand-border/75 py-4 last:border-b-0 md:grid-cols-[56px_1fr] md:gap-5"
                >
                  <span className="text-xs font-semibold text-brand-gold">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <p className={cn("text-sm leading-7 text-brand-muted md:text-base md:leading-8", isRTL ? "text-right" : "text-left")}>
                    {p}
                  </p>
                </div>
              ))}
            </div>

            {backgroundImage && (
              <div className="relative min-h-[300px] overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-[0_18px_44px_rgba(20,15,10,0.08)] lg:min-h-[46svh]">
                <Image
                  src={backgroundImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 36vw"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  unoptimized={shouldUseUnoptimizedImage(backgroundImage)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
