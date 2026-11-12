import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo, Wordmark } from "@/components/Logo";

const NAV = [
  ["Fitur", "/#fitur"],
  ["Cara Kerja", "/#cara-kerja"],
  ["Harga", "/#harga"],
  ["FAQ", "/#faq"],
] as const;

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
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" aria-label="Pesanin">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="transition hover:text-navy">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600"
            >
              Coba Gratis <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

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
