"use client";

import { ArrowRight, Mail, Menu, X } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo, Wordmark } from "@/components/Logo";
import { loadSiteConfig, SITE, SITE_NAV, waLink } from "@/lib/site";

/** Contact numbers set in Console → Pengaturan Platform, falling back to lib/site. */
function useContact() {
  const [c, setC] = useState({ whatsapp: SITE.whatsapp, email: SITE.email });
  useEffect(() => { loadSiteConfig().then((s) => s && setC({ whatsapp: s.whatsapp || SITE.whatsapp, email: s.email || SITE.email })); }, []);
  return { ...c, wa: (text?: string) => waLink(text).replace(SITE.whatsapp, c.whatsapp) };
}

/** Public site header: Fitur · Cara Kerja · Harga · FAQ · Tutorial · Blog · Affiliate. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Pesanin"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {SITE_NAV.map(([l, h]) => <Link key={h} href={h} className="transition hover:text-navy">{l}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex">Masuk</Link>
          <Link href="/register" className="hidden h-10 items-center gap-1.5 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 sm:flex">
            Coba Gratis Sekarang <ArrowRight size={15} />
          </Link>
          <button onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-xl text-navy hover:bg-slate-100 lg:hidden" aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 pb-5 pt-2 lg:hidden">
          {SITE_NAV.map(([l, h]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-navy hover:bg-slate-50">{l}</Link>)}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/login" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-navy">Masuk</Link>
            <Link href="/register" className="flex h-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">Coba Gratis</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

const FOOTER: [string, [string, string][]][] = [
  ["Produk", [["Fitur", "/#fitur"], ["Harga", "/#harga"], ["Tutorial", "/tutorials"], ["Program Afiliasi", "/afiliasi"], ["Blog", "/blog"]]],
  ["Akun", [["Masuk", "/login"], ["Daftar gratis", "/register"], ["Contoh checkout", "/c/toner-lemon"]]],
  ["Legal", [["Kebijakan Privasi", "/privacy-policy"], ["Ketentuan Layanan", "/terms-of-service"], ["Kebijakan Cookie", "/cookie-policy"], ["Kebijakan Pengiriman", "/delivery-policy"]]],
];

export function SiteFooter() {
  const c = useContact();
  return (
    <footer className="bg-navy">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-3 text-sm font-semibold text-brand-300">#PesananRapiLabaPasti</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-200">Kelola pesanan, penghasilan marketplace, iklan, dan chat pelanggan dalam satu dashboard untuk seller online Indonesia.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={c.wa()} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"><BrandIcon name="whatsapp" size={15} />WhatsApp</a>
            <a href={`mailto:${c.email}`} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"><Mail size={15} />Email</a>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"><BrandIcon name="instagram" size={15} />Instagram</a>
          </div>
        </div>
        {FOOTER.map(([h, links]) => (
          <div key={h}>
            <h4 className="text-sm font-bold text-white">{h}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
              {links.map(([l, href]) => <li key={l}><Link href={href} className="transition hover:text-white">{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 px-4 py-5 text-center text-xs leading-relaxed text-navy-200">
        © {new Date().getFullYear()} <Wordmark light className="text-xs opacity-70" />. Shopee, TikTok, WhatsApp, Meta, dan merek lain adalah milik pemiliknya masing-masing.
      </div>
    </footer>
  );
}

/** "Perlu bantuan/konsultasi?" WhatsApp bubble, bottom right. */
export function WhatsAppFloat() {
  const c = useContact();
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3">
      <a href={c.wa()} target="_blank" rel="noopener noreferrer"
        className="group hidden items-center gap-2 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur transition hover:-translate-y-0.5 sm:flex">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
        <span className="text-left"><b className="block text-xs text-navy group-hover:text-brand-600">Perlu bantuan/konsultasi?</b><span className="text-[11px] text-slate-500">Chat tim Pesanin</span></span>
      </a>
      <a href={c.wa()} target="_blank" rel="noopener noreferrer" aria-label="Hubungi kami via WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-500/30 transition hover:scale-105">
        <svg viewBox="0 0 32 32" fill="currentColor" className="h-7 w-7" aria-hidden><path d="M16 2C8.28 2 2 8.28 2 16c0 2.54.68 4.92 1.87 6.98L2 30l7.25-1.83A13.9 13.9 0 0 0 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm7.68 19.46c-.32.9-1.85 1.72-2.54 1.83-.65.1-1.49.14-2.4-.15a22.04 22.04 0 0 1-2.17-.82c-3.83-1.65-6.33-5.48-6.52-5.74-.19-.26-1.54-2.05-1.54-3.9 0-1.85.97-2.76 1.32-3.13.35-.36.77-.45 1.03-.45h.73c.24 0 .56-.09.87.66.32.77 1.09 2.65 1.18 2.84.1.2.16.42.04.67-.12.26-.19.42-.36.64-.19.22-.39.5-.56.67-.19.19-.38.39-.16.77.22.36.98 1.62 2.1 2.62 1.45 1.29 2.66 1.68 3.04 1.87.36.19.58.15.8-.09.22-.26.95-1.1 1.2-1.48.26-.36.51-.3.86-.18.36.13 2.25 1.06 2.64 1.26.38.19.64.29.74.45.1.16.1.95-.22 1.85z" /></svg>
      </a>
    </div>
  );
}

/** Header + content + footer + WhatsApp bubble for the public marketing pages. */
export function SitePage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen overflow-x-clip bg-white text-slate-700"><SiteHeader />{children}<SiteFooter /><WhatsAppFloat /></div>;
}
