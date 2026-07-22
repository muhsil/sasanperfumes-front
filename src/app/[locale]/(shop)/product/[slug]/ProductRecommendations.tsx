import { RelatedProducts } from "@/components/shop/RelatedProducts";
import { getProductUpsellIds, getProductsByIds, getRelatedProducts } from "@/lib/api/woocommerce";
import type { Locale } from "@/config/site";
import type { WCProduct } from "@/types/woocommerce";

interface ProductRecommendationsProps {
  product: WCProduct;
  locale: Locale;
  relatedProducts: WCProduct[];
  upsellProducts: WCProduct[];
}

interface GetProductRecommendationsProps {
  product: WCProduct;
  locale: Locale;
  currency?: string;
  frontendHost?: string;
  hiddenProductIds?: number[];
}

export async function getProductRecommendations({
  product,
  locale,
  currency,
  frontendHost,
  hiddenProductIds = [],
}: GetProductRecommendationsProps) {
  const hiddenIdsSet = new Set(hiddenProductIds);

  const [relatedProductsRaw, linkedIds] = await Promise.all([
    getRelatedProducts(product, {
      per_page: 12,
      locale,
      currency,
      frontendHost,
    }),
    getProductUpsellIds(product.id, locale, frontendHost),
  ]);

  const upsellProductsRaw = linkedIds.upsell_ids.length > 0
    ? await getProductsByIds(linkedIds.upsell_ids, locale, currency, frontendHost)
    : [];

  const relatedProducts = relatedProductsRaw.filter((item) => !hiddenIdsSet.has(item.id));
  const upsellProducts = upsellProductsRaw.filter((item) => !hiddenIdsSet.has(item.id));

  return { relatedProducts, upsellProducts };
}

export function ProductRecommendations({
  product,
  locale,
  relatedProducts,
  upsellProducts,
}: ProductRecommendationsProps) {
  const isRTL = locale === "ar";

  return (
    <>
      {upsellProducts.length > 0 && (
        <RelatedProducts
          products={upsellProducts}
          currentProductId={product.id}
          locale={locale}
          className="mt-10 pt-2"
          title={isRTL ? "منتجات موصى بها" : "Recommended Products"}
          subtitle={isRTL ? "منتجات مختارة لك" : "Hand-picked for you"}
        />
      )}

      <div className="mt-10 pb-6 md:pb-8">
        <RelatedProducts
          products={relatedProducts}
          currentProductId={product.id}
          locale={locale}
          className="pt-2"
        />
      </div>
    </>
  );
}
