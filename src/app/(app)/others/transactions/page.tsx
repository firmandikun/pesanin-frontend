"use client";
import { ListFilter, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtDate, PAYMENT_LABEL, rupiah } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EmptyState, Pager, Panel, RangeButton, SearchBox, useRange } from "@/components/kit";

export default function Transactions() {
  const { user } = useAuth();
  const [range, setRange] = useRange(183);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [d, setD] = useState<any>(null);
  useEffect(() => { const t = setTimeout(() => api(`/transactions?${new URLSearchParams({ ...range, search: q, page: String(page) })}`).then(setD), 200); return () => clearTimeout(t); }, [range, q, page]);
  const card = (label: string, k: string, tint: string) => (
    <div className="flex items-center gap-3 surface p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tint}`}><span className="h-4 w-6 rounded-sm bg-brand-600" /></span>
      <div className="flex-1"><div className="text-sm text-slate-700">{label}</div><div className="text-xs text-slate-500">Total: {rupiah(d?.[k]?.total ?? 0)}</div></div>
      <b className="text-xl text-slate-800">{d?.[k]?.count ?? 0}</b>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-[34px] font-bold text-slate-800">Transaksi</h1><Link href="/orders?payment_method=epayment" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Cek Detail Transaksi</Link></div>
      <div className="grid gap-4 md:grid-cols-3">{card("Gagal", "failed", "bg-rose-50")}{card("Sukses", "success", "bg-sky-50")}{card("Settled", "settled", "bg-amber-50")}</div>
      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={q} onChange={setQ} />
          <div className="ml-auto flex gap-2">
            <button className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><ListFilter size={15} />Filters</button>
            <RangeButton value={range} onChange={setRange} />
            <a href={`mailto:${user?.email}?subject=Laporan%20Transaksi`} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><Mail size={15} />Kirim Ke Email</a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" /></th>{["Pembayaran", "Tanggal & Waktu", "Order ID", "Nama", "Produk", "Total", "Expired in"].map((h) => <th key={h} className="whitespace-nowrap px-3 font-medium">{h} ▴</th>)}</tr></thead>
            <tbody>{(d?.rows.data ?? []).map((o: any) => (
              <tr key={o.id} className="border-b border-slate-100"><td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-3"><span className={`rounded-full px-2.5 py-0.5 text-xs ${o.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{o.payment_status === "paid" ? "Sukses" : "Menunggu"}</span><div className="text-xs text-slate-500">{PAYMENT_LABEL[o.payment_method]}</div></td>
                <td className="px-3 text-slate-600">{fmtDate(o.created_at)}</td><td className="px-3 font-mono text-xs">{o.code}</td><td className="px-3">{o.customer_name}</td><td className="px-3">{o.product?.name}</td>
                <td className="whitespace-nowrap px-3 font-semibold">{rupiah(o.total)}</td><td className="px-3 text-slate-500">{o.payment_status === "paid" ? "-" : "24 jam"}</td></tr>
            ))}</tbody>
          </table>
          {d && !d.rows.data.length && <EmptyState text="Belum Ada Transaksi" variant="card" />}
        </div>
        {(d?.rows.last_page ?? 1) > 1 && <Pager page={page} last={d.rows.last_page} onPage={setPage} />}
      </Panel>
    </div>
  );
}
