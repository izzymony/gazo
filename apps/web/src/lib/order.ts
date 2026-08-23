/* eslint-disable @typescript-eslint/no-explicit-any */
interface Activity {
  details: string;
  subtitle: string;
  time: string;
  title: string;
}

interface Order {
  created_at: string;
  id: string;
  invoice: string;
  items: any | null;
  payment_method: string;
  payment_receipt: string;
  payment_received: boolean;
  shipping_cost: number;
  shipping_profile_id: string;
  sub_total: number;
  total: number;
  updated_at: string;
  user_id: string;
}

interface Courier {
  email: string;
  name: string;
  phone: string;
}

interface Item {
  amount: number;
  description: string;
  name: string;
  quantity: number;
  total: number;
  weight: number;
}

interface Payment {
  currency: string;
  shipping_fee: number;
  status: string;
  type: string;
}

interface Location {
  address: string;
  email: string;
  latitude: number;
  longitude: number;
  name: string;
  phone: string;
}

interface ProviderData {
  courier: Courier;
  date: string;
  items: Item[];
  order_id: string;
  payment: Payment;
  ship_from: Location;
  ship_to: Location;
  status: string;
  tracking_url: string;
  // Self-delivery: zone/rate/ETA and the seller's dispatch contact live on the
  // self shipment's provider_data (all optional — absent on courier shipments).
  self?: boolean;
  zone?: string;
  rate?: number;
  delivery_eta?: string;
  dispatch_name?: string;
  dispatch_phone?: string;
  dispatch_note?: string;
}

interface Shipment {
  created_at: string;
  id: string;
  order: Order;
  order_id: string;
  provider: string;
  provider_data: ProviderData[] | null;
  provider_id: string;
  updated_at: string;
}

interface Discount {
  discounted: number;
  percentage: number;
  symbol: string;
}

interface Insurance {
  code: string;
  fee: number;
}

interface ShippingProviderData {
  address_code: number;
  courier_id: string;
  courier_image: string;
  courier_name: string;
  discount: Discount;
  insurance: Insurance;
  rate_card_amount: number;
  service_code: string;
  service_type: string;
}

interface ShippingOption {
  created_at: string;
  delivery_days: string;
  delivery_type: string;
  description: string;
  id: string;
  price: string;
  provider: string;
  provider_data: ShippingProviderData[] | null;
  provider_id: string;
  updated_at: string;
}

export interface OrderDatas {
  business_id: string;
  buyer_activity: Activity[] | null;
  created_at: string;
  id: string;
  order: Order & {
    shipping_profile?: {
      street: string;
      town: string;
      state: string;
      shipping_user: {
        firstname: string;
        lastname: string;
        phone: string;
        email: string;
      };
    };
    user?: {
      username?: string;
      email?: string;
      firstname?: string;
      lastname?: string;
    };
  };
  order_id: string;
  price: number;
  product_id: string;
  quantity: number;
  seller_activity: Activity[] | null;
  shipment: Shipment;
  shipment_id: string;
  shipping_option: ShippingOption;
  shipping_option_id: string;
  status: string;
  variant_selection?: string;
  updated_at: string;
}

interface Category {
  created_at: string;
  external_category_id: string;
  id: string;
  max_weight: number;
  min_weight: number;
  name: string;
  status: string;
  updated_at: string;
}

export interface ProductRatings {
  comment: string;
  created_at: string;
  id: string;
  is_blocked: boolean;
  product_id: string;
  rate: number;
  updated_at: string;
  user_id: string;
}

export interface ProductRate {
  business_id: string;
  category: Category;
  category_id: string;
  created_at: string;
  description: string;
  discount: number;
  height: number;
  id: string;
  image: string[];
  is_combination: boolean;
  length: number;
  original_price: number;
  price: number;
  product_rating: ProductRatings[];
}
