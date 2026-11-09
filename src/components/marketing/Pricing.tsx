"use client";
import { Check, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { COMPARE, PLANS, YEARLY_MONTHS_PAID, rupiah } from "@/lib/plans";

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div>
      {/* ── Toggle bulanan / tahunan ── */}
      <div className="mb-12 flex items-center justify-center gap-4">
        <span className={`text-sm font-semibold transition ${!yearly ? "text-navy" : "text-slate-400"}`}>
          Bulanan
        </span>

        {/* Switch pill */}
        <button
          onClick={() => setYearly((v) => !v)}
          aria-label="Ganti periode tagihan"
          className={`relative h-7 w-12 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${yearly ? "bg-brand-500" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${yearly ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>

        <span className={`flex items-center gap-2 text-sm font-semibold transition ${yearly ? "text-navy" : "text-slate-400"}`}>
          Tahunan
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition ${yearly ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            Hemat 2 bulan
          </span>
        </span>
      </div>

      {/* ── Cards ── */}
      <div className="grid gap-5 sm:grid-cols-3">
        {PLANS.map((p) => {
          const perMonth = yearly
            ? (p.monthly * YEARLY_MONTHS_PAID) / 12
            : p.monthly;
          const annualTotal = p.monthly * YEARLY_MONTHS_PAID;

          return (
            <div
              key={p.id}
              className={`relative flex flex-col overflow-hidden rounded-3xl border transition-shadow duration-200 ${
                p.highlight
                  ? "border-brand-500 bg-white shadow-xl shadow-brand-500/15"
                  : "border-slate-200 bg-white hover:shadow-md"
              }`}
            >
              {/* Popular badge */}
              {p.highlight && (
                <div className="flex items-center justify-center gap-1.5 bg-brand-500 py-2 text-xs font-bold text-white">
                  <Sparkles size={12} />
                  Paling Populer
                </div>
              )}

              <div className="flex flex-1 flex-col p-7">
                {/* Name + tagline */}
                <h3 className="text-xl font-extrabold text-navy">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.orders}</p>

                {/* Price */}
                <div className="mt-6">
                  <div className="flex items-end gap-1">
                    <span className="text-[38px] font-extrabold leading-none tracking-tight text-navy">
                      {rupiah(Math.round(perMonth))}
                    </span>
                    <span className="mb-1 text-sm text-slate-500">/bulan</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {yearly
                      ? `Ditagih ${rupiah(annualTotal)} per tahun`
                      : "Ditagih bulanan, batalkan kapan saja"}
                  </p>
                  {yearly && (
                    <p className="mt-0.5 text-xs font-semibold text-brand-600">
                      Setara dengan {rupiah(Math.round(perMonth / p.monthly * 100 * 100) / 100 * 10 || Math.round(annualTotal / (p.orders.replace(/[^0-9]/g, "") ? 1 : 1))) ? `Rp${Math.round(annualTotal / 1000 / (yearly ? 10 : 12) * 10) / 10}rb` : ""} per pesanan
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={`/register?plan=${p.id}${yearly ? "&billing=yearly" : ""}`}
                  className={`mt-7 flex h-12 items-center justify-center rounded-xl text-sm font-bold transition ${
                    p.highlight
                      ? "bg-brand-500 text-white hover:bg-brand-600"
                      : "border border-slate-200 text-navy hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {p.cta}
                </Link>

                {/* Feature list */}
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        strokeWidth={3}
                        className={`mt-0.5 shrink-0 ${p.highlight ? "text-brand-500" : "text-emerald-500"}`}
                      />
                      <span className="text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
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
