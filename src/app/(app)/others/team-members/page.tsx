"use client";
import { BarChart3, Info, Pencil, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { Dialog, DialogActions, EmptyState, FieldLabel, fmtDateLong, PageHead, Pager, Panel, PrimaryBtn, SearchBox, Toggle, useResource } from "@/components/kit";
import { Select } from "@/components/Select";
import { askConfirm } from "@/components/Dialogs";

type M = { id: number; name: string; email?: string; phone?: string; role: string; accept_orders: boolean; landing_access: boolean; is_active: boolean; created_at: string; can_login?: boolean; last_login_at?: string | null };
// What each role can open after signing in (enforced by the API too).
const ROLE_HINT: Record<string, string> = {
  admin: "Semua fitur toko, kecuali tagihan, integrasi, kelola tim, dan pengaturan akun pemilik.",
  cs: "Chat, pelanggan, balasan cepat, pesanan, dan cetak label.",
  advertiser: "Laporan, riset, iklan Meta & Shopee, landing page, dan tracking.",
  gudang: "Pesanan, label pengiriman, produk, stok, dan produk marketplace.",
};
const ROLES: Record<string, string> = { admin: "Admin", cs: "Customer Service", advertiser: "Advertiser", gudang: "Gudang" };

export default function Team() {
  const [q, setQ] = useState("");
  const res = useResource<M>("team", { search: q });
  const [edit, setEdit] = useState<Partial<M> | null>(null);
  return (
    <div className="space-y-5">
      <PageHead title="Kelola Tim" tutorial={false} />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={q} onChange={setQ} placeholder="Cari anggota tim" />
          <div className="ml-auto flex gap-2">
            <Link href="/others/product-reports" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><BarChart3 size={15} />Lihat Performa Tim</Link>
            <PrimaryBtn onClick={() => setEdit({ name: "", role: "cs", accept_orders: true, landing_access: false, is_active: true })}>Tambah Anggota Tim</PrimaryBtn>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500">
            {[["Status Akun", true], ["Nama"], ["Login"], ["Nomor Telepon"], ["Terima Order", true], ["Landing Page", true], ["Dibuat"], [""]].map(([h, info]) => <th key={h as string} className="px-4 py-3 font-medium"><span className="flex items-center gap-1">{h}{info && <Info size={12} />}</span></th>)}</tr></thead>
          <tbody>{res.rows.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="px-4 py-3"><Toggle checked={m.is_active} onChange={(v) => res.update(m.id, { is_active: v })} /></td>
              <td className="px-4"><div className="font-medium text-slate-800">{m.name}</div><div className="text-xs text-slate-500">{ROLES[m.role]} · {m.email}</div></td>
              <td className="px-4 text-xs">{m.can_login ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">Bisa login</span> : <span className="text-slate-400">Belum diatur</span>}
                {m.last_login_at && <span className="mt-0.5 block text-slate-400">Terakhir {new Date(m.last_login_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}</td>
              <td className="px-4">{m.phone ?? "-"}</td>
              <td className="px-4"><Toggle checked={m.accept_orders} onChange={(v) => res.update(m.id, { accept_orders: v })} /></td>
              <td className="px-4"><Toggle checked={m.landing_access} onChange={(v) => res.update(m.id, { landing_access: v })} /></td>
              <td className="px-4 text-slate-600">{fmtDateLong(m.created_at)}</td>
              <td className="px-4"><span className="flex justify-end gap-3 text-slate-500"><button onClick={() => setEdit(m)} aria-label="Edit"><Pencil size={15} /></button><button onClick={async () => (await askConfirm(`Hapus ${m.name}?`)) && res.remove(m.id)} className="hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button></span></td>
            </tr>
          ))}</tbody>
        </table>
        {res.data && !res.rows.length && <EmptyState text="Data yang cocok tidak ditemukan" />}
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>
      {edit && <MemberDialog value={edit} onClose={() => setEdit(null)} onSave={async (b) => { if (edit.id) await res.update(edit.id, b); else await res.create(b); setEdit(null); }} />}
    </div>
  );
}

function MemberDialog({ value, onClose, onSave }: { value: Partial<M>; onClose: () => void; onSave: (b: unknown) => Promise<void> }) {
  const [f, setF] = useState({ name: value.name ?? "", email: value.email ?? "", phone: value.phone ?? "", role: value.role ?? "cs", accept_orders: value.accept_orders ?? true, landing_access: value.landing_access ?? false, is_active: value.is_active ?? true, password: "" });
  const [err, setErr] = useState("");
  return (
    <Dialog title={value.id ? "Edit Anggota Tim" : "Tambah Anggota Tim"} icon={UserPlus} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await onSave({ ...f, email: f.email || null, password: f.password || null }); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div><FieldLabel>Nama</FieldLabel><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Email</FieldLabel><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><FieldLabel>Nomor Telepon</FieldLabel><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        <div><FieldLabel>Peran</FieldLabel><Select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <p className="mt-1 text-xs text-slate-500">Akses: {ROLE_HINT[f.role]}</p></div>
        <div className="rounded-lg bg-slate-50 p-3">
          <FieldLabel>Password login {value.can_login ? "(kosongkan jika tidak diubah)" : "(opsional)"}</FieldLabel>
          <input className="input bg-white" type="password" autoComplete="new-password" minLength={8} placeholder={value.can_login ? "••••••••" : "Minimal 8 karakter"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <p className="mt-1 text-xs text-slate-500">Isi email dan password agar anggota bisa masuk sendiri di halaman login Pesanin. Mengganti password atau menonaktifkan anggota langsung mengeluarkan sesinya.</p>
        </div>
        <label className="flex items-center justify-between text-sm">Terima Order<Toggle checked={f.accept_orders} onChange={(v) => setF({ ...f, accept_orders: v })} /></label>
        <label className="flex items-center justify-between text-sm">Akses Landing Page<Toggle checked={f.landing_access} onChange={(v) => setF({ ...f, landing_access: v })} /></label>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
