import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getPageBySlug, getPages, stripHtmlTags, isFunctionalPageSlug } from "@/lib/api/wordpress";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

// WordPress CMS slugs that have dedicated Next.js pages at different routes.
// Redirect to the proper frontend routes to avoid duplicate content with broken metadata.
const SLUG_REDIRECTS: Record<string, string> = {
  "privacy-policy": "/privacy",
  "shipping-policy": "/shipping",
  "return-policy": "/returns",
  "delivery-policy": "/privacy",
  "refund_returns": "/returns",
  "payment-policy": "/returns",
};

interface DynamicPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const pages = await getPages();
  return pages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (isFunctionalPageSlug(slug) || SLUG_REDIRECTS[slug]) {
    return {};
  }

  const page = await getPageBySlug(slug, locale as Locale);

  if (!page) {
    return {};
  }

  const title = stripHtmlTags(page.title.rendered);
  const description = page.excerpt.rendered
    ? stripHtmlTags(page.excerpt.rendered)
    : page.yoast_head_json?.description || "";

  return generateSeoMetadata({
    title,
    description: description.slice(0, 160),
    locale: locale as Locale,
    pathname: `/${slug}`,
  });
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const market = await getRequestMarket();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale, slug } = await params;

  // Redirect WordPress CMS slugs to their proper frontend routes
  const redirectPath = SLUG_REDIRECTS[slug];
  if (redirectPath) {
    permanentRedirect(`/${locale}${redirectPath}`);
  }

  if (isFunctionalPageSlug(slug)) {
    notFound();
  }

  const page = await getPageBySlug(slug, locale as Locale);

  if (!page) {
    notFound();
  }

  const isRTL = locale === "ar";
  const pageTitle = stripHtmlTags(page.title.rendered);

  const breadcrumbItems = [{ name: pageTitle, href: `${pathPrefix}/${locale}/${slug}` }];

  return (
    <div className="container mx-auto px-4 py-3">
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

      <div className="mb-4 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">{pageTitle}</h1>
        {page.excerpt.rendered && (
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            {stripHtmlTags(page.excerpt.rendered)}
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          {isRTL ? "آخر تحديث: " : "Last Updated: "}
          {new Date(page.modified).toLocaleDateString(
            isRTL ? "ar-SA" : "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <div
          className="prose prose-stone max-w-none prose-headings:text-brand-primary prose-p:text-gray-700 prose-strong:text-brand-primary prose-li:text-gray-700 prose-a:text-brand-primary prose-a:underline hover:prose-a:text-brand-primary"
          dangerouslySetInnerHTML={{ __html: page.content.rendered }}
        />
      </div>
    </div>
  );
}
