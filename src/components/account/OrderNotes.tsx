"use client";

import { useState, useEffect } from "react";
import { FileText, CreditCard, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { getOrderNotes, type OrderNote } from "@/lib/api/customer";
import { getCountryTimezone } from "@/lib/utils";

interface OrderNotesProps {
  orderId: number;
  locale: "en" | "ar";
  country?: string;
}

interface ParsedPaymentDetails {
  invoiceStatus?: string;
  invoiceId?: string;
  invoiceReference?: string;
  invoiceDisplayValue?: string;
  invoiceBaseValue?: string;
  invoiceBaseCurrency?: string;
  paymentGateway?: string;
  paymentId?: string;
  referenced?: string;
  transactionId?: string;
  invoiceError?: string;
}

const translations = {
  en: {
    orderNotes: "Order Notes",
    noNotes: "No order notes available",
    loading: "Loading notes...",
    paymentDetails: "Payment Details",
    invoiceStatus: "Invoice Status",
    invoiceId: "Invoice ID",
    invoiceReference: "Invoice Reference",
    invoiceDisplayValue: "Invoice Display Value",
    invoiceBaseValue: "Invoice Base Value",
    invoiceBaseCurrency: "Invoice Base Currency",
    paymentGateway: "Payment Gateway",
    paymentId: "Payment ID",
    referenced: "Referenced",
    transactionId: "Transaction ID",
    invoiceError: "Invoice Error",
    showMore: "Show more",
    showLess: "Show less",
    storeAuthor: "Store",
  },
  ar: {
    orderNotes: "ملاحظات الطلب",
    noNotes: "لا توجد ملاحظات للطلب",
    loading: "جاري تحميل الملاحظات...",
    paymentDetails: "تفاصيل الدفع",
    invoiceStatus: "حالة الفاتورة",
    invoiceId: "رقم الفاتورة",
    invoiceReference: "مرجع الفاتورة",
    invoiceDisplayValue: "قيمة العرض",
    invoiceBaseValue: "القيمة الأساسية",
    invoiceBaseCurrency: "العملة الأساسية",
    paymentGateway: "بوابة الدفع",
    paymentId: "رقم الدفع",
    referenced: "المرجع",
    transactionId: "رقم المعاملة",
    invoiceError: "خطأ في الفاتورة",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    storeAuthor: "المتجر",
  },
};

function parsePaymentDetails(note: string): ParsedPaymentDetails | null {
  if (!note.includes("Payment Details")) {
    return null;
  }

  const details: ParsedPaymentDetails = {};
  
  const patterns: { key: keyof ParsedPaymentDetails; pattern: RegExp }[] = [
    { key: "invoiceStatus", pattern: /InvoiceStatus:\s*([^\n]+)/i },
    { key: "invoiceId", pattern: /InvoiceId:\s*([^\n]+)/i },
    { key: "invoiceReference", pattern: /InvoiceReference:\s*([^\n]+)/i },
    { key: "invoiceDisplayValue", pattern: /InvoiceDisplayValue:\s*([^\n]+)/i },
    { key: "invoiceBaseValue", pattern: /InvoiceBaseValue:\s*([^\n]+)/i },
    { key: "invoiceBaseCurrency", pattern: /InvoiceBaseCurrency:\s*([^\n]+)/i },
    { key: "paymentGateway", pattern: /PaymentGateway:\s*([^\n]+)/i },
    { key: "paymentId", pattern: /PaymentId:\s*([^\n]+)/i },
    { key: "referenced", pattern: /Referenced:\s*([^\n]+)/i },
    { key: "transactionId", pattern: /TransactionId:\s*([^\n]+)/i },
    { key: "invoiceError", pattern: /InvoiceError:\s*([^\n]+)/i },
  ];

  for (const { key, pattern } of patterns) {
    const match = note.match(pattern);
    if (match) {
      details[key] = match[1].trim();
    }
  }

  return Object.keys(details).length > 0 ? details : null;
}

function getNoteType(note: string): "payment" | "status" | "general" {
  if (note.includes("Payment")) {
    return "payment";
  }
  if (note.includes("status changed") || note.includes("Order status")) {
    return "status";
  }
  return "general";
}

function getNoteStyles(type: "payment" | "status" | "general", note: string) {
  if (type === "payment") {
    if (note.includes("Failed") || note.includes("DECLINED")) {
      return "bg-red-50 border-red-200 text-red-800";
    }
    if (note.includes("Paid") || note.includes("Success")) {
      return "bg-green-50 border-green-200 text-green-800";
    }
    return "bg-blue-50 border-blue-200 text-blue-800";
  }
  if (type === "status") {
    if (note.includes("Failed") || note.includes("Cancelled")) {
      return "bg-red-50 border-red-200 text-red-800";
    }
    if (note.includes("Completed") || note.includes("Processing")) {
      return "bg-green-50 border-green-200 text-green-800";
    }
    return "bg-yellow-50 border-yellow-200 text-yellow-800";
  }
  return "bg-gray-50 border-gray-200 text-gray-800";
}

function formatNoteDate(dateString: string, locale: string, country?: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (country) {
    const tz = getCountryTimezone(country);
    if (tz) options.timeZone = tz;
  }
  return date.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", options);
}

function formatAuthorName(t: typeof translations.en): string {
  return t.storeAuthor;
}

function PaymentDetailsCard({ 
  details, 
  t 
}: { 
  details: ParsedPaymentDetails; 
  t: typeof translations.en;
}) {
  const fields = [
    { key: "invoiceStatus", label: t.invoiceStatus, value: details.invoiceStatus },
    { key: "invoiceId", label: t.invoiceId, value: details.invoiceId },
    { key: "invoiceReference", label: t.invoiceReference, value: details.invoiceReference },
    { key: "invoiceDisplayValue", label: t.invoiceDisplayValue, value: details.invoiceDisplayValue },
    { key: "invoiceBaseValue", label: t.invoiceBaseValue, value: details.invoiceBaseValue },
    { key: "invoiceBaseCurrency", label: t.invoiceBaseCurrency, value: details.invoiceBaseCurrency },
    { key: "paymentGateway", label: t.paymentGateway, value: details.paymentGateway },
    { key: "paymentId", label: t.paymentId, value: details.paymentId },
    { key: "referenced", label: t.referenced, value: details.referenced },
    { key: "transactionId", label: t.transactionId, value: details.transactionId },
    { key: "invoiceError", label: t.invoiceError, value: details.invoiceError },
  ].filter(field => field.value);

  return (
    <div className="mt-2 space-y-1 text-sm">
      {fields.map(({ key, label, value }) => (
        <div key={key} className="flex flex-wrap gap-1">
          <span className="font-medium">{label}:</span>
          <span className={key === "invoiceError" ? "text-red-600" : ""}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function NoteIcon({ noteType, noteContent }: { noteType: "payment" | "status" | "general"; noteContent: string }) {
  if (noteType === "payment" || noteType === "status") {
    if (noteContent.includes("Failed") || noteContent.includes("DECLINED") || noteContent.includes("Cancelled")) {
      return <AlertCircle className="h-5 w-5" />;
    }
    if (noteContent.includes("Paid") || noteContent.includes("Success") || noteContent.includes("Completed")) {
      return <CheckCircle className="h-5 w-5" />;
    }
    return noteType === "payment" ? <CreditCard className="h-5 w-5" /> : <Clock className="h-5 w-5" />;
  }
  
  return <FileText className="h-5 w-5" />;
}

function NoteItem({ 
  note, 
  locale, 
  t,
  country 
}: { 
  note: OrderNote; 
  locale: "en" | "ar"; 
  t: typeof translations.en;
  country?: string;
}){
  const noteType = getNoteType(note.note);
  const styles = getNoteStyles(noteType, note.note);
  const paymentDetails = parsePaymentDetails(note.note);
  
  const isPaymentNote = noteType === "payment" && paymentDetails;
  const displayNote = isPaymentNote 
    ? note.note.split("\n")[0] 
    : note.note;

  return (
    <div className={`rounded-lg border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <NoteIcon noteType={noteType} noteContent={note.note} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-sm">
              {formatAuthorName(t)}
            </span>
            <span className="text-xs opacity-75">
              {formatNoteDate(note.date_created, locale, country)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{displayNote}</p>
          {isPaymentNote && paymentDetails && (
            <PaymentDetailsCard details={paymentDetails} t={t} />
          )}
        </div>
      </div>
    </div>
  );
}

export function OrderNotes({ orderId, locale, country }: OrderNotesProps) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  const INITIAL_NOTES_COUNT = 3;

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const response = await getOrderNotes(orderId);
        if (response.success && response.data) {
          setNotes(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch order notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [orderId]);

  const displayedNotes = isExpanded ? notes : notes.slice(0, INITIAL_NOTES_COUNT);
  const hasMoreNotes = notes.length > INITIAL_NOTES_COUNT;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.orderNotes}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          <span className="ml-2 text-gray-500">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">{t.orderNotes}</h3>
        <span className="text-sm text-gray-500">({notes.length})</span>
      </div>
      <div className="space-y-3">
        {displayedNotes.map((note) => (
          <NoteItem key={note.id} note={note} locale={locale} t={t} country={country} />
        ))}
      </div>
      {hasMoreNotes && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {t.showLess}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {t.showMore} ({notes.length - INITIAL_NOTES_COUNT})
            </>
          )}
        </button>
      )}
    </div>
  );
}
