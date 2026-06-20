"use client";

import { useState, useEffect, use } from "react";
import { User, Mail, Save, Lock, Bell, Eye, EyeOff } from "lucide-react";
import { PhoneInput } from "@/components/common/PhoneInput";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AccountAuthGuard } from "@/components/account/AccountAuthGuard";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { getCustomer, updateCustomer, type Customer } from "@/lib/api/customer";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

const translations = {
  en: {
    settings: "Account Settings",
    backToAccount: "Back to Account",
    personalInfo: "Personal Information",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    phone: "Phone Number",
    saveChanges: "Save Changes",
    saving: "Saving...",
    saved: "Changes saved successfully",
    notLoggedIn: "Please log in to view your settings",
    login: "Login",
    error: "Failed to save changes",
    loading: "Loading settings...",
    securitySection: "Security",
    changePassword: "Change Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    updatePassword: "Update Password",
    updatingPassword: "Updating...",
    passwordChanged: "Password changed successfully",
    passwordError: "Failed to change password",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    notificationsSection: "Notifications",
    emailNotifications: "Email Notifications",
    emailNotificationsDesc: "Receive order updates and promotional emails",
    smsNotifications: "SMS Notifications",
    smsNotificationsDesc: "Receive order updates via SMS",
    preferencesSection: "Preferences",
    language: "Language",
    currency: "Currency",
  },
  ar: {
    settings: "إعدادات الحساب",
    backToAccount: "العودة إلى الحساب",
    personalInfo: "المعلومات الشخصية",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    saveChanges: "حفظ التغييرات",
    saving: "جاري الحفظ...",
    saved: "تم حفظ التغييرات بنجاح",
    notLoggedIn: "يرجى تسجيل الدخول لعرض إعداداتك",
    login: "تسجيل الدخول",
    error: "فشل في حفظ التغييرات",
    loading: "جاري تحميل الإعدادات...",
    securitySection: "الأمان",
    changePassword: "تغيير كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    updatePassword: "تحديث كلمة المرور",
    updatingPassword: "جاري التحديث...",
    passwordChanged: "تم تغيير كلمة المرور بنجاح",
    passwordError: "فشل في تغيير كلمة المرور",
    passwordMismatch: "كلمات المرور غير متطابقة",
    passwordTooShort: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
    notificationsSection: "الإشعارات",
    emailNotifications: "إشعارات البريد الإلكتروني",
    emailNotificationsDesc: "تلقي تحديثات الطلبات والرسائل الترويجية",
    smsNotifications: "إشعارات الرسائل النصية",
    smsNotificationsDesc: "تلقي تحديثات الطلبات عبر الرسائل النصية",
    preferencesSection: "التفضيلات",
    language: "اللغة",
    currency: "العملة",
  },
};

export default function SettingsPage({ params }: SettingsPageProps) {
  const marketPrefix = useMarketPrefix();
  const { user, isAuthenticated } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resolvedParams = use(params);
  const locale = resolvedParams.locale as "en" | "ar";
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user?.user_id) return;

      try {
        setIsLoading(true);
        const response = await getCustomer(user.user_id);
        if (response.success && response.data) {
          setCustomer(response.data);
          setFormData({
            firstName: response.data.first_name || "",
            lastName: response.data.last_name || "",
            email: response.data.email || "",
            phone: response.data.billing?.phone || "",
          });
        } else {
          const nameParts = user.user_display_name?.split(" ") || ["", ""];
          setFormData({
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: user.user_email || "",
            phone: "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch customer:", error);
        const nameParts = user.user_display_name?.split(" ") || ["", ""];
        setFormData({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: user.user_email || "",
          phone: "",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchCustomer();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await updateCustomer(user.user_id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        billing: {
          ...customer?.billing,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        } as Customer["billing"],
      });

      if (response.success && response.data) {
        setCustomer(response.data);
        setMessage({ type: "success", text: t.saved });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: response.error?.message || t.error });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: t.error });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: t.passwordTooShort });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: "error", text: t.passwordMismatch });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const response = await updateCustomer(user.user_id, {
        password: passwordData.newPassword,
      } as Partial<Customer> & { password: string });

      if (response.success) {
        setPasswordMessage({ type: "success", text: t.passwordChanged });
        setPasswordData({ newPassword: "", confirmPassword: "" });
        setTimeout(() => setPasswordMessage(null), 3000);
      } else {
        setPasswordMessage({ type: "error", text: response.error?.message || t.passwordError });
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      setPasswordMessage({ type: "error", text: t.passwordError });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AccountAuthGuard
      locale={locale}
      icon={User}
      notLoggedInText={t.notLoggedIn}
      loginText={t.login}
    >
      <div className="container mx-auto px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
        <AccountPageHeader
          locale={locale}
          title={t.settings}
          backHref={`${marketPrefix}/${locale}/account`}
          backLabel={t.backToAccount}
        />

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t.personalInfo}</h2>
              <p className="text-sm text-gray-500">{user?.user_email}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-black rounded-full mx-auto mb-4" />
              <p className="text-gray-500">{t.loading}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t.firstName}
                  </label>
                  <Input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder={t.firstName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t.lastName}
                  </label>
                  <Input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder={t.lastName}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400`} />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder={t.email}
                    className={isRTL ? "pr-10" : "pl-10"}
                    disabled
                  />
                </div>
              </div>

              <PhoneInput
                label={t.phone}
                value={formData.phone}
                onChange={(phone) => setFormData({ ...formData, phone })}
                isRTL={isRTL}
              />

              {message && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSaving}
              >
                <Save className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isSaving ? t.saving : t.saveChanges}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
              <Lock className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t.securitySection}</h2>
              <p className="text-sm text-gray-500">{t.changePassword}</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.newPassword}
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400`} />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  placeholder={t.newPassword}
                  className={isRTL ? "pr-10 pl-10" : "pl-10 pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400`} />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder={t.confirmPassword}
                  className={isRTL ? "pr-10 pl-10" : "pl-10 pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {passwordMessage && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isChangingPassword}
            >
              <Lock className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              {isChangingPassword ? t.updatingPassword : t.updatePassword}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
              <Bell className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t.notificationsSection}</h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t.emailNotifications}</p>
                <p className="text-sm text-gray-500">{t.emailNotificationsDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailNotifications ? "bg-black" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? (isRTL ? "translate-x-1" : "translate-x-6") : (isRTL ? "translate-x-6" : "translate-x-1")
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t.smsNotifications}</p>
                <p className="text-sm text-gray-500">{t.smsNotificationsDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setSmsNotifications(!smsNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  smsNotifications ? "bg-black" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    smsNotifications ? (isRTL ? "translate-x-1" : "translate-x-6") : (isRTL ? "translate-x-6" : "translate-x-1")
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AccountAuthGuard>
  );
}
