"use client";
import Link from "next/link";
import {
  AlertTriangle, Calculator, Check, CheckCircle2, ChevronDown, ChevronUp,
  Archive, BarChart3, Copy, Eye, ExternalLink, Loader2, Megaphone, Package, Pencil, Plus, RefreshCcw, Rocket, Search, Tag, X,
} from "lucide-react";
import { addToBoost, BoostPanel, PriceDialog, StatLine, TextDialog, type ItemStat } from "@/components/marketplace/ProductTools";
import { BulkCostDialog } from "@/components/marketplace/BulkCostDialog";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Pager, PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";
import { showAlert } from "@/components/Dialogs";

type Listing = {
  id: number; marketplace_shop_id: number; item_id: number; model_id: number; name: string; model_name: string | null; sku: string | null; item_sku: string | null;
  price: number; cost_price: number | null; stock: number; status: string; image: string | null; stock_master_id?: number | null;
  shop: { id: number; shop_name: string; shop_id: number; is_demo: boolean };
  product: { id: number; name: string; sku: string | null; cost_price: number | null } | null;
};

type Stats = {
  total: number;
  with_cost: number;
  out_of_stock: number;
  low_stock?: number;
  stock: number;
  tabs?: { all: number; live: number; action: number; reviewing: number; unlist: number };
};

type Data = { listings: Paginated<Listing>; stats: Stats; item_stats?: Record<string, ItemStat> };

const STATUS_TABS: { key: string; label: string; tabKey: keyof NonNullable<Stats["tabs"]> }[] = [
  { key: "", label: "Semua", tabKey: "all" },
  { key: "NORMAL", label: "Live", tabKey: "live" },
  { key: "BANNED", label: "Perlu Tindakan", tabKey: "action" },
  { key: "REVIEWING", label: "Sedang Ditinjau Shopee", tabKey: "reviewing" },
  { key: "UNLIST", label: "Belum Ditampilkan", tabKey: "unlist" },
];

