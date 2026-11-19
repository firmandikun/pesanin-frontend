"use client";

import { api, API_URL, getToken, Product, Rate } from "@/lib/api";
import { useEffect, useState } from "react";
import type { CheckoutData } from "@/components/landing/BlockRenderer";
import type { Block, LandingPage } from "@/lib/landing";

export type DropshipProductType = "physical" | "digital";
export type DropshipPaymentMethod = "bank_transfer" | "epayment";
export type PreviewShipping = { origin: string | null; rates: Rate[]; error?: string | null };

/** Dropship is shipped by the Pesanin warehouse and paid upfront: no COD. */
export const DROPSHIP_PAYMENT_OPTIONS: {
  key: DropshipPaymentMethod;
  label: string;
  group: "Reguler";
  hint: string;
}[] = [
  {
    key: "bank_transfer",
    label: "Transfer Bank",
    group: "Reguler",
    hint: "Pembayaran via transfer ke rekening bank toko Anda.",
  },
  {
    key: "epayment",
    label: "E-Payment (QRIS / VA / E-Wallet)",
    group: "Reguler",
    hint: "Pembayaran otomatis lewat Midtrans: QRIS, Virtual Account, GoPay, OVO.",
  },
];

export type DropshipVideoAsset = {
  id: string;
  title: string;
  format: "9:16 Reels/TikTok" | "1:1 Feed" | "16:9 YouTube";
  duration: string;
  thumbnail: string;
  video_url: string;
  hook: string;
  script: string;
  platforms: string[];
};

export type DropshipSlideItem = {
  id: string;
  image: string;
  label: string;
};

export type DropshipSlideAsset = {
  id: string;
  title: string;
  format: "Carousel 4:5" | "Feed 1:1" | "Story 9:16";
  slides: DropshipSlideItem[];
  copywriting: string;
  hashtags: string;
};

/** Native Pesanin Page Builder template attached to a Dropship catalog product. */
export type DropshipLpTemplate = {
  id: string;
  name: string;
  badge: string;
  template_key: string;
  conversionRate: string;
  theme: NonNullable<LandingPage["theme"]>;
  seo: NonNullable<LandingPage["seo"]>;
  settings: NonNullable<LandingPage["settings"]>;
  blocks: Block[];
};

export type DropshipVariant = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  wholesale_price: number;
};

export type DropshipProduct = {
  id: number;
  sku: string;
  product_type: DropshipProductType;
  name: string;
  category: string;
  status: "active" | "draft";
  featured?: boolean;
  description: string;
  images: string[];
  weight_gram: number;
  stock: number;
  warehouse_city: string;
  warehouse_region_id?: number | null;
  warehouse_region?: string | null;
  digital_format?: string;
  digital_access_url?: string;
  digital_license?: string;
  wholesale_price: number;
  min_price: number;
  suggested_price: number;
  compare_price: number;
  payment_methods: DropshipPaymentMethod[];
  variants: DropshipVariant[];
  videos: DropshipVideoAsset[];
  slides: DropshipSlideAsset[];
  lp_templates: DropshipLpTemplate[];
  adopters_count: number;
  sold_30d: number;
  created_at?: string;
};

export type DropshipperProfile = {
  registered: boolean;
  brand_name: string;
  whatsapp: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  channels: string[];
  joined_at?: string | null;
};

export type AdoptedDropshipProduct = {
  id: number;
  dropship_product_id: number;
  product_id?: number | null;
  landing_page_id?: number | null;
  custom_name: string;
  selling_price: number;
  compare_price: number;
  slug: string;
  selected_lp_id: string;
  payment_methods: DropshipPaymentMethod[];
  lp_page: LandingPage | null;
  status: "active" | "draft";
  created_at?: string;
};

export type AdminDropshipStats = {
  total: number;
  active: number;
  physical: number;
  digital: number;
  assets: number;
  lps: number;
  adopters: number;
};

export const DROPSHIP_PREVIEW_PRODUCT_ID = 900001;

export const DROPSHIP_CATEGORIES = [
  "Rumah Tangga",
  "Kecantikan & Skincare",
  "Kesehatan & Fitness",
  "Dekorasi & Gadget",
  "Template & Desain Digital",
  "E-Book & Kelas Online",
  "Fashion & Aksesoris",
  "Ibu & Anak",
] as const;

