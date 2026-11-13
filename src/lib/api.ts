export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: Record<string, string[]> = {}) {
    super(message);
  }
}

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T = any>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...(options.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = options.body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers, body });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/public")) {
    setToken(null);
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  // 402 = plan quota/feature limit; the app shell shows an upgrade prompt.
  // Trial or plan (incl. grace period) is over: the app is locked until a plan is chosen.
  if (res.status === 402 && data.subscription_required && typeof window !== "undefined") {
    // Paket & Tagihan stays usable so the store can pay; other widgets there just fail quietly.
    if (!/^\/(langganan|settings\/billing)/.test(location.pathname)) location.href = "/langganan";
  } else if (res.status === 402 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pesanin:upgrade", { detail: data.message }));
  if (!res.ok) throw new ApiError(res.status, data.message ?? "Terjadi kesalahan", data.errors);
  return data;
}

export async function download(path: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export const rupiah = (n: number | string | null | undefined) =>
  "Rp" + Number(n ?? 0).toLocaleString("id-ID");

export const fmtDate = (s: string) =>
  new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", processing: "Processing", completed: "Completed", cancelled: "Cancelled", refunded: "Refunded",
};
export const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", processing: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-200 text-slate-600", refunded: "bg-red-100 text-red-700",
};
export const SHIPPING_LABEL: Record<string, string> = {
  not_shipped: "Belum Dikirim", picked_up: "Picked Up", in_transit: "Dalam Perjalanan", delivered: "Diterima", returned: "Retur",
};
export const PAYMENT_LABEL: Record<string, string> = { bank_transfer: "Bank Transfer", cod: "COD (Bayar di Tempat)", epayment: "E-Payment", marketplace: "Shopee" };
export const CHANNEL_LABEL: Record<string, string> = { website: "Checkout Web", shopee: "Shopee", manual: "Input manual" };
export const PAY_STATUS_LABEL: Record<string, string> = { unpaid: "Unpaid", paid: "Paid" };
export const PAY_STATUS_COLOR: Record<string, string> = { unpaid: "bg-red-100 text-red-700", paid: "bg-emerald-100 text-emerald-700" };

