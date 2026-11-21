"use client";
import { Check, ChevronDown, ChevronRight, ExternalLink, HelpCircle, Layers, Loader2, Megaphone, RefreshCcw, Search, ShieldCheck, Wallet } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, useDefaultRange } from "@/components/DateRange";
import { PageHead, Panel } from "@/components/kit";
import { AdsGuardPanel } from "@/components/marketplace/AdsGuardPanel";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Metrics = { expense: number; gmv: number; clicks: number; orders: number; impressions: number; items_sold?: number };
type Item = { item_id: number; name: string; image: string | null; product_id: number | null };
type Campaign = Metrics & {
  id: number;
  marketplace_shop_id?: number;
  campaign_id: number;
  name: string;
  status: string | null;
  ad_type: string | null;
  kind?: "manual" | "group" | "auto";
  bidding_method: string | null;
  budget: number | null;
  roas_target?: number | null;
  items_sold: number;
  items: Item[];
  auto_items?: Item[];
  auto_product_count?: number;
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
  kind_counts?: Record<string, number>;
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

/** Unified row for the "Iklan Individual & Grup Iklan" table so Individual, Group, and Auto ads all appear. */
type TableRow = Metrics & {
  key: string;
  kind: "manual" | "group" | "auto";
  title: string;
  subtitle: string;
  status: string;
  budget: number | null;
  roas_target?: number | null;
  image: string | null;
  collage: (string | null)[];
  childrenItems: Item[];
  productCount: number;
};

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

const adKindLabel = (kind?: string | null, adType?: string | null, bidding?: string | null) => {
  if (kind === "auto" || adType === "auto") return "Iklan Produk Otomatis";
  if (kind === "group" || adType === "group") return "Grup Iklan Produk";
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

const KIND_FILTERS = [
  { key: "all", label: "Semua Jenis" },
  { key: "manual", label: "Iklan Individual (Biasa)" },
  { key: "group", label: "Grup Iklan" },
  { key: "auto", label: "Iklan Otomatis" },
] as const;

/** 2x2 collage thumbnail used by Shopee Seller Centre for Grup Iklan & Iklan Produk Otomatis. */
function CollageThumb({ images, fallbackIcon = "auto" }: { images: (string | null)[]; fallbackIcon?: "auto" | "group" }) {
  const valid = images.filter(Boolean) as string[];
  if (valid.length === 0) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-[#ee4d2d]">
        {fallbackIcon === "group" ? <Layers size={20} /> : <Megaphone size={20} />}
      </span>
    );
  }
  const four = [valid[0], valid[1] ?? valid[0], valid[2] ?? valid[0], valid[3] ?? valid[1] ?? valid[0]];
  return (
    <div className="grid h-12 w-12 shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md border border-slate-200 bg-slate-100 p-0.5">
      {four.map((src, i) => (
        <img key={i} src={src} alt="" className="h-full w-full rounded-[2px] object-cover" />
      ))}
    </div>
  );
}

/** Iklan Shopee: Seller Centre Shopee Ads style performance dashboard + Individual, Group & Auto Product Ads. */
export default function ShopeeAds() {
  const [range, setRange] = useState(useDefaultRange());
  const [guardKey, setGuardKey] = useState(0);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [mainTab, setMainTab] = useState<"list" | "auto">("list");
  const [kindFilter, setKindFilter] = useState<"all" | "manual" | "group" | "auto">("all");
  // Default: only running ads, like what the seller checks first.
  const [statusFilter, setStatusFilter] = useState<string>("ongoing");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const reqId = useRef(0);
  const syncId = useRef(0);

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) =>
      setShops(r.shops.filter((s) => s.status !== "disconnected")),
    );
  }, []);

  const load = useCallback(async () => {
    const cur = ++reqId.current;
    setLoading(true);
    try {
      const res = await api<Data>(
        `/marketplace/ads?${new URLSearchParams({
          from: range.from,
          to: range.to,
          all: "1",
          ...(shop ? { shop } : {}),
        })}`,
      );
      if (cur === reqId.current) {
        setD(res);
      }
    } finally {
      if (cur === reqId.current) {
        setLoading(false);
      }
    }
  }, [range, shop]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Every time the user changes the date filter or shop, pull fresh Shopee Ads stats from Shopee in the background
  useEffect(() => {
    const targets = shops.filter((x) => !x.is_demo && (!shop || String(x.id) === shop));
    if (!targets.length) return;
    const sid = ++syncId.current;
    setBusy(true);
    Promise.all(targets.map((s) => api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "ads" } }).catch(() => null)))
      .then(() => {
        if (sid === syncId.current) {
          loadRef.current();
          setGuardKey((k) => k + 1); // Penjaga Iklan re-reads with the freshly synced numbers
        }
      })
      .finally(() => {
        if (sid === syncId.current) {
          setBusy(false);
        }
      });
  }, [shops, range.from, range.to, shop]);

  const sync = async () => {
    const sid = ++syncId.current;
    setBusy(true);
    setMsg("");
    try {
      for (const s of shops.filter((x) => !x.is_demo && (!shop || String(x.id) === shop))) {
        await api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "ads" } });
      }
      if (sid === syncId.current) {
        setMsg("Data iklan (Individual, Grup & Otomatis) berhasil diperbarui dari Shopee Ads API.");
        await loadRef.current();
      }
    } catch (e) {
      if (sid === syncId.current) {
        setMsg(e instanceof ApiError ? e.message : "Gagal mengambil data iklan");
      }
    } finally {
      if (sid === syncId.current) {
        setBusy(false);
      }
    }
  };

  // Build unified rows from campaigns so Individual, Group, and Auto ads all appear with zero dropped campaigns!
  const tableRows = useMemo<TableRow[]>(() => {
    if (!d) return [];
    return d.campaigns.map((c) => {
      // Store-wide automated campaigns have no specific item list
      const isStoreWideAuto = (c.ad_type === "auto" || c.kind === "auto") && (!c.items || c.items.length === 0);
      const isGroup = !isStoreWideAuto && c.items && c.items.length > 1;
      const kind: "manual" | "group" | "auto" = isStoreWideAuto ? "auto" : (isGroup ? "group" : "manual");

      const childrenItems = kind === "auto" ? (c.auto_items?.length ? c.auto_items : c.items) : c.items;
      const firstItem = childrenItems[0] ?? null;
      const title =
        kind === "manual" && firstItem
          ? firstItem.name
          : kind === "auto"
            ? c.name || "Iklan Produk Otomatis"
            : c.name || `Grup Iklan #${c.campaign_id}`;
      const productCount = c.auto_product_count ?? childrenItems.length;
      const subtitle = adKindLabel(kind, c.ad_type, c.bidding_method);
      return {
        key: `camp-${c.id}`,
        kind,
        title,
        subtitle,
        status: c.status ?? "ongoing",
        budget: c.budget,
        roas_target: c.roas_target ?? null,
        image: firstItem?.image ?? null,
        collage: childrenItems.slice(0, 4).map((i) => i.image),
        childrenItems,
        productCount,
        expense: c.expense,
        gmv: c.gmv,
        clicks: c.clicks,
        impressions: c.impressions,
        orders: c.orders,
        items_sold: c.items_sold,
      };
    });
  }, [d]);

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tableRows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (
        term &&
        !r.title.toLowerCase().includes(term) &&
        !r.childrenItems.some((i) => i.name.toLowerCase().includes(term) || String(i.item_id).includes(term))
      ) {
        return false;
      }
      return true;
    });
  }, [tableRows, kindFilter, statusFilter, q]);

  const autoCampaigns = useMemo(() => {
    if (!d) return [];
    return d.campaigns.filter((c) => (c.kind === "auto" || c.ad_type === "auto") && (!c.items || c.items.length === 0));
  }, [d]);

  const toggleExpand = (key: string) =>
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));

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

      <AdsGuardPanel shopId={shop || undefined} range={range} reloadKey={guardKey} />

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-800">
          {msg}
        </div>
      )}

      {(busy || loading) && d && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-xs font-medium text-sky-800">
          <Loader2 size={15} className="shrink-0 animate-spin text-sky-600" />
          <span>
            Memperbarui data performa iklan periode <b>{range.from}</b> s/d <b>{range.to}</b> dari Shopee Ads API…
          </span>
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
                Mencakup Iklan Individual, Grup Iklan &amp; Iklan Produk Otomatis
              </span>
            </div>

            {/* 8 KPI Cards (2 baris x 4 kolom agar lega & angka tidak terpotong) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="relative flex flex-col justify-between rounded-xl border border-sky-200 bg-sky-50/20 p-3.5">
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-tr-xl rounded-bl-md bg-sky-500 text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span>Iklan Dilihat</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900" title={totalImpressions.toLocaleString("id-ID")}>
                  {fmtCompact(totalImpressions)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {totalImpressions.toLocaleString("id-ID")} tayangan
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="text-xs font-medium text-slate-500">Jumlah Klik</div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{totalClicks.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  CPC {rupiah(calcCpc({ expense: totalExpense, clicks: totalClicks }))}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="text-xs font-medium text-slate-500">Persentase Klik (CTR)</div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{fmtDec(totalCtr)}%</p>
                <p className={`mt-1 text-[11px] font-medium ${totalCtr >= 2 ? "text-emerald-600" : "text-slate-400"}`}>
                  {totalCtr >= 2 ? "CTR Optimal" : "CTR Standar"}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="text-xs font-medium text-slate-500">Pesanan</div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{totalOrders.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  CR {fmtDec(calcCr({ orders: totalOrders, clicks: totalClicks }))}%
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="text-xs font-medium text-slate-500">Produk Terjual</div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{totalItemsSold.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-[11px] text-slate-400">Dari konversi iklan</p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="text-xs font-medium text-slate-500">Penjualan (GMV)</div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900" title={rupiah(totalGmv)}>
                  {rupiah(totalGmv)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  ACOS {fmtDec(calcAcos({ expense: totalExpense, gmv: totalGmv }))}%
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="text-xs font-medium text-slate-500">Biaya Iklan</div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900" title={rupiah(totalExpense)}>
                  {rupiah(totalExpense)}
                </p>
                <p className="mt-1 text-[11px] text-indigo-600">
                  +PPN 11%: <b className="font-semibold">{rupiah(totalExpensePpn)}</b>
                </p>
              </div>

              <div className="relative flex flex-col justify-between rounded-xl border border-[#ee4d2d]/40 bg-orange-50/20 p-3.5">
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-tr-xl rounded-bl-md bg-[#ee4d2d] text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-[#ee4d2d]" />
                  <span>Efektivitas (ROAS)</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{fmtDec(totalRoas)}</p>
                <p className="mt-1 text-[11px] text-indigo-600">
                  Actual ROAS: <b className="font-semibold">{fmtDec(totalActualRoas)}</b>
                </p>
              </div>
            </div>

            {d.daily.length > 0 && <AdsTrendChart daily={d.daily} />}
          </div>

          {/* Section 2: Daftar Iklan Produk (Matching Shopee Seller Centre Tabs) */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs">
            <div className="border-b border-slate-100 px-5 pt-4 pb-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold text-slate-800">Daftar Iklan Produk</h2>
                <span className="text-xs text-slate-500">
                  Biaya per konversi otomatis mengurangi laba bersih di Transaksi Pesanan
                </span>
              </div>

              {mainTab === "list" && (
                <>
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
                        placeholder="Cari nama iklan, grup, atau produk…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tab 2: Iklan Produk Otomatis View (Matching Shopee Seller Centre Screenshot) */}
            {mainTab === "auto" ? (
              <AutoProductAdsView
                campaigns={autoCampaigns}
                q={q}
                onSearch={setQ}
                onSync={sync}
                busy={busy}
              />
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Megaphone size={28} className="text-slate-300" />
                {(statusFilter !== "all" || kindFilter !== "all") && tableRows.length > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-slate-700">
                      Tidak ada iklan yang cocok dengan filter saat ini
                    </p>
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setKindFilter("all");
                      }}
                      className="text-xs font-semibold text-[#ee4d2d] hover:underline"
                    >
                      Tampilkan Semua Iklan ({tableRows.length})
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Belum ada data kampanye Iklan Produk</p>
                    <p className="max-w-md text-xs text-slate-500">
                      Klik tombol <b>Sinkron Iklan Shopee</b> di kanan atas untuk menarik data Iklan Individual, Grup Iklan, dan Iklan Produk Otomatis dari Shopee Seller Centre.
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Tab 1: Iklan Individual, Grup Iklan & Iklan Otomatis Table */
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1260px] border-collapse text-left text-xs tabular-nums">
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="sticky left-0 z-10 w-[300px] min-w-[300px] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_#e2e8f0]">
                        Info Iklan
                      </th>
                      <th className="px-3 py-3 whitespace-nowrap">Modal</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          Target ROAS <HelpCircle size={11} className="text-slate-400" />
                        </span>
                      </th>
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
                    {filteredRows.map((r) => {
                      const st = STATUS_META[r.status] ?? STATUS_META.ongoing;
                      const pRoas = calcRoas(r);
                      const pCtr = calcCtr(r);
                      const pCr = calcCr(r);
                      const pCpc = calcCpc(r);
                      const pCpm = calcCpm(r);
                      const pCpa = calcCpa(r);
                      const pAcos = calcAcos(r);
                      const pPpn = Math.round(r.expense * 1.11);
                      const sold = r.items_sold || r.orders;
                      const isGroupOrAuto = r.kind === "group" || r.kind === "auto";
                      const isOpen = !!expandedRows[r.key];

                      return (
                        <Fragment key={r.key}>
                          <tr className="group align-top hover:bg-slate-50/70">
                            {/* Sticky Info Iklan */}
                            <td className="sticky left-0 z-10 bg-white px-4 py-3.5 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50/90">
                              <div className="flex items-start gap-3">
                                {isGroupOrAuto ? (
                                  <CollageThumb images={r.collage} fallbackIcon={r.kind === "group" ? "group" : "auto"} />
                                ) : r.image ? (
                                  <img
                                    src={r.image}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover"
                                  />
                                ) : (
                                  <span className="h-12 w-12 shrink-0 rounded-md bg-slate-100" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="line-clamp-2 font-semibold text-slate-800" title={r.title}>
                                      {r.title}
                                    </p>
                                    {isGroupOrAuto && r.childrenItems.length > 0 && (
                                      <button
                                        onClick={() => toggleExpand(r.key)}
                                        className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                        title="Lihat produk dalam iklan ini"
                                      >
                                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                        r.kind === "auto"
                                          ? "bg-orange-50 text-[#ee4d2d]"
                                          : r.kind === "group"
                                            ? "bg-violet-50 text-violet-700"
                                            : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {r.subtitle}
                                    </span>
                                    {isGroupOrAuto && (
                                      <button
                                        onClick={() => (r.kind === "auto" ? setMainTab("auto") : toggleExpand(r.key))}
                                        className="text-[10px] font-semibold text-sky-600 hover:underline"
                                      >
                                        {r.productCount} Produk
                                      </button>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    {r.budget && r.budget > 0 ? `${rupiah(r.budget)}/hari` : "Tidak Terbatas"}
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
                                {r.budget && r.budget > 0 ? rupiah(r.budget) : "Tak Terbatas"}
                              </p>
                              <p className="text-[11px] text-slate-400">Modal Harian</p>
                            </td>

                            {/* Target ROAS */}
                            <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700">
                              {r.roas_target && r.roas_target > 0 ? (
                                <p className="font-semibold text-slate-800">{fmtDec(r.roas_target, 1)}</p>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Diagnosis */}
                            <td className="px-3 py-3.5 whitespace-nowrap">
                              {r.expense > 0 && r.orders === 0 ? (
                                <div>
                                  <p className="font-semibold text-amber-600">Tidak Ada Pesanan</p>
                                  <div className="mt-1 rounded bg-slate-50 p-1.5 text-[10px] text-slate-500">
                                    Optimalkan untuk Pesanan
                                  </div>
                                </div>
                              ) : r.expense > 0 && pRoas < 4 ? (
                                <div>
                                  <p className="font-semibold text-rose-600">ROAS Rendah</p>
                                  <div className="mt-1 rounded bg-slate-50 p-1.5 text-[10px] text-slate-600">
                                    Optimalkan untuk Pesanan
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-semibold text-emerald-600">Baik</p>
                                  <span className="text-[11px] text-sky-600">Lihat Rincian</span>
                                </div>
                              )}
                            </td>

                            {/* Biaya Iklan */}
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <p className="font-semibold text-slate-900">{rupiah(r.expense)}</p>
                              <p className="mt-0.5 text-[10px] text-indigo-600">+PPN {rupiah(pPpn)}</p>
                            </td>

                            {/* Penjualan */}
                            <td className="px-3 py-3 text-right font-medium whitespace-nowrap text-slate-800">
                              {rupiah(r.gmv)}
                            </td>

                            {/* ROAS */}
                            <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-slate-800">
                              {fmtDec(pRoas)}
                            </td>

                            {/* Iklan Dilihat + CPM */}
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <p className="font-medium text-slate-800" title={r.impressions.toLocaleString("id-ID")}>
                                {fmtCompact(r.impressions)}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">CPM {rupiah(pCpm)}</p>
                            </td>

                            {/* Jumlah Klik + CPC */}
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <p className="font-medium text-slate-800">{r.clicks.toLocaleString("id-ID")}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400">CPC {rupiah(pCpc)}</p>
                            </td>

                            {/* Persentase Klik (CTR) */}
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <p className="font-medium text-slate-800">{fmtDec(pCtr)}%</p>
                              {pCtr >= 2 && (
                                <p className="mt-0.5 text-[10px] font-medium text-emerald-600">CTR Optimal</p>
                              )}
                            </td>

                            {/* Konversi */}
                            <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-slate-800">
                              {r.orders.toLocaleString("id-ID")}
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
                              {r.orders > 0 ? (
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {rupiah(r.expense)} ÷ {r.orders} konversi
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

                          {/* Expanded sub-rows for Grup Iklan / Iklan Otomatis */}
                          {isGroupOrAuto && isOpen && r.childrenItems.length > 0 && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={15} className="px-6 py-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">
                                    Produk dalam {r.title} ({r.childrenItems.length} produk)
                                  </span>
                                  {r.kind === "auto" && (
                                    <button
                                      onClick={() => setMainTab("auto")}
                                      className="text-xs font-semibold text-[#ee4d2d] hover:underline"
                                    >
                                      Buka detail Iklan Produk Otomatis →
                                    </button>
                                  )}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {r.childrenItems.map((it) => (
                                    <div
                                      key={it.item_id}
                                      className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2"
                                    >
                                      {it.image ? (
                                        <img src={it.image} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                                      ) : (
                                        <span className="h-9 w-9 shrink-0 rounded bg-slate-100" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-slate-800">{it.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                          ID: {it.item_id} · Biaya/Konversi: <b className="text-[#ee4d2d]">{fmtRpDec(pCpa)}</b>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
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

/**
 * Dedicated "Iklan Produk Otomatis" view matching Shopee Seller Centre's screenshot:
 * Top card: Iklan Produk Otomatis summary (Iklan Dilihat, Penjualan, Biaya Iklan, ROAS, Pemilihan Produk Otomatis, Proteksi ROAS).
 * Bottom table: "Semua Produk di Iklan Produk Otomatis" (parent row + promoted products).
 */
function AutoProductAdsView({
  campaigns,
  q,
  onSearch,
  onSync,
  busy,
}: {
  campaigns: Campaign[];
  q: string;
  onSearch: (v: string) => void;
  onSync: () => void;
  busy: boolean;
}) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Megaphone size={28} className="text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">Belum ada Iklan Produk Otomatis</p>
        <p className="max-w-md text-xs text-slate-500">
          Jika Anda memiliki Iklan Produk Otomatis di Shopee Seller Centre, klik tombol di bawah untuk menarik datanya dari Shopee.
        </p>
        <button
          onClick={onSync}
          disabled={busy}
          className="mt-2 flex h-9 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-xs font-semibold text-white hover:bg-[#d73211] disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Sinkron Iklan Otomatis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      {campaigns.map((c) => {
        const st = STATUS_META[c.status ?? "ongoing"] ?? STATUS_META.ongoing;
        const roas = calcRoas(c);
        const ctr = calcCtr(c);
        const cpa = calcCpa(c);
        const items = c.auto_items?.length ? c.auto_items : c.items;
        const prodCount = c.auto_product_count ?? items.length;
        const term = q.trim().toLowerCase();
        const filteredItems = items.filter(
          (i) => !term || i.name.toLowerCase().includes(term) || String(i.item_id).includes(term),
        );

        return (
          <div key={c.id} className="space-y-4">
            {/* Top Card: Iklan Produk Otomatis Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3.5">
                <h3 className="text-base font-bold text-slate-800">{c.name || "Iklan Produk Otomatis"}</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${st.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="border-r border-slate-200/70 pr-4">
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    Iklan Dilihat <HelpCircle size={11} className="text-slate-400" />
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{fmtCompact(c.impressions)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Akselerasi Performa: <b className="text-slate-700">Nonaktif</b>
                  </p>
                </div>

                <div className="border-r border-slate-200/70 pr-4">
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    Penjualan <HelpCircle size={11} className="text-slate-400" />
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{rupiah(c.gmv)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Konversi: <b className="text-slate-700">{c.orders} pesanan</b>
                  </p>
                </div>

                <div className="border-r border-slate-200/70 pr-4">
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    Biaya Iklan <HelpCircle size={11} className="text-slate-400" />
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{rupiah(c.expense)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Modal Harian:{" "}
                    <b className="text-slate-700">
                      {c.budget && c.budget > 0 ? rupiah(c.budget) : "Tidak Terbatas"}
                    </b>
                  </p>
                </div>

                <div className="border-r border-slate-200/70 pr-4">
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    ROAS <HelpCircle size={11} className="text-slate-400" />
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{fmtDec(roas)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Biaya/Konversi: <b className="text-[#ee4d2d]">{fmtRpDec(cpa)}</b>
                  </p>
                </div>

                <div>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    Pemilihan Produk Otomatis <HelpCircle size={11} className="text-slate-400" />
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{prodCount}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Produk aktif diiklankan</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50/70 px-3.5 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700">
                  <ShieldCheck size={15} /> Proteksi ROAS Aktif
                </span>
                <span className="text-slate-500">
                  Biaya per Konversi Iklan Otomatis: <b className="text-[#ee4d2d]">{fmtRpDec(cpa)}</b>
                </span>
              </div>
            </div>

            {/* Bottom Section: Semua Produk di Iklan Produk Otomatis */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-800">Semua Produk di Iklan Produk Otomatis</h4>
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input h-8 w-full pl-8 text-xs"
                    placeholder="Cari produk di Iklan Otomatis…"
                    value={q}
                    onChange={(e) => onSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="w-[340px] px-4 py-3">Iklan Produk</th>
                      <th className="px-3 py-3 text-right">Iklan Dilihat</th>
                      <th className="px-3 py-3 text-right">Jumlah Klik</th>
                      <th className="px-3 py-3 text-right">Persentase Klik</th>
                      <th className="px-3 py-3 text-right">Biaya Iklan</th>
                      <th className="px-3 py-3 text-right">Penjualan</th>
                      <th className="px-3 py-3 text-right">ROAS</th>
                      <th className="px-3 py-3 text-right">Konversi</th>
                      <th className="px-4 py-3 text-right font-bold text-[#ee4d2d]">Biaya per Konversi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Summary Row: Iklan Produk Otomatis */}
                    <tr className="bg-orange-50/20 font-medium">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <CollageThumb images={items.slice(0, 4).map((i) => i.image)} fallbackIcon="auto" />
                          <div>
                            <p className="font-bold text-slate-900">{c.name || "Iklan Produk Otomatis"}</p>
                            <p className="text-[11px] text-slate-400">
                              {c.budget && c.budget > 0 ? `${rupiah(c.budget)}/hari` : "Tidak Terbatas"} · {prodCount} produk
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right text-slate-800">{fmtCompact(c.impressions)}</td>
                      <td className="px-3 py-3.5 text-right text-slate-800">{c.clicks.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right text-slate-800">{fmtDec(ctr)}%</td>
                      <td className="px-3 py-3.5 text-right font-semibold text-slate-900">{rupiah(c.expense)}</td>
                      <td className="px-3 py-3.5 text-right font-semibold text-slate-900">{rupiah(c.gmv)}</td>
                      <td className="px-3 py-3.5 text-right font-semibold text-slate-800">{fmtDec(roas)}</td>
                      <td className="px-3 py-3.5 text-right font-semibold text-slate-800">{c.orders.toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-[#ee4d2d]">{fmtRpDec(cpa)}</td>
                    </tr>

                    {/* Individual Product Rows inside Iklan Produk Otomatis */}
                    {filteredItems.map((it) => (
                      <tr key={it.item_id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {it.image ? (
                              <img
                                src={it.image}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-cover"
                              />
                            ) : (
                              <span className="h-11 w-11 shrink-0 rounded-md bg-slate-100" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 font-medium text-slate-800">{it.name}</p>
                              <p className="text-[11px] text-slate-400">ID: {it.item_id}</p>
                              <span className="mt-0.5 inline-block rounded bg-orange-50 px-1.5 py-0.2 text-[10px] font-semibold text-[#ee4d2d]">
                                Populer
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-500">Termasuk di atas</td>
                        <td className="px-3 py-3 text-right text-slate-500">—</td>
                        <td className="px-3 py-3 text-right text-slate-500">—</td>
                        <td className="px-3 py-3 text-right text-slate-600">{rupiah(c.expense)} (Grup Otomatis)</td>
                        <td className="px-3 py-3 text-right text-slate-600">{rupiah(c.gmv)}</td>
                        <td className="px-3 py-3 text-right text-slate-700">{fmtDec(roas)}</td>
                        <td className="px-3 py-3 text-right text-slate-700">{c.orders}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#ee4d2d]">{fmtRpDec(cpa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
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
