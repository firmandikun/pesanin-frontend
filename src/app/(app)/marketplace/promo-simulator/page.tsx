"use client";
import { AlertTriangle, Calculator, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead, Panel, SearchBox } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, rupiah } from "@/lib/api";

/** Same rows as Cek Margin (GET /marketplace/listings/margins): price, real Shopee fee rate, HPP, ads per unit, units sold. */
type Row = {
  id: number; shop_id: number; shop_name: string | null; name: string; variant: string | null; sku: string | null; image: string | null;
  list_price: number; price: number; fee_rate: number; fee_estimated: boolean; hpp: number; ad_per_unit: number; units_30d: number;
};
type Data = { rows: Row[]; summary: { threshold: number; checked: number; no_hpp: number } };
type Shop = { id: number; shop_name: string; platform?: string; status: string; is_demo: boolean };
type Sim = Row & { base: number; pay: number; fee: number; ads: number; profit: number; pct: number; now: number; status: "rugi" | "tipis" | "aman"; maxDisc: number | null; volume: number | null };

const STATUS = {
  rugi: { label: "Rugi", cls: "bg-rose-100 text-rose-700" },
  tipis: { label: "Tipis", cls: "bg-amber-100 text-amber-700" },
  aman: { label: "Aman", cls: "bg-emerald-100 text-emerald-700" },
} as const;

const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

/**
 * Simulasi Promo: before joining a Shopee campaign (discount, flash sale, voucher, extra program fee),
 * shows the profit per unit of every variant at the promo price, which ones would sell at a loss,
 * the deepest discount that still breaks even, and how much more volume is needed to keep the same profit.
 * Pure calculation in the browser on the Cek Margin data; nothing is changed in Shopee.
 */
