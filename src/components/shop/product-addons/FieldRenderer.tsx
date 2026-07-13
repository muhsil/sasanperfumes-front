"use client";

import Image from "next/image";
import type {
  WCPAField,
  WCPAFieldOption,
} from "@/types/wcpa";
import { Checkbox } from "@/components/common/Checkbox";
import { Radio } from "@/components/common/Radio";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import type { FieldRendererProps } from "./types";

export function FieldRenderer({ field, value, error, onChange, locale, t }: FieldRendererProps) {
  const isRTL = locale === "ar";
  
  const labelElement = (
    <label
      htmlFor={field.id}
      className="mb-1 block text-sm font-medium text-gray-700"
    >
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
      {field.price && field.price > 0 && (
        <span className="ml-2 text-xs text-brand-gold">
          (+<FormattedPrice price={field.price} iconSize="xs" />)
        </span>
      )}
    </label>
  );

  const errorElement = error && (
    <p className="mt-1 text-xs text-red-500">{error}</p>
  );

  const descriptionElement = field.description && (
    <p className="mt-1 text-xs text-gray-500">{field.description}</p>
  );

  const baseInputClasses =
    "w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-primary";

  switch (field.type) {
    case "text":
    case "email":
    case "url":
      return (
        <div>
          {labelElement}
          <input
            type={field.type}
            id={field.id}
            name={field.name}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClasses}
            dir={isRTL ? "rtl" : "ltr"}
          />
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "number":
      const numField = field as WCPAField & { min?: number; max?: number; step?: number };
      return (
        <div>
          {labelElement}
          <input
            type="number"
            id={field.id}
            name={field.name}
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={field.placeholder}
            required={field.required}
            min={numField.min}
            max={numField.max}
            step={numField.step}
            className={baseInputClasses}
          />
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "textarea":
      const textareaField = field as WCPAField & { rows?: number; max_length?: number };
      const currentLength = ((value as string) || "").length;
      const maxLength = textareaField.max_length;
      
      return (
        <div>
          {labelElement}
          <textarea
            id={field.id}
            name={field.name}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={textareaField.rows || 4}
            maxLength={maxLength}
            className={baseInputClasses}
            dir={isRTL ? "rtl" : "ltr"}
          />
          {maxLength && (
            <p className="mt-1 text-xs text-gray-400">
              {maxLength - currentLength} {t.charactersRemaining}
            </p>
          )}
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "select":
      const selectField = field as WCPAField & { options: WCPAFieldOption[] };
      return (
        <div>
          {labelElement}
          <select
            id={field.id}
            name={field.name}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClasses}
          >
            <option value="">{t.selectOption}</option>
            {selectField.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.price && option.price > 0 && ` (+${option.price})`}
              </option>
            ))}
          </select>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "checkbox":
      return (
        <div>
          <Checkbox
            id={field.id}
            name={field.name}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            label={
              <>
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
                {field.price && field.price > 0 && (
                  <span className="ml-2 text-xs text-brand-gold">
                    (+<FormattedPrice price={field.price} iconSize="xs" />)
                  </span>
                )}
              </>
            }
          />
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "checkbox-group":
      const checkboxGroupField = field as WCPAField & { options: WCPAFieldOption[] };
      const selectedValues = (value as string[]) || [];
      
      return (
        <div>
          {labelElement}
          <div className="space-y-2 mt-2">
            {checkboxGroupField.options?.map((option) => (
              <Checkbox
                key={option.value}
                id={`${field.id}-${option.value}`}
                name={field.name || field.id}
                checked={selectedValues.includes(option.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedValues, option.value]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== option.value));
                  }
                }}
                label={
                  <>
                    {option.label}
                    {option.price && option.price > 0 && (
                      <span className="ml-2 text-xs text-brand-gold">
                        (+<FormattedPrice price={option.price} iconSize="xs" />)
                      </span>
                    )}
                  </>
                }
              />
            ))}
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "radio-group":
      const radioGroupField = field as WCPAField & { options: WCPAFieldOption[] };
      
      return (
        <div>
          {labelElement}
          <div className="space-y-2 mt-2">
            {radioGroupField.options?.map((option) => (
              <Radio
                key={option.value}
                id={`${field.id}-${option.value}`}
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                label={
                  <>
                    {option.label}
                    {option.price && option.price > 0 && (
                      <span className="ml-2 text-xs text-brand-gold">
                        (+<FormattedPrice price={option.price} iconSize="xs" />)
                      </span>
                    )}
                  </>
                }
                className="items-center"
              />
            ))}
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "image-group":
      const imageGroupField = field as WCPAField & { options: WCPAFieldOption[]; multiple?: boolean };
      const selectedImageValues = imageGroupField.multiple
        ? ((value as string[]) || [])
        : [value as string].filter(Boolean);
      
      return (
        <div>
          {labelElement}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
            {imageGroupField.options?.map((option) => {
              const isSelected = selectedImageValues.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (imageGroupField.multiple) {
                      if (isSelected) {
                        onChange(selectedImageValues.filter((v) => v !== option.value));
                      } else {
                        onChange([...selectedImageValues, option.value]);
                      }
                    } else {
                      onChange(isSelected ? "" : option.value);
                    }
                  }}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                    isSelected
                      ? "border-brand-gold ring-2 ring-brand-primary/50"
                      : "border-gray-200 hover:border-brand-primary"
                  }`}
                >
                  {option.image && (
                    <Image
                      src={option.image}
                      alt={option.label}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                    <p className="text-xs text-white truncate">{option.label}</p>
                    {option.price && option.price > 0 && (
                      <p className="text-xs text-brand-primary">+{option.price}</p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-brand-gold flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "color-group":
      const colorGroupField = field as WCPAField & { options: WCPAFieldOption[]; multiple?: boolean };
      const selectedColorValues = colorGroupField.multiple
        ? ((value as string[]) || [])
        : [value as string].filter(Boolean);
      
      return (
        <div>
          {labelElement}
          <div className="flex flex-wrap gap-3 mt-2">
            {colorGroupField.options?.map((option) => {
              const isSelected = selectedColorValues.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (colorGroupField.multiple) {
                      if (isSelected) {
                        onChange(selectedColorValues.filter((v) => v !== option.value));
                      } else {
                        onChange([...selectedColorValues, option.value]);
                      }
                    } else {
                      onChange(isSelected ? "" : option.value);
                    }
                  }}
                  className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-brand-gold ring-2 ring-brand-primary/50 scale-110"
                      : "border-gray-200 hover:border-brand-primary"
                  }`}
                  style={{ backgroundColor: option.color || option.value }}
                  title={option.label}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-white drop-shadow-md"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "product-group":
      const productGroupField = field as WCPAField & { 
        options: WCPAFieldOption[]; 
        multiple?: boolean;
        show_price?: boolean;
        show_image?: boolean;
      };
      const selectedProductValues = productGroupField.multiple
        ? ((value as string[]) || [])
        : [value as string].filter(Boolean);
      
      return (
        <div>
          {labelElement}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {productGroupField.options?.map((option) => {
              const isSelected = selectedProductValues.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (productGroupField.multiple) {
                      if (isSelected) {
                        onChange(selectedProductValues.filter((v) => v !== option.value));
                      } else {
                        onChange([...selectedProductValues, option.value]);
                      }
                    } else {
                      onChange(isSelected ? "" : option.value);
                    }
                  }}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected
                      ? "border-brand-gold bg-brand-beige"
                      : "border-gray-200 hover:border-brand-primary"
                  }`}
                >
                  {productGroupField.show_image !== false && option.image && (
                    <div className="relative aspect-square mb-2 rounded overflow-hidden bg-gray-100">
                      <Image
                        src={option.image}
                        alt={option.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {option.label}
                  </p>
                  {productGroupField.show_price !== false && option.price !== undefined && (
                    <p className="text-xs text-brand-gold mt-1">
                      +<FormattedPrice price={option.price} iconSize="xs" />
                    </p>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-brand-gold flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "date":
      return (
        <div>
          {labelElement}
          <input
            type="date"
            id={field.id}
            name={field.name}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClasses}
          />
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "time":
      return (
        <div>
          {labelElement}
          <input
            type="time"
            id={field.id}
            name={field.name}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClasses}
          />
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "datetime":
      return (
        <div>
          {labelElement}
          <input
            type="datetime-local"
            id={field.id}
            name={field.name}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClasses}
          />
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "color-picker":
      return (
        <div>
          {labelElement}
          <div className="flex items-center gap-3">
            <input
              type="color"
              id={field.id}
              name={field.name}
              value={(value as string) || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className={`${baseInputClasses} flex-1`}
            />
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "file":
      return (
        <div>
          {labelElement}
          <div className="mt-1">
            <label
              htmlFor={field.id}
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-4 transition-colors hover:border-brand-gold"
            >
              <div className="text-center">
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">{t.uploadFile}</p>
                <p className="mt-1 text-xs text-gray-400">{t.chooseFile}</p>
              </div>
              <input
                type="file"
                id={field.id}
                name={field.name}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    onChange(files[0]);
                  }
                }}
                className="sr-only"
              />
            </label>
            {value && value instanceof File && (
              <p className="mt-2 text-sm text-gray-600">{value.name}</p>
            )}
          </div>
          {descriptionElement}
          {errorElement}
        </div>
      );

    case "content":
      const contentField = field as WCPAField & { content: string };
      return (
        <div
          className="prose prose-sm max-w-none text-gray-600"
          dangerouslySetInnerHTML={{ __html: contentField.content }}
        />
      );

    case "header":
      const headerField = field as WCPAField & { heading_level?: string };
      const headingLevel = headerField.heading_level || "h3";
      const headingClassName = "text-lg font-semibold text-gray-900";
      if (headingLevel === "h1") return <h1 className={headingClassName}>{field.label}</h1>;
      if (headingLevel === "h2") return <h2 className={headingClassName}>{field.label}</h2>;
      if (headingLevel === "h4") return <h4 className={headingClassName}>{field.label}</h4>;
      if (headingLevel === "h5") return <h5 className={headingClassName}>{field.label}</h5>;
      if (headingLevel === "h6") return <h6 className={headingClassName}>{field.label}</h6>;
      return <h3 className={headingClassName}>{field.label}</h3>;

    case "separator":
      return <hr className="border-gray-200" />;

    case "hidden":
      return (
        <input
          type="hidden"
          id={field.id}
          name={field.name}
          value={(value as string) || (field.default_value as string) || ""}
        />
      );

    default:
      return null;
  }
}
