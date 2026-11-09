"use client";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";

type S = { code: string; total: number; payment_status: string; status: string; payment_url: string | null; access_url?: string | null };

/** Shown when the buyer returns from Midtrans (?order=CODE): waits for the payment notification. */
export function PaymentReturn({ code }: { code: string }) {
  const [s, setS] = useState<S | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let stop = false;
    const tick = async (n: number) => {
      try {
        const d = await api<S>(`/public/orders/${encodeURIComponent(code)}/payment`);
        if (stop) return;
        setS(d);
        // The notification usually lands within seconds; keep checking for ~2 minutes.
        if (d.payment_status !== "paid" && d.status !== "cancelled" && n < 40) setTimeout(() => tick(n + 1), 3000);
      } catch { if (!stop) setMissing(true); }
    };
    tick(0);
    return () => { stop = true; };
  }, [code]);

  if (missing) return <p className="py-16 text-center text-slate-500">Pesanan tidak ditemukan.</p>;
  if (!s) return <p className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 size={18} className="animate-spin" />Mengecek pembayaran…</p>;
  const paid = s.payment_status === "paid";
  const failed = !paid && s.status === "cancelled";
  const Icon = paid ? CheckCircle2 : failed ? XCircle : Clock;
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <Icon size={56} className={`mx-auto ${paid ? "text-emerald-500" : failed ? "text-rose-500" : "text-amber-500"}`} />
      <h1 className="mt-4 text-2xl font-bold text-slate-800">{paid ? "Pembayaran berhasil" : failed ? "Pembayaran gagal / kedaluwarsa" : "Menunggu pembayaran"}</h1>
      <p className="mt-2 text-slate-600">Pesanan <b>{s.code}</b> · {rupiah(s.total)}</p>
      <p className="mt-1 text-sm text-slate-500">{paid ? "Terima kasih! Penjual akan segera memproses pesananmu." : failed ? "Silakan buat pesanan baru atau hubungi penjual." : "Selesaikan pembayaran di halaman Midtrans. Halaman ini akan otomatis berubah setelah pembayaran diterima."}</p>
      {paid && s.access_url && <a href={s.access_url} className="mx-auto mt-6 flex h-11 w-fit items-center rounded-lg bg-emerald-600 px-6 font-semibold text-white">Akses produk sekarang</a>}
      {!paid && !failed && s.payment_url && <a href={s.payment_url} className="mx-auto mt-6 flex h-11 w-fit items-center rounded-lg bg-brand-600 px-6 font-semibold text-white">Lanjutkan pembayaran</a>}
    </div>
  );
}
