"use client";
import { CalendarClock, Download, Info, Loader2, RefreshCcw } from "lucide-react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { useEffect, useState } from "react";
import { api, download, rupiah } from "@/lib/api";
import { EmptyState, Panel, RangeButton, useRange } from "@/components/kit";

const Coin = ({ c }: { c: string }) => <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c}`}><span className="h-4 w-5 rounded bg-white/80" /></span>;

export default function Balance() {
  const [range, setRange] = useRange(0);
  const [d, setD] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { api(`/balance?${new URLSearchParams(range)}`).then(setD); }, [range]);
  const refreshShopee = () => { setRefreshing(true); api(`/balance?${new URLSearchParams({ ...range, fresh: "1" })}`).then(setD).finally(() => setRefreshing(false)); };
  const shopee: ShopeeWallet[] = d?.shopee ?? [];
  const p = d?.period ?? {};
  const small = (label: string, v: number) => (
    <div className="rounded-lg border border-slate-100 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-semibold text-emerald-600">{rupiah(v)}</div></div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-[34px] font-bold text-slate-800">Balance</h1>

      {shopee.length > 0 && (
        <Panel className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-800"><ShopeeMark size={18} />Saldo Shopee</h2>
            <button onClick={refreshShopee} disabled={refreshing} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}Perbarui dari Shopee
            </button>
          </div>
          {shopee.map((w) => <ShopeeWalletCard key={w.shop_id} w={w} showName={shopee.length > 1} />)}
          <p className="text-xs text-slate-500">Diambil langsung dari Shopee (dompet penjual & ringkasan penghasilan). Penarikan saldo Shopee dilakukan di Shopee Seller Centre.</p>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <div className="grid gap-4 p-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-1 text-sm text-slate-600">Saldo Pesanin Tersedia <span className="text-xs text-slate-400">(checkout web & manual)</span> <Info size={13} className="text-slate-400" /></div>
            <div className="mt-3 flex items-center gap-3"><Coin c="bg-orange-200" /><span className="text-3xl font-bold text-slate-800">{rupiah(d?.available ?? 0)}</span></div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 pr-4"><Coin c="bg-orange-200" /><div><div className="text-xs text-slate-500">Dalam Proses Penarikan</div><div className="font-semibold text-slate-800">{rupiah(d?.withdrawing ?? 0)}</div></div></div>
            <div className="flex items-center gap-3 pl-4"><Coin c="bg-amber-200" /><div><div className="flex items-center gap-1 text-xs text-slate-500">Saldo Pending <Info size={12} /></div><div className="font-semibold text-slate-800">{rupiah(d?.pending ?? 0)}</div></div></div>
          </div>
        </div>
        <div className="bg-brand-50 px-6 py-2.5 text-center text-xs text-slate-600">Saldo Pesanin dihitung dari pesanan checkout web & manual yang sudah dibayar (pesanan Shopee tidak termasuk). Penarikan dana dilakukan langsung ke rekening yang terdaftar di <b>Account Settings</b>.</div>
      </Panel>

      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-[17px] font-semibold text-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500"><CalendarClock size={16} /></span>Periode Laporan</h2>
          <RangeButton value={range} onChange={setRange} />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-100 p-4 md:row-span-3">
            <div className="text-xs text-slate-500">Net COD Revenues</div><div className="mb-3 text-2xl font-bold text-emerald-600">{rupiah(p.net_cod_revenue)}</div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Collected From Customer</div><div className="font-semibold">{rupiah(p.collected_from_customer)}</div>
            <div className="mt-2 text-xs text-slate-500">COD Shipping Fees You Paid</div><div className="font-semibold">{rupiah(p.cod_shipping_fees)}</div>
          </div>
          <div className="rounded-lg border border-slate-100 p-4 md:row-span-3">
            <div className="text-xs text-slate-500">Net Shipping Fees You Save</div><div className="mb-3 text-2xl font-bold text-emerald-600">{rupiah(p.net_shipping_saved)}</div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Menghemat Ongkos Kirim</div><div className="font-semibold">{rupiah(p.shipping_saved)}</div>
            <div className="mt-2 text-xs text-slate-500">Ongkos Kirim Return</div><div className="font-semibold">{rupiah(p.return_shipping)}</div>
          </div>
          {small("Penarikan Selesai", p.withdrawn)}{small("Pendapatan COD", p.cod_income)}
          {small("Total Saldo yang Ditambahkan", p.topup)}{small("Total Invoice yang Dibayarkan", p.invoices_paid)}
          {small("Total Refund yang Didapat", p.refunds)}{small("Total Klaim yang Diterima", p.claims)}
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

type ShopeeWallet = {
  shop_id: number; shop_name: string; balance: number | null; balance_at: string | null; pending: number | null; released: number | null; error: string | null;
  transactions: { date: string | null; type: string; order_sn: string | null; amount: number; balance: number; status: string | null }[];
};

/** One shop's Shopee seller balance: wallet, pending and released income, and the latest wallet movements. */
function ShopeeWalletCard({ w, showName }: { w: ShopeeWallet; showName: boolean }) {
  const when = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
  const money = (v: number | null) => (v === null ? "–" : rupiah(v));
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      {showName && <div className="text-sm font-semibold text-slate-700">{w.shop_name}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div><div className="text-xs text-slate-500">Saldo Penjual Shopee</div><div className="mt-1 text-2xl font-bold text-slate-800">{money(w.balance)}</div>{w.balance_at && <div className="text-[11px] text-slate-400">per transaksi terakhir {when(w.balance_at)}</div>}</div>
        <div><div className="text-xs text-slate-500">Penghasilan Belum Cair</div><div className="mt-1 text-xl font-semibold text-amber-600">{money(w.pending)}</div></div>
        <div><div className="text-xs text-slate-500">Penghasilan Sudah Cair</div><div className="mt-1 text-xl font-semibold text-emerald-600">{money(w.released)}</div></div>
      </div>
      {w.error && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">Sebagian data Shopee belum bisa diambil: {w.error}</p>}
      {w.transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1.5 font-medium">Tanggal</th><th className="font-medium">Transaksi</th><th className="font-medium">No. Pesanan</th><th className="text-right font-medium">Jumlah</th><th className="text-right font-medium">Saldo</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {w.transactions.map((t, i) => (
                <tr key={i}><td className="py-1.5 text-slate-500">{when(t.date)}</td><td className="text-slate-700">{t.type}</td><td className="font-mono text-xs text-slate-500">{t.order_sn ?? "-"}</td>
                  <td className={`text-right font-semibold ${t.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>{t.amount < 0 ? "−" : "+"}{rupiah(Math.abs(t.amount))}</td><td className="text-right text-slate-600">{rupiah(t.balance)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
