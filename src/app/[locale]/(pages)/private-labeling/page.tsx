import Link from "next/link";
import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FlaskConical, Leaf } from "lucide-react";
import { PrivateLabelingForm } from "@/components/forms/PrivateLabelingForm";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getFeatureToggles, getPrivateLabelingData, pickLocale } from "@/lib/api/wordpress";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface ContentItem {
  image?: string;
  title: string;
  description: string;
}

function localizedHref(rawHref: string, locale: string, fallback: string) {
  const href = rawHref || fallback;
  if (!href) return "";
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  if (href.startsWith("http") || href.startsWith(`/${locale}/`)) return href;
  if (href.startsWith("/")) return `/${locale}${href}`;
  return `/${locale}/${href}`;
}

function fixedBackgroundStyle(image: string) {
  return image ? { backgroundImage: `url("${image.replace(/"/g, '\\"')}")` } : undefined;
}

function BackgroundMedia({
  image,
  label,
  className = "",
  children,
}: {
  image: string;
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  if (!image && !children) return null;

  return (
    <div
      className={`relative min-h-[280px] overflow-hidden bg-brand-beige bg-cover bg-center bg-fixed sm:min-h-[360px] md:min-h-[420px] lg:min-h-[520px] ${className}`}
      style={fixedBackgroundStyle(image)}
      role={image && !children ? "img" : undefined}
      aria-label={image && !children ? label : undefined}
    >
      {children}
    </div>
  );
}

function NumberedGrid({
  items,
  columns = "md:grid-cols-3",
}: {
  items: ContentItem[];
  columns?: string;
}) {
  if (items.length === 0) return null;

  const icons = [Leaf, CheckCircle2, FlaskConical, Leaf];

  return (
    <div className={`grid w-full gap-px overflow-hidden border border-brand-primary/10 bg-brand-primary/10 ${columns}`}>
      {items.map((item, idx) => {
        const Icon = icons[idx % icons.length];

        return (
          <article key={`${item.title}-${idx}`} className="bg-white p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <Icon className="h-5 w-5 text-brand-gold" />
              <span className="text-[11px] font-semibold text-brand-primary/35">
                {String(idx + 1).padStart(2, "0")}
              </span>
            </div>
            {item.title && (
              <h3 className="text-base font-normal leading-snug text-brand-primary">
                {item.title}
              </h3>
            )}
            {item.description && (
              <p className="mt-3 text-xs leading-6 text-brand-primary/62">
                {item.description}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  if (!title) return null;

  return (
    <h2 className="mb-12 max-w-xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
      {title}
    </h2>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_private_labeling_enabled) return {};
  const data = await getPrivateLabelingData();
  const title = pickLocale(data?.seo?.title, locale, "") ||
    pickLocale(data?.hero?.title, locale, "");
  const description = pickLocale(data?.seo?.description, locale, "") ||
    pickLocale(data?.hero?.subtitle, locale, "");

  return generateSeoMetadata({
    title,
    description,
    locale: lang,
    pathname: "/private-labeling",
  });
}

export default async function PrivateLabelingPage({ params }: PageProps) {
  const { locale } = await params;
  const isRTL = locale === "ar";

  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_private_labeling_enabled) notFound();

  const data = await getPrivateLabelingData();

  const hero = {
    title: pickLocale(data?.hero?.title, locale, ""),
    subtitle: pickLocale(data?.hero?.subtitle, locale, ""),
    description: pickLocale(data?.hero?.description, locale, ""),
    image: data?.hero?.image || "",
    ctaText: pickLocale(data?.hero?.ctaText, locale, ""),
    ctaLink: localizedHref(data?.hero?.ctaLink || "#enquiry-form", locale, "#enquiry-form"),
  };

  const intro = {
    heading: pickLocale(data?.intro?.heading, locale, ""),
    description: pickLocale(data?.intro?.description, locale, ""),
    image: data?.intro?.image || "",
  };

  const whatIs = {
    title: pickLocale(data?.whatIs?.title, locale, ""),
    description: pickLocale(data?.whatIs?.description, locale, ""),
    image: data?.whatIs?.image || "",
  };

  const whyChoose: ContentItem[] = (data?.whyChoose || []).map((item) => ({
    image: item.image || "",
    title: pickLocale(item.title, locale, ""),
    description: pickLocale(item.description, locale, ""),
  })).filter((item) => item.title || item.description);

  const process: ContentItem[] = (data?.process || []).map((item) => ({
    image: item.image || "",
    title: pickLocale(item.title, locale, ""),
    description: pickLocale(item.description, locale, ""),
  })).filter((item) => item.title || item.description);

  const products: ContentItem[] = (data?.products || []).map((item) => ({
    image: item.image || "",
    title: pickLocale(item.title, locale, ""),
    description: pickLocale(item.description, locale, ""),
  })).filter((item) => item.title || item.description || item.image);

  const benefits: ContentItem[] = (data?.benefits || []).map((item) => ({
    image: item.image || "",
    title: pickLocale(item.title, locale, ""),
    description: pickLocale(item.description, locale, ""),
  })).filter((item) => item.title || item.description);

  const cta = {
    title: pickLocale(data?.cta?.title, locale, ""),
    description: pickLocale(data?.cta?.description, locale, ""),
    buttonText: pickLocale(data?.cta?.buttonText, locale, ""),
    buttonLink: localizedHref(data?.cta?.buttonLink || "#enquiry-form", locale, "#enquiry-form"),
  };

  const sectionTitles = {
    whyChoose: pickLocale(data?.sectionTitles?.whyChoose, locale, ""),
    process: pickLocale(data?.sectionTitles?.process, locale, ""),
    products: pickLocale(data?.sectionTitles?.products, locale, ""),
    benefits: pickLocale(data?.sectionTitles?.benefits, locale, ""),
  };

  const formContent = {
    title: pickLocale(data?.form?.title, locale, ""),
    description: pickLocale(data?.form?.description, locale, ""),
    fullNameLabel: pickLocale(data?.form?.fullNameLabel, locale, ""),
    emailLabel: pickLocale(data?.form?.emailLabel, locale, ""),
    phoneLabel: pickLocale(data?.form?.phoneLabel, locale, ""),
    serviceLabel: pickLocale(data?.form?.serviceLabel, locale, ""),
    messageLabel: pickLocale(data?.form?.messageLabel, locale, ""),
    submitLabel: pickLocale(data?.form?.submitLabel, locale, ""),
    sendingLabel: pickLocale(data?.form?.sendingLabel, locale, ""),
    successTitle: pickLocale(data?.form?.successTitle, locale, ""),
    successMessage: pickLocale(data?.form?.successMessage, locale, ""),
    selectServiceLabel: pickLocale(data?.form?.selectServiceLabel, locale, ""),
    consentLabel: pickLocale(data?.form?.consentLabel, locale, ""),
    errorMessage: pickLocale(data?.form?.errorMessage, locale, ""),
    networkErrorMessage: pickLocale(data?.form?.networkErrorMessage, locale, ""),
    services: isRTL ? data?.form?.services?.ar || [] : data?.form?.services?.en || [],
  };

  const breadcrumbItems = [
    { name: hero.title || formContent.title, href: `/${locale}/private-labeling` },
  ];

  const heroStats = process
    .slice(0, 4)
    .map((item) => item.title || item.description)
    .filter(Boolean);
  const hasHeroContent = Boolean(hero.title || hero.subtitle || hero.description || hero.ctaText);
  const hasHeroMedia = Boolean(hero.image);
  const hasIntroContent = Boolean(intro.heading || intro.description);
  const hasWhatIsContent = Boolean(whatIs.title || whatIs.description);
  const hasCtaContent = Boolean(cta.title || cta.description || cta.buttonText);
  const hasFormIntroContent = Boolean(formContent.title || formContent.description);

  return (
    <main className="bg-white text-brand-primary">
      <style>{`
        @media (min-width: 1024px) {
          .private-labeling-whatis-square {
            height: 50vw;
          }
        }
      `}</style>
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {(hasHeroContent || hasHeroMedia) && (
        <section className="bg-[#f8f3ef]">
          <div className={`grid ${hasHeroContent && hasHeroMedia ? "lg:min-h-[calc(100vh-96px)] lg:grid-cols-2 lg:items-stretch" : ""}`}>
            {hasHeroContent && (
              <div className={`flex flex-col justify-center gap-10 px-5 py-10 md:px-7 md:py-14 lg:order-2 lg:justify-between lg:px-12 lg:py-16 ${isRTL ? "lg:order-1" : ""}`}>
                <div className="max-w-3xl">
                  {hero.subtitle && (
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary/55">
                      {hero.subtitle}
                    </p>
                  )}
                  {hero.title && (
                    <h1 className="max-w-[12ch] text-[28px] font-normal leading-[1.05] tracking-normal text-brand-primary sm:text-[32px] md:text-[42px] lg:text-[56px]">
                      {hero.title}
                    </h1>
                  )}
                </div>
                <div className="max-w-2xl">
                  {hero.description && (
                    <p className="text-sm leading-7 text-brand-primary/70 md:text-base md:leading-8 lg:text-lg">
                      {hero.description}
                    </p>
                  )}
                  {hero.ctaText && hero.ctaLink && (
                    <Link
                      href={hero.ctaLink}
                      className="mt-8 inline-flex min-h-11 items-center gap-3 bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                    >
                      {hero.ctaText}
                      <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                    </Link>
                  )}
                </div>
              </div>
            )}
            {hasHeroMedia && (
              <BackgroundMedia
                image={hero.image}
                label={hero.title}
                className={`min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:order-1 lg:min-h-full ${isRTL ? "lg:order-2" : ""}`}
              >
                {heroStats.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/30 px-5 py-8 text-white">
                    <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-3 text-center sm:gap-4 md:gap-5">
                      {heroStats.map((stat, idx) => (
                        <div
                          key={`${stat}-${idx}`}
                          className="max-w-[18ch] text-center text-xl font-bold leading-tight text-white opacity-50 transition-opacity duration-300 hover:opacity-100 sm:text-2xl md:text-3xl lg:text-4xl"
                        >
                          <span className="block">{stat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </BackgroundMedia>
            )}
          </div>
        </section>
      )}

      {(hasIntroContent || intro.image) && (
        <section className="bg-white">
          <div className={`grid ${hasIntroContent && intro.image ? "lg:grid-cols-2" : ""}`}>
            {hasIntroContent && (
              <div className={`flex aspect-square flex-col justify-center px-5 py-10 md:px-7 md:py-14 lg:px-12 xl:px-16 ${isRTL ? "lg:order-2" : ""}`}>
                {intro.heading && (
                  <h2 className="max-w-xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
                    {intro.heading}
                  </h2>
                )}
                {intro.description && (
                  <p className="mt-8 max-w-2xl text-base leading-8 text-brand-primary/70 md:text-lg">
                    {intro.description}
                  </p>
                )}
              </div>
            )}
            {intro.image && (
              <BackgroundMedia
                image={intro.image}
                label={intro.heading || hero.title}
                className={`aspect-square min-h-0 ${isRTL ? "lg:order-1" : ""}`}
              />
            )}
          </div>
        </section>
      )}

      {(hasWhatIsContent || whatIs.image) && (
        <section className="bg-[#f8f3ef]">
          <div className={`grid ${hasWhatIsContent && whatIs.image ? "private-labeling-whatis-square lg:grid-cols-2 lg:items-stretch" : ""}`}>
            {whatIs.image && (
              <BackgroundMedia
                image={whatIs.image}
                label={whatIs.title || hero.title}
                className={`lg:h-full lg:min-h-0 ${isRTL ? "lg:order-2" : ""}`}
              />
            )}
            {hasWhatIsContent && (
              <div className={`flex min-h-[420px] flex-col justify-center bg-white px-5 py-16 text-brand-primary md:px-7 md:py-20 lg:min-h-0 lg:px-12 xl:px-16 ${isRTL ? "lg:order-1" : ""}`}>
                {whatIs.title && (
                  <h2 className="max-w-xl text-3xl font-normal leading-tight md:text-5xl">
                    {whatIs.title}
                  </h2>
                )}
                {whatIs.description && (
                  <p className="mt-8 max-w-2xl text-base leading-8 text-brand-primary/70 md:text-lg">
                    {whatIs.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {process.length > 0 && (
        <section className="bg-[#f8f3ef] px-5 py-16 md:px-7 md:py-20 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            {sectionTitles.process && (
              <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                <h2 className="max-w-2xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
                  {sectionTitles.process}
                </h2>
                {process[0]?.description && (
                  <p className="text-base leading-8 text-brand-primary/70 md:text-lg">
                    {process[0].description}
                  </p>
                )}
              </div>
            )}
            <div className={sectionTitles.process ? "mt-10" : ""}>
              <NumberedGrid items={process} columns="md:grid-cols-2 lg:grid-cols-4" />
            </div>
          </div>
        </section>
      )}

      {whyChoose.length > 0 && (
        <section className="bg-white px-5 py-16 md:px-7 md:py-20 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading title={sectionTitles.whyChoose} />
            <NumberedGrid items={whyChoose} columns="md:grid-cols-3" />
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="bg-white px-5 py-16 md:px-7 md:py-20 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading title={sectionTitles.products} />
            <div className="grid w-full gap-px overflow-hidden border border-brand-primary/10 bg-brand-primary/10 md:grid-cols-3">
              {products.map((item, idx) => (
                <article key={`${item.title}-${idx}`} className="bg-white">
                  {item.image && (
                    <div
                      className="relative aspect-square overflow-hidden bg-brand-beige bg-cover bg-center bg-fixed"
                      style={fixedBackgroundStyle(item.image)}
                      role="img"
                      aria-label={item.title}
                    />
                  )}
                  <div className="p-7">
                    {item.title && (
                      <h3 className="text-xl font-normal leading-snug text-brand-primary">
                        {item.title}
                      </h3>
                    )}
                    {item.description && (
                      <p className="mt-3 text-sm leading-7 text-brand-primary/60">
                        {item.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {benefits.length > 0 && (
        <section className="bg-[#f8f3ef] px-5 py-16 md:px-7 md:py-20 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading title={sectionTitles.benefits} />
            <NumberedGrid items={benefits} columns="md:grid-cols-2 lg:grid-cols-4" />
          </div>
        </section>
      )}

      {hasCtaContent && (
        <section className="bg-white px-5 py-16 md:px-7 md:py-20 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl bg-brand-primary px-6 py-12 text-white md:px-10 md:py-14 lg:px-14">
            {cta.title && (
              <h2 className="mb-4 max-w-4xl text-3xl font-normal leading-tight text-white md:text-5xl">
                {cta.title}
              </h2>
            )}
            {cta.description && (
              <p className="mb-8 max-w-2xl text-sm leading-7 text-white/70 md:text-base md:leading-8">
                {cta.description}
              </p>
            )}
            {cta.buttonText && cta.buttonLink && (
              <Link
                href={cta.buttonLink}
                className="inline-flex min-h-11 items-center gap-3 bg-white px-6 text-sm font-semibold text-brand-primary transition-colors hover:bg-white/85"
              >
                {cta.buttonText}
                <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              </Link>
            )}
          </div>
        </section>
      )}

      <section id="enquiry-form" className="bg-white px-0 pb-0">
        <div className="w-full">
          <div className={`grid overflow-hidden border border-brand-primary/10 bg-brand-primary/10 ${hasFormIntroContent ? "lg:grid-cols-2 lg:items-stretch" : ""}`}>
            {hasFormIntroContent && (
              <div className="flex aspect-square min-h-[320px] flex-col justify-center bg-[#f4f4f4] px-6 py-12 text-brand-primary md:px-10 md:py-14 lg:px-12">
                {formContent.title && (
                  <h2 className="max-w-md text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
                    {formContent.title}
                  </h2>
                )}
                {formContent.description && (
                  <p className="mt-6 max-w-md text-sm leading-7 text-brand-primary/70 md:text-base">
                    {formContent.description}
                  </p>
                )}
              </div>
            )}
            <div className="flex h-full items-center justify-center bg-white p-5 sm:p-6 md:p-10 lg:p-12">
              <div className="w-full max-w-3xl">
                <PrivateLabelingForm locale={locale} content={formContent} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
