"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Printer, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/Button";
import { AccountAuthGuard } from "@/components/account/AccountAuthGuard";
import { AccountLoadingSpinner } from "@/components/account/AccountLoadingSpinner";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { OrderPrice } from "@/components/common/OrderPrice";
import { AEDIcon } from "@/components/common/AEDIcon";
import { getOrder, formatDate, getOrderDate, type Order } from "@/lib/api/customer";
import { isOrderBundleProduct, isOrderFreeGift, getOrderBundleItems } from "@/components/cart/OrderBundleItemsList";
import { siteConfig } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";

interface InvoicePageProps {
  params: Promise<{ locale: string; id: string }>;
}

const translations = {
  en: {
    invoice: "Invoice",
    backToOrder: "Back to Order",
    orderNumber: "Order Number",
    invoiceNumber: "Invoice Number",
    invoiceDate: "Invoice Date",
    orderDate: "Order Date",
    status: "Status",
    billTo: "Bill To",
    shipTo: "Ship To",
    item: "Item",
    quantity: "Qty",
    unitPrice: "Unit Price",
    total: "Total",
    subtotal: "Subtotal",
    shipping: "Shipping",
    discount: "Discount",
    tax: "VAT",
    grandTotal: "Grand Total",
    paymentMethod: "Payment Method",
    notLoggedIn: "Please log in to view invoice",
    login: "Login",
    loading: "Loading invoice...",
    invoiceNotFound: "Invoice not found",
    backToOrders: "Back to Orders",
    print: "Print Invoice",
    freeGift: "Free Gift",
    thankYou: "Thank you for your order!",
  },
  ar: {
    invoice: "الفاتورة",
    backToOrder: "العودة إلى الطلب",
    orderNumber: "رقم الطلب",
    invoiceNumber: "رقم الفاتورة",
    invoiceDate: "تاريخ الفاتورة",
    orderDate: "تاريخ الطلب",
    status: "الحالة",
    billTo: "فاتورة إلى",
    shipTo: "شحن إلى",
    item: "المنتج",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    total: "المجموع",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    discount: "الخصم",
    tax: "ضريبة القيمة المضافة",
    grandTotal: "المجموع الكلي",
    paymentMethod: "طريقة الدفع",
    notLoggedIn: "يرجى تسجيل الدخول لعرض الفاتورة",
    login: "تسجيل الدخول",
    loading: "جاري تحميل الفاتورة...",
    invoiceNotFound: "الفاتورة غير موجودة",
    backToOrders: "العودة إلى الطلبات",
    print: "طباعة الفاتورة",
    freeGift: "هدية مجانية",
    thankYou: "شكراً لطلبك!",
  },
};

