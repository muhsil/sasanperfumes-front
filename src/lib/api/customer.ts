import { getCountryTimezone, getMarketPrefixFromPath } from "@/lib/utils";
import { countries } from "@/components/common/CountrySelect";

export interface CustomerAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface SavedAddress extends CustomerAddress {
  id: string;
  label: string;
  is_default: boolean;
}

export interface CustomerMetaData {
  id?: number;
  key: string;
  value: string | SavedAddress[];
}

export interface Customer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: CustomerAddress;
  shipping: CustomerAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data?: CustomerMetaData[];
}

export interface OrderLineItemMetaData {
  id: number;
  key: string;
  value: string | number | boolean | Record<string, unknown> | Array<unknown>;
  display_key?: string;
  display_value?: string;
}

export interface OrderLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: Array<{ id: number; total: string; subtotal: string }>;
  meta_data: OrderLineItemMetaData[];
  sku: string;
  price: number;
  image: {
    id: number;
    src: string;
  };
}

export interface OrderNote {
  id: number;
  author: string;
  date_created: string;
  date_created_gmt: string;
  note: string;
  customer_note: boolean;
}

export interface Order {
  id: number;
  parent_id: number;
  status: string;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: CustomerAddress;
  shipping: CustomerAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string | null;
  date_paid: string | null;
  cart_hash: string;
  number: string;
  meta_data: Array<{ id: number; key: string; value: string }>;
  line_items: OrderLineItem[];
  tax_lines: Array<{
    id: number;
    rate_code: string;
    rate_id: number;
    label: string;
    compound: boolean;
    tax_total: string;
    shipping_tax_total: string;
  }>;
  shipping_lines: Array<{
    id: number;
    method_title: string;
    method_id: string;
    instance_id: string;
    total: string;
    total_tax: string;
  }>;
  fee_lines: Array<{
    id: number;
    name: string;
    tax_class: string;
    tax_status: string;
    amount: string;
    total: string;
    total_tax: string;
  }>;
  coupon_lines: Array<{
    id: number;
    code: string;
    discount: string;
    discount_tax: string;
  }>;
  refunds: Array<{
    id: number;
    reason: string;
    total: string;
  }>;
  currency_symbol: string;
}

export interface CustomerError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

export interface CustomerOperationResponse<T> {
  success: boolean;
  data?: T;
  error?: CustomerError;
}

function getCurrentMarketCode(): string {
  if (typeof window === "undefined") return "";
  return getMarketPrefixFromPath(window.location.pathname).replace(/^\/+/, "").toLowerCase();
}

function buildMarketAwareUrl(path: string, params?: Record<string, string>): string {
  const marketCode = getCurrentMarketCode();
  const searchParams = new URLSearchParams(params || {});
  if (marketCode) {
    searchParams.set("market", marketCode);
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function getMarketAwareHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const marketCode = getCurrentMarketCode();
    const host = window.location.hostname.replace(/^www\./, "");
    if (host) {
      headers["X-Frontend-Host"] = marketCode ? `${host}/${marketCode}` : host;
    }
    if (marketCode) {
      headers["X-Market"] = marketCode;
    }
  }

  return headers;
}

