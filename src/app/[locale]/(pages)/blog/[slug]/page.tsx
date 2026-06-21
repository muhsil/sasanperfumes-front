import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { getBlogPost, getBlogPosts, getFeatureToggles } from "@/lib/api/wordpress";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import type { Locale } from "@/config/site";
import type { Metadata } from "next";
import { getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { getMarketPathPrefix } from "@/config/market";

export const revalidate = 300;

interface BlogDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
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

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = locale as Locale;
  const frontendHost = await getRequestFrontendHost();
  const toggles = await getFeatureToggles(frontendHost);
  if (!toggles.sasanperfumes_blog_enabled) return {};
  const post = await getBlogPost(slug, frontendHost);
  if (!post) return {};

  return generateSeoMetadata({
    title: stripHtml(post.title),
    description: stripHtml(post.excerpt).slice(0, 160),
    locale: lang,
    pathname: `/blog/${slug}`,
    image: post.featuredImage || undefined,
  });
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const market = await getRequestMarket();
  const frontendHost = await getRequestFrontendHost();
  const pathPrefix = getMarketPathPrefix(market.code);
  const { locale, slug } = await params;
  const toggles = await getFeatureToggles(frontendHost);
  if (!toggles.sasanperfumes_blog_enabled) notFound();
  const post = await getBlogPost(slug, frontendHost);
  if (!post) notFound();

  const isRTL = locale === "ar";

  // Fetch related posts for "Read More" section
  const { posts: allPosts } = await getBlogPosts(1, 4, frontendHost);
  const relatedPosts = allPosts.filter((p) => p.id !== post.id).slice(0, 3);

  const breadcrumbItems = [
    { name: isRTL ? "المدونة" : "Blog", href: `${pathPrefix}/${locale}/blog` },
    { name: stripHtml(post.title), href: `${pathPrefix}/${locale}/blog/${slug}` },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="bg-[#f8f3ef] px-4 pb-6 pt-8 text-brand-primary md:pb-8 md:pt-10">
        <div className="mb-4 flex items-center gap-3 text-xs text-brand-primary/40">
          <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
          {post.author && (
            <>
              <span>·</span>
              <span>{post.author}</span>
            </>
          )}
        </div>
        <h1 className="text-[36px] font-normal leading-none tracking-normal md:text-[48px]">
          {stripHtml(post.title)}
        </h1>
        {post.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {post.categories.map((cat) => (
              <span key={cat.id} className="border border-[#e7ded7] px-3 py-1 text-xs font-normal text-brand-primary/60">
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} />

      {/* Featured Image */}
      {post.featuredImage && (
        <section className="px-4 mb-8">
          <div className="relative max-w-4xl aspect-[16/9] overflow-hidden">
            <Image
              src={post.featuredImage}
              alt={stripHtml(post.title)}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
              unoptimized={shouldUseUnoptimizedImage(post.featuredImage)}
            />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="px-4 pb-12 md:pb-16">
        <article
          className="prose prose-lg mx-auto max-w-4xl prose-headings:text-brand-primary prose-p:text-brand-primary/70 prose-a:text-brand-gold prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-white py-8 md:py-10">
          <div className="px-4">
            <h2 className="mb-8 font-normal text-2xl text-brand-primary md:text-3xl">
              {isRTL ? "مقالات ذات صلة" : "Related Articles"}
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`${pathPrefix}/${locale}/blog/${rp.slug}`}
                  className="group overflow-hidden border border-[#e7ded7] bg-white"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-brand-beige">
                    {rp.featuredImage && (
                      <Image
                        src={rp.featuredImage}
                        alt={stripHtml(rp.title)}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized={shouldUseUnoptimizedImage(rp.featuredImage)}
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <time className="text-xs text-brand-primary/40">{formatDate(rp.date, locale)}</time>
                    <h3 className="mt-1 line-clamp-2 font-normal text-sm text-brand-primary">
                      {stripHtml(rp.title)}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to Blog */}
      <section className="px-4 py-8">
        <Link
          href={`${pathPrefix}/${locale}/blog`}
          className="inline-flex items-center gap-2 border border-brand-primary px-8 py-3 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
        >
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {isRTL ? "العودة إلى المدونة" : "Back to Blog"}
        </Link>
      </section>
    </main>
  );
}