export default function InvoicePage({ params }: InvoicePageProps) {
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [productCategories, setProductCategories] = useState<Record<number, string[]>>({});

  const resolvedParams = use(params);
  const locale = resolvedParams.locale as "en" | "ar";
  const orderId = resolvedParams.id;
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  useEffect(() => {
    document.title = `${t.invoice} - ${siteConfig.name}`;
  }, [t.invoice]);

  useEffect(() => {
    setLogoUrl(siteConfig.logoUrl || null);
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getOrder(parseInt(orderId, 10));
        if (response.success && response.data) {
          setOrder(response.data);
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
  }, [isAuthenticated, orderId]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!order) return;
      const productIds = [...new Set(order.line_items.map(item => item.product_id).filter(id => id > 0))];
      if (productIds.length === 0) return;
      try {
        const response = await fetch(
          `${siteConfig.apiUrl}/wp-json/wc/store/v1/products?include=${productIds.join(",")}&per_page=${productIds.length}&lang=${locale}`
        );
        if (response.ok) {
          const products = await response.json();
          const categoriesMap: Record<number, string[]> = {};
          for (const product of products) {
            categoriesMap[product.id] = (product.categories || []).map(
              (cat: { id: number; name: string }) => cat.name
            );
          }
          setProductCategories(categoriesMap);
        }
      } catch (err) {
        console.error("Failed to fetch product categories:", err);
      }
    };
    fetchCategories();
  }, [order]);

  const handlePrint= () => {
    window.print();
  };

  const renderContent = () => {
    if (isLoading) {
      return <AccountLoadingSpinner message={t.loading} />;
    }

    if (error || !order) {
      return (
        <AccountEmptyState
          icon={Package}
          title={t.invoiceNotFound}
          message={error || ""}
          actionLabel={t.backToOrders}
          actionHref={`/${locale}/account/orders`}
        />
      );
    }

    return renderInvoice();
  };

  const renderInvoice = () => {
    if (!order) return null;
    const orderTax = parseFloat(order.total_tax || "0");
    const totalWithoutTax = parseFloat(order.total) - orderTax;
    const feeTotal = (order.fee_lines || []).reduce((sum, fee) => sum + parseFloat(fee.total || "0"), 0);
    const subtotal = totalWithoutTax - parseFloat(order.shipping_total) + parseFloat(order.discount_total) - feeTotal;

    return (
      <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-5 md:px-7 lg:px-12 py-8 print:py-0 print:px-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href={`/${locale}/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            {t.backToOrder}
          </Link>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
            {t.print}
          </Button>
        </div>

        <div className="mx-auto max-w-4xl bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none relative overflow-hidden invoice-content">
          {logoUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none invoice-watermark">
              <div className="relative w-[400px] h-[400px]">
                <Image
                  src={logoUrl}
                  alt="Watermark"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}
          <div className="p-8 print:p-6 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8 pb-8 border-b">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.invoice}</h1>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">{t.invoiceNumber}:</span> INV-{order.number}</p>
                  <p><span className="font-medium">{t.invoiceDate}:</span> {formatDate(getOrderDate(order), locale, order.billing?.country)}</p>
                  <p><span className="font-medium">{t.orderNumber}:</span> {order.number}</p>
                  <p><span className="font-medium">{t.orderDate}:</span> {formatDate(getOrderDate(order), locale, order.billing?.country)}</p>
                  {order.payment_method_title && (
                    <p><span className="font-medium">{t.paymentMethod}:</span> {order.payment_method_title}</p>
                  )}
                </div>
              </div>
              <div className={`${isRTL ? "text-left" : "text-right"}`}>
                {logoUrl ? (
                  <div className={`relative h-16 w-40 mb-2 ${isRTL ? "" : "ml-auto"}`}>
                    <Image
                      src={logoUrl}
                      alt="ShapeHive"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{siteConfig.name}</h2>
                )}
                <p className="text-sm text-gray-600">{siteConfig.url.replace(/^https?:\/\//, "")}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? "رقم التسجيل الضريبي" : "TRN"}: 100580322400003
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 pb-8 border-b">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">{t.billTo}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">
                    {order.billing.first_name} {order.billing.last_name}
                  </p>
                  {order.billing.company && <p>{order.billing.company}</p>}
                  <p>{order.billing.address_1}</p>
                  {order.billing.address_2 && <p>{order.billing.address_2}</p>}
                  <p>
                    {order.billing.city}
                    {order.billing.state && `, ${order.billing.state}`} {order.billing.postcode}
                  </p>
                  <p>{order.billing.country}</p>
                  {order.billing.email && <p>{order.billing.email}</p>}
                  {order.billing.phone && <p>{order.billing.phone}</p>}
                </div>
              </div>
              {order.shipping && (order.shipping.address_1 || order.shipping.city) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">{t.shipTo}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium text-gray-900">
                      {order.shipping.first_name} {order.shipping.last_name}
                    </p>
                    {order.shipping.company && <p>{order.shipping.company}</p>}
                    <p>{order.shipping.address_1}</p>
                    {order.shipping.address_2 && <p>{order.shipping.address_2}</p>}
                    <p>
                      {order.shipping.city}
                      {order.shipping.state && `, ${order.shipping.state}`} {order.shipping.postcode}
                    </p>
                    <p>{order.shipping.country}</p>
                    {order.shipping.phone && <p>{order.shipping.phone}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className={`py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide ${isRTL ? "text-right" : "text-left"}`}>
                      {t.item}
                    </th>
                    <th className="py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide text-center w-20">
                      {t.quantity}
                    </th>
                    <th className={`py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide ${isRTL ? "text-left" : "text-right"} w-28`}>
                      {t.unitPrice}
                    </th>
                    <th className={`py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide ${isRTL ? "text-left" : "text-right"} w-28`}>
                      {t.total}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.line_items.map((item) => {
                    const isFreeGift = isOrderFreeGift(item);
                    const isBundle = isOrderBundleProduct(item);
                    const rawBundleItems = isBundle ? getOrderBundleItems(item) : null;
                    const orderQuantity = item.quantity || 1;
                    
                    // Ensure free item detection runs — fallback in case the
                    // imported util returned items without is_free enrichment
                    let bundleItems = rawBundleItems;
                    if (bundleItems && bundleItems.length > 0) {
                      const hasAnyFreeFlag = bundleItems.some(bi => bi.is_free === true || bi.is_free === false);
                      if (!hasAnyFreeFlag) {
                        const lineTotal = parseFloat(item.total) || 0;
                        if (lineTotal > 0) {
                          const oQty = item.quantity || 1;
                          const sumAll = bundleItems.reduce((s, bi) => {
                            const p = typeof bi.price === "string" ? parseFloat(bi.price) : Number(bi.price || 0);
                            const q = bi.quantity || 1;
                            return s + (p * q * oQty);
                          }, 0);
                          const freeAmt = sumAll - lineTotal;
                          if (freeAmt > 0.01) {
                            let rem = freeAmt;
                            const enriched = [...bundleItems];
                            for (let i = enriched.length - 1; i >= 0 && rem > 0.01; i--) {
                              const p = typeof enriched[i].price === "string" ? parseFloat(enriched[i].price as string) : Number(enriched[i].price || 0);
                              const q = enriched[i].quantity || 1;
                              const iTotal = p * q * oQty;
                              if (iTotal > 0 && iTotal <= rem + 0.01) {
                                enriched[i] = { ...enriched[i], is_free: true, is_addon: true };
                                rem -= iTotal;
                              }
                            }
                            bundleItems = enriched;
                          }
                        }
                      }
                    }
                    
                    return (
                      <React.Fragment key={item.id}>
                        {/* Main product row */}
                        <tr>
                          <td className={`py-4 ${isRTL ? "text-right" : "text-left"}`}>
                            <div className="flex items-center gap-3">
                              {item.image?.src && (
                                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100 print:hidden">
                                  <Image
                                    src={item.image.src}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{decodeHtmlEntities(item.name)}</p>
                                {productCategories[item.product_id]?.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {productCategories[item.product_id].join(", ")}
                                  </p>
                                )}
                                {isFreeGift && (
                                  <span className="inline-flex items-center gap-1 text-xs text-brand-gold">
                                    <Gift className="h-3 w-3" />
                                    {t.freeGift}
                                  </span>
                                )}
                                {isBundle && bundleItems && bundleItems.length > 0 && (
                                  <p className="text-xs text-brand-gold mt-1">
                                    {isRTL ? `يحتوي على ${bundleItems.length} منتجات` : `Contains ${bundleItems.length} products`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center text-gray-600">
                            {item.quantity}
                          </td>
                          <td className={`py-4 ${isRTL ? "text-left" : "text-right"} text-gray-600`}>
                            {isFreeGift ? (
                              <span className="text-brand-gold">-</span>
                            ) : (
                              <OrderPrice 
                                price={item.price} 
                                orderCurrency={order.currency} 
                                orderCurrencySymbol={order.currency_symbol}
                                iconSize="xs"
                              />
                            )}
                          </td>
                          <td className={`py-4 ${isRTL ? "text-left" : "text-right"} font-medium text-gray-900`}>
                            {isFreeGift ? (
                              <span className="text-brand-gold inline-flex items-center gap-1">
                                {order.currency === "AED" ? <AEDIcon size="xs" /> : <span>{order.currency_symbol}</span>}
                                0.00
                              </span>
                            ) : (
                              <OrderPrice 
                                price={item.total} 
                                orderCurrency={order.currency} 
                                orderCurrencySymbol={order.currency_symbol}
                                iconSize="xs"
                              />
                            )}
                          </td>
                        </tr>
                        {/* Bundled product sub-rows */}
                        {isBundle && bundleItems && bundleItems.map((bi, idx) => {
                          const biPrice = typeof bi.price === "string" ? parseFloat(bi.price) : Number(bi.price || 0);
                          const biBaseQty = bi.quantity || 1;
                          const biQty = biBaseQty * orderQuantity;
                          const biTotal = biPrice * biBaseQty * orderQuantity;
                          const biIsFree = bi.is_free === true;
                          const biIsAddon = bi.is_addon === true;
                          return (
                            <tr key={`${item.id}-bundle-${bi.product_id}-${idx}`} className="bg-gray-50/50">
                              <td className={`py-2 ${isRTL ? "text-right pr-8" : "text-left pl-8"}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${biIsFree ? "bg-green-500" : biIsAddon ? "bg-brand-gold" : "bg-brand-gold"}`}></span>
                                  <div>
                                    <p className="text-sm text-gray-700">
                                      {bi.name || `Product #${bi.product_id}`}
                                      {biIsAddon && (
                                        <span className={`text-xs text-brand-gold ${isRTL ? "mr-1" : "ml-1"}`}>({isRTL ? "إضافة" : "Add-on"})</span>
                                      )}
                                    </p>
                                    {biIsFree && (
                                      <span className="text-xs font-medium text-green-600">
                                        {isRTL ? "مجاني" : "FREE"}
                                      </span>
                                    )}
                                    {productCategories[bi.product_id]?.length > 0 && (
                                      <p className="text-xs text-gray-500">
                                        {productCategories[bi.product_id].join(", ")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 text-center text-sm text-gray-500">
                                {biQty}
                              </td>
                              <td className={`py-2 ${isRTL ? "text-left" : "text-right"} text-sm text-gray-500`}>
                                {biIsFree ? (
                                  <span className="text-green-600">-</span>
                                ) : (
                                  <OrderPrice 
                                    price={biPrice} 
                                    orderCurrency={order.currency} 
                                    orderCurrencySymbol={order.currency_symbol}
                                    iconSize="xs"
                                  />
                                )}
                              </td>
                              <td className={`py-2 ${isRTL ? "text-left" : "text-right"} text-sm text-gray-600`}>
                                {biIsFree ? (
                                  <span className="text-green-600 inline-flex items-center gap-1">
                                    {order.currency === "AED" ? <AEDIcon size="xs" /> : <span>{order.currency_symbol}</span>}
                                    0.00
                                  </span>
                                ) : (
                                  <OrderPrice 
                                    price={biTotal} 
                                    orderCurrency={order.currency} 
                                    orderCurrencySymbol={order.currency_symbol}
                                    iconSize="xs"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:w-72">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.subtotal}</span>
                    <OrderPrice 
                      price={subtotal} 
                      orderCurrency={order.currency} 
                      orderCurrencySymbol={order.currency_symbol}
                      className="text-gray-900"
                      iconSize="xs"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.shipping}</span>
                    <OrderPrice 
                      price={order.shipping_total} 
                      orderCurrency={order.currency} 
                      orderCurrencySymbol={order.currency_symbol}
                      className="text-gray-900"
                      iconSize="xs"
                    />
                  </div>
                  {parseFloat(order.discount_total) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.discount}</span>
                      <span className="text-green-600">
                        -<OrderPrice 
                          price={order.discount_total} 
                          orderCurrency={order.currency} 
                          orderCurrencySymbol={order.currency_symbol}
                          iconSize="xs"
                        />
                      </span>
                    </div>
                  )}
                  {/* Customs Fees */}
                  {order.fee_lines && order.fee_lines.length > 0 && order.fee_lines.map((fee) => (
                    <div key={fee.id} className="flex justify-between">
                      <span className="text-gray-600">{isRTL ? "رسوم جمركية" : fee.name}</span>
                      <OrderPrice 
                        price={fee.total} 
                        orderCurrency={order.currency} 
                        orderCurrencySymbol={order.currency_symbol}
                        className="text-gray-900"
                        iconSize="xs"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between border-t-2 border-gray-200 pt-2 text-base font-semibold">
                    <span className="text-gray-900">{t.grandTotal}</span>
                    <OrderPrice 
                      price={totalWithoutTax} 
                      orderCurrency={order.currency} 
                      orderCurrencySymbol={order.currency_symbol}
                      className="text-gray-900"
                      iconSize="sm"
                    />
                  </div>
                </div>

                {order.payment_method_title && (
                  <div className="mt-4 pt-4 border-t text-sm">
                    <span className="text-gray-600">{t.paymentMethod}: </span>
                    <span className="font-medium text-gray-900">{order.payment_method_title}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t text-center">
              <p className="text-gray-500 text-sm">{t.thankYou}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .invoice-watermark {
          opacity: 0.06;
        }
        .invoice-content {
          font-family: var(--font-jost), var(--font-noto-sans-arabic), Arial, Helvetica, sans-serif;
        }
        .invoice-content * {
          font-family: inherit;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-content {
            font-family: var(--font-jost), var(--font-noto-sans-arabic), Arial, Helvetica, sans-serif !important;
          }
          .invoice-content * {
            font-family: inherit !important;
          }
          .invoice-watermark {
            opacity: 0.03;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
        }
      `}</style>
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