export type Variant = { name: string; price?: number | null; stock?: number | null; image?: string | null };
export type FieldKey = "name" | "phone" | "email" | "quantity" | "notes" | "address" | "region";
export type FieldItem = { key: FieldKey; enabled: boolean; required: boolean; label?: string | null };
export type CustomField = { id: string; label: string; required: boolean };
export type Pixel = { platform: "facebook" | "tiktok" | "google_ads" | "gtm" | "snack"; id: string; name?: string; event?: string };
export type FormSettings = {
  form_type?: "single" | "multiple"; site_icon?: "default" | "custom"; site_icon_url?: string | null;
  theme?: "classic" | "new"; layout?: "sidebar_right" | "sidebar_left" | "single"; background?: string;
  watermark_logo?: boolean; watermark_copyright?: boolean; page_name?: string; header_image?: string | null;
  countdown?: { enabled?: boolean; until?: string | null };
  title?: { enabled?: boolean; text?: string }; tagline?: { enabled?: boolean; text?: string };
  components?: Record<string, { enabled?: boolean; [k: string]: any }>;
  fields?: { hide_label?: boolean; items?: FieldItem[]; custom?: CustomField[]; village?: boolean };
  exclude_locations?: { enabled?: boolean; provinces?: string[] };
  testimonials?: { enabled?: boolean; images?: string[] };
  variant_required?: boolean; variant_qty_button?: boolean; hide_unavailable_variant?: boolean;
  tracking?: { conversion?: "every" | "once"; pixels?: Pixel[] };
  payment?: Record<string, any>; shipping?: Record<string, any>;
  // legacy (v1 editor)
  email?: string; notes?: boolean; header_title?: string; header_tagline?: string; countdown_until?: string | null;
};
export type SuccessSettings = {
  action?: "page" | "whatsapp" | "whatsapp_random" | "url"; whatsapp?: string; redirect_url?: string; messages?: Record<string, string>;
  background?: string; title?: { enabled?: boolean; text?: string }; tagline?: { enabled?: boolean; text?: string };
  components?: Record<string, Record<string, { enabled?: boolean; [k: string]: any }>>; order?: Record<string, string[]>; pixels?: Pixel[];
};
export type VariantOption = { type: string; values: string[] };
export type BumpItem = { product_id: number; name: string; image?: string | null; price: number; normal_price?: number; description?: string | null; weight?: number };
export type Product = {
  id: number; name: string; slug: string; site_title?: string | null; type: "physical" | "digital";
  /** Digital product: what the buyer gets once paid. */
  digital_content?: { url?: string | null; file?: string | null; file_name?: string | null; instructions?: string | null } | null;
  category?: string | null; status: "active" | "draft"; is_preorder: boolean; preorder_days?: number | null;
  price: number; sale_price?: number | null; cost_price?: number | null;
  wholesale_prices?: { min_qty: number; price: number }[] | null; sku?: string | null;
  track_stock: boolean; stock: number; allow_oversell: boolean; min_purchase: number; weight: number;
  images?: string[] | null; autoslide: boolean; description?: string | null; features?: string[] | null;
  variants?: Variant[] | null; variant_options?: VariantOption[] | null; responsible_user_id?: number | null;
  bump?: { enabled?: boolean; items?: { product_id: number; price?: number | null; description?: string | null }[] } | null;
  payment_methods?: string[] | null; whatsapp_validator: boolean; captcha: boolean; button_text: string;
  form_settings?: FormSettings | null; success_settings?: SuccessSettings | null;
  pixels?: { facebook?: string; tiktok?: string; google_ads?: string } | null;
  orders_count?: number; paid_count?: number; bump_count?: number; sold_qty?: number | null; net_revenue?: number | null;
};
export type Region = { id: number; province: string; city: string; district: string; label: string };
export type Rate = { code: string; name: string; service: string; cost: number; etd: string; cheapest: boolean; courier?: string; cod?: boolean; provider?: string };
export type Quote = {
  unit_price: number; bump_price: number; subtotal: number; weight: number; origin: string | null;
  rates: Rate[]; shipping: Rate | null; shipping_cost: number; cod_fee: number; total: number;
  discount?: number; coupon?: { code: string | null; kind: string; method: string } | null; coupon_error?: string | null;
};
export type Order = {
  id: number; code: string; customer_name: string; phone: string; email?: string; address?: string;
  province?: string; city?: string; district?: string; variant?: string; quantity: number; unit_price: number;
  bump_selected: boolean; bump_price: number; subtotal: number; shipping_cost: number; cod_fee: number; discount: number;
  total: number; weight: number; payment_method: string | null; payment_status: string; status: string;
  courier?: string; courier_service?: string; courier_code?: string | null; external_note?: string | null; shipping_ref?: string | null; shipping_provider?: string | null; shipping_etd?: string; shipping_status: string; tracking_number?: string; auto_ship_error?: string | null; digital_token?: string | null; digital_sent_at?: string | null; digital_error?: string | null;
  notes?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; source: string;
  followup_count: number; created_at: string; paid_at?: string; shipped_at?: string; archived_at?: string | null; is_abandoned: boolean;
  product?: { id: number; name: string; type?: string } | null;
  bump_items?: { product_id: number; name: string; price: number }[] | null; custom_fields?: Record<string, string> | null; village?: string | null;
  channel: "website" | "shopee" | "manual"; marketplace_shop_id?: number | null; external_order_sn?: string | null; external_status?: string | null;
  items?: { item_id: number; model_id: number; name: string; variant?: string | null; sku?: string | null; qty: number; price: number; product_id?: number | null }[] | null;
  marketplace_fee: number; seller_shipping_fee: number; escrow_amount: number | null; payment_channel?: string | null;
  marketplace_shop?: { id: number; shop_name: string; is_demo: boolean } | null;
};
export type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number };
