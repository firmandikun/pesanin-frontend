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

      {/* Filter basis */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            key: "settled_cogs_completed",
            label: "Pesanan Cair & Belum Cair (HPP Selesai)",
            badge: "REKOMENDASI",
            desc: "Dihitung dari seluruh pesanan periode ini. HPP dihitung jika status pesanan selesai.",
          },
          {
            key: "all_active",
            label: "Semua Pesanan Aktif (HPP Penuh)",
            desc: "Menghitung HPP untuk seluruh pesanan aktif (baik yang sedang dikirim maupun selesai).",
          },
          {
            key: "settled",
            label: "Hanya Pesanan Sudah Cair",
            desc: "Hanya pesanan yang dananya sudah dilepas/cair oleh Shopee ke saldo penjual.",
          },
        ].map((item) => {
          const active = basis === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setBasis(item.key as typeof basis)}
              className={`relative flex flex-col justify-start text-left rounded-xl border p-4 transition ${
                active
                  ? "border-navy bg-navy/5 shadow-sm ring-1 ring-navy"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <b className={`text-xs ${active ? "text-navy" : "text-slate-800"}`}>
                  {item.label}
                </b>
                {item.badge && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
            </button>
          );
        })}
      </div>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="inline-flex items-center gap-2.5 text-sm text-slate-600">
            <Loader2 size={20} className="animate-spin text-navy" />
            <span>Menghitung Laporan Laba Rugi {shop.shop_name}…</span>
          </div>
        </div>
      ) : !data ? (
        <div className="py-24 text-center text-sm text-rose-500">{error || "Gagal memuat data laporan."}</div>
      ) : (
        <div className="space-y-5">
          {/* Summary highlight cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
            <Panel className="p-4">
              <p className="text-xs text-slate-500">Omzet (GMV)</p>
              <p className="mt-1 text-lg font-bold text-navy">{rupiah(data.revenue.gmv)}</p>
              <span className="text-[10px] text-slate-400">{data.counts.total_orders} pesanan aktif</span>
            </Panel>
            <Panel className="p-4">
              <p className="text-xs text-slate-500">Biaya Platform</p>
              <p className="mt-1 text-lg font-bold text-rose-600">
                {data.fees.total < 0 ? `− ${rupiah(Math.abs(data.fees.total))}` : rupiah(0)}
              </p>
              <span className="text-[10px] text-slate-400">{pct(data.fees.total)} dari omzet</span>
            </Panel>
            <Panel className="p-4">
              <p className="text-xs text-slate-500">Total HPP</p>
              <p className="mt-1 text-lg font-bold text-orange-600">
                {data.cogs.total > 0 ? `− ${rupiah(data.cogs.total)}` : rupiah(0)}
              </p>
              <span className="text-[10px] text-slate-400">{pct(data.cogs.total)} dari omzet</span>
            </Panel>
            <Panel className="p-4">
              <p className="text-xs text-slate-500">Iklan Shopee</p>
              <p className="mt-1 text-lg font-bold text-violet-600">
                {data.opex.ads > 0 ? `− ${rupiah(data.opex.ads)}` : rupiah(0)}
              </p>
              <span className="text-[10px] text-slate-400">Shopee Ads Manager</span>
            </Panel>
            <Panel className="p-4 bg-emerald-50/50 border border-emerald-200">
              <p className="text-xs text-emerald-800 font-medium">Laba Bersih</p>
              <p className={`mt-1 text-lg font-extrabold ${data.net_profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {rupiah(data.net_profit)}
              </p>
              <span className="text-[10px] text-emerald-700 font-medium">{pct(data.net_profit)} margin</span>
            </Panel>
          </div>

          {/* Printable statement */}
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none">
            {/* Statement Header */}
            <div className="border-b border-slate-200 pb-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400">Toko: {shop.shop_name}</p>
              <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-navy">
                LAPORAN LABA RUGI ({basisTitle})
              </h1>
              <p className="mt-1.5 text-xs text-slate-500">
                Periode Pesanan: <b className="text-slate-700">{range.from} s/d {range.to}</b> ·{" "}
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  {data.counts.total_orders} pesanan
                </span>{" "}
                ({data.counts.completed_orders} selesai)
              </p>
            </div>

          <div className="mt-6 space-y-6 text-xs sm:text-sm">
            {/* 1. PENDAPATAN */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="uppercase tracking-wider">Pendapatan</span>
              </div>
              <div className="divide-y divide-slate-100 pl-4">
                <div className="flex items-center justify-between py-1.5 text-slate-600">
                  <span>Pendapatan Kotor (GMV)</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-400">100.0%</span>
                    <span className="w-28 text-right font-medium text-navy">{rupiah(data.revenue.gmv)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 font-bold text-navy border-t border-slate-200">
                  <span>Total Pendapatan</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-500">100.0%</span>
                    <span className="w-28 text-right font-bold text-navy">{rupiah(data.revenue.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. RINCIAN BIAYA (BIAYA PLATFORM) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="uppercase tracking-wider">Rincian Biaya (Biaya Platform)</span>
              </div>
              <div className="divide-y divide-slate-100 pl-4">
                {data.fees.items.map((f) => (
                  <div key={f.key} className="flex items-center justify-between py-1.5 text-slate-600">
                    <span>{f.label}</span>
                    <div className="flex gap-6">
                      <span className="w-14 text-right text-slate-400">{pct(f.amount)}</span>
                      <span className={`w-28 text-right font-medium ${f.amount < 0 ? "text-rose-600" : "text-navy"}`}>
                        {f.amount < 0 ? `(${rupiah(Math.abs(f.amount))})` : rupiah(f.amount)}
                      </span>
                    </div>
                  </div>
                ))}
                {data.fees.items.length === 0 && (
                  <div className="py-2 text-slate-400 italic">Tidak ada biaya platform pada periode ini.</div>
                )}
                <div className="flex items-center justify-between py-2 font-bold border-t border-slate-200">
                  <span className="text-slate-800">Total Biaya Platform</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-500">{pct(data.fees.total)}</span>
                    <span className={`w-28 text-right font-bold ${data.fees.total < 0 ? "text-rose-600" : "text-navy"}`}>
                      {data.fees.total < 0 ? `(${rupiah(Math.abs(data.fees.total))})` : rupiah(data.fees.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PENYESUAIAN (Hanya muncul jika ada penyesuaian/kompensasi dari Shopee) */}
            {(data.adjustments.items.length > 0 || data.adjustments.total !== 0) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="uppercase tracking-wider">Penyesuaian (Adjustments)</span>
                </div>
                <div className="divide-y divide-slate-100 pl-4">
                  {data.adjustments.items.map((adj) => (
                    <div key={adj.key} className="flex items-center justify-between py-1.5 text-slate-600">
                      <span>{adj.label}</span>
                      <div className="flex gap-6">
                        <span className="w-14 text-right text-slate-400">{pct(adj.amount)}</span>
                        <span className={`w-28 text-right font-medium ${adj.amount < 0 ? "text-rose-600" : "text-navy"}`}>
                          {adj.amount < 0 ? `(${rupiah(Math.abs(adj.amount))})` : rupiah(adj.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 font-bold border-t border-slate-200">
                    <span className="text-slate-800">Total Penyesuaian</span>
                    <div className="flex gap-6">
                      <span className="w-14 text-right text-slate-500">{pct(data.adjustments.total)}</span>
                      <span className={`w-28 text-right font-bold ${data.adjustments.total < 0 ? "text-rose-600" : "text-navy"}`}>
                        {data.adjustments.total < 0 ? `(${rupiah(Math.abs(data.adjustments.total))})` : rupiah(data.adjustments.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PENDAPATAN BERSIH */}
            <div className="rounded-xl bg-slate-50 p-3 sm:px-4 sm:py-3 border border-slate-200/80">
              <div className="flex items-center justify-between font-bold text-navy">
                <span className="uppercase tracking-wider">
                  Pendapatan Bersih {data.adjustments.total !== 0 ? "Setelah Biaya & Penyesuaian" : "Setelah Biaya Platform"}
                </span>
                <div className="flex gap-6">
                  <span className="w-14 text-right text-slate-600">{pct(data.net_revenue)}</span>
                  <span className="w-28 text-right font-black text-blue-700">{rupiah(data.net_revenue)}</span>
                </div>
              </div>
            </div>

            {/* 5. HARGA POKOK PENJUALAN */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="uppercase tracking-wider">Harga Pokok Penjualan</span>
              </div>
              <div className="divide-y divide-slate-100 pl-4">
                <div className="flex items-center justify-between py-1.5 text-slate-600">
                  <span>
                    Total COGS (HPP)
                    {basis === "settled_cogs_completed" && (
                      <span className="ml-1.5 text-[11px] text-slate-400">(pesanan selesai saja)</span>
                    )}
                  </span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-400">{pct(data.cogs.total)}</span>
                    <span className="w-28 text-right font-medium text-orange-600">
                      {data.cogs.total > 0 ? `(${rupiah(data.cogs.total)})` : rupiah(0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 font-bold border-t border-slate-200">
                  <span className="text-slate-800">Total Harga Pokok Penjualan</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-500">{pct(data.cogs.total)}</span>
                    <span className="w-28 text-right font-bold text-orange-600">
                      {data.cogs.total > 0 ? `(${rupiah(data.cogs.total)})` : rupiah(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. LABA KOTOR */}
            <div className="rounded-xl bg-slate-50 p-3 sm:px-4 sm:py-3 border border-slate-200/80">
              <div className="flex items-center justify-between font-bold text-navy">
                <span className="uppercase tracking-wider">Laba Kotor</span>
                <div className="flex gap-6">
                  <span className="w-14 text-right text-slate-600">{pct(data.gross_profit)}</span>
                  <span className="w-28 text-right font-black text-navy">{rupiah(data.gross_profit)}</span>
                </div>
              </div>
            </div>

            {/* 7. BEBAN OPERASIONAL */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="uppercase tracking-wider">Beban Operasional</span>
              </div>
              <div className="divide-y divide-slate-100 pl-4">
                <div className="flex items-center justify-between py-1.5 text-slate-600">
                  <span>Shopee Ads Manager</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-400">{pct(data.opex.ads)}</span>
                    <span className="w-28 text-right font-medium text-violet-600">
                      {data.opex.ads > 0 ? `(${rupiah(data.opex.ads)})` : rupiah(0)}
                    </span>
                  </div>
                </div>
                {(data.opex.other ?? 0) > 0 && (
                  <div className="flex items-center justify-between py-1.5 text-slate-600">
                    <span>Pengeluaran Toko Lainnya</span>
                    <div className="flex gap-6">
                      <span className="w-14 text-right text-slate-400">{pct(data.opex.other ?? 0)}</span>
                      <span className="w-28 text-right font-medium text-violet-600">({rupiah(data.opex.other ?? 0)})</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 font-bold border-t border-slate-200">
                  <span className="text-slate-800">Total Beban Operasional</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-500">{pct(data.opex.total)}</span>
                    <span className="w-28 text-right font-bold text-violet-600">
                      {data.opex.total > 0 ? `(${rupiah(data.opex.total)})` : rupiah(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. LABA OPERASIONAL */}
            <div className="rounded-xl bg-slate-50 p-3 sm:px-4 sm:py-3 border border-slate-200/80">
              <div className="flex items-center justify-between font-bold text-navy">
                <span className="uppercase tracking-wider">Laba Operasional</span>
                <div className="flex gap-6">
                  <span className="w-14 text-right text-slate-600">{pct(data.operating_profit)}</span>
                  <span className="w-28 text-right font-black text-navy">{rupiah(data.operating_profit)}</span>
                </div>
              </div>
            </div>

            {/* 9. LABA BERSIH (FINAL) */}
            <div className="mt-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/50 p-4 sm:px-5 sm:py-4">
              <div className="flex items-center justify-between font-black text-navy text-sm sm:text-base">
                <span className="uppercase tracking-wider text-emerald-900">Laba Bersih</span>
                <div className="flex gap-6">
                  <span className="w-14 text-right text-emerald-800">{pct(data.net_profit)}</span>
                  <span className={`w-28 text-right text-lg sm:text-xl font-extrabold ${data.net_profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {rupiah(data.net_profit)}
                  </span>
                </div>
              </div>
            </div>

            {data.counts.missing_cost_orders > 0 && (
              <p className="mt-2 text-center text-[11px] text-amber-700 italic">
                * Perhatian: Ada {data.counts.missing_cost_orders} pesanan yang produknya belum diisi HPP sehingga laba bersih terlihat lebih tinggi dari aslinya.
              </p>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
