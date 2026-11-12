"use client";

import { CheckCircle2, Search } from "lucide-react";
import { askConfirm } from "@/components/Dialogs";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Pager, Panel } from "@/components/kit";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";

type Invoice = { id: number; number: string; plan: string; billing: string; total: number; status: string; method: string; created_at: string; paid_at: string | null; due_at: string | null; period_end: string; user: { id: number; name: string; email: string; store_name: string } | null };
const TONE: Record<string, string> = { unpaid: "bg-amber-50 text-amber-700", paid: "bg-emerald-50 text-emerald-700", cancelled: "bg-slate-100 text-slate-600", expired: "bg-rose-50 text-rose-700" };
const LABEL: Record<string, string> = { unpaid: "Menunggu", paid: "Lunas", cancelled: "Dibatalkan", expired: "Kedaluwarsa" };
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");

function Invoices() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Invoice> & { total: number } | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(status ? { status } : {}), ...(search ? { search } : {}) });
    api<Paginated<Invoice> & { total: number }>(`/admin/invoices?${q}`).then(setData);
  }, [page, perPage, status, search]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const markPaid = async (i: Invoice) => {
    if (!(await askConfirm(`${i.number} sebesar ${rupiah(i.total)} ditandai lunas, dan paket ${i.plan} langsung aktif untuk ${i.user?.store_name}.`, { title: "Tandai sudah dibayar?", confirmLabel: "Tandai lunas" }))) return;
    try { await api(`/admin/invoices/${i.id}/paid`, { method: "POST" }); setMsg(`${i.number} ditandai lunas.`); load(); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : "Gagal"); }
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold text-navy">Tagihan langganan</h1><p className="text-sm text-slate-500">Konfirmasi pembayaran manual (mis. transfer langsung) dan pantau tagihan yang belum dibayar.</p></div>
      {msg && <p className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">{msg}</p>}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari nomor tagihan, email, atau toko" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          {[["", "Semua"], ["unpaid", "Menunggu"], ["paid", "Lunas"], ["expired", "Kedaluwarsa"], ["cancelled", "Dibatalkan"]].map(([v, l]) => <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={`h-10 rounded-lg border px-3 text-sm font-medium ${status === v ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>)}
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Tagihan", "Seller", "Paket", "Total", "Metode", "Dibuat", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{(data?.data ?? []).map((i) => (
            <tr key={i.id}>
              <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{i.number}</td>
              <td className="px-4 py-3"><b className="block text-navy">{i.user?.store_name || i.user?.name}</b><span className="text-xs text-slate-500">{i.user?.email}</span></td>
              <td className="px-4 py-3 capitalize">{i.plan}<span className="block text-xs text-slate-500">{i.billing === "yearly" ? "Tahunan" : "Bulanan"} · s/d {date(i.period_end)}</span></td>
              <td className="px-4 py-3 font-bold text-navy">{rupiah(i.total)}</td>
              <td className="px-4 py-3 text-xs uppercase text-slate-600">{i.method?.replace("_", " ")}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{date(i.created_at)}{i.paid_at && <span className="block text-emerald-600">Lunas {date(i.paid_at)}</span>}</td>
              <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${TONE[i.status] ?? "bg-slate-100"}`}>{LABEL[i.status] ?? i.status}</span></td>
              <td className="px-4 py-3 text-right">{["unpaid", "expired"].includes(i.status) && <button onClick={() => markPaid(i)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"><CheckCircle2 size={14} />Tandai lunas</button>}</td>
            </tr>
          ))}</tbody>
        </table>{data && data.total === 0 && <p className="py-14 text-center text-sm text-slate-500">Tidak ada tagihan.</p>}</div>
        {data && <Pager page={data.current_page} last={data.last_page} total={data.total} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
      </Panel>
    </div>
  );
}

export default function InvoicesPage() {
  return <Suspense><Invoices /></Suspense>;
}