export const SAMPLE_PRODUCT_IMAGES = [
  "/images/dropship/blender-portable.jpg",
  "/images/dropship/serum-niacinamide.jpg",
  "/images/dropship/korset-postur.jpg",
  "/images/dropship/lampu-astronaut.jpg",
  "/images/dropship/digital-canva-bundle.jpg",
  "/images/dropship/digital-course-ads.jpg",
];

/* ── Video & thumbnail uploads (Admin) ─────────────────────────────────────── */

export const DROPSHIP_VIDEO_MAX_MB = 200;
export const isVideoFile = (url?: string) => !!url && /\.(mp4|mov|webm)(\?|$)/i.test(url);

/** Upload a promo video to Pesanin storage with progress (XHR: fetch has no upload progress). */
export function uploadDropshipVideo(file: File, onProgress: (pct: number) => void): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/admin/dropship/videos`);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) return resolve(body);
      if (xhr.status === 413) return reject(new Error(`Video terlalu besar untuk server. Maksimal ${DROPSHIP_VIDEO_MAX_MB} MB, dan batas upload di server (php/nginx) juga harus cukup.`));
      const first = body?.errors ? Object.values(body.errors).flat()[0] : null;
      reject(new Error((first as string) || body?.message || `Upload gagal (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Koneksi terputus saat upload video."));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

/** Thumbnail image through the admin image upload (max 4 MB). */
export async function uploadDropshipImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/admin/uploads`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.url) throw new Error(body?.message || "Upload gambar gagal (maks. 4 MB).");
  return body.url;
}

/** Download one slide pack as a ZIP (images + caption.txt) with the user's token. */
export async function downloadSlidesZip(productId: number, packId: string): Promise<void> {
  const res = await fetch(`${API_URL}/dropship/products/${productId}/slides/${encodeURIComponent(packId)}/zip`, {
    headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/zip, application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Gagal mengunduh slide (${res.status}).`);
  }
  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "slide.zip";
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Backend API Calls (DB-backed) ─────────────────────────────────────────── */

export function fetchAdminDropshipProducts(params?: {
  search?: string;
  product_type?: string;
  category?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.product_type) q.set("product_type", params.product_type);
  if (params?.category) q.set("category", params.category);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return api<{ products: DropshipProduct[]; stats: AdminDropshipStats }>(
    `/admin/dropship/products${qs ? `?${qs}` : ""}`,
  );
}

export function fetchAdminDropshipProduct(id: string | number) {
  return api<DropshipProduct>(`/admin/dropship/products/${id}`);
}

export function createAdminDropshipProduct(payload: Omit<DropshipProduct, "id" | "adopters_count" | "created_at">) {
  return api<DropshipProduct>("/admin/dropship/products", { method: "POST", json: payload });
}

export function updateAdminDropshipProduct(
  id: string | number,
  payload: Partial<Omit<DropshipProduct, "id" | "adopters_count" | "created_at">>,
) {
  return api<DropshipProduct>(`/admin/dropship/products/${id}`, { method: "PUT", json: payload });
}

export function duplicateAdminDropshipProduct(id: string | number) {
  return api<DropshipProduct>(`/admin/dropship/products/${id}/duplicate`, { method: "POST" });
}

export function deleteAdminDropshipProduct(id: string | number) {
  return api<void>(`/admin/dropship/products/${id}`, { method: "DELETE" });
}

export function fetchSellerDropship() {
  return api<{
    enabled: boolean;
    profile: DropshipperProfile;
    products: DropshipProduct[];
    adoptions: AdoptedDropshipProduct[];
  }>("/dropship");
}

export function fetchSellerDropshipProduct(id: string | number) {
  return api<{
    enabled: boolean;
    product: DropshipProduct;
    profile: DropshipperProfile;
    adoption: AdoptedDropshipProduct | null;
  }>(`/dropship/products/${id}`);
}

export function saveDropshipperProfileApi(payload: {
  brand_name: string;
  whatsapp: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  channels: string[];
}) {
  return api<{ profile: DropshipperProfile }>("/dropship/profile", { method: "PUT", json: payload });
}

