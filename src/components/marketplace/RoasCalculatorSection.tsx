"use client";
import { Check, Lightbulb, RotateCcw, Store, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/kit";
import { rupiah } from "@/lib/api";

export type CalcProduct = {
  item_id: number;
  name: string;
  price: number;
  cost_price?: number;
};

export type CalcSuggest = {
  roi_suggested?: number | null;
  category_name?: string | null;
};

type Props = {
  products: CalcProduct[];
  shopFeePct: number;
  suggests: Record<number, CalcSuggest>;
  onApplyRoas?: (itemId: number, roas: number) => void;
};

const STORE_TYPES = [
  { label: "Toko: Non-Star (Reguler)", adminPct: 4.5 },
  { label: "Toko: Star / Star+", adminPct: 6.5 },
  { label: "Toko: Shopee Mall", adminPct: 8.5 },
];

/**
 * Kalkulator ROAS & Simulasi Margin Cuan: populated directly from selected product details
 * (price, cost_price, category from Shopee API, and shop fee history).
 */
export function RoasCalculatorSection({ products, shopFeePct, suggests, onApplyRoas }: Props) {
  const [activeId, setActiveId] = useState<number>(0);
  const activeProduct = useMemo(
    () => products.find((p) => p.item_id === activeId) ?? products[0] ?? null,
    [products, activeId],
  );

  const [price, setPrice] = useState(0);
  const [hpp, setHpp] = useState(0);
  const [ops, setOps] = useState(0);
  const [adminPct, setAdminPct] = useState(shopFeePct);
  const [ongkirPct, setOngkirPct] = useState(0);
  const [processFee, setProcessFee] = useState(1250);
  const [taxPct, setTaxPct] = useState(0.5);
  const [storeIdx, setStoreIdx] = useState(1);

  const resetToProduct = (p: CalcProduct | null) => {
    setPrice(p?.price ?? 0);
    setHpp(p?.cost_price ?? 0);
    setOps(0);
    setAdminPct(shopFeePct);
    setOngkirPct(0);
    setProcessFee(1250);
    setTaxPct(0.5);
  };

  useEffect(() => {
    resetToProduct(activeProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProduct?.item_id, shopFeePct]);

  const sg = activeProduct ? suggests[activeProduct.item_id] : undefined;

  const calc = useMemo(() => {
    const p = Math.max(0, price);
    const adminFee = Math.round((p * Math.max(0, adminPct)) / 100);
    const ongkirFee = Math.round((p * Math.max(0, ongkirPct)) / 100);
    const taxFee = Math.round((p * Math.max(0, taxPct)) / 100);
    const marketplaceTotal = adminFee + ongkirFee + Math.max(0, processFee) + taxFee;
    const grossProfit = p - Math.max(0, hpp) - Math.max(0, ops) - marketplaceTotal;
    const grossMarginPct = p > 0 ? (grossProfit / p) * 100 : 0;

    const bepRoas = grossProfit > 0 && p > 0 ? Math.max(1, Number((p / grossProfit).toFixed(1))) : 0;
    const kompRoas = bepRoas > 0 ? Number(Math.max(bepRoas + 0.5, bepRoas * 1.5).toFixed(1)) : 0;
    const konsBase = sg?.roi_suggested && sg.roi_suggested > bepRoas ? sg.roi_suggested : bepRoas * 1.9;
    const konsRoas = bepRoas > 0 ? Number(Math.max(kompRoas + 0.3, konsBase).toFixed(1)) : 0;
    const prosRoas = bepRoas > 0 ? Number((bepRoas * 3.8).toFixed(1)) : 0;

    const tierStats = (roas: number) => {
      if (roas <= 0 || p <= 0) return { adCost: 0, netProfit: 0, netPct: 0 };
      const adCost = Math.round(p / roas);
      const netProfit = grossProfit - adCost;
      const netPct = (netProfit / p) * 100;
      return { adCost, netProfit, netPct };
    };

    const pctOf = (v: number) => (p > 0 ? Math.max(0, Math.min(100, (v / p) * 100)) : 0);

    return {
      p,
      adminFee,
      ongkirFee,
      taxFee,
      marketplaceTotal,
      grossProfit,
      grossMarginPct,
      bepRoas,
      kompRoas,
      konsRoas,
      prosRoas,
      komp: tierStats(kompRoas),
      kons: tierStats(konsRoas),
      pros: tierStats(prosRoas),
      hppBar: pctOf(hpp),
      mktBar: pctOf(marketplaceTotal),
      opsBar: pctOf(ops),
      profitBar: Math.max(0, pctOf(grossProfit)),
    };
  }, [price, hpp, ops, adminPct, ongkirPct, processFee, taxPct, sg?.roi_suggested]);

  return (
    <Panel className="space-y-5 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <TrendingUp size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Kalkulator ROAS &amp; Simulasi Margin Cuan</h2>
            <p className="text-xs text-slate-500">
              {activeProduct ? `${activeProduct.name} | Shopee Indonesia` : "Pilih produk untuk menyimulasikan BEP & Target ROAS"}
              {sg?.category_name ? ` · ${sg.category_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {products.length > 1 && (
            <select
              value={activeProduct?.item_id ?? ""}
              onChange={(e) => setActiveId(Number(e.target.value))}
              className="input h-8 max-w-[220px] bg-white text-xs"
            >
              {products.map((p) => (
                <option key={p.item_id} value={p.item_id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => resetToProduct(activeProduct)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* 4 Tier Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* BEP */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wide text-rose-700">BEP (TITIK IMPAS)</span>
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">Min. ROAS</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-rose-600">{calc.bepRoas > 0 ? `${calc.bepRoas}x` : "—"}</p>
          <div className="mt-2 border-t border-dashed border-rose-200 pt-2 text-[11px] text-rose-700">
            <p>Profit Bersih: <b>Rp 0 (0.0%)</b></p>
            <p className="text-[10px] text-rose-500">Batas iklan tanpa laba</p>
          </div>
        </div>

        {/* Kompetitif */}
        <button
          type="button"
          disabled={!activeProduct || calc.kompRoas <= 0}
          onClick={() => activeProduct && onApplyRoas?.(activeProduct.item_id, calc.kompRoas)}
          className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 text-left transition hover:border-amber-300 disabled:opacity-70"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wide text-amber-800">KOMPETITIF</span>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Scale Vol.</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-amber-600">{calc.kompRoas > 0 ? `${calc.kompRoas}x` : "—"}</p>
          <div className="mt-2 border-t border-dashed border-amber-200 pt-2 text-[11px] text-amber-900">
            <p>Profit Bersih: <b className="text-amber-700">+{rupiah(calc.komp.netProfit)} ({calc.komp.netPct.toFixed(1)}%)</b></p>
            <p className="text-[10px] text-slate-500">Iklan: {rupiah(calc.komp.adCost)}/item</p>
          </div>
        </button>

        {/* Konservatif */}
        <button
          type="button"
          disabled={!activeProduct || calc.konsRoas <= 0}
          onClick={() => activeProduct && onApplyRoas?.(activeProduct.item_id, calc.konsRoas)}
          className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3.5 text-left ring-1 ring-emerald-200 transition hover:border-emerald-400 disabled:opacity-70"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wide text-emerald-800">KONSERVATIF</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Rekomendasi</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-emerald-600">{calc.konsRoas > 0 ? `${calc.konsRoas}x` : "—"}</p>
          <div className="mt-2 border-t border-dashed border-emerald-200 pt-2 text-[11px] text-emerald-900">
            <p>Profit Bersih: <b className="text-emerald-700">+{rupiah(calc.kons.netProfit)} ({calc.kons.netPct.toFixed(1)}%)</b></p>
            <p className="text-[10px] text-slate-500">Iklan: {rupiah(calc.kons.adCost)}/item</p>
          </div>
        </button>

        {/* Prospektif */}
        <button
          type="button"
          disabled={!activeProduct || calc.prosRoas <= 0}
          onClick={() => activeProduct && onApplyRoas?.(activeProduct.item_id, calc.prosRoas)}
          className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 text-left transition hover:border-teal-300 disabled:opacity-70"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wide text-teal-800">PROSPEKTIF</span>
            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">Cuan Tebal</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-teal-600">{calc.prosRoas > 0 ? `${calc.prosRoas}x` : "—"}</p>
          <div className="mt-2 border-t border-dashed border-teal-200 pt-2 text-[11px] text-teal-900">
            <p>Profit Bersih: <b className="text-teal-700">+{rupiah(calc.pros.netProfit)} ({calc.pros.netPct.toFixed(1)}%)</b></p>
            <p className="text-[10px] text-slate-500">Iklan: {rupiah(calc.pros.adCost)}/item</p>
          </div>
        </button>
      </div>

      {/* Allocation Bar */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700">Alokasi Harga Jual ({rupiah(calc.p)}):</span>
          <span className={`font-semibold ${calc.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            ● Profit Kotor: {rupiah(calc.grossProfit)} ({calc.grossMarginPct.toFixed(1)}%)
          </span>
        </div>
        <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div style={{ width: `${calc.hppBar}%` }} className="bg-slate-500" />
          <div style={{ width: `${calc.mktBar}%` }} className="bg-indigo-500" />
          <div style={{ width: `${calc.opsBar}%` }} className="bg-violet-500" />
          <div style={{ width: `${calc.profitBar}%` }} className="bg-emerald-500" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span>■ HPP: <b>{rupiah(hpp)}</b> ({calc.hppBar.toFixed(1)}%)</span>
          <span>■ Potongan Marketplace: <b>{rupiah(calc.marketplaceTotal)}</b> ({calc.mktBar.toFixed(1)}%)</span>
          <span>■ Operasional: <b>{rupiah(ops)}</b> ({calc.opsBar.toFixed(1)}%)</span>
          <span className="text-emerald-700">■ Profit Kotor: <b>{rupiah(calc.grossProfit)}</b> ({calc.grossMarginPct.toFixed(1)}%)</span>
        </div>
      </div>

      {/* 3 Columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Col 1: Modal & Penjualan */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Wallet size={14} className="text-indigo-500" /> Modal &amp; Penjualan
          </h3>
          <label className="block rounded-lg border border-slate-200 bg-white p-3">
            <span className="text-[11px] text-slate-500">Harga Jual</span>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} className="mt-1 w-full text-sm font-bold text-slate-900 outline-none" />
          </label>
          <label className="block rounded-lg border border-slate-200 bg-white p-3">
            <span className="text-[11px] text-slate-500">HPP (Modal Pokok)</span>
            <input type="number" min={0} value={hpp} onChange={(e) => setHpp(Number(e.target.value) || 0)} className="mt-1 w-full text-sm font-bold text-slate-900 outline-none" />
          </label>
          <label className="block rounded-lg border border-slate-200 bg-white p-3">
            <span className="text-[11px] text-slate-500">Biaya Operasional / Packing</span>
            <input type="number" min={0} value={ops} onChange={(e) => setOps(Number(e.target.value) || 0)} className="mt-1 w-full text-sm font-bold text-slate-900 outline-none" />
          </label>
        </div>

        {/* Col 2: Potongan Marketplace Shopee */}
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Store size={14} className="text-indigo-500" /> Potongan Marketplace
            </h3>
            {sg?.category_name && <span className="max-w-[140px] truncate rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{sg.category_name}</span>}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-[11px] text-slate-500">Biaya Admin ({adminPct}%)</p>
              <p className="text-sm font-bold text-slate-900">{rupiah(calc.adminFee)}</p>
            </div>
            <input type="number" step="0.1" min={0} max={50} value={adminPct} onChange={(e) => setAdminPct(Number(e.target.value) || 0)} className="input h-8 w-20 text-right text-xs" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-[11px] text-slate-500">Gratis Ongkir Xtra ({ongkirPct}%)</p>
              <p className="text-sm font-bold text-slate-900">{rupiah(calc.ongkirFee)}</p>
            </div>
            <select value={ongkirPct} onChange={(e) => setOngkirPct(Number(e.target.value))} className="input h-8 w-24 text-xs">
              <option value={0}>0%</option>
              <option value={4}>4%</option>
              <option value={5.5}>5.5%</option>
              <option value={6}>6%</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-[11px] text-slate-500">Biaya Proses Pesanan</p>
              <p className="text-sm font-bold text-slate-900">{rupiah(processFee)}</p>
            </div>
            <input type="number" min={0} step={50} value={processFee} onChange={(e) => setProcessFee(Number(e.target.value) || 0)} className="input h-8 w-24 text-right text-xs" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-[11px] text-slate-500">Pajak Tambahan (PPh 22 {taxPct}%)</p>
              <p className="text-sm font-bold text-slate-900">{rupiah(calc.taxFee)}</p>
            </div>
            <button
              type="button"
              onClick={() => setTaxPct((v) => (v > 0 ? 0 : 0.5))}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${taxPct > 0 ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
            >
              {taxPct > 0 ? "PPh 22" : "Nonaktif"}
            </button>
          </div>

          <select
            value={storeIdx}
            onChange={(e) => {
              const i = Number(e.target.value);
              setStoreIdx(i);
              setAdminPct(STORE_TYPES[i].adminPct);
            }}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white outline-none"
          >
            {STORE_TYPES.map((t, i) => (
              <option key={t.label} value={i}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Col 3: Rekomendasi Iklan & Margin */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          <h3 className="text-xs font-bold text-slate-800">Rekomendasi Iklan &amp; Margin</h3>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
            <p className="text-[11px] text-emerald-700">Profit Kotor (Sebelum Iklan)</p>
            <p className="mt-0.5 text-base font-extrabold text-emerald-700">{rupiah(calc.grossProfit)} ({calc.grossMarginPct.toFixed(1)}%)</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-500">Maks. Biaya Iklan per Item (CPA Max)</p>
            <p className="mt-0.5 text-base font-extrabold text-slate-900">{rupiah(Math.max(0, calc.grossProfit))}</p>
            <p className="text-[10px] text-slate-400">Batas biaya iklan agar tidak merugi modal</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600">Profit Bersih jika ROAS Tercapai (klik untuk pakai):</p>
            {[
              { label: "Kompetitif", roas: calc.kompRoas, stat: calc.komp, cls: "border-amber-200 bg-amber-50/70 text-amber-800" },
              { label: "Konservatif", roas: calc.konsRoas, stat: calc.kons, cls: "border-emerald-300 bg-emerald-50 text-emerald-800", check: true },
              { label: "Prospektif", roas: calc.prosRoas, stat: calc.pros, cls: "border-teal-200 bg-teal-50/60 text-teal-800" },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                disabled={!activeProduct || row.roas <= 0}
                onClick={() => activeProduct && onApplyRoas?.(activeProduct.item_id, row.roas)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60 ${row.cls}`}
              >
                <span className="flex items-center gap-1">
                  {row.label} ({row.roas > 0 ? `${row.roas}x` : "—"})
                  {row.check && <Check size={12} />}
                </span>
                <span>+{rupiah(row.stat.netProfit)} ({row.stat.netPct.toFixed(1)}%)</span>
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2.5 text-[11px] text-indigo-800">
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-indigo-500" />
            <span>Tips: Targetkan ROAS minimal <b>{calc.konsRoas > 0 ? `${calc.konsRoas}x` : "—"}</b> untuk profit konsisten.</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
