"use client";
import { BadgeCheck, ChevronRight, Copy, ExternalLink, MonitorDown, Package, Pencil, Plus, Search, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, Paginated, Product, rupiah } from "@/lib/api";
import { Empty, IconTile, Modal, PageHeader, Pagination, StatCard, Tabs } from "@/components/ui";
import { Select } from "@/components/Select";
import { askConfirm } from "@/components/Dialogs";

export default function Products() {
  const router = useRouter();
  const [type, setType] = useState<"physical" | "digital">("physical");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<{ products: Paginated<Product>; summary: any } | null>(null);
  const [chooser, setChooser] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams({ type, search, status, page: String(page), per_page: String(perPage) });
    api(`/products?${q}`).then(setData);
  }, [type, search, status, page, perPage]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function duplicate(p: Product) {
    await api(`/products/${p.id}/duplicate`, { method: "POST" });
    load();
  }
  async function remove(p: Product) {
    if (!(await askConfirm(`Hapus produk "${p.name}"?`))) return;
    await api(`/products/${p.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Produk" desc="Setiap produk punya halaman checkout sendiri yang siap dibagikan.">
        <button className="btn-primary" onClick={() => setChooser(true)}><Plus size={16} />Tambah Produk</button>
      </PageHeader>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Jumlah Produk" value={data.summary.total_products} icon={Package} tone="brand" />
          <StatCard label="Jumlah Total Terjual" value={data.summary.total_sold} icon={ShoppingBag} tone="emerald" />
          <StatCard label="Total Pesanan Dibayar" value={data.summary.total_paid_orders} icon={BadgeCheck} tone="sky" />
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <Tabs value={type} onChange={(t) => { setType(t); setPage(1); }} items={[{ value: "physical", label: "Produk Fisik", icon: Package }, { value: "digital", label: "Produk Digital", icon: MonitorDown }]} />
          <div className="flex gap-2">
          <div className="relative w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari produk" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Produk</option><option value="active">Aktif</option><option value="draft">Draft</option>
          </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/60">
              <tr>{["Nama Produk", "Harga", "Bump Pesanan", "Inventaris", "Pesanan", "Sudah Dibayar", "Rasio Bayar", "Jumlah Terjual", "Pendapatan Bersih", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.products.data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-slate-400"><Package size={18} /></span>}
                      </div>
                      <div>
                        <Link href={`/products/${p.id}/edit`} className="font-semibold hover:text-brand-600">{p.name}</Link>
                        <div className="flex gap-2 text-xs">
                          <span className={`badge ${p.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${p.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{p.status === "active" ? "Aktif" : "Draft"}</span>
                          <a href={`/c/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-brand-600 hover:underline">/c/{p.slug}<ExternalLink size={11} /></a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="td font-medium">{rupiah(p.sale_price || p.price)}{p.sale_price ? <div className="text-xs text-slate-400 line-through">{rupiah(p.price)}</div> : null}</td>
                  <td className="td">{p.bump_count} Orders</td>
                  <td className="td">{p.track_stock ? p.stock : "-"}</td>
                  <td className="td">{p.orders_count} Orders</td>
                  <td className="td">{p.paid_count}</td>
                  <td className="td">{p.orders_count ? ((p.paid_count! / p.orders_count) * 100).toFixed(2) : "0.00"} %</td>
                  <td className="td">{p.sold_qty ?? 0}</td>
                  <td className="td">{rupiah(p.net_revenue)}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <Link className="btn-outline btn-sm" href={`/products/${p.id}/edit`}><Pencil size={13} />Edit</Link>
                      <button className="btn-ghost btn-sm px-2" title="Gandakan" onClick={() => duplicate(p)}><Copy size={14} /></button>
                      <button className="btn-ghost btn-sm px-2 text-rose-600" title="Hapus" onClick={() => remove(p)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.products.data.length === 0 && <Empty icon={Package} text="Belum ada produk." />}
        </div>
        {data && <Pagination page={data.products.current_page} last={data.products.last_page} onChange={setPage} total={data.products.total} perPage={perPage} onPerPage={setPerPage} />}
      </div>

      <Modal open={chooser} onClose={() => setChooser(false)} title="Tambah Produk" icon={Plus}>
        <div className="space-y-3">
          <button onClick={() => router.push("/products/new?type=physical")} className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
            <IconTile icon={Truck} tone="brand" />
            <span><b className="block">Produk Fisik</b><span className="text-sm text-slate-500">Produk yang memerlukan pengiriman, seperti baju atau gadget.</span></span>
            <ChevronRight size={18} className="ml-auto text-slate-400" />
          </button>
          <button onClick={() => router.push("/products/new?type=digital")} className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
            <IconTile icon={MonitorDown} tone="violet" />
            <span><b className="block">Produk Digital</b><span className="text-sm text-slate-500">Produk yang bisa diunduh secara online, seperti e-book atau software.</span></span>
            <ChevronRight size={18} className="ml-auto text-slate-400" />
          </button>
        </div>
      </Modal>
    </div>
  );
}