export function saveDropshipAdoptionApi(payload: {
  dropship_product_id: number;
  custom_name: string;
  selling_price: number;
  compare_price: number;
  slug: string;
  selected_lp_id: string;
  payment_methods: DropshipPaymentMethod[];
  lp_page: LandingPage;
}) {
  return api<{ adoption: AdoptedDropshipProduct }>("/dropship/adoptions", { method: "POST", json: payload });
}

export function deleteDropshipAdoptionApi(id: number) {
  return api<void>(`/dropship/adoptions/${id}`, { method: "DELETE" });
}

/* ── Page Builder & Checkout Preview Helpers ───────────────────────────────── */

function blk(id: string, type: Block["type"], data: Record<string, any>): Block {
  return { id, type, data };
}

export function normalizePaymentMethods(methods?: string[] | null): DropshipPaymentMethod[] {
  const valid: DropshipPaymentMethod[] = ["bank_transfer", "epayment"];
  const filtered = (methods ?? []).filter((m): m is DropshipPaymentMethod => valid.includes(m as DropshipPaymentMethod));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ["bank_transfer", "epayment"];
}

/** Live ongkir from the dropship warehouse (RajaOngkir) for the checkout preview. */
export function useDropshipShipping(regionId?: number | null, weight?: number, isDigital?: boolean): PreviewShipping | null {
  const [s, setS] = useState<PreviewShipping | null>(null);
  useEffect(() => {
    if (isDigital) return setS(null);
    if (!regionId) return setS({ origin: null, rates: [], error: "Gudang belum diatur." });
    const t = setTimeout(() => api<PreviewShipping>("/shipping/preview", { method: "POST", json: { origin_region_id: regionId, weight: weight || 1000 } })
      .then(setS).catch((e) => setS({ origin: null, rates: [], error: e?.message ?? "Gagal mengambil ongkir." })), 300);
    return () => clearTimeout(t);
  }, [regionId, weight, isDigital]);
  return s;
}

