export type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  orders: string;
  highlight?: boolean;
  cta: string;
  features: string[];
};

/** Yearly billing = pay 10 months, get 12. */
export const YEARLY_MONTHS_PAID = 10;

export const PLANS: Plan[] = [
  {
    id: "starter", name: "Starter", tagline: "Untuk seller yang mulai rutin closing", monthly: 49000, orders: "1.000 pesanan / bulan", cta: "Pilih Starter",
    features: ["20 produk aktif", "1 custom domain", "Follow up WhatsApp otomatis", "Tanpa watermark Pesanin", "Pixel Meta, TikTok & Google", "5 landing page"],
  },
  {
    id: "bisnis", name: "Bisnis", tagline: "Untuk tim CS & iklan yang mulai scale", monthly: 129000, orders: "10.000 pesanan / bulan", cta: "Pilih Bisnis", highlight: true,
    features: ["Produk tanpa batas", "3 custom domain", "WhatsApp Rotator & shift CS", "Kupon diskon & order bump", "5 anggota tim", "Landing page tanpa batas"],
  },
  {
    id: "pro", name: "Pro", tagline: "Untuk brand dengan volume tinggi", monthly: 249000, orders: "Pesanan tanpa batas", cta: "Pilih Pro",
    features: ["Semua fitur Bisnis", "10 custom domain", "Program afiliasi", "20 anggota tim", "Laporan lanjutan & ekspor", "Prioritas support via WhatsApp"],
  },
];

export const COMPARE: [string, (string | boolean)[]][] = [
  ["Pesanan per bulan", ["1.000", "10.000", "Tanpa batas"]],
  ["Produk aktif", ["20", "Tanpa batas", "Tanpa batas"]],
  ["Landing page", ["5", "Tanpa batas", "Tanpa batas"]],
  ["Custom domain", ["1", "3", "10"]],
  ["Anggota tim", ["2", "5", "20"]],
  ["Ongkir otomatis & COD", [true, true, true]],
  ["Follow up WhatsApp", [true, true, true]],
  ["Tracking pixel", [true, true, true]],
  ["WhatsApp Rotator", [false, true, true]],
  ["Kupon & order bump", [false, true, true]],
  ["Program afiliasi", [false, false, true]],
  ["Tanpa watermark Pesanin", [true, true, true]],
];

export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
