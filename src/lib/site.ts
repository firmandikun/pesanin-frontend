/** Public site contact details and navigation, shared by the landing page, blog, tutorial and affiliate pages. */
export const SITE = {
  // TODO: ganti dengan nomor & email resmi Pesanin.
  whatsapp: "6281234567890",
  email: "halo@pesaninn.my.id",
  instagram: "https://instagram.com/pesanin.id",
  tiktok: "https://tiktok.com/@pesanin.id",
};

export const waLink = (text = "Halo tim Pesanin, saya mau tanya tentang fitur dan paket") =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

export const SITE_NAV: [string, string][] = [
  ["Fitur", "/#fitur"],
  ["Cara Kerja", "/#cara-kerja"],
  ["Harga", "/#harga"],
  ["FAQ", "/#faq"],
  ["Tutorial", "/tutorials"],
  ["Blog", "/blog"],
  ["Affiliate", "/afiliasi"],
];

/** Live site config from the admin console (contact, notice banner, registration, plan prices/quotas). */
export type SiteConfig = {
  registration_open: boolean; notice: string | null; notice_tone: "info" | "warning" | "success"; whatsapp: string | null; email: string | null;
  plans: { id: string; name: string; monthly: number; limits: Record<string, number | null> }[];
};

let cached: Promise<SiteConfig | null> | null = null;
export function loadSiteConfig(): Promise<SiteConfig | null> {
  cached ??= fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/public/site`, { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return cached;
}
