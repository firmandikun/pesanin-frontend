"use client";
import { AlertTriangle, Info, Loader2, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHead, Panel, SearchBox } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, rupiah } from "@/lib/api";

type Row = {
  id: number; shop_id: number; shop_name: string | null; item_id: number; name: string; variant: string | null; sku: string | null; image: string | null;
  list_price: number; price: number; price_source: "sold" | "list"; fee: number; fee_rate: number; fee_estimated: boolean; hpp: number;
  ad_per_unit: number; ad_no_sales: boolean; units_30d: number; margin: number; margin_pct: number; status: "rugi" | "tipis" | "aman"; min_price: number;
};
type Data = { rows: Row[]; summary: { threshold: number; checked: number; no_hpp: number; rugi: number; tipis: number; aman: number } };
type Shop = { id: number; shop_name: string; platform?: string; status: string; is_demo: boolean };

const STATUS = {
  rugi: { label: "Rugi", cls: "bg-rose-100 text-rose-700" },
  tipis: { label: "Margin tipis", cls: "bg-amber-100 text-amber-700" },
  aman: { label: "Aman", cls: "bg-emerald-100 text-emerald-700" },
} as const;

/**
 * Cek Margin: profit per unit of every Shopee variant at the price it really sells for
 * (price − Shopee fees − HPP − ads per unit). Losing and thin products first, with the minimum safe price.
 */
