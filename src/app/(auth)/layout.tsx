import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthShowcase } from "@/components/AuthShowcase";

/** Sign-in / sign-up: product showcase carousel on the left, the form card on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <AuthShowcase />
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" className="mb-8 lg:hidden" aria-label="Pesanin"><Logo /></Link>
        <div className="w-full max-w-[440px]">{children}</div>
        <p className="mt-8 text-xs text-slate-400">© {new Date().getFullYear()} Pesanin · <Link href="/privacy-policy" className="hover:text-slate-600">Privasi</Link> · <Link href="/terms-of-service" className="hover:text-slate-600">Syarat Layanan</Link></p>
      </main>
    </div>
  );
}
