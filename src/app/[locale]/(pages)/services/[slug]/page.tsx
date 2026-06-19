import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getService, getServices, getFeatureToggles, pickLocale } from "@/lib/api/wordpress";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 300;

interface ServicePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const services = await getServices();
  const params: { locale: string; slug: string }[] = [];
  for (const s of services) {
    params.push({ locale: "en", slug: s.slug });
    params.push({ locale: "ar", slug: s.slug });
  }
  return params;
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_services_page_enabled) return {};
  const service = await getService(slug);
  if (!service) return {};

  const title = pickLocale(service.seo?.title, locale, "") || pickLocale(service.title, locale, "");
  const description = pickLocale(service.seo?.description, locale, "") || pickLocale(service.excerpt, locale, "");

  return generateSeoMetadata({
    title,
    description,
    locale: lang,
    pathname: `/services/${slug}`,
    image: service.bannerImage || service.image || undefined,
  });
}


export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { locale, slug } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_services_page_enabled) notFound();
  const service = await getService(slug);
  if (!service) notFound();

  const isRTL = locale === "ar";

  const title = pickLocale(service.title, locale, "");
  const excerpt = pickLocale(service.excerpt, locale, "");
  const content = pickLocale(service.content, locale, "");
  const features = service.features.map((f) => ({
    image: f.image,
    title: pickLocale(f.title, locale, ""),
    description: pickLocale(f.description, locale, ""),
  }));

  const breadcrumbItems = [
    { name: isRTL ? "الخدمات" : "Services", href: `/${locale}/services` },
    { name: title, href: `/${locale}/services/${slug}` },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="bg-[#f8f3ef] px-4 pb-6 pt-8 text-brand-primary md:pb-8 md:pt-10">
        <p className="mb-2 text-xs font-normal uppercase tracking-[0.1em] text-brand-primary/40">
          {isRTL ? "خدمة" : "Service"}
        </p>
        <h1 className="text-[36px] font-normal leading-none tracking-normal md:text-[48px]">{title}</h1>
        {excerpt && <p className="mt-2 text-lg font-normal tracking-normal text-brand-primary/60">{excerpt}</p>}
      </section>

      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Featured Image */}
      {service.image && (
        <section className="px-4 mb-8">
          <div className="relative max-w-4xl aspect-[16/9] overflow-hidden">
            <Image
              src={service.image}
              alt={title}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
              unoptimized={shouldUseUnoptimizedImage(service.image)}
            />
          </div>
        </section>
      )}

      {/* Content */}
      {content && (
        <section className="px-4 py-8 md:py-10">
          <article
            className="prose prose-lg mx-auto max-w-4xl prose-headings:text-brand-primary prose-p:text-brand-primary/70 prose-a:text-brand-gold"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="bg-white py-8 md:py-10">
          <div className="px-4">
            <h2 className="mb-8 font-normal text-2xl text-brand-primary md:text-3xl">
              {isRTL ? "المميزات" : "Key Features"}
            </h2>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => (
                <div key={idx} className="group border-t border-[#e7ded7] p-6">
                  {feature.image ? (
                    <div className="mb-4 h-12 w-12 overflow-hidden bg-[#f8f3ef] p-2">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain"
                        unoptimized={shouldUseUnoptimizedImage(feature.image)}
                      />
                    </div>
                  ) : (
                    <div className="mb-4 flex h-8 w-8 items-center justify-center text-brand-primary">
                      <span className="text-sm font-normal">{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                  )}
                  <h3 className="mb-2 text-sm font-normal text-brand-primary">{feature.title}</h3>
                  <p className="text-xs leading-relaxed text-brand-primary/60">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-[#f8f3ef] py-8 md:py-10">
        <div className="px-4">
          <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">
            {isRTL ? "هل تحتاج هذه الخدمة؟" : "Interested in this service?"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-brand-primary/60">
            {isRTL
              ? "تواصل معنا للحصول على استشارة مخصصة"
              : "Get in touch with us for a personalized consultation"}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="mt-4 inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
          >
            {isRTL ? "تواصل معنا" : "Contact Us"}
          </Link>
        </div>
      </section>

      {/* Back to Services */}
      <section className="px-4 py-8">
        <Link
          href={`/${locale}/services`}
          className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
        >
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {isRTL ? "جميع الخدمات" : "All Services"}
        </Link>
      </section>
    </main>
  );
}
