import Link from "next/link";
import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FlaskConical, Leaf, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/i18n";
import { generateMetadata as generateSeoMetadata, generateFAQJsonLd } from "@/lib/utils/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getPageBySlug,
  getPageSeo,
  getStaticPageContent,
  pickLocale,
  mapRepeater,
  getServices,
  getFeatureToggles,
  stripHtmlTags,
} from "@/lib/api/wordpress";
import { BLUR_DATA_URL } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { ServicesWithAnimation } from "@/components/sections";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

const defaultKeywords = {
  en: [
    "about Sasan Perfumes",
    "UAE perfumery",
    "fragrance crafting",
    "premium perfumes",
    "our story",
    "natural fragrances",
    "handcrafted perfume Dubai",
    "natural fragrance ingredients",
    "UAE perfume house",
    "authentic Arabian oud",
    "luxury perfume brand UAE",
    "Dubai fragrance house",
  ],
  ar: [
    "عن شيب هايف",
    "عطور إماراتية",
    "صناعة العطور",
    "عطور فاخرة",
    "قصتنا",
    "عطور طبيعية",
    "عطور يدوية دبي",
    "مكونات عطرية طبيعية",
    "بيت عطور الإمارات",
    "عود عربي أصلي",
    "عطور عربية أصلية",
    "عطور دبي فاخرة",
  ],
};

const arabicKeywords = [
  "عن شيب هايف",
  "عطور إماراتية",
  "صناعة العطور",
  "عطور فاخرة",
  "قصتنا",
  "عطور طبيعية",
  "عطور يدوية دبي",
  "مكونات عطرية طبيعية",
  "بيت عطور الإمارات",
  "عود عربي أصلي",
  "عطور عربية أصلية",
  "عطور دبي فاخرة",
];

/*
  ar: {
    heroSubtitle: "بيت عطور في الإمارات",
    title: "نصنع عطوراً مميزة بدقة وعناية وذوق عربي معاصر.",
    heroDescription:
      "تجمع شيب هايف بين المكونات المختارة والتركيبات المتقنة وخدمات الإنتاج الموثوقة للعملاء والعلامات التجارية في الإمارات.",
    stats: ["من الإمارات", "عطور فاخرة", "علامات خاصة", "تركيبات مخصصة"],
    mainTitle: "شريك عطري يركز على الجودة.",
    mainParagraphs: [
      "نعمل مع محبي العطور وتجار التجزئة ورواد الأعمال الذين يبحثون عن روائح مميزة وجاهزة للسوق.",
      "يبدأ كل مشروع بفهم الفكرة، ثم اختيار المواد المناسبة، وتطوير التركيبة، وتقديمها بصورة متقنة.",
      "من اختيار العطر الشخصي إلى تطوير العلامات الخاصة، هدفنا أن تكون رحلة صناعة العطر واضحة وموثوقة وجميلة.",
    ],
    uniqueTitle: "ما الذي يميزنا",
    uniqueSubtitle: "مزيج عملي من الإبداع والتوريد والانضباط في الإنتاج.",
    uniqueContent:
      "نركز على عطور عملية وقوية تجارياً ومناسبة للذوق الإقليمي، مع إبقاء التجربة بسيطة وواضحة للعملاء.",
    journeyTitle: "من الفكرة إلى العطر النهائي",
    journeyContent:
      "يساعد فريقنا في تطوير كل عطر من الاتجاه الأولي إلى العينات واختيار المكونات وإرشاد التغليف والتحضير للإطلاق.",
    missionTitle: "مهمتنا",
    missionContent:
      "جعل تطوير العطور عالية الجودة متاحاً للعملاء والعلامات الناشئة دون التنازل عن التفاصيل أو الخدمة أو اللمسة النهائية.",
    visionTitle: "رؤيتنا",
    visionContent:
      "أن نكون وجهة عطرية موثوقة في الإمارات معروفة بالروائح الراقية والإرشاد الصادق ودعم بناء العلامات.",
    coreValuesTitle: "قيمنا",
    coreValuesSubtitle: "المعايير التي تقف خلف كل عطر نطوره.",
    values: [
      {
        title: "نزاهة المكونات",
        description: "نختار المواد وفقاً للأداء والشخصية ومدى ملاءمتها لاتجاه العطر النهائي.",
      },
      {
        title: "تعاون واضح",
        description: "نجعل العملية مفهومة من الفكرة الأولى وحتى المنتج النهائي.",
      },
      {
        title: "تقديم راق",
        description: "نهتم بإحساس العطر ومظهره وأدائه في تجربة العميل الحقيقية.",
      },
    ],
    ingredientsTitle: "مكونات ذات شخصية",
    ingredientsSubtitle: "عود وعنبر ومسك وزهور وأخشاب وتوابل ونوتات عصرية.",
    ingredientsDesc:
      "توازن مجموعتنا بين البصمة العطرية الإقليمية والطابع الفاخر المعاصر، لتمنح كل تركيبة عمقاً ووضوحاً وجاذبية تدوم.",
    ctaTitle: "اصنع عطرك القادم معنا.",
    ctaSubtitle:
      "اكتشف عطورنا الجاهزة أو ابدأ مشروع علامة خاصة مع فريقنا.",
    ctaButton: "ابدأ عطرك",
  },
*/

