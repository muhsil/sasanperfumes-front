"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OrderPrice } from "@/components/common/OrderPrice";
import { AccountAuthGuard } from "@/components/account/AccountAuthGuard";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountLoadingSpinner } from "@/components/account/AccountLoadingSpinner";
import { getCustomerOrders, formatOrderStatus, getOrderStatusColor, formatDate, getOrderDate, type Order } from "@/lib/api/customer";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface OrdersPageProps {
  params: Promise<{ locale: string }>;
}

const translations = {
  en: {
    orders: "Orders",
    backToAccount: "Back to Account",
    orderHistory: "Order History",
    noOrders: "You haven't placed any orders yet",
    startShopping: "Start Shopping",
    orderNumber: "Order",
    date: "Date",
    status: "Status",
    total: "Total",
    items: "items",
    viewOrder: "View Order",
    showInvoice: "Show Invoice",
    notLoggedIn: "Please log in to view your orders",
    login: "Login",
    loading: "Loading orders...",
  },
  ar: {
    orders: "الطلبات",
    backToAccount: "العودة إلى الحساب",
    orderHistory: "سجل الطلبات",
    noOrders: "لم تقم بأي طلبات بعد",
    startShopping: "ابدأ التسوق",
    orderNumber: "طلب",
    date: "التاريخ",
    status: "الحالة",
    total: "المجموع",
    items: "عناصر",
    viewOrder: "عرض الطلب",
    showInvoice: "عرض الفاتورة",
    notLoggedIn: "يرجى تسجيل الدخول لعرض طلباتك",
    login: "تسجيل الدخول",
    loading: "جاري تحميل الطلبات...",
  },
};


export default function OrdersPage({ params }: OrdersPageProps) {
  const marketPrefix = useMarketPrefix();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const resolvedParams = use(params);
  const locale = resolvedParams.locale as "en" | "ar";
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.user_id) return;
      
      try {
        setIsLoading(true);
        const response = await getCustomerOrders(user.user_id);
        if (response.success && response.data) {
          setOrders(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  return (
    <AccountAuthGuard
      locale={locale}
      icon={Package}
      notLoggedInText={t.notLoggedIn}
      loginText={t.login}
    >
      <div className="container mx-auto px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
        <AccountPageHeader
          locale={locale}
          title={t.orders}
          backHref={`${marketPrefix}/${locale}/account`}
          backLabel={t.backToAccount}
        />

        {isLoading ? (
          <AccountLoadingSpinner message={t.loading} />
        ) : orders.length === 0 ? (
          <AccountEmptyState
            icon={Package}
            title={t.orderHistory}
            message={t.noOrders}
            actionLabel={t.startShopping}
            actionHref={`${marketPrefix}/${locale}/shop`}
          />
        ) : (
        <div className="space-y-0 divide-y divide-gray-200">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-b border-gray-200 py-4 px-0"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {t.orderNumber} #{order.number}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(getOrderDate(order), locale, order.billing?.country)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium ${getOrderStatusColor(order.status)}`}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {order.line_items.length} {t.items}
                  </span>
                  <OrderPrice
                    price={order.total}
                    orderCurrency={order.currency}
                    orderCurrencySymbol={order.currency_symbol}
                    className="text-gray-900"
                    iconSize="xs"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`${marketPrefix}/${locale}/account/orders/${order.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {t.viewOrder}
                  </Link>
                  {order.status === "completed" && (
                    <Link
                      href={`${marketPrefix}/${locale}/account/orders/${order.id}/invoice`}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {t.showInvoice}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AccountAuthGuard>
  );
}
