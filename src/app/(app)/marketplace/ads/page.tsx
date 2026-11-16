"use client";
import { Check, ExternalLink, HelpCircle, Loader2, Megaphone, RefreshCcw, Search, ShieldCheck, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange, useDefaultRange } from "@/components/DateRange";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Metrics = { expense: number; gmv: number; clicks: number; orders: number; impressions: number; items_sold?: number };
type Item = { item_id: number; name: string; image: string | null; product_id: number | null };
type Campaign = Metrics & {
  id: number;
  campaign_id: number;
  name: string;
  status: string | null;
  ad_type: string | null;
  bidding_method: string | null;
  budget: number | null;
  items_sold: number;
  items: Item[];
};
type ProductRow = Item & Metrics & {
  campaigns: number;
  shared: boolean;
  status?: string | null;
  ad_type?: string | null;
  bidding_method?: string | null;
  budget?: number | null;
  items_sold?: number;
};
type DailyRow = {
  date: string;
  expense: number;
  impressions?: number;
  clicks?: number;
  gmv?: number;
  orders?: number;
  items_sold?: number;
};
type Data = {
  active_only?: boolean;
  counts?: { campaigns: number; active: number };
  status_counts?: Record<string, number>;
  from: string;
  to: string;
  total: Metrics & { items_sold?: number };
  daily: DailyRow[];
  campaigns: Campaign[];
  products: ProductRow[];
  topup_url: string | null;
  balance: { amount: number; shops: number; checked_at: string | null; stale: boolean };
};
type Shop = { id: number; shop_name: string; status: string; is_demo: boolean };

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return n.toLocaleString("id-ID");
};

