"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  WCPAFormValues,
} from "@/types/wcpa";
import {
  calculateAddonPrice,
  validateAddonValues,
  isFieldVisible,
} from "@/lib/api/wcpa";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { FieldRenderer } from "./FieldRenderer";
import { translations } from "./translations";
import type { ProductAddonsProps } from "./types";

export function ProductAddons({
  forms,
  locale,
  basePrice,
  onValuesChange,
  onValidationChange,
}: ProductAddonsProps) {
  const isRTL = locale === "ar";
  const t = translations[isRTL ? "ar" : "en"];
  
  const [values, setValues] = useState<WCPAFormValues>({});

  const handleValueChange = useCallback(
    (fieldId: string, value: WCPAFormValues[string]) => {
      setValues((prev) => {
        const newValues = { ...prev, [fieldId]: value };
        
        const addonPrice = calculateAddonPrice(forms, newValues, basePrice);
        onValuesChange?.(newValues, addonPrice);
        
        const { valid, errors } = validateAddonValues(forms, newValues);
        onValidationChange?.(valid, errors);
        
        return newValues;
      });
    },
    [forms, basePrice, onValuesChange, onValidationChange]
  );

  const addonPrice = useMemo(
    () => calculateAddonPrice(forms, values, basePrice),
    [forms, values, basePrice]
  );

  const { errors } = useMemo(
    () => validateAddonValues(forms, values),
    [forms, values]
  );

  if (!forms || forms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {forms.map((form) => (
        <div key={form.id} className="space-y-4">
          {form.title && (
            <h3 className="text-lg font-semibold text-gray-900">{form.title}</h3>
          )}
          
          {form.sections.map((section) => (
            <div key={section.id} className="space-y-4">
              {section.title && (
                <h4 className="text-md font-medium text-gray-800">
                  {section.title}
                </h4>
              )}
              {section.description && (
                <p className="text-sm text-gray-600">{section.description}</p>
              )}
              
              <div className="space-y-4">
                {section.fields.map((field) => {
                  if (!isFieldVisible(field, values)) {
                    return null;
                  }
                  
                  return (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={values[field.id]}
                      error={errors[field.id]}
                      onChange={(value) => handleValueChange(field.id, value)}
                      locale={locale}
                      t={t}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      
      {addonPrice > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="text-sm font-medium text-gray-700">
            {t.addPrice}:
          </span>
          <span className="text-lg font-bold text-brand-primary">
            <FormattedPrice price={addonPrice} iconSize="sm" />
          </span>
        </div>
      )}
    </div>
  );
}

export default ProductAddons;
