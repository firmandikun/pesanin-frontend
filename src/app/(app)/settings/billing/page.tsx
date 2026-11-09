"use client";
import { AlertTriangle, ArrowUpRight, Check, Clock, Crown, Eye, Minus, Receipt, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CheckoutDialog, InvoiceDialog, PayDialog } from "@/components/billing/Dialogs";
import { Billing, FEATURE_LABEL, fmtDay, Invoice, INVOICE_STATUS, LIMIT_LABEL, METHOD, PlanInfo } from "@/components/billing/types";
import { EmptyState, PageHead, Panel, Toggle } from "@/components/kit";
import { api, rupiah } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, (used / limit) * 100);
  const tone = limit === null ? "bg-emerald-500" : pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-brand-500";
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-navy">{used.toLocaleString("id-ID")}<span className="font-normal text-slate-400"> / {limit === null ? "∞" : limit.toLocaleString("id-ID")}</span></span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone}`} style={{ width: limit === null ? "100%" : `${Math.max(pct, used ? 3 : 0)}%`, opacity: limit === null ? 0.25 : 1 }} />
      </div>
    </div>
  );
}

const limitText = (v: number | null, unit: string) => (v === null ? `${unit} tanpa batas` : v === 0 ? null : `${v.toLocaleString("id-ID")} ${unit}`);

