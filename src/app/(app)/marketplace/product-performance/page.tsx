"use client";
import {
  AlertTriangle,
  Eye,
  Heart,
  Loader2,
  Megaphone,
  Package,
  RefreshCcw,
  Search,
  ShoppingBag,
  Star,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { DateRange } from "@/components/DateRange";
import { PageHead, Pager, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Shop = { id: number; shop_name: string; is_demo: boolean; status: string };

type PerfItem = {
  key: string;
  shop_id: number;
  shop_name: string;
  item_id: number;
  name: string;
  sku: string | null;
  image: string | null;
  price_min: number;
  price_max: number;
  stock: number;
  status: string;
  views: number;
  likes: number;
  sales: number;
  rating: number | null;
  comments: number;
  views_7d: number | null;
  sales_7d: number | null;
  stat_date: string | null;
  period_units: number;
  period_orders: number;
  period_revenue: number;
  conversion_rate: number;
  needs_attention: boolean;
  is_advertised: boolean;
  ad_active: boolean;
  ad_auto: boolean;
  ad_campaigns: number;
  ad_expense: number;
  ad_gmv: number;
  ad_clicks: number;
  ad_impressions: number;
  ad_orders: number;
  ad_roas: number;
};

type PerfData = {
  from: string;
  to: string;
  shops: Shop[];
  summary: {
    total_products: number;
    total_views: number;
    total_likes: number;
    total_sales: number;
    period_units: number;
    period_revenue: number;
    avg_rating: number | null;
    low_conversion_count: number;
    advertised_count: number;
    total_ad_expense: number;
    total_ad_gmv: number;
    total_ad_roas: number;
    last_synced_date: string | null;
  };
  items: PerfItem[];
};

const wibDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
};

const num = (n: number) => n.toLocaleString("id-ID");

export default function ShopeeProductPerformancePage() {
  const [range, setRange] = useState({ from: wibDate(-29), to: wibDate(0) });
  const [shopId, setShopId] = useState("");
  const [sort, setSort] = useState("revenue");
  const [adFilter, setAdFilter] = useState<"all" | "advertised" | "organic">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      from: range.from,
      to: range.to,
      sort,
      ad_filter: adFilter,
      ...(shopId ? { shop_id: shopId } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
    });
    api<PerfData>(`/marketplace/listings/performance?${params}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range.from, range.to, shopId, sort, adFilter, q]);

  useEffect(() => {
    setPage(1);
  }, [range.from, range.to, shopId, sort, adFilter, q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const syncFromShopee = async () => {
    setSyncing(true);
    setNotice("");
    try {
      const res = await api<{ products: number; errors: string[] }>("/marketplace/listings/stats/sync", { method: "POST" });
      setNotice(
        `Statistik Shopee diperbarui untuk ${res.products} produk${res.errors.length ? ` (${res.errors.join("; ")})` : ""}.`,
      );
      load();
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal memperbarui statistik Shopee", "Gagal");
    } finally {
      setSyncing(false);
    }
  };

  const s = data?.summary;
  const shops = data?.shops ?? [];
  const allItems = data?.items ?? [];
  const totalItems = allItems.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(page, lastPage);
  const pagedItems = allItems.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <div className="space-y-4">
      <PageHead title="Performa Produk Shopee" tutorial={false} crumbs={[["Marketplace"], ["Performa Produk"]]}>
        <div className="flex flex-wrap items-center gap-2">
          <DateRange value={range} onChange={setRange} />
          {shops.length > 1 && (
            <Select className="input h-10 w-52 bg-white" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">Semua toko ({shops.length})</option>
              {shops.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.shop_name}
                </option>
              ))}
            </Select>
          )}
          <button
            onClick={syncFromShopee}
            disabled={syncing}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73211] disabled:opacity-50"
          >
            {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
            Sinkron Statistik Shopee
          </button>
        </div>
      </PageHead>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Panel className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Dilihat (30 Hari Shopee)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Eye size={15} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{num(s?.total_views ?? 0)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Favorit: {num(s?.total_likes ?? 0)} · Rating: {s?.avg_rating ? `${s.avg_rating} ★` : "-"}
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Penjualan Periode Ini</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp size={15} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{rupiah(s?.period_revenue ?? 0)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {num(s?.period_units ?? 0)} unit terjual ({range.from} s/d {range.to})
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Produk Diiklankan</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[#ee4d2d]">
              <Megaphone size={15} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{num(s?.advertised_count ?? 0)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Dari {num(s?.total_products ?? 0)} produk tampil
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Biaya &amp; ROAS Iklan</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Heart size={15} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{rupiah(s?.total_ad_expense ?? 0)}</p>
          <p className="mt-1 text-[11px] text-indigo-600">
            Omzet Iklan: <b>{rupiah(s?.total_ad_gmv ?? 0)}</b> · ROAS <b>{(s?.total_ad_roas ?? 0).toFixed(2)}</b>
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Banyak Dilihat, Belum Laku</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle size={15} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{num(s?.low_conversion_count ?? 0)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            ≥ 100 views namun 0 terjual di periode ini
          </p>
        </Panel>
      </div>

      {/* Filter & Product Table */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {(
                [
                  ["all", "Semua Produk"],
                  ["advertised", "Diiklankan"],
                  ["organic", "Non-Iklan"],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setAdFilter(k)}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    adFilter === k ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="relative w-60">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input
                className="input h-9 w-full pl-8 text-xs"
                placeholder="Cari nama produk atau SKU…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select className="input h-9 w-56 text-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="revenue">Urutkan: Omzet Periode Tertinggi</option>
              <option value="units">Urutkan: Terjual Periode Terbanyak</option>
              <option value="ad_expense">Urutkan: Biaya Iklan Tertinggi</option>
              <option value="ad_roas">Urutkan: ROAS Iklan Tertinggi</option>
              <option value="views">Urutkan: Paling Banyak Dilihat</option>
              <option value="likes">Urutkan: Favorit Terbanyak</option>
              <option value="sales">Urutkan: Total Terjual (Kumulatif)</option>
              <option value="rating">Urutkan: Rating Tertinggi</option>
              <option value="attention">Urutkan: Banyak Dilihat, Belum Laku</option>
            </Select>
          </div>
          <span className="text-xs text-slate-400">
            {data ? `${num(data.items.length)} produk ditampilkan` : "Memuat…"}
          </span>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Memuat performa produk…
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Package size={30} className="text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Belum ada data produk Shopee</p>
            <p className="max-w-md text-xs text-slate-500">
              Pastikan produk sudah disinkronkan di menu <b>Semua Produk</b> lalu klik <b>Sinkron Statistik Shopee</b> di kanan atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1140px] border-collapse text-left text-xs tabular-nums">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-3 py-3 text-right">Dilihat (30h)</th>
                  <th className="px-3 py-3 text-right">Favorit</th>
                  <th className="px-3 py-3 text-right">Terjual Periode</th>
                  <th className="px-3 py-3 text-right">Omzet Periode</th>
                  <th className="px-3 py-3 text-right">Biaya Iklan</th>
                  <th className="px-3 py-3 text-right">Omzet &amp; ROAS Iklan</th>
                  <th className="px-3 py-3 text-right">Total Terjual</th>
                  <th className="px-3 py-3 text-right">Rating</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedItems.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <Package size={16} />
                          </span>
                        )}
                        <div className="min-w-0 max-w-xs">
                          <p className="truncate font-semibold text-slate-800" title={item.name}>
                            {item.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <span>{item.shop_name}</span>
                            {item.sku && <span className="font-mono text-slate-500">· {item.sku}</span>}
                            <span>· {rupiah(item.price_min)}{item.price_max > item.price_min ? `–${rupiah(item.price_max)}` : ""}</span>
                            {item.is_advertised && (
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                item.ad_active ? "bg-orange-50 text-[#ee4d2d]" : "bg-slate-100 text-slate-600"
                              }`}>
                                <Megaphone size={10} />
                                {item.ad_auto ? "Iklan Otomatis" : item.ad_active ? "Diiklankan" : "Iklan Nonaktif"}
                              </span>
                            )}
                            {item.needs_attention && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                Perlu optimasi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-semibold text-slate-800">{num(item.views)}</span>
                      {item.views_7d !== null && item.views_7d > 0 && (
                        <span className="block text-[10px] font-medium text-sky-600">+{num(item.views_7d)} (7h)</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">{num(item.likes)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <ShoppingBag size={12} className="text-emerald-600" />
                        {num(item.period_units)}
                      </span>
                      <span className="block text-[10px] text-slate-400">{num(item.period_orders)} pesanan</span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{rupiah(item.period_revenue)}</td>
                    <td className="px-3 py-3 text-right">
                      {item.ad_expense > 0 ? (
                        <>
                          <span className="font-semibold text-slate-900">{rupiah(item.ad_expense)}</span>
                          <span className="block text-[10px] text-slate-400">{num(item.ad_clicks)} klik</span>
                        </>
                      ) : (
                        <span className="text-slate-400">{item.ad_auto ? "Otomatis" : "-"}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.ad_expense > 0 || item.ad_gmv > 0 ? (
                        <>
                          <span className="font-semibold text-[#ee4d2d]">{rupiah(item.ad_gmv)}</span>
                          <span className="block text-[10px] font-medium text-indigo-600">
                            ROAS {item.ad_roas.toFixed(2)} · {num(item.ad_orders)} ord
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-medium text-slate-700">{num(item.sales)}</span>
                      {item.sales_7d !== null && item.sales_7d > 0 && (
                        <span className="block text-[10px] font-medium text-emerald-600">+{num(item.sales_7d)} (7h)</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.rating !== null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {item.rating.toFixed(1)}
                          <span className="font-normal text-slate-400">({num(item.comments)})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${item.stock === 0 ? "text-rose-600" : item.stock <= 5 ? "text-amber-600" : "text-slate-700"}`}>
                        {num(item.stock)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && totalItems > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <Pager
              page={safePage}
              last={lastPage}
              onPage={setPage}
              total={totalItems}
              perPage={perPage}
              onPerPage={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
