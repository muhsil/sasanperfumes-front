import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getStaticPageContent, pickLocale, mapRepeater, getPageSeo, getFeatureToggles } from "@/lib/api/wordpress";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 300;

interface WhatWeDoPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: WhatWeDoPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_what_we_do_enabled) return {};
  const wpSeo = await getPageSeo("what-we-do", lang);
  const wp = await getStaticPageContent("what-we-do");
  const title = wpSeo?.title || pickLocale(wp?.title, locale, "");
  const description = wpSeo?.description || pickLocale(wp?.hero_description, locale, "");

  return generateSeoMetadata({
    title,
    description,
    locale: lang,
    pathname: "/what-we-do",
  });
}

export default async function WhatWeDoPage({ params }: WhatWeDoPageProps) {
  const { locale } = await params;
  const isRTL = locale === "ar";
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_what_we_do_enabled) notFound();
  const wp = await getStaticPageContent("what-we-do");

  const title = pickLocale(wp?.title, locale, "");
  const subtitle = pickLocale(wp?.subtitle, locale, "");
  const heroDescription = pickLocale(wp?.hero_description, locale, "");
  const content = pickLocale(wp?.content, locale, "");
  const features = mapRepeater(wp?.whatwedo_features, locale, (item) => ({
    image: item.image || "",
    title: typeof item.title === "object" ? (locale === "ar" ? item.title.ar : item.title.en) : (locale === "ar" ? (item.title_ar || "") : (item.title_en || "")),
    description: typeof item.desc === "object" ? (locale === "ar" ? item.desc.ar : item.desc.en) : (locale === "ar" ? (item.desc_ar || "") : (item.desc_en || "")),
  }));

  const breadcrumbItems = [
    { name: title || (isRTL ? "ماذا نفعل" : "What We Do"), href: `/${locale}/what-we-do` },
  ];

  return (
    <main>
      <PageHeader title={title} subtitle={subtitle} description={heroDescription} isRTL={isRTL} />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Main Content */}
      {content && (
        <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
          <div className="px-5 md:px-7 lg:px-12">
            <div className="max-w-3xl text-sm leading-relaxed text-brand-primary/70" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
          <div className="px-5 md:px-7 lg:px-12">
            <div className="mb-8">
              <h2 className="font-normal text-2xl text-brand-primary md:text-3xl">
                {isRTL ? "ما يميزنا" : "What Sets Us Apart"}
              </h2>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => (
                <div key={idx} className="group border border-[#e7ded7] overflow-hidden transition-all duration-300 hover:shadow-md">
                  {feature.image ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        unoptimized={shouldUseUnoptimizedImage(feature.image)}
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-[#f8f3ef] flex items-center justify-center">
                      <span className="text-2xl font-normal text-brand-primary/30">{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                  )}
                  <div className="bg-white p-4">
                    <h3 className="text-sm font-normal text-brand-primary leading-snug">{feature.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-brand-primary/60">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CMS content fallback message when empty */}
      {!content && features.length === 0 && (
        <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-8 px-5 md:px-7 lg:px-12 text-center">
          <p className="text-lg text-brand-primary/50">
            {isRTL ? "المحتوى قادم قريباً" : "Content coming soon"}
          </p>
        </section>
      )}
    </main>
  );
}
