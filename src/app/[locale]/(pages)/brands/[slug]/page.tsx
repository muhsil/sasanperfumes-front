import { notFound } from "next/navigation";
import Image from "next/image";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getBrand, getBrands, getFeatureToggles, pickLocale } from "@/lib/api/wordpress";
import { getProducts } from "@/lib/api/woocommerce";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import { ProductListing } from "@/components/shop/ProductListing";
import { BLUR_DATA_URL, cn, decodeHtmlEntities } from "@/lib/utils";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 300;

interface BrandPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const brands = await getBrands();
  const params: { locale: string; slug: string }[] = [];
  for (const brand of brands) {
    params.push({ locale: "en", slug: brand.slug });
    params.push({ locale: "ar", slug: brand.slug });
  }
  return params;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = locale as Locale;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_brands_page_enabled) return {};
  const brand = await getBrand(slug);
  if (!brand) return {};

  const seoTitle = decodeHtmlEntities(pickLocale(brand.seo?.title, locale, "") || brand.name);
  const seoDesc =
    decodeHtmlEntities(pickLocale(brand.seo?.description, locale, "") ||
    pickLocale(brand.shortDesc, locale, brand.description || ""));

  return generateSeoMetadata({
    title: seoTitle,
    description: seoDesc,
    locale: lang,
    pathname: `/brands/${slug}`,
    image: brand.banner || brand.image || undefined,
  });
}

