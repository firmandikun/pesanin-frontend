"use client";
import { ArrowRight, Check, Clock, Database, Hourglass, LogOut, MessageCircle, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { Logo } from "@/components/Logo";
import type { Billing, PlanInfo } from "@/components/billing/types";
import { api, ApiError, rupiah } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { waLink } from "@/lib/site";

const num = (v: number | null, unit: string) => (v === null ? `${unit} tanpa batas` : `${v.toLocaleString("id-ID")} ${unit}`);
const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "");

/** Plan picker shown when the trial or a paid plan has ended (the app is locked), and reachable any time from the trial banner. */
function Picker() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const member = user!.member ?? null;
  const sub = user!.subscription;
  const [d, setD] = useState<Billing | null>(null);
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!member) api<Billing>("/billing").then(setD).catch(() => {}); }, [member]);

  const locked = sub?.status === "expired";
  const unpaid = d?.invoices.find((i) => i.status === "unpaid");
  const paid = (d?.plans ?? []).filter((p) => p.monthly > 0);
  const free = d?.plans.find((p) => p.id === "gratis");
  const pick = (p: PlanInfo) => router.push(`/settings/billing?buy=${p.id}&period=${period}`);

  const stayFree = async () => {
    if (!(await askConfirm("Toko kamu pindah ke paket Gratis dengan batas 100 pesanan per bulan, 3 produk, dan 1 toko marketplace. Data lama tetap aman, dan kamu bisa upgrade kapan saja.", { title: "Lanjut dengan paket Gratis?", confirmLabel: "Pakai Gratis", danger: false }))) return;
    setBusy(true); setError("");
    try {
      const u = await api("/billing/free", { method: "POST" });
      setUser({ ...user!, ...u });
      router.replace("/dashboard");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Gagal memproses, coba lagi."); setBusy(false); }
  };

  const title = locked
    ? sub?.reason === "trial" ? "Masa trial 7 hari kamu sudah berakhir" : "Masa aktif paket kamu sudah berakhir"
    : sub?.status === "trial" ? `Masa trial tersisa ${sub.days_left} hari` : sub?.status === "grace" ? `Masa tenggang tersisa ${sub.days_left} hari` : "Pilih paket Pesanin";
  const lead = locked
    ? "Pilih paket untuk membuka lagi dashboard, sinkron pesanan marketplace, dan laporan laba kamu."
    : sub?.status === "trial" ? `Trial paket Bisnis berakhir ${fmt(sub.ends_at)}. Pilih paket sekarang agar toko tetap berjalan tanpa jeda.`
    : sub?.status === "grace" ? `Paket berakhir ${fmt(sub.ends_at)}. Setelah ${fmt(sub.grace_ends_at)} akses dashboard dikunci sampai paket diperpanjang.`
    : "Upgrade kapan saja, sisa masa paket lama tetap dihitung.";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={locked ? "/langganan" : "/dashboard"} aria-label="Pesanin"><Logo /></Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-right sm:block"><b className="block leading-tight text-navy">{user!.store_name}</b><span className="text-xs text-slate-500">{member ? member.name : user!.email}</span></span>
            {!locked && <Link href="/dashboard" className="font-semibold text-slate-600 hover:text-navy">Kembali ke dashboard</Link>}
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100"><LogOut size={16} />Keluar</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${locked ? "bg-rose-50 text-rose-700" : "bg-brand-50 text-brand-700"}`}>
            {locked ? <><Hourglass size={13} />Akses dashboard dikunci sementara</> : <><Clock size={13} />Paket {d?.plans.find((p) => p.id === sub?.plan)?.name ?? ""}{sub?.status === "trial" ? " · Trial" : ""}</>}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{title}</h1>
          <p className="mt-3 text-slate-600">{lead}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><Database size={15} />Semua data pesanan, produk, dan laporanmu tetap tersimpan aman.</p>
        </div>

        {member ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Users size={22} /></span>
            <h2 className="mt-4 font-bold text-navy">Hubungi pemilik toko</h2>
            <p className="mt-2 text-sm text-slate-600">Hanya pemilik toko {user!.store_name} yang bisa memilih dan membayar paket. Setelah paket aktif, kamu bisa masuk lagi seperti biasa.</p>
          </div>
        ) : (
          <>
            {unpaid && (
              <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <Clock size={18} className="text-amber-600" />
                <span className="flex-1 text-amber-900">Ada tagihan paket <b>{d?.plans.find((p) => p.id === unpaid.plan)?.name}</b> sebesar <b>{rupiah(unpaid.total)}</b> yang menunggu pembayaran.</span>
                <Link href="/settings/billing" className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">Bayar tagihan</Link>
              </div>
            )}

            <div className="mt-10 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm font-semibold">
                {(["monthly", "yearly"] as const).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)} className={`flex items-center gap-2 rounded-full px-5 py-2 transition ${period === p ? "bg-navy text-white" : "text-slate-600 hover:text-navy"}`}>
                    {p === "monthly" ? "Bulanan" : "Tahunan"}{p === "yearly" && <span className={`rounded-full px-2 py-0.5 text-[11px] ${period === p ? "bg-brand-500 text-white" : "bg-emerald-50 text-emerald-700"}`}>Hemat 17%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {!d && [0, 1, 2].map((n) => <div key={n} className="h-[420px] animate-pulse rounded-2xl bg-white" />)}
              {paid.map((p) => {
                const popular = p.id === "bisnis";
                const perMonth = period === "yearly" ? Math.round(p.yearly / 12) : p.monthly;
                const lines = [num(p.limits.orders, "pesanan/bulan"), num(p.limits.products, "produk"), num(p.limits.landing_pages, "landing page"), num(p.limits.team, "anggota tim"), num(p.limits.research, "riset pasar/hari"), p.limits.domains ? num(p.limits.domains, "custom domain") : null].filter(Boolean) as string[];
                return (
                  <div key={p.id} className={`relative flex flex-col rounded-2xl bg-white p-6 ${popular ? "shadow-xl shadow-brand-500/10 ring-2 ring-brand-500" : "border border-slate-200"}`}>
                    {popular && <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white"><Sparkles size={12} />Paling Populer</span>}
                    <h3 className="text-lg font-bold text-navy">{p.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">Sampai dengan {p.limits.orders === null ? "tanpa batas" : p.limits.orders.toLocaleString("id-ID")} pesanan per bulan</p>
                    <p className="mt-5"><span className="text-3xl font-extrabold text-navy">{rupiah(perMonth)}</span><span className="text-sm text-slate-500">/bulan</span></p>
                    <p className="h-5 text-xs text-slate-500">{period === "yearly" ? `${rupiah(p.yearly)} ditagih tahunan` : "Ditagih bulanan, berhenti kapan saja"}</p>
                    <button onClick={() => pick(p)} className={`mt-5 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${popular ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-slate-200 text-navy hover:border-brand-500 hover:text-brand-600"}`}>
                      Pilih {p.name}<ArrowRight size={16} />
                    </button>
                    <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-600">
                      {lines.map((l) => <li key={l} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />{l}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
            {d && <p className="mt-4 text-center text-xs text-slate-500">Harga belum termasuk PPN {d.tax_percent}%. Pembayaran manual via Virtual Account, QRIS, atau e-wallet, tanpa auto-debit.</p>}

            {error && <p className="mx-auto mt-6 max-w-3xl rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

            <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
              {locked && free && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-navy">Belum siap berlangganan?</h3>
                  <p className="mt-1 text-sm text-slate-600">Lanjut dengan paket Gratis: {num(free.limits.orders, "pesanan/bulan")}, {num(free.limits.products, "produk")}, 1 toko marketplace.</p>
                  <button disabled={busy} onClick={stayFree} className="mt-4 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-navy hover:border-navy disabled:opacity-60">{busy ? "Memproses…" : "Pakai paket Gratis"}</button>
                </div>
              )}
              <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${locked && free ? "" : "sm:col-span-2"}`}>
                <h3 className="font-bold text-navy">Butuh lebih dari 100.000 pesanan?</h3>
                <p className="mt-1 text-sm text-slate-600">Paket Custom untuk brand dan agensi. Tim kami juga siap bantu pilih paket yang pas.</p>
                <a href={waLink(`Halo tim Pesanin, saya pemilik toko ${user!.store_name} dan ingin konsultasi paket.`)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"><MessageCircle size={16} />Chat WhatsApp</a>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function LanggananPage() {
  return <AuthProvider><Picker /></AuthProvider>;
}
