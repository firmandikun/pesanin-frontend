import type { Product, SuccessSettings } from "./api";

export const SUCCESS_COMPONENTS: { key: string; label: string; edit: "text" | "url" | null }[] = [
  { key: "icon", label: "Ikon Transaksi Berhasil", edit: null },
  { key: "judul", label: "Judul Utama", edit: "text" },
  { key: "title", label: "Title", edit: "text" },
  { key: "header", label: "Header", edit: "text" },
  { key: "total", label: "Total Harga", edit: null },
  { key: "subtitle", label: "Sub Title", edit: "text" },
  { key: "chat", label: "Tombol Chat", edit: "text" },
  { key: "image", label: "Gambar", edit: "url" },
  { key: "video", label: "Video", edit: "url" },
  { key: "footer", label: "Footer", edit: "text" },
  { key: "other", label: "Teks Lainnya", edit: "text" },
];

const DEFAULT_TEXT: Record<string, Record<string, string>> = {
  cod: {
    judul: "Terimakasih sudah pesan {produk}",
    title: "Orderan kamu sedang Kami proses, silakan tunggu kedatangan kurir dalam 2-4 hari kedepan dan siapkan pembayaran",
    header: "Pembayaran COD ke Kurir", subtitle: "untuk dibayarkan ke kurir langsung.",
  },
  bank_transfer: {
    judul: "Terimakasih sudah pesan {produk}", title: "Orderan kamu sedang Kami proses, silakan transfer sejumlah",
    header: "Total Pembayaran", subtitle: "Ke salah satu bank berikut ini:",
  },
  epayment: {
    judul: "Terimakasih sudah pesan {produk}", title: "Selesaikan pembayaran sejumlah",
    header: "Total Pembayaran", subtitle: "Instruksi pembayaran akan kami kirim via WhatsApp.",
  },
};
const DEFAULT_ON = ["icon", "judul", "title", "total", "subtitle"];

/** Components a method shows by default (the reference has no Header for transfer/e-payment). */
export function successOrder(ss: SuccessSettings | null | undefined, method: string): string[] {
  const all = SUCCESS_COMPONENTS.map((c) => c.key).filter((k) => !(k === "header" && method !== "cod"));
  const saved = ss?.order?.[method]?.filter((k) => all.includes(k)) ?? [];
  return [...saved, ...all.filter((k) => !saved.includes(k))];
}

export function successComp(ss: SuccessSettings | null | undefined, method: string, key: string, product?: Partial<Product>) {
  const c = ss?.components?.[method]?.[key] ?? {};
  const legacyTitle = key === "title" ? ss?.messages?.[method] : undefined;
  const enabled = c.enabled ?? (DEFAULT_ON.includes(key) || (key === "header" && method === "cod"));
  const text = (c.text ?? legacyTitle ?? DEFAULT_TEXT[method]?.[key] ?? (key === "chat" ? "Chat Penjual via WhatsApp" : "")).replace("{produk}", product?.name ?? "");
  return { ...c, enabled, text, url: c.url as string | undefined };
}
