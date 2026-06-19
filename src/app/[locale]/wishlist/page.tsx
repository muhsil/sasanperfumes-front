"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingBag, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import type { Locale } from "@/config/site";

function getSlugFromProductUrl(productUrl: string | undefined): string | null {
  if (!productUrl) return null;
  const match = productUrl.match(/\/product\/([^/?]+)/);
  return match ? match[1] : null;
}

interface WishlistPageProps {
  params: Promise<{ locale: string }>;
}

export default function WishlistPage({ params }: WishlistPageProps) {
  const [locale, setLocale] = useState<string>("en");
  const [bundleProductSlugs, setBundleProductSlugs] = useState<string[]>([]);

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  useEffect(() => {
    async function fetchBundleSlugs() {
      try {
        const response = await fetch("/api/bundle-slugs");
        if (response.ok) {
          const data = await response.json();
          setBundleProductSlugs(data.slugs || []);
        }
      } catch (error) {
        console.error("Failed to fetch bundle slugs:", error);
      }
    }
    fetchBundleSlugs();
  }, []);

  const {
    wishlistItems,
    wishlistItemsCount,
    isLoading,
    removeFromWishlist,
  } = useWishlist();
  const { addToCart, isLoading: isCartLoading } = useCart();

  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  const isRTL = locale === "ar";
  const isEmpty = wishlistItems.length === 0;

  const breadcrumbItems = [
    { name: isRTL ? "قائمة الرغبات" : "Wishlist", href: `/${locale}/wishlist` },
  ];

  const isBundleProduct = (productUrl: string | undefined): boolean => {
    const slug = getSlugFromProductUrl(productUrl);
    return slug ? bundleProductSlugs.includes(slug) : false;
  };

  const t = {
    en: {
      wishlist: "My Wishlist",
      emptyWishlist: "Your wishlist is empty",
      emptyWishlistDesc: "You haven't added any products to your wishlist yet.",
      continueShopping: "Continue Shopping",
      product: "Product",
      price: "Price",
      status: "Status",
      actions: "Actions",
      remove: "Remove",
      addToCart: "Add to Cart",
      addedToCart: "Added!",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      backToShop: "Continue Shopping",
      items: "items",
      customize: "Customize",
    },
    ar: {
      wishlist: "قائمة الرغبات",
      emptyWishlist: "قائمة الرغبات فارغة",
      emptyWishlistDesc: "لم تقم بإضافة أي منتجات إلى قائمة الرغبات بعد.",
      continueShopping: "متابعة التسوق",
      product: "المنتج",
      price: "السعر",
      status: "الحالة",
      actions: "الإجراءات",
      remove: "إزالة",
      addToCart: "أضف للسلة",
      addedToCart: "تمت الإضافة!",
      inStock: "متوفر",
      outOfStock: "غير متوفر",
      backToShop: "متابعة التسوق",
      items: "منتجات",
      customize: "تخصيص",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

  const handleRemoveItem = async (productId: number) => {
    try {
      await removeFromWishlist(productId);
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const handleAddToCart = async (productId: number) => {
    setAddingToCart(productId);
    try {
      await addToCart(productId, 1);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {texts.wishlist}{" "}
            {wishlistItemsCount > 0 && (
              <span className="text-lg font-normal text-gray-500">
                ({wishlistItemsCount} {texts.items})
              </span>
            )}
          </h1>
        </div>

        {isEmpty ? (
          <div className="rounded-lg bg-white py-16 text-center shadow-sm">
            <Heart className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              {texts.emptyWishlist}
            </h2>
            <p className="mb-8 text-gray-600">{texts.emptyWishlistDesc}</p>
            <Button asChild>
              <Link href={`/${locale}/shop`}>{texts.continueShopping}</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="hidden border-b p-4 md:grid md:grid-cols-12 md:gap-4">
              <div className="col-span-5 text-sm font-medium text-gray-500">
                {texts.product}
              </div>
              <div className="col-span-2 text-center text-sm font-medium text-gray-500">
                {texts.price}
              </div>
              <div className="col-span-2 text-center text-sm font-medium text-gray-500">
                {texts.status}
              </div>
              <div className="col-span-3 text-center text-sm font-medium text-gray-500">
                {texts.actions}
              </div>
            </div>

            <ul className="divide-y">
              {wishlistItems.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="grid items-center gap-4 md:grid-cols-12">
                    <div className="flex gap-4 md:col-span-5">
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <Link
                          href={item.product_url || `/${locale}/product/${item.product_id}`}
                          className="font-medium text-gray-900 hover:text-gray-700 line-clamp-2 uppercase"
                        >
                          {item.product_name}
                        </Link>
                        {item.dateadded_formatted && (
                          <p className="mt-1 text-sm text-gray-500">
                            {isRTL ? "أضيف في" : "Added"}: {item.dateadded_formatted}
                          </p>
                        )}
                        <button
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700 md:hidden"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                          {texts.remove}
                        </button>
                      </div>
                    </div>

                    <div className="hidden text-center md:col-span-2 md:block">
                      <FormattedPrice
                        price={item.product_price}
                        className="font-medium"
                        iconSize="xs"
                      />
                    </div>

                    <div className="flex items-center justify-between md:col-span-2 md:justify-center">
                      <span className="text-sm text-gray-500 md:hidden">
                        {texts.status}:
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.is_in_stock !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.is_in_stock !== false ? texts.inStock : texts.outOfStock}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 md:col-span-3 md:justify-center">
                      {isBundleProduct(item.product_url) ? (
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 md:flex-none"
                        >
                          <Link href={item.product_url || `/${locale}/product/${item.product_id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {texts.customize}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAddToCart(item.product_id)}
                          disabled={item.is_in_stock === false || isCartLoading || addingToCart === item.product_id}
                          isLoading={addingToCart === item.product_id}
                          size="sm"
                          className="flex-1 md:flex-none"
                        >
                          {texts.addToCart}
                        </Button>
                      )}
                      <button
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="hidden rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 md:block"
                        aria-label={texts.remove}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t p-4">
              <Link
                href={`/${locale}/shop`}
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                {texts.backToShop}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
