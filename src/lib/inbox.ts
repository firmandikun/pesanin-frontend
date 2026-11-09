// Shared types and helpers for the inbox CRM (chat threads, labels, quick replies, customers).

export type ChatLabel = { id: number; name: string; color: string };
export type TeamLite = { id: number; name: string; role: string };
export type QuickReply = { id: number; shortcut: string; category: string | null; body: string };
export type OrderLite = { id: number; code: string; total: number; status: string; payment_status: string; shipping_status: string; created_at: string };
export type Customer = {
  id: number; name: string; phone: string | null; email: string | null; labels: string[]; notes: string | null; opt_in: boolean; source: string | null; created_at: string;
  orders_count: number; spent: number; last_order_at: string | null; orders?: OrderLite[];
  chats?: { channel: string; source_id: string; id: string; name: string | null; status: string }[];
};
export type ThreadKey = { channel: string; source: string; conversation: string; name?: string };
export type Note = { id: number; author: string | null; body: string; created_at: string };

export const LABEL_COLORS = ["slate", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;
// Full class names so Tailwind keeps them.
const TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600", red: "bg-red-50 text-red-600", orange: "bg-orange-50 text-orange-600",
  amber: "bg-amber-50 text-amber-700", green: "bg-emerald-50 text-emerald-700", teal: "bg-teal-50 text-teal-700",
  blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", pink: "bg-pink-50 text-pink-600",
};
const DOTS: Record<string, string> = {
  slate: "bg-slate-400", red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500", green: "bg-emerald-500",
  teal: "bg-teal-500", blue: "bg-blue-500", violet: "bg-violet-500", pink: "bg-pink-500",
};
export const labelTone = (labels: ChatLabel[], name: string) => TONES[labels.find((l) => l.name === name)?.color ?? "slate"] ?? TONES.slate;
export const labelDot = (color: string) => DOTS[color] ?? DOTS.slate;

export const ORDER_STATUS: Record<string, string> = { pending: "Menunggu", processing: "Diproses", completed: "Selesai", cancelled: "Batal", refunded: "Refund" };

export const keyQuery = (k: ThreadKey) => new URLSearchParams({ channel: k.channel, source: k.source, conversation: k.conversation, ...(k.name ? { name: k.name } : {}) }).toString();

/** "62812…" → "0812-…" style for display. */
export const showPhone = (p: string | null) => (p ? (p.startsWith("62") ? "0" + p.slice(2) : p).replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3") : "");
