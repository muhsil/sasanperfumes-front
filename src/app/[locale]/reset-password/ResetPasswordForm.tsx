"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { AuthBackground } from "@/components/common/AuthBackground";
import { useNotification } from "@/contexts/NotificationContext";
import { resetPassword } from "@/lib/api/auth";

interface ResetPasswordFormProps {
  locale: string;
}

export default function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInvalidLink, setIsInvalidLink] = useState(false);

  const key = searchParams.get("key") || "";
  const login = searchParams.get("login") || "";

  useEffect(() => {
    if (!key || !login) {
      setIsInvalidLink(true);
    }
  }, [key, login]);

  const isRTL = locale === "ar";

  const t = {
    en: {
      title: "Reset Password",
      subtitle: "Enter your new password below",
      password: "New Password",
      passwordPlaceholder: "Enter your new password",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Confirm your new password",
      submitButton: "Reset Password",
      submitting: "Resetting...",
      backToLogin: "Back to Login",
      passwordRequired: "Password is required",
      passwordMinLength: "Password must be at least 6 characters",
      passwordsNotMatch: "Passwords do not match",
      successMessage: "Your password has been reset successfully!",
      invalidLink: "Invalid or Expired Link",
      invalidLinkMessage: "This password reset link is invalid or has expired. Please request a new password reset.",
      requestNewLink: "Request New Reset Link",
    },
    ar: {
      title: "إعادة تعيين كلمة المرور",
      subtitle: "أدخل كلمة المرور الجديدة أدناه",
      password: "كلمة المرور الجديدة",
      passwordPlaceholder: "أدخل كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      confirmPasswordPlaceholder: "أعد إدخال كلمة المرور الجديدة",
      submitButton: "إعادة تعيين كلمة المرور",
      submitting: "جاري إعادة التعيين...",
      backToLogin: "العودة لتسجيل الدخول",
      passwordRequired: "كلمة المرور مطلوبة",
      passwordMinLength: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
      passwordsNotMatch: "كلمات المرور غير متطابقة",
      successMessage: "تم إعادة تعيين كلمة المرور بنجاح!",
      invalidLink: "رابط غير صالح أو منتهي الصلاحية",
      invalidLinkMessage: "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب إعادة تعيين كلمة مرور جديدة.",
      requestNewLink: "طلب رابط جديد",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = texts.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password = texts.passwordMinLength;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = texts.passwordsNotMatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await resetPassword(key, login, password);

      if (response.success) {
        setSuccessMessage(response.message || texts.successMessage);
        notify("success", response.message || texts.successMessage);
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 3000);
      } else {
        setErrors({
          general: response.error?.message || "Failed to reset password",
        });
      }
    } catch {
      setErrors({
        general: "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInvalidLink) {
    return (
      <AuthBackground showImage={false} className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">
          <div className="luxury-panel p-5 md:p-7">
            <div className={`mb-8 text-center ${isRTL ? "rtl" : ""}`}>
              <h1 className="font-title text-2xl text-brand-primary md:text-3xl">{texts.invalidLink}</h1>
              <p className="mt-4 text-sm text-brand-muted md:text-base">{texts.invalidLinkMessage}</p>
            </div>

            <div className="space-y-4">
              <Link
                href={`/${locale}/forgot-password`}
                className="block w-full rounded-md bg-brand-primary px-4 py-3 text-center font-medium text-white hover:bg-brand-primary-dark"
              >
                {texts.requestNewLink}
              </Link>
              
              <Link
                href={`/${locale}/login`}
                className="block text-center font-medium text-brand-primary hover:underline"
              >
                {texts.backToLogin}
              </Link>
            </div>
          </div>
        </div>
      </AuthBackground>
    );
  }

  return (
      <AuthBackground showImage={false} className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-md">
        <div className="luxury-panel p-5 md:p-7">
          <div className={`mb-8 text-center ${isRTL ? "rtl" : ""}`}>
            <h1 className="font-title text-2xl text-brand-primary md:text-3xl">{texts.title}</h1>
            <p className="mt-2 text-sm text-brand-muted md:text-base">{texts.subtitle}</p>
          </div>

          {errors.general && (
            <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-md bg-green-50 p-4 text-sm text-green-600">
              {successMessage}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={texts.password}
                name="password"
                type="password"
                placeholder={texts.passwordPlaceholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                autoComplete="new-password"
                dir={isRTL ? "rtl" : "ltr"}
                required
              />

              <Input
                label={texts.confirmPassword}
                name="confirmPassword"
                type="password"
                placeholder={texts.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
                autoComplete="new-password"
                dir={isRTL ? "rtl" : "ltr"}
                required
              />

              <Button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-primary-dark focus-visible:ring-brand-primary"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? texts.submitting : texts.submitButton}
              </Button>
            </form>
          )}

          <div className={`mt-6 text-center text-sm ${isRTL ? "rtl" : ""}`}>
            <Link
              href={`/${locale}/login`}
              className="font-medium text-brand-primary hover:underline"
            >
              {texts.backToLogin}
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
