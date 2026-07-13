"use client";

import { ChevronDown, ChevronUp, Copy, Trash2, HelpCircle } from "lucide-react";
import { Checkbox } from "@/components/common/Checkbox";
import { 
  SORT_OPTIONS, 
  SORT_ORDER_OPTIONS, 
  DISCOUNT_TYPE_OPTIONS 
} from "@/types/bundle";

import type { BundleItemProps, SortOption, SortOrder, DiscountType } from "./types";
import { translations } from "./translations";
import { TagInput } from "./TagInput";

export function BundleItem({
  item,
  index,
  locale,
  categories,
  products,
  tags,
  onUpdate,
  onDuplicate,
  onRemove,
}: BundleItemProps) {
  const isRTL = locale === "ar";
  const t = translations[isRTL ? "ar" : "en"];

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));

  const updateRule = (field: keyof typeof item.rule, value: number[]) => {
    onUpdate({
      ...item,
      rule: { ...item.rule, [field]: value },
    });
  };

  const updateDisplay = <K extends keyof typeof item.display>(
    field: K,
    value: typeof item.display[K]
  ) => {
    onUpdate({
      ...item,
      display: { ...item.display, [field]: value },
    });
  };

  const toggleExpanded = () => {
    onUpdate({ ...item, isExpanded: !item.isExpanded });
  };

  return (
    <div className="border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-2 font-medium text-gray-900"
        >
          {item.isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
          {t.bundleItem} {index + 1}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Copy className="h-4 w-4" />
            {t.duplicate}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
            {t.remove}
          </button>
        </div>
      </div>

      {item.isExpanded && (
        <div className="space-y-6 p-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{t.rule}</h4>
            
            <div className="grid gap-4 md:grid-cols-2">
              <TagInput
                label={t.categories}
                placeholder={t.pleaseSelectCategory}
                selectedIds={item.rule.categories}
                options={categoryOptions}
                onChange={(ids) => updateRule("categories", ids)}
              />
              <TagInput
                label={t.excludeCategories}
                placeholder={t.pleaseSelectCategory}
                selectedIds={item.rule.excludeCategories}
                options={categoryOptions}
                onChange={(ids) => updateRule("excludeCategories", ids)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TagInput
                label={t.tags}
                placeholder={t.pleaseSelectTag}
                selectedIds={item.rule.tags}
                options={tags}
                onChange={(ids) => updateRule("tags", ids)}
              />
              <TagInput
                label={t.excludeTags}
                placeholder={t.pleaseSelectTag}
                selectedIds={item.rule.excludeTags}
                options={tags}
                onChange={(ids) => updateRule("excludeTags", ids)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TagInput
                label={t.product}
                placeholder={t.pleaseSelectProduct}
                selectedIds={item.rule.products}
                options={productOptions}
                onChange={(ids) => updateRule("products", ids)}
              />
              <TagInput
                label={t.productVariation}
                placeholder={t.pleaseSelectProduct}
                selectedIds={item.rule.productVariations}
                options={productOptions}
                onChange={(ids) => updateRule("productVariations", ids)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TagInput
                label={t.excludeProduct}
                placeholder={t.pleaseSelectProduct}
                selectedIds={item.rule.excludeProducts}
                options={productOptions}
                onChange={(ids) => updateRule("excludeProducts", ids)}
              />
              <TagInput
                label={t.excludeProductVariation}
                placeholder={t.pleaseSelectProduct}
                selectedIds={item.rule.excludeProductVariations}
                options={productOptions}
                onChange={(ids) => updateRule("excludeProductVariations", ids)}
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{t.display}</h4>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-gray-700">{t.customItemTitle}</label>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={item.display.customTitle}
                onChange={(e) => updateDisplay("customTitle", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-medium text-gray-700">{t.sort}</label>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={item.display.sortBy}
                  onChange={(e) => updateDisplay("sortBy", e.target.value as SortOption)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isRTL ? opt.labelAr : opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 invisible">Order</label>
                <select
                  value={item.display.sortOrder}
                  onChange={(e) => updateDisplay("sortOrder", e.target.value as SortOrder)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {SORT_ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isRTL ? opt.labelAr : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`default-${item.id}`}
                  checked={item.display.isDefault}
                  onChange={(e) => updateDisplay("isDefault", e.target.checked)}
                  label={t.default}
                  className="items-center gap-2"
                />
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={item.display.defaultProductId || ""}
                onChange={(e) => updateDisplay("defaultProductId", e.target.value ? Number(e.target.value) : null)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={!item.display.isDefault}
              >
                <option value="">{t.pleaseSelectProduct}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-medium text-gray-700">{t.quantity}</label>
                  <span className="text-xs text-blue-600 cursor-pointer">{t.default}</span>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.display.quantity}
                    onChange={(e) => updateDisplay("quantity", Number(e.target.value))}
                    min={1}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t.details}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-medium text-gray-700">{t.discount}</label>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={item.display.discountType}
                  onChange={(e) => updateDisplay("discountType", e.target.value as DiscountType)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DISCOUNT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isRTL ? opt.labelAr : opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 invisible">Value</label>
                <input
                  type="number"
                  value={item.display.discountValue}
                  onChange={(e) => updateDisplay("discountValue", Number(e.target.value))}
                  min={0}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`optional-${item.id}`}
                  checked={item.display.isOptional}
                  onChange={(e) => updateDisplay("isOptional", e.target.checked)}
                  label={t.optionalItem}
                  className="items-center gap-2"
                />
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`free-${item.id}`}
                  checked={item.display.isFree}
                  onChange={(e) => updateDisplay("isFree", e.target.checked)}
                  label={t.freeItem}
                  className="items-center gap-2"
                />
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`showPrice-${item.id}`}
                  checked={item.display.showPrice}
                  onChange={(e) => updateDisplay("showPrice", e.target.checked)}
                  label={t.showPrice}
                  className="items-center gap-2"
                />
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
