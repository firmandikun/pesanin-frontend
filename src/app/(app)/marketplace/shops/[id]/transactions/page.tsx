"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Download, Printer, RefreshCcw, Search, Store } from "lucide-react";
import { Fragment, use, useCallback, useEffect, useMemo, useState } from "react";
import { DateRangePicker } from "@/components/DatePicker";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Pager, Panel } from "@/components/kit";
import { ShopWorkspaceNav } from "@/components/marketplace/ShopWorkspaceNav";
import { api, download, isoDate, Paginated, rupiah } from "@/lib/api";

type Shop = { id: number; shop_id: number; shop_name: string; region: string; status: string };
type Item = { name: string; variant?: string | null; sku?: string | null; qty: number; price: number };
type Row = {
  id: number; order_sn: string; created_at: string; status: string; customer_name?: string;
  tracking_number?: string; courier?: string; items: Item[]; quantity: number; gmv: number;
  revenue: number; fees: number; net_revenue: number; cogs: number; profit: number; margin: number;
  fee_final: boolean; missing_cost: boolean; fee_breakdown: { key: string; label: string; amount: number }[]; fee_source: "shopee" | "summary" | "estimate";
};
type Data = { transactions: Paginated<Row>; summary: { gmv: number; revenue: number; fees: number; net_revenue: number; cogs: number; profit: number; missing_cost: number } };

const FILTERS = [
  ["", "Semua transaksi"], ["READY_TO_SHIP", "Perlu dikirim"], ["PROCESSED", "Siap diserahkan"],
  ["SHIPPED", "Dikirim"], ["COMPLETED", "Selesai"], ["CANCELLED", "Dibatalkan"], ["TO_RETURN", "Retur"],
] as const;
const tones: Record<string, string> = {
  READY_TO_SHIP: "bg-blue-50 text-blue-700", PROCESSED: "bg-amber-50 text-amber-700", SHIPPED: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-50 text-emerald-700", CANCELLED: "bg-slate-100 text-slate-600", TO_RETURN: "bg-rose-50 text-rose-700",
};
const labels = Object.fromEntries(FILTERS);

