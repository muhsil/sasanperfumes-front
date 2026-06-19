"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Star, Loader2, Check, Camera, X, Upload, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Locale } from "@/config/site";

interface ReviewFormProps { productId: number; locale?: Locale; onSuccess?: () => void; }

const STAR_LABELS = {
  en: ["", "Poor", "Fair", "Good", "Very Good", "Excellent"],
  ar: ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"],
};

interface ImagePreview { file: File; preview: string; uploading: boolean; id?: number; error?: string; }

export function ReviewForm({ productId, locale = "en", onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const token = user?.token;
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [name, setName] = useState(user?.user_display_name || "");
  const [email, setEmail] = useState(user?.user_email || "");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAr = locale === "ar";
  const starLabels = STAR_LABELS[isAr ? "ar" : "en"];
  const MAX_CHARS = 1000;
  const MAX_IMAGES = 5;

  const uploadImage = async (file: File, index: number) => {
    setImages((prev) => prev.map((img, i) => i === index ? { ...img, uploading: true } : img));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (data.id) {
        setImages((prev) => prev.map((img, i) => i === index ? { ...img, uploading: false, id: data.id } : img));
      } else {
        setImages((prev) => prev.map((img, i) => i === index ? { ...img, uploading: false, error: data.error || "Upload failed" } : img));
      }
    } catch {
      setImages((prev) => prev.map((img, i) => i === index ? { ...img, uploading: false, error: "Upload failed" } : img));
    }
  };

  const addFiles = useCallback((files: File[]) => {
    const valid = files
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_IMAGES - images.length);
    if (!valid.length) return;
    const previews: ImagePreview[] = valid.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      uploading: false,
    }));
    setImages((prev) => {
      const next = [...prev, ...previews];
      previews.forEach((_, i) => {
        setTimeout(() => uploadImage(valid[i], prev.length + i), 0);
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, token]);

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setError(isAr ? "يرجى اختيار تقييم" : "Please select a rating"); return; }
    if (!review.trim()) { setError(isAr ? "يرجى كتابة مراجعة" : "Please write a review"); return; }
    if (!user && (!name.trim() || !email.trim())) {
      setError(isAr ? "يرجى إدخال الاسم والبريد الإلكتروني" : "Please enter your name and email");
      return;
    }
    if (images.some((img) => img.uploading)) {
      setError(isAr ? "الصور لا تزال تُرفع، يرجى الانتظار" : "Images still uploading, please wait");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const image_ids = images.filter((img) => img.id).map((img) => img.id!);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title: title.trim(),
          review: review.trim(),
          reviewer: user?.user_display_name || name,
          reviewer_email: user?.user_email || email,
          image_ids,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        onSuccess?.();
      } else {
        setError(data.message || (isAr ? "فشل إرسال المراجعة" : "Failed to submit review"));
        setStatus("idle");
      }
    } catch {
      setError(isAr ? "خطأ في الشبكة" : "Network error. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center" dir={isAr ? "rtl" : "ltr"}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-green-800">
            {isAr ? "شكراً على مراجعتك!" : "Thank you for your review!"}
          </h4>
          <p className="mt-1 text-sm text-green-600">
            {isAr
              ? "مراجعتك قيد المراجعة وستُنشر قريباً."
              : "Your review is pending approval and will be published shortly."}
          </p>
        </div>
      </div>
    );
  }

  const activeRating = hovered || rating;

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-5 pt-2"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Logged-in user banner */}
      {user && (
        <div className="flex items-center gap-3 rounded border border-brand-primary/10 bg-brand-primary/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
            {(user.user_display_name || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.user_display_name}</p>
            <p className="text-xs text-brand-primary">{isAr ? "مراجعة موثقة" : "Verified Customer"}</p>
          </div>
        </div>
      )}

      {/* Star Rating */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
        <label className="mb-3 block text-sm font-semibold text-gray-700">
          {isAr ? "تقييمك الكلي" : "Overall Rating"} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="group transition-transform hover:scale-110 focus:outline-none"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`h-8 w-8 transition-colors duration-150 ${
                  activeRating >= star
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200 group-hover:text-amber-200"
                }`}
              />
            </button>
          ))}
          {activeRating > 0 && (
            <span className="ms-3 text-sm font-semibold text-amber-600">{starLabels[activeRating]}</span>
          )}
        </div>
      </div>

      {/* Review Title */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          {isAr ? "عنوان المراجعة" : "Review Title"}
          <span className="ms-1.5 text-xs font-normal text-gray-400">({isAr ? "اختياري" : "optional"})</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder={isAr ? "مثال: رائحة مذهلة تدوم طويلاً" : "e.g. Amazing scent that lasts all day"}
          className="w-full rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10"
        />
      </div>

      {/* Name & Email — only if not logged in */}
      {!user && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {isAr ? "الاسم" : "Your Name"} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? "اسمك الكامل" : "Full name"}
              className="w-full rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {isAr ? "البريد الإلكتروني" : "Email Address"} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isAr ? "بريدك الإلكتروني" : "your@email.com"}
              className="w-full rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10"
              required
            />
          </div>
        </div>
      )}

      {/* Review Body */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">
            {isAr ? "مراجعتك" : "Your Review"} <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs tabular-nums ${review.length > MAX_CHARS * 0.9 ? "text-amber-500" : "text-gray-400"}`}>
            {review.length}/{MAX_CHARS}
          </span>
        </div>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value.slice(0, MAX_CHARS))}
          rows={5}
          placeholder={
            isAr
              ? "شاركنا تجربتك مع هذا المنتج — كيف كانت الرائحة؟ كم دامت؟ هل توصي به؟"
              : "Share your experience — how did it smell? How long did it last? Would you recommend it?"
          }
          className="w-full resize-none rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10"
          required
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          {isAr ? "صور المنتج" : "Product Photos"}
          <span className="ms-1.5 text-xs font-normal text-gray-400">
            ({isAr ? `حتى ${MAX_IMAGES} صور` : `up to ${MAX_IMAGES} photos`})
          </span>
        </label>

        {images.length < MAX_IMAGES && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-8 transition-all ${
              isDragging
                ? "border-brand-primary bg-brand-primary/5"
                : "border-gray-200 bg-gray-50 hover:border-brand-primary/40 hover:bg-gray-100"
            }`}
          >
            <Camera className="h-7 w-7 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {isAr ? "اسحب الصور هنا أو اضغط للاختيار" : "Drag photos here or click to browse"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">JPG, PNG, WebP · {isAr ? "حد أقصى 5 ميجا" : "Max 5MB each"}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(Array.from(e.target.files || []))}
            />
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded border border-gray-200 bg-gray-100">
                <Image src={img.preview} alt={`Preview ${i + 1}`} fill className="object-cover" sizes="80px" />
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                {img.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-500/60">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                {!img.uploading && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {img.id && !img.uploading && (
                  <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading" || images.some((img) => img.uploading)}
        className="flex w-full items-center justify-center gap-2 rounded bg-brand-primary px-6 py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-primary-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isAr ? "جاري الإرسال..." : "Submitting..."}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {isAr ? "نشر المراجعة" : "Publish Review"}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        {isAr ? "ستخضع مراجعتك للمراجعة قبل النشر" : "Your review will be moderated before publishing"}
      </p>
    </form>
  );
}
