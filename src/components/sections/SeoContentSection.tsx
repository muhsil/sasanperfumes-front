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
  const textDirectionClass = isRTL ? "text-right" : "text-left";
  const textOrderClass = isRTL ? "lg:order-2" : "lg:order-1";
  const imageOrderClass = isRTL ? "lg:order-1" : "lg:order-2";

  return (
    <section
      data-section="seo-content"
      className="lazy-section section-band relative overflow-hidden py-10 md:py-12 lg:py-14"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative section-shell">
        <div className="relative rounded-[28px] border border-brand-border/40 bg-white/85 p-4 shadow-[0_22px_56px_rgba(14,10,3,0.05)] md:p-8">
          <div className="pointer-events-none absolute -left-16 top-12 h-60 w-60 rounded-full bg-[radial-gradient(circle_at_top,rgba(194,160,111,0.11),transparent_60%)]" />

          <div className="grid gap-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10">
            <div className={cn("space-y-5", textDirectionClass, textOrderClass)}>
              <p className="inline-flex items-center rounded-full border border-brand-gold/35 bg-brand-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
                Fragrance Story
              </p>
              {title && (
                <h2 className="max-w-xl font-title text-3xl leading-tight text-brand-primary md:text-[38px]">
                  {title}
                </h2>
              )}
              <div className="mt-1 h-px w-24 bg-gradient-to-r from-brand-gold to-transparent" />

              <div className="space-y-4 text-sm leading-7 text-brand-muted md:text-[16px] md:leading-8">
                {paragraphs.map((paragraph, idx) => (
                  <p key={`${isRTL ? "ar" : "en"}-paragraph-${idx}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {backgroundImage && (
              <div
                className={cn(
                  "group relative min-h-[300px] overflow-hidden rounded-2xl border border-brand-border/75 bg-brand-ivory shadow-[0_18px_44px_rgba(20,15,10,0.1)] ring-1 ring-white/30 lg:min-h-[420px]",
                  imageOrderClass
                )}
              >
                <Image
                  src={backgroundImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  unoptimized={shouldUseUnoptimizedImage(backgroundImage)}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-black/8 to-black/0" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
