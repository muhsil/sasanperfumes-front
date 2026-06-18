"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { AuthCard } from "@/components/auth/AuthCard";
import { useNotification } from "@/contexts/NotificationContext";
import { forgotPassword } from "@/lib/api/auth";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { notify } = useNotification();
  const [locale, setLocale] = useState<string>("en");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const isRTL = locale === "ar";

  const t = {
    en: {
      title: "Reset password",
      subtitle: "Enter your email and we will send a reset link.",
      email: "Email Address",
      emailPlaceholder: "Enter your email",
      submitButton: "Send Reset Link",
      submitting: "Sending...",
      backToLogin: "Back to Login",
      emailRequired: "Email is required",
      emailInvalid: "Please enter a valid email address",
      successMessage: "If an account exists with this email, you will receive a password reset link shortly.",
      errorMessage: "Something went wrong. Please try again.",
    },
    ar: {
      title: "نسيت كلمة المرور",
      subtitle: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور",
      email: "البريد الإلكتروني",
      emailPlaceholder: "أدخل بريدك الإلكتروني",
      submitButton: "إرسال رابط إعادة التعيين",
      submitting: "جاري الإرسال...",
      backToLogin: "العودة لتسجيل الدخول",
      emailRequired: "البريد الإلكتروني مطلوب",
      emailInvalid: "يرجى إدخال بريد إلكتروني صحيح",
      successMessage: "إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، ستتلقى رابط إعادة تعيين كلمة المرور قريبًا.",
      errorMessage: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError(texts.emailRequired);
      return;
    }

    if (!validateEmail(email)) {
      setError(texts.emailInvalid);
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword(email);
      
      if (response.success) {
        setSuccessMessage(response.message || texts.successMessage);
        notify("success", response.message || texts.successMessage);
        setEmail("");
      } else {
        setError(response.error?.message || texts.errorMessage);
      }
    } catch {
      setError(texts.errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      locale={locale}
      eyebrow={texts.backToLogin}
      title={texts.title}
      subtitle={texts.subtitle}
      footer={
        <Link href={`/${locale}/login`} className="font-semibold text-brand-primary hover:underline">
          {texts.backToLogin}
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={texts.email}
          name="email"
          type="email"
          placeholder={texts.emailPlaceholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          autoComplete="email"
          dir={isRTL ? "rtl" : "ltr"}
          className="rounded-md bg-white"
          required
        />

        <Button
          type="submit"
          className="w-full rounded-md shadow-none hover:translate-y-0"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? texts.submitting : texts.submitButton}
        </Button>
      </form>
    </AuthCard>
  );
}
