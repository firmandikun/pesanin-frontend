"use client";
import { Check, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { COMPARE, PLANS, YEARLY_MONTHS_PAID, rupiah } from "@/lib/plans";

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <div>
      <div className="mx-auto mb-10 flex w-max items-center gap-1 rounded-full bg-white p-1">
        {[false, true].map((y) => (
          <button key={String(y)} onClick={() => setYearly(y)}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${yearly === y ? "bg-navy text-white" : "text-slate-600 hover:text-navy"}`}>
            {y ? "Tahunan" : "Bulanan"}
            {y && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${yearly ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700"}`}>Gratis 2 bulan</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const perMonth = yearly ? (p.monthly * YEARLY_MONTHS_PAID) / 12 : p.monthly;
          return (
            <div key={p.id} className={`relative flex flex-col rounded-3xl p-6 transition-colors duration-200 ${p.highlight ? "bg-navy text-white" : "bg-white"}`}>
              {p.highlight && <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white"><Sparkles size={13} />Paling populer</span>}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className={`mt-1 min-h-10 text-sm ${p.highlight ? "text-navy-200" : "text-slate-500"}`}>{p.tagline}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-[34px] font-extrabold leading-none tracking-tight">{p.monthly ? rupiah(perMonth) : "Rp0"}</span>
                <span className={`pb-1 text-sm ${p.highlight ? "text-navy-200" : "text-slate-500"}`}>/bulan</span>
              </div>
              <p className={`mt-2 h-5 text-xs ${p.highlight ? "text-navy-200" : "text-slate-500"}`}>
                {p.monthly === 0 ? "Gratis selamanya" : yearly ? `Ditagih ${rupiah(p.monthly * YEARLY_MONTHS_PAID)} per tahun` : "Ditagih bulanan, batalkan kapan saja"}
              </p>
              <div className={`mt-5 rounded-xl px-3 py-2 text-sm font-semibold ${p.highlight ? "bg-white/10 text-white" : "bg-brand-50 text-brand-700"}`}>{p.orders}</div>
              <ul className="mt-5 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${p.highlight ? "bg-brand-500 text-white" : "bg-emerald-100 text-emerald-600"}`}><Check size={12} strokeWidth={3} /></span>
                    <span className={p.highlight ? "text-navy-100" : "text-slate-600"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/register?plan=${p.id}${yearly ? "&billing=yearly" : ""}`}
                className={`mt-7 flex h-11 items-center justify-center rounded-xl text-sm font-bold transition ${p.highlight ? "bg-brand-500 text-white hover:bg-brand-400" : p.monthly === 0 ? "bg-navy-50 text-navy hover:bg-navy-100" : "border border-slate-200 text-navy hover:border-brand-500 hover:text-brand-600"}`}>
                {p.cta}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">Harga belum termasuk PPN 11%. Biaya payment gateway & ongkir dibayar sesuai tarif mitra.</p>

      <details className="group mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-semibold text-navy">
          Bandingkan semua fitur
          <span className="text-sm font-medium text-brand-600 group-open:hidden">Lihat tabel</span>
          <span className="hidden text-sm font-medium text-brand-600 group-open:inline">Tutup</span>
        </summary>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3 font-semibold">Fitur</th>
                {PLANS.map((p) => <th key={p.id} className={`px-4 py-3 text-center font-semibold ${p.highlight ? "text-brand-600" : ""}`}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, vals]) => (
                <tr key={label} className="border-t border-slate-100">
                  <td className="px-6 py-3 text-slate-700">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className={`px-4 py-3 text-center ${PLANS[i].highlight ? "bg-brand-50/40" : ""}`}>
                      {v === true ? <Check size={17} className="mx-auto text-emerald-500" strokeWidth={2.6} /> : v === false ? <Minus size={17} className="mx-auto text-slate-300" /> : <span className="font-medium text-navy">{v}</span>}
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