export default function Transactions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const shopId = Number(id);
  const [shop, setShop] = useState<Shop | null>(null);
  const [range, setRange] = useState({ from: isoDate(new Date(Date.now() - 29 * 864e5)), to: isoDate(new Date()) });
  const [status, setStatus] = useState(""); const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Data | null>(null); const [expanded, setExpanded] = useState<number | null>(null);
  const query = useMemo(() => new URLSearchParams({ ...range, page: String(page), per_page: String(perPage), ...(status ? { status } : {}), ...(search ? { search } : {}) }).toString(), [range, page, perPage, status, search]);
  const load = useCallback(() => api<Data>(`/marketplace/shops/${shopId}/transactions?${query}`).then(setData), [shopId, query]);
  useEffect(() => { api<{ shops: Shop[] }>("/marketplace/shops").then((x) => setShop(x.shops.find((s) => s.id === shopId) ?? null)); }, [shopId]);
  useEffect(() => { const t = setTimeout(load, 180); return () => clearTimeout(t); }, [load]);
  if (!shop) return <div className="py-24 text-center text-sm text-slate-400">Memuat transaksi toko…</div>;
  const s = data?.summary;
  return <div className="space-y-5">
    <PageHead title="Transaksi" tutorial={false} crumbs={[["Marketplace", "/marketplace/shops"], [shop.shop_name, `/marketplace/shops/${shop.id}`], ["Transaksi"]]}>
      <button onClick={() => download(`/marketplace/shops/${shopId}/transactions/export?${new URLSearchParams({ ...range, ...(status ? { status } : {}), ...(search ? { search } : {}) })}`, `transaksi-${range.from}-${range.to}.csv`)} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy"><Download size={16} />Ekspor Excel</button>
      <button onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy"><Printer size={16} />Cetak</button>
      <button onClick={load} className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white"><RefreshCcw size={16} />Muat ulang</button>
    </PageHead>
    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><ShopeeMark size={28} /><span><b className="block">Terhubung ke {shop.shop_name}</b><span className="text-xs">Transaksi keuangan dipisahkan dari halaman pengaturan pengiriman.</span></span><DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(1); }} /></div>
    <ShopWorkspaceNav shopId={shop.id} active="finance" />
    <div className="flex gap-2"><span className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Transaksi</span><a href={`/marketplace/shops/${shop.id}/expenses`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600">Pengeluaran</a><a href={`/marketplace/shops/${shop.id}/finance`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600">Laba Rugi & Arus Kas</a></div>
    {s && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
      ["Omzet", s.revenue, "text-navy"], ["Potongan", s.fees, "text-rose-600"], ["Pendapatan bersih", s.net_revenue, "text-blue-600"],
      ["Total HPP", s.cogs, "text-orange-600"], ["Laba", s.profit, s.profit >= 0 ? "text-emerald-600" : "text-rose-600"],
    ].map(([l, v, c]) => <Panel key={l as string} className="p-4"><p className="text-xs text-slate-500">{l as string}</p><p className={`mt-1 text-lg font-bold ${c}`}>{rupiah(v as number)}</p></Panel>)}</div>}
    {s && s.missing_cost > 0 && <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={16} />{s.missing_cost} transaksi belum memiliki HPP lengkap sehingga laba belum final.</div>}
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4"><div className="relative min-w-[260px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari nomor pesanan, pembeli, atau resi" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div></div>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">{FILTERS.map(([v, l]) => <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={`h-9 rounded-lg border px-3 text-sm font-medium ${status === v ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>)}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Detail pesanan", "Tanggal", "Jumlah", "Biaya", "Pendapatan", "HPP", "Laba", "Status", ""].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{(data?.transactions.data ?? []).map((r) => <Fragment key={r.id}>
          <tr key={r.id} className="align-top hover:bg-slate-50/50"><td className="px-3 py-3"><p className="font-mono text-xs font-semibold text-navy">{r.order_sn}</p><p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">{r.items[0]?.name ?? r.customer_name}</p><p className="text-[11px] text-slate-400">{r.quantity} item · {r.tracking_number || "Resi belum tersedia"}</p></td><td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td><td className="px-3 py-3 font-semibold text-navy">{rupiah(r.revenue)}<span className="block text-[11px] font-normal text-slate-400">{r.quantity} qty</span></td><td className="px-3 py-3 font-semibold text-rose-600">{r.fees < 0 ? "+ " : "− "}{rupiah(Math.abs(r.fees))}{r.status !== "CANCELLED" && r.status !== "IN_CANCEL" && <span className={`mt-0.5 block w-fit rounded px-1.5 text-[10px] font-semibold ${r.fee_final ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.fee_final ? "Sudah cair" : "Estimasi penghasilan"}</span>}</td><td className="px-3 py-3 font-semibold text-blue-600">{rupiah(r.net_revenue)}</td><td className="px-3 py-3 font-semibold text-orange-600">{rupiah(r.cogs)}{r.missing_cost && <span className="block text-[11px] font-normal text-amber-600">HPP belum lengkap</span>}</td><td className={`px-3 py-3 font-bold ${r.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{rupiah(r.profit)}<span className="block text-[11px] font-normal text-slate-400">{r.margin}%</span></td><td className="px-3 py-3"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${tones[r.status] ?? "bg-slate-100 text-slate-600"}`}>{labels[r.status] ?? r.status}</span></td><td className="px-3 py-3"><button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{expanded === r.id ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></td></tr>
          {expanded === r.id && <tr key={`${r.id}-detail`}><td colSpan={9} className="bg-slate-50/70 px-5 py-4"><div className="grid gap-4 lg:grid-cols-[1fr_340px]"><div><h3 className="mb-2 text-sm font-bold text-navy">Detail produk</h3><div className="space-y-2">{r.items.map((item, i) => <div key={i} className="flex items-center justify-between rounded-lg bg-white p-3 text-xs"><span><b className="block text-navy">{item.name}</b><span className="text-slate-500">{item.variant || "Tanpa variasi"} · SKU {item.sku || "-"}</span></span><span className="text-right"><b>{item.qty} × {rupiah(item.price)}</b><span className="block text-slate-500">{rupiah(item.qty * item.price)}</span></span></div>)}</div></div><div className="rounded-xl bg-white p-4"><h3 className="text-sm font-bold text-navy">Rincian pendapatan</h3>{r.fee_breakdown.length > 0 && <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{r.fee_breakdown.map((f) => <div key={f.key} className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">{f.label}</dt><dd className={`font-semibold ${f.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>{f.amount < 0 ? "− " : "+ "}{rupiah(Math.abs(f.amount))}<span className="ml-1 font-normal text-slate-400">{r.revenue ? `${Math.round(Math.abs(f.amount) / r.revenue * 1000) / 10}%` : ""}</span></dd></div>)}</dl>}{r.fee_source === "summary" && <p className="mt-2 text-[11px] text-slate-500">Rincian per jenis biaya dari Shopee (get_escrow_detail) diambil otomatis pada sinkronisasi berikutnya.</p>}{r.fee_source === "estimate" && r.fees > 0 && <p className="mt-2 text-[11px] text-slate-500">Shopee belum mengirim data penghasilan pesanan ini; sementara memakai rata-rata potongan toko.</p>}{!r.fee_final && r.revenue > 0 && <p className="mt-2 text-[11px] text-amber-700">Masih estimasi dari Shopee; angka final diperbarui otomatis saat dana dilepas.</p>}<dl className="mt-3 space-y-2 text-xs">{[["Jumlah pesanan", r.revenue], ["Total biaya", -r.fees], ["Pendapatan bersih", r.net_revenue], ["Total HPP", -r.cogs], ["Laba transaksi", r.profit]].map(([l, v]) => <div key={l as string} className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">{l as string}</dt><dd className={`font-semibold ${(v as number) < 0 ? "text-rose-600" : "text-navy"}`}>{(v as number) < 0 ? "− " : ""}{rupiah(Math.abs(v as number))}</dd></div>)}</dl></div></div></td></tr>}
        </Fragment>)}</tbody></table>{data && data.transactions.total === 0 && <p className="py-14 text-center text-sm text-slate-500">Tidak ada transaksi pada filter ini.</p>}</div>
      {data && <Pager page={data.transactions.current_page} last={data.transactions.last_page} total={data.transactions.total} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
    </Panel>
  </div>;
}