export function buildStarterDropshipBlocks(templateKey: string, product: DropshipProduct): Block[] {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const isDigital = product.product_type === "digital";
  const hero = product.images[0] || SAMPLE_PRODUCT_IMAGES[isDigital ? 4 : 0];
  const name = product.name || (isDigital ? "Produk Digital Pilihan" : "Produk Dropship Pilihan");
  const price = product.suggested_price || 99000;
  const normal = product.compare_price || Math.round(price * 1.5);

  if (templateKey === "blank") return [];

  if (templateKey === "simple") {
    return [
      blk(uid(), "headline", { text: name, align: "center", size: "xl" }),
      blk(uid(), "subheadline", {
        text: isDigital
          ? "Akses cepat via WhatsApp & Email setelah pembayaran transfer / E-Payment."
          : "Kualitas terbaik, pengiriman cepat dari gudang resmi — bayar via transfer, QRIS & e-wallet.",
        align: "center",
      }),
      blk(uid(), "image", { url: hero, alt: name }),
      blk(uid(), "pricing", {
        title: "Harga Spesial Hari Ini",
        normal,
        price,
        note: "Pembayaran aman via Transfer Bank & E-Payment",
      }),
      blk(uid(), "checkout", {
        product_id: DROPSHIP_PREVIEW_PRODUCT_ID,
        title: isDigital ? "Formulir Pemesanan & Akses Instan" : "Formulir Pemesanan Cepat",
      }),
    ];
  }

  if (templateKey === "product_solution") {
    return [
      blk(uid(), "announcement", {
        text: isDigital
          ? "PROMO HARI INI — AKSES INSTAN SETELAH PEMBAYARAN"
          : "PROMO TERBATAS HARI INI — BAYAR VIA TRANSFER / QRIS",
      }),
      blk(uid(), "headline", { text: `Solusi Praktis untuk Anda: ${name}`, align: "center", size: "xl" }),
      blk(uid(), "subheadline", {
        text: product.description || "Dirancang untuk memberikan manfaat nyata dan langsung terasa sejak pemakaian pertama.",
        align: "center",
      }),
      blk(uid(), "image", { url: hero, alt: name }),
      blk(uid(), "features", {
        title: "Kenapa Banyak yang Memilih Produk Ini?",
        items: isDigital
          ? [
              "Akses file & panduan langsung dikirim otomatis ke WhatsApp & Email",
              "Praktis digunakan kapan saja dari HP maupun laptop",
              "Bayar mudah via Transfer Bank atau E-Payment (QRIS / VA / E-Wallet)",
            ]
          : [
              "Material pilihan berkualitas tinggi & awet dipakai harian",
              "Garansi 100% tukar baru jika barang rusak saat diterima",
              "Pembayaran aman via Transfer Bank & E-Payment",
            ],
      }),
      blk(uid(), "pricing", {
        title: "Penawaran Spesial Hari Ini",
        normal,
        price,
        note: "Pilih Transfer Bank atau E-Payment pada formulir di bawah",
      }),
      blk(uid(), "testimonials", {
        title: "Apa Kata Mereka?",
        items: [
          { name: "Andi Saputra", text: "Sesuai ekspektasi, proses order cepat dan sangat memuaskan!", rating: 5 },
          { name: "Rina M.", text: "Recommended banget, harganya juga sangat terjangkau.", rating: 5 },
        ],
      }),
      blk(uid(), "checkout", {
        product_id: DROPSHIP_PREVIEW_PRODUCT_ID,
        title: isDigital ? "Formulir Pemesanan & Akses Instan" : "Formulir Pemesanan Cepat",
      }),
    ];
  }

  return [
    blk(uid(), "announcement", {
      text: isDigital
        ? "PROMO HARI INI — HEMAT SPESIAL · AKSES INSTAN"
        : "PROMO HARI INI — DISKON SPESIAL · BAYAR VIA TRANSFER / QRIS",
    }),
    blk(uid(), "headline", { text: `Miliki ${name} Sekarang!`, align: "center", size: "xl" }),
    blk(uid(), "subheadline", {
      text: isDigital
        ? "Tanpa ribet, langsung pakai dari HP/Laptop. Akses instan setelah pembayaran."
        : "Produk terlaris di media sosial dengan ribuan pembeli puas. Pesan hari ini langsung kirim!",
      align: "center",
    }),
    blk(uid(), "image", { url: hero, alt: name }),
    blk(uid(), "pricing", {
      title: "Harga Promo Khusus",
      normal,
      price,
      note: "Pembayaran via Transfer Bank & E-Payment (QRIS / VA / E-Wallet)",
    }),
    blk(uid(), "button", { label: "Pesan Sekarang", url: "#order" }),
    blk(uid(), "features", {
      title: "Keunggulan Utama",
      items: isDigital
        ? [
            "Format lengkap & siap pakai tanpa keahlian teknis",
            "Kirim otomatis 24 jam via WhatsApp & Email untuk pembayaran Reguler",
            "Pembayaran Transfer / E-Payment",
          ]
        : [
            "Kualitas terjamin & dicek sebelum pengiriman",
            "Packing aman bubble wrap tebal gratis",
            "Dikirim ke seluruh Indonesia, ongkir sesuai tarif kurir",
          ],
    }),
    blk(uid(), "checkout", {
      product_id: DROPSHIP_PREVIEW_PRODUCT_ID,
      title: isDigital ? "Formulir Pemesanan & Akses Instan" : "Formulir Pemesanan Cepat",
    }),
    blk(uid(), "whatsapp", {
      label: "Konsultasi via WhatsApp",
      number: "",
      message: `Halo, saya mau pesan ${name}`,
    }),
  ];
}