export default function BillingPage() {
  const [d, setD] = useState<Billing | null>(null);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [buy, setBuy] = useState<PlanInfo | null>(null);
  const [pay, setPay] = useState<Invoice | null>(null);
  const [view, setView] = useState<Invoice | null>(null);
  const { user, setUser } = useAuth();
  const load = useCallback(() => api<Billing>("/billing").then((b) => {
    setD(b);
    if (b.billing) setPeriod(b.billing);
    // Keep the header plan badge in sync after a payment.
    if (user && user.active_plan !== b.plan) setUser({ ...user, active_plan: b.plan as NonNullable<typeof user.active_plan> });
  }), [user, setUser]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div className="py-24 text-center text-sm text-slate-400">Memuat paket…</div>;

  const current = d.plans.find((p) => p.id === d.plan)!;
  const unpaid = d.invoices.find((i) => i.status === "unpaid");
  const daysLeft = d.expires_at ? Math.max(0, Math.ceil((new Date(d.expires_at).getTime() - Date.now()) / 864e5)) : null;
  const total = d.billing === "yearly" ? 365 : 30;
  const toggleRenew = async (v: boolean) => { setD({ ...d, auto_renew: v }); await api("/billing/auto-renew", { method: "PUT", json: { auto_renew: v } }); };
  const near = LIMIT_LABEL.filter(([k]) => { const l = current.limits[k]; return l !== null && l > 0 && d.usage[k] / l >= 0.8; });

  return (
    <div className="space-y-5">
      <PageHead title="Paket & Tagihan" tutorial={false} crumbs={[["Settings"], ["Paket & Tagihan"]]} />

      {unpaid && (
        <div className="surface flex flex-wrap items-center gap-4 border-amber-200 bg-amber-50/60 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Clock size={20} /></span>
          <div className="flex-1 text-sm">
            <b className="text-navy">Tagihan paket {d.plans.find((p) => p.id === unpaid.plan)?.name} menunggu pembayaran</b>
            <p className="text-slate-600">{rupiah(unpaid.total)} via {METHOD[unpaid.method]?.label} · bayar sebelum {new Date(unpaid.due_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <button onClick={() => setPay(unpaid)} className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">Bayar sekarang</button>
        </div>
      )}
      {d.lapsed && (
        <div className="surface flex items-center gap-3 border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700"><AlertTriangle size={18} />Masa paket berbayarmu sudah berakhir, akun kembali ke paket Gratis. Perpanjang untuk membuka lagi semua fitur.</div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-navy-200"><Crown size={16} className="text-brand-400" />Paket aktif</span>
              {d.billing && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{d.billing === "yearly" ? "Tahunan" : "Bulanan"}</span>}
            </div>
            <h2 className="mt-2 text-[34px] font-extrabold tracking-tight">{current.name}</h2>
            <p className="text-navy-200">{current.monthly ? `${rupiah(d.billing === "yearly" ? current.yearly : current.monthly)} / ${d.billing === "yearly" ? "tahun" : "bulan"}` : "Gratis selamanya"}</p>

            {d.expires_at && daysLeft !== null ? (
              <div className="mt-6">
                <div className="flex justify-between text-sm"><span className="text-navy-200">{d.auto_renew ? "Diperpanjang" : "Berakhir"} {fmtDay(d.expires_at)}</span><b>{daysLeft} hari lagi</b></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (daysLeft / total) * 100)}%` }} /></div>
                <label className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-white/[.06] px-4 py-3 text-sm">
                  <span><b className="block">Perpanjang otomatis</b><span className="text-navy-200">Tagihan baru dibuat 3 hari sebelum masa aktif habis</span></span>
                  <Toggle checked={d.auto_renew} onChange={toggleRenew} />
                </label>
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-white/[.06] p-4 text-sm text-navy-100">Upgrade untuk custom domain, follow up otomatis, tanpa watermark, dan kuota pesanan lebih besar.</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {current.monthly > 0 && <button onClick={() => setBuy(current)} className="h-10 rounded-lg bg-white px-5 text-sm font-bold text-navy hover:bg-navy-50">Perpanjang</button>}
              <a href="#paket" className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-400">{current.rank < 3 ? "Upgrade paket" : "Lihat paket"}<ArrowUpRight size={16} /></a>
            </div>
          </div>
        </section>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Pemakaian</h2>
            <span className="text-xs text-slate-500">Reset tiap tanggal 1</span>
          </div>
          <div className="mt-5 space-y-4">
            {LIMIT_LABEL.map(([k, l]) => <Meter key={k} label={l} used={d.usage[k]} limit={current.limits[k]} />)}
          </div>
          {near.length > 0 && (
            <p className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700"><AlertTriangle size={15} className="shrink-0" />{near.map(([, l]) => l).join(", ")} hampir mencapai batas paket. Pesanan pembeli tetap diterima walau kuota habis.</p>
          )}
        </Panel>
      </div>

      <section id="paket" className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-navy">Pilih paket</h2>
          <div className="flex items-center gap-1 rounded-full bg-white p-1">
            {(["monthly", "yearly"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${period === p ? "bg-navy text-white" : "text-slate-600 hover:text-navy"}`}>
                {p === "yearly" ? "Tahunan · hemat 2 bulan" : "Bulanan"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {d.plans.map((p) => {
            const isCurrent = p.id === d.plan;
            const price = period === "yearly" ? p.yearly / 12 : p.monthly;
            const lines = [limitText(p.limits.orders, "pesanan/bln"), limitText(p.limits.products, "produk"), limitText(p.limits.landing_pages, "landing page"), limitText(p.limits.domains, "custom domain"), limitText(p.limits.team, "anggota tim"), limitText(p.limits.research, "riset pasar/hari")].filter(Boolean) as string[];
            const cta = isCurrent ? (p.monthly ? "Perpanjang" : "Paket saat ini") : p.rank > current.rank ? `Upgrade ke ${p.name}` : p.monthly ? `Pindah ke ${p.name}` : "Paket dasar";
            return (
              <div key={p.id} className={`surface surface-hover relative flex flex-col p-5 ${isCurrent ? "ring-2 ring-brand-500" : ""}`}>
                {isCurrent && <span className="absolute -top-2.5 left-5 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-bold text-white">Paket kamu</span>}
                {p.id === "bisnis" && !isCurrent && <span className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-bold text-white"><Sparkles size={11} />Populer</span>}
                <h3 className="font-bold text-navy">{p.name}</h3>
                <p className="mt-2"><span className="text-2xl font-extrabold text-navy">{rupiah(Math.round(price))}</span><span className="text-sm text-slate-500">/bln</span></p>
                <p className="h-4 text-xs text-slate-500">{p.monthly && period === "yearly" ? `${rupiah(p.yearly)} per tahun` : ""}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {lines.map((l) => <li key={l} className="flex gap-2 text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />{l}</li>)}
                  {Object.entries(FEATURE_LABEL).map(([k, l]) => (
                    <li key={k} className={`flex gap-2 ${p.features.includes(k) ? "text-slate-600" : "text-slate-300"}`}>
                      {p.features.includes(k) ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> : <Minus size={16} className="mt-0.5 shrink-0" />}{l}
                    </li>
                  ))}
                </ul>
                <button disabled={!p.monthly} onClick={() => setBuy(p)}
                  className={`mt-5 h-10 rounded-lg text-sm font-bold transition disabled:cursor-default ${!p.monthly ? "bg-slate-100 text-slate-400" : p.rank > current.rank ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-slate-200 text-navy hover:border-brand-500 hover:text-brand-600"}`}>
                  {cta}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">Harga belum termasuk PPN {d.tax_percent}%.</p>
      </section>

      <Panel>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600"><Receipt size={16} /></span>
          <h2 className="flex-1 text-[17px] font-semibold text-slate-800">Riwayat tagihan</h2>
        </div>
        {d.invoices.length === 0 ? <EmptyState text="Belum ada tagihan" sub="Tagihan muncul di sini setelah kamu memilih paket berbayar." variant="money" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500">{["No. tagihan", "Tanggal", "Paket", "Masa aktif", "Metode", "Total", "Status", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {d.invoices.map((inv) => {
                  const [label, cls] = INVOICE_STATUS[inv.status];
                  return (
                    <tr key={inv.id} className="border-t border-slate-100 transition hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-mono text-xs text-navy">{inv.number}</td>
                      <td className="px-5 py-3 text-slate-600">{new Date(inv.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-3 font-medium text-navy">{d.plans.find((p) => p.id === inv.plan)?.name} <span className="text-xs font-normal text-slate-500">{inv.billing === "yearly" ? "Tahunan" : "Bulanan"}</span></td>
                      <td className="px-5 py-3 text-slate-600">{new Date(inv.period_start).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – {new Date(inv.period_end).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</td>
                      <td className="px-5 py-3 text-slate-600">{METHOD[inv.method]?.label ?? inv.method}</td>
                      <td className="px-5 py-3 font-semibold text-navy">{rupiah(inv.total)}</td>
                      <td className="px-5 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span></td>
                      <td className="px-5 py-3 text-right">
                        {inv.status === "unpaid"
                          ? <button onClick={() => setPay(inv)} className="font-semibold text-brand-600 hover:underline">Bayar</button>
                          : <button onClick={() => setView(inv)} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-navy"><Eye size={15} />Lihat</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {buy && <CheckoutDialog plan={buy} billing={period} data={d} onClose={() => setBuy(null)} onCreated={(inv) => { setBuy(null); setPay(inv); load(); }} />}
      {pay && <PayDialog invoice={pay} canSimulate={d.can_simulate} onClose={() => setPay(null)} onChanged={load} />}
      {view && <InvoiceDialog invoice={view} plans={d.plans} onClose={() => setView(null)} />}
    </div>
  );
}
