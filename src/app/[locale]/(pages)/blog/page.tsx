import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import Image from "next/image";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getBlogPosts, getFeatureToggles } from "@/lib/api/wordpress";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

export const revalidate = 300;

interface BlogPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  const frontendHost = await getRequestFrontendHost();
  const toggles = await getFeatureToggles(frontendHost);
  if (!toggles.sasanperfumes_blog_enabled) return {};
  return generateSeoMetadata({
    title: lang === "ar" ? "المدونة" : "Blog",
    description: lang === "ar"
      ? "أحدث المقالات والأخبار من Sasan Perfumes"
      : "Latest articles and news from Sasan Perfumes",
    locale: lang,
    pathname: "/blog",
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function BlogPage({ params }: BlogPageProps) {
  const market = await getRequestMarket();
  const frontendHost = await getRequestFrontendHost();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale } = await params;
  const isRTL = locale === "ar";

  const toggles = await getFeatureToggles(frontendHost);
  if (!toggles.sasanperfumes_blog_enabled) notFound();

  const { posts } = await getBlogPosts(1, 20, frontendHost);

  const breadcrumbItems = [
    { name: isRTL ? "المدونة" : "Blog", href: `${pathPrefix}/${locale}/blog` },
  ];

  return (
    <main>
      <PageHeader
        title={isRTL ? "المدونة" : "Blog"}
        subtitle={isRTL ? "أحدث المقالات والأخبار من عالم العطور" : "Latest articles and news from the world of fragrance"}
        isRTL={isRTL}
      />
      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Posts Grid */}
      <section className="bg-white pt-8 md:pt-10 lg:pt-12 pb-0">
        {posts.length > 0 ? (
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`${pathPrefix}/${locale}/blog/${post.slug}`}
                className="group flex flex-col border border-[#e7ded7] overflow-hidden"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  {post.featuredImage ? (
                    <Image
                      src={post.featuredImage}
                      alt={stripHtml(post.title)}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={shouldUseUnoptimizedImage(post.featuredImage)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-16 w-16 text-brand-primary/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-3 text-xs text-brand-primary/50">
                    <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
                    {post.author && (
                      <>
                        <span>·</span>
                        <span>{post.author}</span>
                      </>
                    )}
                  </div>
                  <h2 className="mb-2 text-sm font-normal text-brand-primary line-clamp-2">
                    {stripHtml(post.title)}
                  </h2>
                  <p className="line-clamp-3 text-sm text-brand-primary/60">
                    {stripHtml(post.excerpt)}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-normal text-brand-primary/60">
                    {isRTL ? "اقرأ المزيد" : "Read More"}
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-brand-primary/50">
              {isRTL ? "لا توجد مقالات حالياً" : "No blog posts yet"}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