const fmtDec = (n: number, digits = 2) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtRpDec = (n: number) =>
  `Rp${n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const calcRoas = (m: { gmv: number; expense: number }) => (m.expense > 0 ? m.gmv / m.expense : 0);
const calcCtr = (m: { clicks: number; impressions: number }) => (m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0);
const calcCr = (m: { orders: number; clicks: number }) => (m.clicks > 0 ? (m.orders / m.clicks) * 100 : 0);
const calcCpc = (m: { expense: number; clicks: number }) => (m.clicks > 0 ? Math.round(m.expense / m.clicks) : 0);
const calcCpm = (m: { expense: number; impressions: number }) => (m.impressions > 0 ? Math.round((m.expense / m.impressions) * 1000) : 0);
const calcCpa = (m: { expense: number; orders: number }) => (m.orders > 0 ? m.expense / m.orders : 0);
const calcAcos = (m: { expense: number; gmv: number }) => (m.gmv > 0 ? (m.expense / m.gmv) * 100 : 0);

const adKindLabel = (adType?: string | null, bidding?: string | null) => {
  if (adType === "auto") return "Iklan Produk Otomatis";
  if (bidding === "auto") return "Iklan Produk GMV Max ROAS";
  if (bidding === "manual") return "Iklan Produk Manual";
  return "Iklan Produk GMV Max ROAS";
};

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  ongoing: { label: "Berjalan", dot: "bg-emerald-500", badge: "text-emerald-600" },
  scheduled: { label: "Terjadwal", dot: "bg-sky-500", badge: "text-sky-600" },
  paused: { label: "Nonaktif", dot: "bg-amber-500", badge: "text-amber-600" },
  ended: { label: "Berakhir", dot: "bg-slate-400", badge: "text-slate-500" },
  closed: { label: "Ditutup", dot: "bg-slate-400", badge: "text-slate-500" },
};

const STATUS_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "ongoing", label: "Berjalan" },
  { key: "scheduled", label: "Terjadwal" },
  { key: "paused", label: "Nonaktif" },
  { key: "ended", label: "Berakhir" },
  { key: "closed", label: "Ditutup" },
] as const;

/** Iklan Shopee: Seller Centre Shopee Ads style performance dashboard + product/campaign table. */
export default function ShopeeAds() {
  const [range, setRange] = useState(useDefaultRange());
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [view, setView] = useState<"products" | "campaigns">("products");
  const [statusFilter, setStatusFilter] = useState<string>("ongoing");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) =>
      setShops(r.shops.filter((s) => s.status !== "disconnected")),
    );
  }, []);

  // Load all campaigns so status filter tabs (Semua / Berjalan / Nonaktif / dsb.) work seamlessly client-side
  const load = useCallback(() => {
    api<Data>(
      `/marketplace/ads?${new URLSearchParams({
        from: range.from,
        to: range.to,
        all: "1",
        ...(shop ? { shop } : {}),
      })}`,
    ).then(setD);
  }, [range, shop]);

  useEffect(() => {
    load();
  }, [load]);

  const sync = async () => {
    setBusy(true);
    setMsg("");
    try {
      for (const s of shops.filter((x) => !x.is_demo && (!shop || String(x.id) === shop))) {
        await api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "ads" } });
      }
      setMsg("Data iklan berhasil diperbarui dari Shopee Ads API.");
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Gagal mengambil data iklan");
    } finally {
      setBusy(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!d) return [];
    const term = q.trim().toLowerCase();
    return d.products.filter((p) => {
      if (statusFilter !== "all" && (p.status ?? "ongoing") !== statusFilter) return false;
      if (term && !p.name.toLowerCase().includes(term) && !String(p.item_id).includes(term)) return false;
      return true;
    });
  }, [d, statusFilter, q]);

  const filteredCampaigns = useMemo(() => {
    if (!d) return [];
    const term = q.trim().toLowerCase();
    return d.campaigns.filter((c) => {
      if (statusFilter !== "all" && (c.status ?? "") !== statusFilter) return false;
      if (
        term &&
        !c.name.toLowerCase().includes(term) &&
        !String(c.campaign_id).includes(term) &&
        !c.items.some((i) => i.name.toLowerCase().includes(term))
      )
        return false;
      return true;
    });
  }, [d, statusFilter, q]);

  const t = d?.total;
  const totalImpressions = t?.impressions ?? 0;
  const totalClicks = t?.clicks ?? 0;
  const totalCtr = calcCtr({ clicks: totalClicks, impressions: totalImpressions });
  const totalOrders = t?.orders ?? 0;
  const totalItemsSold = t?.items_sold ?? totalOrders;
  const totalGmv = t?.gmv ?? 0;
  const totalExpense = t?.expense ?? 0;
  const totalExpensePpn = Math.round(totalExpense * 1.11);
  const totalRoas = calcRoas({ gmv: totalGmv, expense: totalExpense });
  const totalActualRoas = totalExpensePpn > 0 ? totalGmv / totalExpensePpn : 0;

  return (
    <div className="space-y-4">
      <PageHead title="Iklan Shopee" tutorial={false} crumbs={[["Marketplace"], ["Iklan Shopee"]]}>
        <div className="flex flex-wrap items-center gap-2">
          <DateRange value={range} onChange={setRange} />
          {shops.length > 1 && (
            <Select className="input h-10 w-52" value={shop} onChange={(e) => setShop(e.target.value)}>
              <option value="">Semua toko ({shops.length})</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name}
                </option>
              ))}
            </Select>
          )}
          <button
            onClick={sync}
            disabled={busy}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73211] disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
            Sinkron Iklan Shopee
          </button>
        </div>
      </PageHead>

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-800">
          {msg}
        </div>
      )}

      {!d ? (
        <Panel className="py-20 text-center text-sm text-slate-400">Memuat data Iklan Shopee…</Panel>
      ) : (
        <>
          {/* Top Bar: Saldo Iklan */}
          {d.balance.shops > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#ee4d2d]">
                  <Wallet size={19} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Saldo Iklan Shopee ·{" "}
                      {shop ? shops.find((x) => String(x.id) === shop)?.shop_name : `Semua Toko (${d.balance.shops})`}
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Live API
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${d.balance.amount ? "text-slate-900" : "text-rose-600"}`}>
                    {rupiah(d.balance.amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>
                  {d.balance.stale ? "Menampilkan saldo terakhir" : "Terhubung ke Shopee Open Platform Ads API"}
                  {d.balance.checked_at &&
                    ` · ${new Date(d.balance.checked_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </span>
                {d.topup_url && (
                  <a
                    href={d.topup_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-[#ee4d2d] px-3 py-1.5 text-xs font-semibold text-[#ee4d2d] hover:bg-orange-50"
                  >
                    Isi Saldo <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {d.balance.shops > 0 && d.balance.amount === 0 && d.campaigns.some((c) => c.status === "ongoing") && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Ada kampanye berstatus <b>Berjalan</b> tetapi saldo iklan <b>Rp0</b>. Iklan tidak akan tayang sampai saldo diisi di Seller Centre.
            </div>
          )}

          {/* Section 1: Performa Iklan (Shopee Seller Centre Style) */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Performa</h2>
                <span className="text-xs text-slate-400">
                  ({range.from} s/d {range.to})
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Klik kartu metrik · Maks. 8 metrik ditampilkan sesuai Seller Centre
              </span>
            </div>

            {/* 8 KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {/* 1. Iklan Dilihat */}
              <div className="relative rounded-lg border border-sky-500/80 bg-white p-3 shadow-2xs">
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-tr-md rounded-bl-md bg-sky-500 text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span className="truncate">Iklan Dilihat</span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900" title={totalImpressions.toLocaleString("id-ID")}>
                  {fmtCompact(totalImpressions)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {totalImpressions.toLocaleString("id-ID")} tayangan
                </p>
              </div>

              {/* 2. Jumlah Klik */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">Jumlah Klik</span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">{totalClicks.toLocaleString("id-ID")}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  CPC {rupiah(calcCpc({ expense: totalExpense, clicks: totalClicks }))}
                </p>
              </div>

              {/* 3. Persentase Klik */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">Persentase Klik</span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">{fmtDec(totalCtr)}%</p>
                <p className="mt-0.5 text-[11px] text-emerald-600">
                  {totalCtr >= 2 ? "CTR Optimal" : "CTR Standar"}
                </p>
              </div>

              {/* 4. Pesanan (Konversi) */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">Pesanan</span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">{totalOrders.toLocaleString("id-ID")}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  CR {fmtDec(calcCr({ orders: totalOrders, clicks: totalClicks }))}%
                </p>
              </div>

              {/* 5. Produk Terjual */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">Produk Terjual</span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">{totalItemsSold.toLocaleString("id-ID")}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Dari konversi iklan</p>
              </div>

              {/* 6. Penjualan */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">Penjualan</span>
                </div>
                <p className="mt-2 truncate text-lg font-bold text-slate-900" title={rupiah(totalGmv)}>
                  {rupiah(totalGmv)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  ACOS {fmtDec(calcAcos({ expense: totalExpense, gmv: totalGmv }))}%
                </p>
              </div>

              {/* 7. Biaya Iklan */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">Biaya Iklan</span>
                </div>
                <p className="mt-2 truncate text-lg font-bold text-slate-900" title={rupiah(totalExpense)}>
                  {rupiah(totalExpense)}
                </p>
                <div className="mt-1.5 rounded border border-indigo-200 bg-indigo-50/70 px-1.5 py-0.5 text-[10px] leading-tight text-indigo-700">
                  Termasuk PPN 11%{" "}
                  <b className=" block font-bold text-indigo-800">{rupiah(totalExpensePpn)}</b>
                </div>
              </div>

              {/* 8. Efektivitas Iklan (ROAS) */}
              <div className="relative rounded-lg border border-[#ee4d2d]/80 bg-white p-3 shadow-2xs">
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-tr-md rounded-bl-md bg-[#ee4d2d] text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-[#ee4d2d]" />
                  <span className="truncate">Efektivitas Iklan (ROAS)</span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">{fmtDec(totalRoas)}</p>
                <div className="mt-1.5 rounded border border-indigo-200 bg-indigo-50/70 px-1.5 py-0.5 text-[10px] leading-tight text-indigo-700">
                  ACTUAL ROAS:{" "}
                  <b className="font-bold text-indigo-800">{fmtDec(totalActualRoas)}</b>
                </div>
              </div>
            </div>

            {/* Dual-Metric Trend Chart (Iklan Dilihat vs ROAS / Biaya) */}
            {d.daily.length > 0 && <AdsTrendChart daily={d.daily} />}
          </div>

          {/* Section 2: Daftar Iklan Produk */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs">
            <div className="border-b border-slate-100 px-5 pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">Daftar Iklan Produk</h2>
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-[#ee4d2d]">
                    Biaya per Konversi otomatis mengurangi Laba Bersih di Transaksi Pesanan
                  </span>
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  <button
                    onClick={() => setView("products")}
                    className={`rounded-md px-3 py-1.5 font-semibold transition ${
                      view === "products" ? "bg-white text-[#ee4d2d] shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Iklan Individual &amp; Grup ({d.products.length})
                  </button>
                  <button
                    onClick={() => setView("campaigns")}
                    className={`rounded-md px-3 py-1.5 font-semibold transition ${
                      view === "campaigns" ? "bg-white text-[#ee4d2d] shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Per Kampanye ({d.campaigns.length})
                  </button>
                </div>
              </div>

              {/* Status Iklan Filter Pills + Search */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="mr-1 text-slate-500">Status Iklan:</span>
                  {STATUS_FILTERS.map((sf) => {
                    const active = statusFilter === sf.key;
                    const count = d.status_counts?.[sf.key];
                    return (
                      <button
                        key={sf.key}
                        onClick={() => setStatusFilter(sf.key)}
                        className={`rounded-md border px-2.5 py-1 font-medium transition ${
                          active
                            ? "border-[#ee4d2d] bg-orange-50/60 text-[#ee4d2d]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {sf.label}
                        {typeof count === "number" ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input h-8 w-full pl-8 text-xs"
                    placeholder="Cari nama produk atau ID item…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table Content */}
            {(view === "products" ? filteredProducts.length : filteredCampaigns.length) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Megaphone size={28} className="text-slate-300" />
                {statusFilter !== "all" && (d.counts?.campaigns ?? 0) > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-slate-700">
                      Tidak ada iklan dengan status &ldquo;{STATUS_FILTERS.find((x) => x.key === statusFilter)?.label}&rdquo;
                    </p>
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="text-xs font-semibold text-[#ee4d2d] hover:underline"
                    >
                      Tampilkan Semua Iklan ({d.counts?.campaigns})
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Belum ada data kampanye Iklan Produk</p>
                    <p className="max-w-md text-xs text-slate-500">
                      Klik tombol <b>Sinkron Iklan Shopee</b> di kanan atas untuk menarik data kampanye, biaya iklan, dan konversi langsung dari Shopee Seller Centre.
                    </p>
                  </>
                )}
              </div>
            ) : view === "products" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1580px] border-collapse text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="sticky left-0 z-10 w-[330px] min-w-[330px] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_#e2e8f0]">
                        Info Iklan
                      </th>
                      <th className="px-3 py-3 whitespace-nowrap">Modal</th>
                      <th className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Diagnosis <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Biaya Iklan <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Penjualan <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          ROAS <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Iklan Dilihat <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Jumlah Klik <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Persentase Klik <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Konversi <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Tingkat Konversi <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Produk Terjual <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-[#ee4d2d]">
                          Biaya per Konversi <HelpCircle size={11} className="text-[#ee4d2d]" />
                        </span>
                      </th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Persentase Biaya Iklan (ACOS) <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const st = STATUS_META[p.status ?? "ongoing"] ?? STATUS_META.ongoing;
                      const pRoas = calcRoas(p);
                      const pCtr = calcCtr(p);
                      const pCr = calcCr(p);
                      const pCpc = calcCpc(p);
                      const pCpm = calcCpm(p);
                      const pCpa = calcCpa(p);
                      const pAcos = calcAcos(p);
                      const pPpn = Math.round(p.expense * 1.11);
                      const sold = p.items_sold || p.orders;

                      return (
                        <tr key={p.item_id} className="group align-top hover:bg-slate-50/70">
                          {/* Sticky Info Iklan */}
                          <td className="sticky left-0 z-10 bg-white px-4 py-3.5 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50/90">
                            <div className="flex items-start gap-3">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt=""
                                  className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover"
                                />
                              ) : (
                                <span className="h-12 w-12 shrink-0 rounded-md bg-slate-100" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 font-semibold text-slate-800" title={p.name}>
                                  {p.name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {adKindLabel(p.ad_type, p.bidding_method)}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {p.budget && p.budget > 0 ? `${rupiah(p.budget)}/hari` : "Tidak Terbatas"}
                                  {p.shared && " · Grup iklan"}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${st.badge}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                    {st.label}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 rounded border border-teal-500/40 bg-teal-50/60 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                                    <ShieldCheck size={11} /> Proteksi ROAS
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Modal */}
                          <td className="px-3 py-3.5 whitespace-nowrap text-slate-700">
                            <p className="font-medium">
                              {p.budget && p.budget > 0 ? rupiah(p.budget) : "Tak Terbatas"}
                            </p>
                            <p className="text-[11px] text-slate-400">Modal Harian</p>
                          </td>

                          {/* Diagnosis */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {p.expense > 0 && p.orders === 0 ? (
                              <div>
                                <p className="font-semibold text-amber-600">Tidak Ada Pesanan</p>
                                <div className="mt-1 rounded bg-slate-50 p-1.5 text-[10px] text-slate-500">
                                  Optimalkan kata kunci / bid
                                </div>
                              </div>
                            ) : p.expense > 0 && pRoas < 4 ? (
                              <div>
                                <p className="font-semibold text-rose-600">ROAS Rendah</p>
                                <div className="mt-1 rounded bg-slate-50 p-1.5 text-[10px] text-slate-600">
                                  Optimalkan untuk Pesanan
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-semibold text-emerald-600">Baik</p>
                                <span className="text-[11px] text-sky-600">Performa Stabil</span>
                              </div>
                            )}
                          </td>

                          {/* Biaya Iklan */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap">
                            <p className="font-semibold text-slate-900">{rupiah(p.expense)}</p>
                            <div className="mt-2 inline-block rounded border border-indigo-200 bg-indigo-50/60 px-2 py-1 text-center text-[10px] leading-tight text-indigo-700">
                              Termasuk PPN 11%
                              <div className="font-bold text-indigo-800">{rupiah(pPpn)}</div>
                            </div>
                          </td>

                          {/* Penjualan */}
                          <td className="px-3 py-3.5 text-right font-medium whitespace-nowrap text-slate-800">
                            {rupiah(p.gmv)}
                          </td>

                          {/* ROAS */}
                          <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-slate-800">
                            {fmtDec(pRoas)}
                          </td>

                          {/* Iklan Dilihat + CPM */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap">
                            <p className="font-medium text-slate-800" title={p.impressions.toLocaleString("id-ID")}>
                              {fmtCompact(p.impressions)}
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                              <span className="rounded bg-sky-600 px-1 text-[9px] text-white">CPM</span>
                              {rupiah(pCpm)}
                            </div>
                          </td>

                          {/* Jumlah Klik + CPC */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap">
                            <p className="font-medium text-slate-800">{p.clicks.toLocaleString("id-ID")}</p>
                            <div className="mt-2 inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              <span className="rounded bg-indigo-600 px-1 text-[9px] text-white">CPC</span>
                              {rupiah(pCpc)}
                            </div>
                          </td>

                          {/* Persentase Klik (CTR) */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap">
                            <p className="font-medium text-slate-800">{fmtDec(pCtr)}%</p>
                            {pCtr >= 2 && (
                              <div className="mt-2 inline-block rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                🔥 CTR Tinggi (Optimal)
                              </div>
                            )}
                          </td>

                          {/* Konversi */}
                          <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-slate-800">
                            {p.orders.toLocaleString("id-ID")}
                          </td>

                          {/* Tingkat Konversi */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700">
                            {fmtDec(pCr)}%
                          </td>

                          {/* Produk Terjual */}
                          <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-800">
                            {sold.toLocaleString("id-ID")}
                          </td>

                          {/* Biaya per Konversi */}
                          <td className="bg-orange-50/30 px-3 py-3.5 text-right whitespace-nowrap">
                            <p className="font-bold text-[#ee4d2d]">{fmtRpDec(pCpa)}</p>
                            {p.orders > 0 ? (
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {rupiah(p.expense)} ÷ {p.orders} konversi
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[10px] text-slate-400">Belum ada konversi</p>
                            )}
                          </td>

                          {/* Persentase Biaya Iklan (ACOS) */}
                          <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap text-slate-800">
                            {fmtDec(pAcos)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* View Per Kampanye */
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] border-collapse text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="sticky left-0 z-10 w-[320px] min-w-[320px] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_#e2e8f0]">
                        Kampanye Iklan
                      </th>
                      <th className="px-3 py-3 whitespace-nowrap">Modal Harian</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Biaya Iklan</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Penjualan</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">ROAS</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Iklan Dilihat</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Jumlah Klik</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">CTR</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Konversi</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Produk Terjual</th>
                      <th className="px-3 py-3 text-right font-bold whitespace-nowrap text-[#ee4d2d]">
                        Biaya per Konversi
                      </th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">ACOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCampaigns.map((c) => {
                      const st = STATUS_META[c.status ?? ""] ?? {
                        label: c.status ?? "-",
                        dot: "bg-slate-400",
                        badge: "text-slate-500",
                      };
                      const cRoas = calcRoas(c);
                      const cCtr = calcCtr(c);
                      const cCpa = calcCpa(c);
                      const cAcos = calcAcos(c);
                      const cPpn = Math.round(c.expense * 1.11);

                      return (
                        <tr key={c.id} className="group align-top hover:bg-slate-50/70">
                          <td className="sticky left-0 z-10 bg-white px-4 py-3.5 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50/90">
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {adKindLabel(c.ad_type, c.bidding_method)} · ID #{c.campaign_id}
                            </p>
                            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                              {c.items.map((i) => i.name).join(" · ") || "-"}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${st.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap text-slate-700">
                            {c.budget && c.budget > 0 ? rupiah(c.budget) : "Tak Terbatas"}
                          </td>
                          <td className="px-3 py-3.5 text-right whitespace-nowrap">
                            <p className="font-semibold text-slate-900">{rupiah(c.expense)}</p>
                            <span className="text-[10px] text-indigo-700">+PPN: {rupiah(cPpn)}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right font-medium whitespace-nowrap text-slate-800">
                            {rupiah(c.gmv)}
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-slate-800">
                            {fmtDec(cRoas)}
                          </td>
                          <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700">
                            {fmtCompact(c.impressions)}
                          </td>
                          <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700">
                            {c.clicks.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700">
                            {fmtDec(cCtr)}%
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-slate-800">
                            {c.orders.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700">
                            {(c.items_sold || c.orders).toLocaleString("id-ID")}
                          </td>
                          <td className="bg-orange-50/30 px-3 py-3.5 text-right font-bold whitespace-nowrap text-[#ee4d2d]">
                            {fmtRpDec(cCpa)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-700">
                            {fmtDec(cAcos)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Dual-series SVG line chart (Iklan Dilihat in Sky Blue & ROAS in Shopee Orange) matching Shopee Ads Performa chart. */
function AdsTrendChart({ daily }: { daily: DailyRow[] }) {
  const width = 920;
  const height = 210;
  const padL = 48;
  const padR = 44;
  const padT = 18;
  const padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const series = daily.map((d) => ({
    date: d.date,
    impressions: d.impressions ?? 0,
    roas: d.expense > 0 ? (d.gmv ?? 0) / d.expense : 0,
    expense: d.expense,
  }));

  const maxImp = Math.max(1, ...series.map((s) => s.impressions), ...series.map((s) => s.expense));
  const useImp = series.some((s) => s.impressions > 0);
  const leftValues = series.map((s) => (useImp ? s.impressions : s.expense));
  const maxLeft = Math.max(1, ...leftValues);
  const maxRight = Math.max(1, ...series.map((s) => s.roas));

  const xAt = (i: number) =>
    series.length <= 1 ? padL + chartW / 2 : padL + (i / (series.length - 1)) * chartW;
  const yLeft = (v: number) => padT + chartH - (v / maxLeft) * chartH;
  const yRight = (v: number) => padT + chartH - (v / maxRight) * chartH;

  const leftPath = series
    .map((s, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yLeft(useImp ? s.impressions : s.expense).toFixed(1)}`)
    .join(" ");
  const rightPath = series
    .map((s, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yRight(s.roas).toFixed(1)}`)
    .join(" ");

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-sky-600">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          {useImp ? "Iklan Dilihat" : "Biaya Iklan Harian"}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-[#ee4d2d]">
          <span className="h-2 w-2 rounded-full bg-[#ee4d2d]" />
          Efektivitas Iklan (ROAS)
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full min-w-[600px]">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + chartH * (1 - t);
            const lVal = Math.round(maxLeft * t);
            const rVal = (maxRight * t).toFixed(1).replace(".", ",");
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
                  {fmtCompact(lVal)}
                </text>
                <text x={width - padR + 6} y={y + 3} textAnchor="start" className="fill-slate-400 text-[10px]">
                  {rVal}
                </text>
              </g>
            );
          })}

          <path d={leftPath} fill="none" stroke="#0ea5e9" strokeWidth="2.2" />
          <path d={rightPath} fill="none" stroke="#ee4d2d" strokeWidth="2.2" />

          {series.map((s, i) => (
            <g key={s.date}>
              <circle
                cx={xAt(i)}
                cy={yLeft(useImp ? s.impressions : s.expense)}
                r="3"
                className="fill-white stroke-sky-500 stroke-2"
              >
                <title>
                  {s.date}: {useImp ? `${s.impressions.toLocaleString("id-ID")} dilihat` : rupiah(s.expense)} · ROAS{" "}
                  {fmtDec(s.roas)}
                </title>
              </circle>
              <circle cx={xAt(i)} cy={yRight(s.roas)} r="3" className="fill-white stroke-[#ee4d2d] stroke-2" />
              {(series.length <= 12 || i % Math.ceil(series.length / 8) === 0 || i === series.length - 1) && (
                <text x={xAt(i)} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                  {new Date(s.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