const STATUS_BADGE: Record<string, [string, string]> = {
  NORMAL: ["Live", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  REVIEWING: ["Sedang Ditinjau", "bg-amber-50 text-amber-700 ring-amber-200"],
  UNLIST: ["Belum Ditampilkan", "bg-slate-100 text-slate-600 ring-slate-200"],
  BANNED: ["Perlu Tindakan", "bg-rose-50 text-rose-700 ring-rose-200"],
  SHOPEE_DELETE: ["Dihapus Shopee", "bg-rose-50 text-rose-700 ring-rose-200"],
};

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
    const margin = l.cost_price && l.price > 0 ? Math.round(((l.price - l.cost_price) / l.price) * 100) : null;
    return (
      <button onClick={() => setEdit(true)} className="group inline-flex items-center gap-1.5 text-left">
        {l.cost_price
          ? <span><b className="text-slate-800">{rupiah(l.cost_price)}</b><span className={`block whitespace-nowrap text-[11px] ${margin !== null && margin < 15 ? "text-orange-600" : "text-slate-400"}`}>Margin {margin}%</span></span>
          : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/60">+ Isi HPP</span>}
        <Pencil size={12} className="text-slate-300 group-hover:text-[#ee4d2d]" />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
        <input autoFocus type="number" min={0} className="input h-8 w-28 pl-7 pr-2 text-xs" value={v} placeholder="0" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} /></span>
      <button onClick={save} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ee4d2d] text-white"><Check size={14} /></button>
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
        <span className={`font-medium ${l.stock <= 0 ? "font-semibold text-rose-600" : l.stock <= 10 ? "text-amber-600" : "text-slate-800"}`}>
          {l.stock.toLocaleString("id-ID")}
        </span>
        <Pencil size={12} className="text-slate-300 group-hover:text-[#ee4d2d]" />
        {l.stock_master_id && <span title="Ikut Stok Master: mengubah stok ini mengubah stok di semua toko dengan SKU yang sama" className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">Master</span>}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus type="number" min={0} className="input h-8 w-20 px-2 text-xs" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <button onClick={save} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ee4d2d] text-white"><Check size={14} /></button>
      <button onClick={() => setEdit(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
    </span>
  );
}

// Column layout matching Shopee Seller Centre's "Produk Saya" table.
const COLS = "grid grid-cols-[minmax(0,2.7fr)_minmax(0,1.05fr)_minmax(0,0.75fr)_minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-4 items-start";

function Products() {
  const sp = useSearchParams();
  const [statusTab, setStatusTab] = useState("");
  const [filters, setFilters] = useState({
    shop_id: sp.get("shop_id") ?? "",
    cost: sp.get("cost") ?? "",
    stock: sp.get("stock") ?? "",
    search: "",
  });
  const [draftSearch, setDraftSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<{ id: number; shop_name: string; status?: string }[]>([]);
  const [bulk, setBulk] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  // Expanded variation lists (by default show up to 3 SKU variations per product, like Shopee Seller Centre).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [priceKeys, setPriceKeys] = useState<string[] | null>(null);
  const [textItem, setTextItem] = useState<{ shop: number; item: number } | null>(null);
  const [boostKey, setBoostKey] = useState(0);
  const [boosted, setBoosted] = useState<Set<string>>(new Set());
  const [toolBusy, setToolBusy] = useState("");

  const load = useCallback(() => {
    const qs = new URLSearchParams({
      ...(filters.shop_id ? { shop_id: filters.shop_id } : {}),
      ...(statusTab ? { status: statusTab } : {}),
      ...(filters.cost ? { cost: filters.cost } : {}),
      ...(filters.stock ? { stock: filters.stock } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      page: String(page),
      per_page: String(perPage),
    });
    api<Data>(`/marketplace/listings?${qs}`).then(setD);
  }, [filters, statusTab, page, perPage]);

  useEffect(() => { const t = setTimeout(load, 150); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    api("/marketplace/shops").then((x) => setShops((x.shops ?? []).filter((s: any) => s.status !== "disconnected"))).catch(() => setShops([]));
  }, []);

  const patch = (id: number, p: Partial<Listing>) =>
    setD((cur) => cur && { ...cur, listings: { ...cur.listings, data: cur.listings.data.map((x) => (x.id === id ? { ...x, ...p } : x)) } });

  const set = (k: keyof typeof filters, v: string) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const applySearch = () => { setFilters((f) => ({ ...f, search: draftSearch.trim() })); setPage(1); };
  const resetFilters = () => {
    setDraftSearch("");
    setFilters({ shop_id: filters.shop_id, cost: "", stock: "", search: "" });
    setPage(1);
  };

  const syncProducts = async () => {
    const targets = filters.shop_id ? shops.filter((s) => String(s.id) === filters.shop_id) : shops;
    if (!targets.length) return;
    setSyncing(true); setNotice("");
    try {
      const res = await Promise.all(targets.map((s) => api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "products" } })));
      const count = res.reduce((n, r) => n + (r.result?.products ?? 0), 0);
      setNotice(`Sinkronisasi selesai: ${count} variasi produk diperbarui dari ${targets.length} toko.`);
      load();
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Sinkronisasi produk gagal", "Gagal");
    } finally {
      setSyncing(false);
    }
  };

  const syncStats = async () => {
    setToolBusy("stats"); setNotice("");
    try {
      const r = await api<{ products: number; errors: string[] }>("/marketplace/listings/stats/sync", { method: "POST" });
      if (r.errors.length) showAlert(r.errors.join("\n"), "Sebagian gagal");
      setNotice(`Statistik ${r.products} produk diperbarui dari Shopee.`);
      load();
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal memperbarui statistik", "Gagal"); } finally { setToolBusy(""); }
  };
  const selectedItems = () => selected.map((k) => k.split(":").map(Number) as [number, number]);
  const setListed = async (unlist: boolean) => {
    setToolBusy(unlist ? "unlist" : "list"); setNotice("");
    try {
      const r = await api<{ updated: number; failed: Record<string, string> }>("/marketplace/listings/unlist", { method: "POST", json: { unlist, items: selectedItems().map(([shop_id, item_id]) => ({ shop_id, item_id })) } });
      const f = Object.entries(r.failed);
      if (f.length) showAlert(f.map(([k, v]) => `${k}: ${v}`).join("\n"), `${f.length} produk gagal`);
      setNotice(`${r.updated} produk ${unlist ? "diarsipkan (tidak ditampilkan)" : "ditampilkan lagi"} di Shopee.`);
      setSelected([]); load();
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal", "Gagal"); } finally { setToolBusy(""); }
  };
  const boostSelected = async () => {
    setToolBusy("boost"); setNotice("");
    try { await addToBoost(selected); setNotice(`${selected.length} produk masuk daftar Naikkan Otomatis.`); setSelected([]); setBoostKey((n) => n + 1); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal", "Gagal"); } finally { setToolBusy(""); }
  };
  const realSelected = selected.filter((k) => !(d?.listings.data.find((l) => `${l.marketplace_shop_id}:${l.item_id}` === k)?.shop.is_demo));

  const s = d?.stats;
  const missingCost = s ? Math.max(0, s.total - s.with_cost) : 0;
  // Group variation rows by Shopee product (shop + item_id) keeping the server's order.
  const groups = Object.values((d?.listings.data ?? []).reduce<Record<string, Listing[]>>((acc, l) => {
    (acc[`${l.marketplace_shop_id}:${l.item_id}`] ??= []).push(l);
    return acc;
  }, {}));

  const toggleExpand = (k: string) => setExpanded((cur) => {
    const next = new Set(cur);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const allKeys = groups.map((g) => `${g[0].marketplace_shop_id}:${g[0].item_id}`);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.includes(k));
  const toggleSelectAll = (on: boolean) => setSelected(on ? allKeys : []);
  const toggleSelect = (k: string, on: boolean) => setSelected(on ? [...selected, k] : selected.filter((x) => x !== k));

  const subTabActive =
    filters.cost === "empty" ? "no_cost" : filters.stock === "low" ? "low" : filters.stock === "out" ? "out" : "all";

  const pickSubTab = (t: "all" | "no_cost" | "low" | "out") => {
    setFilters((f) => ({
      ...f,
      cost: t === "no_cost" ? "empty" : "",
      stock: t === "low" ? "low" : t === "out" ? "out" : "",
    }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHead title="Produk Saya" tutorial={false} crumbs={[["Marketplace"], ["Semua Produk"]]}>
        {shops.length > 1 && (
          <Select className="input h-10 w-52 bg-white" value={filters.shop_id} onChange={(e) => set("shop_id", e.target.value)}>
            <option value="">Semua Toko ({shops.length})</option>
            {shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
          </Select>
        )}
        <button onClick={syncProducts} disabled={syncing || !shops.length} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}Sinkronkan Produk
        </button>
        <button onClick={syncStats} disabled={!!toolBusy || !shops.length} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {toolBusy === "stats" ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}Perbarui Statistik
        </button>
        <button onClick={() => setBulk(true)} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Calculator size={15} />Input HPP Massal
        </button>
        <Link href="/marketplace/publish" className="flex h-10 items-center gap-1.5 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#d73f22]">
          <Plus size={16} />Tambah Produk Baru
        </Link>
      </PageHead>

      {notice && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} />{notice}
        </p>
      )}
      <BoostPanel reloadKey={boostKey} onChanged={setBoosted} />
      {priceKeys && d && (
        <PriceDialog rows={d.listings.data.filter((l) => priceKeys.includes(`${l.marketplace_shop_id}:${l.item_id}`))} onClose={() => setPriceKeys(null)}
          onSaved={(p, msg) => { Object.entries(p).forEach(([id, price]) => patch(Number(id), { price })); if (msg) { setNotice(msg); setPriceKeys(null); setSelected([]); } }} />
      )}
      {textItem && (
        <TextDialog shopId={textItem.shop} itemId={textItem.item} onClose={() => setTextItem(null)}
          onSaved={(name) => { setD((cur) => cur && { ...cur, listings: { ...cur.listings, data: cur.listings.data.map((x) => (x.marketplace_shop_id === textItem.shop && x.item_id === textItem.item ? { ...x, name } : x)) } }); setTextItem(null); setNotice("Judul & deskripsi diperbarui di Shopee."); }} />
      )}
      {realSelected.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm text-white shadow-lg">
          <b className="mr-2">{realSelected.length} produk dipilih</b>
          <button onClick={() => setPriceKeys(realSelected)} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 font-semibold hover:bg-white/20"><Tag size={14} />Ubah Harga</button>
          <button onClick={boostSelected} disabled={!!toolBusy} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 font-semibold hover:bg-white/20 disabled:opacity-50">{toolBusy === "boost" ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}Naikkan Otomatis</button>
          <button onClick={() => setListed(true)} disabled={!!toolBusy} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 font-semibold hover:bg-white/20 disabled:opacity-50">{toolBusy === "unlist" ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}Arsipkan</button>
          <button onClick={() => setListed(false)} disabled={!!toolBusy} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 font-semibold hover:bg-white/20 disabled:opacity-50">{toolBusy === "list" ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}Tampilkan</button>
          <button onClick={() => setSelected([])} className="ml-auto flex h-8 items-center gap-1 rounded-lg px-2 text-white/80 hover:text-white"><X size={14} />Batal</button>
        </div>
      )}
      {bulk && <BulkCostDialog onClose={() => setBulk(false)} onSaved={(m) => { setBulk(false); setNotice(m); load(); }} />}

      <Panel className="overflow-hidden p-0">
        {/* Top Status Tabs (Semua / Live / Perlu Tindakan / Sedang Ditinjau Shopee / Belum Ditampilkan) */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-white px-5">
          {STATUS_TABS.map((t) => {
            const active = statusTab === t.key;
            const count = s?.tabs?.[t.tabKey];
            return (
              <button
                key={t.key || "all"}
                type="button"
                onClick={() => { setStatusTab(t.key); setPage(1); }}
                className={`relative whitespace-nowrap px-4 py-3.5 text-sm transition ${
                  active ? "font-semibold text-[#ee4d2d]" : "text-slate-600 hover:text-[#ee4d2d]"
                }`}
              >
                {t.label}{count !== undefined ? ` (${count})` : ""}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#ee4d2d]" />}
              </button>
            );
          })}
        </div>

        {/* Info Banner for Missing HPP (like Shopee Seller Centre's optimization strip) */}
        {s && missingCost > 0 && (
          <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200/70 bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-white px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ee4d2d]/10 text-[#ee4d2d]">
                <AlertTriangle size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Lengkapi HPP pada <span className="text-[#ee4d2d]">{missingCost} variasi produk</span> untuk perhitungan Laba Bersih otomatis
                </p>
                <p className="text-xs text-slate-500">
                  Setelah HPP terisi, laporan penjualan & laba bersih toko Shopee akan terhitung otomatis secara akurat.
                </p>
              </div>
            </div>
            <button onClick={() => setBulk(true)} className="rounded-lg bg-[#ee4d2d] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#d73f22]">
              Isi HPP Sekarang
            </button>
          </div>
        )}

        {/* Sub-tabs (Semua / Perlu Isi HPP / Tambah Stok / Stok Habis) */}
        <div className="mt-2 flex gap-1 overflow-x-auto border-b border-slate-100 px-5">
          {[
            { id: "all" as const, label: "Semua", count: null, dot: false },
            { id: "no_cost" as const, label: "Perlu Isi HPP", count: missingCost, dot: missingCost > 0 },
            { id: "low" as const, label: "Tambah Stok", count: s?.low_stock ?? 0, dot: (s?.low_stock ?? 0) > 0 },
            { id: "out" as const, label: "Stok Habis", count: s?.out_of_stock ?? 0, dot: (s?.out_of_stock ?? 0) > 0 },
          ].map((st) => {
            const active = subTabActive === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => pickSubTab(st.id)}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-[13px] transition ${
                  active ? "font-semibold text-[#ee4d2d]" : "text-slate-600 hover:text-[#ee4d2d]"
                }`}
              >
                <span>{st.label}{st.count !== null ? ` (${st.count})` : ""}</span>
                {st.dot && <span className="h-1.5 w-1.5 rounded-full bg-[#ee4d2d]" />}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#ee4d2d]" />}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[280px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Cari Nama Produk, SKU Induk, Kode Variasi, ID Produk"
                className="input h-10 w-full pl-9 pr-8 text-sm"
              />
              {draftSearch && (
                <button
                  type="button"
                  onClick={() => { setDraftSearch(""); set("search", ""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Select className="input h-10 w-52" value={filters.shop_id} onChange={(e) => set("shop_id", e.target.value)}>
              <option value="">Semua Toko Shopee</option>
              {shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
            </Select>
            <Select className="input h-10 w-48" value={filters.cost} onChange={(e) => set("cost", e.target.value)}>
              <option value="">Status HPP: Semua</option>
              <option value="filled">HPP Sudah Diisi</option>
              <option value="empty">HPP Belum Diisi</option>
            </Select>
            <Select className="input h-10 w-44" value={filters.stock} onChange={(e) => set("stock", e.target.value)}>
              <option value="">Stok: Semua</option>
              <option value="in">Stok Tersedia</option>
              <option value="low">Stok Menipis (≤ 10)</option>
              <option value="out">Stok Habis (0)</option>
            </Select>
            <button onClick={applySearch} className="h-10 rounded-lg border border-[#ee4d2d] bg-white px-5 text-sm font-semibold text-[#ee4d2d] hover:bg-orange-50">
              Terapkan
            </button>
            <button onClick={resetFilters} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Atur ulang
            </button>
          </div>

          {/* Product Count + Filter Pills Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="mr-2 text-sm font-bold text-slate-800">
              {d ? `${d.listings.total.toLocaleString("id-ID")} Produk` : "Memuat…"}
            </span>
            {[
              { label: "Stok Menipis", active: filters.stock === "low", onClick: () => set("stock", filters.stock === "low" ? "" : "low") },
              { label: "Stok Habis", active: filters.stock === "out", onClick: () => set("stock", filters.stock === "out" ? "" : "out") },
              { label: "HPP Belum Diisi", active: filters.cost === "empty", onClick: () => set("cost", filters.cost === "empty" ? "" : "empty") },
              { label: "HPP Lengkap", active: filters.cost === "filled", onClick: () => set("cost", filters.cost === "filled" ? "" : "filled") },
            ].map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={pill.onClick}
                className={`h-7 rounded-full border px-3 text-xs transition ${
                  pill.active
                    ? "border-[#ee4d2d] bg-orange-50 font-semibold text-[#ee4d2d]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {pill.label}
              </button>
            ))}
            {s && (
              <span className="ml-auto text-xs text-slate-500">
                Total Variasi: <b className="text-slate-700">{s.total.toLocaleString("id-ID")}</b> · Total Stok: <b className="text-slate-700">{s.stock.toLocaleString("id-ID")}</b>
              </span>
            )}
          </div>
        </div>

        {/* Table Header & Product List */}
        <div className="overflow-x-auto border-t border-slate-200/80">
          <div className="min-w-[980px]">
            <div className={`${COLS} border-b border-slate-200/80 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500`}>
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  aria-label="Pilih semua produk di halaman ini"
                  className="h-4 w-4 accent-[#ee4d2d]"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
                Produk
              </span>
              <span>Harga</span>
              <span>Stok</span>
              <span>HPP (Modal / Unit)</span>
              <span>Toko & Status</span>
              <span>Aksi</span>
            </div>

            <div className="divide-y divide-slate-200/70">
              {groups.map((g) => {
                const first = g[0];
                const key = `${first.marketplace_shop_id}:${first.item_id}`;
                const hasVariations = g.length > 1 || !!first.model_id;
                const prices = g.map((x) => x.price);
                const [lo, hi] = [Math.min(...prices), Math.max(...prices)];
                const totalStock = g.reduce((n, x) => n + x.stock, 0);
                const costFilled = g.filter((x) => x.cost_price && x.cost_price > 0).length;
                const isExpanded = expanded.has(key);
                const visibleVariations = hasVariations ? (isExpanded ? g : g.slice(0, 3)) : [];
                const [badgeText, badgeClass] = STATUS_BADGE[first.status] ?? [first.status, "bg-slate-100 text-slate-600 ring-slate-200"];
                const sellerCentreUrl = `https://seller.shopee.co.id/portal/product/${first.item_id}`;

                return (
                  <div key={key} className="bg-white transition hover:bg-slate-50/30">
                    {/* Parent Product Row */}
                    <div className={`${COLS} px-5 py-4 text-[13px]`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 accent-[#ee4d2d]"
                          checked={selected.includes(key)}
                          onChange={(e) => toggleSelect(key, e.target.checked)}
                        />
                        {first.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={first.image} alt="" className="h-14 w-14 shrink-0 rounded-md border border-slate-200/80 object-cover" />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300">
                            <Package size={22} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass}`}>
                              {badgeText}
                            </span>
                            {hasVariations && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                {g.length} Variasi
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 font-semibold leading-snug text-slate-800" title={first.name}>
                            {first.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            SKU Induk: <span className="font-mono text-slate-500">{first.item_sku || (!hasVariations && first.sku) || "-"}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            ID Produk: <span className="font-mono text-slate-500">{first.item_id}</span>
                            {boosted.has(key) && <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-orange-50 px-1.5 text-[10px] font-semibold text-[#ee4d2d]"><Rocket size={10} />Naikkan otomatis</span>}
                          </p>
                          {!first.shop.is_demo && <StatLine s={d?.item_stats?.[key]} />}
                        </div>
                      </div>

                      {/* Harga */}
                      <div className="font-semibold text-slate-800">
                        {lo === hi ? rupiah(lo) : `${rupiah(lo)} - ${rupiah(hi)}`}
                      </div>

                      {/* Stok */}
                      <div>
                        {!hasVariations ? (
                          <StockCell l={first} onSaved={(v) => patch(first.id, { stock: v })} />
                        ) : (
                          <span className={`font-semibold ${totalStock <= 0 ? "text-rose-600" : "text-slate-800"}`}>
                            {totalStock.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>

                      {/* HPP */}
                      <div>
                        {!hasVariations ? (
                          <CostCell l={first} onSaved={(v) => patch(first.id, { cost_price: v })} />
                        ) : costFilled === g.length ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 size={13} />HPP Lengkap ({costFilled}/{g.length})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBulk(true)}
                            className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/70 hover:bg-amber-100"
                          >
                            {costFilled}/{g.length} Variasi Terisi
                          </button>
                        )}
                      </div>

                      {/* Toko & Status */}
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-700" title={first.shop.shop_name}>
                          <ShopeeMark size={14} />
                          <span className="truncate font-medium">{first.shop.shop_name.replace(/^Contoh: /, "")}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">ID Toko: {first.shop.shop_id}</p>
                      </div>

                      {/* Aksi (Vertical links like Shopee Seller Centre) */}
                      <div className="space-y-1.5 text-[13px]">
                        {!first.shop.is_demo && (
                          <>
                            <a
                              href={sellerCentreUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-medium text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              Ubah <ExternalLink size={11} />
                            </a>
                            <button onClick={() => setTextItem({ shop: first.marketplace_shop_id, item: first.item_id })} className="flex items-center gap-1 font-medium text-sky-600 hover:text-sky-700 hover:underline">
                              <Pencil size={12} />Judul & Deskripsi
                            </button>
                            <button onClick={() => setPriceKeys([key])} className="flex items-center gap-1 font-medium text-sky-600 hover:text-sky-700 hover:underline">
                              <Tag size={12} />Ubah Harga
                            </button>
                            <Link
                              href={`/marketplace/publish?copy_shop=${first.marketplace_shop_id}&copy_item=${first.item_id}`}
                              className="flex items-center gap-1 font-medium text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              <Copy size={12} />Salin Produk
                            </Link>
                            <Link
                              href={`/marketplace/ads?shop=${first.marketplace_shop_id}`}
                              className="flex items-center gap-1 font-medium text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              <Megaphone size={12} />Diiklankan
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Variation Sub-Rows (like Shopee Seller Centre's SKU list below the product) */}
                    {hasVariations && (
                      <div className="border-t border-slate-100 bg-slate-50/40 pb-2 pt-1">
                        <div className="divide-y divide-slate-100">
                          {visibleVariations.map((l) => (
                            <div key={l.id} className={`${COLS} px-5 py-2.5 text-[13px] hover:bg-slate-100/50`}>
                              <div className="flex items-start gap-3 pl-7">
                                {l.image || first.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={(l.image || first.image)!} alt="" className="h-9 w-9 shrink-0 rounded border border-slate-200/80 object-cover" />
                                ) : (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-300">
                                    <Package size={15} />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-800">{l.model_name || "Variasi"}</p>
                                  <p className="text-[11px] text-slate-400">
                                    Kode Variasi: <span className="font-mono text-slate-500">{l.sku || "-"}</span>
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    Model ID: <span className="font-mono text-slate-500">{l.model_id}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="text-slate-700">{rupiah(l.price)}</div>
                              <div><StockCell l={l} onSaved={(v) => patch(l.id, { stock: v })} /></div>
                              <div><CostCell l={l} onSaved={(v) => patch(l.id, { cost_price: v })} /></div>
                              <div className="text-xs text-slate-400">-</div>
                              <div className="text-xs text-slate-400">-</div>
                            </div>
                          ))}
                        </div>

                        {g.length > 3 && (
                          <div className="mt-1 flex justify-center border-t border-slate-100 pt-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(key)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#ee4d2d]"
                            >
                              {isExpanded ? (
                                <>Sembunyikan ({g.length} SKU Produk) <ChevronUp size={14} /></>
                              ) : (
                                <>Lihat Semua ({g.length} SKU Produk) <ChevronDown size={14} /></>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {d && d.listings.data.length === 0 && (
              <div className="py-16 text-center">
                <Package size={40} className="mx-auto text-slate-200" />
                <p className="mt-3 text-sm text-slate-500">
                  {filters.stock === "out"
                    ? "Tidak ada produk yang stoknya habis."
                    : filters.search || filters.shop_id || filters.cost || filters.stock || statusTab
                    ? "Tidak ada produk yang cocok dengan filter."
                    : "Belum ada produk Shopee. Hubungkan toko lalu klik Sinkronkan Produk."}
                </p>
              </div>
            )}
            {!d && <p className="py-16 text-center text-sm text-slate-400">Memuat daftar produk…</p>}
          </div>
        </div>

        {d && (
          <div className="border-t border-slate-100 px-5 py-3">
            <Pager page={d.listings.current_page} last={d.listings.last_page} onPage={setPage} total={d.listings.total} perPage={perPage} onPerPage={setPerPage} />
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function Page() {
  return <Suspense><Products /></Suspense>;
}
