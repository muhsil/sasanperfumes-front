"use client";

import { useState, useEffect, use } from "react";
import { MapPin, Edit2, Plus, X, Save, Trash2, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AccountAuthGuard } from "@/components/account/AccountAuthGuard";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountLoadingSpinner } from "@/components/account/AccountLoadingSpinner";
import { Checkbox } from "@/components/common/Checkbox";
import { CountrySelect } from "@/components/common/CountrySelect";
import { PhoneInput } from "@/components/common/PhoneInput";
import {
  getCustomer,
  getSavedAddressesFromCustomer,
  saveSavedAddresses,
  type SavedAddress,
  generateAddressId,
} from "@/lib/api/customer";
import { countries } from "@/components/common/CountrySelect";

interface AddressesPageProps {
  params: Promise<{ locale: string }>;
}

const translations = {
  en: {
    addresses: "Address Book",
    backToAccount: "Back to Account",
    savedAddresses: "Saved Addresses",
    noAddresses: "No addresses saved yet",
    addFirstAddress: "Add your first address to make checkout faster",
    addAddress: "Add New Address",
    editAddress: "Edit Address",
    deleteAddress: "Delete",
    setDefault: "Set as Default",
    defaultAddress: "Default",
    notLoggedIn: "Please log in to view your addresses",
    login: "Login",
    loading: "Loading addresses...",
    addressLabel: "Address Label",
    addressLabelPlaceholder: "e.g., Home, Office, etc.",
    firstName: "First Name",
    lastName: "Last Name",
    company: "Company (optional)",
    address1: "Address Line 1",
    address2: "Address Line 2 (optional)",
    city: "City",
    state: "State/Province",
    postcode: "Postal Code",
    country: "Country",
    phone: "Phone",
    email: "Email",
    cancel: "Cancel",
    save: "Save Address",
    saving: "Saving...",
    saved: "Address saved successfully",
    deleted: "Address deleted successfully",
    error: "Failed to save address",
    deleteError: "Failed to delete address",
    makeDefault: "Make this my default address",
    confirmDelete: "Are you sure you want to delete this address?",
    yes: "Yes, Delete",
    no: "Cancel",
  },
  ar: {
    addresses: "دفتر العناوين",
    backToAccount: "العودة إلى الحساب",
    savedAddresses: "العناوين المحفوظة",
    noAddresses: "لا توجد عناوين محفوظة بعد",
    addFirstAddress: "أضف عنوانك الأول لجعل الدفع أسرع",
    addAddress: "إضافة عنوان جديد",
    editAddress: "تعديل العنوان",
    deleteAddress: "حذف",
    setDefault: "تعيين كافتراضي",
    defaultAddress: "افتراضي",
    notLoggedIn: "يرجى تسجيل الدخول لعرض عناوينك",
    login: "تسجيل الدخول",
    loading: "جاري تحميل العناوين...",
    addressLabel: "اسم العنوان",
    addressLabelPlaceholder: "مثال: المنزل، المكتب، إلخ.",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    company: "الشركة (اختياري)",
    address1: "العنوان السطر 1",
    address2: "العنوان السطر 2 (اختياري)",
    city: "المدينة",
    state: "الولاية/المقاطعة",
    postcode: "الرمز البريدي",
    country: "البلد",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    cancel: "إلغاء",
    save: "حفظ العنوان",
    saving: "جاري الحفظ...",
    saved: "تم حفظ العنوان بنجاح",
    deleted: "تم حذف العنوان بنجاح",
    error: "فشل في حفظ العنوان",
    deleteError: "فشل في حذف العنوان",
    makeDefault: "اجعل هذا عنواني الافتراضي",
    confirmDelete: "هل أنت متأكد من حذف هذا العنوان؟",
    yes: "نعم، احذف",
    no: "إلغاء",
  },
};

const emptyAddress: Omit<SavedAddress, "id"> = {
  label: "",
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  postcode: "",
  country: "AE",
  phone: "",
  email: "",
  is_default: false,
};

function SavedAddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  t,
  isRTL,
}: {
  address: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  t: typeof translations.en;
  isRTL: boolean;
}) {
  return (
    <div className={`rounded-xl border ${address.is_default ? "border-brand-gold bg-brand-beige" : "border-gray-200 bg-white"} p-5 relative`}>
      {address.is_default && (
        <div className={`absolute top-3 ${isRTL ? "left-3" : "right-3"} flex items-center gap-1 rounded-full bg-brand-beige px-2 py-1 text-xs font-medium text-brand-primary`}>
          <Star className="h-3 w-3 fill-brand-primary text-brand-gold" />
          {t.defaultAddress}
        </div>
      )}
      
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900">{address.label || "Address"}</h3>
      </div>

      <div className="text-sm text-gray-600 space-y-1 mb-4">
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
        <p>{countries.find(c => c.value === address.country)?.label || address.country}</p>
        {address.phone && <p>{address.phone}</p>}
        {address.email && <p>{address.email}</p>}
      </div>

      <div className={`flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100`}>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
          {t.editAddress}
        </Button>
        {!address.is_default && (
          <Button variant="ghost" size="sm" onClick={onSetDefault}>
            <Star className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
            {t.setDefault}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
          {t.deleteAddress}
        </Button>
      </div>
    </div>
  );
}

const ADDRESS_LABEL_OPTIONS = [
  { value: "Home", labelEn: "Home", labelAr: "المنزل" },
  { value: "Office", labelEn: "Office", labelAr: "المكتب" },
  { value: "Work", labelEn: "Work", labelAr: "العمل" },
  { value: "Other", labelEn: "Other", labelAr: "أخرى" },
];

function AddressModal({
  isOpen,
  onClose,
  initialAddress,
  onSave,
  isSaving,
  t,
  isRTL,
  isEditing,
  userEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialAddress: Omit<SavedAddress, "id"> | SavedAddress | null;
  onSave: (address: Omit<SavedAddress, "id"> | SavedAddress) => Promise<void>;
  isSaving: boolean;
  t: typeof translations.en;
  isRTL: boolean;
  isEditing: boolean;
  userEmail?: string;
}) {
  const [formData, setFormData] = useState<Omit<SavedAddress, "id">>(emptyAddress);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  if (isOpen && !prevIsOpen) {
    if (initialAddress) {
      const { id, ...rest } = initialAddress as SavedAddress;
      setFormData(rest);
      setAddressId(id || null);
    } else {
      setFormData(emptyAddress);
      setAddressId(null);
    }
  }
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData, email: userEmail || formData.email || "" };
    if (addressId) {
      await onSave({ ...dataToSave, id: addressId });
    } else {
      await onSave(dataToSave);
    }
  };

  const handleChange = (field: keyof Omit<SavedAddress, "id">) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!isOpen) return null;

  const title = isEditing ? t.editAddress : t.addAddress;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t.addressLabel}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="">{isRTL ? "اختر العنوان" : "Select label"}</option>
                {ADDRESS_LABEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isRTL ? opt.labelAr : opt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t.firstName}
                value={formData.first_name}
                onChange={handleChange("first_name")}
                required
              />
              <Input
                label={t.lastName}
                value={formData.last_name}
                onChange={handleChange("last_name")}
                required
              />
            </div>

            <Input
              label={t.company}
              value={formData.company}
              onChange={handleChange("company")}
            />

            <Input
              label={t.address1}
              value={formData.address_1}
              onChange={handleChange("address_1")}
              required
            />

            <Input
              label={t.address2}
              value={formData.address_2}
              onChange={handleChange("address_2")}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t.city}
                value={formData.city}
                onChange={handleChange("city")}
                required
              />
              <Input
                label={t.state}
                value={formData.state}
                onChange={handleChange("state")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t.postcode}
                value={formData.postcode}
                onChange={handleChange("postcode")}
              />
              <CountrySelect
                label={t.country}
                value={formData.country}
                onChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                required
                isRTL={isRTL}
              />
            </div>

            <PhoneInput
              label={t.phone}
              value={formData.phone || ""}
              onChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
              countryCode={formData.country}
              isRTL={isRTL}
            />

            {!userEmail && (
              <Input
                label={t.email}
                type="email"
                value={formData.email || ""}
                onChange={handleChange("email")}
              />
            )}

            <div className="rounded-lg border border-gray-200 p-3">
              <Checkbox
                checked={formData.is_default}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_default: e.target.checked }))
                }
                label={t.makeDefault}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={onClose}
                disabled={isSaving}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                isLoading={isSaving}
              >
                <Save className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isSaving ? t.saving : t.save}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  t,
  isRTL,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  t: typeof translations.en;
  isRTL: boolean;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-gray-700">{t.confirmDelete}</p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={onClose}
              disabled={isDeleting}
            >
              {t.no}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={onConfirm}
              isLoading={isDeleting}
            >
              {t.yes}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AddressesPage({ params }: AddressesPageProps) {
  const { user, isAuthenticated } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const resolvedParams = use(params);
  const locale = resolvedParams.locale as "en" | "ar";
  const t = translations[locale] || translations.en;
  const isRTL = locale === "ar";

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user?.user_id) return;

      try {
        setIsLoading(true);
        const response = await getCustomer(user.user_id);
        if (response.success && response.data) {
          const addresses = getSavedAddressesFromCustomer(response.data);
          setSavedAddresses(addresses);
        }
      } catch (error) {
        console.error("Failed to fetch customer:", error);
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

  const handleSaveAddress = async (address: Omit<SavedAddress, "id"> | SavedAddress) => {
    if (!user?.user_id) return;

    setIsSaving(true);
    setMessage(null);

    try {
      let updatedAddresses: SavedAddress[];
      
      if ("id" in address && address.id) {
        const migratedAddress = address.id.startsWith("wc_")
          ? { ...address, id: generateAddressId() } as SavedAddress
          : address as SavedAddress;

        updatedAddresses = savedAddresses
          .filter((addr) => !(addr.id.startsWith("wc_") && addr.id !== (address as SavedAddress).id))
          .map((addr) => {
            if (addr.id === (address as SavedAddress).id) {
              return migratedAddress;
            }
            if (migratedAddress.is_default && addr.is_default) {
              return { ...addr, is_default: false };
            }
            return addr;
          });

        if (migratedAddress.id !== (address as SavedAddress).id) {
          updatedAddresses = updatedAddresses.filter((a) => a.id !== (address as SavedAddress).id);
          updatedAddresses.push(migratedAddress);
        }
      } else {
        const newAddress: SavedAddress = {
          ...address,
          id: generateAddressId(),
        };
        
        const nonWcAddresses = savedAddresses.filter((addr) => !addr.id.startsWith("wc_"));
        
        if (newAddress.is_default || nonWcAddresses.length === 0) {
          newAddress.is_default = true;
          updatedAddresses = nonWcAddresses.map((addr) => ({
            ...addr,
            is_default: false,
          }));
          updatedAddresses.push(newAddress);
        } else {
          updatedAddresses = [...nonWcAddresses, newAddress];
        }
      }

      const addressesToSave = updatedAddresses.filter((addr) => !addr.id.startsWith("wc_"));
      const response = await saveSavedAddresses(user.user_id, addressesToSave);
      if (response.success && response.data) {
        const addresses = getSavedAddressesFromCustomer(response.data);
        setSavedAddresses(addresses);
        setIsModalOpen(false);
        setEditingAddress(null);
        setMessage({ type: "success", text: t.saved });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: response.error?.message || t.error });
      }
    } catch (error) {
      console.error("Failed to save address:", error);
      setMessage({ type: "error", text: t.error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!user?.user_id || !deletingAddressId) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      const updatedAddresses = savedAddresses.filter(
        (addr) => addr.id !== deletingAddressId && !addr.id.startsWith("wc_")
      );
      
      if (updatedAddresses.length > 0 && !updatedAddresses.some((addr) => addr.is_default)) {
        updatedAddresses[0].is_default = true;
      }

      const response = await saveSavedAddresses(user.user_id, updatedAddresses);
      if (response.success && response.data) {
        const addresses = getSavedAddressesFromCustomer(response.data);
        setSavedAddresses(addresses);
        setDeletingAddressId(null);
        setMessage({ type: "success", text: t.deleted });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: response.error?.message || t.deleteError });
      }
    } catch (error) {
      console.error("Failed to delete address:", error);
      setMessage({ type: "error", text: t.deleteError });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.user_id) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedAddresses = savedAddresses
        .map((addr) => {
          if (addr.id.startsWith("wc_")) {
            return { ...addr, id: generateAddressId(), is_default: addr.id === addressId };
          }
          return { ...addr, is_default: addr.id === addressId };
        });

      const addressesToSave = updatedAddresses.filter((addr) => !addr.id.startsWith("wc_"));
      const response = await saveSavedAddresses(user.user_id, addressesToSave);
      if (response.success && response.data) {
        const addresses = getSavedAddressesFromCustomer(response.data);
        setSavedAddresses(addresses);
        setMessage({ type: "success", text: t.saved });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: response.error?.message || t.error });
      }
    } catch (error) {
      console.error("Failed to set default address:", error);
      setMessage({ type: "error", text: t.error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (address: SavedAddress) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  return (
    <AccountAuthGuard
      locale={locale}
      icon={MapPin}
      notLoggedInText={t.notLoggedIn}
      loginText={t.login}
    >
      <div className="container mx-auto px-5 md:px-7 lg:px-12 py-8" dir={isRTL ? "rtl" : "ltr"}>
        <AccountPageHeader
          locale={locale}
          title={t.addresses}
          backHref={`/${locale}/account`}
          backLabel={t.backToAccount}
        />
        <div className="flex items-center justify-end -mt-4 mb-6">
          <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
            <Plus className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
            {t.addAddress}
          </Button>
        </div>

      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {isLoading ? (
        <AccountLoadingSpinner message={t.loading} />
      ) : savedAddresses.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <MapPin className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.noAddresses}</h2>
          <p className="text-gray-500 mb-6">{t.addFirstAddress}</p>
          <Button variant="primary" size="lg" onClick={handleOpenAddModal}>
            <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
            {t.addAddress}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savedAddresses.map((address) => (
            <SavedAddressCard
              key={address.id}
              address={address}
              onEdit={() => handleOpenEditModal(address)}
              onDelete={() => setDeletingAddressId(address.id)}
              onSetDefault={() => handleSetDefault(address.id)}
              t={t}
              isRTL={isRTL}
            />
          ))}
        </div>
      )}

      <AddressModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAddress(null);
        }}
        initialAddress={editingAddress}
        onSave={handleSaveAddress}
        isSaving={isSaving}
        t={t}
        isRTL={isRTL}
        isEditing={!!editingAddress}
        userEmail={user?.user_email}
      />

      <DeleteConfirmModal
        isOpen={deletingAddressId !== null}
        onClose={() => setDeletingAddressId(null)}
        onConfirm={handleDeleteAddress}
        isDeleting={isDeleting}
        t={t}
        isRTL={isRTL}
      />
    </div>
    </AccountAuthGuard>
  );
}
