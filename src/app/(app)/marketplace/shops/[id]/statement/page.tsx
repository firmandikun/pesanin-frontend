"use client";

import { Info, Loader2, Printer, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker, todayRange } from "@/components/DatePicker";
import { PageHead, Panel } from "@/components/kit";
import { ShopWorkspaceNav } from "@/components/marketplace/ShopWorkspaceNav";
import { api, rupiah } from "@/lib/api";

type Shop = { id: number; shop_name: string; shop_id: number; region: string };

type StatementData = {
  shop: { id: number; name: string; shop_id: number; region: string };
  range: { from: string; to: string };
  basis: "settled" | "settled_cogs_completed" | "all_active";
  counts: {
    total_orders: number;
    completed_orders: number;
    missing_cost_orders: number;
  };
  revenue: {
    gmv: number;
    total: number;
  };
  fees: {
    items: { key: string; label: string; amount: number }[];
    total: number;
  };
  adjustments: {
    items: { key: string; label: string; amount: number }[];
    total: number;
  };
  net_revenue: number;
  cogs: {
    total: number;
  };
  gross_profit: number;
  opex: {
    ads: number;
    other?: number;
    total: number;
  };
  operating_profit: number;
  net_profit: number;
};

export default function ShopStatement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const shopId = Number(id);
  const [shop, setShop] = useState<Shop | null>(null);
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(todayRange());
  const [basis, setBasis] = useState<"settled" | "settled_cogs_completed" | "all_active">("settled_cogs_completed");
  const [showExplanation, setShowExplanation] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const reqId = useRef(0);
  const lastSyncedRange = useRef("");

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((x) =>
      setShop(x.shops.find((s) => s.id === shopId) ?? null),
    );
  }, [shopId]);

  const fetchStatement = useCallback(
    async (syncFromShopee: boolean, forceSync: boolean) => {
      const cur = ++reqId.current;
      const rangeKey = `${range.from}:${range.to}`;
      const shouldSync = syncFromShopee && (forceSync || lastSyncedRange.current !== rangeKey);

      setLoading(true);
      setError("");
      const q = new URLSearchParams({
        from: range.from,
        to: range.to,
        basis,
      }).toString();

      try {
        const res = await api<StatementData>(`/marketplace/shops/${shopId}/statement?${q}`);
        if (cur !== reqId.current) return;
        setData(res);
        setLoading(false);

        if (shouldSync) {
          setSyncing(true);
          setSyncProgress(`Menarik & memeriksa data pesanan periode ${range.from} s/d ${range.to} dari Shopee…`);
          try {
            if (forceSync) {
              await api(`/marketplace/shops/${shopId}/sync`, {
                method: "POST",
                json: { what: "ads" },
              }).catch(() => {});
            }
            for (let step = 0; step < 60; step++) {
              if (cur !== reqId.current) return;
              const syncRes = await api<{
                result?: {
                  orders?: number;
                  settled?: number;
                  remaining?: number;
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
                const fresh = await api<StatementData>(`/marketplace/shops/${shopId}/statement?${q}`);
                if (cur !== reqId.current) return;
                setData(fresh);
              }

              if (rem > 0) {
                setSyncProgress(
                  progDate
                    ? `Menarik & memeriksa data pesanan periode ${progDate} dari Shopee (${rem} bagian lagi)…`
                    : `Menarik data pesanan dari Shopee (${rem} bagian lagi)…`,
                );
              } else {
                lastSyncedRange.current = rangeKey;
                setSyncProgress("");
                break;
              }
            }
          } catch {
            // keep local statement data
          } finally {
            if (cur === reqId.current) {
              setSyncing(false);
              setSyncProgress("");
            }
          }
        }
      } catch (e: unknown) {
        if (cur === reqId.current) {
          setData(null);
          setError(e instanceof Error ? e.message : "Gagal memuat data laporan.");
          setLoading(false);
          setSyncing(false);
          setSyncProgress("");
        }
      }
    },
    [shopId, range.from, range.to, basis],
  );

  useEffect(() => {
    fetchStatement(true, false);
  }, [fetchStatement]);

  const gmv = data?.revenue.gmv ?? 0;
  const pct = (val: number) => {
    if (!gmv) return "0.0%";
    return `${(Math.abs(val) / gmv * 100).toFixed(1)}%`;
  };

  const basisTitle = useMemo(() => {
    switch (basis) {
      case "settled":
        return "PESANAN SUDAH CAIR";
      case "settled_cogs_completed":
        return "HPP SELESAI";
      case "all_active":
        return "SEMUA PESANAN AKTIF";
    }
  }, [basis]);

  if (!shop) return <div className="py-24 text-center text-sm text-slate-400">Memuat laporan toko…</div>;

  return (
    <div className="space-y-5">
      <div className="space-y-5 print:hidden">
      <PageHead
        title="Laporan Laba Rugi"
        tutorial={false}
        crumbs={[
          ["Marketplace", "/marketplace/shops"],
          [shop.shop_name, `/marketplace/shops/${shop.id}`],
          ["Laporan Toko"],
        ]}
      >
        <DateRangePicker value={range} onChange={setRange} />
        <button
          type="button"
          onClick={() => fetchStatement(true, true)}
          disabled={loading || syncing}
          className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy shadow-sm hover:bg-slate-50 transition disabled:opacity-60"
        >
          <RefreshCcw size={16} className={loading || syncing ? "animate-spin" : ""} />
          {syncing ? "Menyinkronkan…" : "Muat ulang"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Printer size={16} />
          Cetak / PDF
        </button>
      </PageHead>

      {syncing && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-medium text-sky-900">
          <Loader2 size={15} className="animate-spin text-sky-600" />
          <span>{syncProgress || `Menyinkronkan data pesanan periode ${range.from} s/d ${range.to} dari Shopee…`}</span>
        </div>
      )}

      <ShopWorkspaceNav shopId={shop.id} active="finance" />

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/marketplace/shops/${shop.id}/transactions`}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Transaksi
        </Link>
        <Link
          href={`/marketplace/shops/${shop.id}/expenses`}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Pengeluaran
        </Link>
        <span className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm">
          Laporan Laba Rugi
        </span>
      </div>

      {/* Explanation Banner */}
      {showExplanation && (
        <div className="relative rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-xs text-sky-900 shadow-sm">
          <button
            type="button"
            onClick={() => setShowExplanation(false)}
            className="absolute top-3 right-3 text-sky-600 hover:text-sky-800 font-bold"
            title="Tutup penjelasan"
          >
            ✕
          </button>
          <div className="flex items-start gap-2.5">
            <Info size={18} className="mt-0.5 shrink-0 text-sky-600" />
            <div className="space-y-1.5 pr-6">
              <p className="font-bold text-sm text-sky-950">
                Cara laporan ini dihitung
              </p>
              <ul className="list-disc pl-4 space-y-1 text-sky-800">
                <li>
                  <b>Status Pesanan:</b> Tab &quot;Semua transaksi&quot; di menu Transaksi menjumlahkan seluruh pesanan termasuk yang dibatalkan dan yang masih dalam proses kirim. Laporan ini mengecualikan pesanan batal dari omzet penjualan kotor.
                </li>
                <li>
                  <b>HPP Selesai:</b> Di mode <i>HPP Selesai</i>, HPP hanya dihitung dari pesanan yang statusnya sudah <b>Selesai (Completed)</b>.
                </li>
                <li>
                  <b>Biaya Iklan Shopee:</b> Menggunakan total biaya riil dari <b>Shopee Ads Manager</b> toko untuk periode ini (bukan estimasi biaya per konversi per transaksi).
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      </div>

      {loading ? (
        <Panel className="flex h-72 items-center justify-center">
          <div className="inline-flex items-center gap-2.5 text-sm text-slate-600">
            <Loader2 size={20} className="animate-spin text-navy" />
            <span>Menghitung Laporan Laba Rugi {shop.shop_name}…</span>
          </div>
        </Panel>
      ) : !data ? (
        <div className="py-24 text-center text-sm text-rose-500">{error || "Gagal memuat data laporan."}</div>
      ) : (
        <div className="flex flex-col lg:flex-row items-start gap-6 print:block">
          {/* Left Sidebar (Detail Toko & Ringkasan) */}
          <aside className="w-full lg:w-64 shrink-0 space-y-4 print:hidden">
            <Panel className="p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Detail Toko</p>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="block text-slate-400">Nama Toko</span>
                  <b className="text-sm text-navy">{shop.shop_name}</b>
                </div>
                <div>
                  <span className="block text-slate-400">Platform</span>
                  <b className="text-slate-700">Shopee (ID {shop.shop_id})</b>
                </div>
                <div>
                  <span className="block text-slate-400">Periode Laporan</span>
                  <b className="text-slate-700">{range.from} s/d {range.to}</b>
                </div>
                <div>
                  <span className="block text-slate-400">Total Pesanan</span>
                  <b className="text-slate-700">{data.counts.total_orders} aktif ({data.counts.completed_orders} selesai)</b>
                </div>
              </div>
            </Panel>

            <Panel className="p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan Cepat</p>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Omzet (GMV)</dt>
                  <dd className="font-semibold text-navy">{rupiah(data.revenue.gmv)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Biaya Platform</dt>
                  <dd className="font-semibold text-rose-600">({rupiah(Math.abs(data.fees.total))})</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Total HPP</dt>
                  <dd className="font-semibold text-orange-600">({rupiah(data.cogs.total)})</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Iklan Shopee</dt>
                  <dd className="font-semibold text-blue-600">({rupiah(data.opex.ads)})</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <dt className="font-bold text-navy">Laba Bersih</dt>
                  <dd className={`font-extrabold ${data.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {rupiah(data.net_profit)}
                  </dd>
                </div>
              </dl>
            </Panel>
          </aside>

          {/* Main Printable Statement Sheet */}
          <Panel className="w-full flex-1 p-6 sm:p-10 print:p-0 print:border-none print:shadow-none">
            {/* Basis Selector Inside Sheet (Reference Style) */}
            <div className="mb-8 grid gap-3 sm:grid-cols-3 print:hidden">
              {[
                {
                  key: "settled",
                  label: "Hanya Pesanan Sudah Cair",
                  desc: "Hanya pesanan yang dananya sudah dilepas/cair oleh Shopee ke saldo penjual.",
                },
                {
                  key: "settled_cogs_completed",
                  label: "Pesanan Cair & Belum Cair (HPP Selesai)",
                  badge: "DIREKOMENDASIKAN",
                  desc: "HPP hanya dihitung dari pesanan yang berstatus Selesai.",
                },
                {
                  key: "all_active",
                  label: "Semua Pesanan Aktif (HPP Penuh)",
                  desc: "Menghitung omzet & HPP seluruh pesanan aktif (termasuk sedang dikirim).",
                },
              ].map((item) => {
                const active = basis === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBasis(item.key as typeof basis)}
                    className={`flex flex-col justify-start text-left rounded-xl border p-3.5 transition ${
                      active
                        ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5 min-h-[20px]">
                      {item.badge && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-800 uppercase">
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          Dipilih
                        </span>
                      )}
                    </div>
                    <b className={`text-xs leading-snug ${active ? "text-blue-950" : "text-slate-800"}`}>
                      {item.label}
                    </b>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Statement Header */}
            <div className="text-center pb-5 border-b-2 border-slate-900">
              <h2 className="text-lg font-extrabold text-navy">{shop.shop_name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Toko: {shop.shop_name}</p>
              <h1 className="mt-2 text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                LAPORAN LABA RUGI ({basisTitle})
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Untuk Periode <b className="text-slate-700">{range.from}</b> sampai <b className="text-slate-700">{range.to}</b>
              </p>
            </div>

            {/* Column Header */}
            <div className="flex justify-end py-2.5 text-xs font-bold text-slate-700">
              <span className="w-32 text-right">Periode Saat Ini</span>
            </div>

            <div className="space-y-5 text-xs sm:text-sm">
              {/* 1. PENDAPATAN */}
              <div className="border-l-4 border-emerald-500 bg-emerald-50/30 pl-4 pr-2 py-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="uppercase tracking-wide text-xs">PENDAPATAN</span>
                </div>
                <div className="space-y-1.5 pl-4">
                  <div className="flex items-center justify-between py-1 text-slate-600">
                    <span>Pendapatan Kotor (Omzet)</span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-400">100.0%</span>
                      <span className="w-28 text-right font-medium text-slate-800">{rupiah(data.revenue.gmv)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-300 font-bold text-slate-900">
                    <span>Total Pendapatan</span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-500">100.0%</span>
                      <span className="w-28 text-right">{rupiah(data.revenue.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. RINCIAN BIAYA (BIAYA PLATFORM) */}
              <div className="border-l-4 border-rose-500 bg-rose-50/20 pl-4 pr-2 py-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="uppercase tracking-wide text-xs">RINCIAN BIAYA (BIAYA PLATFORM)</span>
                </div>
                <div className="space-y-1.5 pl-4">
                  {data.fees.items.map((f) => (
                    <div key={f.key} className="flex items-center justify-between py-1 text-slate-600">
                      <span>{f.label}</span>
                      <div className="flex items-center gap-6 tabular-nums">
                        <span className="w-14 text-right text-slate-400">{pct(f.amount)}</span>
                        <span className={`w-28 text-right font-medium ${f.amount < 0 ? "text-rose-600" : "text-slate-800"}`}>
                          {f.amount < 0 ? `(${rupiah(Math.abs(f.amount))})` : rupiah(f.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {data.fees.items.length === 0 && (
                    <div className="py-1.5 text-slate-400 italic">Tidak ada biaya platform pada periode ini.</div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-300 font-bold text-slate-900">
                    <span>Total Biaya Platform</span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-500">{pct(data.fees.total)}</span>
                      <span className={`w-28 text-right ${data.fees.total < 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {data.fees.total < 0 ? `(${rupiah(Math.abs(data.fees.total))})` : rupiah(data.fees.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. PENYESUAIAN (Hanya muncul jika ada penyesuaian/kompensasi dari Shopee) */}
              {(data.adjustments.items.length > 0 || data.adjustments.total !== 0) && (
                <div className="border-l-4 border-amber-500 bg-amber-50/20 pl-4 pr-2 py-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="uppercase tracking-wide text-xs">PENYESUAIAN</span>
                  </div>
                  <div className="space-y-1.5 pl-4">
                    {data.adjustments.items.map((adj) => (
                      <div key={adj.key} className="flex items-center justify-between py-1 text-slate-600">
                        <span>{adj.label}</span>
                        <div className="flex items-center gap-6 tabular-nums">
                          <span className="w-14 text-right text-slate-400">{pct(adj.amount)}</span>
                          <span className={`w-28 text-right font-medium ${adj.amount < 0 ? "text-rose-600" : "text-slate-800"}`}>
                            {adj.amount < 0 ? `(${rupiah(Math.abs(adj.amount))})` : rupiah(adj.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-300 font-bold text-slate-900">
                      <span>Total Penyesuaian</span>
                      <div className="flex items-center gap-6 tabular-nums">
                        <span className="w-14 text-right text-slate-500">{pct(data.adjustments.total)}</span>
                        <span className={`w-28 text-right ${data.adjustments.total < 0 ? "text-rose-600" : "text-slate-900"}`}>
                          {data.adjustments.total < 0 ? `(${rupiah(Math.abs(data.adjustments.total))})` : rupiah(data.adjustments.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PENDAPATAN BERSIH */}
              <div className="border-y border-slate-300 py-3 px-2 flex items-center justify-between font-bold text-slate-900">
                <span className="uppercase tracking-wide text-xs">
                  PENDAPATAN BERSIH {data.adjustments.total !== 0 ? "SETELAH BIAYA & PENYESUAIAN" : "SETELAH BIAYA PLATFORM"}
                </span>
                <div className="flex items-center gap-6 tabular-nums">
                  <span className="w-14 text-right text-slate-500">{pct(data.net_revenue)}</span>
                  <span className="w-28 text-right">{rupiah(data.net_revenue)}</span>
                </div>
              </div>

              {/* 5. HARGA POKOK PENJUALAN */}
              <div className="border-l-4 border-orange-500 bg-orange-50/20 pl-4 pr-2 py-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="uppercase tracking-wide text-xs">HARGA POKOK PENJUALAN</span>
                </div>
                <div className="space-y-1.5 pl-4">
                  <div className="flex items-center justify-between py-1 text-slate-600">
                    <span>
                      Total COGS (HPP)
                      {basis === "settled_cogs_completed" && (
                        <span className="ml-1.5 text-[11px] text-slate-400">(pesanan selesai saja)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-400">{pct(data.cogs.total)}</span>
                      <span className="w-28 text-right font-medium text-slate-800">
                        {rupiah(data.cogs.total)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-300 font-bold text-slate-900">
                    <span>Total Harga Pokok Penjualan</span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-500">{pct(data.cogs.total)}</span>
                      <span className="w-28 text-right">{rupiah(data.cogs.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. LABA KOTOR */}
              <div className="border-y border-slate-300 py-3 px-2 flex items-center justify-between font-bold text-slate-900">
                <span className="uppercase tracking-wide text-xs">LABA KOTOR</span>
                <div className="flex items-center gap-6 tabular-nums">
                  <span className="w-14 text-right text-slate-500">{pct(data.gross_profit)}</span>
                  <span className="w-28 text-right">{rupiah(data.gross_profit)}</span>
                </div>
              </div>

              {/* 7. BEBAN OPERASIONAL */}
              <div className="border-l-4 border-blue-500 bg-blue-50/20 pl-4 pr-2 py-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="uppercase tracking-wide text-xs">BEBAN OPERASIONAL</span>
                </div>
                <div className="space-y-1.5 pl-4">
                  <div className="flex items-center justify-between py-1 text-slate-600">
                    <span>Shopee Ads Manager</span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-400">{pct(data.opex.ads)}</span>
                      <span className="w-28 text-right font-medium text-slate-800">
                        {rupiah(data.opex.ads)}
                      </span>
                    </div>
                  </div>
                  {(data.opex.other ?? 0) > 0 && (
                    <div className="flex items-center justify-between py-1 text-slate-600">
                      <span>Pengeluaran Toko Lainnya</span>
                      <div className="flex items-center gap-6 tabular-nums">
                        <span className="w-14 text-right text-slate-400">{pct(data.opex.other ?? 0)}</span>
                        <span className="w-28 text-right font-medium text-slate-800">{rupiah(data.opex.other ?? 0)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-300 font-bold text-slate-900">
                    <span>Total Beban Operasional</span>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="w-14 text-right text-slate-500">{pct(data.opex.total)}</span>
                      <span className="w-28 text-right">{rupiah(data.opex.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8. LABA OPERASIONAL */}
              <div className="border-t border-slate-300 pt-3 pb-1 px-2 flex items-center justify-between font-bold text-slate-900">
                <span className="uppercase tracking-wide text-xs">LABA OPERASIONAL</span>
                <div className="flex items-center gap-6 tabular-nums">
                  <span className="w-14 text-right text-slate-500">{pct(data.operating_profit)}</span>
                  <span className="w-28 text-right">{rupiah(data.operating_profit)}</span>
                </div>
              </div>

              {/* 9. LABA BERSIH (Accounting Double Underline) */}
              <div className="border-t-2 border-slate-900 border-b-4 border-double border-slate-900 py-3 px-2 flex items-center justify-between font-black text-slate-900 text-sm sm:text-base">
                <span className="uppercase tracking-wide">LABA BERSIH</span>
                <div className="flex items-center gap-6 tabular-nums">
                  <span className="w-14 text-right text-slate-600 font-bold text-xs sm:text-sm">{pct(data.net_profit)}</span>
                  <span className={`w-28 text-right ${data.net_profit >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                    {rupiah(data.net_profit)}
                  </span>
                </div>
              </div>

              {data.counts.missing_cost_orders > 0 && (
                <p className="pt-2 text-[11px] text-amber-700 italic">
                  * Perhatian: Ada {data.counts.missing_cost_orders} pesanan yang produknya belum diisi HPP sehingga laba bersih terlihat lebih tinggi dari aslinya.
                </p>
              )}

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-0.5">
                <p>Laporan ini mencerminkan kinerja keuangan toko {shop.shop_name}.</p>
                <p>Catatan yang menyertai merupakan bagian integral dari laporan keuangan ini.</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
