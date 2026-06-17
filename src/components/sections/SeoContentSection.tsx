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
      className="lazy-section section-band relative overflow-hidden py-10 md:py-12 lg:py-14"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative px-5 md:px-7 lg:px-12">
        <div className="relative rounded-[28px] border border-brand-border/40 bg-white/85 p-4 shadow-[0_22px_56px_rgba(14,10,3,0.05)] md:p-8">
          <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-[radial-gradient(circle_at_top,rgba(194,160,111,0.14),transparent_63%)]" />

          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className={cn(isRTL ? "text-right" : "text-left")}>
              <p className="mb-3 inline-flex items-center rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
                {isRTL ? "دليل العطور" : "Fragrance Notes"}
              </p>
              {title && (
                <h2 className="max-w-xl font-title text-[30px] leading-tight text-brand-primary md:text-[40px]">
                  {title}
                </h2>
              )}
              <div className="mt-6 h-px w-24 bg-gradient-to-r from-brand-gold to-transparent" />
            </div>

            <div className={cn("grid gap-5", backgroundImage ? "lg:grid-cols-[1fr_0.88fr]" : "md:gap-6")}>
              <div className={cn("grid gap-4", isRTL ? "text-right" : "text-left")}>
                {paragraphs.map((p, idx) => (
                  <article
                    key={idx}
                    className="group rounded-2xl border border-brand-border/70 bg-brand-ivory/55 p-4 transition-shadow hover:shadow-[0_16px_36px_rgba(16,10,3,0.10)] md:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/95 text-xs font-semibold text-brand-ivory">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-7 text-brand-muted md:text-[16px] md:leading-8">{p}</p>
                    </div>
                  </article>
                ))}
              </div>

              {backgroundImage && (
                <div className="group relative min-h-[300px] overflow-hidden rounded-2xl border border-brand-border/70 bg-brand-ivory shadow-[0_18px_44px_rgba(20,15,10,0.08)] ring-1 ring-white/30 lg:min-h-[460px]">
                  <Image
                    src={backgroundImage}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 36vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    unoptimized={shouldUseUnoptimizedImage(backgroundImage)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-black/5 to-black/0" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
