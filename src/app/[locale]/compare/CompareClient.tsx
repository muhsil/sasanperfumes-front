"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, X, Star, ShoppingBag } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { useCart } from "@/contexts/CartContext";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";

interface CompareClientProps { locale: Locale; productIds: number[]; }

export function CompareClient({ locale, productIds }: CompareClientProps) {
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const isAr = locale === "ar";

  useEffect(() => {
    const params = productIds.map((id) => `include[]=${id}`).join("&");
    fetch(`/api/products?${params}&per_page=3&locale=${locale}`)
      .then((r) => r.json())
      .then((d) => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productIds, locale]);

  const allAttributes = [...new Set(products.flatMap((p) => p.attributes.map((a) => a.name)))];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? "مقارنة المنتجات" : "Compare Products"}</h1>
          <Link href={`/${locale}/shop`} className="text-sm text-brand-primary hover:underline">
            {isAr ? "← متابعة التسوق" : "← Continue Shopping"}
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-32 p-4 text-start text-sm font-medium text-gray-500">{isAr ? "المنتج" : "Product"}</th>
                {products.map((p) => (
                  <th key={p.id} className="p-4">
                    <Link href={`/${locale}/product/${p.slug}`} className="block">
                      {p.images[0]?.src && (
                        <div className="relative mx-auto mb-3 h-40 w-40 overflow-hidden rounded-xl">
                          <Image src={p.images[0].src} alt={p.name} fill className="object-cover" sizes="160px" />
                        </div>
                      )}
                      <p className="font-semibold text-gray-900 hover:text-brand-primary transition-colors">
                        {decodeHtmlEntities(p.name)}
                      </p>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price */}
              <CompareRow label={isAr ? "السعر" : "Price"}>
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <FormattedPrice
                      price={parseInt(p.prices.price, 10)}
                      className="text-lg font-bold text-brand-primary"
                    />
                    {p.on_sale && (
                      <FormattedPrice
                        price={parseInt(p.prices.regular_price, 10)}
                        className="block text-sm text-gray-400 line-through"
                        strikethrough
                      />
                    )}
                  </td>
                ))}
              </CompareRow>

              {/* Rating */}
              <CompareRow label={isAr ? "التقييم" : "Rating"}>
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    {p.average_rating && parseFloat(p.average_rating) > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{parseFloat(p.average_rating).toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({p.review_count})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{isAr ? "لا يوجد" : "No reviews"}</span>
                    )}
                  </td>
                ))}
              </CompareRow>

              {/* Stock */}
              <CompareRow label={isAr ? "المخزون" : "Stock"}>
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    {p.is_in_stock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> {isAr ? "متوفر" : "In Stock"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        <X className="h-3 w-3" /> {isAr ? "غير متوفر" : "Out of Stock"}
                      </span>
                    )}
                  </td>
                ))}
              </CompareRow>

              {/* Categories */}
              <CompareRow label={isAr ? "الفئة" : "Category"}>
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <span className="text-sm text-gray-600">{p.categories.map((c) => c.name).join(", ") || "—"}</span>
                  </td>
                ))}
              </CompareRow>

              {/* Attributes */}
              {allAttributes.map((attrName) => (
                <CompareRow key={attrName} label={attrName}>
                  {products.map((p) => {
                    const attr = p.attributes.find((a) => a.name === attrName);
                    return (
                      <td key={p.id} className="p-4 text-center text-sm text-gray-600">
                        {attr ? attr.terms.map((t) => t.name).join(", ") : "—"}
                      </td>
                    );
                  })}
                </CompareRow>
              ))}

              {/* Add to cart */}
              <tr className="bg-gray-50">
                <td className="p-4 text-sm font-medium text-gray-500" />
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    {p.is_in_stock ? (
                      <button
                        onClick={() => addToCart(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark transition-colors"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {isAr ? "أضف للسلة" : "Add to Cart"}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">{isAr ? "غير متوفر" : "Unavailable"}</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="p-4 text-sm font-medium text-gray-700">{label}</td>
      {children}
    </tr>
  );
}
