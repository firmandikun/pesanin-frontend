"use client";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { EmptyState, PageHead, Panel, PrimaryBtn } from "@/components/kit";
import { SupplierDialog } from "@/components/finance/SupplierDialog";
import { api, rupiah } from "@/lib/api";

type Supplier = { id: number; name: string; phone: string | null; email: string | null; address: string | null; payment_terms_days: number; notes: string | null; owed?: number; orders?: number };

/** Pembelian → Supplier: who the store buys stock from, with what is still owed to each. */
export default function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[] | null>(null);
  const [edit, setEdit] = useState<Partial<Supplier> | null>(null);

  const load = useCallback(() => { api<{ data: Supplier[] }>("/suppliers").then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (s: Supplier) => {
    if (!(await askConfirm(`Hapus supplier ${s.name}? PO lamanya tetap tersimpan.`, { danger: true, confirmLabel: "Hapus" }))) return;
    await api(`/suppliers/${s.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-5">
      <PageHead title="Supplier" tutorial={false} crumbs={[["Pembelian"], ["Supplier"]]}>
        <PrimaryBtn onClick={() => setEdit({ payment_terms_days: 0 })}>Tambah Supplier</PrimaryBtn>
      </PageHead>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Supplier</th><th className="px-3 font-semibold">Kontak</th><th className="px-3 font-semibold">Tempo</th><th className="px-3 font-semibold">PO</th><th className="px-3 font-semibold">Utang</th><th className="px-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows?.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3"><b className="block font-medium text-navy">{s.name}</b>{s.address && <span className="block max-w-[260px] truncate text-xs text-slate-400">{s.address}</span>}</td>
                  <td className="px-3 text-slate-600">{s.phone ?? "-"}{s.email && <span className="block text-xs text-slate-400">{s.email}</span>}</td>
                  <td className="px-3 text-slate-600">{s.payment_terms_days ? `${s.payment_terms_days} hari` : "Tunai"}</td>
                  <td className="px-3"><Link href={`/purchases?supplier_id=${s.id}`} className="text-brand-600 hover:underline">{s.orders ?? 0} PO</Link></td>
                  <td className={`px-3 font-semibold ${s.owed ? "text-rose-600" : "text-slate-400"}`}>{s.owed ? rupiah(s.owed) : "Lunas"}</td>
                  <td className="px-3 text-right"><span className="inline-flex gap-3">
                    <button onClick={() => setEdit(s)} className="text-slate-400 hover:text-navy" aria-label="Ubah"><Pencil size={15} /></button>
                    <button onClick={() => remove(s)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows && !rows.length && <EmptyState text="Belum ada supplier" sub="Tambahkan supplier tempatmu membeli stok, lalu buat PO di menu Pembelian." variant="box" />}
        </div>
      </Panel>
      {edit && <SupplierDialog value={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}
