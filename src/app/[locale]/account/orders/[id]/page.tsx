"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, Gift, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OrderTimeline as RichOrderTimeline } from "@/components/order/OrderTimeline";
import { Button } from "@/components/common/Button";
import { AccountAuthGuard } from "@/components/account/AccountAuthGuard";
import { AccountLoadingSpinner } from "@/components/account/AccountLoadingSpinner";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { OrderPrice, OrderCurrencyBadge } from "@/components/common/OrderPrice";
import { getOrder, formatOrderStatus, getOrderStatusColor, formatDate, getOrderDate, canCancelOrder, cancelOrder, type Order, type OrderLineItem } from "@/lib/api/customer";
import { OrderBundleItemsList, isOrderBundleProduct, isOrderFreeGift } from "@/components/cart/OrderBundleItemsList";
import { OrderNotes } from "@/components/account/OrderNotes";
import { decodeHtmlEntities } from "@/lib/utils";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import type { WCProduct } from "@/types/woocommerce";

interface OrderDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const translations = {
  en: {
    orderDetails: "Order Details",
    backToOrders: "Back to Orders",
    orderNumber: "Order",
    orderDate: "Order Date",
    status: "Status",
    items: "Items",
    item: "item",
    subtotal: "Subtotal",
    shipping: "Shipping",
    discount: "Discount",
    tax: "Tax",
    vat: "VAT",
    total: "Total",
    shippingAddress: "Shipping Address",
    billingAddress: "Billing Address",
    paymentMethod: "Payment Method",
    notLoggedIn: "Please log in to view order details",
    login: "Login",
    loading: "Loading order details...",
    orderNotFound: "Order not found",
    backToAccount: "Back to Account",
    orderTimeline: "Order Timeline",
    orderPlaced: "Order Placed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    qty: "Qty",
    freeGift: "Free Gift",
    paidIn: "Paid in",
    conversionNote: "Prices shown in order currency",
    cancelOrder: "Cancel Order",
    cancelOrderConfirm: "Are you sure you want to cancel this order?",
    cancelReason: "Reason for cancellation (optional)",
    cancelReasonPlaceholder: "Please tell us why you want to cancel...",
    cancelling: "Cancelling...",
    cancelSuccess: "Order cancelled successfully",
    cancelError: "Failed to cancel order",
    cancel: "Cancel",
    confirm: "Confirm",
  },
  ar: {
    orderDetails: "تفاصيل الطلب",
    backToOrders: "العودة إلى الطلبات",
    orderNumber: "طلب",
    orderDate: "تاريخ الطلب",
    status: "الحالة",
    items: "العناصر",
    item: "عنصر",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    discount: "الخصم",
    tax: "الضريبة",
    vat: "ضريبة القيمة المضافة",
    total: "المجموع",
    shippingAddress: "عنوان الشحن",
    billingAddress: "عنوان الفواتير",
    paymentMethod: "طريقة الدفع",
    notLoggedIn: "يرجى تسجيل الدخول لعرض تفاصيل الطلب",
    login: "تسجيل الدخول",
    loading: "جاري تحميل تفاصيل الطلب...",
    orderNotFound: "الطلب غير موجود",
    backToAccount: "العودة إلى الحساب",
    orderTimeline: "الجدول الزمني للطلب",
    orderPlaced: "تم تقديم الطلب",
    processing: "قيد المعالجة",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    qty: "الكمية",
    freeGift: "هدية مجانية",
    paidIn: "تم الدفع بـ",
    conversionNote: "الأسعار معروضة بعملة الطلب",
    cancelOrder: "إلغاء الطلب",
    cancelOrderConfirm: "هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟",
    cancelReason: "سبب الإلغاء (اختياري)",
    cancelReasonPlaceholder: "يرجى إخبارنا لماذا تريد الإلغاء...",
    cancelling: "جاري الإلغاء...",
    cancelSuccess: "تم إلغاء الطلب بنجاح",
    cancelError: "فشل في إلغاء الطلب",
    cancel: "إلغاء",
    confirm: "تأكيد",
  },
};

