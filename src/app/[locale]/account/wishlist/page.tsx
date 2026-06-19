"use client";

import { useEffect, use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/common/Button";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { AccountAuthGuard } from "@/components/account/AccountAuthGuard";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";

function getSlugFromProductUrl(productUrl: string | undefined): string | null {
  if (!productUrl) return null;
  const match = productUrl.match(/\/product\/([^/?]+)/);
  return match ? match[1] : null;
}

interface WishlistPageProps {
  params: Promise<{ locale: string }>;
}

const translations = {
  en: {
    wishlist: "Wishlist",
    backToAccount: "Back to Account",
    emptyWishlist: "Your wishlist is empty",
    startShopping: "Start Shopping",
    addToCart: "Add to Cart",
    remove: "Remove",
    notLoggedIn: "Please log in to view your wishlist",
    login: "Login",
    loading: "Loading wishlist...",
    addedToCart: "Added to cart",
    customize: "Customize",
  },
  ar: {
    wishlist: "قائمة الرغبات",
    backToAccount: "العودة إلى الحساب",
    emptyWishlist: "قائمة رغباتك فارغة",
    startShopping: "ابدأ التسوق",
    addToCart: "أضف إلى السلة",
    remove: "إزالة",
    notLoggedIn: "يرجى تسجيل الدخول لعرض قائمة رغباتك",
    login: "تسجيل الدخول",
    loading: "جاري تحميل قائمة الرغبات...",
    addedToCart: "تمت الإضافة إلى السلة",
    customize: "تخصيص",
  },
};

export default function WishlistPage({ params }: WishlistPageProps) {
  const { isAuthenticated } = useAuth();
  const { wishlistItems, isLoading: wishlistLoading, removeFromWishlist, refreshWishlist } = useWishlist();
  const { addToCart, isLoading: cartLoading } = useCart();
  const [bundleProductSlugs, setBundleProductSlugs] = useState<string[]>([]);

  const resolvedParams = use(params);
  const locale = resolvedParams.locale as "en" | "ar";
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  useEffect(() => {
    if (isAuthenticated) {
      refreshWishlist();
    }
  }, [isAuthenticated, refreshWishlist]);

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

  const isBundleProduct = (productUrl: string | undefined): boolean => {
    const slug = getSlugFromProductUrl(productUrl);
    return slug ? bundleProductSlugs.includes(slug) : false;
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await addToCart(productId, 1);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await removeFromWishlist(productId);
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    }
  };


  const isLoading = wishlistLoading;

  return (
    <AccountAuthGuard
      locale={locale}
      icon={Heart}
      notLoggedInText={t.notLoggedIn}
      loginText={t.login}
    >
      <div className="container mx-auto px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
        <AccountPageHeader
          locale={locale}
          title={t.wishlist}
          backHref={`/${locale}/account`}
          backLabel={t.backToAccount}
        />

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-black rounded-full mx-auto mb-4" />
            <p className="text-gray-500">{t.loading}</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <AccountEmptyState
            icon={Heart}
            title={t.wishlist}
            message={t.emptyWishlist}
            actionLabel={t.startShopping}
            actionHref={`/${locale}/shop`}
          />
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlistItems.map((item) => (
            <div
              key={item.product_id}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden transition-all hover:shadow-md"
            >
              <div className="relative aspect-square bg-gray-100">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Heart className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <button
                  onClick={() => handleRemove(item.product_id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-red-50 transition-colors"
                  aria-label={t.remove}
                >
                  <Trash2 className="h-4 w-4 text-gray-600 hover:text-red-500" />
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                  {item.product_name}
                </h3>
                                <FormattedPrice
                                  price={item.product_price}
                                  className="text-lg font-semibold text-gray-900 mb-4"
                                  iconSize="sm"
                                />
                {isBundleProduct(item.product_url) ? (
                  <Button
                    asChild
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={item.product_url || `/${locale}/product/${item.product_id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t.customize}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddToCart(item.product_id)}
                    disabled={cartLoading}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t.addToCart}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AccountAuthGuard>
  );
}
