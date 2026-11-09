"use client";
import { Check, Download, ExternalLink, FileImage, ListFilter, PenSquare, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, fmtDate, rupiah } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Pager, Panel, RangeButton, SearchBox, useRange, useResource } from "@/components/kit";
import { Select } from "@/components/Select";

type Conf = { id: number; order_code: string; order_id?: number; account_name: string; bank?: string; amount: number; transfer_date: string; proof?: string; status: string; created_at: string };
const ST: Record<string, string> = { pending: "bg-amber-50 text-amber-700", approved: "bg-emerald-50 text-emerald-700", rejected: "bg-rose-50 text-rose-700" };

export default function Payments() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [range, setRange] = useRange(0);
  const res = useResource<Conf>("payment-confirmations", { search: q, ...(status ? { status } : {}) });
  const [sel, setSel] = useState<number[]>([]);
  const [editPage, setEditPage] = useState(false);
  const rows = res.rows.filter((r) => r.created_at.slice(0, 10) >= range.from && r.created_at.slice(0, 10) <= range.to);
  const pageUrl = typeof window !== "undefined" && user ? `${location.origin}/konfirmasi/${user.store_slug}` : "";

  function exportCsv() {
    const csv = ["order_code,account_name,bank,amount,transfer_date,status", ...rows.map((r) => [r.order_code, r.account_name, r.bank ?? "", r.amount, r.transfer_date, r.status].join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "konfirmasi-pembayaran.csv" });
    a.click();
  }

  return (
    <div className="space-y-5">
      <PageHead title="Konfirmasi Pembayaran" tutorial={false}>
        <a href={pageUrl} target="_blank" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"><ExternalLink size={15} />Lihat Halaman Konfirmasi</a>
        <button onClick={() => setEditPage(true)} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"><PenSquare size={16} />Edit Halaman Konfirmasi</button>
      </PageHead>
      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={q} onChange={setQ} />
          <div className="ml-auto flex flex-wrap gap-2">
            <button disabled={!sel.length} onClick={async () => { await Promise.all(sel.map((id) => res.remove(id))); setSel([]); }} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 disabled:opacity-40"><Trash2 size={15} />Hapus</button>
            <button onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><Download size={15} />Export CSV</button>
            <Select className="h-10 w-40 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Filter</option><option value="pending">Pending</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></Select>
            <RangeButton value={range} onChange={setRange} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" checked={!!rows.length && sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
              {["Order ID", "Jenis Produk", "Nama akun", "Nominal Transfer", "Tanggal Transfer", "Bukti Transfer", "Diproses oleh", "Status Bayar", ""].map((h) => <th key={h} className="whitespace-nowrap px-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-3"><input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /></td>
                <td className="px-3 font-mono text-xs">{r.order_code}{!r.order_id && <span className="ml-1 text-rose-500" title="Order tidak ditemukan">⚠</span>}</td>
                <td className="px-3">Fisik</td><td className="px-3">{r.account_name}<div className="text-xs text-slate-500">{r.bank}</div></td>
                <td className="whitespace-nowrap px-3 font-semibold">{rupiah(r.amount)}</td><td className="px-3">{r.transfer_date}</td>
                <td className="px-3">{r.proof ? <a href={r.proof} target="_blank" className="flex items-center gap-1 text-brand-600"><FileImage size={14} />Lihat</a> : "-"}</td>
                <td className="px-3 text-slate-600">{r.status === "pending" ? "-" : user?.name}</td>
                <td className="px-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ST[r.status]}`}>{r.status === "pending" ? "Menunggu" : r.status === "approved" ? "Disetujui" : "Ditolak"}</span></td>
                <td className="px-3">{r.status === "pending" && <span className="flex gap-1">
                  <button onClick={() => res.update(r.id, { status: "approved" })} className="rounded bg-emerald-50 p-1 text-emerald-700" title="Setujui & tandai Paid"><Check size={15} /></button>
                  <button onClick={() => res.update(r.id, { status: "rejected" })} className="rounded bg-rose-50 p-1 text-rose-600" title="Tolak"><X size={15} /></button></span>}</td>
              </tr>
            ))}</tbody>
          </table>
          {res.data && !rows.length && <EmptyState text="Tidak ditemukan rekaman yang cocok" variant="money" />}
        </div>
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>
      {editPage && <EditConfirmPage onClose={() => setEditPage(false)} />}
    </div>
  );
}

function EditConfirmPage({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ title: "Konfirmasi Pembayaran", description: "Sudah transfer? Isi form di bawah ini agar pesananmu segera kami proses.", button: "Kirim Konfirmasi", show_banks: true });
  useEffect(() => { api("/user-settings").then((s) => s.confirm_page && setF((x) => ({ ...x, ...s.confirm_page }))); }, []);
  return (
    <Dialog title="Edit Halaman Konfirmasi" icon={PenSquare} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await api("/user-settings", { method: "PUT", json: { key: "confirm_page", value: f } }); onClose(); }}>
        <div><FieldLabel>Judul</FieldLabel><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><FieldLabel>Deskripsi</FieldLabel><textarea className="textarea" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><FieldLabel>Teks Tombol</FieldLabel><input className="input" value={f.button} onChange={(e) => setF({ ...f, button: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.show_banks} onChange={(e) => setF({ ...f, show_banks: e.target.checked })} />Tampilkan daftar rekening</label>
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