export async function getCustomer(
  customerId: number
): Promise<CustomerOperationResponse<Customer>> {
  try {
    const response = await fetch(`/api/customer?customerId=${customerId}`, {
      method: "GET",
      headers: getMarketAwareHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "customer_error",
          message: "Failed to get customer.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function updateCustomer(
  customerId: number,
  customerData: Partial<Customer>
): Promise<CustomerOperationResponse<Customer>> {
  try {
    const response = await fetch(`/api/customer?customerId=${customerId}`, {
      method: "PUT",
      headers: getMarketAwareHeaders(),
      body: JSON.stringify(customerData),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "customer_update_error",
          message: "Failed to update customer.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function getCustomerOrders(
  customerId: number,
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }
): Promise<CustomerOperationResponse<Order[]>> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("customerId", customerId.toString());

    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.per_page)
      searchParams.set("per_page", params.per_page.toString());
    if (params?.status) searchParams.set("status", params.status);

    const response = await fetch(buildMarketAwareUrl("/api/orders", Object.fromEntries(searchParams.entries())), {
      method: "GET",
      headers: getMarketAwareHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "orders_error",
          message: "Failed to get orders.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function getOrder(
  orderId: number
): Promise<CustomerOperationResponse<Order>> {
  try {
    const response = await fetch(buildMarketAwareUrl("/api/orders", { orderId: orderId.toString() }), {
      method: "GET",
      headers: getMarketAwareHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "order_error",
          message: "Failed to get order.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function getOrderNotes(
  orderId: number
): Promise<CustomerOperationResponse<OrderNote[]>> {
  try {
    const response = await fetch(buildMarketAwareUrl("/api/orders/notes", { orderId: orderId.toString() }), {
      method: "GET",
      headers: getMarketAwareHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "notes_error",
          message: "Failed to get order notes.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function updateCustomerAddress(
  customerId: number,
  addressType: "billing" | "shipping",
  address: CustomerAddress
): Promise<CustomerOperationResponse<Customer>> {
  try {
    const response = await fetch(buildMarketAwareUrl("/api/customer", { customerId: customerId.toString() }), {
      method: "PUT",
      headers: getMarketAwareHeaders(),
      body: JSON.stringify({ [addressType]: address }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "address_update_error",
          message: "Failed to update address.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending Payment",
    processing: "Processing",
    "on-hold": "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    failed: "Failed",
  };

  return statusMap[status] || status;
}

export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    "on-hold": "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    refunded: "bg-purple-100 text-purple-800",
    failed: "bg-red-100 text-red-800",
  };

  return colorMap[status] || "bg-gray-100 text-gray-800";
}

export function formatPrice(
  price: string | number,
  currencySymbol: string = "SAR"
): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return `${currencySymbol} ${numPrice.toFixed(2)}`;
}

export function formatDate(dateString: string, locale: string = "en", country?: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  if (country) {
    const tz = getCountryTimezone(country);
    if (tz) options.timeZone = tz;
  }
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", options);
}

export function getOrderDate(order: Order): string {
  const originalDate = order.meta_data?.find((m) => m.key === "_original_date_created");
  if (originalDate?.value) {
    return originalDate.value;
  }
  return order.date_created;
}

const SAVED_ADDRESSES_KEY = "sasanperfumes_saved_addresses";

function isAddressPopulated(address: CustomerAddress | undefined): boolean {
  if (!address) return false;
  return !!(address.address_1 || address.city || address.first_name);
}

export function resolveCountryCode(country: string): string {
  if (!country) return "AE";
  if (country.length === 2) return country.toUpperCase();
  const found = countries.find(
    (c) =>
      c.label.toLowerCase() === country.toLowerCase() ||
      c.labelAr === country
  );
  return found?.value || "AE";
}

function customerAddressToSavedAddress(
  address: CustomerAddress,
  type: "billing" | "shipping"
): SavedAddress {
  return {
    id: `wc_${type}`,
    label: type === "billing" ? "Billing Address" : "Shipping Address",
    first_name: address.first_name || "",
    last_name: address.last_name || "",
    company: address.company || "",
    address_1: address.address_1 || "",
    address_2: address.address_2 || "",
    city: address.city || "",
    state: address.state || "",
    postcode: address.postcode || "",
    country: resolveCountryCode(address.country),
    phone: address.phone || "",
    email: address.email || "",
    is_default: type === "billing",
  };
}

export function getSavedAddressesFromCustomer(customer: Customer): SavedAddress[] {
  let addresses: SavedAddress[] = [];

  if (customer.meta_data) {
    const addressesMeta = customer.meta_data.find(
      (meta) => meta.key === SAVED_ADDRESSES_KEY
    );

    if (addressesMeta) {
      if (typeof addressesMeta.value === "string") {
        try {
          addresses = JSON.parse(addressesMeta.value) as SavedAddress[];
        } catch {
          addresses = [];
        }
      } else {
        addresses = addressesMeta.value as SavedAddress[];
      }
    }
  }

  if (addresses.length === 0) {
    if (isAddressPopulated(customer.billing)) {
      addresses.push(customerAddressToSavedAddress(customer.billing, "billing"));
    }
    if (
      isAddressPopulated(customer.shipping) &&
      customer.shipping.address_1 !== customer.billing?.address_1
    ) {
      addresses.push(customerAddressToSavedAddress(customer.shipping, "shipping"));
    }
  }

  return addresses;
}

export function getDefaultAddress(addresses: SavedAddress[]): SavedAddress | null {
  return addresses.find((addr) => addr.is_default) || addresses[0] || null;
}

export async function getSavedAddresses(
  customerId: number
): Promise<CustomerOperationResponse<SavedAddress[]>> {
  try {
    const customerResponse = await getCustomer(customerId);
    if (!customerResponse.success || !customerResponse.data) {
      return {
        success: false,
        error: customerResponse.error || {
          code: "customer_error",
          message: "Failed to get customer.",
        },
      };
    }

    const addresses = getSavedAddressesFromCustomer(customerResponse.data);
    return { success: true, data: addresses };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function saveSavedAddresses(
  customerId: number,
  addresses: SavedAddress[]
): Promise<CustomerOperationResponse<Customer>> {
  try {
    const response = await fetch(buildMarketAwareUrl("/api/customer", { customerId: customerId.toString() }), {
      method: "PUT",
      headers: getMarketAwareHeaders(),
      body: JSON.stringify({
        meta_data: [
          {
            key: SAVED_ADDRESSES_KEY,
            value: JSON.stringify(addresses),
          },
        ],
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "address_save_error",
          message: "Failed to save addresses.",
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}

export async function addSavedAddress(
  customerId: number,
  address: Omit<SavedAddress, "id">,
  existingAddresses: SavedAddress[]
): Promise<CustomerOperationResponse<Customer>> {
  const newAddress: SavedAddress = {
    ...address,
    id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };

  let updatedAddresses = [...existingAddresses];
  
  if (newAddress.is_default) {
    updatedAddresses = updatedAddresses.map((addr) => ({
      ...addr,
      is_default: false,
    }));
  }
  
  updatedAddresses.push(newAddress);

  return saveSavedAddresses(customerId, updatedAddresses);
}

export async function updateSavedAddress(
  customerId: number,
  addressId: string,
  updates: Partial<SavedAddress>,
  existingAddresses: SavedAddress[]
): Promise<CustomerOperationResponse<Customer>> {
  let updatedAddresses = existingAddresses.map((addr) => {
    if (addr.id === addressId) {
      return { ...addr, ...updates };
    }
    return addr;
  });

  if (updates.is_default) {
    updatedAddresses = updatedAddresses.map((addr) => ({
      ...addr,
      is_default: addr.id === addressId,
    }));
  }

  return saveSavedAddresses(customerId, updatedAddresses);
}

export async function deleteSavedAddress(
  customerId: number,
  addressId: string,
  existingAddresses: SavedAddress[]
): Promise<CustomerOperationResponse<Customer>> {
  const updatedAddresses = existingAddresses.filter((addr) => addr.id !== addressId);
  
  if (updatedAddresses.length > 0 && !updatedAddresses.some((addr) => addr.is_default)) {
    updatedAddresses[0].is_default = true;
  }

  return saveSavedAddresses(customerId, updatedAddresses);
}

export async function setDefaultAddress(
  customerId: number,
  addressId: string,
  existingAddresses: SavedAddress[]
): Promise<CustomerOperationResponse<Customer>> {
  const updatedAddresses = existingAddresses.map((addr) => ({
    ...addr,
    is_default: addr.id === addressId,
  }));

  return saveSavedAddresses(customerId, updatedAddresses);
}

export function generateAddressId(): string {
  return `addr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const CANCELLABLE_ORDER_STATUSES = ["pending", "processing", "on-hold"];

export function canCancelOrder(status: string): boolean {
  return CANCELLABLE_ORDER_STATUSES.includes(status);
}

export interface CancelOrderResponse {
  success: boolean;
  message?: string;
  order?: {
    id: number;
    status: string;
  };
  error?: CustomerError;
}

export async function cancelOrder(
  orderId: number,
  reason: string
): Promise<CancelOrderResponse> {
  try {
    const response = await fetch("/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        reason: reason,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          code: "cancel_error",
          message: "Failed to cancel order.",
        },
      };
    }

    return {
      success: true,
      message: result.message,
      order: result.order,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error occurred",
      },
    };
  }
}
