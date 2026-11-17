"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Download, Eye, EyeOff, Loader2, Megaphone, Printer, RefreshCcw, Search } from "lucide-react";
import { Fragment, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker, todayRange } from "@/components/DatePicker";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Pager, Panel } from "@/components/kit";
import { ShopWorkspaceNav } from "@/components/marketplace/ShopWorkspaceNav";
import { api, download, Paginated, rupiah } from "@/lib/api";
import { BackfillNotice, useBackfillReload } from "@/components/BackfillNotice";

type Shop = { id: number; shop_id: number; shop_name: string; region: string; status: string };
type Item = {
  item_id?: number; name: string; variant?: string | null; sku?: string | null; qty: number; price: number;
  is_advertised?: boolean; ad_campaign?: string | null; ad_status?: string | null;
  ad_cost_per_conversion?: number; ad_conversions?: number; ad_expense?: number; ad_cost?: number;
};
type Row = {
  id: number; order_sn: string; created_at: string; completed_at?: string | null; status: string; customer_name?: string;
  tracking_number?: string; courier?: string; items: Item[]; quantity: number; gmv: number;
  revenue: number; fees: number; net_revenue: number; cogs: number;
  is_advertised?: boolean; ad_cost?: number; gross_profit?: number;
  profit: number; margin: number;
  fee_final: boolean; missing_cost: boolean; fee_breakdown: { key: string; label: string; amount: number }[]; fee_source: "shopee" | "summary" | "estimate";
};

type Data = {
  rows?: Row[];
  transactions: Paginated<Row>;
  summary: { gmv: number; revenue: number; fees: number; net_revenue: number; cogs: number; ads?: number; gross_profit?: number; profit: number; missing_cost: number };
  tab_counts?: Record<string, number>;
  backfilling?: boolean;
};

const tones: Record<string, string> = {
  UNPAID: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-50 text-amber-700",
  READY_TO_SHIP: "bg-blue-50 text-blue-700",
  PROCESSED: "bg-amber-50 text-amber-700",
  RETRY_SHIP: "bg-rose-50 text-rose-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  TO_CONFIRM_RECEIVE: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  IN_CANCEL: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  TO_RETURN: "bg-rose-50 text-rose-700",
};

const statusLabels: Record<string, string> = {
  UNPAID: "Belum bayar",
  PENDING: "Tertunda",
  READY_TO_SHIP: "Perlu dikirim",
  PROCESSED: "Siap diserahkan",
  RETRY_SHIP: "Kirim ulang",
  SHIPPED: "Dikirim",
  TO_CONFIRM_RECEIVE: "Dikirim",
  COMPLETED: "Selesai",
  IN_CANCEL: "Pembatalan Diajukan",
  CANCELLED: "Dibatalkan",
  TO_RETURN: "Retur",
};

const fmtRpDec = (n: number) =>
  "Rp" + n.toLocaleString("id-ID", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });

