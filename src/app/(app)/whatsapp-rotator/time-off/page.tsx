"use client";
import { CalendarX, Trash2 } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Pager, Panel, PrimaryBtn, SearchBox, useResource } from "@/components/kit";
import { Select } from "@/components/Select";

type Off = { id: number; cs_staff_id: number; start_date: string; end_date: string; note?: string; staff?: { name: string } };

export default function TimeOff() {
  const [q, setQ] = useState("");
  const res = useResource<Off>("time-offs", { search: q });
  const [open, setOpen] = useState(false);
  const days = (o: Off) => Math.round((new Date(o.end_date).getTime() - new Date(o.start_date).getTime()) / 864e5) + 1;
  return (
    <div className="space-y-5">
      <PageHead title="Libur Terjadwal" />
      <Panel>
        <div className="flex items-center justify-between gap-3 p-4"><SearchBox value={q} onChange={setQ} placeholder="Cari Libur Terjadwal" /><PrimaryBtn onClick={() => setOpen(true)}>Tambahkan Jadwal Libur</PrimaryBtn></div>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="w-10 px-4 py-3"><input type="checkbox" /></th>{["Name", "Start Date", "End Date", "Duration", "Keterangan Libur", ""].map((h) => <th key={h} className="px-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{res.rows.map((o) => (
            <tr key={o.id} className="border-b border-slate-100"><td className="px-4 py-3"><input type="checkbox" /></td><td className="px-3 font-medium text-slate-800">{o.staff?.name}</td>
              <td className="px-3">{o.start_date}</td><td className="px-3">{o.end_date}</td><td className="px-3">{days(o)} hari</td><td className="px-3 text-slate-600">{o.note ?? "-"}</td>
              <td className="px-3 text-right"><button onClick={() => res.remove(o.id)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button></td></tr>
          ))}</tbody>
        </table>
        {res.data && !res.rows.length && <EmptyState text="Belum ada data yang dibuat" />}
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>
      {open && <AddOff onClose={() => setOpen(false)} onSave={async (b) => { await res.create(b); setOpen(false); }} />}
    </div>
  );
}

function AddOff({ onClose, onSave }: { onClose: () => void; onSave: (b: unknown) => Promise<void> }) {
  const [staff, setStaff] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ cs_staff_id: "", start_date: today, end_date: today, note: "" });
  const [err, setErr] = useState("");
  useEffect(() => { api("/r/staff?per_page=100").then((r) => setStaff(r.data)); }, []);
  return (
    <Dialog title="Tambahkan Jadwal Libur" icon={CalendarX} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await onSave({ ...f, cs_staff_id: Number(f.cs_staff_id) }); } catch (x) { setErr(x instanceof ApiError ? Object.values(x.errors)[0]?.[0] ?? x.message : "Gagal"); } }}>
        <div><FieldLabel>Nama Staf</FieldLabel><Select className="input" value={f.cs_staff_id} onChange={(e) => setF({ ...f, cs_staff_id: e.target.value })}><option value="">Select Staf</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Start Date</FieldLabel><DatePicker value={f.start_date} onChange={(v) => setF({ ...f, start_date: v })} /></div>
          <div><FieldLabel>End Date</FieldLabel><DatePicker value={f.end_date} minDate={f.start_date ? new Date(f.start_date) : undefined} onChange={(v) => setF({ ...f, end_date: v })} /></div>
        </div>
        <div><FieldLabel>Keterangan Libur</FieldLabel><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
