"use client";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogActions, EmptyState, FieldLabel, OutlineBtn, PageHead, Pager, Panel, SearchBox, Toggle, useResource } from "@/components/kit";
import { DAYS } from "@/components/kit/rotator";
import { Select } from "@/components/Select";

type Shift = { on: boolean; start: string; end: string };
type Staff = { id: number; name: string; schedule?: Record<string, Shift> | null };
const DEF: Shift = { on: true, start: "08:00", end: "17:00" };

export default function ShiftPage() {
  const [q, setQ] = useState("");
  const res = useResource<Staff>("staff", { search: q });
  const [edit, setEdit] = useState<Staff | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PageHead title="Manajemen Shift" />
      <Panel>
        <div className="flex items-center justify-between p-4"><SearchBox value={q} onChange={setQ} placeholder="Search Staff" /><OutlineBtn onClick={() => setPickOpen(true)}>Jadwal Shift</OutlineBtn></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="px-4 py-3 font-medium">Nama Staf</th>{DAYS.map(([, l]) => <th key={l} className="px-3 font-medium">{l}</th>)}</tr></thead>
            <tbody>{res.rows.map((s) => (
              <tr key={s.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setEdit(s)}>
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                {DAYS.map(([k]) => { const d = s.schedule?.[k]; return <td key={k} className="whitespace-nowrap px-3 text-xs">{!s.schedule ? <span className="text-slate-400">24 jam</span> : d?.on ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{d.start}-{d.end}</span> : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">Libur</span>}</td>; })}
              </tr>
            ))}</tbody>
          </table>
        </div>
        {res.data && !res.rows.length && <EmptyState text="Belum ada data yang dibuat" sub="Tambahkan staf di menu Staf CS WhatsApp terlebih dahulu." />}
        <Pager page={res.page} last={res.data?.last_page ?? 1} onPage={res.setPage} total={res.data?.total} perPage={res.perPage} onPerPage={res.setPerPage} />
      </Panel>
      {pickOpen && (
        <Dialog title="Jadwal Shift" icon={CalendarClock} onClose={() => setPickOpen(false)}>
          <FieldLabel>Pilih staf</FieldLabel>
          <Select className="input" defaultValue="" onChange={(e) => { const s = res.rows.find((x) => x.id === Number(e.target.value)); if (s) { setPickOpen(false); setEdit(s); } }}>
            <option value="">Pilih staf…</option>{res.rows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Dialog>
      )}
      {edit && <ShiftDialog staff={edit} onClose={() => setEdit(null)} onSave={async (schedule) => { await res.update(edit.id, { schedule }); setEdit(null); }} />}
    </div>
  );
}

function ShiftDialog({ staff, onClose, onSave }: { staff: Staff; onClose: () => void; onSave: (s: Record<string, Shift> | null) => Promise<void> }) {
  const [full, setFull] = useState(!staff.schedule);
  const [sch, setSch] = useState<Record<string, Shift>>(() => Object.fromEntries(DAYS.map(([k]) => [k, staff.schedule?.[k] ?? DEF])));
  return (
    <Dialog title={`Jadwal Shift — ${staff.name}`} icon={CalendarClock} onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); await onSave(full ? null : sch); }}>
        <label className="mb-3 flex items-center gap-3 text-sm"><Toggle checked={full} onChange={setFull} />Selalu tersedia (24 jam, 7 hari)</label>
        {!full && <div className="space-y-2">{DAYS.map(([k, l]) => (
          <div key={k} className="flex items-center gap-3 text-sm">
            <span className="w-16">{l}</span><Toggle checked={sch[k].on} onChange={(v) => setSch({ ...sch, [k]: { ...sch[k], on: v } })} />
            <input type="time" disabled={!sch[k].on} className="input h-9 w-28" value={sch[k].start} onChange={(e) => setSch({ ...sch, [k]: { ...sch[k], start: e.target.value } })} />
            <span>-</span>
            <input type="time" disabled={!sch[k].on} className="input h-9 w-28" value={sch[k].end} onChange={(e) => setSch({ ...sch, [k]: { ...sch[k], end: e.target.value } })} />
          </div>
        ))}</div>}
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
