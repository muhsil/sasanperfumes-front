import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";

interface OurStoryStat {
  value: string;
  label: string;
}

interface OurStorySectionProps {
  eyebrow?: string;
  title?: string;
  description1?: string;
  description2?: string;
  image?: string;
  stats?: OurStoryStat[];
}

export function OurStorySection({
  eyebrow,
  title,
  description1,
  description2,
  image,
  stats,
}: OurStorySectionProps) {
  const visibleStats = stats?.filter((stat) => stat.value || stat.label) ?? [];
  const hasText = eyebrow || title || description1 || description2 || visibleStats.length > 0;

  if (!hasText && !image) return null;

  return (
    <section className="lazy-section section-band py-8 md:py-10 lg:py-12">
      <div className="px-5 md:px-7 lg:px-12">
          <div className={`grid gap-6 lg:items-center ${image ? "lg:grid-cols-12" : ""}`}>
            {hasText && (
              <div className={`${image ? "lg:col-span-5" : "mx-auto max-w-4xl"}`}>
                {eyebrow && (
                  <p className="mb-3 max-w-fit border-b border-brand-gold/50 pb-2 text-[11px] font-semibold uppercase text-brand-gold">
                    {eyebrow}
                  </p>
                )}

                {title && (
                  <h2 className="max-w-xl font-title text-3xl leading-[1.08] text-brand-primary md:text-4xl lg:text-[2.75rem]">
                    {title}
                  </h2>
                )}

                {(description1 || description2) && (
                  <div className="mt-5 space-y-3 border-s border-brand-primary/10 ps-5 md:mt-6 md:ps-6">
                    {description1 && (
                      <p className="text-sm leading-7 text-brand-primary/70 md:text-[15px] md:leading-8">
                        {description1}
                      </p>
                    )}
                    {description2 && (
                      <p className="text-sm leading-7 text-brand-primary/65 md:text-[15px] md:leading-8">
                        {description2}
                      </p>
                    )}
                  </div>
                )}

                {visibleStats.length > 0 && (
                  <div className="mt-6 grid overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory/80 sm:grid-cols-3">
                    {visibleStats.map((stat, i) => (
                      <div
                        key={`${stat.value}-${stat.label}-${i}`}
                        className="border-b border-brand-border/70 px-4 py-4 text-start last:border-b-0 sm:border-b-0 sm:border-e sm:last:border-e-0"
                      >
                        {stat.value && (
                          <p className="text-2xl font-normal leading-none text-brand-primary md:text-3xl">
                            {stat.value}
                          </p>
                        )}
                        {stat.label && (
                          <p className="mt-2 text-[10px] uppercase leading-4 tracking-[0.14em] text-brand-primary/50">
                            {stat.label}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {image && (
              <div className={`${hasText ? "lg:col-span-7" : ""} relative`}>
                <div className="relative min-h-[46svh] overflow-hidden rounded-lg border border-brand-border/70 bg-brand-ivory shadow-[0_24px_70px_rgba(20,15,10,0.12)] md:min-h-[52svh]">
                  <Image
                    src={image}
                    alt={title || ""}
                    fill
                    loading="lazy"
                    sizes={hasText ? "(max-width: 1024px) 100vw, 58vw" : "100vw"}
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(image)}
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/25" />
                </div>
              </div>
            )}
          </div>
      </div>
    </section>
  );
}
