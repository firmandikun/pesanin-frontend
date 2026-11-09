// Types and helpers for WhatsApp templates and broadcasts.

export type WaTemplate = {
  id: string | null; name: string; language: string; status: string | null; category: string | null; rejected_reason: string | null;
  header: string | null; body: string; footer: string | null; buttons: string[]; variables: number; supported: boolean; unsupported_reason: string | null;
};
export type BroadcastRow = {
  id: number; name: string; template_name: string; template_language: string; template_category: string | null; body: string | null;
  variables: { mode: "text" | "name"; value?: string }[] | null; audience: { source: string; label?: string | null; opt_in_only?: boolean; count?: number } | null;
  status: "scheduled" | "sending" | "done" | "cancelled"; scheduled_at: string | null; started_at: string | null; finished_at: string | null; created_by: string | null; created_at: string;
  total: number; queued: number; sent: number; delivered: number; read: number; failed: number;
};
export type BroadcastStatus = {
  connected: boolean; phone: string | null; name: string | null; waba_id: string | null; quality: string | null; tier: string | null; capacity: number | null;
  used_24h: number; plan: { name: string; limit: number | null; used: number }; customers_with_phone: number; opted_in: number; error: string | null;
};

export const TEMPLATE_STATUS: Record<string, [string, string]> = {
  APPROVED: ["Disetujui", "bg-emerald-50 text-emerald-700"], PENDING: ["Menunggu review", "bg-amber-50 text-amber-700"],
  REJECTED: ["Ditolak", "bg-rose-50 text-rose-700"], PAUSED: ["Dijeda", "bg-slate-100 text-slate-600"], DISABLED: ["Nonaktif", "bg-slate-100 text-slate-600"],
};
export const CATEGORY: Record<string, string> = { MARKETING: "Marketing", UTILITY: "Utilitas", AUTHENTICATION: "Autentikasi" };
export const BROADCAST_STATUS: Record<string, [string, string]> = {
  scheduled: ["Terjadwal", "bg-sky-50 text-sky-700"], sending: ["Mengirim", "bg-amber-50 text-amber-700"],
  done: ["Selesai", "bg-emerald-50 text-emerald-700"], cancelled: ["Dibatalkan", "bg-slate-100 text-slate-600"],
};
export const RECIPIENT_STATUS: Record<string, [string, string]> = {
  queued: ["Antre", "text-slate-500"], sent: ["Terkirim", "text-sky-700"], delivered: ["Diterima", "text-emerald-700"],
  read: ["Dibaca", "text-emerald-700"], failed: ["Gagal", "text-rose-600"], cancelled: ["Dibatalkan", "text-slate-400"],
};
export const QUALITY: Record<string, [string, string]> = { GREEN: ["Baik", "text-emerald-600"], YELLOW: ["Sedang", "text-amber-600"], RED: ["Rendah", "text-rose-600"] };
export const tierLabel = (t: string | null) => (t ? t.replace("TIER_", "").replace("UNLIMITED", "Tanpa batas") : "–");

/** Template body with {{n}} filled from the given values (missing ones stay as {{n}}). */
export const fillBody = (body: string, values: (string | undefined)[]) => body.replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1] || m);
