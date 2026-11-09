"use client";
import { BadgeCheck, Package, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { BarChart, StatCard } from "@/components/ui";
import { DateRange, useDefaultRange } from "@/components/DateRange";

export default function SalesReport() {
  const [range, setRange] = useState(useDefaultRange());
  const [metric, setMetric] = useState<"net" | "gross" | "orders">("net");
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/reports/sales?${new URLSearchParams(range)}`).then(setD); }, [range]);

  const fmt = (n: number) => (metric === "orders" ? String(n) : rupiah(n));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Laporan Penjualan</h1>
        <DateRange value={range} onChange={setRange} />
      </div>
      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Pesanan" value={d.totals.orders} icon={ShoppingBag} tone="brand" />
            <StatCard label="Pesanan Dibayar" value={d.totals.paid_orders} icon={BadgeCheck} tone="emerald" />
            <StatCard label="Item Terjual" value={d.totals.items} icon={Package} tone="violet" />
            <StatCard label="Pendapatan Kotor" value={rupiah(d.totals.gross)} icon={Wallet} tone="sky" />
            <StatCard label="Pendapatan Bersih" value={rupiah(d.totals.net)} icon={TrendingUp} tone="emerald" />
          </div>
          <div className="card p-5">
            <div className="mb-4 flex gap-2 text-sm">
              {([["net", "Pendapatan Bersih"], ["gross", "Pendapatan Kotor"], ["orders", "Jumlah Pesanan"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setMetric(k)} className={`rounded-lg px-3 py-1.5 font-semibold transition ${metric === k ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
              ))}
            </div>
            <BarChart data={d.daily} valueKey={metric} labelKey="date" format={fmt} />
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50"><tr>{["Tanggal", "Pesanan", "Dibayar", "Item", "Kotor", "Bersih"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[...d.daily].reverse().map((r: any) => (
                  <tr key={r.date}><td className="td">{r.date}</td><td className="td">{r.orders}</td><td className="td">{r.paid_orders}</td><td className="td">{r.items}</td><td className="td">{rupiah(r.gross)}</td><td className="td font-medium">{rupiah(r.net)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
