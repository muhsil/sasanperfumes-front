"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { OrderPrice, OrderCurrencyBadge } from "@/components/common/OrderPrice";
import { useCart } from "@/contexts/CartContext";
import { OrderBundleItemsList, isOrderBundleProduct, isOrderFreeGift } from "@/components/cart/OrderBundleItemsList";
import { fbTrackPurchase } from "@/lib/utils/fbpixel";
import type { OrderLineItem } from "@/lib/api/customer";
import { decodeHtmlEntities } from "@/lib/utils";
import { normalizeFrontendPaymentUrl } from "@/lib/utils/payment";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface OrderMetaData {
  id: number;
  key: string;
  value: string;
}

interface OrderFeeLine {
  id: number;
  name: string;
  total: string;
  total_tax: string;
}

interface OrderData {
  id: number;
  order_key: string;
  status: string;
  total: string;
  total_tax: string;
  shipping_total: string;
  discount_total: string;
  currency: string;
  currency_symbol: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    city: string;
    country: string;
  };
  line_items: OrderLineItem[];
  fee_lines?: OrderFeeLine[];
  payment_method: string;
  payment_method_title: string;
  payment_url?: string;
  meta_data?: OrderMetaData[];
}

interface PaymentVerificationResult {
  success: boolean;
  payment_status?: "success" | "failed" | "pending";
  status_message?: string;
  invoice_id?: string;
  invoice_status?: string;
  invoice_reference?: string;
  invoice_value?: string;
  created_date?: string;
  transaction_id?: string;
  transaction_status?: string;
  payment_method?: string;
  paid_currency?: string;
  paid_currency_value?: string;
  customer_name?: string;
  customer_email?: string;
  customer_mobile?: string;
  error_code?: string;
  error_message?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface OrderConfirmationClientProps {
  locale: string;
}

const WOO_PAYMENTS_METHODS = new Set(["woocommerce_payments", "stripe", "card"]);

function isWooPaymentsMethod(method: string): boolean {
  const normalized = (method || "").toLowerCase();
  if (WOO_PAYMENTS_METHODS.has(normalized)) return true;

  return (
    normalized.includes("stripe") ||
    normalized.includes("woocommerce_payments") ||
    (normalized.includes("card") && !normalized.includes("check"))
  );
}

function isExternalPaymentMethod(method: string): boolean {
  const normalizedMethod = (method || "").toLowerCase();
  return (
    normalizedMethod.startsWith("tabby")
    || normalizedMethod.startsWith("tamara")
    || isWooPaymentsMethod(normalizedMethod)
  );
}

function isLikelyCardPayment(method: string, methodTitle = ""): boolean {
  if (isWooPaymentsMethod(method)) return true;
  const normalizedTitle = (methodTitle || "").toLowerCase();
  return normalizedTitle.includes("credit") && normalizedTitle.includes("card");
}

export default function OrderConfirmationClient({ locale }: OrderConfirmationClientProps) {
  const marketPrefix = useMarketPrefix();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const orderKey = searchParams.get("order_key");
  const orderReceivedId = searchParams.get("order-received");
  const wcOrderKey = searchParams.get("key");
  const tabbyPaymentId = searchParams.get("payment_id");
  const tamaraOrderId = searchParams.get("orderId");
  const stripeSessionId = searchParams.get("stripe_session_id");
  const isRTL = locale === "ar";
  const resolvedOrderId = orderId || orderReceivedId;
  const { clearCart, setIsCartOpen } = useCart();
  const cartClearedRef = useRef(false);
  const paymentVerifiedRef = useRef(false);
  const purchaseTrackedRef = useRef(false);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | "pending" | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const startStripeCheckout = useCallback(async (targetOrder: OrderData) => {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: targetOrder.id,
        order_key: targetOrder.order_key,
        locale,
        market_prefix: marketPrefix,
      }),
    });

    const data = await response.json();
    if (data.success && data.checkout_url) {
      window.location.href = data.checkout_url;
      return;
    }

    throw new Error(data.error?.message || "Failed to initiate Stripe payment");
  }, [locale, marketPrefix]);

  useEffect(() => {
    setIsCartOpen(false);
  }, [setIsCartOpen]);

  const handleRetryPayment = useCallback(async () => {
    if (!order || !resolvedOrderId) return;
    
    setRetryingPayment(true);
    setRetryError(null);
    
    try {
      const baseUrl = window.location.origin;
      const paymentMethod = order.payment_method;
      const normalizedPaymentMethod = (paymentMethod || "").toLowerCase();
      const orderTotal = parseFloat(order.total);
      
      const isTabbyPayment = normalizedPaymentMethod.startsWith("tabby");
      const isTamaraPayment = normalizedPaymentMethod.startsWith("tamara");
      const isWooPaymentsPayment = isWooPaymentsMethod(normalizedPaymentMethod);
      const isLikelyCardCheckout = isLikelyCardPayment(normalizedPaymentMethod, order.payment_method_title);
      
      if (isTabbyPayment) {
        const tabbyResponse = await fetch("/api/tabby/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            order_key: order.order_key,
            amount: orderTotal,
            currency: order.currency || "AED",
            description: `Order #${order.id}`,
            buyer: {
              name: `${order.billing.first_name} ${order.billing.last_name}`,
              email: order.billing.email,
              phone: order.billing.phone,
            },
            shipping_address: {
              city: order.billing.city,
              address: order.billing.address_1,
              zip: "",
            },
            order_items: order.line_items.map((item) => ({
              title: item.name,
              quantity: item.quantity,
              unit_price: parseFloat(item.total) / item.quantity,
              category: "General",
            })),
            language: locale === "ar" ? "ar" : "en",
            success_url: `${baseUrl}/${locale}/order-confirmation`,
            cancel_url: `${baseUrl}/${locale}/order-confirmation`,
            failure_url: `${baseUrl}/${locale}/order-confirmation`,
          }),
        });
        
        const tabbyData = await tabbyResponse.json();
        
        if (tabbyData.success && tabbyData.payment_url) {
          window.location.href = tabbyData.payment_url;
          return;
        } else {
          throw new Error(tabbyData.error?.message || "Failed to initiate payment");
        }
      } else if (isTamaraPayment) {
        const tamaraResponse = await fetch("/api/tamara/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            order_key: order.order_key,
            total_amount: orderTotal,
            currency: order.currency || "AED",
            country_code: order.billing.country || "AE",
            locale: locale === "ar" ? "ar_SA" : "en_US",
            consumer: {
              first_name: order.billing.first_name,
              last_name: order.billing.last_name,
              email: order.billing.email,
              phone_number: order.billing.phone,
            },
            billing_address: {
              first_name: order.billing.first_name,
              last_name: order.billing.last_name,
              line1: order.billing.address_1,
              city: order.billing.city,
              country_code: order.billing.country || "AE",
              phone_number: order.billing.phone,
            },
            shipping_address: {
              first_name: order.billing.first_name,
              last_name: order.billing.last_name,
              line1: order.billing.address_1,
              city: order.billing.city,
              country_code: order.billing.country || "AE",
              phone_number: order.billing.phone,
            },
            items: order.line_items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit_price: parseFloat(item.total) / item.quantity,
              sku: item.id?.toString() || "",
            })),
            success_url: `${baseUrl}/${locale}/order-confirmation`,
            failure_url: `${baseUrl}/${locale}/order-confirmation`,
            cancel_url: `${baseUrl}/${locale}/order-confirmation`,
          }),
        });
        
        const tamaraData = await tamaraResponse.json();
        
        if (tamaraData.success && tamaraData.checkout_url) {
          window.location.href = tamaraData.checkout_url;
          return;
        } else {
          throw new Error(tamaraData.error?.message || "Failed to initiate payment");
        }
      } else if (isWooPaymentsPayment || isLikelyCardCheckout) {
        await startStripeCheckout(order);
        return;
      } else {
        setRetryError(isRTL ? "طريقة الدفع غير مدعومة لإعادة المحاولة" : "Payment method not supported for retry");
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : (isRTL ? "فشل في إعادة المحاولة" : "Failed to retry payment"));
    } finally {
      setRetryingPayment(false);
    }
    }, [order, resolvedOrderId, locale, isRTL, startStripeCheckout]);

  useEffect(() => {
    const verifyPaymentAndFetchOrder = async () => {
      if (!resolvedOrderId) {
        setError("Order ID not found");
        setLoading(false);
        return;
      }

      try {
        const hasExternalPayment = tabbyPaymentId || tamaraOrderId || stripeSessionId;
        
        if (hasExternalPayment && !paymentVerifiedRef.current) {
          paymentVerifiedRef.current = true;
          setVerifyingPayment(true);
          
          try {
            let verifyUrl = "";
            
            if (tabbyPaymentId) {
              verifyUrl = `/api/tabby/verify-payment?payment_id=${tabbyPaymentId}`;
            } else if (tamaraOrderId) {
              verifyUrl = `/api/tamara/verify-payment?order_id=${tamaraOrderId}`;
            } else if (stripeSessionId) {
              verifyUrl =
                `/api/stripe/verify-session?session_id=${encodeURIComponent(stripeSessionId)}` +
                `&order_id=${encodeURIComponent(resolvedOrderId)}` +
                `&order_key=${encodeURIComponent(orderKey || wcOrderKey || "")}`;
            }
            
            if (verifyUrl) {
              const verifyResponse = await fetch(verifyUrl);
              const verifyData: PaymentVerificationResult = await verifyResponse.json();
              
              if (verifyData.success && verifyData.payment_status) {
                setPaymentStatus(verifyData.payment_status);
                setPaymentMessage(verifyData.status_message || null);
                
                if (verifyData.payment_status === "success") {
                  try {
                    const updateResponse = await fetch("/api/orders", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        order_id: parseInt(resolvedOrderId, 10),
                        status: "processing",
                        set_paid: true,
                        transaction_id: verifyData.transaction_id || verifyData.invoice_id,
                      }),
                    });
                    const updateData = await updateResponse.json();
                    if (!updateData.success) {
                      console.error("Failed to update order status:", updateData.error);
                    }
                  } catch (updateError) {
                    console.error("Failed to update order status:", updateError);
                  }
                } else if (verifyData.payment_status === "failed") {
                  try {
                    const updateResponse = await fetch("/api/orders", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        order_id: parseInt(resolvedOrderId, 10),
                        status: "failed",
                      }),
                    });
                    const updateData = await updateResponse.json();
                    if (!updateData.success) {
                      console.error("Failed to update order status to failed:", updateData.error);
                    }
                  } catch (updateError) {
                    console.error("Failed to update order status to failed:", updateError);
                  }
                }
              } else {
                console.error("Payment verification error:", verifyData.error);
              }
            }
          } catch (verifyError) {
            console.error("Failed to verify payment:", verifyError);
          } finally {
            setVerifyingPayment(false);
          }
        }

        // Include order_key for guest checkout authentication (WooCommerce standard pattern)
        const orderApiUrl = orderKey || wcOrderKey
          ? `/api/orders?orderId=${resolvedOrderId}&order_key=${orderKey || wcOrderKey}`
          : `/api/orders?orderId=${resolvedOrderId}`;
        const response = await fetch(orderApiUrl);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || "Failed to fetch order");
        }

        setOrder(data.data);

        // Facebook Pixel: Purchase (fire once for successful payments)
        const fetchedOrder = data.data as OrderData;
        const fetchedStatus = fetchedOrder?.status;
        const gatewayRedirectKey = `payment_redirected_${resolvedOrderId}_${fetchedOrder?.order_key || ""}`;
        const paymentMethod = fetchedOrder?.payment_method || "";
        const paymentMethodTitle = fetchedOrder?.payment_method_title || "";
        const isExternalPayment =
          isExternalPaymentMethod(paymentMethod) ||
          isLikelyCardPayment(paymentMethod, paymentMethodTitle);

        const hasExternalPaymentParams = tabbyPaymentId || tamaraOrderId || stripeSessionId;

        if (
          isLikelyCardPayment(paymentMethod, paymentMethodTitle) &&
          fetchedStatus === "pending" &&
          !hasExternalPaymentParams &&
          typeof window !== "undefined"
        ) {
          const alreadyRedirectedToStripe = window.sessionStorage.getItem(`${gatewayRedirectKey}_stripe`);
          if (!alreadyRedirectedToStripe) {
            window.sessionStorage.setItem(`${gatewayRedirectKey}_stripe`, "1");
            await startStripeCheckout(fetchedOrder);
            return;
          }
        } else if (
          fetchedOrder?.payment_url &&
          isExternalPayment &&
          fetchedStatus === "pending" &&
          !hasExternalPaymentParams &&
          typeof window !== "undefined"
        ) {
          const alreadyRedirected = window.sessionStorage.getItem(gatewayRedirectKey);
          if (!alreadyRedirected) {
            window.sessionStorage.setItem(gatewayRedirectKey, "1");
            const normalizedPaymentUrl = normalizeFrontendPaymentUrl(fetchedOrder.payment_url, {
              origin: window.location.origin,
              locale,
              marketPrefix,
            });

            if (normalizedPaymentUrl) {
              window.location.href = normalizedPaymentUrl;
            } else {
              setPaymentStatus("pending");
            }
            return;
          }
        } else if (fetchedOrder?.order_key && typeof window !== "undefined") {
          window.sessionStorage.removeItem(`${gatewayRedirectKey}_orderpay`);
          window.sessionStorage.removeItem(gatewayRedirectKey);
          window.sessionStorage.removeItem(`${gatewayRedirectKey}_stripe`);
        }

        const isFailedOrder = fetchedStatus === "failed" || fetchedStatus === "cancelled";
        const isPendingOrder = fetchedStatus === "pending";
        const isSuccessOrder = fetchedStatus === "processing" || fetchedStatus === "completed" || fetchedStatus === "on-hold";
        if (!paymentStatus) {
          if (isFailedOrder) {
            setPaymentStatus("failed");
          } else if (isPendingOrder) {
            setPaymentStatus("pending");
          }
        }
        if (!purchaseTrackedRef.current && fetchedOrder && isSuccessOrder) {
          purchaseTrackedRef.current = true;
          fbTrackPurchase({
            contentIds: fetchedOrder.line_items.map((item) => String(item.product_id)),
            value: parseFloat(fetchedOrder.total),
            currency: fetchedOrder.currency || "AED",
            numItems: fetchedOrder.line_items.reduce((sum, item) => sum + item.quantity, 0),
          });
        }

        // Only clear cart if payment was successful or if it's a non-external payment (like COD)
        // For failed payments, keep the cart so user can retry
        const shouldClearCart = !hasExternalPayment || paymentVerifiedRef.current;
        
        // Check if this is a successful payment or COD order
        const orderStatus = data.data?.status;
        const isSuccessfulPayment = orderStatus === "processing" || orderStatus === "completed" || orderStatus === "on-hold";
        
        if (!cartClearedRef.current && shouldClearCart && isSuccessfulPayment) {
          cartClearedRef.current = true;
          try {
            await clearCart();
          } catch (cartError) {
            console.error("Failed to clear cart:", cartError);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    verifyPaymentAndFetchOrder();
    }, [resolvedOrderId, orderKey, wcOrderKey, tabbyPaymentId, tamaraOrderId, stripeSessionId, clearCart, paymentStatus, startStripeCheckout]);

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"></div>
          <p className="text-gray-600">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 text-6xl">!</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            {isRTL ? "حدث خطأ" : "Something went wrong"}
          </h1>
          <p className="mb-8 text-gray-600">
            {error || (isRTL ? "لم نتمكن من تحميل تفاصيل الطلب" : "We couldn't load your order details")}
          </p>
          <Link href={`${marketPrefix}/${locale}/shop`}>
            <Button>{isRTL ? "العودة للتسوق" : "Continue Shopping"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPaymentFailed = paymentStatus === "failed";
  const isPaymentPending = paymentStatus === "pending";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {verifyingPayment && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
              <span className="text-blue-700">
                {isRTL ? "جاري التحقق من حالة الدفع..." : "Verifying payment status..."}
              </span>
            </div>
          </div>
        )}

        {isPaymentFailed && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">
                  {isRTL ? "فشل الدفع" : "Payment Failed"}
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {paymentMessage || (isRTL ? "لم يتم إتمام الدفع. يرجى المحاولة مرة أخرى." : "Payment was not completed. Please try again.")}
                </p>
                {retryError && (
                  <p className="mt-2 text-sm text-red-600">
                    {retryError}
                  </p>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={handleRetryPayment}
                  disabled={retryingPayment}
                >
                  {retryingPayment ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></span>
                      {isRTL ? "جاري المعالجة..." : "Processing..."}
                    </span>
                  ) : (
                    isRTL ? "إعادة المحاولة" : "Try Again"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isPaymentPending && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
                <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">
                  {isRTL ? "الدفع قيد المعالجة" : "Payment Processing"}
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {paymentMessage || (isRTL ? "جاري معالجة الدفع. سيتم تحديث حالة الطلب قريباً." : "Your payment is being processed. Order status will be updated shortly.")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isPaymentFailed ? "bg-red-100" : isPaymentPending ? "bg-yellow-100" : "bg-green-100"
          }`}>
            {isPaymentFailed ? (
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isPaymentPending ? (
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {isPaymentFailed 
              ? (isRTL ? "فشل الدفع" : "Payment Failed")
              : isPaymentPending
              ? (isRTL ? "الطلب قيد المعالجة" : "Order Processing")
              : (isRTL ? "شكراً لطلبك!" : "Thank you for your order!")}
          </h1>
          <p className="text-gray-600">
            {isRTL
              ? `رقم الطلب: #${order.id}`
              : `Order number: #${order.id}`}
          </p>
          {order.currency && !isPaymentFailed && (
            <div className="mt-3">
              <OrderCurrencyBadge orderCurrency={order.currency} isRTL={isRTL} />
            </div>
          )}
        </div>

        {/* Only show order details/invoice when payment is successful (not failed) */}
        {!isPaymentFailed && (
          <>
            <div className="mb-8 rounded-lg border bg-gray-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {isRTL ? "تفاصيل الطلب" : "Order Details"}
              </h2>

              <div className="mb-6 space-y-4 border-b pb-4">
                {order.line_items.map((item) => {
                  const isFreeGift = isOrderFreeGift(item);
                  const isBundle = isOrderBundleProduct(item);
                  
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {decodeHtmlEntities(item.name)} x {item.quantity}
                          {isFreeGift && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-brand-beige px-2 py-0.5 text-xs font-medium text-brand-primary">
                              {isRTL ? "هدية مجانية" : "Free Gift"}
                            </span>
                          )}
                        </span>
                        <OrderPrice 
                          price={isFreeGift ? 0 : item.total} 
                          orderCurrency={order.currency} 
                          className={`font-medium ${isFreeGift ? "text-brand-gold" : ""}`} 
                          iconSize="xs" 
                        />
                      </div>
                      {/* Bundle Items Breakdown */}
                      {isBundle && (
                        <OrderBundleItemsList item={item} locale={locale} compact />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{isRTL ? "المجموع الفرعي" : "Subtotal"}</span>
                  <OrderPrice price={(() => {
                    const orderTax = parseFloat(order.total_tax || "0");
                    const totalWithoutTax = parseFloat(order.total) - orderTax;
                    const feeTotal = (order.fee_lines || []).reduce((sum, fee) => sum + parseFloat(fee.total || "0"), 0);
                    return totalWithoutTax - parseFloat(order.shipping_total || "0") + parseFloat(order.discount_total || "0") - feeTotal;
                  })()} orderCurrency={order.currency} iconSize="xs" />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{isRTL ? "الشحن" : "Shipping"}</span>
                  <OrderPrice price={order.shipping_total || "0"} orderCurrency={order.currency} iconSize="xs" />
                </div>
                {parseFloat(order.discount_total || "0") > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{isRTL ? "الخصم" : "Discount"}</span>
                    <span className="text-green-600">-<OrderPrice price={order.discount_total} orderCurrency={order.currency} iconSize="xs" /></span>
                  </div>
                )}
                {/* Customs Fees */}
                {order.fee_lines && order.fee_lines.length > 0 && order.fee_lines.map((fee) => (
                  <div key={fee.id} className="flex justify-between text-sm text-gray-600">
                    <span>{isRTL ? "رسوم جمركية" : fee.name}</span>
                    <OrderPrice price={fee.total} orderCurrency={order.currency} iconSize="xs" />
                  </div>
                ))}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>{isRTL ? "الإجمالي" : "Total"}</span>
                  <OrderPrice price={order.total} orderCurrency={order.currency} iconSize="sm" showConversion={true} isRTL={isRTL} />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{isRTL ? "طريقة الدفع" : "Payment Method"}</span>
                  <span>{order.payment_method_title}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{isRTL ? "الحالة" : "Status"}</span>
                  <span className="capitalize">{order.status.replace(/-/g, " ")}</span>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {isRTL ? "عنوان الشحن" : "Shipping Address"}
              </h2>
              <div className="text-gray-600">
                <p>{order.billing.first_name} {order.billing.last_name}</p>
                <p>{order.billing.address_1}</p>
                <p>{order.billing.city}, {order.billing.country}</p>
                <p>{order.billing.email}</p>
                <p>{order.billing.phone}</p>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-6 text-gray-600">
                {isRTL
                  ? "سيتم إرسال تأكيد الطلب إلى بريدك الإلكتروني"
                  : "A confirmation email has been sent to your email address"}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href={`${marketPrefix}/${locale}/shop`}>
                  <Button variant="outline">
                    {isRTL ? "متابعة التسوق" : "Continue Shopping"}
                  </Button>
                </Link>
                <Link href={`${marketPrefix}/${locale}/account/orders`}>
                  <Button>{isRTL ? "عرض طلباتي" : "View My Orders"}</Button>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Show simplified view for failed payments */}
        {isPaymentFailed && (
          <div className="text-center">
            <p className="mb-6 text-gray-600">
              {isRTL
                ? "يمكنك إعادة محاولة الدفع أو العودة للتسوق"
                : "You can retry the payment or continue shopping"}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href={`${marketPrefix}/${locale}/shop`}>
                <Button variant="outline">
                  {isRTL ? "متابعة التسوق" : "Continue Shopping"}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