export default async function BrandDetailPage({ params }: BrandPageProps) {
  const { locale, slug } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_brands_page_enabled) notFound();
  const brand = await getBrand(slug);
  if (!brand) notFound();
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(),
    getRequestFrontendHost(),
  ]);

  const isRTL = locale === "ar";
  const brandName = decodeHtmlEntities(brand.name);

  const aboutTitle = decodeHtmlEntities(pickLocale(brand.aboutTitle, locale, `About ${brandName}`));
  const aboutContent = decodeHtmlEntities(pickLocale(brand.aboutContent, locale, brand.description || ""));
  const shortDesc = decodeHtmlEntities(pickLocale(brand.shortDesc, locale, brand.description || ""));

  const { products } = await getProducts({
    per_page: 20,
    locale: locale as Locale,
    brand: slug,
    currency: market.defaultCurrency,
    frontendHost,
  });

  const breadcrumbItems = [
    { name: isRTL ? "Ø§Ù„Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©" : "Brands", href: `/${locale}/brands` },
    { name: brandName, href: `/${locale}/brands/${slug}` },
  ];

  const brandImage = brand.logo || brand.banner || brand.image;
  const aboutBackgroundImage = brand.banner || brand.image || "";
  const aboutParagraphs = aboutContent
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="bg-[#f8f3ef] text-brand-primary" dir={isRTL ? "rtl" : "ltr"}>
      <section className="bg-[#f8f3ef] px-4 pb-6 pt-8 md:pb-8 md:pt-10">
        <div className="grid items-center gap-5 md:grid-cols-[112px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[136px_minmax(0,1fr)]">
          <div className={`relative mx-auto aspect-square w-28 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(231,222,215,0.8)] md:w-28 lg:w-32 ${isRTL ? "md:order-2 md:mx-0" : "md:order-1 md:mx-0"}`}>
            {brandImage ? (
              <Image
                src={brandImage}
                alt={brandName}
                fill
                sizes="(max-width: 768px) 112px, 136px"
                className="h-full w-full object-cover"
                style={{ objectPosition: "center" }}
                priority
                unoptimized={shouldUseUnoptimizedImage(brandImage)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white">
                <span className="text-2xl font-semibold text-brand-primary/30">
                  {brandName.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <div className={`${isRTL ? "text-right md:order-1" : "text-left md:order-2"}`}>
<h1 className="mt-2 text-3xl font-normal leading-tight text-brand-primary md:text-4xl lg:text-5xl">
              {brandName}
            </h1>
            {shortDesc && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-primary/65 md:text-base md:leading-7">
                {shortDesc}
              </p>
            )}
          </div>
        </div>
      </section>

      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      <section className="bg-[#f8f3ef] pb-0 pt-3 md:pt-4 lg:pt-5">
        <div className="mb-5 px-4 md:mb-6">
          <h2 className="text-2xl font-normal text-brand-primary md:text-3xl">
            {isRTL ? `Ù…Ù†ØªØ¬Ø§Øª ${brandName}` : `${brandName} Products`}
          </h2>
        </div>
        {products.length > 0 ? (
          <ProductListing products={products} locale={locale as Locale} showToolbar={false} />
        ) : (
          <div className="py-12 text-center">
            <p className="text-brand-primary/50">
              {isRTL ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª Ø­Ø§Ù„ÙŠØ§Ù‹" : "No products available yet"}
            </p>
          </div>
        )}
      </section>

      {aboutContent && (
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#1a1a2e_0%,#16213e_50%,#0f3460_100%)] py-16 md:py-20 lg:py-24">
          {aboutBackgroundImage && (
            <Image
              src={aboutBackgroundImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              unoptimized={shouldUseUnoptimizedImage(aboutBackgroundImage)}
            />
          )}
          <div className="absolute inset-0 bg-brand-primary/55" />
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

          <div className="relative w-full px-4 py-8 md:py-10 lg:py-12">
            <div className="flex min-h-90 flex-col lg:min-h-110">
              <div className={cn("flex flex-col justify-start pb-6 pt-2 lg:pb-8 lg:pt-3", isRTL ? "items-end" : "items-start")}>
                <div className="mb-4 h-2 w-2 rounded-full bg-brand-gold" />
                <h2 className={cn("max-w-xl text-3xl font-semibold leading-tight tracking-wide text-white sm:text-4xl md:text-5xl lg:text-6xl", isRTL ? "text-right" : "text-left")}>
                  {aboutTitle}
                </h2>
                <div className={cn("mt-6 h-0.5 w-20 bg-brand-gold", isRTL ? "origin-right" : "origin-left")} />
                <div className={cn("mt-6 flex flex-col space-y-2", isRTL ? "items-end" : "items-start")}>
                  <div className="h-px w-12 bg-brand-gold/40" />
                  <div className="h-px w-8 bg-brand-gold/20" />
                </div>
              </div>

              <div className={cn("flex max-w-xl flex-col justify-end space-y-0 pb-4 lg:pb-6", isRTL ? "mr-auto items-start" : "ml-auto items-end")}>
                {(aboutParagraphs.length > 0 ? aboutParagraphs : [aboutContent]).map((paragraph, idx, paragraphs) => (
                  <div key={idx} className="group w-full">
                    <p className={cn("text-base leading-[1.8] text-white/80 transition-all duration-300 group-hover:text-white/95 md:text-lg md:leading-[1.95]", isRTL ? "text-right" : "text-left")}>
                      {paragraph}
                    </p>
                    {idx < paragraphs.length - 1 && (
                      <div className={cn("mb-4 mt-4 h-px w-12", isRTL ? "bg-gradient-to-l from-brand-gold/40 to-transparent" : "bg-gradient-to-r from-brand-gold/40 to-transparent")} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className={cn("pointer-events-none absolute bottom-0 h-40 w-40 rounded-full bg-brand-gold/5 blur-3xl", isRTL ? "left-0" : "right-0")} />
          </div>
        </section>
      )}

      {brand.notes.length > 0 && (
        <section className="bg-[#232323] px-4 pb-8 pt-8 text-white md:pb-10 md:pt-10">
          <div>
            <div className="mb-8 flex flex-col gap-3 md:mb-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
                {isRTL ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø¹Ø·Ø±" : "Scent Profile"}
              </p>
              <h2 className="text-2xl font-normal text-white md:text-3xl">
                {isRTL ? "Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ø¹Ø·Ø±" : "Perfume Notes"}
              </h2>
            </div>
            <div className="grid gap-0 border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {brand.notes.map((note, idx) => {
                const noteTitle = decodeHtmlEntities(pickLocale(note.title, locale, ""));
                const noteDesc = decodeHtmlEntities(pickLocale(note.description, locale, ""));
                const noteImage = note.image?.trim() || "";
                return (
                  <div
                    key={idx}
                    className="relative border-b border-white/10 px-4 py-8 transition-colors duration-300 hover:bg-[#2b2b2b]"
                  >
                    {noteImage && (
                      <div className="mb-4 h-16 w-16 overflow-hidden rounded-full bg-white/10 transition-colors duration-300">
                        <Image
                          src={noteImage}
                          alt={noteTitle || brandName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          style={{ objectPosition: "center" }}
                          unoptimized={shouldUseUnoptimizedImage(noteImage)}
                        />
                      </div>
                    )}
                    {noteTitle && <h3 className="note-title mb-2 text-base font-medium text-white transition-colors duration-300 md:text-lg">{noteTitle}</h3>}
                    {noteDesc && <p className="note-desc text-xs leading-relaxed text-white/65 transition-colors duration-300">{noteDesc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
