/**
 * Fallback contact details. The real ones are set by the admin in Console → Pengaturan Platform (served by
 * /public/site) and read with useContact() / <WaLink>; there is deliberately no WhatsApp number here.
 */
export const SITE = {
  whatsapp: "",
  email: "halo@pesaninn.my.id",
  instagram: "",
  tiktok: "",
};

const DEFAULT_WA_TEXT = "Halo tim Pesanin, saya mau tanya tentang fitur dan paket";

/** wa.me link to Pesanin's WhatsApp, or an email link when the admin hasn't set a number yet. */
export const contactLink = (c: { whatsapp?: string | null; email?: string | null }, text = DEFAULT_WA_TEXT) =>
  c.whatsapp ? `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}` : `mailto:${c.email || SITE.email}?subject=${encodeURIComponent("Pesanin")}&body=${encodeURIComponent(text)}`;

export const SITE_NAV: [string, string][] = [
  ["Fitur", "/#fitur"],
  ["Cara Kerja", "/#cara-kerja"],
  ["Harga", "/#harga"],
  ["FAQ", "/#faq"],
  ["Tutorial", "/tutorials"],
  ["Blog", "/blog"],
  ["Affiliate", "/afiliasi"],
];

export type SidebarMenuItem = {
  key: string;
  label: string;
  description?: string;
  icon: string;
  href?: string;
  badge?: string;
  locked?: boolean;
  visible?: boolean;
  children?: { label: string; href: string; lock?: string }[];
};

/** Live site config from the admin console (contact, notice banner, registration, plan prices/quotas, sidebar visibility). */
export type SiteConfig = {
  registration_open: boolean; notice: string | null; notice_tone: "info" | "warning" | "success"; whatsapp: string | null; email: string | null;
  instagram?: string | null; tiktok?: string | null;
  plans: { id: string; name: string; monthly: number; limits: Record<string, number | null> }[];
  pricing?: { tracks: Record<string, string>; yearly_discount: number; addon_discount: number;
    catalog: Record<"marketplace" | "social", { id: string; name: string; monthly: number; yearly: number; limits: Record<string, number | null> }[]> };
  sidebar?: SidebarMenuItem[];
};

let cached: Promise<SiteConfig | null> | null = null;
export function loadSiteConfig(): Promise<SiteConfig | null> {
  cached ??= fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/public/site`, { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return cached;
}