function getStatusStep(status: string): number {
  const statusMap: Record<string, number> = {
    pending: 0,
    processing: 1,
    "on-hold": 2,
    shipped: 2,
    completed: 3,
    delivered: 3,
  };
  return statusMap[status] ?? 0;
}

function OrderTimeline({ status, t }: { status: string; t: typeof translations.en }) {
  const currentStep = getStatusStep(status);
  const steps = [
    { label: t.orderPlaced, icon: Package },
    { label: t.processing, icon: Clock },
    { label: t.shipped, icon: Truck },
    { label: t.delivered, icon: CheckCircle },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="font-semibold text-gray-900 mb-6">{t.orderTimeline}</h3>
      <div className="relative">
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-green-500 transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%`, maxWidth: "calc(100% - 40px)" }}
        />
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={step.label} className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 bg-white text-gray-400"
                  } ${isCurrent ? "ring-4 ring-green-100" : ""}`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    isCompleted ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddressCard({ title, address, icon: Icon }: { title: string; address: Order["shipping"]; icon: typeof MapPin }) {
  if (!address || (!address.address_1 && !address.city)) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="text-gray-600 space-y-1">
        <p className="font-medium text-gray-900">
          {address.first_name} {address.last_name}
        </p>
        {address.company && <p>{address.company}</p>}
        <p>{address.address_1}</p>
        {address.address_2 && <p>{address.address_2}</p>}
        <p>
          {address.city}
          {address.state && `, ${address.state}`} {address.postcode}
        </p>
        <p>{address.country}</p>
        {address.phone && <p>{address.phone}</p>}
      </div>
    </div>
  );
}

async function fetchProductsByIds(productIds: number[], locale: "en" | "ar"): Promise<WCProduct[]> {
  const response = await fetch(
    `/api/products?include=${encodeURIComponent(productIds.join(","))}&per_page=${productIds.length}&locale=${encodeURIComponent(locale)}`
  );
  const payload = response.ok ? await response.json() : { products: [] };
  return Array.isArray(payload.products) ? payload.products as WCProduct[] : [];
}

async function searchProductImageByName(name: string, locale: "en" | "ar"): Promise<string | null> {
  const response = await fetch(
    `/api/products?search=${encodeURIComponent(name)}&per_page=1&locale=${encodeURIComponent(locale)}`
  );
  const payload = response.ok ? await response.json() : { products: [] };
  const product = Array.isArray(payload.products) ? payload.products[0] as WCProduct | undefined : undefined;
  return product?.images?.[0]?.src || null;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const marketPrefix = useMarketPrefix();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<number, string>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const resolvedParams = use(params);
  const locale = resolvedParams.locale as "en" | "ar";
  const orderId = resolvedParams.id;
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getOrder(parseInt(orderId, 10));
        if (response.success && response.data) {
          setOrder(response.data);
          
          const itemsWithoutImages = response.data.line_items.filter(
            (item: OrderLineItem) => !item.image?.src
          );
          
          if (itemsWithoutImages.length > 0) {
            const imageMap: Record<number, string> = {};
            
            const validIdItems = itemsWithoutImages.filter((item: OrderLineItem) => item.product_id > 0);
            if (validIdItems.length > 0) {
              try {
                const productIds = validIdItems.map((item: OrderLineItem) => item.product_id);
                const products = await fetchProductsByIds(productIds, locale);
                products.forEach((product) => {
                  if (product.images && product.images.length > 0) {
                    imageMap[product.id] = product.images[0].src;
                  }
                });
              } catch (imgErr) {
                console.error("Failed to fetch product images by ID:", imgErr);
              }
            }
            
            const zeroIdItems = itemsWithoutImages.filter((item: OrderLineItem) => item.product_id === 0 && item.name);
            if (zeroIdItems.length > 0) {
              const searchPromises = zeroIdItems.map(async (item: OrderLineItem) => {
                try {
                  const imageUrl = await searchProductImageByName(item.name, locale);
                  if (imageUrl) {
                    imageMap[item.id] = imageUrl;
                  }
                } catch {
                  // skip
                }
              });
              await Promise.all(searchPromises);
            }
            
            setProductImages(imageMap);
          }
        } else {
          setError(response.error?.message || "Failed to load order");
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("Failed to load order");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && orderId) {
      fetchOrder();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, orderId, locale]);
  
  // Helper function to get image URL for an order item
  const getItemImageUrl = (item: OrderLineItem): string | null => {
    if (item.image?.src) {
      return item.image.src;
    }
    if (item.product_id > 0 && productImages[item.product_id]) {
      return productImages[item.product_id];
    }
    if (productImages[item.id]) {
      return productImages[item.id];
    }
    return null;
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    setIsCancelling(true);
    setCancelError(null);
    
    try {
      const response = await cancelOrder(order.id, cancelReason || undefined);
      
      if (response.success) {
        setOrder({ ...order, status: "cancelled" });
        setShowCancelModal(false);
        setCancelReason("");
      } else {
        setCancelError(response.error?.message || t.cancelError);
      }
    } catch {
      setCancelError(t.cancelError);
    } finally {
      setIsCancelling(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <AccountLoadingSpinner message={t.loading} />;
    }

    if (error || !order) {
      return (
        <AccountEmptyState
          icon={Package}
          title={t.orderNotFound}
          message={error || ""}
          actionLabel={t.backToOrders}
          actionHref={`${marketPrefix}/${locale}/account/orders`}
        />
      );
    }

    return renderOrderDetails();
  };

  const renderOrderDetails = () => {
    if (!order) return null;
    const orderTax = parseFloat(order.total_tax || "0");
    const totalWithoutTax = parseFloat(order.total) - orderTax;
    const feeTotal = (order.fee_lines || []).reduce((sum, fee) => sum + parseFloat(fee.total || "0"), 0);
    const subtotal = totalWithoutTax - parseFloat(order.shipping_total) + parseFloat(order.discount_total) - feeTotal;

    return (
      <div className="container mx-auto px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-8">
        <Link
          href={`${marketPrefix}/${locale}/account/orders`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
          {t.backToOrders}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {t.orderNumber} #{order.number}
          </h1>
          <span
            className={`inline-flex items-center self-start rounded-full px-3 py-1 text-sm font-medium ${getOrderStatusColor(order.status)}`}
          >
            {formatOrderStatus(order.status)}
          </span>
        </div>
        <p className="mt-2 text-gray-500">
          {t.orderDate}: {formatDate(getOrderDate(order), locale, order.billing?.country)}
        </p>
        {order.currency && (
          <div className="mt-3">
            <OrderCurrencyBadge 
              orderCurrency={order.currency} 
              orderCurrencySymbol={order.currency_symbol}
              isRTL={isRTL}
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <OrderTimeline status={order.status} t={t} />
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <RichOrderTimeline
            status={order.status}
            dateCreated={order.date_created || ""}
            notes={order.customer_note ? [{ id: 0, note: order.customer_note, date_created: order.date_created || "", customer_note: true }] : []}
            locale={locale as "en" | "ar"}
          />
        </div>

        {canCancelOrder(order.status) && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{t.cancelOrder}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {locale === "ar" 
                    ? "يمكنك إلغاء هذا الطلب إذا لم يتم شحنه بعد"
                    : "You can cancel this order if it hasn't been shipped yet"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <XCircle className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {t.cancelOrder}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b p-4">
            <h3 className="font-semibold text-gray-900">
              {t.items} ({order.line_items.length} {order.line_items.length === 1 ? t.item : t.items})
            </h3>
          </div>
          <ul className="divide-y">
            {order.line_items.map((item) => {
              const isFreeGift = isOrderFreeGift(item);
              const isBundle = isOrderBundleProduct(item);
              
              const imageUrl = getItemImageUrl(item);
              
              return (
                <li key={item.id} className="p-4">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          {isFreeGift ? (
                            <Gift className="h-8 w-8 text-brand-gold" />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                      )}
                      {/* Quantity Badge */}
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{decodeHtmlEntities(item.name)}</h4>
                        {isFreeGift && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-beige px-2 py-0.5 text-xs font-medium text-brand-primary">
                            <Gift className="h-3 w-3" />
                            {t.freeGift}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 inline-flex items-center gap-1">
                        {t.qty}: {item.quantity}
                        {!isFreeGift && !isBundle && (
                          <> × <OrderPrice price={item.price} orderCurrency={order.currency} orderCurrencySymbol={order.currency_symbol} iconSize="xs" /></>
                        )}
                      </p>
                      {/* Bundle Items Breakdown */}
                      {isBundle && (
                        <OrderBundleItemsList item={item} locale={locale} />
                      )}
                    </div>
                    <div className="flex items-start pt-1">
                      <OrderPrice
                        price={isFreeGift ? 0 : item.total}
                        orderCurrency={order.currency}
                        orderCurrencySymbol={order.currency_symbol}
                        className={`font-medium ${isFreeGift ? "text-brand-gold" : "text-gray-900"}`}
                        iconSize="xs"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.subtotal}</span>
              <OrderPrice price={subtotal} orderCurrency={order.currency} orderCurrencySymbol={order.currency_symbol} className="text-gray-900" iconSize="xs" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.shipping}</span>
              <OrderPrice price={order.shipping_total} orderCurrency={order.currency} orderCurrencySymbol={order.currency_symbol} className="text-gray-900" iconSize="xs" />
            </div>
            {parseFloat(order.discount_total) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t.discount}</span>
                <span className="text-green-600 inline-flex items-center gap-1">
                  -<OrderPrice price={order.discount_total} orderCurrency={order.currency} orderCurrencySymbol={order.currency_symbol} iconSize="xs" />
                </span>
              </div>
            )}
            {/* Customs Fees */}
            {order.fee_lines && order.fee_lines.length > 0 && order.fee_lines.map((fee) => (
              <div key={fee.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{isRTL ? "رسوم جمركية" : fee.name}</span>
                <OrderPrice price={fee.total} orderCurrency={order.currency} orderCurrencySymbol={order.currency_symbol} className="text-gray-900" iconSize="xs" />
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span className="text-gray-900">{t.total}</span>
              <OrderPrice price={totalWithoutTax} orderCurrency={order.currency} orderCurrencySymbol={order.currency_symbol} className="text-gray-900" iconSize="sm" showConversion={true} isRTL={isRTL} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AddressCard title={t.shippingAddress} address={order.shipping} icon={Truck} />
          <AddressCard title={t.billingAddress} address={order.billing} icon={MapPin} />
        </div>

        {order.payment_method_title && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{t.paymentMethod}</h3>
            <p className="text-gray-600">{order.payment_method_title}</p>
          </div>
        )}

        <OrderNotes orderId={order.id} locale={locale} country={order.billing?.country} />
      </div>

        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t.cancelOrder}</h3>
              </div>
              
              <p className="text-gray-600 mb-4">{t.cancelOrderConfirm}</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.cancelReason}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t.cancelReasonPlaceholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  rows={3}
                />
              </div>

              {cancelError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {cancelError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                    setCancelError(null);
                  }}
                  disabled={isCancelling}
                >
                  {t.cancel}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCancelling ? t.cancelling : t.confirm}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AccountAuthGuard
      locale={locale}
      icon={Package}
      notLoggedInText={t.notLoggedIn}
      loginText={t.login}
    >
      {renderContent()}
    </AccountAuthGuard>
  );
}
