"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { AuthCard } from "@/components/auth/AuthCard";
import { PhoneInput } from "@/components/common/PhoneInput";
import { register } from "@/lib/api/auth";
import { validatePhoneNumber, parsePhoneNumber } from "@/lib/utils/phone";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const { googleLogin } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [locale, setLocale] = useState<string>("en");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [newsletter, setNewsletter] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    terms?: string;
    general?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const isRTL = locale === "ar";

  const t = {
    en: {
      register: "Register",
      registerTitle: "Create your account",
      name: "Name",
      namePlaceholder: "Name",
      phone: "Phone number",
      phonePlaceholder: "Phone number",
      email: "E-mail",
      emailPlaceholder: "E-mail",
      password: "Password",
      passwordPlaceholder: "Password",
      newsletterLabel: "Register to our newsletter",
      termsLabel: "By signing up, you are agreeing to our",
      termsLink: "Terms & Conditions",
      registerButton: "Create account",
      registering: "Creating account...",
      hasAccount: "Already have an account?",
      signInLink: "Sign in",
      nameRequired: "Name is required",
      phoneRequired: "Phone number is required",
      emailRequired: "Email is required",
      emailInvalid: "Please enter a valid email address",
      passwordRequired: "Password is required",
      passwordMinLength: "Password must be at least 6 characters",
      termsRequired: "You must accept the Terms & Conditions",
      registerSuccess: "Registration successful! Please login.",
      registerError: "Registration failed. Please try again.",
      orDivider: "or",
      googleSignUpError: "Google sign-up failed. Please try again.",
    },
    ar: {
      register: "التسجيل",
      registerTitle: "إنشاء حساب – ابدأ التسوق",
      name: "الاسم",
      namePlaceholder: "الاسم",
      phone: "رقم الهاتف",
      phonePlaceholder: "رقم الهاتف",
      email: "البريد الإلكتروني",
      emailPlaceholder: "البريد الإلكتروني",
      password: "كلمة المرور",
      passwordPlaceholder: "كلمة المرور",
      newsletterLabel: "اشترك في نشرتنا الإخبارية",
      termsLabel: "بالتسجيل، أنت توافق على",
      termsLink: "الشروط والأحكام",
      registerButton: "إنشاء حساب",
      registering: "جاري إنشاء الحساب...",
      hasAccount: "لديك حساب بالفعل؟",
      signInLink: "تسجيل الدخول",
      nameRequired: "الاسم مطلوب",
      phoneRequired: "رقم الهاتف مطلوب",
      emailRequired: "البريد الإلكتروني مطلوب",
      emailInvalid: "يرجى إدخال بريد إلكتروني صحيح",
      passwordRequired: "كلمة المرور مطلوبة",
      passwordMinLength: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
      termsRequired: "يجب الموافقة على الشروط والأحكام",
      registerSuccess: "تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.",
      registerError: "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.",
      orDivider: "أو",
      googleSignUpError: "فشل التسجيل بحساب جوجل. يرجى المحاولة مرة أخرى.",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = texts.nameRequired;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = texts.phoneRequired;
    } else {
      const parsed = parsePhoneNumber(formData.phone);
      if (parsed.localNumber) {
        const validation = validatePhoneNumber(parsed.localNumber, "AE");
        if (!validation.isValid) {
          newErrors.phone = isRTL ? validation.errorAr : validation.error;
        }
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = texts.emailRequired;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = texts.emailInvalid;
    }

    if (!formData.password) {
      newErrors.password = texts.passwordRequired;
    } else if (formData.password.length < 6) {
      newErrors.password = texts.passwordMinLength;
    }

    if (!termsAccepted) {
      newErrors.terms = texts.termsRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await register({
        username: formData.email,
        email: formData.email,
        password: formData.password,
        first_name: formData.name,
        last_name: "",
        phone: formData.phone,
        newsletter: newsletter,
      });

      if (response.success) {
        setSuccessMessage(texts.registerSuccess);
        notify("success", texts.registerSuccess);
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 2000);
      } else {
        setErrors({
          general: response.error?.message || texts.registerError,
        });
      }
    } catch {
      setErrors({
        general: texts.registerError,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <AuthCard
      locale={locale}
      eyebrow={texts.register}
      title={texts.registerTitle}
      footer={
        <>
          <span className="text-brand-muted">{texts.hasAccount} </span>
          <Link
            href={`/${locale}/login`}
            className="font-semibold text-brand-primary transition-colors hover:text-brand-primary-dark"
          >
            {texts.signInLink}
          </Link>
        </>
      }
    >
      {errors.general && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <GoogleSignInButton
        onSuccess={async (credential) => {
          setIsGoogleLoading(true);
          setErrors({});
          try {
            const response = await googleLogin(credential);
            if (response.success) {
              router.push(`/${locale}/account`);
            } else {
              setErrors({ general: response.error?.message || texts.googleSignUpError });
            }
          } catch {
            setErrors({ general: texts.googleSignUpError });
          } finally {
            setIsGoogleLoading(false);
          }
        }}
        onError={() => setErrors({ general: texts.googleSignUpError })}
        text="signup_with"
        locale={locale}
      />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-brand-border/70" />
        <span className="text-xs text-brand-muted">{texts.orDivider}</span>
        <div className="h-px flex-1 bg-brand-border/70" />
      </div>

      {isGoogleLoading && (
        <div className="mb-4 rounded-md border border-brand-border/70 bg-brand-beige/50 p-3 text-center text-sm text-brand-primary">
          {texts.registering}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={texts.name}
          name="name"
          type="text"
          placeholder={texts.namePlaceholder}
          value={formData.name}
          onChange={handleInputChange}
          error={errors.name}
          autoComplete="name"
          dir={isRTL ? "rtl" : "ltr"}
          className="rounded-md bg-white"
        />

        <PhoneInput
          label={texts.phone}
          value={formData.phone}
          onChange={(phone) => {
            setFormData((prev) => ({ ...prev, phone }));
            if (errors.phone) {
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }
          }}
          error={errors.phone}
          isRTL={isRTL}
        />

        <Input
          label={texts.email}
          name="email"
          type="email"
          placeholder={texts.emailPlaceholder}
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          autoComplete="email"
          dir={isRTL ? "rtl" : "ltr"}
          className="rounded-md bg-white"
        />

        <Input
          label={texts.password}
          name="password"
          type="password"
          placeholder={texts.passwordPlaceholder}
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          autoComplete="new-password"
          dir={isRTL ? "rtl" : "ltr"}
          className="rounded-md bg-white"
        />

        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <input
            type="checkbox"
            id="newsletter"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="h-4 w-4 rounded border-brand-border accent-brand-primary"
          />
          <label htmlFor="newsletter" className="text-sm text-brand-primary">
            {texts.newsletterLabel}
          </label>
        </div>

        <div className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (errors.terms) {
                setErrors((prev) => ({ ...prev, terms: undefined }));
              }
            }}
            className="mt-0.5 h-4 w-4 rounded border-brand-border accent-brand-primary"
          />
          <label htmlFor="terms" className="text-sm leading-6 text-brand-primary">
            {texts.termsLabel}{" "}
            <Link href={`/${locale}/terms-and-conditions`} className="font-medium text-brand-primary hover:underline">
              {texts.termsLink}
            </Link>
          </label>
        </div>
        {errors.terms && <p className="text-sm text-red-600">{errors.terms}</p>}

        <Button
          type="submit"
          className="mt-2 w-full rounded-md shadow-none hover:translate-y-0"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? texts.registering : texts.registerButton}
        </Button>
      </form>
    </AuthCard>
  );
}
