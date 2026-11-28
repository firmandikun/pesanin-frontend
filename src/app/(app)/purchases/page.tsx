"use client";
import { AlertTriangle, PackageOpen, PackageSearch, ShoppingBag, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { EmptyState, PageHead, Pager, Panel, PrimaryBtn, SearchBox } from "@/components/kit";
import { Purchase, PurchaseDetail, PurchaseForm } from "@/components/finance/PurchaseDialogs";
import { api, rupiah } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Summary = { payable: number; overdue: number; awaiting_goods: number; bought_this_month: number };
type Res = { summary: Summary; data: Purchase[]; current_page: number; last_page: number; total: number };

const TABS: [string, string][] = [["", "Semua"], ["ordered", "Menunggu barang"], ["unpaid", "Belum lunas"], ["received", "Diterima"], ["draft", "Draf"], ["cancelled", "Dibatalkan"]];
const PAY: Record<string, [string, string]> = { unpaid: ["Belum bayar", "bg-rose-50 text-rose-700"], partial: ["Sebagian", "bg-amber-50 text-amber-700"], paid: ["Lunas", "bg-emerald-50 text-emerald-700"] };
const STATUS: Record<string, string> = { draft: "bg-slate-100 text-slate-600", ordered: "bg-sky-50 text-sky-700", received: "bg-emerald-50 text-emerald-700", cancelled: "bg-slate-100 text-slate-400 line-through" };

/**
 * Pembelian (PO): buy stock from suppliers. Receiving a PO adds the stock (Shopee Stok Master or web products) and
 * updates HPP with the moving average; payments track what is still owed to each supplier.
 */
function Purchases() {
  const sp = useSearchParams();
  const { user } = useAuth();
  // Warehouse staff (gudang) may receive goods but not edit prices or pay suppliers.
  const canManage = !(user as any)?.member || (user as any)?.member?.role === "admin";
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Res | null>(null);
  const [form, setForm] = useState<{ value?: Purchase } | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(q ? { q } : {}), ...(sp.get("supplier_id") ? { supplier_id: sp.get("supplier_id")! } : {}) });
    api<Res>(`/purchases?${qs}`).then(setRes).catch(() => setRes({ summary: { payable: 0, overdue: 0, awaiting_goods: 0, bought_this_month: 0 }, data: [], current_page: 1, last_page: 1, total: 0 }));
  }, [page, status, q, sp]);
  useEffect(() => { load(); }, [load]);
  const s = res?.summary;

  return (
    <div className="space-y-5">
      <PageHead title="Pembelian (PO)" tutorial={false} crumbs={[["Pembelian"], ["Pembelian (PO)"]]}>
        {canManage && <Link href="/purchases/restock" className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"><PackageSearch size={16} />Saran Restock</Link>}
        {canManage && <PrimaryBtn onClick={() => setForm({})}>Buat PO</PrimaryBtn>}
      </PageHead>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4"><p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Wallet size={14} />Utang ke supplier</p><p className="mt-1 text-xl font-bold text-navy">{s ? rupiah(s.payable) : "…"}</p></Panel>
        <Panel className="p-4"><p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><AlertTriangle size={14} />Lewat jatuh tempo</p><p className={`mt-1 text-xl font-bold ${s?.overdue ? "text-rose-600" : "text-navy"}`}>{s ? rupiah(s.overdue) : "…"}</p></Panel>
        <Panel className="p-4"><p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><PackageOpen size={14} />PO menunggu barang</p><p className="mt-1 text-xl font-bold text-navy">{s?.awaiting_goods ?? "…"}</p></Panel>
        <Panel className="p-4"><p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><ShoppingBag size={14} />Pembelian bulan ini</p><p className="mt-1 text-xl font-bold text-navy">{s ? rupiah(s.bought_this_month) : "…"}</p></Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={`h-8 rounded-lg px-3 text-xs font-semibold ${status === k ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
          ))}
          <div className="ml-auto w-full sm:w-56"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Cari no. PO" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100">
              <th className="px-5 py-2.5 font-semibold">No. PO</th><th className="px-3 font-semibold">Supplier</th><th className="px-3 font-semibold">Tanggal</th><th className="px-3 font-semibold">Status</th><th className="px-3 font-semibold">Total</th><th className="px-3 font-semibold">Pembayaran</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {res?.data.map((p) => (
                <tr key={p.id} onClick={() => setOpen(p.id)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-navy">{p.number}</td>
                  <td className="px-3 text-slate-700">{p.supplier?.name ?? "-"}</td>
                  <td className="px-3 text-slate-600">{p.ordered_on}{p.due_on && <span className={`block text-xs ${p.overdue ? "font-semibold text-rose-600" : "text-slate-400"}`}>tempo {p.due_on}</span>}</td>
                  <td className="px-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[p.status]}`}>{p.status_label}</span></td>
                  <td className="px-3 font-semibold text-slate-800">{rupiah(p.total)}</td>
                  <td className="px-3">{p.status === "cancelled" ? <span className="text-xs text-slate-400">-</span> : <><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PAY[p.payment_status][1]}`}>{PAY[p.payment_status][0]}</span>
                    {p.balance > 0 && <span className="block text-xs text-slate-500">sisa {rupiah(p.balance)}</span>}</>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {res && !res.data.length && <EmptyState text="Belum ada pembelian" sub="Buat PO saat membeli stok dari supplier. Saat barang datang, stok dan HPP terisi otomatis." variant="box" />}
        </div>
        {res && res.last_page > 1 && <Pager page={res.current_page} last={res.last_page} onPage={setPage} total={res.total} />}
      </Panel>

      {form && <PurchaseForm value={form.value} onClose={() => setForm(null)} onSaved={(p) => { setForm(null); load(); setOpen(p.id); }} />}
      {open && !form && <PurchaseDetail key={open} id={open} canManage={canManage} onClose={() => setOpen(null)} onChanged={load} onEdit={(p) => setForm({ value: p })} />}
    </div>
  );
}

export default function PurchasesPage() {
  return <Suspense><Purchases /></Suspense>;
}
