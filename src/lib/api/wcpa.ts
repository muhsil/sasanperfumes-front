/**
 * WooCommerce Custom Product Addons (WCPA) API Client
 * 
 * API client for fetching product addon forms from the Acowebs WCPA plugin.
 * This client fetches addon data from the WooCommerce Store API extensions.
 */

import { disableRuntimeCache, siteConfig, type Locale } from "@/config/site";
import { backendHeaders, parseBackendJson } from "@/lib/utils/backendFetch";
import type { WCPAProductAddons, WCPAForm, WCPAFormValues, WCPAField } from "@/types/wcpa";

const API_BASE = `${siteConfig.apiUrl}/wp-json`;

interface FetchOptions {
  locale?: Locale;
}

/**
 * Fetch product addons from the WooCommerce Store API
 * The WCPA plugin injects addon data into the product's extensions field
 */
export async function getProductAddons(
  productId: number,
  options: FetchOptions = {}
): Promise<WCPAProductAddons | null> {
  try {
    let url = `${API_BASE}/wc/store/v1/products/${productId}`;
    
    if (options.locale) {
      url += `?lang=${options.locale}`;
    }

    const response = await fetch(url, disableRuntimeCache
      ? { cache: "no-store" }
      : {
          next: {
            revalidate: 300, // Addon forms rarely change - cache for 5 minutes
            tags: ["product-addons", `product-addons-${productId}`],
          },
          headers: backendHeaders(),
        });

    if (!response.ok) {
      console.error(`Failed to fetch product addons: ${response.status}`);
      return null;
    }

    const product = parseBackendJson<Record<string, unknown>>(await response.text());
    
    // Check if WCPA data exists in extensions
    const extensions = product.extensions as { wcpa?: WCPAProductAddons } | undefined;
    if (extensions?.wcpa) {
      return extensions.wcpa;
    }

    return null;
  } catch (error) {
    console.error("Error fetching product addons:", error);
    return null;
  }
}

/**
 * Fetch addon forms by product slug
 */
export async function getProductAddonsBySlug(
  slug: string,
  options: FetchOptions = {}
): Promise<WCPAProductAddons | null> {
  try {
    let url = `${API_BASE}/wc/store/v1/products?slug=${encodeURIComponent(slug)}`;
    
    if (options.locale) {
      url += `&lang=${options.locale}`;
    }

    const response = await fetch(url, disableRuntimeCache
      ? { cache: "no-store" }
      : {
          next: {
            revalidate: 60,
            tags: ["product-addons", `product-addons-${slug}`],
          },
          headers: backendHeaders(),
        });

    if (!response.ok) {
      console.error(`Failed to fetch product addons: ${response.status}`);
      return null;
    }

    const products = parseBackendJson<Array<Record<string, unknown>>>(await response.text());
    
    if (products.length === 0) {
      return null;
    }

    const product = products[0];
    
    // Check if WCPA data exists in extensions
    const extensions = product.extensions as { wcpa?: WCPAProductAddons } | undefined;
    if (extensions?.wcpa) {
      return extensions.wcpa;
    }

    return null;
  } catch (error) {
    console.error("Error fetching product addons:", error);
    return null;
  }
}

/**
 * Calculate the total price of selected addon options
 */
export function calculateAddonPrice(
  forms: WCPAForm[],
  values: WCPAFormValues,
  basePrice: number
): number {
  let totalAddonPrice = 0;

  for (const form of forms) {
    for (const section of form.sections) {
      for (const field of section.fields) {
        const value = values[field.id];
        if (value === undefined || value === null || value === "") continue;

        // Handle fields with direct price
        if (field.price && field.price > 0) {
          if (field.price_type === "percentage") {
            totalAddonPrice += (basePrice * field.price) / 100;
          } else {
            totalAddonPrice += field.price;
          }
        }

        // Handle fields with options (select, radio, checkbox-group, etc.)
        if ("options" in field && field.options) {
          const selectedValues = Array.isArray(value) ? value : [value];
          
          for (const selectedValue of selectedValues) {
            const option = field.options.find(
              (opt) => opt.value === selectedValue || opt.label === selectedValue
            );
            
            if (option?.price && option.price > 0) {
              if (option.price_type === "percentage") {
                totalAddonPrice += (basePrice * option.price) / 100;
              } else {
                totalAddonPrice += option.price;
              }
            }
          }
        }
      }
    }
  }

  return totalAddonPrice;
}

