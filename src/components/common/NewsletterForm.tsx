"use client";

import { useState } from "react";

interface NewsletterFormProps {
  locale: string;
  dictionary: {
    emailPlaceholder: string;
    subscribe: string;
  };
}

export function NewsletterForm({ locale, dictionary }: NewsletterFormProps) {
  const isRTL = locale === "ar";
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        setEmail("");
      } else {
        setError(
          data.error?.message ||
            (isRTL
              ? "فشل في الاشتراك. يرجى المحاولة مرة أخرى."
              : "Failed to subscribe. Please try again.")
        );
      }
    } catch {
      setError(
        isRTL
          ? "حدث خطأ في الشبكة. يرجى المحاولة مرة أخرى."
          : "A network error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-3 text-sm text-emerald-700">
        {isRTL
          ? "شكراً لاشتراكك في نشرتنا الإخبارية!"
          : "Thank you for subscribing to our newsletter!"}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder={dictionary.emailPlaceholder}
          required
          className="flex-1 rounded-full border border-white/25 bg-white/8 px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:border-[#b98a49] focus:outline-none focus:ring-1 focus:ring-[#b98a49]/60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[#b98a49] px-5 py-2.5 text-sm font-semibold text-[#1a1613] transition-colors hover:bg-[#c79956] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? isRTL
              ? "جاري الإرسال..."
              : "Subscribing..."
            : dictionary.subscribe}
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-red-300/65 bg-red-50 p-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </form>
  );
}
