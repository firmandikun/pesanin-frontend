"use client";

import { AlertCircle, Download, FileSpreadsheet, Info, Loader2, Printer, Store } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((x) =>
      setShop(x.shops.find((s) => s.id === shopId) ?? null),
    );
  }, [shopId]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({
      from: range.from,
      to: range.to,
      basis,
    }).toString();
    api<StatementData>(`/marketplace/shops/${shopId}/statement?${q}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [shopId, range.from, range.to, basis]);

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
      <PageHead
        title="Laporan Laba Rugi Proyek/Toko"
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
          onClick={() => window.print()}
          className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Printer size={16} />
          Cetak / PDF
        </button>
      </PageHead>

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
        <Link
          href={`/marketplace/shops/${shop.id}/finance`}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Laba Rugi &amp; Arus Kas
        </Link>
        <span className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm">
          Laporan Laba Rugi (FinKami)
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
                Mengapa laporan ini selaras dengan FinKami dan berbeda dengan tab Transaksi &quot;Semua&quot;?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-sky-800">
                <li>
                  <b>Status Pesanan:</b> Tab &quot;Semua transaksi&quot; di menu Transaksi menjumlahkan seluruh pesanan termasuk yang dibatalkan dan yang masih dalam proses kirim. Laporan ini mengecualikan pesanan batal dari omzet penjualan kotor.
                </li>
                <li>
                  <b>HPP Selesai:</b> Di mode <i>HPP Selesai</i>, HPP hanya dihitung dari pesanan yang statusnya sudah <b>Selesai (Completed)</b>, persis seperti metode kalkulasi FinKami.
                </li>
                <li>
                  <b>Biaya Iklan Shopee:</b> Menggunakan total biaya riil dari <b>Shopee Ads Manager</b> toko untuk periode ini (bukan estimasi biaya per konversi per transaksi).
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filter Basis Pills (Like FinKami) */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            key: "settled",
            label: "Berbasis Pesanan Sudah Cair",
            desc: "Laporan dibuat berdasarkan tanggal pesanan dibuat, HPP & biaya hanya pesanan yang sudah cair/selesai.",
          },
          {
            key: "settled_cogs_completed",
            label: "Berbasis Pesanan Sudah Cair & Belum Cair (HPP Selesai)",
            badge: "DIREKOMENDASIKAN",
            desc: "Laporan dibuat berdasarkan tanggal pesanan dibuat, HPP hanya dihitung jika status pesanan selesai.",
          },
          {
            key: "all_active",
            label: "Berbasis Pesanan Sudah Cair + Belum Cair",
            desc: "Laporan dibuat berdasarkan tanggal pesanan dibuat, menghitung HPP untuk seluruh pesanan aktif.",
          },
        ].map((item) => {
          const active = basis === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setBasis(item.key as typeof basis)}
              className={`relative flex flex-col justify-start text-left rounded-xl border p-3.5 transition ${
                active
                  ? "border-sky-500 bg-sky-50/60 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {item.badge && (
                <span className="mb-1.5 w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-800 uppercase">
                  {item.badge}
                </span>
              )}
              <b className={`text-xs ${active ? "text-sky-900" : "text-slate-800"}`}>
                {item.label}
              </b>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="inline-flex items-center gap-2.5 text-sm text-slate-600">
            <Loader2 size={20} className="animate-spin text-navy" />
            <span>Menghitung Laporan Laba Rugi {shop.shop_name}…</span>
          </div>
        </div>
      ) : !data ? (
        <div className="py-24 text-center text-sm text-slate-400">Gagal memuat data laporan.</div>
      ) : (
        /* FinKami-Style Printable Statement Paper */
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none">
          {/* Statement Header */}
          <div className="border-b border-slate-200 pb-5 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400">Proyek / Toko: {shop.shop_name}</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-navy">
              LAPORAN LABA RUGI PROYEK ({basisTitle})
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Periode Pesanan: <b className="text-slate-700">{range.from} s/d {range.to}</b> ·{" "}
              {data.counts.total_orders} pesanan ({data.counts.completed_orders} selesai)
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

            {/* 3. PENYESUAIAN */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="uppercase tracking-wider">Penyesuaian</span>
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
                {data.adjustments.items.length === 0 && (
                  <div className="flex items-center justify-between py-1.5 text-slate-600">
                    <span>Total Adjustments</span>
                    <div className="flex gap-6">
                      <span className="w-14 text-right text-slate-400">0.0%</span>
                      <span className="w-28 text-right font-medium text-slate-500">Rp0</span>
                    </div>
                  </div>
                )}
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

            {/* 4. PENDAPATAN BERSIH SETELAH BIAYA & PENYESUAIAN */}
            <div className="rounded-xl bg-slate-50 p-3 sm:px-4 sm:py-3 border border-slate-200/80">
              <div className="flex items-center justify-between font-bold text-navy">
                <span className="uppercase tracking-wider">Pendapatan Bersih Setelah Biaya &amp; Penyesuaian</span>
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
                  <span>Shopee Ads Manager (Saldo Iklan Toko)</span>
                  <div className="flex gap-6">
                    <span className="w-14 text-right text-slate-400">{pct(data.opex.ads)}</span>
                    <span className="w-28 text-right font-medium text-violet-600">
                      {data.opex.ads > 0 ? `(${rupiah(data.opex.ads)})` : rupiah(0)}
                    </span>
                  </div>
                </div>
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
      )}
    </div>
  );
}
