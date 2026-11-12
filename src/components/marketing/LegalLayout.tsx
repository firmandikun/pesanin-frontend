import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { SiteHeader } from "@/components/marketing/SiteChrome";


interface LegalLayoutProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  updatedAt?: string;
  version?: string;
  children: React.ReactNode;
}

export function LegalLayout({
  icon,
  title,
  subtitle = "PT Pesanin Solusi Digital",
  updatedAt = "10 November 2026",
  version = "Versi 1.0",
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-700">
      <SiteHeader />

      {/* HEADER SECTION */}
      <section className="border-b border-slate-100 bg-white py-14 text-center">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm ring-8 ring-brand-50/50">
            {icon}
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-600 sm:text-base">
            {subtitle}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Terakhir diperbarui: {updatedAt} · {version}
          </p>
        </div>
      </section>

      {/* CONTENT BODY */}
      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-8">
          {children}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-slate-50/60 py-8 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} <Wordmark className="text-xs inline" /> · Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <Link href="/privacy-policy" className="hover:text-navy">Privasi</Link>
            <Link href="/terms-of-service" className="hover:text-navy">Ketentuan</Link>
            <Link href="/cookie-policy" className="hover:text-navy">Cookie</Link>
            <Link href="/delivery-policy" className="hover:text-navy">Pengiriman</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
