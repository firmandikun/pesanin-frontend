"use client";
import { AlertTriangle, ArrowDownRight, Megaphone, Receipt, Store, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DateRangePicker } from "@/components/DatePicker";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, isoDate, rupiah } from "@/lib/api";

type Money = { orders: number; items: number; gmv: number; revenue: number; fees: number; cogs: number; ads: number; gross_profit: number; net_profit: number; margin: number; roas: number | null };
type Data = {
  summary: Money & { pending_fee_orders: number; missing_cost_orders: number };
  by_channel: (Money & { key: string; label: string })[];
  daily: { date: string; revenue: number; net: number; ads: number }[];
  products: { key: string; name: string; qty: number; revenue: number; fees: number; cogs: number; gross: number; channels: Record<string, number> }[];
  ads_by_platform: { platform: string; label: string; amount: number }[];
};

const short = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} jt` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(n));

/** Daily revenue bars with the net-profit line on top. */
function DailyChart({ rows }: { rows: Data["daily"] }) {
  const W = 1000, H = 240, P = { l: 52, r: 8, t: 10, b: 26 };
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  const min = Math.min(0, ...rows.map((r) => r.net));
  const y = (v: number) => P.t + ((max - v) / (max - min)) * (H - P.t - P.b);
  const bw = (W - P.l - P.r) / Math.max(1, rows.length);
  const x = (i: number) => P.l + i * bw + bw / 2;
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.net)}`).join(" ");
  const ticks = [max, max / 2, 0, ...(min < 0 ? [min] : [])];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full" role="img" aria-label="Grafik omset dan laba bersih harian">
      {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t ? "3 4" : undefined} /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{short(t)}</text></g>)}
      {rows.map((r, i) => <rect key={r.date} x={x(i) - bw * 0.32} width={bw * 0.64} y={y(r.revenue)} height={Math.max(0, y(0) - y(r.revenue))} rx="2" fill="var(--color-brand-200)"><title>{`${r.date}\nOmset ${rupiah(r.revenue)}\nIklan ${rupiah(r.ads)}\nLaba bersih ${rupiah(r.net)}`}</title></rect>)}
      <path d={line} fill="none" stroke="var(--color-navy)" strokeWidth="2.2" strokeLinejoin="round" />
      {rows.map((r, i) => (i % Math.ceil(rows.length / 8) === 0 ? <text key={r.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">{new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</text> : null))}
    </svg>
  );
}

function Profit() {
  const sp = useSearchParams();
  const [range, setRange] = useState({ from: isoDate(new Date(Date.now() - 29 * 864e5)), to: isoDate(new Date()) });
  const [channel, setChannel] = useState(sp.get("channel") ?? "");
  const [shopId, setShopId] = useState(sp.get("shop_id") ?? "");
  const [shops, setShops] = useState<{ id: number; shop_name: string }[]>([]);
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => { api("/marketplace/shops").then((x) => setShops(x.shops)).catch(() => {}); }, []);
  useEffect(() => {
    setD(null);
    api<Data>(`/reports/profit?${new URLSearchParams({ ...range, ...(channel ? { channel } : {}), ...(shopId ? { shop_id: shopId } : {}) })}`).then(setD);
  }, [range, channel, shopId]);

  const s = d?.summary;
  const steps = s ? [
    ["Pendapatan produk", s.revenue, "Omset dikurangi ongkir & biaya COD yang dibayar pembeli"],
    ["Potongan marketplace", -s.fees, "Komisi, layanan, transaksi, ongkir ditanggung penjual"],
    ["HPP (modal produk)", -s.cogs, "Harga pokok × jumlah terjual"],
    ["Biaya iklan", -s.ads, "Meta, TikTok, Google, Shopee Ads"],
  ] as const : [];

  return (
    <div className="space-y-5">
      <PageHead title="Laba Bersih" tutorial={false} crumbs={[["Laporan"], ["Laba Bersih"]]}>
        <Select className="input w-48" value={channel} onChange={(e) => { setChannel(e.target.value); setShopId(""); }}>
          <option value="">Semua channel</option><option value="website">Website & Medsos</option><option value="shopee">Shopee</option><option value="manual">Order manual</option>
        </Select>
        {channel === "shopee" && shops.length > 0 && (
          <Select className="input w-52" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">Semua toko Shopee</option>{shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
          </Select>
        )}
        <DateRangePicker value={range} onChange={setRange} />
      </PageHead>

      {!d || !s ? <div className="py-24 text-center text-sm text-slate-400">Menghitung laba…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [Wallet, "Omset (GMV)", rupiah(s.gmv), `${s.orders} pesanan · ${s.items} item`, "bg-navy-50 text-navy"],
              [Receipt, "Laba kotor", rupiah(s.gross_profit), "Setelah potongan & HPP", "bg-sky-50 text-sky-600"],
              [Megaphone, "Biaya iklan", rupiah(s.ads), s.roas ? `ROAS ${s.roas.toLocaleString("id-ID")}×` : "Belum ada data iklan", "bg-amber-50 text-amber-600"],
              [TrendingUp, "Laba bersih", rupiah(s.net_profit), `Margin ${s.margin.toLocaleString("id-ID")}% dari pendapatan`, s.net_profit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"],
            ].map(([Icon, label, value, sub, tone]) => {
              const I = Icon as typeof Wallet;
              return (
                <div key={label as string} className="surface flex items-start gap-3 p-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><I size={19} /></span>
                  <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label as string}</p><p className="truncate text-xl font-bold text-navy">{value as string}</p><p className="text-xs text-slate-500">{sub as string}</p></div>
                </div>
              );
            })}
          </div>

          {(s.pending_fee_orders > 0 || s.missing_cost_orders > 0) && (
            <div className="space-y-1.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {s.pending_fee_orders > 0 && <p className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{s.pending_fee_orders} pesanan Shopee belum final — potongannya diestimasi dari rata-rata toko sampai dana dilepas Shopee.</p>}
              {s.missing_cost_orders > 0 && <p className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{s.missing_cost_orders} pesanan belum punya HPP (dianggap 0). Isi harga modal di <Link href="/products" className="font-semibold underline">Produk</Link> atau hubungkan listing di <Link href="/marketplace/products" className="font-semibold underline">Produk Marketplace</Link>.</p>}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <Panel className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-navy">Omset & laba bersih harian</h2>
                <span className="flex gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-200" />Pendapatan</span><span className="flex items-center gap-1.5"><i className="h-0.5 w-4 bg-navy" />Laba bersih</span></span>
              </div>
              <DailyChart rows={d.daily} />
            </Panel>

            <Panel className="p-5">
              <h2 className="font-bold text-navy">Dari pendapatan ke laba</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {steps.map(([l, v, hint]) => (
                  <li key={l} className="flex items-start justify-between gap-3">
                    <span><span className="block text-slate-700">{l}</span><span className="text-xs text-slate-400">{hint}</span></span>
                    <span className={`whitespace-nowrap font-semibold ${v < 0 ? "text-rose-600" : "text-navy"}`}>{v < 0 ? "−" : ""}{rupiah(Math.abs(v))}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-slate-100 pt-3 text-base"><b className="text-navy">Laba bersih</b><b className={s.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{rupiah(s.net_profit)}</b></li>
              </ul>
              {d.ads_by_platform.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Biaya iklan per platform</p>
                  {d.ads_by_platform.map((a) => <div key={a.platform} className="flex justify-between py-1 text-sm"><span className="text-slate-600">{a.label}</span><span className="font-medium text-navy">{rupiah(a.amount)}</span></div>)}
                </div>
              )}
              <Link href="/reports/ads" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Input biaya iklan<ArrowDownRight size={15} className="-rotate-90" /></Link>
            </Panel>
          </div>

          <Panel>
            <div className="flex items-center gap-2 px-5 pt-5"><Store size={18} className="text-slate-500" /><h2 className="font-bold text-navy">Per channel & toko</h2></div>
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Channel", "Pesanan", "Pendapatan", "Potongan", "HPP", "Iklan", "ROAS", "Laba bersih", "Margin"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {d.by_channel.map((c) => (
                    <tr key={c.key}>
                      <td className="px-3 py-3 font-medium text-navy"><span className="flex items-center gap-2">{c.key.startsWith("shopee") && <ShopeeMark size={16} />}{c.label.replace("Contoh: ", "")}</span></td>
                      <td className="px-3 py-3">{c.orders}</td>
                      <td className="px-3 py-3">{rupiah(c.revenue)}</td>
                      <td className="px-3 py-3 text-rose-600">{c.fees ? `−${rupiah(c.fees)}` : "-"}</td>
                      <td className="px-3 py-3 text-rose-600">{c.cogs ? `−${rupiah(c.cogs)}` : "-"}</td>
                      <td className="px-3 py-3 text-rose-600">{c.ads ? `−${rupiah(c.ads)}` : "-"}</td>
                      <td className="px-3 py-3">{c.roas ? `${c.roas.toLocaleString("id-ID")}×` : "-"}</td>
                      <td className={`px-3 py-3 font-semibold ${c.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{rupiah(c.net_profit)}</td>
                      <td className="px-3 py-3">{c.margin.toLocaleString("id-ID")}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.by_channel.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Belum ada penjualan di periode ini.</p>}
            </div>
          </Panel>

          <Panel>
            <h2 className="px-5 pt-5 font-bold text-navy">Produk terlaris</h2>
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Produk", "Terjual", "Website / Shopee", "Pendapatan", "Potongan + HPP", "Laba kotor"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {d.products.map((p) => (
                    <tr key={p.key}>
                      <td className="px-3 py-3 font-medium text-navy">{p.name}{p.key.startsWith("n") && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">belum terhubung</span>}</td>
                      <td className="px-3 py-3">{p.qty}</td>
                      <td className="px-3 py-3 text-slate-600">{(p.channels.website ?? 0) + (p.channels.manual ?? 0)} / {p.channels.shopee ?? 0}</td>
                      <td className="px-3 py-3">{rupiah(p.revenue)}</td>
                      <td className="px-3 py-3 text-rose-600">−{rupiah(p.fees + p.cogs)}</td>
                      <td className="px-3 py-3 font-semibold text-navy">{rupiah(p.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense><Profit /></Suspense>;
}
