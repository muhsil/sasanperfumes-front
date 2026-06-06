"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Star } from "lucide-react";
import { ReviewForm } from "@/components/shop/ReviewForm";
import { decodeHtmlEntities } from "@/lib/utils";
import type { Locale } from "@/config/site";

function ReviewerAvatar({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || "U")[0]?.toUpperCase();

  if (!url || failed) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={32}
      height={32}
      className="h-8 w-8 rounded-full"
      onError={() => setFailed(true)}
    />
  );
}

interface StoreReview {
  id: number;
  date_created: string;
  formatted_date_created: string;
  product_id: number;
  reviewer: string;
  review: string;
  rating: number;
  verified: boolean;
  reviewer_avatar_urls: Record<string, string>;
  images?: string[];
}

interface ReviewsResponse {
  reviews: StoreReview[];
  total: number;
}

async function fetcher(url: string): Promise<ReviewsResponse> {
  const res = await fetch(url);
  return res.json();
}

export function ProductReviews({ productId, locale }: { productId: number; locale: Locale }) {
  const isRTL = locale === "ar";
  const t = {
    title: isRTL ? "مراجعات العملاء" : "Reviews",
    noReviews: isRTL ? "لا توجد مراجعات بعد." : "No reviews yet.",
    verified: isRTL ? "مشتري موثّق" : "Verified",
    page: isRTL ? "صفحة" : "Page",
    prev: isRTL ? "السابق" : "Previous",
    next: isRTL ? "التالي" : "Next",
    writeReview: isRTL ? "اكتب مراجعة" : "Write a Review",
  };

  const [page, setPage] = useState(1);
  const perPage = 6;

  const { data, isLoading, mutate } = useSWR<ReviewsResponse>(
    `/api/reviews?product_id=${productId}&per_page=${perPage}&page=${page}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const reviews = useMemo(() => data?.reviews ?? [], [data?.reviews]);
  const total = data?.total ?? reviews.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  return (
    <section className="lazy-section border-t border-gray-100 bg-white py-10" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
          {total > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${averageRating >= star ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <span className="font-medium text-gray-700">{averageRating.toFixed(1)}</span>
              <span>({total})</span>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 border-b border-gray-100" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <p className="py-6 text-sm text-gray-400">{t.noReviews}</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-gray-100 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ReviewerAvatar url={r.reviewer_avatar_urls?.["48"]} name={r.reviewer} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{decodeHtmlEntities(r.reviewer || "")}</p>
                          <p className="text-xs text-gray-500">{r.formatted_date_created || r.date_created}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${r.rating >= star ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      className="prose prose-sm mt-3 max-w-none text-gray-600 [&_p]:my-1"
                      dangerouslySetInnerHTML={{ __html: r.review || "" }}
                    />
                    {r.images && r.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.images.map((src, idx) => (
                          <a
                            key={idx}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-16 w-16 overflow-hidden rounded border border-gray-100 transition-transform hover:scale-105"
                          >
                            <Image
                              src={src}
                              alt={`Review photo ${idx + 1}`}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    >
                      {t.prev}
                    </button>
                    <span className="text-xs text-gray-500">
                      {t.page} {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    >
                      {t.next}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pt-0 lg:pl-8">
            <h3 className="text-lg font-semibold text-gray-900">{t.writeReview}</h3>
            <div className="mt-4">
              <ReviewForm
                productId={productId}
                locale={locale}
                onSuccess={async () => {
                  setPage(1);
                  await mutate();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
