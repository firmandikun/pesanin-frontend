"use client";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Data = {
  performance: { sales: number; orders: number; items: number; clicks: number; commission: number; roi: number; buyers: number; new_buyers: number; range: string | null } | null;
  orders: { order_sn: string | null; status: string | null; affiliate: string | null; channel: string | null; commission: number }[];
  error: string | null;
};

/** Shopee Affiliate (AMS): sales from affiliates/creators in the last 30 days and the commission paid. Loaded on demand. */
export function AffiliatePanel({ shopId }: { shopId: number }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try { setD(await api<Data>(`/marketplace/shops/${shopId}/affiliate`)); }
    catch (e) { setD({ performance: null, orders: [], error: e instanceof ApiError ? e.message : "Gagal memuat data affiliate" }); }
    finally { setBusy(false); }
  };
  const p = d?.performance;
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 font-bold text-navy"><Users size={18} className="text-brand-600" />Affiliate Shopee</h2><p className="text-xs text-slate-500">Penjualan dari kreator/affiliate 30 hari terakhir dan komisi yang dibayar toko</p></div>
        <button onClick={load} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-navy hover:bg-slate-200 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}{d ? "Muat ulang" : "Tampilkan"}</button>
      </div>
      {d?.error && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{d.error}</p>}
      {p && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["Penjualan", rupiah(p.sales)], ["Pesanan", p.orders.toLocaleString("id-ID")], ["Komisi (estimasi)", rupiah(p.commission)], ["ROI", `${p.roi}×`], ["Klik", p.clicks.toLocaleString("id-ID")], ["Item terjual", p.items.toLocaleString("id-ID")], ["Pembeli", p.buyers.toLocaleString("id-ID")], ["Pembeli baru", p.new_buyers.toLocaleString("id-ID")]] as const)
              .map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className="font-bold text-navy">{v}</p></div>)}
          </div>
          {p.range && <p className="mt-2 text-[11px] text-slate-400">Data Shopee: {p.range}</p>}
          {d.orders.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="text-left text-slate-500"><tr><th className="py-2">No. Pesanan</th><th>Affiliate</th><th>Kanal</th><th>Status</th><th className="text-right">Komisi</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{d.orders.map((o, i) => <tr key={`${o.order_sn}-${i}`}><td className="py-2 font-mono">{o.order_sn}</td><td>{o.affiliate ?? "-"}</td><td>{o.channel ?? "-"}</td><td>{o.status ?? "-"}</td><td className="text-right font-semibold">{rupiah(o.commission)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
