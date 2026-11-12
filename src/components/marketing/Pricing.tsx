"use client";
import { Check, Minus, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSiteConfig, waLink } from "@/lib/site";
import { COMPARE, PLANS, YEARLY_MONTHS_PAID, rupiah } from "@/lib/plans";

type Card = { id: string; name: string; monthly: number; orders: number | null; highlight?: boolean };
const BASE: Card[] = PLANS.map((p) => ({ id: p.id, name: p.name, monthly: p.monthly, orders: Number(p.orders.replace(/[^0-9]/g, "")) || null, highlight: p.highlight }));
const SAVE_PCT = Math.round((1 - YEARLY_MONTHS_PAID / 12) * 100);
const FREE: Card = { id: "gratis", name: "Gratis", monthly: 0, orders: 100 };

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  // Prices and order quotas follow Console → Paket & Fitur.
  const [plans, setPlans] = useState<Card[]>([FREE, ...BASE]);
  useEffect(() => {
    loadSiteConfig().then((s) => s && setPlans(s.plans.map((p) => ({ id: p.id, name: p.name, monthly: p.monthly, orders: p.limits.orders ?? null, highlight: PLANS.find((x) => x.id === p.id)?.highlight }))));
  }, []);

  return (
    <div>
      <div className="mb-12 flex items-center justify-center gap-3">
        <span className={`text-sm font-semibold transition ${!yearly ? "text-navy" : "text-slate-400"}`}>Bulanan</span>
        <button type="button" onClick={() => setYearly((v) => !v)} aria-label="Ganti periode tagihan"
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${yearly ? "bg-brand-500" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${yearly ? "left-[22px]" : "left-0.5"}`} />
        </button>
        <span className={`text-sm font-semibold transition ${yearly ? "text-navy" : "text-slate-400"}`}>Tahunan</span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Hemat {SAVE_PCT}%</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {plans.map((p) => {
          const perMonth = yearly ? (p.monthly * YEARLY_MONTHS_PAID) / 12 : p.monthly;
          const free = p.monthly === 0;
          return (
            <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-white p-6 text-center transition ${p.highlight ? "border-brand-400 bg-brand-50/40 shadow-xl shadow-brand-500/10" : "border-slate-200 hover:shadow-md"}`}>
              {p.highlight && <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200"><Star size={11} className="fill-brand-500 text-brand-500" />Paling Populer</span>}
              <h3 className="text-lg font-extrabold text-navy">{p.name}</h3>
              <p className="mt-2 min-h-[40px] text-sm text-slate-500">{p.orders === null ? "Pesanan tanpa batas per bulan" : <>Sampai dengan {p.orders.toLocaleString("id-ID")} pesanan per bulan</>}</p>
              <div className="mt-4">
                {free ? <p className="text-[28px] font-extrabold leading-none text-navy">Gratis</p>
                  : <p className="leading-none"><span className="text-[28px] font-extrabold tracking-tight text-navy">{rupiah(Math.round(perMonth))}</span><span className="text-sm text-slate-500">/bulan</span></p>}
                <p className="mt-2 text-xs text-slate-400">{free ? "Selamanya, tanpa kartu kredit" : yearly ? `${rupiah(p.monthly * YEARLY_MONTHS_PAID)} ditagih tahunan` : "Ditagih bulanan"}</p>
                {!free && p.orders && <p className="mt-1 text-xs font-semibold text-brand-600">Setara dengan Rp{(Math.round((perMonth / p.orders) * 100) / 100).toLocaleString("id-ID")} per pesanan</p>}
              </div>
              <div className="min-h-6 flex-1" />
              <Link href={`/register?plan=${p.id}${yearly && !free ? "&billing=yearly" : ""}`}
                className={`flex h-11 items-center justify-center rounded-xl text-sm font-bold transition ${p.highlight ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-brand-300 text-brand-600 hover:bg-brand-50"}`}>
                {free ? "Mulai Gratis" : "Coba Gratis Sekarang"}
              </Link>
            </div>
          );
        })}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h3 className="text-lg font-extrabold text-navy">Custom</h3>
          <p className="mt-2 min-h-[40px] text-sm text-slate-500">Untuk brand & agensi dengan banyak toko atau kebutuhan khusus</p>
          <div className="mt-4"><p className="text-[28px] font-extrabold leading-none text-navy">Custom</p><p className="mt-2 text-xs text-slate-400">Hubungi kami</p></div>
          <div className="min-h-6 flex-1" />
          <a href={waLink("Halo tim Pesanin, saya mau tanya paket Custom")} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-xl border border-brand-300 text-sm font-bold text-brand-600 transition hover:bg-brand-50">Hubungi Kami</a>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Harga belum termasuk PPN 11%. Biaya payment gateway & ongkir dibayar sesuai tarif mitra.
      </p>

      {/* ── Comparison table ── */}
      <details className="group mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 font-semibold text-navy">
          Bandingkan semua fitur
          <span className="text-sm font-medium text-brand-600 group-open:hidden">Lihat tabel →</span>
          <span className="hidden text-sm font-medium text-brand-600 group-open:inline">Tutup ↑</span>
        </summary>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Fitur</th>
                {PLANS.map((p) => (
                  <th key={p.id} className={`px-5 py-3 text-center ${p.highlight ? "text-brand-600" : ""}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, vals]) => (
                <tr key={label} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-slate-700">{label}</td>
                  {vals.map((v, i) => (
                    <td
                      key={i}
                      className={`px-5 py-3 text-center ${PLANS[i]?.highlight ? "bg-brand-50/30" : ""}`}
                    >
                      {v === true ? (
                        <Check size={17} className="mx-auto text-emerald-500" strokeWidth={2.6} />
                      ) : v === false ? (
                        <Minus size={17} className="mx-auto text-slate-300" />
                      ) : (
                        <span className="font-semibold text-navy">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