function localizedHref(rawHref: string, locale: string, fallback: string, pathPrefix = "") {
  const href = rawHref || fallback;
  if (href.startsWith("http") || href.startsWith(`${pathPrefix}/${locale}/`)) return href;
  if (href.startsWith("/")) return `${pathPrefix}/${locale}${href}`;
  return `${pathPrefix}/${locale}/${href}`;
}

function pickImageUrl(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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
      className={`relative min-h-[280px] overflow-hidden bg-brand-beige sm:min-h-[360px] md:min-h-[420px] lg:min-h-[520px] ${className}`}
      role={image && !children ? "img" : undefined}
      aria-label={image && !children ? label : undefined}
    >
      {image && (
        <Image
          src={image}
          alt={children ? "" : label}
          fill
          sizes="(max-width: 1023px) 100vw, 50vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          unoptimized={shouldUseUnoptimizedImage(image)}
        />
      )}
      {children}
    </div>
  );
}

async function HomepageServicesSection({ locale, isRTL }: { locale: Locale; isRTL: boolean }) {
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_home_services_enabled) return null;
  const services = await getServices();
  if (!services || services.length === 0) return null;

  return (
    <ServicesWithAnimation
      services={services.slice(0, 8)}
      locale={locale}
      isRTL={isRTL}
    />
  );
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const dictionary = await getDictionary(lang);
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_about_enabled) return {};
  const pageContent = dictionary.pages.about;
  const wpSeo = (await getPageSeo("about", lang)) ?? (await getPageSeo("about-us", lang));

  return generateSeoMetadata({
    title: wpSeo?.title || pageContent.seo.title,
    description: wpSeo?.description || pageContent.seo.description,
    image: wpSeo?.ogImage || undefined,
    locale: lang,
    pathname: "/about-us",
    keywords: lang === "ar" ? arabicKeywords : defaultKeywords.en,
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const toggles = await getFeatureToggles();
  if (!toggles.sasanperfumes_about_enabled) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const [wpPageConfig, wpPageConfigFallback, legacyWordPressPage] = await Promise.all([
    getStaticPageContent("about"),
    getStaticPageContent("about-us"),
    getPageBySlug("about-us", locale as Locale),
  ]);

  const wp = wpPageConfig || wpPageConfigFallback;
  const legacyTitle = legacyWordPressPage ? stripHtmlTags(legacyWordPressPage.title.rendered) : "";
  const legacyBodyHtml = legacyWordPressPage?.content?.rendered || "";
  const legacyBodyText = legacyBodyHtml ? stripHtmlTags(legacyBodyHtml) : "";
  const hasLegacyWordPressContent = Boolean(legacyBodyText || legacyTitle);
  const aboutImages = {
    hero: pickImageUrl(wp?.heroImage, wp?.hero_image),
    story: pickImageUrl(wp?.storyImage, wp?.story_image),
    detail: pickImageUrl(wp?.detailImage, wp?.detail_image),
    mission: pickImageUrl(
      wp?.missionImage,
      wp?.missionVisionImage,
      wp?.mission_image,
      wp?.mission_vision_image,
      wp?.about_mission_image
    ),
  };

  const heroSubtitle = pickLocale(wp?.hero_subtitle, locale, "");
  const title = pickLocale(wp?.title, locale, "");
  const heroDescription = pickLocale(wp?.hero_description, locale, "");

  const stats = [
    pickLocale(wp?.stats_since, locale, ""),
    pickLocale(wp?.stats_location, locale, ""),
    pickLocale(wp?.stats_handcrafted, locale, ""),
    pickLocale(wp?.stats_sustainable, locale, ""),
  ].filter(Boolean);
  const heroStats = stats;

  const mainTitle = pickLocale(wp?.main_title, locale, "");
  const mainParagraphs = [
    pickLocale(wp?.main_paragraph1 || wp?.main_p1, locale, ""),
    pickLocale(wp?.main_paragraph2 || wp?.main_p2, locale, ""),
    pickLocale(wp?.main_paragraph3 || wp?.main_p3, locale, ""),
  ].filter(Boolean);
  const storyParagraphs = mainParagraphs;

  const uniqueTitle = pickLocale(wp?.uniqueness_title, locale, "");
  const uniqueSubtitle = pickLocale(wp?.uniqueness_subtitle, locale, "");
  const uniqueContent = pickLocale(wp?.uniqueness_content, locale, "");

  const journeyTitle = pickLocale(wp?.journey_title, locale, "");
  const journeyContent = pickLocale(wp?.journey_content, locale, "");

  const missionTitle = pickLocale(wp?.mission_title, locale, "");
  const missionContent = pickLocale(wp?.mission_content, locale, "");
  const visionTitle = pickLocale(wp?.vision_title, locale, "");
  const visionContent = pickLocale(wp?.vision_content, locale, "");

  const coreValuesTitle = pickLocale(wp?.core_values_title, locale, "");
  const coreValuesSubtitle = pickLocale(wp?.core_values_subtitle, locale, "");
  const coreValuesItems = mapRepeater(wp?.about_core_values, locale, (item) => ({
    title: locale === "ar" ? (item.title?.ar || item.title_ar || "") : (item.title?.en || item.title_en || ""),
    description: locale === "ar" ? (item.description?.ar || item.description_ar || "") : (item.description?.en || item.description_en || ""),
  })).filter((item) => item.title || item.description);
  const valueItems = coreValuesItems;

  const ingredientsTitle = pickLocale(wp?.ingredients_title, locale, "");
  const ingredientsSubtitle = pickLocale(wp?.ingredients_subtitle, locale, "");
  const ingredientsDesc = pickLocale(wp?.ingredients_description || wp?.ingredients_desc, locale, "");
  const ingredientItems = mapRepeater(wp?.about_ingredients, locale, (item) => ({
    title: locale === "ar" ? (item.name?.ar || item.name_ar || "") : (item.name?.en || item.name_en || ""),
    description: locale === "ar" ? (item.desc?.ar || item.desc_ar || "") : (item.desc?.en || item.desc_en || ""),
    image: item.image || "",
  })).filter((item) => item.title || item.description || item.image);

  const ctaTitle = pickLocale(wp?.cta_title, locale, "");
  const ctaSubtitle = pickLocale(wp?.cta_subtitle, locale, "");
  const ctaButton = pickLocale(wp?.cta_button, locale, "");
  const rawCtaLink = pickLocale(wp?.cta_link, locale, "");
  const ctaLink = rawCtaLink ? localizedHref(rawCtaLink, locale, "", pathPrefix) : "";

  const brandFaqItems = mapRepeater(wp?.faq_items, locale, (item) => ({
    question: locale === "ar" ? (item.q?.ar || item.q_ar || "") : (item.q?.en || item.q_en || ""),
    answer: locale === "ar" ? (item.a?.ar || item.a_ar || "") : (item.a?.en || item.a_en || ""),
  })).filter((item) => item.question || item.answer);

  const breadcrumbItems = [
    { name: dictionary.common.about, href: `${pathPrefix}/${locale}/about-us` },
  ];

  const hasHeroContent = Boolean(heroSubtitle || title || heroDescription || (ctaButton && ctaLink));
  const hasHeroMedia = Boolean(aboutImages.hero || heroStats.length > 0);
  const hasStoryContent = Boolean(mainTitle || storyParagraphs.length > 0);
  const hasUniqueContent = Boolean(uniqueTitle || uniqueSubtitle || uniqueContent);
  const hasJourneyContent = Boolean(journeyTitle || journeyContent || coreValuesTitle || coreValuesSubtitle || valueItems.length > 0);
  const hasMissionContent = Boolean(missionTitle || missionContent || visionTitle || visionContent);
  const hasIngredientsContent = Boolean(ingredientsTitle || ingredientsSubtitle || ingredientsDesc || ingredientItems.length > 0);
  const hasCtaContent = Boolean(ctaTitle || ctaSubtitle || (ctaButton && ctaLink));
  const hasCMSContent = hasHeroContent || hasStoryContent || hasUniqueContent || hasJourneyContent || hasMissionContent || hasIngredientsContent || hasCtaContent;
  const pageHeading = title || legacyTitle || dictionary.common.about;

  return (
    <main className="bg-white text-brand-primary">
      <style>{`
        @media (min-width: 1024px) {
          .about-hero-square,
          .about-story-square,
          .about-mission-square {
            height: 50vw;
          }
        }
      `}</style>
      <JsonLd data={generateFAQJsonLd(brandFaqItems)} />

      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {!hasCMSContent && hasLegacyWordPressContent && (
        <section className="bg-white px-4 py-16 md:py-20 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 text-3xl font-light leading-tight text-brand-primary md:text-5xl">
              {pageHeading}
            </h1>
            <div
              className="prose prose-stone max-w-none text-brand-primary/80 [&_p]:text-base [&_p]:leading-8 [&_img]:w-full [&_img]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: legacyBodyHtml }}
            />
          </div>
        </section>
      )}

      {(hasHeroContent || hasHeroMedia) && (
        <section className="bg-[#f8f3ef]">
          <div className={`grid ${hasHeroContent && hasHeroMedia ? "about-hero-square lg:grid-cols-2 lg:items-stretch" : ""}`}>
            {hasHeroContent && (
              <div className={`flex flex-col justify-center gap-10 px-4 py-10 md:py-14 lg:order-2 lg:min-h-0 lg:justify-between lg:py-16 ${isRTL ? "lg:order-1" : ""}`}>
                <div className="max-w-3xl">
                  {heroSubtitle && (
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary/55">
                      {heroSubtitle}
                    </p>
                  )}
                  {title && (
                    <h1 className="max-w-[12ch] text-[28px] font-normal leading-[1.05] tracking-normal text-brand-primary sm:text-[32px] md:text-[42px] lg:text-[56px]">
                      {title}
                    </h1>
                  )}
                </div>
                <div className="max-w-2xl">
                  {heroDescription && (
                    <p className="text-sm leading-7 text-brand-primary/70 md:text-base md:leading-8 lg:text-lg">
                      {heroDescription}
                    </p>
                  )}
                  {ctaButton && ctaLink && (
                    <Link
                      href={ctaLink}
                      className="mt-8 inline-flex min-h-11 items-center gap-3 bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                    >
                      {ctaButton}
                      <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                    </Link>
                  )}
                </div>
              </div>
            )}
            {hasHeroMedia && (
              <BackgroundMedia
                image={aboutImages.hero}
                label={title || dictionary.common.about}
                className={`min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:order-1 lg:h-full lg:min-h-0 ${isRTL ? "lg:order-2" : ""}`}
              >
                {heroStats.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/30 px-4 py-8 text-white">
                    <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-3 text-center sm:gap-4 md:gap-5">
                    {heroStats.map((stat, idx) => (
                      <div
                        key={idx}
                        className="max-w-[18ch] text-center text-xl font-bold leading-tight text-white opacity-50 transition-opacity duration-300 hover:opacity-100 sm:text-2xl md:text-3xl lg:text-4xl"
                      >
                        <span className="block">
                          {stat}
                        </span>
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

      <Suspense fallback={null}>
        <HomepageServicesSection locale={locale as Locale} isRTL={isRTL} />
      </Suspense>

      {(hasStoryContent || aboutImages.story) && (
        <section id="brand-story" className="bg-white">
          <div className={`grid ${hasStoryContent && aboutImages.story ? "about-story-square lg:grid-cols-2 lg:items-stretch" : ""}`}>
            {hasStoryContent && (
              <div className={`flex min-h-[420px] flex-col justify-center px-4 py-16 md:py-20 lg:min-h-0 xl:px-16 ${isRTL ? "lg:order-2" : ""}`}>
                {mainTitle && (
                  <h2 className="max-w-xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
                    {mainTitle}
                  </h2>
                )}
                {storyParagraphs.length > 0 && (
                  <div className="mt-8 max-w-2xl space-y-5">
                    {storyParagraphs.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className="text-base leading-7 text-brand-primary/65 md:text-lg md:leading-8"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {aboutImages.story && (
              <BackgroundMedia
                image={aboutImages.story}
                label={mainTitle || dictionary.common.about}
                className={`lg:h-full lg:min-h-0 ${isRTL ? "lg:order-1" : ""}`}
              />
            )}
          </div>
        </section>
      )}

      {(hasUniqueContent || aboutImages.detail) && (
        <section id="sourcing" className="bg-[#f8f3ef]">
          <div className={`grid ${hasUniqueContent && aboutImages.detail ? "lg:grid-cols-2" : ""}`}>
            {hasUniqueContent && (
              <div className={`flex min-h-[420px] flex-col justify-center bg-brand-primary px-4 py-16 text-white md:py-20 xl:px-16 ${isRTL ? "lg:order-2" : ""}`}>
                <Sparkles className="mb-8 h-8 w-8 text-brand-gold" />
                {uniqueTitle && (
                  <h2 className="max-w-xl text-3xl font-normal leading-tight md:text-5xl">
                    {uniqueTitle}
                  </h2>
                )}
                {uniqueSubtitle && (
                  <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 md:text-base">
                    {uniqueSubtitle}
                  </p>
                )}
                {uniqueContent && (
                  <p className="mt-8 max-w-2xl text-base leading-8 text-white/78 md:text-lg">
                    {uniqueContent}
                  </p>
                )}
              </div>
            )}
            {aboutImages.detail && (
              <BackgroundMedia
                image={aboutImages.detail}
                label={uniqueTitle || dictionary.common.about}
                className={isRTL ? "lg:order-1" : ""}
              />
            )}
          </div>
        </section>
      )}

      {hasJourneyContent && (
        <section className="bg-[#f8f3ef] px-4 py-16 md:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl">
            {(journeyTitle || journeyContent) && (
              <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                {journeyTitle && (
                  <h2 className="max-w-2xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
                    {journeyTitle}
                  </h2>
                )}
                {journeyContent && (
                  <p className="text-base leading-8 text-brand-primary/70 md:text-lg">
                    {journeyContent}
                  </p>
                )}
              </div>
            )}

            {(coreValuesTitle || coreValuesSubtitle) && (
              <div className="mt-14 max-w-3xl">
                {coreValuesTitle && (
                  <h3 className="text-2xl font-normal text-brand-primary md:text-3xl">
                    {coreValuesTitle}
                  </h3>
                )}
                {coreValuesSubtitle && (
                  <p className="mt-3 text-sm leading-7 text-brand-primary/62 md:text-base">
                    {coreValuesSubtitle}
                  </p>
                )}
              </div>
            )}

            {valueItems.length > 0 && (
              <div className="mt-8 grid gap-px overflow-hidden border border-brand-primary/10 bg-brand-primary/10 md:grid-cols-3">
                {valueItems.map((item, idx) => {
                  const icons = [Leaf, CheckCircle2, FlaskConical];
                  const Icon = icons[idx % icons.length];
                  return (
                    <article key={idx} className="bg-white p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <Icon className="h-5 w-5 text-brand-gold" />
                        <span className="text-[11px] font-semibold text-brand-primary/35">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </div>
                      {item.title && (
                        <h3 className="text-base font-normal text-brand-primary">
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
            )}
          </div>
        </section>
      )}

      {(hasMissionContent || aboutImages.mission) && (
        <section className="bg-white">
          <div className={`grid ${hasMissionContent && aboutImages.mission ? "about-mission-square lg:grid-cols-2 lg:items-stretch" : ""}`}>
            {hasMissionContent && (
              <div className={`flex min-h-[420px] flex-col justify-center px-4 py-16 md:py-20 lg:order-2 lg:min-h-0 xl:px-16 ${isRTL ? "lg:order-1" : ""}`}>
                <div className="space-y-8">
                  {(missionTitle || missionContent) && (
                    <div>
                      {missionTitle && (
                        <h2 className="border-b border-brand-primary/15 pb-4 text-2xl font-normal text-brand-primary md:text-3xl">
                          {missionTitle}
                        </h2>
                      )}
                      {missionContent && (
                        <p className="mt-4 text-base leading-8 text-brand-primary/66">
                          {missionContent}
                        </p>
                      )}
                    </div>
                  )}
                  {(visionTitle || visionContent) && (
                    <div>
                      {visionTitle && (
                        <h2 className="border-b border-brand-primary/15 pb-4 text-2xl font-normal text-brand-primary md:text-3xl">
                          {visionTitle}
                        </h2>
                      )}
                      {visionContent && (
                        <p className="mt-4 text-base leading-8 text-brand-primary/66">
                          {visionContent}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {aboutImages.mission && (
              <BackgroundMedia
                image={aboutImages.mission}
                label={missionTitle || dictionary.common.about}
                className={`lg:order-1 lg:h-full lg:min-h-0 ${isRTL ? "lg:order-2" : ""}`}
              />
            )}
          </div>
        </section>
      )}

      {hasIngredientsContent && (
        <section className="bg-[#f8f3ef] px-4 py-16 md:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl">
            {(ingredientsTitle || ingredientsSubtitle || ingredientsDesc) && (
              <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
                {(ingredientsTitle || ingredientsSubtitle) && (
                  <div>
                    {ingredientsTitle && (
                      <h2 className="max-w-xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
                        {ingredientsTitle}
                      </h2>
                    )}
                    {ingredientsSubtitle && (
                      <p className="mt-5 text-base leading-7 text-brand-primary/62">
                        {ingredientsSubtitle}
                      </p>
                    )}
                  </div>
                )}
                {ingredientsDesc && (
                  <p className="border-s border-brand-primary/15 ps-6 text-base leading-8 text-brand-primary/70">
                    {ingredientsDesc}
                  </p>
                )}
              </div>
            )}
            {ingredientItems.length > 0 && (
              <div className="mt-12 grid gap-px overflow-hidden border border-brand-primary/10 bg-brand-primary/10 md:grid-cols-3">
                {ingredientItems.map((item, idx) => (
                  <article key={idx} className="bg-white">
                    {item.image && (
                      <div className="relative aspect-square overflow-hidden bg-brand-beige">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 767px) 100vw, 33vw"
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL}
                          unoptimized={shouldUseUnoptimizedImage(item.image)}
                        />
                      </div>
                    )}
                    {(item.title || item.description) && (
                      <div className="p-7">
                        {item.title && <h3 className="text-xl font-normal text-brand-primary">{item.title}</h3>}
                        {item.description && <p className="mt-3 text-sm leading-7 text-brand-primary/60">{item.description}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {brandFaqItems.length > 0 && (
        <section className="bg-white px-4 py-16 md:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 max-w-xl text-3xl font-normal leading-tight text-brand-primary md:text-5xl">
              {isRTL ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
            </h2>
            <div className="max-w-4xl space-y-0">
              {brandFaqItems.map((item, idx) => (
                <details key={idx} className="group border-t border-brand-grey-beige last:border-b">
                  <summary className={`flex cursor-pointer items-start justify-between gap-4 py-5 text-start text-sm font-normal text-brand-primary md:text-base ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className="flex-1">{item.question}</span>
                    <svg className={`mt-0.5 h-4 w-4 shrink-0 text-brand-primary/40 transition-transform duration-300 group-open:rotate-180 ${isRTL ? "rotate-180 group-open:rotate-0" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pb-5 text-start text-sm leading-relaxed text-brand-primary/60">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasCtaContent && (
        <section className="bg-white px-4 pb-16 md:pb-20 lg:pb-28">
          <div className="mx-auto max-w-7xl bg-brand-primary px-6 py-12 text-white md:px-10 md:py-14 lg:px-14">
            {ctaTitle && (
              <h2 className="mb-4 max-w-4xl text-3xl font-normal leading-tight text-white md:text-5xl">{ctaTitle}</h2>
            )}
            {ctaSubtitle && (
              <p className="mb-8 max-w-2xl text-sm leading-7 text-white/70 md:text-base md:leading-8">
                {ctaSubtitle}
              </p>
            )}
            {ctaButton && ctaLink && (
              <Link
                href={ctaLink}
                className="inline-flex min-h-11 items-center gap-3 bg-white px-6 text-sm font-semibold text-brand-primary transition-colors hover:bg-white/85"
              >
                {ctaButton}
                <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
