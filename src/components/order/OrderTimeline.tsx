"use client";

import { Package, Truck, CheckCircle, Clock, XCircle, CreditCard } from "lucide-react";
import type { Locale } from "@/config/site";

interface OrderNote { id: number; note: string; date_created: string; customer_note: boolean; }

interface OrderTimelineProps {
  status: string;
  dateCreated: string;
  notes?: OrderNote[];
  locale?: Locale;
}

const STATUS_STEPS = [
  { key: "pending",    icon: Clock,        color: "text-yellow-500", bg: "bg-yellow-50",  label_en: "Order Placed",    label_ar: "تم الطلب" },
  { key: "processing", icon: CreditCard,   color: "text-blue-500",   bg: "bg-blue-50",    label_en: "Payment Confirmed", label_ar: "تأكيد الدفع" },
  { key: "on-hold",   icon: Truck,        color: "text-indigo-500",     bg: "bg-indigo-50",     label_en: "Shipped",         label_ar: "تم الشحن" },
  { key: "preparing", icon: Package,       color: "text-purple-500", bg: "bg-purple-50",  label_en: "Preparing",       label_ar: "قيد التحضير" },
  { key: "shipped",   icon: Truck,         color: "text-indigo-500", bg: "bg-indigo-50",  label_en: "Shipped",         label_ar: "تم الشحن" },
  { key: "completed", icon: CheckCircle,  color: "text-green-500",  bg: "bg-green-50",   label_en: "Delivered",       label_ar: "تم التسليم" },
];

const FLOW: Record<string, string[]> = {
  "pending":    ["pending"],
  "processing": ["pending", "processing"],
  "on-hold":    ["pending", "processing", "on-hold"],
  "preparing":  ["pending", "processing", "preparing"],
  "shipped":    ["pending", "processing", "preparing", "shipped"],
  "completed":  ["pending", "processing", "preparing", "shipped", "completed"],
  "cancelled":  ["pending"],
  "refunded":   ["pending", "processing"],
};

function formatDate(dateStr: string, locale: string) {
  try {
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function OrderTimeline({ status, dateCreated, notes = [], locale = "en" }: OrderTimelineProps) {
  const isAr = locale === "ar";
  const flow = FLOW[status] || ["pending"];
  const isCancelled = status === "cancelled";
  const isRefunded  = status === "refunded";

  const steps = STATUS_STEPS.filter((s) => flow.includes(s.key));
  const customerNotes = notes.filter((n) => n.customer_note);

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="space-y-6">
      {/* Status banner */}
      {(isCancelled || isRefunded) && (
        <div className={`flex items-center gap-3 rounded-xl p-4 ${isCancelled ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}>
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">
            {isCancelled
              ? (isAr ? "تم إلغاء هذا الطلب" : "This order has been cancelled")
              : (isAr ? "تم استرداد هذا الطلب" : "This order has been refunded")}
          </p>
        </div>
      )}

      {/* Timeline steps */}
      {!isCancelled && !isRefunded && (
        <div className="relative">
          {/* Connector line */}
          <div className={`absolute top-5 h-0.5 bg-gray-200 ${isAr ? "right-5 left-5" : "left-5 right-5"}`} style={{ top: "20px" }} />
          <div className="relative flex justify-between">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = step.key === status;
              const isDone = i < steps.length - 1 || step.key === "completed";
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5">
                  <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isActive
                      ? `border-brand-primary ${step.bg} ${step.color}`
                      : isDone
                      ? "border-green-300 bg-green-50 text-green-500"
                      : "border-gray-200 bg-white text-gray-300"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-center text-[10px] font-medium leading-tight ${isActive ? step.color : "text-gray-400"}`}>
                    {isAr ? step.label_ar : step.label_en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order date */}
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500">
          {isAr ? "تاريخ الطلب:" : "Order placed:"} <span className="font-medium text-gray-700">{formatDate(dateCreated, locale)}</span>
        </p>
      </div>

      {/* Customer notes */}
      {customerNotes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-900">{isAr ? "ملاحظات الطلب" : "Order Updates"}</h4>
          <div className="space-y-2">
            {customerNotes.map((n) => (
              <div key={n.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">{formatDate(n.date_created, locale)}</p>
                <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: n.note }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