export default function Transactions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const shopId = Number(id);
  const [shop, setShop] = useState<Shop | null>(null);
  const [range, setRange] = useState(todayRange());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [backfilling, setBackfilling] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [includeAds, setIncludeAds] = useState(false);
  const handleToggleIncludeAds = () => setIncludeAds((prev) => !prev);

  const reqId = useRef(0);

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((x) =>
      setShop(x.shops.find((s) => s.id === shopId) ?? null),
    );
  }, [shopId]);

  /**
   * Fetch all rows for the chosen date range [range.from, range.to], then progressively sync all missing/changed
   * orders and escrow breakdowns from Shopee in batches until 100% of the month's data is pulled.
   */
  const fetchRange = useCallback(
    async (syncAfter = true, forceSync = false) => {
      const cur = ++reqId.current;
      setLoading(true);
      setSyncProgress("");
      try {
        const q = new URLSearchParams({
          from: range.from,
          to: range.to,
          page: "1",
          per_page: "10",
          all_rows: "1",
        }).toString();
        const res = await api<Data>(`/marketplace/shops/${shopId}/transactions?${q}`);
        if (cur !== reqId.current) return;
        setAllRows(res.rows ?? res.transactions.data ?? []);
        setBackfilling(Boolean(res.backfilling));
        setLoading(false);

        if (syncAfter) {
          setSyncing(true);
          try {
            for (let step = 0; step < 60; step++) {
              if (cur !== reqId.current) return;
              const syncRes = await api<{
                result?: {
                  orders?: number;
                  settled?: number;
                  remaining?: number;
                  remaining_orders?: number;
                  remaining_escrow?: number;
                  shopee_total?: number;
                  progress_date?: string | null;
                };
              }>(`/marketplace/shops/${shopId}/sync`, {
                method: "POST",
                json: {
                  what: "orders",
                  from: range.from,
                  to: range.to,
                  ...(forceSync && step === 0 ? { force: true } : {}),
                },
              });
              if (cur !== reqId.current) return;
              const r = syncRes?.result;
              const pulled = (r?.orders ?? 0) + (r?.settled ?? 0);
              const rem = r?.remaining ?? 0;
              const progDate = r?.progress_date;

              if (pulled > 0 || (forceSync && step === 0)) {
                const fresh = await api<Data>(`/marketplace/shops/${shopId}/transactions?${q}`);
                if (cur !== reqId.current) return;
                setAllRows(fresh.rows ?? fresh.transactions.data ?? []);
                setBackfilling(Boolean(fresh.backfilling));
              }

              if (rem > 0) {
                setSyncProgress(
                  progDate
                    ? `Menarik & memeriksa data pesanan periode ${progDate} dari Shopee (${rem} bagian lagi)…`
                    : `Menarik data pesanan dari Shopee (${rem} bagian lagi)…`,
                );
              } else {
                setSyncProgress("");
                break;
              }
            }
          } catch {
            // keep already-loaded local rows
          } finally {
            if (cur === reqId.current) {
              setSyncing(false);
              setSyncProgress("");
            }
          }
        }
      } catch {
        if (cur === reqId.current) {
          setLoading(false);
          setSyncing(false);
          setSyncProgress("");
        }
      }
    },
    [shopId, range.from, range.to],
  );

  useEffect(() => {
    fetchRange(true, false);
  }, [fetchRange]);

  const reloadOnly = useCallback(() => {
    fetchRange(false, false);
  }, [fetchRange]);

  useBackfillReload(backfilling, reloadOnly);

  const reloadFromShopee = async () => {
    setNotice("");
    await fetchRange(true, true);
    setNotice("Data transaksi & status pesanan berhasil diperbarui dari Shopee.");
  };

  // 1. Filter by search query (order_sn, product name/variant/sku, customer, tracking_number).
  const searchedRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return allRows;
    return allRows.filter((r) => {
      const itemsText = (r.items ?? [])
        .map((i) => `${i.name ?? ""} ${i.variant ?? ""} ${i.sku ?? ""}`)
        .join(" ");
      return `${r.order_sn ?? ""} ${r.customer_name ?? ""} ${r.tracking_number ?? ""} ${itemsText}`
        .toLowerCase()
        .includes(needle);
    });
  }, [allRows, search]);

  // 2. Summary cards:
  //    cancelled orders excluded, HPP counted from all active transactions in the period.
  const s = useMemo(() => {
    let revenue = 0;
    let fees = 0;
    let net_revenue = 0;
    let cogs = 0;
    let ads = 0;
    let missing_cost = 0;
    let active_count = 0;
    for (const r of searchedRows) {
      if (r.status === "CANCELLED" || r.status === "IN_CANCEL" || r.status === "UNPAID") continue;
      active_count += 1;
      revenue += r.revenue;
      fees += r.fees;
      net_revenue += r.net_revenue;
      cogs += r.cogs;
      ads += r.ad_cost ?? 0;
      if (r.missing_cost) missing_cost += 1;
    }
    const gross_profit = net_revenue - cogs;
    return { revenue, fees, net_revenue, cogs, ads, gross_profit, profit: gross_profit - ads, missing_cost, active_count };
  }, [searchedRows]);

  // 3. Slice current page synchronously (0ms pagination!).
  const total = searchedRows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const pageRows = useMemo(
    () => searchedRows.slice((safePage - 1) * perPage, safePage * perPage),
    [searchedRows, safePage, perPage],
  );

  if (!shop) return <div className="py-24 text-center text-sm text-slate-400">Memuat transaksi toko…</div>;

  return (
    <div className="space-y-5">
      <PageHead title="Transaksi" tutorial={false} crumbs={[["Marketplace", "/marketplace/shops"], [shop.shop_name, `/marketplace/shops/${shop.id}`], ["Transaksi"]]}>
        <button
          onClick={() =>
            download(
              `/marketplace/shops/${shopId}/transactions/export?${new URLSearchParams({
                ...range,
                ...(search ? { search } : {}),
              })}`,
              `transaksi-${range.from}-${range.to}.csv`,
            )
          }
          className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy"
        >
          <Download size={16} />Ekspor Excel
        </button>
        <button onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy">
          <Printer size={16} />Cetak
        </button>
        <button
          onClick={reloadFromShopee}
          disabled={loading || syncing}
          className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <RefreshCcw size={16} className={loading || syncing ? "animate-spin" : ""} />
          {loading || syncing ? "Menyinkronkan…" : "Muat ulang"}
        </button>
      </PageHead>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {(loading || syncing) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-xs font-medium text-sky-800">
          <Loader2 size={15} className="shrink-0 animate-spin text-sky-600" />
          <span>
            {loading
              ? `Memuat data transaksi periode ${range.from} s/d ${range.to}…`
              : syncProgress || `Menyinkronkan pembaruan status pesanan periode ${range.from} s/d ${range.to} dari Shopee…`}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <ShopeeMark size={28} />
        <span className="flex-1">
          <b className="block">Terhubung ke {shop.shop_name}</b>
          <span className="text-xs">Transaksi keuangan dipisahkan dari halaman pengaturan pengiriman.</span>
        </span>
        <DateRangePicker
          value={range}
          onChange={(v) => {
            setNotice("");
            setExpanded(null);
            setRange(v);
            setPage(1);
          }}
        />
      </div>

      <BackfillNotice show={backfilling} />
      <ShopWorkspaceNav shopId={shop.id} active="finance" />

      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Transaksi</span>
        <a href={`/marketplace/shops/${shop.id}/expenses`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
          Pengeluaran
        </a>
        <a href={`/marketplace/shops/${shop.id}/statement`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
          Laporan Laba Rugi
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Omzet", s.revenue, "text-navy"],
          ["Potongan", s.fees, "text-rose-600"],
          ["Pendapatan bersih", s.net_revenue, "text-blue-600"],
          ["Total HPP", s.cogs, "text-orange-600"],
          ["Biaya Iklan (Konversi)", s.ads, "text-violet-600"],
          ["Laba Bersih", s.gross_profit, s.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600"],
        ].map(([l, v, c]) => (
          <Panel key={l as string} className="p-4">
            <p className="text-xs text-slate-500">{l as string}</p>
            <p className={`mt-1 text-lg font-bold ${c}`}>{loading ? "…" : rupiah(v as number)}</p>
          </Panel>
        ))}
      </div>

      {!loading && s.missing_cost > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} />
          {s.missing_cost} transaksi belum memiliki HPP lengkap sehingga laba belum final.
        </div>
      )}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-10 pl-9"
              placeholder="Cari nomor pesanan, produk, pembeli, atau resi"
              value={search}
              onChange={(e) => {
                setExpanded(null);
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-xs font-medium text-slate-500">
            <b className="text-navy">{s.active_count}</b> transaksi aktif
            {searchedRows.length > s.active_count && (
              <span> ({searchedRows.length} total termasuk batal/belum bayar)</span>
            )}
            {" "}· periode {range.from} s/d {range.to}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Detail pesanan", "Waktu Pesanan", "Jumlah", "Biaya", "Pendapatan", "HPP", "Biaya Iklan", "Laba Bersih", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-sm text-slate-500">
                    <div className="inline-flex items-center gap-2.5">
                      <Loader2 size={18} className="animate-spin text-navy" />
                      <span>Memuat data transaksi…</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const adCost = r.ad_cost ?? 0;
                  const grossProfit = r.gross_profit ?? (r.net_revenue - r.cogs);
                  const margin = r.revenue > 0 ? Math.round((grossProfit / r.revenue) * 1000) / 10 : 0;
                  const rawCreated = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(r.created_at)
                    ? r.created_at.replace(" ", "T") + "Z"
                    : r.created_at;
                  const createdDate = new Date(rawCreated);
                  const dateStr = createdDate.toLocaleDateString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const timeStr = createdDate.toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <Fragment key={r.id}>
                      <tr className="align-top hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <p className="font-mono text-xs font-semibold text-navy">{r.order_sn}</p>
                            {r.is_advertised && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                                title="Produk dalam pesanan ini diiklankan di Shopee Ads"
                              >
                                <Megaphone size={10} />Diiklankan
                              </span>
                            )}
                          </div>
                          <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">{r.items[0]?.name ?? r.customer_name}</p>
                          <p className="text-[11px] text-slate-400">{r.quantity} item · {r.tracking_number || "Resi belum tersedia"}</p>
                        </td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap text-slate-600">
                          <span className="block font-medium text-slate-700">{dateStr}</span>
                          <span className="text-[11px] text-slate-400">{timeStr} WIB</span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-navy">
                          {rupiah(r.revenue)}
                          <span className="block text-[11px] font-normal text-slate-400">{r.quantity} qty</span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-rose-600">
                          {r.fees < 0 ? "+ " : "− "}{rupiah(Math.abs(r.fees))}
                          {r.status !== "CANCELLED" && r.status !== "IN_CANCEL" && (
                            <span
                              className={`mt-0.5 block w-fit rounded px-1.5 text-[10px] font-semibold ${r.fee_final ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                }`}
                            >
                              {r.fee_final ? "Sudah cair" : "Estimasi penghasilan"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-semibold text-blue-600">{rupiah(r.net_revenue)}</td>
                        <td className="px-3 py-3 font-semibold text-orange-600">
                          {rupiah(r.cogs)}
                          {r.missing_cost && <span className="block text-[11px] font-normal text-amber-600">HPP belum lengkap</span>}
                        </td>
                        <td className="px-3 py-3 font-semibold text-violet-600">
                          {r.is_advertised ? (
                            <>
                              {adCost > 0 ? `− ${rupiah(adCost)}` : rupiah(0)}
                              <span className="block text-[10px] font-normal text-slate-400">Info acuan</span>
                            </>
                          ) : (
                            <span className="text-xs font-normal text-slate-400">Tidak diiklankan</span>
                          )}
                        </td>
                        <td className={`px-3 py-3 font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {rupiah(grossProfit)}
                          <span className="block text-[11px] font-normal text-slate-400">{margin}%</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap ${tones[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {statusLabels[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          >
                            {expanded === r.id ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                          </button>
                        </td>
                      </tr>
                      {expanded === r.id && (
                        <tr key={`${r.id}-detail`}>
                          <td colSpan={10} className="bg-slate-50/70 px-5 py-4">
                            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                              <div>
                                <h3 className="mb-2 text-sm font-bold text-navy">Detail produk</h3>
                                <div className="space-y-2">
                                  {r.items.map((item, i) => (
                                    <div key={i} className="rounded-lg bg-white p-3 text-xs">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <b className="block text-navy">{item.name}</b>
                                          <span className="text-slate-500">
                                            {item.variant || "Tanpa variasi"} · SKU {item.sku || "-"}
                                          </span>
                                        </div>
                                        <span className="shrink-0 text-right">
                                          <b>{item.qty} × {rupiah(item.price)}</b>
                                          <span className="block text-slate-500">{rupiah(item.qty * item.price)}</span>
                                        </span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                        {item.is_advertised ? (
                                          <>
                                            <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                                              <Megaphone size={11} />Produk Diiklankan ({item.ad_campaign || "Iklan Produk Shopee"})
                                            </span>
                                            <span className="text-[11px] text-slate-600">
                                              Biaya per Konversi: <b className="text-rose-600">− {fmtRpDec(item.ad_cost_per_conversion ?? 0)}</b>
                                              {(item.ad_conversions ?? 0) > 0 && (
                                                <span className="ml-1 text-slate-400">
                                                  ({rupiah(item.ad_expense ?? 0)} / {item.ad_conversions} konversi)
                                                </span>
                                              )}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-[11px] text-slate-400">Status Iklan: Produk tidak diiklankan di Shopee Ads</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-xl bg-white p-4">
                                <h3 className="text-sm font-bold text-navy">Rincian pendapatan</h3>
                                {r.fee_breakdown.length > 0 && (
                                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    {r.fee_breakdown.map((f) => (
                                      <div key={f.key} className="rounded-lg bg-slate-50 p-2">
                                        <dt className="text-slate-500">{f.label}</dt>
                                        <dd className={`font-semibold ${f.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                          {f.amount < 0 ? "− " : "+ "}{rupiah(Math.abs(f.amount))}
                                          <span className="ml-1 font-normal text-slate-400">
                                            {r.revenue ? `${Math.round((Math.abs(f.amount) / r.revenue) * 1000) / 10}%` : ""}
                                          </span>
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}
                                {r.fee_source === "summary" && (
                                  <p className="mt-2 text-[11px] text-slate-500">
                                    Rincian per jenis biaya dari Shopee (get_escrow_detail) diambil otomatis pada sinkronisasi berikutnya.
                                  </p>
                                )}
                                {r.fee_source === "estimate" && r.fees > 0 && (
                                  <p className="mt-2 text-[11px] text-slate-500">
                                    Shopee belum mengirim data penghasilan pesanan ini; sementara memakai rata-rata potongan toko.
                                  </p>
                                )}
                                {!r.fee_final && r.revenue > 0 && (
                                  <p className="mt-2 text-[11px] text-amber-700">
                                    Masih estimasi dari Shopee; angka final diperbarui otomatis saat dana dilepas.
                                  </p>
                                )}
                                <dl className="mt-3 space-y-2 text-xs">
                                  {[
                                    ["Jumlah pesanan", r.revenue, false],
                                    ["Total biaya", -r.fees, false],
                                    ["Pendapatan bersih", r.net_revenue, false],
                                    ["Total HPP", -r.cogs, false],
                                  ].map(([l, v, bold]) => (
                                    <div key={l as string} className={`flex justify-between border-b border-slate-100 pb-2 ${bold ? "pt-1" : ""}`}>
                                      <dt className={bold ? "font-bold text-navy" : "text-slate-500"}>
                                        {l as string}
                                      </dt>
                                      <dd
                                        className={`${bold ? "text-sm font-extrabold" : "font-semibold"} ${(v as number) < 0 ? "text-rose-600" : bold && (v as number) > 0 ? "text-emerald-600" : "text-navy"
                                          }`}
                                      >
                                        {(v as number) < 0 ? "− " : ""}{rupiah(Math.abs(v as number))}
                                      </dd>
                                    </div>
                                  ))}

                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <dt className="flex items-center gap-1.5 text-slate-500">
                                      <span>Biaya Iklan (per Konversi)</span>
                                      {r.is_advertised ? (
                                        <button
                                          type="button"
                                          onClick={handleToggleIncludeAds}
                                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${includeAds
                                              ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            }`}
                                          title={
                                            includeAds
                                              ? "Saat ini: memotong laba transaksi ini. Klik untuk tidak memotong."
                                              : "Saat ini: tidak memotong laba transaksi ini. Klik untuk memotong biaya iklan dari laba transaksi ini."
                                          }
                                        >
                                          {includeAds ? <Eye size={12} className="text-violet-600" /> : <EyeOff size={12} className="text-slate-400" />}
                                          <span>{includeAds ? "Potong laba" : "Tanpa potong"}</span>
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">(tidak diiklankan)</span>
                                      )}
                                    </dt>
                                    <dd className={`font-semibold ${r.is_advertised && adCost > 0 ? (includeAds ? "text-rose-600" : "text-slate-600") : "text-slate-400"}`}>
                                      {r.is_advertised && adCost > 0 ? `− ${rupiah(adCost)}` : rupiah(0)}
                                    </dd>
                                  </div>

                                  <div className="flex justify-between border-b border-slate-100 pt-1 pb-2">
                                    <dt className="font-bold text-navy">
                                      Laba bersih transaksi
                                      {r.is_advertised && !includeAds && (
                                        <span className="block text-[10px] font-normal text-slate-400">
                                          (tanpa potongan iklan)
                                        </span>
                                      )}
                                      {r.is_advertised && includeAds && (
                                        <span className="block text-[10px] font-normal text-violet-600">
                                          (setelah dipotong iklan)
                                        </span>
                                      )}
                                    </dt>
                                    <dd
                                      className={`text-sm font-extrabold ${(includeAds && r.is_advertised ? r.profit : grossProfit) >= 0 ? "text-emerald-600" : "text-rose-600"
                                        }`}
                                    >
                                      {(includeAds && r.is_advertised ? r.profit : grossProfit) < 0 ? "− " : ""}{rupiah(Math.abs(includeAds && r.is_advertised ? r.profit : grossProfit))}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          {!loading && total === 0 && (
            <p className="py-14 text-center text-sm text-slate-500">
              {syncing
                ? "Sedang menarik data dari Shopee untuk periode ini…"
                : "Tidak ada transaksi pada filter ini."}
            </p>
          )}
        </div>
        <Pager
          page={safePage}
          last={lastPage}
          total={total}
          perPage={perPage}
          loading={loading}
          onPage={(p) => {
            setExpanded(null);
            setPage(p);
          }}
          onPerPage={(n) => {
            setExpanded(null);
            setPerPage(n);
            setPage(1);
          }}
        />
      </Panel>
    </div>
  );
}
