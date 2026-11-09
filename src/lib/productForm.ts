import type { FieldItem, FieldKey, FormSettings, Product } from "./api";

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Nama", phone: "No Handphone/WhatsApp", email: "Email", quantity: "Jumlah Pesanan",
  notes: "Catatan", address: "Alamat Lengkap", region: "Kota / Kecamatan",
};
export const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  name: "Nama Anda", phone: "No. WhatsApp Anda", email: "Email Anda", quantity: "Jumlah Pesanan",
  notes: "Catatan", address: "Alamat Lengkap Anda", region: "Masukkan Kota / Kecamatan",
};
const ORDER: FieldKey[] = ["name", "phone", "email", "quantity", "notes", "address", "region"];

/** Same rules as App\Support\ProductForm::fields on the backend. */
export function normalizeFields(p: Partial<Product>): FieldItem[] {
  const fs = p.form_settings ?? {};
  const physical = p.type !== "digital";
  const defaults: Record<FieldKey, [boolean, boolean]> = {
    name: [true, true], phone: [true, true], email: [!physical, !physical], quantity: [true, false],
    notes: [false, false], address: [physical, physical], region: [physical, physical],
  };
  if (typeof fs.email === "string") defaults.email = [fs.email !== "hidden", fs.email === "required"];
  if (typeof fs.notes === "boolean") defaults.notes = [fs.notes, false];

  const configured = fs.fields?.items ?? [];
  const keys = [...configured.map((i) => i.key).filter((k) => ORDER.includes(k)), ...ORDER.filter((k) => !configured.some((i) => i.key === k))];
  return keys.map((key) => {
    const c = configured.find((i) => i.key === key);
    const item: FieldItem = { key, enabled: c?.enabled ?? defaults[key][0], required: c?.required ?? defaults[key][1], label: c?.label ?? null };
    if (key === "name" || key === "phone") Object.assign(item, { enabled: true, required: true });
    if (physical && key === "region") Object.assign(item, { enabled: true, required: true });
    if (physical && key === "address") item.enabled = true;
    if (!physical && (key === "address" || key === "region")) item.enabled = false;
    if (!physical && key === "email") Object.assign(item, { enabled: true, required: true });
    return item;
  });
}

export const LOCKED = (p: Partial<Product>, key: FieldKey) =>
  key === "name" || key === "phone" || (p.type !== "digital" && (key === "region" || key === "address")) || (p.type === "digital" && (key === "email" || key === "address" || key === "region"));

export const COMPONENT_DEFAULTS: Record<string, boolean> = {
  images: true, video: false, description: true, sold: false, trust_seal: true, variants: true, save_buyer: false,
  bump: true, shipping: true, payment: true, coupon: false, other_text: false, summary: true, button: true,
};

export function comp(fs: FormSettings | null | undefined, key: string) {
  const c = fs?.components?.[key];
  return { enabled: c?.enabled ?? COMPONENT_DEFAULTS[key] ?? true, ...(c ?? {}) } as { enabled: boolean; [k: string]: any };
}

export function defaultFormSettings(name = ""): FormSettings {
  return {
    form_type: "single", site_icon: "default", theme: "classic", layout: "sidebar_right", background: "#ffffff",
    watermark_logo: true, watermark_copyright: true, page_name: name ? `Pemesanan ${name}` : "",
    countdown: { enabled: false, until: null }, title: { enabled: false, text: "" }, tagline: { enabled: false, text: "" },
    components: {}, fields: { hide_label: false, custom: [], village: false },
    exclude_locations: { enabled: false, provinces: [] }, testimonials: { enabled: false, images: [] },
    variant_required: true, variant_qty_button: false, tracking: { conversion: "every", pixels: [] },
  };
}

/** Header title/tagline/countdown with v1 fallbacks. */
export function header(fs: FormSettings | null | undefined) {
  return {
    title: fs?.title?.enabled ? fs.title.text : fs?.header_title,
    tagline: fs?.tagline?.enabled ? fs.tagline.text : fs?.header_tagline,
    countdown: fs?.countdown?.enabled ? fs.countdown.until : fs?.countdown_until,
  };
}

/** All combinations of variant option values, e.g. [["Merah","S"],["Merah","M"],…]. */
export function combinations(options: { type: string; values: string[] }[]): string[] {
  const valid = options.filter((o) => o.values.length);
  if (!valid.length) return [];
  return valid.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]).map((c) => c.join(" / "));
}

export const PROVINCES = [
  "ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "RIAU", "KEPULAUAN RIAU", "JAMBI", "SUMATERA SELATAN", "BANGKA BELITUNG", "BENGKULU", "LAMPUNG",
  "DKI JAKARTA", "BANTEN", "JAWA BARAT", "JAWA TENGAH", "DI YOGYAKARTA", "JAWA TIMUR", "BALI", "NUSA TENGGARA BARAT", "NUSA TENGGARA TIMUR",
  "KALIMANTAN BARAT", "KALIMANTAN TENGAH", "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA", "SULAWESI UTARA", "GORONTALO",
  "SULAWESI TENGAH", "SULAWESI BARAT", "SULAWESI SELATAN", "SULAWESI TENGGARA", "MALUKU", "MALUKU UTARA", "PAPUA", "PAPUA BARAT",
];

export const VARIANT_TYPES = ["Ukuran", "Warna", "Material", "Tipe", "Promo", "Kemasan", "Motif", "Rasa", "Daya", "Paket"];