export default function MarginsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [filter, setFilter] = useState<"bad" | "rugi" | "tipis" | "aman" | "all">("bad");
  const [q, setQ] = useState("");
  const [threshold, setThreshold] = useState<number | null>(null);

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((x) => (x.platform ?? "shopee") === "shopee" && x.status !== "disconnected" && !x.is_demo))).catch(() => {});
  }, []);
  const load = useCallback(() => {
    setD(null);
    api<Data>(`/marketplace/listings/margins${shop ? `?shop_id=${shop}` : ""}`).then((r) => { setD(r); setThreshold(r.summary.threshold); }).catch(() => setD({ rows: [], summary: { threshold: 10, checked: 0, no_hpp: 0, rugi: 0, tipis: 0, aman: 0 } }));
  }, [shop]);
  useEffect(() => { load(); }, [load]);

  const saveThreshold = async (v: number) => {
    setThreshold(v);
    await api("/user-settings", { method: "PUT", json: { key: "margin_alert", value: { threshold: v } } }).catch(() => {});
    load();
  };

  const rows = useMemo(() => (d?.rows ?? []).filter((r) =>
    (filter === "all" || (filter === "bad" ? r.status !== "aman" : r.status === filter))
    && (!q || `${r.name} ${r.variant ?? ""} ${r.sku ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [d, filter, q]);
  const s = d?.summary;

  return (
    <div className="space-y-5">
      <PageHead title="Cek Margin" tutorial={false} crumbs={[["Marketplace"], ["Cek Margin"]]} />

      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => setFilter("rugi")} className={`surface p-4 text-left hover:ring-2 hover:ring-rose-100 ${filter === "rugi" ? "ring-2 ring-rose-200" : ""}`}>
            <p className="text-xs font-medium text-slate-500">Dijual rugi</p><p className={`mt-1 text-xl font-bold ${s.rugi ? "text-rose-600" : "text-navy"}`}>{s.rugi}</p><p className="text-[11px] text-slate-400">Tiap terjual, uang berkurang</p>
          </button>
          <button onClick={() => setFilter("tipis")} className={`surface p-4 text-left hover:ring-2 hover:ring-amber-100 ${filter === "tipis" ? "ring-2 ring-amber-200" : ""}`}>
            <p className="text-xs font-medium text-slate-500">Margin tipis (&lt; {s.threshold}%)</p><p className={`mt-1 text-xl font-bold ${s.tipis ? "text-amber-600" : "text-navy"}`}>{s.tipis}</p><p className="text-[11px] text-slate-400">Rawan rugi kalau ada promo/iklan</p>
          </button>
          <button onClick={() => setFilter("aman")} className={`surface p-4 text-left hover:ring-2 hover:ring-emerald-100 ${filter === "aman" ? "ring-2 ring-emerald-200" : ""}`}>
            <p className="text-xs font-medium text-slate-500">Margin aman</p><p className="mt-1 text-xl font-bold text-navy">{s.aman}</p><p className="text-[11px] text-slate-400">dari {s.checked} varian dicek</p>
          </button>
          <Link href="/marketplace/products" className="surface p-4 hover:ring-2 hover:ring-slate-100">
            <p className="text-xs font-medium text-slate-500">Belum ada HPP</p><p className={`mt-1 text-xl font-bold ${s.no_hpp ? "text-slate-700" : "text-navy"}`}>{s.no_hpp}</p><p className="text-[11px] text-brand-600">Isi HPP agar ikut dicek →</p>
          </Link>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800"><Info size={14} className="mt-0.5 shrink-0" />
        Margin per unit = harga jual − biaya Shopee − HPP − biaya iklan per unit. Harga jual memakai rata-rata harga yang benar-benar dibayar pembeli 30 hari terakhir (sudah termasuk diskon/promo). Biaya Shopee memakai persentase asli toko 60 hari terakhir. Pesanin mengirim notifikasi tiap pagi kalau ada produk yang baru masuk rugi/tipis.
      </p>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={q} onChange={setQ} placeholder="Cari produk / SKU" />
          <Select className="input w-44" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="bad">Rugi & tipis</option><option value="rugi">Rugi</option><option value="tipis">Margin tipis</option><option value="aman">Aman</option><option value="all">Semua</option>
          </Select>
          {shops.length > 1 && (
            <Select className="input w-48" value={shop} onChange={(e) => setShop(e.target.value)}>
              <option value="">Semua toko ({shops.length})</option>{shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
            </Select>
          )}
          {threshold !== null && (
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">Margin minimal
              <Select className="input w-24" value={String(threshold)} onChange={(e) => saveThreshold(Number(e.target.value))}>
                {[0, 5, 10, 15, 20, 25, 30].map((v) => <option key={v} value={v}>{v}%</option>)}
              </Select>
            </label>
          )}
        </div>
        {!d && <p className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></p>}
        {d && !rows.length && (
          <p className="py-14 text-center text-sm text-slate-500">
            {d.summary.checked ? (filter === "bad" ? "Tidak ada produk rugi atau bermargin tipis. 👍" : "Tidak ada produk yang cocok.") : "Belum ada produk dengan HPP. Isi HPP di Semua Produk → Input HPP Massal."}
          </p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr><th className="px-4 py-2.5">Produk</th><th className="px-3 py-2.5 text-right">Harga jual</th><th className="px-3 py-2.5 text-right">Biaya Shopee</th><th className="px-3 py-2.5 text-right">HPP</th><th className="px-3 py-2.5 text-right">Iklan/unit</th><th className="px-3 py-2.5 text-right">Margin/unit</th><th className="px-4 py-2.5 text-right">Harga minimal</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className={r.status === "rugi" ? "bg-rose-50/40" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.image ? <img src={r.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-100" />}
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-semibold text-navy">{r.name}</p>
                          <p className="text-xs text-slate-500">{[r.variant, r.sku, shops.length > 1 ? r.shop_name : null].filter(Boolean).join(" · ") || "-"}</p>
                          <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-semibold text-navy">{rupiah(r.price)}</p>
                      <p className="text-[11px] text-slate-400">{r.price_source === "sold" ? `rata-rata ${r.units_30d} terjual` : "harga tayang"}{r.price_source === "sold" && r.price < r.list_price ? ` · tayang ${rupiah(r.list_price)}` : ""}</p>
                    </td>
                    <td className="px-3 py-3 text-right"><p>{rupiah(r.fee)}</p><p className="text-[11px] text-slate-400">{r.fee_rate}%{r.fee_estimated ? " (perkiraan)" : ""}</p></td>
                    <td className="px-3 py-3 text-right">{rupiah(r.hpp)}</td>
                    <td className="px-3 py-3 text-right">
                      {r.ad_per_unit ? rupiah(r.ad_per_unit) : "-"}
                      {r.ad_no_sales && <p className="flex items-center justify-end gap-1 text-[11px] text-amber-600"><AlertTriangle size={11} />iklan jalan, belum ada penjualan</p>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className={`flex items-center justify-end gap-1 font-bold ${r.margin < 0 ? "text-rose-600" : r.status === "tipis" ? "text-amber-600" : "text-emerald-600"}`}>{r.margin < 0 && <TrendingDown size={14} />}{rupiah(r.margin)}</p>
                      <p className="text-[11px] text-slate-400">{r.margin_pct}%</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "aman" ? <span className="text-slate-400">-</span> : <><p className="font-semibold text-navy">{rupiah(r.min_price)}</p><p className="text-[11px] text-slate-400">untuk margin {s?.threshold}%</p></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
