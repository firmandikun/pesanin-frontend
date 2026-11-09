"use client";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { api, rupiah } from "@/lib/api";

type Row = {
  key: string; product_id: number | null; name: string; qty: number; qty_prev: number; growth: number; revenue: number; gross: number;
  margin: number | null; channels: Record<string, number>; stock: number | null; daily: number; cover_days: number | null; tags: string[];
};

const TAG: Record<string, [string, string, string]> = {
  naik: ["Penjualan naik", "bg-emerald-100 text-emerald-700", "Naikkan budget iklan atau stok produk ini."],
  turun: ["Penjualan turun", "bg-rose-100 text-rose-700", "Cek harga pesaing, ulasan, atau materi iklan."],
  stok_menipis: ["Stok ≤ 7 hari", "bg-amber-100 text-amber-700", "Restock sebelum habis supaya iklan tidak sia-sia."],
  margin_tipis: ["Margin < 15%", "bg-orange-100 text-orange-700", "Naikkan harga atau kurangi biaya per pesanan."],
  hpp_kosong: ["HPP belum diisi", "bg-slate-100 text-slate-600", "Isi harga modal agar margin akurat."],
  belum_terhubung: ["Listing belum terhubung", "bg-slate-100 text-slate-600", "Hubungkan ke produk Pesanin di Produk Marketplace."],
};

export default function Research() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tag, setTag] = useState("");
  useEffect(() => { api<{ products: Row[] }>("/reports/research").then((d) => setRows(d.products)); }, []);
  const shown = useMemo(() => (rows ?? []).filter((r) => !tag || r.tags.includes(tag)), [rows, tag]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(TAG).map((t) => [t, (rows ?? []).filter((r) => r.tags.includes(t)).length])), [rows]);

  return (
    <div className="space-y-5">
      <PageHead title="Riset Produk" tutorial={false} crumbs={[["Laporan"], ["Riset Produk"]]} />
      <p className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-slate-600">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        Dihitung dari penjualan tokomu sendiri (website, medsos, dan semua toko Shopee): 30 hari terakhir dibanding 30 hari sebelumnya. API Shopee tidak menyediakan data penjualan toko pesaing.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTag("")} className={`h-9 rounded-lg px-3.5 text-sm font-medium ${!tag ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Semua ({rows?.length ?? 0})</button>
        {Object.entries(TAG).map(([k, [label]]) => counts[k] > 0 && (
          <button key={k} onClick={() => setTag(k)} className={`h-9 rounded-lg px-3.5 text-sm font-medium ${tag === k ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{label} ({counts[k]})</button>
        ))}
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Produk", "Terjual 30 hari", "Tren", "Website / Shopee", "Pendapatan", "Margin kotor", "Stok", "Cukup untuk", "Saran"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <tr key={r.key} className="align-top hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{r.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TAG[t][1]}`}>{TAG[t][0]}</span>)}</div>
                  </td>
                  <td className="px-4 py-3"><b className="text-navy">{r.qty}</b><span className="block text-xs text-slate-400">sebelumnya {r.qty_prev}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${r.growth > 0 ? "text-emerald-600" : r.growth < 0 ? "text-rose-600" : "text-slate-500"}`}>
                      {r.growth > 0 ? <ArrowUpRight size={15} /> : r.growth < 0 ? <ArrowDownRight size={15} /> : <Minus size={15} />}{Math.abs(r.growth)}%
                    </span>
                    <span className="block text-xs text-slate-400">{r.daily.toLocaleString("id-ID")}/hari</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{(r.channels.website ?? 0) + (r.channels.manual ?? 0)} / {r.channels.shopee ?? 0}</td>
                  <td className="px-4 py-3">{rupiah(r.revenue)}</td>
                  <td className="px-4 py-3">{r.margin === null ? "-" : <span className={r.margin < 15 ? "font-semibold text-orange-600" : "text-navy"}>{r.margin}%</span>}</td>
                  <td className="px-4 py-3">{r.stock ?? <span className="text-slate-400">tidak dilacak</span>}</td>
                  <td className="px-4 py-3">{r.cover_days === null ? "-" : <span className={r.cover_days <= 7 ? "font-semibold text-amber-600" : ""}>{r.cover_days} hari</span>}</td>
                  <td className="max-w-[260px] px-4 py-3 text-xs text-slate-600">
                    {r.tags.length ? r.tags.map((t) => <p key={t}>• {TAG[t][2]}</p>) : "Stabil."}
                    {r.tags.includes("belum_terhubung") && <Link href="/marketplace/products?linked=no" className="mt-1 inline-block font-semibold text-brand-600">Hubungkan →</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows && shown.length === 0 && <p className="py-14 text-center text-sm text-slate-500">Belum ada penjualan 60 hari terakhir.</p>}
          {!rows && <p className="py-14 text-center text-sm text-slate-400">Menganalisis penjualan…</p>}
        </div>
      </Panel>
    </div>
  );
}
