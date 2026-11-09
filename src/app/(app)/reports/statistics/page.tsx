"use client";
import { Eye, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { api, PAY_STATUS_LABEL, PAYMENT_LABEL, rupiah, STATUS_LABEL } from "@/lib/api";
import { DateRange, useDefaultRange } from "@/components/DateRange";
import { StatCard } from "@/components/ui";

function Breakdown({ title, rows, labels }: { title: string; rows: { label: string; total: number }[]; labels?: Record<string, string> }) {
  const sum = rows.reduce((a, r) => a + Number(r.total), 0) || 1;
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-bold text-ink">{title}</h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm"><span>{labels?.[r.label] ?? r.label}</span><b>{r.total}</b></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(Number(r.total) / sum) * 100}%` }} /></div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-slate-400">Belum ada data.</p>}
      </div>
    </div>
  );
}

export default function Statistics() {
  const [range, setRange] = useState(useDefaultRange());
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/reports/statistics?${new URLSearchParams(range)}`).then(setD); }, [range]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Statistik Penjualan</h1>
        <DateRange value={range} onChange={setRange} />
      </div>
      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Kunjungan Halaman Checkout" value={d.views} icon={Eye} tone="brand" />
            <StatCard label="Abandoned Checkouts" value={d.abandoned} icon={ShoppingCart} tone="amber" />
          </div>
          <div className="card overflow-x-auto p-5">
            <h3 className="mb-3 font-bold text-ink">Produk Terlaris</h3>
            <table className="w-full">
              <thead><tr>{["Produk", "Pesanan", "Qty", "Pendapatan"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.top_products.map((r: any) => <tr key={r.label}><td className="td font-medium">{r.label}</td><td className="td">{r.total}</td><td className="td">{r.qty}</td><td className="td">{rupiah(r.revenue)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Breakdown title="Status Pesanan" rows={d.by_status} labels={STATUS_LABEL} />
            <Breakdown title="Status Pembayaran" rows={d.by_payment_status} labels={PAY_STATUS_LABEL} />
            <Breakdown title="Metode Pembayaran" rows={d.by_payment_method} labels={PAYMENT_LABEL} />
            <Breakdown title="Kota Teratas" rows={d.by_city} />
            <Breakdown title="Kurir" rows={d.by_courier} />
            <Breakdown title="Sumber Traffic (UTM Source)" rows={d.by_utm_source} />
          </div>
        </>
      )}
    </div>
  );
}
