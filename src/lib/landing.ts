import {
  AlignLeft, CircleDollarSign, Code, Heading1, Heading2, HelpCircle, Image, Images, ListChecks, Megaphone,
  MessageCircle, Minus, MousePointerClick, MoveVertical, ShoppingCart, Star, Timer, Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Block = { id: string; type: BlockType; data: Record<string, any> };
export type BlockType =
  | "announcement" | "headline" | "subheadline" | "text" | "image" | "slider" | "video" | "button" | "whatsapp"
  | "features" | "testimonials" | "faq" | "countdown" | "pricing" | "checkout" | "divider" | "spacer" | "html";

export type LandingPage = {
  id: number; title: string; slug: string; label?: string | null; status: "draft" | "published" | "archived";
  template: string; product_id?: number | null; views: number; updated_at: string;
  theme: { primary?: string; background?: string; width?: "narrow" | "wide" };
  seo: { title?: string; description?: string; image?: string };
  settings: { floating_whatsapp?: boolean; whatsapp?: string; facebook_pixel?: string; tiktok_pixel?: string };
  blocks: Block[]; product?: { id: number; name: string; images?: string[] } | null;
};

export const BLOCKS: { type: BlockType; label: string; icon: LucideIcon; group: string; defaults: Record<string, any> }[] = [
  { type: "headline", label: "Headline", icon: Heading1, group: "Konten", defaults: { text: "Judul yang menarik perhatian", align: "center", size: "xl" } },
  { type: "subheadline", label: "Subheadline", icon: Heading2, group: "Konten", defaults: { text: "Penjelasan singkat yang mendukung judul", align: "center" } },
  { type: "text", label: "Content", icon: AlignLeft, group: "Konten", defaults: { content: "Tulis paragraf konten di sini." } },
  { type: "features", label: "Feature List", icon: ListChecks, group: "Konten", defaults: { title: "Keunggulan", items: ["Poin pertama", "Poin kedua"] } },
  { type: "announcement", label: "Banner Announcement", icon: Megaphone, group: "Konten", defaults: { text: "PROMO TERBATAS HARI INI" } },
  { type: "image", label: "Image", icon: Image, group: "Media", defaults: { url: "", alt: "" } },
  { type: "slider", label: "Image Slide", icon: Images, group: "Media", defaults: { images: [] } },
  { type: "video", label: "Video", icon: Video, group: "Media", defaults: { url: "" } },
  { type: "button", label: "Button", icon: MousePointerClick, group: "Aksi", defaults: { label: "Pesan Sekarang", url: "#order" } },
  { type: "whatsapp", label: "WhatsApp Button", icon: MessageCircle, group: "Aksi", defaults: { label: "Chat via WhatsApp", number: "", message: "Halo, saya mau tanya" } },
  { type: "checkout", label: "Formulir (Checkout)", icon: ShoppingCart, group: "Aksi", defaults: { product_id: null, title: "Pesan Sekarang" } },
  { type: "testimonials", label: "Testimonials", icon: Star, group: "Sosial", defaults: { title: "Kata mereka", items: [{ name: "Pelanggan", text: "Mantap!", rating: 5 }] } },
  { type: "faq", label: "FAQ", icon: HelpCircle, group: "Sosial", defaults: { title: "FAQ", items: [{ q: "Pertanyaan?", a: "Jawaban." }] } },
  { type: "pricing", label: "Pricing", icon: CircleDollarSign, group: "Jualan", defaults: { title: "Harga Spesial", normal: 199000, price: 99000, note: "" } },
  { type: "countdown", label: "Countdown Timer", icon: Timer, group: "Jualan", defaults: { label: "Promo berakhir dalam", until: "" } },
  { type: "divider", label: "Line", icon: Minus, group: "Layout", defaults: {} },
  { type: "spacer", label: "Space", icon: MoveVertical, group: "Layout", defaults: { size: 32 } },
  { type: "html", label: "HTML", icon: Code, group: "Layout", defaults: { code: "<p>Custom HTML</p>" } },
];

export const blockMeta = (t: BlockType) => BLOCKS.find((b) => b.type === t)!;

export const newBlock = (type: BlockType): Block => ({
  id: Math.random().toString(36).slice(2, 10),
  type,
  data: structuredClone(blockMeta(type).defaults),
});

export function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
