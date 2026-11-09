export type Limits = { orders: number | null; products: number | null; landing_pages: number | null; domains: number | null; team: number | null; research: number | null };
export type PlanInfo = { id: string; name: string; rank: number; monthly: number; yearly: number; limits: Limits; features: string[] };
export type Invoice = {
  id: number; number: string; plan: string; billing: "monthly" | "yearly"; amount: number; tax: number; total: number;
  method: string; pay_code: string | null; payment_url?: string | null; status: "unpaid" | "paid" | "expired" | "cancelled";
  period_start: string; period_end: string; due_at: string; paid_at: string | null; created_at: string;
};
export type Billing = {
  plan: string; billing: "monthly" | "yearly" | null; expires_at: string | null; auto_renew: boolean; lapsed: boolean;
  usage: Record<keyof Limits, number>; plans: PlanInfo[]; tax_percent: number; methods: string[]; invoices: Invoice[]; can_simulate: boolean;
};

export const METHOD: Record<string, { label: string; logo: string; group: "Virtual Account" | "QRIS" | "E-Wallet" }> = {
  va_bca: { label: "BCA Virtual Account", logo: "BCA", group: "Virtual Account" },
  va_bni: { label: "BNI Virtual Account", logo: "BNI", group: "Virtual Account" },
  va_bri: { label: "BRI Virtual Account", logo: "BRI", group: "Virtual Account" },
  va_mandiri: { label: "Mandiri Virtual Account", logo: "Mandiri", group: "Virtual Account" },
  qris: { label: "QRIS", logo: "QRIS", group: "QRIS" },
  dana: { label: "DANA", logo: "DANA", group: "E-Wallet" },
  ovo: { label: "OVO", logo: "OVO", group: "E-Wallet" },
  shopeepay: { label: "ShopeePay", logo: "ShopeePay", group: "E-Wallet" },
};

export const INVOICE_STATUS: Record<Invoice["status"], [string, string]> = {
  unpaid: ["Menunggu pembayaran", "bg-amber-100 text-amber-700"],
  paid: ["Lunas", "bg-emerald-100 text-emerald-700"],
  expired: ["Kedaluwarsa", "bg-slate-200 text-slate-600"],
  cancelled: ["Dibatalkan", "bg-slate-100 text-slate-500"],
};

export const LIMIT_LABEL: [keyof Limits, string][] = [
  ["orders", "Pesanan bulan ini"], ["products", "Produk"], ["landing_pages", "Landing page"], ["domains", "Custom domain"], ["team", "Anggota tim"], ["research", "Riset pasar hari ini"],
];

export const FEATURE_LABEL: Record<string, string> = { pixels: "Tracking pixel", rotators: "WhatsApp Rotator", coupons: "Kupon & order bump", affiliates: "Program afiliasi" };

export const fmtDay = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
