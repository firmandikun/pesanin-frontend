import Link from "next/link";
import { Logo } from "@/components/Logo";
import { rupiah } from "@/lib/api";

const ORDERS = [
  ["Rina K.", "Toner Lemon 60ml × 2", 298000, "Transfer", "Lunas"],
  ["Budi S.", "Eyelash Serum × 1", 139000, "COD", "Dikirim"],
  ["Sari W.", "Toner Lemon 60ml × 1", 161000, "QRIS", "Lunas"],
  ["Andi P.", "E-book Jualan Online", 49000, "Transfer", "Menunggu"],
] as const;

const TONE: Record<string, string> = { Lunas: "bg-emerald-400/15 text-emerald-300", Dikirim: "bg-sky-400/15 text-sky-300", Menunggu: "bg-amber-400/15 text-amber-300" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="w-max" aria-label="Pesanin"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Pesanin</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-brand-400">Untuk seller online Indonesia</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight">Semua pesanan masuk ke satu tempat. Ongkir, COD, dan follow up beres.</h2>
        </div>

        <div className="my-10 max-w-md rounded-2xl bg-white/[.04] p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Pesanan hari ini</span>
            <span className="text-navy-200">Toko Demo</span>
          </div>
          <ul className="mt-4 divide-y divide-white/[.06]">
            {ORDERS.map(([name, item, total, pay, status]) => (
              <li key={name} className="flex items-center gap-3 py-3 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{name}</span>
                  <span className="block truncate text-xs text-navy-200">{item} · {pay}</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{rupiah(total)}</span>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${TONE[status]}`}>{status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6 text-sm">
          {[["7 kurir", "ongkir otomatis"], ["COD", "biaya dihitung otomatis"], ["1 klik", "follow up WhatsApp"]].map(([a, b]) => (
            <div key={a}><dt className="text-lg font-bold">{a}</dt><dd className="text-navy-200">{b}</dd></div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
