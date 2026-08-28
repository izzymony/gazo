export interface CartsItem {
  product_id: string;
  price: number;
  quantity: number;
  shipping_option_id: string;
  variant_selection?: string; // JSON string of selected variants like "Size:Large,Color:Red"
  variant_data?: { [key: string]: any }; // Additional variant data for order fulfillment
}

export interface CartsItems {
  id: string;
  product_id: string;
  business_id?: string;
  price: number;
  quantity: number;
  title: string;
  image: string;
  color?: string;
  shippingPrice: string;
  shippingEstimate: string;
  shippingName: string;
  shippingId: string;
  variant_selection?: string; // Selected variants display format
  variant_data?: { [key: string]: any }; // Calculated variant combination data
}

export interface Carts {
  sub_total: number;
  total: number; // RW1: gross (product + shipping), NOT reduced by rewards credit
  credit_applied?: number; // RW1: rewards-credit intent; server clamps + reserves the real amount
  cart: CartsItem[];
  shipping_profile_id: string;
}
