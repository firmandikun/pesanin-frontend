"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ShopeeMark } from "@/components/ChannelBadge";
import { api, getToken } from "@/lib/api";

/**
 * Where Shopee sends whoever authorised a shop. Public on purpose: the person logging in to Shopee is often the
 * shop owner on their own laptop, with no Pesanin session there. The connection is already saved server-side.
 * If the Pesanin account itself is signed in on this browser, go straight to Daftar Toko.
 */
export default function ShopeeConnected() {
  const router = useRouter();
  const [q, setQ] = useState<{ id?: string; shop?: string; store?: string; error?: string } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = { id: p.get("id") ?? undefined, shop: p.get("shop") ?? undefined, store: p.get("store") ?? undefined, error: p.get("error") ?? undefined };
    setQ(v);
    if (!v.error && v.id && getToken()) {
      api("/me").then(() => router.replace(`/marketplace/shops?connected=${v.id}`)).catch(() => {});
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link href="/" className="mb-8" aria-label="Pesanin"><Logo /></Link>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-center shadow-xl shadow-slate-900/5">
        {!q ? <p className="p-10 text-sm text-slate-400">Memuat…</p> : q.error ? (
          <div className="px-8 py-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle size={26} /></span>
            <h1 className="mt-5 text-xl font-extrabold text-navy">Toko belum terhubung</h1>
            <p className="mt-2 text-sm text-slate-600">{q.error}</p>
          </div>
        ) : (
          <div className="px-8 py-10">
            <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={28} /><span className="absolute -bottom-1 -right-1 rounded-md bg-white p-0.5 shadow"><ShopeeMark size={18} /></span>
            </span>
            <h1 className="mt-5 text-xl font-extrabold text-navy">Toko Shopee berhasil dihubungkan</h1>
            <p className="mt-2 text-sm text-slate-600">
              <b className="text-navy">{q.shop ?? "Toko Shopee"}</b> sekarang terhubung ke akun Pesanin{q.store ? <> <b className="text-navy">{q.store}</b></> : ""}.
              Produk, pesanan, dan biaya iklan sedang disinkronkan otomatis.
            </p>
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Tidak perlu login ke Pesanin di perangkat ini. <b className="text-navy">Halaman ini boleh ditutup.</b></p>
          </div>
        )}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-500">
          Pemilik akun Pesanin? <Link href={q?.id ? `/login?next=${encodeURIComponent(`/marketplace/shops?connected=${q.id}`)}` : "/login"} className="font-semibold text-brand-600 hover:underline">Masuk untuk melihat toko</Link>
        </div>
      </div>
    </div>
  );
}