export default function PromoSimulatorPage() {
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [discount, setDiscount] = useState("15");
  const [voucher, setVoucher] = useState("0");
  const [extraFee, setExtraFee] = useState("0");
  const [base, setBase] = useState<"list" | "sold">("list");
  const [withAds, setWithAds] = useState(true);
  const [filter, setFilter] = useState<"bad" | "all" | "rugi" | "tipis" | "aman">("bad");
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((x) => (x.platform ?? "shopee") === "shopee" && x.status !== "disconnected" && !x.is_demo))).catch(() => {});
  }, []);
  useEffect(() => {
    setD(null);
    api<Data>(`/marketplace/listings/margins${shop ? `?shop_id=${shop}` : ""}`).then(setD).catch(() => setD({ rows: [], summary: { threshold: 10, checked: 0, no_hpp: 0 } }));
  }, [shop]);

  const threshold = d?.summary.threshold ?? 10;
  const sims: Sim[] = useMemo(() => (d?.rows ?? []).map((r) => {
    const disc = Math.min(95, num(discount)) / 100;
    const v = num(voucher);
    const f = (r.fee_rate + num(extraFee)) / 100;
    const ads = withAds ? r.ad_per_unit : 0;
    const b = base === "list" ? r.list_price : r.price;
    const pay = Math.max(0, Math.round(b * (1 - disc) - v));
    const fee = Math.round(pay * f);
    const profit = pay - fee - r.hpp - ads;
    const pct = pay > 0 ? Math.round((profit / pay) * 1000) / 10 : -100;
    // Today: same base price, no promo, current fee rate.
    const nowFee = Math.round(b * (r.fee_rate / 100));
    const now = b - nowFee - r.hpp - ads;
    // Deepest discount that still breaks even: b(1−x) − v ≥ (hpp + ads) / (1 − f).
    const need = (r.hpp + ads) / Math.max(0.05, 1 - f) + v;
    const maxDisc = b > 0 ? Math.floor((1 - need / b) * 100) : null;
    return {
      ...r, base: b, pay, fee, ads, profit, pct, now,
      status: profit < 0 ? "rugi" : pct < threshold ? "tipis" : "aman",
      maxDisc: maxDisc !== null && maxDisc >= 0 ? maxDisc : null,
      // Units needed per unit sold today to keep the same total profit.
      volume: now > 0 && profit > 0 ? now / profit : null,
    } as Sim;
  }), [d, discount, voucher, extraFee, base, withAds, threshold]);

  const shown = useMemo(() => sims
    .filter((s) => (filter === "all" || (filter === "bad" ? s.status !== "aman" : s.status === filter))
      && (!q || `${s.name} ${s.variant ?? ""} ${s.sku ?? ""}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.units_30d - a.units_30d || a.pct - b.pct), [sims, filter, q]);
  const count = (st: Sim["status"]) => sims.filter((s) => s.status === st).length;
  const sold = sims.filter((s) => s.units_30d > 0);
  const profitNow = sold.reduce((t, s) => t + s.now * s.units_30d, 0);
  const profitPromo = sold.reduce((t, s) => t + s.profit * s.units_30d, 0);
  const lift = profitNow > 0 && profitPromo > 0 ? Math.round((profitNow / profitPromo - 1) * 100) : null;

  const field = "input h-10 w-full pr-3";
  return (
    <div className="space-y-5">
      <PageHead title="Simulasi Promo" tutorial={false} crumbs={[["Marketplace"], ["Simulasi Promo"]]} />

      <Panel className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ee4d2d]"><Calculator size={20} /></span>
          <p className="text-sm text-slate-600">Hitung dulu sebelum ikut kampanye, flash sale, atau pasang voucher: berapa laba per pcs setelah diskon, potongan Shopee, HPP, dan iklan, produk mana yang jadi <b>rugi</b>, dan diskon paling dalam yang masih aman. Hanya simulasi, tidak ada yang diubah di Shopee.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Diskon</span>
            <span className="relative block"><input type="number" min={0} max={95} className={`${field} pl-3`} value={discount} onChange={(e) => setDiscount(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span></span></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Voucher toko per pesanan</span>
            <span className="relative block"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span><input type="number" min={0} className={`${field} pl-9`} value={voucher} onChange={(e) => setVoucher(e.target.value)} /></span></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Biaya program tambahan</span>
            <span className="relative block"><input type="number" min={0} max={30} step={0.5} className={`${field} pl-3`} value={extraFee} onChange={(e) => setExtraFee(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span></span>
            <span className="mt-1 block text-[11px] text-slate-400">Mis. Gratis Ongkir/Promo XTRA. Cek persentasenya di Seller Centre.</span></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Harga dasar</span>
            <Select className={`${field} pl-3`} value={base} onChange={(e) => setBase(e.target.value as "list" | "sold")}>
              <option value="list">Harga di Shopee sekarang</option>
              <option value="sold">Rata-rata harga terjual 30 hari</option>
            </Select></label>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" className="accent-brand-600" checked={withAds} onChange={(e) => setWithAds(e.target.checked)} />Hitung biaya iklan per pcs (rata-rata 30 hari)</label>
          {shops.length > 1 && <Select className="input h-9 w-56" value={shop} onChange={(e) => setShop(e.target.value)}><option value="">Semua toko</option>{shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}</Select>}
        </div>
      </Panel>

      {!d ? <Panel className="flex items-center justify-center gap-2 p-10 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />Menghitung…</Panel> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Jadi rugi</p><p className="mt-1 text-xl font-bold text-rose-600">{count("rugi")}</p><p className="text-[11px] text-slate-400">dari {sims.length} variasi dengan HPP</p></Panel>
            <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Margin tipis (&lt; {threshold}%)</p><p className="mt-1 text-xl font-bold text-amber-600">{count("tipis")}</p><p className="text-[11px] text-slate-400">aman: {count("aman")}</p></Panel>
            <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Laba 30 hari (volume sama)</p>
              <p className={`mt-1 text-xl font-bold ${profitPromo < 0 ? "text-rose-600" : "text-navy"}`}>{rupiah(profitPromo)}</p>
              <p className="text-[11px] text-slate-400">tanpa promo: {rupiah(profitNow)}</p></Panel>
            <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Penjualan harus naik</p>
              <p className="mt-1 text-xl font-bold text-navy">{lift === null ? (profitPromo <= 0 && profitNow > 0 ? "Tidak tertolong" : "–") : `+${lift}%`}</p>
              <p className="text-[11px] text-slate-400">agar total laba tetap sama</p></Panel>
          </div>

          {d.summary.no_hpp > 0 && (
            <Link href="/marketplace/products?cost=empty&bulk=1" className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0" />{d.summary.no_hpp} variasi belum punya HPP sehingga tidak ikut disimulasikan.<b className="ml-auto whitespace-nowrap">Isi HPP</b>
            </Link>
          )}

          <Panel>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
              {([["bad", "Rugi & tipis"], ["rugi", "Rugi"], ["tipis", "Tipis"], ["aman", "Aman"], ["all", "Semua"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className={`h-8 rounded-lg px-3 text-xs font-semibold ${filter === k ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
              ))}
              <div className="ml-auto w-full sm:w-64"><SearchBox value={q} onChange={setQ} placeholder="Cari produk / SKU" /></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2.5 font-semibold">Produk</th><th className="px-3 font-semibold">Harga promo</th><th className="px-3 font-semibold">Potongan Shopee</th>
                    <th className="px-3 font-semibold">HPP{withAds ? " + iklan" : ""}</th><th className="px-3 font-semibold">Laba / pcs</th><th className="px-3 font-semibold">Diskon maks. impas</th><th className="px-3 font-semibold">Terjual 30 hr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((s) => (
                    <tr key={s.id}>
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="truncate font-medium text-navy" title={s.name}>{s.name}</p>
                        <p className="truncate text-xs text-slate-400">{[s.variant, s.sku, shops.length > 1 ? s.shop_name : null].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="px-3"><b className="text-slate-800">{rupiah(s.pay)}</b><span className="block text-[11px] text-slate-400 line-through">{rupiah(s.base)}</span></td>
                      <td className="px-3 text-slate-600">{rupiah(s.fee)}<span className="block text-[11px] text-slate-400">{Math.round((s.fee_rate + num(extraFee)) * 10) / 10}%{s.fee_estimated ? " (perkiraan)" : ""}</span></td>
                      <td className="px-3 text-slate-600">{rupiah(s.hpp + s.ads)}</td>
                      <td className="px-3">
                        <span className={`font-bold ${s.profit < 0 ? "text-rose-600" : "text-slate-800"}`}>{rupiah(s.profit)}</span>
                        <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS[s.status].cls}`}>{STATUS[s.status].label} {s.pct}%</span>
                        <span className="block text-[11px] text-slate-400">tanpa promo {rupiah(s.now)}</span>
                      </td>
                      <td className="px-3 font-semibold">{s.maxDisc === null ? <span className="text-rose-600">sudah rugi</span> : <span className={s.maxDisc < num(discount) ? "text-rose-600" : "text-emerald-600"}>{s.maxDisc}%</span>}</td>
                      <td className="px-3 text-slate-600">{s.units_30d}{s.volume && s.volume > 1 && <span className="block text-[11px] text-slate-400">perlu ×{Math.round(s.volume * 10) / 10}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!shown.length && <p className="py-10 text-center text-sm text-slate-500">{sims.length ? "Tidak ada produk di filter ini." : "Belum ada produk Shopee dengan HPP. Isi HPP dulu agar bisa disimulasikan."}</p>}
            </div>
            <p className="flex items-start gap-2 border-t border-slate-100 p-4 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Potongan Shopee memakai persentase nyata tokomu 60 hari terakhir (komisi, layanan, transaksi), dikali harga setelah diskon & voucher. Voucher dihitung 1 pcs per pesanan. &quot;Diskon maks. impas&quot; = diskon terdalam yang masih balik modal (laba 0). Angka ini perkiraan; cek lagi rincian biaya di Seller Centre sebelum mendaftar kampanye.</p>
          </Panel>
        </>
      )}
    </div>
  );
}
