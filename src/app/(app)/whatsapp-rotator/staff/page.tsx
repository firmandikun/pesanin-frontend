"use client";
import { CalendarPlus, ListFilter, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Pager, Panel, PrimaryBtn, SearchBox, Toggle, useResource } from "@/components/kit";
import { DAYS } from "@/components/kit/rotator";
import { Select } from "@/components/Select";
import { askConfirm } from "@/components/Dialogs";

type Staff = { id: number; name: string; phone: string; is_active: boolean; schedule?: Record<string, { on: boolean; start: string; end: string }> | null };

export default function StaffPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const res = useResource<Staff>("staff", { search: q, ...(status ? { is_active: status } : {}) });
  const [edit, setEdit] = useState<Partial<Staff> | null>(null);
  const [uv, setUv] = useState<Record<number, number>>({});
  useEffect(() => { api("/rotator-chats?per_page=1000").then((r) => { const m: Record<number, number> = {}; r.data.forEach((c: any) => { m[c.staff] = (m[c.staff] ?? 0) + 1; }); setUv(m); }); }, []);
  const hours = (s: Staff) => {
    if (!s.schedule) return "24 jam";
    const on = DAYS.filter(([k]) => s.schedule?.[k]?.on);
    return on.length ? `${on.length} hari · ${s.schedule[on[0][0]].start}-${s.schedule[on[0][0]].end}` : "Libur";
  };

  return (
    <div className="space-y-5">
      <PageHead title="Staf CS WhatsApp" />
      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SearchBox value={q} onChange={setQ} placeholder="Search Staff CS WhatsApp" />
          <div className="ml-auto flex gap-2">
            <Select className="h-10 w-40 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option value="1">Aktif</option><option value="0">Nonaktif</option></Select>
            <PrimaryBtn onClick={() => setEdit({ name: "", phone: "", is_active: true })}>Tambah Staf CS WhatsApp</PrimaryBtn>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" /></th><th className="px-3 font-medium">Nama</th><th className="px-3 font-medium">Nomor WA</th><th className="px-3 font-medium">Jam Kerja</th><th className="px-3 font-medium">Unique View</th><th className="px-3 font-medium">Status</th><th /></tr></thead>
          <tbody>{res.rows.map((s) => (
            <tr key={s.id} className="border-b border-slate-100">
              <td className="px-4 py-3"><input type="checkbox" /></td><td className="px-3 font-medium text-slate-800">{s.name}</td><td className="px-3">{s.phone}</td>
              <td className="px-3 text-slate-600">{hours(s)}</td><td className="px-3">{uv[s.name as any] ?? 0}</td>
              <td className="px-3"><Toggle checked={s.is_active} onChange={(v) => res.update(s.id, { is_active: v })} /></td>
              <td className="px-3"><span className="flex justify-end gap-3 text-slate-500"><button onClick={() => setEdit(s)} aria-label="Edit"><Pencil size={15} /></button>
                <button onClick={async () => (await askConfirm(`Hapus ${s.name}?`)) && res.remove(s.id)} className="hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button></span></td>
            </tr>
          ))}</tbody>
        </table>
        {res.data && !res.rows.length && <EmptyState text="Belum ada data yang dibuat" />}
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>
      {edit && (
        <StaffDialog value={edit} onClose={() => setEdit(null)} onSave={async (b) => { if (edit.id) await res.update(edit.id, b); else await res.create(b); setEdit(null); }} />
      )}
    </div>
  );
}

function StaffDialog({ value, onClose, onSave }: { value: Partial<Staff>; onClose: () => void; onSave: (b: unknown) => Promise<void> }) {
  const [f, setF] = useState({ name: value.name ?? "", phone: value.phone ?? "", is_active: value.is_active ?? true });
  const [err, setErr] = useState("");
  return (
    <Dialog title={value.id ? "Edit Staf CS WhatsApp" : "Tambah Staf CS WhatsApp"} icon={CalendarPlus} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await onSave(f); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div><FieldLabel>Nama Staf</FieldLabel><input className="input" placeholder="Nama CS" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><FieldLabel>Nomor WhatsApp</FieldLabel><input className="input" placeholder="08xxxxxxxxxx" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <label className="flex items-center gap-3 text-sm"><Toggle checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} />Aktif menerima chat</label>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
