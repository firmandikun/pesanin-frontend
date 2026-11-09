"use client";
import { ChevronsUpDown, LineChart, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { CardTitle, EmptyState, Panel, RangeButton, useRange } from "@/components/kit";
import { Select } from "@/components/Select";

export default function ProductReports() {
  const [range, setRange] = useRange(0);
  const [pid, setPid] = useState("");
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/product-reports?${new URLSearchParams({ ...range, ...(pid ? { product_id: pid } : {}) })}`).then(setD); }, [range, pid]);
  const m: any[] = d?.members ?? [];
  const active = m.filter((x) => x.orders > 0);
  const top = (key: string) => [...active].sort((a, b) => b[key] - a[key]).slice(0, 5);
  const Bars = ({ rows, k, fmt }: { rows: any[]; k: string; fmt: (n: number) => string }) => {
    const max = Math.max(1, ...rows.map((r) => r[k]));
    return <div className="space-y-3 py-4">{rows.map((r) => <div key={r.name}><div className="flex justify-between text-sm"><span>{r.name}</span><b>{fmt(r[k])}</b></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(r[k] / max) * 100}%` }} /></div></div>)}</div>;
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[34px] font-bold text-slate-800">Laporan Produk</h1>
        <div className="flex gap-2">
          <Select className="h-10 w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={pid} onChange={(e) => setPid(e.target.value)}><option value="">All Products</option>{d?.products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <RangeButton value={range} onChange={setRange} />
        </div>
      </div>
      <Panel>
        <CardTitle icon={LineChart} title="Kinerja Tim" tint="blue" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {[["Rasio Pembayaran Teratas", "paid_ratio", (n: number) => `${n}%`], ["Penjualan Teratas", "gross", rupiah]].map(([t, k, fmt]) => (
            <div key={t as string} className="rounded-xl border border-slate-200 px-4 pt-3">
              <h3 className="font-semibold text-slate-800">{t as string}</h3>
              {active.length ? <Bars rows={top(k as string)} k={k as string} fmt={fmt as any} /> : <EmptyState text="No data available" variant="chart" />}
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <CardTitle icon={UsersRound} title="Team Members" tint="green" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[13px] text-slate-500">{["Name", "Order", "Paid", "Paid Ratio", "Quantity", "Unpaid Orders", "Gross Revenue"].map((h) => <th key={h} className="px-5 py-3 font-medium"><span className="flex items-center gap-1">{h}<ChevronsUpDown size={13} /></span></th>)}</tr></thead>
            <tbody>{m.map((r) => (
              <tr key={r.name} className="border-b border-slate-100"><td className="px-5 py-3 font-medium text-slate-800">{r.name}</td><td className="px-5">{r.orders}</td><td className="px-5">{r.paid}</td><td className="px-5">{r.paid_ratio}%</td><td className="px-5">{r.quantity}</td><td className="px-5">{r.unpaid}</td><td className="px-5 font-semibold">{rupiah(r.gross)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
