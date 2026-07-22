import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { WCProductGrid } from "@/components/shop/WCProductGrid";
import { getProducts, getFreeGiftProductIds } from "@/lib/api/woocommerce";
import { getMarketHintFromSearchParams, getRequestFrontendHost, getRequestMarket } from "@/lib/market/server";
import { generateCollectionPageJsonLd, generateItemListJsonLd, generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { decodeHtmlEntities, htmlToPlainText } from "@/lib/utils";
import { getMarketPathPrefix } from "@/config/market";
import { siteConfig, type Currency, type Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";

export const revalidate = 300;

interface NotePageProps {
  params: Promise<{ locale: string; note: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const ARABIC_NOTE_LABELS: Record<string, string> = {
  amber: "العنبر",
  musk: "المسك",
  oud: "العود",
  rose: "الورد",
  vanilla: "الفانيلا",
};

function noteLabel(note: string, locale: string): string {
  if (locale === "ar" && ARABIC_NOTE_LABELS[note]) return ARABIC_NOTE_LABELS[note];
  return note.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function dedupeProducts(products: WCProduct[]): WCProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.sku?.trim().toLowerCase() || `${product.name.trim().toLowerCase()}|${product.images[0]?.src || product.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function productMatchesNote(product: WCProduct, note: string): boolean {
  const needle = note.replace(/-/g, " ").toLowerCase();
  const attributes = (product.attributes || []).flatMap((attribute) =>
    (attribute.terms || []).map((term) => decodeHtmlEntities(term.name))
  );
  const searchable = [
    ...attributes,
    htmlToPlainText(product.short_description || ""),
    htmlToPlainText(product.description || ""),
  ].join(" ").toLowerCase();
  return searchable.includes(needle);
}

async function getProductsByNote(note: string, locale: Locale, currency: Currency, frontendHost: string) {
  const products: WCProduct[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getProducts({ page, per_page: 100, locale, currency, frontendHost });
    products.push(...result.products);
    totalPages = result.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return products.filter((product) => productMatchesNote(product, note));
}

export async function generateMetadata({ params, searchParams }: NotePageProps): Promise<Metadata> {
  const { locale, note } = await params;
  if (!/^[a-z0-9-]+$/i.test(note)) return {};
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const market = await getRequestMarket(marketHint);
  const label = noteLabel(note, locale);
  const isAr = locale === "ar";
  return generateSeoMetadata({
    title: isAr ? `عطور بنفحات ${label}` : `${label} Perfumes & Fragrances`,
    description: isAr
      ? `اكتشف عطور Sasan Perfumes التي تتميز بنفحات ${label}، واختر عطرك المناسب مع توصيل سريع في سوقك.`
      : `Discover Sasan Perfumes featuring ${label} notes. Compare long-lasting scents and shop with fast local delivery.`,
    locale: locale as Locale,
    pathname: `/notes/${note}`,
    marketCode: market.code,
    keywords: isAr ? [`عطور ${label}`, `عطر بنفحات ${label}`] : [`${label} perfume`, `${label} fragrance`],
  });
}

export default async function NotePage({ params, searchParams }: NotePageProps) {
  const { locale, note } = await params;
  if (!/^[a-z0-9-]+$/i.test(note)) notFound();
  const marketHint = getMarketHintFromSearchParams(await searchParams);
  const [market, frontendHost] = await Promise.all([
    getRequestMarket(marketHint),
    getRequestFrontendHost(marketHint),
  ]);
  const [matchingProducts, giftProductIds] = await Promise.all([
    getProductsByNote(note, locale as Locale, market.defaultCurrency, frontendHost),
    getFreeGiftProductIds(market.defaultCurrency, frontendHost),
  ]);
  const products = dedupeProducts(matchingProducts.filter((product) => !giftProductIds.includes(product.id)));
  const label = noteLabel(note, locale);
  const isAr = locale === "ar";
  const pathPrefix = getMarketPathPrefix(market.code);
  const pageUrl = `${siteConfig.url}${pathPrefix}/${locale}/notes/${note}`;
  const description = isAr
    ? `مجموعة مختارة من العطور التي تتميز بنفحات ${label}.`
    : `A curated collection of fragrances featuring ${label} notes.`;

  const collection = generateCollectionPageJsonLd({ name: `${label} Perfumes`, description, url: pageUrl });
  const itemList = generateItemListJsonLd({
    name: `${label} Perfumes`,
    description,
    url: pageUrl,
    items: products.slice(0, 20).map((product, index) => ({
      name: decodeHtmlEntities(product.name),
      url: `${siteConfig.url}${pathPrefix}/${locale}/product/${product.slug}`,
      image: product.images[0]?.src || siteConfig.ogImage,
      position: index + 1,
    })),
  });

  return (
    <main className="page-flush container mx-auto px-4 py-6 text-brand-primary">
      <JsonLd data={collection} />
      <JsonLd data={itemList} />
      <Breadcrumbs
        locale={locale as Locale}
        items={[
          { name: isAr ? "المتجر" : "Shop", href: `${pathPrefix}/${locale}/shop` },
          { name: label, href: `${pathPrefix}/${locale}/notes/${note}` },
        ]}
      />
      <header className="mb-8 border-b border-brand-border/60 pb-6">
        <h1 className="font-title text-3xl leading-tight md:text-5xl">
          {isAr ? `عطور بنفحات ${label}` : `${label} Perfumes`}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-muted md:text-base">{description}</p>
      </header>
      {products.length > 0 ? (
        <WCProductGrid products={products} locale={locale as Locale} columns={6} />
      ) : (
        <p className="py-12 text-center text-brand-muted">
          {isAr ? "لا توجد منتجات مطابقة حالياً." : "No matching products are available right now."}
        </p>
      )}
    </main>
  );
}
