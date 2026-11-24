/**
 * Two-track price list (GTM Playbook v2.0). The live prices & quotas come from the API (`/public/site` → pricing,
 * editable in Console → Paket & Fitur); this file holds the copy (taglines, features, comparison) and the fallback.
 */
export type Track = "marketplace" | "social";

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  orders: number | null;
  highlight?: boolean;
  features: string[];
};

export const TRACKS: Record<Track, { name: string; short: string; tagline: string; promise: string }> = {
  marketplace: {
    name: "Pesanin Marketplace", short: "Marketplace", tagline: "Untuk seller Shopee",
    promise: "Tahu laba bersih per pesanan dan per SKU otomatis dalam 30 detik. Berhenti tertipu angka omzet.",
  },
  social: {
    name: "Pesanin Social & Web", short: "Social & Web", tagline: "Untuk Meta Ads, WhatsApp, IG & COD",
    promise: "Landing page cepat, checkout COD & QRIS otomatis, pixel akurat, langsung terhubung ke laporan laba bersih setelah iklan.",
  },
};

/** Yearly billing: this % off. */
export const YEARLY_DISCOUNT = 20;
/** The other track as add-on: this % off. */
export const ADDON_DISCOUNT = 30;
/** Enterprise contract range (per month). */
export const ENTERPRISE_FROM = 1_500_000;
export const ENTERPRISE_TO = 3_500_000;

export const CATALOG: Record<Track, Plan[]> = {
  marketplace: [
    { id: "gratis", name: "Gratis", tagline: "Validasi awal", monthly: 0, orders: 100, features: ["1 toko Shopee", "Rincian 20+ potongan Shopee", "HPP & laba dasar"] },
    { id: "starter", name: "Starter", tagline: "Solo seller aktif", monthly: 79000, orders: 1500, features: ["2 toko Shopee", "HPP massal & profit per SKU", "Shopee Ads (+PPN)", "Stok master lintas toko", "Ekspor Excel / PDF"] },
    { id: "bisnis", name: "Bisnis", tagline: "UMKM bertumbuh dengan tim kecil", monthly: 169000, orders: 10000, highlight: true, features: ["5 toko Shopee", "5 anggota tim (hak akses per peran)", "Pengeluaran & arus kas", "Inbox chat Shopee", "Semua fitur Starter"] },
    { id: "pro", name: "Pro", tagline: "Seller skala menengah", monthly: 349000, orders: 30000, features: ["15 toko Shopee", "20 anggota tim", "Riset produk", "Prioritas sinkronisasi", "Semua fitur Bisnis"] },
  ],
  social: [
    { id: "gratis", name: "Gratis", tagline: "Pemula jualan WA / IG", monthly: 0, orders: 50, features: ["1 link checkout & 1 landing page", "Cek ongkir otomatis & COD", "Watermark Pesanin"] },
    { id: "starter", name: "Starter", tagline: "Pengiklan pemula & dropshipper", monthly: 99000, orders: 1000, features: ["5 landing page · 1 custom domain", "QRIS / VA & COD KiriminAja", "Pixel Meta, TikTok & Google", "WhatsApp Rotator", "2 anggota tim"] },
    { id: "bisnis", name: "Bisnis", tagline: "Pemain Meta Ads aktif & tim CS", monthly: 199000, orders: 10000, highlight: true, features: ["Landing page tanpa batas · 3 domain", "Kupon, order bump & afiliasi", "Laporan Meta Ads & laba", "5 anggota tim", "Tanpa watermark"] },
    { id: "pro", name: "Pro", tagline: "Brand DTC & tim scale ads", monthly: 399000, orders: 30000, features: ["10 custom domain", "20 anggota tim", "Broadcast WhatsApp resmi Meta", "Multi-gudang", "Semua fitur Bisnis"] },
  ],
};

export const ENTERPRISE: Record<Track, { tagline: string; features: string[] }> = {
  marketplace: { tagline: "Big seller / pengganti BigSeller", features: ["50.000 – 100.000+ pesanan/bln", "Toko & tim tanpa batas", "Akses Agentic penuh", "SLA khusus & grup support VIP"] },
  social: { tagline: "Agensi & brand volume tinggi", features: ["50.000 – 100.000+ pesanan/bln", "Domain & tim tanpa batas", "Otomasi Agentic penuh", "Infrastruktur & dukungan prioritas"] },
};

/** Feature comparison per track: Gratis, Starter, Bisnis, Pro. */
export const COMPARE: Record<Track, [string, (string | boolean)[]][]> = {
  marketplace: [
    ["Pesanan per bulan", ["100", "1.500", "10.000", "30.000"]],
    ["Toko Shopee", ["1", "2", "5", "15"]],
    ["Anggota tim", ["1", "2", "5", "20"]],
    ["Rincian 20+ potongan Shopee", [true, true, true, true]],
    ["HPP massal & profit per SKU", [false, true, true, true]],
    ["Shopee Ads (+PPN) & Penjaga Iklan", [false, true, true, true]],
    ["Stok master lintas toko", [false, true, true, true]],
    ["Pengeluaran & arus kas", [false, false, true, true]],
    ["Inbox chat Shopee", [false, false, true, true]],
    ["Riset produk", ["5/hari", "20/hari", "100/hari", "300/hari"]],
  ],
  social: [
    ["Pesanan per bulan", ["50", "1.000", "10.000", "30.000"]],
    ["Landing page", ["1", "5", "Tanpa batas", "Tanpa batas"]],
    ["Custom domain", ["–", "1", "3", "10"]],
    ["Anggota tim", ["1", "2", "5", "20"]],
    ["Ongkir otomatis & COD", [true, true, true, true]],
    ["QRIS / VA (payment gateway)", [false, true, true, true]],
    ["Pixel Meta, TikTok & Google", [false, true, true, true]],
    ["WhatsApp Rotator", [false, true, true, true]],
    ["Kupon, order bump & afiliasi", [false, false, true, true]],
    ["Tanpa watermark Pesanin", [false, false, true, true]],
    ["Broadcast WhatsApp resmi Meta", ["100", "2.000", "20.000", "100.000"]],
  ],
};

/** Per-month price when paying yearly (rounded down to Rp1.000, like the invoice). */
export const yearlyPerMonth = (monthly: number) => Math.floor((monthly * (100 - YEARLY_DISCOUNT)) / 100 / 1000) * 1000;

export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

/** @deprecated single-track list kept for old imports; use CATALOG[track]. */
export const PLANS = CATALOG.marketplace.filter((p) => p.monthly > 0);
export const YEARLY_MONTHS_PAID = 12 * (1 - YEARLY_DISCOUNT / 100);
