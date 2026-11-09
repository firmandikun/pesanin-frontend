"use client";
import { Package, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, Panel } from "@/components/kit";
import { Select } from "@/components/Select";

export default function Inventory() {
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { const t = setTimeout(() => api(`/inventory?${new URLSearchParams({ filter, search: q })}`).then(setRows), 200); return () => clearTimeout(t); }, [filter, q]);
  return (
    <div className="space-y-4">
      <h1 className="text-[34px] font-bold text-slate-800">Stok</h1>
      <div className="flex items-center justify-between">
        <Select className="h-10 w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All</option><option value="tracked">Stok dilacak</option></Select>
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-9 text-sm outline-none" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <Panel>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" /></th>{["Product", "SKU", "Incoming", "Committed", "Available"].map((h) => <th key={h} className="px-4 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(rows ?? []).map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-4 py-3"><input type="checkbox" /></td>
              <td className="px-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-slate-400">{r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : <Package size={16} />}</span>
                <span><b className="block font-medium text-slate-800">{r.product}</b>{r.variant && <span className="text-xs text-slate-500">{r.variant}</span>}</span></span></td>
              <td className="px-4 text-slate-600">{r.sku ?? "-"}</td><td className="px-4">{r.incoming}</td><td className="px-4">{r.committed}</td>
              <td className="px-4">{r.available === null ? <span className="text-xs text-slate-400">Tidak dilacak</span> : <b className={r.available <= 5 ? "text-rose-600" : "text-slate-800"}>{r.available}</b>}</td>
            </tr>
          ))}</tbody>
        </table>
        {rows && !rows.length && <EmptyState text="No matching records found" variant="box" />}
      </Panel>
    </div>
  );
}
