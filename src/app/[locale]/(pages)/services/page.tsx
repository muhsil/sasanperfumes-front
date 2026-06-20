import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import Image from "next/image";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getServices, getServicesPageSettings, getFeatureToggles, pickLocale } from "@/lib/api/wordpress";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

export const revalidate = 300;

interface ServicesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ServicesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_services_page_enabled) return {};
  const pageSettings = await getServicesPageSettings();
  const title = pickLocale(pageSettings?.seo?.title, locale, "") ||
    pickLocale(pageSettings?.title, locale, "");
  const description = pickLocale(pageSettings?.seo?.description, locale, "") ||
    pickLocale(pageSettings?.description, locale, "");

  return generateSeoMetadata({
    title,
    description,
    locale: lang,
    pathname: "/services",
  });
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const isRTL = locale === "ar";

  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_services_page_enabled) notFound();

  const [services, pageSettings] = await Promise.all([
    getServices(),
    getServicesPageSettings(),
  ]);

  const title = pickLocale(pageSettings?.title, locale, "");
  const subtitle = pickLocale(pageSettings?.subtitle, locale, "");
  const description = pickLocale(pageSettings?.description, locale, "");
  const ctaTitle = pickLocale(pageSettings?.ctaTitle, locale, "");
  const ctaButton = pickLocale(pageSettings?.ctaButton, locale, "");
  const ctaLink = pageSettings?.ctaLink || "/contact";

  const breadcrumbItems = [
    { name: isRTL ? "الخدمات" : "Services", href: `${pathPrefix}/${locale}/services` },
  ];

  return (
    <main>
      <PageHeader title={title} subtitle={subtitle} description={description} isRTL={isRTL} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Services Grid */}
      <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
        {services.length > 0 ? (
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const serviceTitle = pickLocale(service.title, locale, "");
              const serviceExcerpt = pickLocale(service.excerpt, locale, "");
              return (
                <Link
                  key={service.id}
                  href={`${pathPrefix}/${locale}/services/${service.slug}`}
                  className="group flex flex-col border border-[#e7ded7] overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={serviceTitle}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized={shouldUseUnoptimizedImage(service.image)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <svg className="h-16 w-16 text-brand-primary/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="mb-2 text-sm font-normal text-brand-primary">
                      {serviceTitle}
                    </h2>
                    {serviceExcerpt && (
                      <p className="mb-3 line-clamp-3 text-sm text-brand-primary/60">{serviceExcerpt}</p>
                    )}
                    <span className="inline-flex items-center gap-2 text-xs font-normal text-brand-primary/60">
                      {isRTL ? "اعرف المزيد" : "Learn More"}
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-brand-primary/50">
              {isRTL ? "لا توجد خدمات حالياً" : "No services available at the moment"}
            </p>
          </div>
        )}
      </section>

      {/* CTA */}
      {ctaTitle && (
        <section className="border-t border-[#e7ded7] bg-white pt-8 md:pt-10 lg:pt-12 pb-8">
          <div className="px-4">
            <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">{ctaTitle}</h2>
            <Link
              href={ctaLink.startsWith("/") ? `/${locale}${ctaLink}` : ctaLink}
              className="mt-4 inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase transition-colors hover:text-brand-primary/70"
            >
              {ctaButton}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
