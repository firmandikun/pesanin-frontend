"use client";
import Link from "next/link";
import { AlertTriangle, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight, Package, Pencil, Upload, X } from "lucide-react";
import { BulkCostDialog } from "@/components/marketplace/BulkCostDialog";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Pager, PageHead, Panel, SearchBox } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";
import { showAlert } from "@/components/Dialogs";

type Listing = {
  id: number; marketplace_shop_id: number; item_id: number; model_id: number; name: string; model_name: string | null; sku: string | null;
  price: number; cost_price: number | null; stock: number; status: string; image: string | null;
  shop: { id: number; shop_name: string; shop_id: number; is_demo: boolean };
  product: { id: number; name: string; sku: string | null; cost_price: number | null } | null;
};
type Data = { listings: Paginated<Listing>; stats: { total: number; with_cost: number; out_of_stock: number; stock: number } };

/** Inline HPP (modal per unit) editor; feeds the net-profit report for Shopee sales. */
function CostCell({ l, onSaved }: { l: Listing; onSaved: (v: number | null) => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(l.cost_price ? String(l.cost_price) : "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const cost = v === "" ? null : Number(v);
      await api(`/marketplace/listings/${l.id}/cost`, { method: "PUT", json: { cost_price: cost } });
      onSaved(cost); setEdit(false);
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal menyimpan HPP", "Gagal"); }
    finally { setBusy(false); }
  };
  if (!edit) {
    const margin = l.cost_price ? Math.round(((l.price - l.cost_price) / l.price) * 100) : null;
    return (
      <button onClick={() => setEdit(true)} className="group inline-flex items-center gap-2 text-left">
        {l.cost_price
          ? <span><b className="text-navy">{rupiah(l.cost_price)}</b><span className={`block whitespace-nowrap text-xs ${margin !== null && margin < 15 ? "text-orange-600" : "text-slate-500"}`}>margin {margin}%</span></span>
          : <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Isi HPP</span>}
        <Pencil size={13} className="text-slate-300 group-hover:text-slate-500" />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
        <input autoFocus type="number" min={0} className="input h-8 w-32 pl-7 pr-2" value={v} placeholder="0" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} /></span>
      <button onClick={save} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white"><Check size={14} /></button>
      <button onClick={() => setEdit(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
    </span>
  );
}

function StockCell({ l, onSaved }: { l: Listing; onSaved: (v: number) => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(String(l.stock));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api(`/marketplace/listings/${l.id}/stock`, { method: "PUT", json: { stock: Number(v) } }); onSaved(Number(v)); setEdit(false); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal update stok", "Gagal"); }
    finally { setBusy(false); }
  };
  if (!edit) {
    return (
      <button onClick={() => setEdit(true)} className="group inline-flex items-center gap-1.5">
        <span className={`font-semibold ${l.stock <= 0 ? "text-rose-600" : l.stock <= 10 ? "text-amber-600" : "text-navy"}`}>{l.stock}</span>
        <Pencil size={13} className="text-slate-300 group-hover:text-slate-500" />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus type="number" min={0} className="input h-8 w-20 px-2" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <button onClick={save} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white"><Check size={14} /></button>
      <button onClick={() => setEdit(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
    </span>
  );
}

function Products() {
  const sp = useSearchParams();
  const [filters, setFilters] = useState({ shop_id: sp.get("shop_id") ?? "", cost: sp.get("cost") ?? "", search: "" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<{ id: number; shop_name: string }[]>([]);
  const [bulk, setBulk] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    api<Data>(`/marketplace/listings?${new URLSearchParams({ ...filters, page: String(page), per_page: String(perPage) })}`).then(setD);
  }, [filters, page, perPage]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    api("/marketplace/shops").then((x) => setShops(x.shops));
  }, []);

  const patch = (id: number, p: Partial<Listing>) => setD((cur) => cur && { ...cur, listings: { ...cur.listings, data: cur.listings.data.map((x) => (x.id === id ? { ...x, ...p } : x)) } });
  const set = (k: keyof typeof filters, v: string) => { setFilters({ ...filters, [k]: v }); setPage(1); };
  const s = d?.stats;
  // Rows come per variation; group them by Shopee product (shop + item) keeping the server's order.
  const groups = Object.values((d?.listings.data ?? []).reduce<Record<string, Listing[]>>((acc, l) => {
    (acc[`${l.marketplace_shop_id}:${l.item_id}`] ??= []).push(l); return acc;
  }, {}));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="space-y-5">
      <PageHead title="Produk Shopee" tutorial={false} crumbs={[["Marketplace"], ["Produk Shopee"]]}>
        <Link href="/marketplace/publish" className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73f22]"><Upload size={16} />Upload produk</Link>
        <button onClick={() => setBulk(true)} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><Calculator size={16} />Input HPP massal</button>
      </PageHead>
      {notice && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16} />{notice}</p>}
      {bulk && <BulkCostDialog onClose={() => setBulk(false)} onSaved={(m) => { setBulk(false); setNotice(m); load(); }} />}

      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Total listing", s.total, "text-navy"], ["HPP terisi", `${s.with_cost} / ${s.total}`, s.with_cost < s.total ? "text-amber-600" : "text-emerald-600"], ["Stok habis", s.out_of_stock, "text-rose-600"], ["Total stok", s.stock.toLocaleString("id-ID"), "text-navy"]].map(([l, v, c]) => (
            <div key={l as string} className="surface p-4"><p className="text-xs font-medium text-slate-500">{l}</p><p className={`mt-1 text-xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}
      {s && s.with_cost < s.total && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{s.total - s.with_cost} listing belum punya HPP. Isi modal per unit supaya laba bersih Shopee terhitung akurat.
        </p>
      )}

      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={filters.search} onChange={(v) => set("search", v)} placeholder="Cari nama atau SKU" />
          <Select className="input w-56" value={filters.shop_id} onChange={(e) => set("shop_id", e.target.value)}>
            <option value="">Semua toko</option>
            {shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
          </Select>
          <Select className="input w-48" value={filters.cost} onChange={(e) => set("cost", e.target.value)}>
            <option value="">Semua listing</option><option value="filled">HPP sudah diisi</option><option value="empty">HPP belum diisi</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Produk / variasi", "Toko", "SKU", "Harga jual", "HPP (modal/unit)", "Stok"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const first = g[0];
                const key = `${first.marketplace_shop_id}:${first.item_id}`;
                const shopCell = (
                  <td className="px-3 py-3"><span className="flex items-center gap-1.5 text-slate-600" title={first.shop.shop_name}><ShopeeMark size={14} />
                    <span className="min-w-0"><span className="block max-w-[130px] truncate">{first.shop.shop_name.replace(/^Contoh: /, "")}</span><span className="block text-[11px] text-slate-400">ID {first.shop.shop_id}</span></span></span></td>
                );
                const thumb = first.image ? <img src={first.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package size={18} /></span>;
                const statusNote = first.status !== "NORMAL" ? (first.status === "UNLIST" ? "Diarsipkan" : first.status) : null;

                // Single product without variations: one row, as before.
                if (g.length === 1 && !first.model_id) return (
                  <tr key={key} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-3"><div className="flex items-center gap-3">{thumb}
                      <div className="min-w-0"><p className="max-w-[240px] truncate font-medium text-navy" title={first.name}>{first.name}</p><p className="text-xs text-slate-500">Tanpa variasi{statusNote && ` · ${statusNote}`}</p></div></div></td>
                    {shopCell}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs text-slate-500">{first.sku ?? "-"}</td>
                    <td className="px-3 py-3 font-medium text-navy">{rupiah(first.price)}</td>
                    <td className="px-3 py-3"><CostCell l={first} onSaved={(v) => patch(first.id, { cost_price: v })} /></td>
                    <td className="px-3 py-3"><StockCell l={first} onSaved={(v) => patch(first.id, { stock: v })} /></td>
                  </tr>
                );

                const prices = g.map((x) => x.price);
                const [lo, hi] = [Math.min(...prices), Math.max(...prices)];
                const costFilled = g.filter((x) => x.cost_price).length;
                const stock = g.reduce((n, x) => n + x.stock, 0);
                const open = !collapsed.has(key);
                return [
                  <tr key={key} className="cursor-pointer border-t border-slate-100 bg-slate-50/40 hover:bg-slate-50" onClick={() => toggle(key)}>
                    <td className="px-3 py-3"><div className="flex items-center gap-3">
                      {open ? <ChevronDown size={16} className="shrink-0 text-slate-400" /> : <ChevronRight size={16} className="shrink-0 text-slate-400" />}{thumb}
                      <div className="min-w-0"><p className="max-w-[220px] truncate font-semibold text-navy" title={first.name}>{first.name}</p>
                        <p className="text-xs text-slate-500"><span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-semibold text-slate-600">{g.length} variasi</span>{statusNote && ` · ${statusNote}`}</p></div></div></td>
                    {shopCell}
                    <td className="px-3 py-3 text-xs text-slate-400">—</td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-navy">{lo === hi ? rupiah(lo) : `${rupiah(lo)} – ${rupiah(hi)}`}</td>
                    <td className="px-3 py-3 text-xs">{costFilled === g.length ? <span className="font-semibold text-emerald-600">HPP lengkap</span> : <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700">{costFilled}/{g.length} variasi terisi</span>}</td>
                    <td className="px-3 py-3"><span className="font-semibold text-navy">{stock.toLocaleString("id-ID")}</span><span className="block text-[11px] text-slate-400">total</span></td>
                  </tr>,
                  ...(open ? g.map((l, i) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pl-10 pr-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-6 w-3 shrink-0 border-l-2 border-slate-200 ${i === g.length - 1 ? "h-3 self-start rounded-bl border-b-2" : ""}`} />
                          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#c2410c]">{l.model_name || "Variasi"}</span>
                          {l.status !== "NORMAL" && <span className="text-xs text-slate-400">{l.status === "UNLIST" ? "Diarsipkan" : l.status}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-slate-500">{l.sku ?? "-"}</td>
                      <td className="px-3 py-2.5 text-navy">{rupiah(l.price)}</td>
                      <td className="px-3 py-2.5"><CostCell l={l} onSaved={(v) => patch(l.id, { cost_price: v })} /></td>
                      <td className="px-3 py-2.5"><StockCell l={l} onSaved={(v) => patch(l.id, { stock: v })} /></td>
                    </tr>
                  )) : []),
                ];
              })}
            </tbody>
          </table>
          {d && d.listings.data.length === 0 && <p className="py-14 text-center text-sm text-slate-500">Belum ada listing. Hubungkan toko Shopee lalu klik Sinkronkan.</p>}
        </div>
        {d && <Pager page={d.listings.current_page} last={d.listings.last_page} onPage={setPage} total={d.listings.total} perPage={perPage} onPerPage={setPerPage} />}
      </Panel>
    </div>
  );
}

export default function Page() {
  return <Suspense><Products /></Suspense>;
}
