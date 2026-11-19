"use client";
import { CalendarClock, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { api, download, rupiah } from "@/lib/api";
import { EmptyState, Panel, RangeButton, useRange } from "@/components/kit";

const Coin = ({ c }: { c: string }) => <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c}`}><span className="h-4 w-5 rounded bg-white/80" /></span>;

export default function Balance() {
  const [range, setRange] = useRange();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/balance?${new URLSearchParams(range)}`).then(setD); }, [range]);
  const p = d?.period ?? {};
  const small = (label: string, v: number) => (
    <div className="rounded-lg border border-slate-100 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-semibold text-emerald-600">{rupiah(v)}</div></div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-[34px] font-bold text-slate-800">Saldo</h1>


      <Panel className="overflow-hidden">
        <div className="grid gap-4 p-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-1 text-sm text-slate-600">Dana di Pesanin <span className="text-xs text-slate-400">(E-Payment lewat Midtrans Pesanin)</span></div>
            <div className="mt-3 flex items-center gap-3"><Coin c="bg-orange-200" /><span className="text-3xl font-bold text-slate-800">{rupiah(d?.held ?? 0)}</span></div>
            <p className="mt-2 text-xs text-slate-500">Total pembayaran lunas yang masuk ke akun Midtrans Pesanin, belum dipotong biaya Midtrans.</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 pr-4"><Coin c="bg-sky-200" /><div><div className="text-xs text-slate-500">E-Payment menunggu dibayar</div><div className="font-semibold text-slate-800">{rupiah(d?.held_unpaid ?? 0)}</div></div></div>
            <div className="flex items-center gap-3 pl-4"><Coin c="bg-amber-200" /><div><div className="text-xs text-slate-500">COD dalam pengiriman</div><div className="font-semibold text-slate-800">{rupiah(d?.cod_pending ?? 0)}</div></div></div>
          </div>
        </div>
        <div className="bg-brand-50 px-6 py-2.5 text-center text-xs text-slate-600">Transfer bank dan COD masuk langsung ke rekening / kurir kamu, jadi tidak dihitung di Dana di Pesanin. Saldo Shopee ada di Marketplace → Saldo.</div>
      </Panel>

      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-[17px] font-semibold text-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500"><CalendarClock size={16} /></span>Periode Laporan</h2>
          <RangeButton value={range} onChange={setRange} />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-100 p-4 md:row-span-2">
            <div className="text-xs text-slate-500">Masuk lewat Midtrans Pesanin</div><div className="mb-3 text-2xl font-bold text-emerald-600">{rupiah(p.platform_received)}</div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Diterima langsung ke kamu</div><div className="font-semibold">{rupiah(p.direct_received)}</div>
            <div className="mt-1 text-[11px] text-slate-400">Transfer bank &amp; Midtrans milik kamu</div>
          </div>
          <div className="rounded-lg border border-slate-100 p-4 md:row-span-2">
            <div className="text-xs text-slate-500">Pendapatan Bersih COD</div><div className="mb-3 text-2xl font-bold text-emerald-600">{rupiah(p.net_cod_revenue)}</div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Ditagih dari pembeli</div><div className="font-semibold">{rupiah(p.collected_from_customer)}</div>
            <div className="mt-2 text-xs text-slate-500">Ongkir &amp; biaya COD</div><div className="font-semibold">{rupiah(p.cod_shipping_fees)}</div>
          </div>
          {small("Ongkos Kirim Retur", p.return_shipping)}{small("Total Refund", p.refunds)}
        </div>
      </Panel>

      <Panel>
        <div className="flex justify-end p-4"><button onClick={() => download(`/orders/export?payment_status=paid&from=${range.from}&to=${range.to}`, "balance.csv")} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm"><Download size={16} />Export</button></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500">{["Tanggal", "Courier", "Type", "Deskripsi", "Jumlah", "Status Produk", "Invoice ID"].map((h) => <th key={h} className="whitespace-nowrap px-5 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(d?.mutations ?? []).map((m: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">{new Date(m.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-5">{m.courier ?? "-"}</td><td className="px-5">{m.type}</td><td className="px-5">{m.description}</td>
                <td className="whitespace-nowrap px-5 font-semibold text-emerald-600">+{rupiah(m.amount)}</td><td className="px-5 capitalize">{m.status}</td><td className="px-5 font-mono text-xs">{m.invoice}</td>
              </tr>
            ))}</tbody>
          </table>
          {d && !d.mutations.length && <EmptyState text="No records found" variant="money" />}
        </div>
      </Panel>
    </div>
  );
}

