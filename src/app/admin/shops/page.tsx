"use client";

import { AlertTriangle, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Pager, Panel } from "@/components/kit";
import { api, Paginated } from "@/lib/api";

type Shop = { id: number; shop_id: number; shop_name: string; status: string; last_error: string | null; orders_synced_at: string | null; refresh_expires_at: string | null; created_at: string; orders_count: number; user: { id: number; name: string; email: string; store_name: string } | null };
const ago = (d: string | null) => { if (!d) return "Belum pernah"; const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m} menit lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`; };

function Shops() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Shop> & { total: number } | null>(null);
  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(status ? { status } : {}), ...(search ? { search } : {}) });
    api<Paginated<Shop> & { total: number }>(`/admin/shops?${q}`).then(setData);
  }, [page, perPage, status, search]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold text-navy">Toko Shopee terhubung</h1><p className="text-sm text-slate-500">Pantau kesehatan sinkronisasi semua toko seller. Toko dengan error biasanya perlu dihubungkan ulang.</p></div>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari nama toko atau Shop ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          {[["", "Semua"], ["active", "Aktif"], ["error", "Error sinkron"], ["disconnected", "Terputus"]].map(([v, l]) => <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={`h-10 rounded-lg border px-3 text-sm font-medium ${status === v ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>)}
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Toko", "Pemilik", "Pesanan", "Sinkron terakhir", "Token berakhir", "Status"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{(data?.data ?? []).map((s) => (
            <tr key={s.id} className="align-top">
              <td className="px-4 py-3"><span className="flex items-center gap-2"><ShopeeMark size={22} /><span><b className="block text-navy">{s.shop_name}</b><span className="text-xs text-slate-500">Shop ID {s.shop_id}</span></span></span>{s.last_error && <p className="mt-1.5 flex max-w-sm items-start gap-1 text-xs text-rose-600"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{s.last_error}</p>}</td>
              <td className="px-4 py-3">{s.user && <Link href={`/admin/users?open=${s.user.id}`} className="font-semibold text-brand-600">{s.user.store_name || s.user.name}</Link>}<span className="block text-xs text-slate-500">{s.user?.email}</span></td>
              <td className="px-4 py-3">{s.orders_count.toLocaleString("id-ID")}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{ago(s.orders_synced_at)}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{s.refresh_expires_at ? new Date(s.refresh_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
              <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${s.last_error ? "bg-rose-50 text-rose-700" : s.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s.last_error ? "Error" : s.status === "active" ? "Aktif" : "Terputus"}</span></td>
            </tr>
          ))}</tbody>
        </table>{data && data.total === 0 && <p className="py-14 text-center text-sm text-slate-500">Tidak ada toko.</p>}</div>
        {data && <Pager page={data.current_page} last={data.last_page} total={data.total} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
      </Panel>
    </div>
  );
}

export default function ShopsPage() {
  return <Suspense><Shops /></Suspense>;
}
