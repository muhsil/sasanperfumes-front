"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";

interface ContactFormProps {
  locale: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export function ContactForm({ locale }: ContactFormProps) {
  const isRTL = locale === "ar";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  const namePattern = /^[a-zA-Z\u0600-\u06FF\s'-]*$/;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "name") {
      if (!namePattern.test(value)) {
        setFieldErrors((prev) => ({
          ...prev,
          name: isRTL ? "Please use letters only" : "Only alphabetic characters are allowed",
        }));
        return;
      }
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }

    if (name === "phone") {
      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const nameValid = namePattern.test(formData.name) && formData.name.trim().length > 0;
    const phoneValid = formData.phone.trim().length > 0;
    const newFieldErrors: { name?: string; phone?: string } = {};

    if (!nameValid) {
      newFieldErrors.name = isRTL ? "Please use letters only" : "Only alphabetic characters are allowed";
    }

    if (!phoneValid) {
      newFieldErrors.phone = isRTL ? "Phone number is required" : "Phone number is required";
    }

    if (!nameValid || !phoneValid) {
      setFieldErrors(newFieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
      } else {
        setError(
          data.error?.message ||
            (isRTL
              ? "Failed to send message. Please try again."
              : "Failed to send message. Please try again.")
        );
      }
    } catch {
      setError(
        isRTL
          ? "A network error occurred. Please try again."
          : "A network error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="luxury-panel py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-beige text-brand-primary shadow-[0_12px_28px_rgba(20,15,10,0.1)]">
          <svg className="h-8 w-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 font-title text-2xl text-brand-primary">
          {isRTL ? "Thank you for reaching out!" : "Thank you for reaching out!"}
        </h3>
        <p className="text-brand-muted">
          {isRTL ? "We'll get back to you as soon as possible." : "We'll get back to you as soon as possible."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="luxury-panel space-y-6 p-5 md:p-7">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={isRTL ? "Name" : "Name"}
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={fieldErrors.name}
          required
          className="bg-brand-beige/70"
        />
        <Input
          label={isRTL ? "Phone" : "Phone"}
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          error={fieldErrors.phone}
          required
          className="bg-brand-beige/70"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={isRTL ? "E-mail" : "E-mail"}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="bg-brand-beige/70"
        />
        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-primary">
            {isRTL ? "Subject" : "Subject"}
          </label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="flex h-12 w-full rounded-full border border-brand-border/80 bg-brand-beige/70 px-4 py-3 text-sm text-brand-primary placeholder:text-brand-muted focus:border-brand-primary/55 focus:outline-none focus:ring-2 focus:ring-brand-gold/15"
          >
            <option value="">{isRTL ? "Select a subject" : "Select a subject"}</option>
            <option value="General Inquiry">{isRTL ? "General Inquiry" : "General Inquiry"}</option>
            <option value="Order Inquiry">{isRTL ? "Order Inquiry" : "Order Inquiry"}</option>
            <option value="Product Inquiry">{isRTL ? "Product Inquiry" : "Product Inquiry"}</option>
            <option value="Feedback & Suggestions">
              {isRTL ? "Feedback & Suggestions" : "Feedback & Suggestions"}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-brand-primary">
          {isRTL ? "Message" : "Message"}
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="w-full rounded-lg border border-brand-border/80 bg-brand-beige/70 p-4 text-sm text-brand-primary placeholder:text-brand-muted focus:border-brand-primary/55 focus:outline-none focus:ring-2 focus:ring-brand-gold/15"
          rows={6}
          required
          placeholder={isRTL ? "Message" : "Message"}
        />
      </div>
      <div className="flex justify-center pt-4">
        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="px-14">
          {isRTL ? "send message" : "send message"}
        </Button>
      </div>
    </form>
  );
}
