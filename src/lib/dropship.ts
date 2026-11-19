"use client";

import { api, Product } from "@/lib/api";
import type { CheckoutData } from "@/components/landing/BlockRenderer";
import type { Block, LandingPage } from "@/lib/landing";

export type DropshipProductType = "physical" | "digital";
export type DropshipPaymentMethod = "cod" | "bank_transfer" | "epayment";

export const DROPSHIP_PAYMENT_OPTIONS: {
  key: DropshipPaymentMethod;
  label: string;
  group: "COD" | "Reguler";
  hint: string;
}[] = [
  {
    key: "cod",
    label: "COD (Bayar di Tempat)",
    group: "COD",
    hint: "Pembeli bayar tunai saat paket diterima di alamat.",
  },
  {
    key: "bank_transfer",
    label: "Reguler — Transfer Bank",
    group: "Reguler",
    hint: "Pembayaran reguler via transfer rekening bank toko Anda.",
  },
  {
    key: "epayment",
    label: "Reguler — E-Payment (QRIS / VA / E-Wallet)",
    group: "Reguler",
    hint: "Pembayaran reguler otomatis via QRIS, Virtual Account, GoPay, OVO.",
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
  const valid: DropshipPaymentMethod[] = ["cod", "bank_transfer", "epayment"];
  const filtered = (methods ?? []).filter((m): m is DropshipPaymentMethod => valid.includes(m as DropshipPaymentMethod));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ["cod", "bank_transfer", "epayment"];
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
          ? "Akses cepat via WhatsApp & Email. Tersedia metode pembayaran Reguler maupun COD."
          : "Kualitas terbaik, pengiriman cepat dari gudang resmi — tersedia COD & Reguler.",
        align: "center",
      }),
      blk(uid(), "image", { url: hero, alt: name }),
      blk(uid(), "pricing", {
        title: "Harga Spesial Hari Ini",
        normal,
        price,
        note: "Tersedia pilihan pembayaran COD & Reguler",
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
          ? "PROMO HARI INI — BISA PILIH REGULER (AKSES INSTAN) ATAU COD"
          : "PROMO TERBATAS HARI INI — BISA COD ATAU PENGIRIMAN REGULER",
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
              "Bebas pilih metode pembayaran Reguler (Transfer/E-Payment) maupun COD",
            ]
          : [
              "Material pilihan berkualitas tinggi & awet dipakai harian",
              "Garansi 100% tukar baru jika barang rusak saat diterima",
              "Tersedia metode COD (Bayar di Tempat) & Reguler (Transfer / E-Payment)",
            ],
      }),
      blk(uid(), "pricing", {
        title: "Penawaran Spesial Hari Ini",
        normal,
        price,
        note: "Pilih metode COD atau Reguler pada formulir di bawah",
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
        ? "PROMO HARI INI — HEMAT SPESIAL · PILIH REGULER ATAU COD"
        : "PROMO HARI INI — DISKON SPESIAL · BISA COD ATAU REGULER",
    }),
    blk(uid(), "headline", { text: `Miliki ${name} Sekarang!`, align: "center", size: "xl" }),
    blk(uid(), "subheadline", {
      text: isDigital
        ? "Tanpa ribet, langsung pakai dari HP/Laptop. Bebas pilih metode Reguler (akses instan) atau COD."
        : "Produk terlaris di media sosial dengan ribuan pembeli puas. Pesan hari ini langsung kirim!",
      align: "center",
    }),
    blk(uid(), "image", { url: hero, alt: name }),
    blk(uid(), "pricing", {
      title: "Harga Promo Khusus",
      normal,
      price,
      note: "Tersedia COD (Bayar di Tempat) & Reguler (Transfer / E-Payment)",
    }),
    blk(uid(), "button", { label: "Pesan Sekarang — Pilih COD / Reguler", url: "#order" }),
    blk(uid(), "features", {
      title: "Keunggulan Utama",
      items: isDigital
        ? [
            "Format lengkap & siap pakai tanpa keahlian teknis",
            "Kirim otomatis 24 jam via WhatsApp & Email untuk pembayaran Reguler",
            "Tersedia opsi COD maupun Transfer/E-Payment",
          ]
        : [
            "Kualitas terjamin & dicek sebelum pengiriman",
            "Packing aman bubble wrap tebal gratis",
            "Bisa COD (Bayar di Tempat) atau Reguler seluruh Indonesia",
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
 * BlockView / LandingPageBuilder with BOTH COD and Reguler (Transfer Bank / E-Payment) options.
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
    weight: product.weight_gram || 250,
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
      store_name: opts?.brandName || "Toko Media Sosial Anda",
      cod_fee_percent: 3,
      origin: isDigital ? null : product.warehouse_city || "Jakarta Barat",
    },
    sold: product.sold_30d || 120,
    preview_shipping: isDigital
      ? undefined
      : {
          origin: product.warehouse_city || "Jakarta Barat",
          rates: [
            { code: "jne_reg", courier: "jne", name: "JNE", service: "REG (Reguler)", cost: 14000, etd: "2-3 hari", cheapest: true, cod: true },
            { code: "jnt_ez", courier: "jnt", name: "J&T", service: "EZ (Reguler)", cost: 16000, etd: "2-3 hari", cheapest: false, cod: true },
            { code: "sicepat_reg", courier: "sicepat", name: "SiCepat", service: "REG (Reguler)", cost: 15000, etd: "1-2 hari", cheapest: false, cod: true },
          ],
        },
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