/**
 * Validate addon form values
 */
export function validateAddonValues(
  forms: WCPAForm[],
  values: WCPAFormValues
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const form of forms) {
    for (const section of form.sections) {
      for (const field of section.fields) {
        const value = values[field.id];

        // Check required fields
        if (field.required) {
          if (value === undefined || value === null || value === "") {
            errors[field.id] = `${field.label} is required`;
            continue;
          }

          // Check array fields (checkbox-group, etc.)
          if (Array.isArray(value) && value.length === 0) {
            errors[field.id] = `${field.label} is required`;
            continue;
          }
        }

        // Skip validation for empty non-required fields
        if (value === undefined || value === null || value === "") continue;

        // Validate based on field type
        switch (field.type) {
          case "email":
            if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors[field.id] = "Please enter a valid email address";
            }
            break;

          case "url":
            if (typeof value === "string") {
              try {
                new URL(value);
              } catch {
                errors[field.id] = "Please enter a valid URL";
              }
            }
            break;

          case "number":
            if (typeof value === "number" || typeof value === "string") {
              const numValue = Number(value);
              const numField = field as WCPAField & { min?: number; max?: number };
              if (numField.min !== undefined && numValue < numField.min) {
                errors[field.id] = `Value must be at least ${numField.min}`;
              }
              if (numField.max !== undefined && numValue > numField.max) {
                errors[field.id] = `Value must be at most ${numField.max}`;
              }
            }
            break;

          case "text":
          case "textarea":
            if (typeof value === "string") {
              const textField = field as WCPAField & { min_length?: number; max_length?: number };
              if (textField.min_length !== undefined && value.length < textField.min_length) {
                errors[field.id] = `Must be at least ${textField.min_length} characters`;
              }
              if (textField.max_length !== undefined && value.length > textField.max_length) {
                errors[field.id] = `Must be at most ${textField.max_length} characters`;
              }
            }
            break;

          case "checkbox-group":
            if (Array.isArray(value)) {
              const checkboxField = field as WCPAField & { min_selections?: number; max_selections?: number };
              if (checkboxField.min_selections !== undefined && value.length < checkboxField.min_selections) {
                errors[field.id] = `Select at least ${checkboxField.min_selections} options`;
              }
              if (checkboxField.max_selections !== undefined && value.length > checkboxField.max_selections) {
                errors[field.id] = `Select at most ${checkboxField.max_selections} options`;
              }
            }
            break;
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Format addon values for cart submission
 * This formats the values in the structure expected by WCPA when adding to cart
 */
export function formatAddonValuesForCart(
  forms: WCPAForm[],
  values: WCPAFormValues
): Record<string, unknown> {
  const formattedValues: Record<string, unknown> = {};

  for (const form of forms) {
    for (const section of form.sections) {
      for (const field of section.fields) {
        const value = values[field.id];
        if (value === undefined || value === null || value === "") continue;

        // WCPA typically uses field name or ID as the key
        const key = field.name || field.id;
        formattedValues[key] = value;
      }
    }
  }

  return {
    wcpa_data: formattedValues,
  };
}

/**
 * Check if a field should be visible based on conditional logic
 */
export function isFieldVisible(
  field: WCPAField,
  values: WCPAFormValues
): boolean {
  if (!field.conditional_logic?.enabled) {
    return true;
  }

  const { action, match, rules } = field.conditional_logic;
  
  const results = rules.map((rule) => {
    const fieldValue = values[rule.field];
    const ruleValue = rule.value;

    switch (rule.operator) {
      case "is":
        return fieldValue === ruleValue;
      case "is_not":
        return fieldValue !== ruleValue;
      case "contains":
        return String(fieldValue).includes(String(ruleValue));
      case "not_contains":
        return !String(fieldValue).includes(String(ruleValue));
      case "greater_than":
        return Number(fieldValue) > Number(ruleValue);
      case "less_than":
        return Number(fieldValue) < Number(ruleValue);
      default:
        return true;
    }
  });

  const conditionMet = match === "all" 
    ? results.every(Boolean) 
    : results.some(Boolean);

  return action === "show" ? conditionMet : !conditionMet;
}
