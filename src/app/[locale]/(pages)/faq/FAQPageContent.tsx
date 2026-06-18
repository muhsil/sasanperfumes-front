"use client";

import { useEffect, useMemo, useState } from "react";
import { GroupedFAQAccordion, type FAQGroup, type FAQItem } from "@/components/common/GroupedFAQAccordion";

type BilingualField = {
  en?: string;
  ar?: string;
};

export type FAQPageData = {
  not_found?: BilingualField;
  not_found_text?: BilingualField;
  faq_items?: unknown[];
  faq_groups?: unknown[];
  featured_links_title?: BilingualField;
  featured_links_description?: BilingualField;
  featured_links?: unknown[];
};

type FAQDictionaryContent = {
  notFound: string;
  notFoundText: string;
};

interface FAQPageContentProps {
  locale: string;
  initialData: FAQPageData | null;
  dictionary: FAQDictionaryContent;
  contactLabel: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asBilingual(value: unknown): BilingualField | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as BilingualField;
}

function pickLocale(field: unknown, locale: string, fallback = ""): string {
  const value = asBilingual(field);
  if (!value) return fallback;
  return (locale === "ar" ? value.ar : value.en) || fallback;
}

function mapFaqItems(items: unknown, locale: string): FAQItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const row = asRecord(item);
      const question = pickLocale(row.q, locale, locale === "ar" ? String(row.q_ar || "") : String(row.q_en || ""));
      const answer = pickLocale(row.a, locale, locale === "ar" ? String(row.a_ar || "") : String(row.a_en || ""));
      return { question, answer };
    })
    .filter((item) => item.question || item.answer);
}

function mapFaqGroups(items: unknown, locale: string): FAQGroup[] {
  if (!Array.isArray(items)) return [];

  const groups = new Map<string, FAQGroup>();

  items.forEach((item) => {
    const row = asRecord(item);
    const title = pickLocale(
      row.group_title,
      locale,
      locale === "ar" ? String(row.group_title_ar || "") : String(row.group_title_en || "")
    );
    const key = title || "__default";
    const current = groups.get(key) || { title, items: [] };
    const nestedItems = mapFaqItems(row.faq_items, locale);

    if (nestedItems.length > 0) {
      current.items.push(...nestedItems);
    } else {
      const question = pickLocale(row.q, locale, locale === "ar" ? String(row.q_ar || "") : String(row.q_en || ""));
      const answer = pickLocale(row.a, locale, locale === "ar" ? String(row.a_ar || "") : String(row.a_en || ""));
      if (question || answer) {
        current.items.push({ question, answer });
      }
    }

    if (current.items.length > 0) {
      groups.set(key, current);
    }
  });

  return Array.from(groups.values());
}

function buildGroups(data: FAQPageData | null, locale: string): FAQGroup[] {
  if (!data) return [];
  const grouped = mapFaqGroups(data.faq_groups, locale);
  if (grouped.length > 0) return grouped;

  const flatItems = mapFaqItems(data.faq_items, locale);
  return flatItems.length > 0 ? [{ title: "", items: flatItems }] : [];
}

function mapFeaturedLinks(items: unknown, locale: string) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const row = asRecord(item);
      return {
        label: pickLocale(row.label, locale, locale === "ar" ? String(row.label_ar || "") : String(row.label_en || "")),
        url: String(row.url || ""),
      };
    })
    .filter((item) => item.label && item.url);
}

async function fetchFaqData(): Promise<FAQPageData | null> {
  try {
    const response = await fetch("/api/static-page/faq", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as FAQPageData;
  } catch {
    return null;
  }
}

export function FAQPageContent({ locale, initialData, dictionary, contactLabel }: FAQPageContentProps) {
  const [data, setData] = useState<FAQPageData | null>(initialData);

  useEffect(() => {
    let active = true;

    fetchFaqData().then((nextData) => {
      if (active && nextData) {
        setData(nextData);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const faqGroups = useMemo(() => buildGroups(data, locale), [data, locale]);
  const featuredLinks = useMemo(() => mapFeaturedLinks(data?.featured_links, locale), [data?.featured_links, locale]);
  const featuredLinksTitle = pickLocale(data?.featured_links_title, locale, "Featured Links");
  const featuredLinksDesc = pickLocale(data?.featured_links_description, locale, "");
  const notFoundTitle = pickLocale(data?.not_found, locale, dictionary.notFound);
  const notFoundText = pickLocale(data?.not_found_text, locale, dictionary.notFoundText);

  return (
    <div className="px-5 md:px-7 lg:px-12 pt-8 md:pt-10 pb-16">
      <div className="max-w-3xl mx-auto space-y-16">
        {faqGroups.length > 0 && (
          <GroupedFAQAccordion groups={faqGroups} />
        )}

        {featuredLinks.length > 0 && (
          <div className="bg-[#f5f1ed] rounded-lg p-8 md:p-12">
            <h2 className="mb-4 text-2xl font-light text-brand-primary">{featuredLinksTitle}</h2>
            {featuredLinksDesc && (
              <p className="mb-6 text-sm text-brand-primary/70">{featuredLinksDesc}</p>
            )}
            <div className="space-y-3">
              {featuredLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase hover:opacity-70 transition-opacity"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[#e7ded7] pt-8">
          {(notFoundTitle || notFoundText) && (
            <div className="mb-6">
              {notFoundTitle && (
                <h2 className="mb-2 text-2xl font-light text-brand-primary">{notFoundTitle}</h2>
              )}
              {notFoundText && (
                <p className="text-sm leading-relaxed text-brand-primary/70">{notFoundText}</p>
              )}
            </div>
          )}
          <a
            href={`/${locale}/contact`}
            className="inline-flex items-center gap-2 border-b border-brand-primary pb-1 text-xs font-normal tracking-[0.1em] text-brand-primary uppercase"
          >
            {contactLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
