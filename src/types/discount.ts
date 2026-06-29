export interface DiscountRule {
  id: string;
  name: string;
  type: "bogo" | "percentage" | "fixed" | "bulk";
  buy_quantity: number;
  get_quantity: number;
  discount_value: number;
  discount_unit: "percentage" | "fixed";
  min_quantity: number;
  min_cart_total: number;
  applies_to: "all" | "category" | "product";
  category_ids: number[];
  product_ids: number[];
  badge_text: string;
  badge_color: string;
  description: string;
  bulk_tiers: BulkTier[];
  start_date: string;
  end_date: string;
}

export interface BulkTier {
  min_qty: number;
  max_qty: number;
  discount_value: number;
  discount_unit: "percentage" | "fixed";
}
