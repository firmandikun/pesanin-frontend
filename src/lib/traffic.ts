/** Where a web-checkout buyer came from, read from utm_source (mirrors backend App\Support\Traffic). */
export const TRAFFIC: Record<string, { label: string; short: string; utm: string[]; cls: string }> = {
  meta: { label: "Iklan Meta (FB/IG)", short: "Iklan Meta", utm: ["facebook", "fb", "instagram", "ig", "meta", "fbads", "facebook_ads"], cls: "bg-blue-50 text-blue-700" },
  tiktok: { label: "Iklan TikTok", short: "Iklan TikTok", utm: ["tiktok", "tt", "tiktok_ads"], cls: "bg-slate-900 text-white" },
  google: { label: "Google", short: "Google", utm: ["google", "gads", "adwords", "youtube"], cls: "bg-emerald-50 text-emerald-700" },
  whatsapp: { label: "WhatsApp", short: "WhatsApp", utm: ["whatsapp", "wa"], cls: "bg-green-50 text-green-700" },
  organic: { label: "Organik / langsung", short: "Organik", utm: [], cls: "bg-navy-50 text-navy-700" },
  other: { label: "Sumber lain", short: "Lainnya", utm: [], cls: "bg-slate-100 text-slate-600" },
};

export function trafficOf(utm?: string | null): string {
  const u = (utm ?? "").trim().toLowerCase();
  if (!u || u === "direct" || u === "manual") return "organic";
  return Object.entries(TRAFFIC).find(([, t]) => t.utm.includes(u))?.[0] ?? "other";
}