export function lpTemplateToLandingPage(
  tpl: DropshipLpTemplate,
  product: DropshipProduct,
  opts?: {
    title?: string;
    slug?: string;
    whatsapp?: string;
    sellingPrice?: number;
    comparePrice?: number;
    status?: LandingPage["status"];
    productId?: number;
  },
): LandingPage {
  const pid = opts?.productId ?? DROPSHIP_PREVIEW_PRODUCT_ID;
  const rawBlocks = structuredClone(tpl.blocks ?? []).map((b) =>
    b.type === "checkout" ? { ...b, data: { ...b.data, product_id: pid } } : b,
  );
  const blocks =
    opts?.sellingPrice !== undefined
      ? syncPricingInBlocks(rawBlocks, opts.sellingPrice, opts.comparePrice ?? product.compare_price)
      : rawBlocks;

  return {
    id: pid,
    title: opts?.title ?? tpl.name,
    slug: opts?.slug ?? slugify(`${product.name || "produk"}-${tpl.name}`),
    label: tpl.badge || (product.product_type === "digital" ? "Produk Digital" : "Dropship"),
    status: opts?.status ?? "published",
    template: tpl.template_key || "product_fisik",
    product_id: pid,
    views: 0,
    updated_at: new Date().toISOString(),
    theme: { primary: "#e05510", background: "#ffffff", width: "narrow", ...(tpl.theme ?? {}) },
    seo: { ...(tpl.seo ?? {}) },
    settings: {
      floating_whatsapp: true,
      ...(tpl.settings ?? {}),
      whatsapp: opts?.whatsapp || tpl.settings?.whatsapp || "",
    },
    blocks,
    product: { id: pid, name: opts?.title ?? product.name, images: product.images },
  };
}

export function syncPricingInBlocks(blocks: Block[], sellingPrice: number, comparePrice: number): Block[] {
  return blocks.map((b) =>
    b.type === "pricing"
      ? { ...b, data: { ...b.data, price: sellingPrice, normal: comparePrice } }
      : b,
  );
}

export function getTemplateHeadline(blocks: Block[]): string {
  const hl = (blocks ?? []).find((b) => b.type === "headline");
  return (hl?.data?.text as string) || "";
}

/**
 * Builds CheckoutData + Product[] for previewing the real Pesanin CheckoutForm inside
 * BlockView / LandingPageBuilder with Transfer Bank / E-Payment (dropship has no COD) and real ongkir.
 */
export function makeDropshipCheckoutPreview(
  product: DropshipProduct,
  opts?: {
    customName?: string;
    sellingPrice?: number;
    comparePrice?: number;
    brandName?: string;
    paymentMethods?: DropshipPaymentMethod[];
    productId?: number;
    /** Real ongkir from useDropshipShipping(). */
    shipping?: PreviewShipping | null;
  },
): { checkout: CheckoutData; products: Product[] } {
  const isDigital = product.product_type === "digital";
  const pid = opts?.productId ?? DROPSHIP_PREVIEW_PRODUCT_ID;
  const price = opts?.comparePrice ?? product.compare_price;
  const salePrice = opts?.sellingPrice ?? product.suggested_price;
  const name = opts?.customName || product.name || "Produk Dropship";
  const methods = normalizePaymentMethods(opts?.paymentMethods ?? product.payment_methods);

  const syntheticProduct: Product = {
    id: pid,
    type: isDigital ? "digital" : "physical",
    name,
    slug: slugify(name),
    description: product.description,
    price: price > salePrice ? price : salePrice,
    sale_price: price > salePrice ? salePrice : null,
    status: "active",
    is_preorder: false,
    images: product.images,
    autoslide: false,
    weight: product.weight_gram,
    track_stock: false,
    stock: product.stock,
    allow_oversell: true,
    min_purchase: 1,
    whatsapp_validator: false,
    captcha: false,
    button_text: isDigital ? "Beli & Dapatkan Akses" : "Pesan Sekarang",
    variants: (product.variants ?? []).map((v) => ({
      name: v.name,
      price: salePrice,
      stock: v.stock,
    })),
    payment_methods: methods,
    form_settings: {
      theme: "new",
      payment: {
        epayment: {
          channels: ["qris", "bca_va", "bri_va", "mandiri_va", "gopay", "ovo"],
        },
      },
    },
  };

  const entry = {
    product: syntheticProduct,
    payment_methods: methods,
    store: {
      store_name: opts?.brandName || "",
      cod_fee_percent: 0,
      origin: isDigital ? null : opts?.shipping?.origin ?? null,
    },
    sold: product.sold_30d ?? null,
    preview_shipping: isDigital ? undefined : opts?.shipping ?? { origin: null, rates: [] },
  };

  // Register under both the real product id (if adopted) and the template placeholder id (900001)
  const checkout: CheckoutData = {
    [pid]: entry,
    [DROPSHIP_PREVIEW_PRODUCT_ID]: entry,
  };

  return { checkout, products: [syntheticProduct] };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
